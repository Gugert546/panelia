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
import {
  addDashboardWidgetTool,
  removeDashboardWidgetTool,
  listDashboardWidgetsTool,
} from "./dashboardWidgets";
import { setClockModeTool, toggleClockModeTool } from "./clockMode";

export const tools = [
  makeBookmarkTool,
  createCalendarEventTool,
  updateCalendarEventTool,
  deleteCalendarEventTool,
  listCalendarEventsTool,
  addCustomButtonTool,
  removeCustomButtonTool,
  listCustomButtonsTool,
  addDashboardWidgetTool,
  removeDashboardWidgetTool,
  listDashboardWidgetsTool,
  setClockModeTool,
  toggleClockModeTool,
] as const;

export const toolMap = new Map(tools.map((t) => [t.name, t]));
