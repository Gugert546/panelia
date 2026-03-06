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

export type WidgetSize = "small" | "medium" | "large" | "wide";

export type WidgetComponentProps = {
  config: Record<string, unknown>;
  onConfigChange: (patch: Record<string, unknown>) => void;
};

const getSize = (config: Record<string, unknown>) =>
  (config.size as WidgetSize) ?? "small";

const ClockWidgetAdapter: FC<WidgetComponentProps> = ({ config }) => {
  return <ClockWidget size={getSize(config)} />;
};

const NotesWidgetAdapter: FC<WidgetComponentProps> = ({ config }) => {
  return <NotesWidget size={getSize(config)} />;
};

const CalendarWidgetAdapter: FC<WidgetComponentProps> = () => {
  return <CalendarWidget />;
};

const SearchWidgetAdapter: FC<WidgetComponentProps> = ({ config }) => {
  return <SearchWidgetUI size={getSize(config)} />;
};

const WeatherWidgetAdapter: FC<WidgetComponentProps> = ({ config }) => {
  return <WeatherWidget size={getSize(config)} />;
};

const NewsWidgetAdapter: FC<WidgetComponentProps> = ({ config }) => {
  return <NewsWidget size={getSize(config)} />;
};

const SpotifyWidgetAdapter: FC<WidgetComponentProps> = ({ config }) => {
  return <SpotifyWidget size={getSize(config)} />;
};

const BookmarkWidgetAdapter: FC<WidgetComponentProps> = ({ config }) => {
  return <BookmarkUi size={getSize(config)} />;
};

export const WIDGETS: Record<
  WidgetType,
  {
    title: string;
    Component: FC<WidgetComponentProps>;
    defaultSize: WidgetSize;
  }
> = {
  clock: {
    title: "Klokke",
    Component: ClockWidgetAdapter,
    defaultSize: "small",
  },

  notes: {
    title: "Notater",
    Component: NotesWidgetAdapter,
    defaultSize: "small",
  },

  calendar: {
    title: "Kalender",
    Component: CalendarWidgetAdapter,
    defaultSize: "large",
  },

  google_search: {
    title: "Søk",
    Component: SearchWidgetAdapter,
    defaultSize: "medium",
  },

  weather: {
    title: "Vær",
    Component: WeatherWidgetAdapter,
    defaultSize: "large",
  },

  news: {
    title: "Nyheter",
    Component: NewsWidgetAdapter,
    defaultSize: "large",
  },

  spotify: {
    title: "Spotify",
    Component: SpotifyWidgetAdapter,
    defaultSize: "small",
  },

  bookmark: {
    title: "Bokmerker",
    Component: BookmarkWidgetAdapter,
    defaultSize: "small",
  },
};