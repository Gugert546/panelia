import { useState } from "react";

export const AVAILABLE_WIDGETS = [
  { id: "clock", label: "Klokke" },
  { id: "google_search", label: "Søk" },
  { id: "news", label: "Nyheter" },
  { id: "weather", label: "Vær" },
  { id: "bookmark", label: "Bokmerke" },
  { id: "notes", label: "Notater" },
  { id: "spotify", label: "Spotify" },
];
export function useWidgets() {

  const [activeWidgets, setActiveWidgets] = useState([
    "clock",
    "google_search",
    "spotify"
  ]);

  const toggleWidget = (id: string) => {
    setActiveWidgets(prev =>
      prev.includes(id)
        ? prev.filter(w => w !== id)
        : [...prev, id]
    );
  };

  return {
    activeWidgets,
    toggleWidget
  };
}