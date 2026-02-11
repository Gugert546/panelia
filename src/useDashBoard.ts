import { useEffect, useState } from "react";
import type { WidgetType } from "./WidgetRegistry";

export type WidgetInstance = {
  id: string;
  type: WidgetType;
  config: Record<string, unknown>;
  pos: { x: number; y: number; w: number; h: number };
};

type StoredShape = { widgets?: WidgetInstance[] };

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function defaultConfigFor(type: WidgetType): Record<string, unknown> {
  switch (type) {
    case "notes":
      return { text: "" };
    default:
      return {};
  }
}

function defaultSizeFor(type: WidgetType) {
  switch (type) {
    case "clock":
      return { w: 240, h: 70 };
    case "notes":
      return { w: 360, h: 220 };
    case "calendar":
      return { w: 420, h: 360 };
    case "google_search":
      return { w: 460, h: 80 };
    default:
      return { w: 320, h: 200 };
  }
}

function getDefaultWidgets(): WidgetInstance[] {
  const clock: WidgetInstance = {
    id: "w_clock",
    type: "clock",
    config: defaultConfigFor("clock"),
    pos: { x: 40, y: 40, ...defaultSizeFor("clock") },
  };

  const calendar: WidgetInstance = {
    id: "w_calendar",
    type: "calendar",
    config: defaultConfigFor("calendar"),
    pos: { x: 240, y: 40, ...defaultSizeFor("calendar") },
  };

  return [clock, calendar];
}

export function useDashboard(storageKey: string) {
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // LAST FRA localStorage
  useEffect(() => {
    const raw = localStorage.getItem(storageKey);

    if (!raw) {
      setWidgets(getDefaultWidgets());
      setHydrated(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as StoredShape;
      setWidgets(parsed.widgets ?? []);
    } catch {
      setWidgets(getDefaultWidgets());
    } finally {
      setHydrated(true);
    }
  }, [storageKey]);

  // LAGRE til localStorage
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(storageKey, JSON.stringify({ widgets }));
  }, [widgets, hydrated, storageKey]);

  function addWidget(type: WidgetType) {
    const id = `w_${type}_${uid()}`;
    const size = defaultSizeFor(type);
    const offset = widgets.length * 24;

    setWidgets((prev) => [
      ...prev,
      {
        id,
        type,
        config: defaultConfigFor(type),
        pos: {
          x: 40 + offset,
          y: 40 + offset,
          w: size.w,
          h: size.h,
        },
      },
    ]);
  }

  function removeWidget(id: string) {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  }

  function resetToDefault() {
    const defaults = getDefaultWidgets();
    setWidgets(defaults);
    localStorage.setItem(storageKey, JSON.stringify({ widgets: defaults }));
  }

  function updateWidgetConfig(id: string, patch: Record<string, unknown>) {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, config: { ...w.config, ...patch } } : w))
    );
  }

  function updateWidgetPos(id: string, pos: Partial<WidgetInstance["pos"]>) {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, pos: { ...w.pos, ...pos } } : w))
    );
  }

  return {
    widgets,
    hydrated,
    addWidget,
    removeWidget,
    resetToDefault,
    updateWidgetConfig,
    updateWidgetPos,
  };
}