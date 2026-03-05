import { useCallback, useEffect, useState } from "react";
import { auth } from "../../../../../lib/firebase/client";
import { useAuth } from "../../../auth/useAuth";
import {
  CalendarConflictError,
  createEvent,
  deleteEvent,
  subscribeToEvents,
  updateEvent,
} from "../../../../../lib/firebase/firestore";
import type { CalendarEvent } from "../../../../../types/firestore";

type CreateEventInput = {
  title?: string;
  description?: string;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  timezone?: string;
};

type SyncResponse = {
  ok?: boolean;
  googleEventId?: string | null;
};

class SyncRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "SyncRequestError";
    this.status = status;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetrySync(error: unknown) {
  if (error instanceof SyncRequestError) {
    return error.status === 429 || error.status >= 500;
  }

  return true;
}

async function withRetry<T>(operation: () => Promise<T>, attempts = 3, baseDelayMs = 300): Promise<T> {
  let attempt = 0;

  while (attempt < attempts) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;
      const canRetry = attempt < attempts && shouldRetrySync(error);
      if (!canRetry) throw error;

      const delay = baseDelayMs * 2 ** (attempt - 1);
      await sleep(delay);
    }
  }

  throw new Error("Retry loop failed unexpectedly");
}

async function callCalendarSync(path: string, body: Record<string, unknown>) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Not authenticated for sync");
  }

  const idToken = await currentUser.getIdToken();
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new SyncRequestError(response.status, `Sync request failed: ${response.status}`);
  }

  return (await response.json()) as SyncResponse;
}

async function callCalendarSyncWithRetry(path: string, body: Record<string, unknown>) {
  return withRetry(() => callCalendarSync(path, body));
}

export function useCalendarEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToEvents(user.uid, (nextEvents) => {
      setEvents(nextEvents);
      setLoading(false);
      setError(null);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const createCalendarEvent = useCallback(
    async (input: CreateEventInput) => {
      if (!user?.uid) throw new Error("Not authenticated");

      const now = Date.now();
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `evt_${now}`;

      const event: CalendarEvent = {
        id,
        userId: user.uid,
        title: input.title?.trim() || "New event",
        description: input.description?.trim() || "",
        startAt: input.startAt,
        endAt: input.endAt,
        allDay: input.allDay ?? false,
        timezone: input.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        source: "local",
        syncStatus: "pending",
        createdAt: now,
        updatedAt: now,
      };

      await createEvent(user.uid, event);

      try {
        const sync = await callCalendarSyncWithRetry("/api/google-calendar/sync/create", { event });
        await updateEvent(
          user.uid,
          id,
          {
            googleEventId: sync.googleEventId ?? undefined,
            syncStatus: "synced",
          },
          { markPending: false }
        );
      } catch {
        await updateEvent(user.uid, id, { syncStatus: "failed" }, { markPending: false });
      }

      return event.id;
    },
    [user?.uid]
  );

  const updateCalendarEvent = useCallback(
    async (eventId: string, patch: Partial<CalendarEvent>) => {
      if (!user?.uid) throw new Error("Not authenticated");

      const existingEvent = events.find((event) => event.id === eventId);
      if (!existingEvent) {
        throw new Error(`Event not found: ${eventId}`);
      }

      try {
        await updateEvent(user.uid, eventId, patch, {
          expectedUpdatedAt: existingEvent.updatedAt,
          markPending: true,
        });
      } catch (err) {
        if (err instanceof CalendarConflictError) {
          setError("Event was updated elsewhere. Reloaded latest data.");
          return;
        }
        throw err;
      }

      const mergedEvent: CalendarEvent = {
        ...existingEvent,
        ...patch,
      };

      try {
        if (existingEvent.googleEventId) {
          await callCalendarSyncWithRetry("/api/google-calendar/sync/update", {
            googleEventId: existingEvent.googleEventId,
            event: mergedEvent,
          });

          await updateEvent(user.uid, eventId, { syncStatus: "synced" }, { markPending: false });
          return;
        }

        const sync = await callCalendarSyncWithRetry("/api/google-calendar/sync/create", { event: mergedEvent });
        await updateEvent(
          user.uid,
          eventId,
          {
            googleEventId: sync.googleEventId ?? undefined,
            syncStatus: "synced",
          },
          { markPending: false }
        );
      } catch {
        await updateEvent(user.uid, eventId, { syncStatus: "failed" }, { markPending: false });
      }
    },
    [events, user?.uid]
  );

  const deleteCalendarEvent = useCallback(
    async (eventId: string) => {
      if (!user?.uid) throw new Error("Not authenticated");

      const existingEvent = events.find((event) => event.id === eventId);

      if (existingEvent?.googleEventId) {
        try {
          await callCalendarSyncWithRetry("/api/google-calendar/sync/delete", {
            googleEventId: existingEvent.googleEventId,
          });
        } catch {
          await updateEvent(user.uid, eventId, { syncStatus: "failed" }, { markPending: false });
        }
      }

      try {
        await deleteEvent(user.uid, eventId, {
          expectedUpdatedAt: existingEvent?.updatedAt,
        });
      } catch (err) {
        if (err instanceof CalendarConflictError) {
          setError("Event was updated elsewhere. Reloaded latest data.");
          return;
        }
        throw err;
      }
    },
    [events, user?.uid]
  );

  return {
    events,
    loading,
    error,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
  };
}
