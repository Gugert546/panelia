import { useCallback, useMemo, useState } from "react";
import type { CalendarEvent } from "../../../../../types/firestore";
import type { CalendarProvider } from "../../../../../types/firestore";
import { useCalendarEvents } from "./useCalendarEvents";

type EventFormState = {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
};

type SlotEventItem = {
  event: CalendarEvent;
  lane: number;
  isStart: boolean;
  isEnd: boolean;
  isContinuation: boolean;
};

function getSlotRange(day: Date, time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const slotStart = new Date(day);
  slotStart.setHours(hour, minute, 0, 0);

  const slotEnd = new Date(slotStart);
  slotEnd.setHours(slotEnd.getHours() + 1);

  return { slotStart, slotEnd };
}

function parseEventRange(event: CalendarEvent) {
  const eventStart = new Date(event.startAt);
  const eventEnd = new Date(event.endAt);

  if (Number.isNaN(eventStart.getTime()) || Number.isNaN(eventEnd.getTime())) {
    return null;
  }

  if (eventEnd <= eventStart) {
    return null;
  }

  return { eventStart, eventEnd };
}

function isEventInSlot(event: CalendarEvent, day: Date, time: string) {
  const parsedRange = parseEventRange(event);
  if (!parsedRange) return false;

  const { slotStart, slotEnd } = getSlotRange(day, time);
  return parsedRange.eventStart < slotEnd && parsedRange.eventEnd > slotStart;
}

function isEventStartInSlot(event: CalendarEvent, day: Date, time: string) {
  const parsedRange = parseEventRange(event);
  if (!parsedRange) return false;

  const { slotStart, slotEnd } = getSlotRange(day, time);
  return parsedRange.eventStart >= slotStart && parsedRange.eventStart < slotEnd;
}

function isEventEndInSlot(event: CalendarEvent, day: Date, time: string) {
  const parsedRange = parseEventRange(event);
  if (!parsedRange) return false;

  const { slotStart, slotEnd } = getSlotRange(day, time);
  return parsedRange.eventEnd > slotStart && parsedRange.eventEnd <= slotEnd;
}

function isEventOnDay(event: CalendarEvent, day: Date) {
  const parsedRange = parseEventRange(event);
  if (!parsedRange) return false;

  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return parsedRange.eventStart < dayEnd && parsedRange.eventEnd > dayStart;
}

function compareEventsForLayout(a: CalendarEvent, b: CalendarEvent) {
  if (a.startAt !== b.startAt) {
    return a.startAt.localeCompare(b.startAt);
  }

  const aStart = new Date(a.startAt).getTime();
  const aEnd = new Date(a.endAt).getTime();
  const bStart = new Date(b.startAt).getTime();
  const bEnd = new Date(b.endAt).getTime();

  const aDuration = Number.isNaN(aStart) || Number.isNaN(aEnd) ? 0 : aEnd - aStart;
  const bDuration = Number.isNaN(bStart) || Number.isNaN(bEnd) ? 0 : bEnd - bStart;

  if (aDuration !== bDuration) {
    return bDuration - aDuration;
  }

  return a.id.localeCompare(b.id);
}

function assignLanes(events: CalendarEvent[]) {
  const laneEndTimes: Date[] = [];
  const laneByEventId = new Map<string, number>();

  for (const event of events) {
    const parsedRange = parseEventRange(event);
    if (!parsedRange) continue;

    let laneIndex = laneEndTimes.findIndex((laneEnd) => laneEnd <= parsedRange.eventStart);

    if (laneIndex < 0) {
      laneIndex = laneEndTimes.length;
      laneEndTimes.push(parsedRange.eventEnd);
    } else {
      laneEndTimes[laneIndex] = parsedRange.eventEnd;
    }

    laneByEventId.set(event.id, laneIndex);
  }

  return laneByEventId;
}

