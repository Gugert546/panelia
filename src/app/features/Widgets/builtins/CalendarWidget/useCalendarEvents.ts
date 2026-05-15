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
import type { CalendarProvider } from "../../../../../types/firestore";

type CreateEventInput = {
  title?: string;
  description?: string;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  timezone?: string;
  calendarId?: string;
};

type SyncResponse = {
  ok?: boolean;
  googleEventId?: string | null;
  outlookEventId?: string | null;
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

function calendarEndpoint(provider: CalendarProvider, path: string) {
  return `/api/${provider === "outlook" ? "outlook-calendar" : "google-calendar"}${path}`;
}

function getEventProvider(event: CalendarEvent, fallbackProvider: CalendarProvider): CalendarProvider {
  if (event.outlookEventId) return "outlook";
  if (event.googleEventId) return "google";
  if (event.source === "outlook" || event.source === "google") return event.source;
  return fallbackProvider;
}

function getProviderEventId(event: CalendarEvent, provider: CalendarProvider) {
  return provider === "outlook" ? event.outlookEventId : event.googleEventId;
}

function getProviderEventIdKey(provider: CalendarProvider) {
  return provider === "outlook" ? "outlookEventId" : "googleEventId";
}

export function useCalendarEvents(
  selectedCalendarIds: string[] = ["primary"],
  calendarProvider: CalendarProvider = "google"
) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!uid) {
      queueMicrotask(() => {
        if (cancelled) return;
        setEvents([]);
        setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    // Lytter til hendelser fra Firestore.
    const unsubscribe = subscribeToEvents(uid, (nextEvents) => {
      if (cancelled) return;
      setEvents(nextEvents);
      setLoading(false);
      setError(null);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [uid]);
  

  const createCalendarEvent = useCallback(
    async (input: CreateEventInput) => {
      if (!uid) throw new Error("Not authenticated");

      const targetCalendarId =
        input.calendarId?.trim() ||
        selectedCalendarIds[0] ||
        "primary";
      const now = Date.now();
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `evt_${now}`;

      const event: CalendarEvent = {
        id,
        userId: uid,
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
        calendarId: targetCalendarId,
      };

      // Oppretter lokal hendelse først.
      await createEvent(uid, event);

      try {
        const sync = await callCalendarSyncWithRetry(calendarEndpoint(calendarProvider, "/sync/create"), {
          event,
          calendarId: targetCalendarId,
        });
        await updateEvent(
          uid,
          id,
          {
            googleEventId: sync.googleEventId ?? undefined,
            outlookEventId: sync.outlookEventId ?? undefined,
            syncStatus: "synced",
          },
          { markPending: false }
        );
      } catch {
        await updateEvent(uid, id, { syncStatus: "failed" }, { markPending: false });
      }

      return event.id;
    },
    [calendarProvider, selectedCalendarIds, uid]
  );

  const updateCalendarEvent = useCallback(
    async (eventId: string, patch: Partial<CalendarEvent>) => {
      if (!uid) throw new Error("Not authenticated");
      
      const existingEvent = events.find((event) => event.id === eventId);
      if (!existingEvent) {
        throw new Error(`Event not found: ${eventId}`);
      }

      try {
        // Oppdaterer lokalt før synk mot provider.
        await updateEvent(uid, eventId, patch, {
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
      const syncProvider = getEventProvider(existingEvent, calendarProvider);
      const targetCalendarId =
        (typeof patch.calendarId === "string" && patch.calendarId.trim()) ||
        existingEvent.calendarId ||
        selectedCalendarIds[0] ||
        "primary";
      try {
        const providerEventId = getProviderEventId(existingEvent, syncProvider);
        if (providerEventId) {
          await callCalendarSyncWithRetry(calendarEndpoint(syncProvider, "/sync/update"), {
            [getProviderEventIdKey(syncProvider)]: providerEventId,
            event: mergedEvent,
            calendarId: targetCalendarId,
          });

          await updateEvent(uid, eventId, { syncStatus: "synced" }, { markPending: false });
          return;
        }

        const sync = await callCalendarSyncWithRetry(calendarEndpoint(calendarProvider, "/sync/create"), {
          event: mergedEvent,
          calendarId: targetCalendarId,
        });
        await updateEvent(
          uid,
          eventId,
          {
            googleEventId: sync.googleEventId ?? undefined,
            outlookEventId: sync.outlookEventId ?? undefined,
            syncStatus: "synced",
          },
          { markPending: false }
        );
      } catch {
        await updateEvent(uid, eventId, { syncStatus: "failed" }, { markPending: false });
      }
    },
    [calendarProvider, events, selectedCalendarIds, uid]
  );

  const deleteCalendarEvent = useCallback(
    async (eventId: string) => {
      if (!uid) throw new Error("Not authenticated");

      const existingEvent = events.find((event) => event.id === eventId);
      const syncProvider = existingEvent ? getEventProvider(existingEvent, calendarProvider) : calendarProvider;
      const targetCalendarId =
        existingEvent?.calendarId ||
        selectedCalendarIds[0] ||
        "primary";
      const providerEventId = existingEvent ? getProviderEventId(existingEvent, syncProvider) : undefined;
      // Prøver provider først, slett lokalt uansett.
      if (providerEventId) {
        try {
          await callCalendarSyncWithRetry(calendarEndpoint(syncProvider, "/sync/delete"), {
            [getProviderEventIdKey(syncProvider)]: providerEventId,
            calendarId: targetCalendarId,
          });
        } catch {
          await updateEvent(uid, eventId, { syncStatus: "failed" }, { markPending: false });
        }
      }

      try {
        await deleteEvent(uid, eventId, {
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
    [calendarProvider, events, selectedCalendarIds, uid]
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
