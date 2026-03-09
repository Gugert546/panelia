import { randomUUID } from "crypto";
import type { ToolDef } from "./types.ts";
import { adminDb } from "../firebaseAdmin.ts";

type CalendarSyncStatus = "synced" | "pending" | "failed";

type CalendarEventDoc = {
  id: string;
  userId: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  timezone: string;
  source: "local" | "google";
  googleEventId?: string;
  updatedAt: number;
  createdAt: number;
  syncStatus: CalendarSyncStatus;
};

type CreateCalendarEventArgs = {
  title?: string;
  startAt: string;
  endAt?: string;
  description?: string;
  allDay?: boolean;
  timezone?: string;
};

type UpdateCalendarEventArgs = {
  eventId: string;
  title?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  allDay?: boolean;
  timezone?: string;
};

type DeleteCalendarEventArgs = {
  eventId: string;
};

type ListCalendarEventsArgs = {
  from?: string;
  to?: string;
  limit?: number;
};

function ensureIsoDate(value: string, fieldName: string) {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    throw new Error(`${fieldName} must be a valid ISO datetime string`);
  }
  return new Date(ms).toISOString();
}

function eventsCollection(uid: string) {
  return adminDb.collection(`users/${uid}/calendarEvents`);
}

export const createCalendarEventTool: ToolDef<
  CreateCalendarEventArgs,
  { ok: true; eventId: string; title: string; startAt: string; endAt: string }
> = {
  name: "createCalendarEvent",
  description: "Create a calendar event in Panelia for the current user.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Event title. Defaults to 'Møte' when omitted." },
      startAt: { type: "string", description: "Start datetime in ISO format" },
      endAt: { type: "string", description: "End datetime in ISO format. Defaults to startAt + 1 hour when omitted." },
      description: { type: "string", description: "Optional event description" },
      allDay: { type: "boolean", description: "Whether event is all-day" },
      timezone: { type: "string", description: "IANA timezone, e.g. Europe/Oslo" },
    },
    required: ["startAt"],
    additionalProperties: false,
  },
  async handler(args, ctx) {
    const title = (args.title?.trim() || "Møte").slice(0, 120);

    const startAt = ensureIsoDate(args.startAt, "startAt");
    const endAt = args.endAt
      ? ensureIsoDate(args.endAt, "endAt")
      : new Date(Date.parse(startAt) + 60 * 60 * 1000).toISOString();

    if (Date.parse(endAt) <= Date.parse(startAt)) {
      throw new Error("endAt must be after startAt");
    }

    const now = Date.now();
    const id = randomUUID();

    const doc: CalendarEventDoc = {
      id,
      userId: ctx.uid,
      title: title.slice(0, 120),
      description: (args.description ?? "").trim().slice(0, 2000),
      startAt,
      endAt,
      allDay: Boolean(args.allDay),
      timezone: (args.timezone?.trim() || "Europe/Oslo").slice(0, 80),
      source: "local",
      syncStatus: "pending",
      createdAt: now,
      updatedAt: now,
    };

    await eventsCollection(ctx.uid).doc(id).set(doc);

    return {
      ok: true,
      eventId: id,
      title: doc.title,
      startAt: doc.startAt,
      endAt: doc.endAt,
    };
  },
};

export const updateCalendarEventTool: ToolDef<
  UpdateCalendarEventArgs,
  { ok: true; eventId: string; updatedFields: string[] }
> = {
  name: "updateCalendarEvent",
  description: "Update an existing Panelia calendar event by eventId.",
  parameters: {
    type: "object",
    properties: {
      eventId: { type: "string", description: "Existing Panelia event ID" },
      title: { type: "string", description: "New title" },
      description: { type: "string", description: "New description" },
      startAt: { type: "string", description: "New start datetime (ISO)" },
      endAt: { type: "string", description: "New end datetime (ISO)" },
      allDay: { type: "boolean", description: "All-day status" },
      timezone: { type: "string", description: "IANA timezone" },
    },
    required: ["eventId"],
    additionalProperties: false,
  },
  async handler(args, ctx) {
    const eventId = args.eventId.trim();
    if (!eventId) throw new Error("eventId is required");

    const patch: Partial<CalendarEventDoc> = {};

    if (typeof args.title === "string") patch.title = args.title.trim().slice(0, 120);
    if (typeof args.description === "string") patch.description = args.description.trim().slice(0, 2000);
    if (typeof args.startAt === "string") patch.startAt = ensureIsoDate(args.startAt, "startAt");
    if (typeof args.endAt === "string") patch.endAt = ensureIsoDate(args.endAt, "endAt");
    if (typeof args.allDay === "boolean") patch.allDay = args.allDay;
    if (typeof args.timezone === "string") patch.timezone = args.timezone.trim().slice(0, 80);

    const updatedFields = Object.keys(patch);
    if (!updatedFields.length) {
      throw new Error("Provide at least one field to update");
    }

    if (patch.startAt && patch.endAt && Date.parse(patch.endAt) <= Date.parse(patch.startAt)) {
      throw new Error("endAt must be after startAt");
    }

    const ref = eventsCollection(ctx.uid).doc(eventId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new Error(`Event not found: ${eventId}`);
    }

    await ref.update({
      ...patch,
      updatedAt: Date.now(),
      syncStatus: "pending",
    });

    return {
      ok: true,
      eventId,
      updatedFields,
    };
  },
};

export const deleteCalendarEventTool: ToolDef<DeleteCalendarEventArgs, { ok: true; eventId: string }> = {
  name: "deleteCalendarEvent",
  description: "Delete a Panelia calendar event by eventId.",
  parameters: {
    type: "object",
    properties: {
      eventId: { type: "string", description: "Existing Panelia event ID" },
    },
    required: ["eventId"],
    additionalProperties: false,
  },
  async handler(args, ctx) {
    const eventId = args.eventId.trim();
    if (!eventId) throw new Error("eventId is required");

    await eventsCollection(ctx.uid).doc(eventId).delete();

    return { ok: true, eventId };
  },
};

export const listCalendarEventsTool: ToolDef<
  ListCalendarEventsArgs,
  { ok: true; count: number; events: Array<{ id: string; title: string; startAt: string; endAt: string }> }
> = {
  name: "listCalendarEvents",
  description: "List upcoming Panelia calendar events, optionally between a date range.",
  parameters: {
    type: "object",
    properties: {
      from: { type: "string", description: "Optional range start in ISO format" },
      to: { type: "string", description: "Optional range end in ISO format" },
      limit: { type: "number", description: "Max events to return (1-100)", minimum: 1, maximum: 100 },
    },
    additionalProperties: false,
  },
  async handler(args, ctx) {
    const fromMs = typeof args.from === "string" ? Date.parse(ensureIsoDate(args.from, "from")) : Date.now();
    const toMs = typeof args.to === "string" ? Date.parse(ensureIsoDate(args.to, "to")) : Number.POSITIVE_INFINITY;
    const limit = Math.max(1, Math.min(100, Math.floor(args.limit ?? 20)));

    const snap = await eventsCollection(ctx.uid).get();
    const events = snap.docs
      .map((d) => d.data() as CalendarEventDoc)
      .filter((event) => {
        const startMs = Date.parse(event.startAt);
        return !Number.isNaN(startMs) && startMs >= fromMs && startMs <= toMs;
      })
      .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))
      .slice(0, limit)
      .map((event) => ({
        id: event.id,
        title: event.title,
        startAt: event.startAt,
        endAt: event.endAt,
      }));

    return {
      ok: true,
      count: events.length,
      events,
    };
  },
};