export function useCalendarLogic(
  selectedCalendarIds: string[] = ["primary"],
  calendarProvider: CalendarProvider = "google"
) {
  const { events, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } =
    useCalendarEvents(selectedCalendarIds, calendarProvider);
  const [creatingKey, setCreatingKey] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [editingEvent, setEditingEvent] = useState<EventFormState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingEdit, setDeletingEdit] = useState(false);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i + weekOffset * 7);
      days.push(date);
    }
    return days;
  }, [weekOffset]);
  const CALENDAR_FROM_HOUR = 0;
  const CALENDAR_TO_HOUR = 24;
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = CALENDAR_FROM_HOUR; hour < CALENDAR_TO_HOUR; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
    }
    return slots;
  }, []);

  const visibleEvents = useMemo(() => {
    if (!selectedCalendarIds.length) {
      console.log(
        "[calendarLogic] No selectedCalendarIds, showing all",
        events.length,
        "events"
      );
      return events;
    }

    const filtered = events.filter(
      (event) => !event.calendarId || selectedCalendarIds.includes(event.calendarId)
    );

    console.log(
      "[calendarLogic] selectedCalendarIds:",
      selectedCalendarIds,
      "total events:",
      events.length,
      "visible:",
      filtered.length
    );

    if (filtered.length === 0 && events.length > 0) {
      console.warn(
        "[calendarLogic] MISMATCH: events exist but none match selectedCalendarIds. Sample event:",
        events[0]
      );
    }

    return filtered;
  }, [events, selectedCalendarIds]);

  const layoutByDay = useMemo(() => {
    return weekDays.map((day) => {
      const dayEvents = visibleEvents
        .filter((event) => isEventOnDay(event, day))
        .sort(compareEventsForLayout);

      return {
        dayEvents,
        laneByEventId: assignLanes(dayEvents),
      };
    });
  }, [visibleEvents, weekDays]);

  const formatDate = useCallback((date: Date) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return { day: days[date.getDay()], date: date.getDate() };
  }, []);

  const goToPreviousWeek = useCallback(() => {
    setWeekOffset((prev) => prev - 1);
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekOffset((prev) => prev + 1);
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setWeekOffset(0);
  }, []);

  const handleCellClick = useCallback(
    (dayIdx: number, time: string) => {
      const [hourStr, minuteStr] = time.split(":");
      const start = new Date(weekDays[dayIdx]);
      start.setHours(Number(hourStr), Number(minuteStr), 0, 0);

      const end = new Date(start);
      end.setHours(end.getHours() + 1);

      setEditingEvent({
        id: "",
        title: "",
        description: "",
        startAt: toLocalInput(start.toISOString()),
        endAt: toLocalInput(end.toISOString()),
      });
    },
    [weekDays]
  );

  const getCellRenderState = useCallback(
    (dayIdx: number, time: string, maxVisible = 2) => {
      const dayLayout = layoutByDay[dayIdx];

      if (!dayLayout) {
        return { items: [] as SlotEventItem[], hiddenCount: 0 };
      }

      const items = dayLayout.dayEvents
        .filter((event) => isEventInSlot(event, weekDays[dayIdx], time))
        .map((event) => {
          const isStart = isEventStartInSlot(event, weekDays[dayIdx], time);

          return {
            event,
            lane: dayLayout.laneByEventId.get(event.id) ?? 0,
            isStart,
            isEnd: isEventEndInSlot(event, weekDays[dayIdx], time),
            isContinuation: !isStart,
          };
        })
        .sort((a, b) => {
          if (a.isStart !== b.isStart) {
            return a.isStart ? -1 : 1;
          }

          return a.lane - b.lane;
        });

      return {
        items: items.slice(0, maxVisible),
        hiddenCount: Math.max(0, items.length - maxVisible),
      };
    },
    [layoutByDay, weekDays]
  );

  const openEditModal = useCallback((event: CalendarEvent) => {
    setEditingEvent({
      id: event.id,
      title: event.title ?? "",
      description: event.description ?? "",
      startAt: toLocalInput(event.startAt),
      endAt: toLocalInput(event.endAt),
    });
  }, []);

  const patchEditingEvent = useCallback((patch: Partial<EventFormState>) => {
    setEditingEvent((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const closeEditModal = useCallback(() => {
    setEditingEvent(null);
  }, []);

  const saveEditModal = useCallback(async () => {
    if (!editingEvent) return;
    setSavingEdit(true);
    try {
      if (editingEvent.id === "") {
        await createCalendarEvent({
          title: editingEvent.title.trim() || "Untitled event",
          description: editingEvent.description.trim(),
          startAt: new Date(editingEvent.startAt).toISOString(),
          endAt: new Date(editingEvent.endAt).toISOString(),
          allDay: false,
        });
      } else {
        await updateCalendarEvent(editingEvent.id, {
          title: editingEvent.title.trim() || "Untitled event",
          description: editingEvent.description.trim(),
          startAt: new Date(editingEvent.startAt).toISOString(),
          endAt: new Date(editingEvent.endAt).toISOString(),
          syncStatus: "pending",
        });
      }
      setEditingEvent(null);
    } finally {
      setSavingEdit(false);
    }
  }, [editingEvent, createCalendarEvent, updateCalendarEvent]);

  const deleteEditModal = useCallback(async () => {
    if (!editingEvent) return;
    setDeletingEdit(true);
    try {
      await deleteCalendarEvent(editingEvent.id);
      setEditingEvent(null);
    } finally {
      setDeletingEdit(false);
    }
  }, [editingEvent, deleteCalendarEvent]);

  const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  return {
    weekDays,
    timeSlots,
    formatDate,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    isViewingCurrentWeek: weekOffset === 0,
    handleCellClick,
    creatingKey,
    getCellRenderState,
    editingEvent,
    savingEdit,
    deletingEdit,
    openEditModal,
    patchEditingEvent,
    closeEditModal,
    saveEditModal,
    deleteEditModal,
  };
}
