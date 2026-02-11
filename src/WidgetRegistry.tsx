import type { FC } from "react";
import { ClockWidget } from "./Widgets/ClockWidget";
import { NotesWidget } from "./Widgets/NotesWidget";
import { CalendarWidget } from "./Widgets/CalendarWidget";
import { GoogleSearchWidget } from "./Widgets/GoogleSearchWidget";



export type WidgetType = "clock" | "notes" | "calendar" | "google_search";



export type WidgetComponentProps = {
  config: Record<string, unknown>;
  onConfigChange: (patch: Record<string, unknown>) => void;
};

export const WIDGETS: Record<
  WidgetType,
  { title: string; Component: FC<WidgetComponentProps>; defaultW: number; defaultH: number }
> = {
  clock: { title: "", Component: ClockWidget, defaultW: 1, defaultH: 1 },
  notes: { title: "Notater", Component: NotesWidget, defaultW: 3, defaultH: 1.5 },
  calendar: { title: "Kalender", Component: CalendarWidget, defaultW: 2, defaultH: 3.5 },
  google_search: {
  title: "",
  Component: GoogleSearchWidget,
  defaultW: 2,
  defaultH: 1,
},




};
