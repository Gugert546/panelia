import { useCallback, useEffect, useState } from "react";
import { auth } from "../../../../../lib/firebase/client";
import type { CalendarMeta, CalendarProvider } from "../../../../../types/firestore";

const CALENDAR_SELECTION_EVENT = "panelia:calendar-selection-updated";

type CalendarsResponse = {
  ok?: boolean;
  calendars?: CalendarMeta[];
  selectedCalendarIds?: string[];
};

async function authedFetch(path: string, init?: RequestInit) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}

function defaultCalendarIds(provider: CalendarProvider) {
  return provider === "outlook" ? ["outlook:primary"] : ["primary"];
}

function calendarEndpoint(provider: CalendarProvider, path: string) {
  return `/api/${provider === "outlook" ? "outlook-calendar" : "google-calendar"}${path}`;
}

export function useGoogleCalendars(enabled: boolean, provider: CalendarProvider = "google") {
  const [calendars, setCalendars] = useState<CalendarMeta[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>(defaultCalendarIds(provider));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const payload = (await authedFetch(calendarEndpoint(provider, "/calendars"))) as CalendarsResponse;
      setCalendars(Array.isArray(payload.calendars) ? payload.calendars : []);
      const selected = Array.isArray(payload.selectedCalendarIds) && payload.selectedCalendarIds.length
        ? payload.selectedCalendarIds
        : defaultCalendarIds(provider);
      setSelectedCalendarIds(selected);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(CALENDAR_SELECTION_EVENT, {
            detail: { calendarIds: selected },
          })
        );
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendars");
    } finally {
      setLoading(false);
    }
  }, [enabled, provider]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (enabled) return;
    setCalendars([]);
    setSelectedCalendarIds(defaultCalendarIds(provider));
  }, [enabled, provider]);

  const toggleCalendar = useCallback((calendarId: string) => {
    setSelectedCalendarIds((prev) => {
      const has = prev.includes(calendarId);
      if (has) {
        const next = prev.filter((id) => id !== calendarId);
        return next.length ? next : defaultCalendarIds(provider);
      }
      return [...prev, calendarId];
    });
  }, [provider]);

  const saveSelection = useCallback(async () => {
    setSaving(true);
    try {
      const selected = selectedCalendarIds.length ? selectedCalendarIds : defaultCalendarIds(provider);
      const payload = (await authedFetch(calendarEndpoint(provider, "/calendars/selected"), {
        method: "POST",
        body: JSON.stringify({ calendarIds: selected }),
      })) as { selectedCalendarIds?: string[] };

      const persisted = Array.isArray(payload.selectedCalendarIds) && payload.selectedCalendarIds.length
        ? payload.selectedCalendarIds
        : defaultCalendarIds(provider);

      setSelectedCalendarIds(persisted);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(CALENDAR_SELECTION_EVENT, {
            detail: { calendarIds: persisted },
          })
        );
      }

      await authedFetch(calendarEndpoint(provider, "/sync/pull"), {
        method: "POST",
        body: JSON.stringify({
          maxResults: 250,
          calendarIds: persisted,
        }),
      });

      console.log("[useGoogleCalendars] saveSelection complete. persisted:", persisted);
      setError(null);
      return persisted;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save calendar selection");
      throw err;
    } finally {
      setSaving(false);
    }
  }, [provider, selectedCalendarIds]);

  // Debug state updates
  useEffect(() => {
    console.log("[useGoogleCalendars] selectedCalendarIds updated:", selectedCalendarIds);
  }, [selectedCalendarIds]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onSelectionUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ calendarIds?: string[] }>;
      const incoming = Array.isArray(customEvent.detail?.calendarIds)
        ? customEvent.detail.calendarIds
        : [];

      if (incoming.length) {
        setSelectedCalendarIds(incoming);
      }
    };

    window.addEventListener(CALENDAR_SELECTION_EVENT, onSelectionUpdated as EventListener);
    return () => {
      window.removeEventListener(CALENDAR_SELECTION_EVENT, onSelectionUpdated as EventListener);
    };
  }, []);

  return {
    calendars,
    selectedCalendarIds,
    loading,
    saving,
    error,
    refresh,
    toggleCalendar,
    saveSelection,
    setSelectedCalendarIds,
  };
}
