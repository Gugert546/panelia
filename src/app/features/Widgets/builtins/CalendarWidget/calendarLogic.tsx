import { useCallback, useMemo, useState } from "react";
import type { CalendarEvent } from "../../../../../types/firestore";
import { useCalendarEvents } from "./useCalendarEvents";

type EventFormState = {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
};

function isEventInSlot(event: CalendarEvent, day: Date, time: string) {
  const eventStart = new Date(event.startAt);
  const eventEnd = new Date(event.endAt);

  if (Number.isNaN(eventStart.getTime()) || Number.isNaN(eventEnd.getTime())) return false;
  if (eventEnd <= eventStart) return false;

  const [hour, minute] = time.split(":").map(Number);

  const slotStart = new Date(day);
  slotStart.setHours(hour, minute, 0, 0);

  const slotEnd = new Date(slotStart);
  slotEnd.setHours(slotEnd.getHours() + 1);

  return eventStart < slotEnd && eventEnd > slotStart;
}

function isEventStartInSlot(event: CalendarEvent, day: Date, time: string) {
  const eventStart = new Date(event.startAt);
  if (Number.isNaN(eventStart.getTime())) return false;

  const [hour, minute] = time.split(":").map(Number);

  return (
    eventStart.getFullYear() === day.getFullYear() &&
    eventStart.getMonth() === day.getMonth() &&
    eventStart.getDate() === day.getDate() &&
    eventStart.getHours() === hour &&
    eventStart.getMinutes() === minute
  );
}

export function useCalendarLogic() {
  const { events, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } = useCalendarEvents();
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

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 6; hour < 23; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
    }
    return slots;
  }, []);

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

  const handleCellClick = useCallback(
    async (dayIdx: number, time: string) => {
      const key = `${dayIdx}-${time}`;
      setCreatingKey(key);

      try {
        const [hourStr, minuteStr] = time.split(":");
        const start = new Date(weekDays[dayIdx]);
        start.setHours(Number(hourStr), Number(minuteStr), 0, 0);

        const end = new Date(start);
        end.setHours(end.getHours() + 1);

        await createCalendarEvent({
          title: "New event",
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          allDay: false,
        });
      } finally {
        setCreatingKey(null);
      }
    },
    [createCalendarEvent, weekDays]
  );

  const getCellRenderState = useCallback(
    (dayIdx: number, time: string) => {
      const day = weekDays[dayIdx];

      const overlapping = events
        .filter((event) => isEventInSlot(event, day, time))
        .sort((a, b) => a.startAt.localeCompare(b.startAt));

      const primaryEvent = overlapping[0] ?? null;
      if (!primaryEvent) {
        return { primaryEvent: null, isStart: false, isEnd: false, isContinuation: false };
      }

      const [hour, minute] = time.split(":").map(Number);
      const slotStart = new Date(day);
      slotStart.setHours(hour, minute, 0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(slotEnd.getHours() + 1);

      const end = new Date(primaryEvent.endAt);
      const isStart = isEventStartInSlot(primaryEvent, day, time);
      const isEnd = !Number.isNaN(end.getTime()) && end > slotStart && end <= slotEnd;
      const isContinuation = !isStart;

      return { primaryEvent, isStart, isEnd, isContinuation };
    },
    [events, weekDays]
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
      await updateCalendarEvent(editingEvent.id, {
        title: editingEvent.title.trim() || "Untitled event",
        description: editingEvent.description.trim(),
        startAt: new Date(editingEvent.startAt).toISOString(),
        endAt: new Date(editingEvent.endAt).toISOString(),
        syncStatus: "pending",
      });
      setEditingEvent(null);
    } finally {
      setSavingEdit(false);
    }
  }, [editingEvent, updateCalendarEvent]);

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
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return {
    weekDays,
    timeSlots,
    formatDate,
    goToPreviousWeek,
    goToNextWeek,
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
