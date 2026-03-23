import type { FC } from "react";

import ClockWidget from "../builtins/ClockWidget/ClockWidget";
import NotesWidget from "../builtins/NotesWidget/NotesWidgetUI";
import CalendarWidget from "../builtins/CalendarWidget/CalendarWidget";
import SearchWidgetUI from "../builtins/searchWidget/SearchWidgetUI";
import WeatherWidget from "../builtins/WeatherWidget/WeatherWidgetUI";
import NewsWidget from "../builtins/NewsWidget/NewsWidget";
import SpotifyWidget from "../builtins/SpotifyWidget/SpotifyWidget";
import BookmarkUi from "../builtins/BookmarkWidget/BookmarkUi";
import CustomButtonItemWidget from "../builtins/CustomButtonsWidget/CustomButtonItemWidget";
import type { CustomButtonConfig } from "../../dashboard/hooks/useWidgetsState";
import { useWidgets } from "../../dashboard/hooks/WidgetsContext";

export type WidgetType =
  | "clock"
  | "notes"
  | "calendar"
  | "google_search"
  | "weather"
  | "news"
  | "spotify"
  | "bookmark"
  | "customButtons"
  | "customButton";

export type WidgetComponentProps = {
  config: Record<string, unknown>;
  onConfigChange: (patch: Record<string, unknown>) => void;
  widgetId?: string;
  onClose?: () => void;
};

type WidgetDefinition = {
  title: string;
  Component: FC<WidgetComponentProps>;
  defaultGrid: {
    w: number;
    h: number;
  };
};

const ClockWidgetAdapter: FC<WidgetComponentProps> = () => <ClockWidget />;
const NotesWidgetAdapter: FC<WidgetComponentProps> = ({ widgetId, onClose }) => (
  <NotesWidget widgetId={widgetId ?? ""} onClose={onClose} />
);
const CalendarWidgetAdapter: FC<WidgetComponentProps> = () => <CalendarWidget />;
const SearchWidgetAdapter: FC<WidgetComponentProps> = () => <SearchWidgetUI />;
const WeatherWidgetAdapter: FC<WidgetComponentProps> = () => <WeatherWidget />;
const NewsWidgetAdapter: FC<WidgetComponentProps> = () => <NewsWidget />;
const SpotifyWidgetAdapter: FC<WidgetComponentProps> = () => <SpotifyWidget />;
const BookmarkWidgetAdapter: FC<WidgetComponentProps> = () => <BookmarkUi />;
const CustomButtonWidgetAdapter: FC<WidgetComponentProps> = ({ widgetId }) => {
  const { customButtonConfigs } = useWidgets();

  if (!widgetId) return null;

  const config = customButtonConfigs[widgetId];
  if (!config) return null;

  return (
    <CustomButtonItemWidget
      label={config.label}
      url={config.url}
      favicon={config.favicon}
    />
  );
};

const STATIC_WIDGETS: Record<string, WidgetDefinition> = {
  clock: {
    title: "Klokke",
    Component: ClockWidgetAdapter,
    defaultGrid: { w: 5, h: 3 },
  },
  notes: {
    title: "Notater",
    Component: NotesWidgetAdapter,
    defaultGrid: { w: 8, h: 8 },
  },
  calendar: {
    title: "Kalender",
    Component: CalendarWidgetAdapter,
    defaultGrid: { w: 16, h: 12 },
  },
  google_search: {
    title: "Søk",
    Component: SearchWidgetAdapter,
    defaultGrid: { w: 14, h: 3 },
  },
  weather: {
    title: "Vær",
    Component: WeatherWidgetAdapter,
    defaultGrid: { w: 5, h: 4 },
  },
  news: {
    title: "Nyheter",
    Component: NewsWidgetAdapter,
    defaultGrid: { w: 10, h: 10 },
  },
  spotify: {
    title: "Spotify",
    Component: SpotifyWidgetAdapter,
    defaultGrid: { w: 8, h: 6 },
  },
  bookmark: {
    title: "Bokmerker",
    Component: BookmarkWidgetAdapter,
    defaultGrid: { w: 8, h: 8 },
  },
  customButton: {
    title: "Egendefinert knapp",
    Component: CustomButtonWidgetAdapter,
    defaultGrid: { w: 4, h: 4 },
  },
};

export function buildWidgets(
  customButtonConfigs: Record<string, CustomButtonConfig>
): Record<string, WidgetDefinition> {
  const dynamicButtons = Object.fromEntries(
    Object.entries(customButtonConfigs).map(([id, config]) => [
      id,
      {
        title: config.label,
        Component: () => (
          <CustomButtonItemWidget
            label={config.label}
            url={config.url}
            favicon={config.favicon}
          />
        ),
        defaultGrid: { w: 2, h: 2 },
      } satisfies WidgetDefinition,
    ])
  );

  return {
    ...STATIC_WIDGETS,
    ...dynamicButtons,
  };
}

export const WIDGETS = STATIC_WIDGETS;
