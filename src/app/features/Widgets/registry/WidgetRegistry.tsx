import type { FC } from "react";
import  ClockWidget  from "../builtins/ClockWidget/ClockWidget";
import NotesWidget  from "../builtins/NotesWidget/NotesWidgetUI";
import { CalendarWidget } from "../builtins/CalendarWidget/CalendarWidget";
import  SearchWidgetMock  from "../builtins/searchWidget/GoogleSearchWidget";



export type WidgetType = "clock" | "notes" | "calendar" | "google_search";



export type WidgetComponentProps = {
  config: Record<string, unknown>;
  onConfigChange: (patch: Record<string, unknown>) => void;
};

// Adapter: gjør ClockWidget kompatibel med WidgetComponentProps
const ClockWidgetAdapter: FC<WidgetComponentProps> = ({ config }) => {
  const size = (config.size as "small" | "medium" | "large" | "wide") ?? "small";
  return <ClockWidget size={size} />;
};

export const WIDGETS: Record<
  WidgetType,
  { title: string; Component: FC<WidgetComponentProps>; defaultW: number; defaultH: number }
> = {
  clock: { title: "", Component: ClockWidgetAdapter, defaultW: 1, defaultH: 1 },
  notes: { title: "Notater", Component: NotesWidget, defaultW: 3, defaultH: 1.5 },
  calendar: { title: "Kalender", Component: CalendarWidget, defaultW: 2, defaultH: 3.5 },
  google_search: {
  title: "",
  Component: SearchWidgetMock,
  defaultW: 2,
  defaultH: 1,
},




};
