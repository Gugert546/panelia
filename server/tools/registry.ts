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
import {
  applyDashboardThemeTool,
  saveDashboardThemeTool,
  deleteDashboardThemeTool,
  listDashboardThemesTool,
} from "./dashboardThemes";
import { updateDashboardStyleTool, updateDashboardWidgetStyleTool } from "./dashboardStyles";

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
  applyDashboardThemeTool,
  saveDashboardThemeTool,
  deleteDashboardThemeTool,
  listDashboardThemesTool,
  updateDashboardStyleTool,
  updateDashboardWidgetStyleTool,
] as const;

export const toolMap = new Map(tools.map((t) => [t.name, t]));
