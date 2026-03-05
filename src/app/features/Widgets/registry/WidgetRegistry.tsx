import type { FC } from "react";
import  ClockWidget  from "../builtins/ClockWidget/ClockWidget";
import NotesWidget  from "../builtins/NotesWidget/NotesWidgetUI";
import CalendarWidget  from "../builtins/CalendarWidget/CalendarWidget";
import SearchWidgetUI from "../builtins/searchWidget/SearchWidgetUI";




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

const NotesWidgetAdapter: FC<WidgetComponentProps> = ({ config }) => {
  const size = (config.size as "small" | "medium" | "large" | "wide") ?? "small";
  return <NotesWidget size={size} />;
};

const CalendarWidgetAdapter: FC<WidgetComponentProps> = () => {
  return <CalendarWidget />;
};

const SearchWidgetAdapter: FC<WidgetComponentProps> = ({ config }) => {
  const size = (config.size as "small" | "medium" | "large" | "wide") ?? "small";
  return <SearchWidgetUI size={size} />;
};

export const WIDGETS: Record<
  WidgetType,
  { title: string; Component: FC<WidgetComponentProps>; defaultW: number; defaultH: number }
> = {
  clock: { title: "", Component: ClockWidgetAdapter, defaultW: 1, defaultH: 1 },
  notes: { title: "Notater", Component: NotesWidgetAdapter, defaultW: 3, defaultH: 1.5 },
  calendar: { title: "Kalender", Component: CalendarWidgetAdapter, defaultW: 2, defaultH: 3.5 },
  google_search: {
  title: "",
  Component: SearchWidgetAdapter,
  defaultW: 2,
  defaultH: 1,
},
};