import { makeBookmarkTool } from "./bookmarks";
import {
  createCalendarEventTool,
  updateCalendarEventTool,
  deleteCalendarEventTool,
  listCalendarEventsTool,
} from "./calendar";
import {
  addCustomButtonTool,
  removeCustomButtonTool,
  listCustomButtonsTool,
} from "./customButtons";

export const tools = [
  makeBookmarkTool,
  createCalendarEventTool,
  updateCalendarEventTool,
  deleteCalendarEventTool,
  listCalendarEventsTool,
  addCustomButtonTool,
  removeCustomButtonTool,
  listCustomButtonsTool,
] as const;

export const toolMap = new Map(tools.map((t) => [t.name, t]));
