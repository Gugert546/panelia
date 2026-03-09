import { makeBookmarkTool } from "./bookmarks.ts";
import {
  createCalendarEventTool,
  updateCalendarEventTool,
  deleteCalendarEventTool,
  listCalendarEventsTool,
} from "./calendar.ts";

export const tools = [
  makeBookmarkTool,
  createCalendarEventTool,
  updateCalendarEventTool,
  deleteCalendarEventTool,
  listCalendarEventsTool,
] as const;

export const toolMap = new Map(tools.map((t) => [t.name, t]));
