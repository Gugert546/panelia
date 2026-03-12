import type { FC } from "react";

import ClockWidget from "../builtins/ClockWidget/ClockWidget";
import NotesWidget from "../builtins/NotesWidget/NotesWidgetUI";
import CalendarWidget from "../builtins/CalendarWidget/CalendarWidget";
import SearchWidgetUI from "../builtins/searchWidget/SearchWidgetUI";
import WeatherWidget from "../builtins/WeatherWidget/WeatherWidgetUI";
import NewsWidget from "../builtins/NewsWidget/NewsWidget";
import SpotifyWidget from "../builtins/SpotifyWidget/SpotifyWidget";
import BookmarkUi from "../builtins/BookmarkWidget/BookmarkUi";

export type WidgetType =
  | "clock"
  | "notes"
  | "calendar"
  | "google_search"
  | "weather"
  | "news"
  | "spotify"
  | "bookmark";

export type WidgetComponentProps = {
  config: Record<string, unknown>;
  onConfigChange: (patch: Record<string, unknown>) => void;
  widgetId: string;
  onClose?: () => void;
};

const ClockWidgetAdapter: FC<WidgetComponentProps> = () => {
  return <ClockWidget />
};

const NotesWidgetAdapter: FC<WidgetComponentProps> = ({ widgetId, onClose }) => {
  return <NotesWidget widgetId={widgetId} onClose={onClose} />;
};

const CalendarWidgetAdapter: FC<WidgetComponentProps> = () => {
  return <CalendarWidget />;
};

const SearchWidgetAdapter: FC<WidgetComponentProps> = () => {
  return <SearchWidgetUI />;
};

const WeatherWidgetAdapter: FC<WidgetComponentProps> = () => {
  return <WeatherWidget />;
};

const NewsWidgetAdapter: FC<WidgetComponentProps> = () => {
  return <NewsWidget />;
};

const SpotifyWidgetAdapter: FC<WidgetComponentProps> = () => {
  return <SpotifyWidget />;
};

const BookmarkWidgetAdapter: FC<WidgetComponentProps> = () => {
  return <BookmarkUi />;
};

export const WIDGETS = {
  clock: {
    title: "Klokke",
    Component: ClockWidgetAdapter,
    defaultGrid: { w: 3, h: 2 },
  },

  notes: {
    title: "Notater",
    Component: NotesWidgetAdapter,
    defaultGrid: { w: 4, h: 4 },
  },

  calendar: {
    title: "Kalender",
    Component: CalendarWidgetAdapter,
    defaultGrid: { w: 8, h: 6 },
  },

  google_search: {
    title: "Søk",
    Component: SearchWidgetAdapter,
    defaultGrid: { w: 8, h: 2 },
  },

  weather: {
    title: "Vær",
    Component: WeatherWidgetAdapter,
    defaultGrid: { w: 3, h: 3 },
  },

  news: {
    title: "Nyheter",
    Component: NewsWidgetAdapter,
    defaultGrid: { w: 6, h: 6 },
  },

  spotify: {
    title: "Spotify",
    Component: SpotifyWidgetAdapter,
    defaultGrid: { w: 4, h: 3 },
  },

  bookmark: {
    title: "Bokmerker",
    Component: BookmarkWidgetAdapter,
    defaultGrid: { w: 4, h: 4 },
  },
};