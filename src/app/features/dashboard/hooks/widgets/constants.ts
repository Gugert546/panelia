
// Konstanter og standardverdier for widget-oppsett og dashboard-utseende.

import type { DashboardBackgroundId, LayoutItem, WidgetSizeMode } from "./types";

export const GRID_COLUMNS = 40;
export const GRID_ROWS = 20;

// Widgets som kan slås av/på i dashboardet.

export const AVAILABLE_WIDGETS = [
  { id: "clock", label: "Klokke" },
  { id: "calendar", label: "Kalender" },
  { id: "google_search", label: "Søk" },
  { id: "news", label: "Nyheter" },
  { id: "weather", label: "Vær" },
  { id: "bookmark", label: "Bokmerke" },
  { id: "notes", label: "Notater" },
  { id: "spotify", label: "Spotify" },
] as const;

export const SAVE_DEBOUNCE_MS = 5000;

// Standard stilverdier for widgets.

export const DEFAULT_WIDGET_SURFACE_COLOR = "rgba(255,255,255,0.15)";
export const DEFAULT_WIDGET_BORDER_COLOR = "rgba(255,255,255,0.35)";
export const DEFAULT_WIDGET_TEXT_COLOR = "#ffffff";
export const DEFAULT_WIDGET_OPACITY = 1;
export const DEFAULT_WIDGET_BORDER_WIDTH = 1;
export const DEFAULT_WIDGET_SIZE_MODE: WidgetSizeMode = "medium";
export const DEFAULT_DASHBOARD_BACKGROUND_ID: DashboardBackgroundId = "sol1";

// Standard størrelse/layout per widget-type ved første opprettelse.

export const DEFAULT_LAYOUTS: Record<string, LayoutItem> = {
  clock: { x: 0, y: 0, w: 5, h: 3 },
  notes: { x: 0, y: 0, w: 8, h: 8 },
  calendar: { x: 0, y: 0, w: 16, h: 12 },
  google_search: { x: 0, y: 0, w: 14, h: 3 },
  weather: { x: 0, y: 0, w: 5, h: 4 },
  news: { x: 0, y: 0, w: 10, h: 10 },
  spotify: { x: 0, y: 0, w: 4, h: 3 },
  bookmark: { x: 0, y: 0, w: 4, h: 4 },
  customButton: { x: 0, y: 0, w: 2, h: 2 },
};
