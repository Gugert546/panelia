import type { FC } from "react";
import  ClockWidgetMock  from "../builtins/ClockWidget/ClockWidget";
import { NotesWidget } from "../builtins/NotesWidget/NotesWidget";
import { CalendarWidget } from "../builtins/CalendarWidget/CalendarWidget";
import  SearchWidgetMock  from "../builtins/searchWidget/GoogleSearchWidget";



export type WidgetType = "clock" | "notes" | "calendar" | "google_search";



export type WidgetComponentProps = {
  config: Record<string, unknown>;
  onConfigChange: (patch: Record<string, unknown>) => void;
};

export const WIDGETS: Record<
  WidgetType,
  { title: string; Component: FC<WidgetComponentProps>; defaultW: number; defaultH: number }
> = {
  clock: { title: "", Component: ClockWidgetMock, defaultW: 1, defaultH: 1 },
  notes: { title: "Notater", Component: NotesWidget, defaultW: 3, defaultH: 1.5 },
  calendar: { title: "Kalender", Component: CalendarWidget, defaultW: 2, defaultH: 3.5 },
  google_search: {
  title: "",
  Component: SearchWidgetMock,
  defaultW: 2,
  defaultH: 1,
},




};
