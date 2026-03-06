
import { useState } from "react";

export type WidgetSize = "small" | "medium" | "large" | "wide";

export const SIZE_MAP = {
  small: { w: 4, h: 2 },
  medium: { w: 9, h: 5 },
  large: { w: 13, h: 6 },
  wide: { w: 18, h: 3 },
};

export const AVAILABLE_WIDGETS = [
  { id: "clock", label: "Klokke" },
  { id: "search", label: "Søk" },
  { id: "news", label: "Nyheter" },
  { id: "weather", label: "Vær" },
  { id: "Bookmark", label: "Bokmerke" },
  { id: "Notes", label: "Notater" },
  { id: "spotify", label: "Spotify" },
];

export function useWidgets() {

  const [activeWidgets, setActiveWidgets] = useState<string[]>([
    "clock",
    "search",
    "spotify"
  ]);

  const [widgetSizes, setWidgetSizes] = useState<Record<string, WidgetSize>>({
    clock: "small",
    search: "small",
    news: "medium",
    weather: "small",
    Bookmark: "medium",
    Notes: "small",
    spotify: "small",
  });

  const toggleWidget = (id: string) => {
    setActiveWidgets(prev =>
      prev.includes(id)
        ? prev.filter(w => w !== id)
        : [...prev, id]
    );
  };

  return {
    activeWidgets,
    widgetSizes,
    setWidgetSizes,
    toggleWidget
  };
}