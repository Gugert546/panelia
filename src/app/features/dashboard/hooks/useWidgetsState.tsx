import { useState, useEffect, useCallback, useRef } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../lib/firebase/client";
import { useAuth } from "../../auth/useAuth";

type LayoutItem = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CustomButtonConfig = {
  label: string;
  url: string;
  favicon: string;
};

export type WidgetInstance = {
  id: string;
  type: string;
  config: Record<string, unknown>;
};

type WidgetLayoutDocument = {
  activeWidgets?: string[];
  layouts?: Record<string, LayoutItem>;
  customButtonConfigs?: Record<string, CustomButtonConfig>;
  updatedAt?: unknown;
};

export const AVAILABLE_WIDGETS = [
  { id: "clock", label: "Klokke" },
  { id: "google_search", label: "Søk" },
  { id: "news", label: "Nyheter" },
  { id: "weather", label: "Vær" },
  { id: "bookmark", label: "Bokmerke" },
  { id: "notes", label: "Notater" },
  { id: "spotify", label: "Spotify" },
] as const;

const SAVE_DEBOUNCE_MS = 1000;

const DEFAULT_LAYOUTS: Record<string, LayoutItem> = {
  clock: { x: 0, y: 0, w: 3, h: 2 },
  notes: { x: 0, y: 0, w: 4, h: 4 },
  calendar: { x: 0, y: 0, w: 8, h: 6 },
  google_search: { x: 0, y: 0, w: 8, h: 2 },
  weather: { x: 0, y: 0, w: 3, h: 3 },
  news: { x: 0, y: 0, w: 6, h: 6 },
  spotify: { x: 0, y: 0, w: 4, h: 3 },
  bookmark: { x: 0, y: 0, w: 4, h: 4 },
  customButton: { x: 0, y: 0, w: 2, h: 2 },
};

function createCustomButtonId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `customButton:${crypto.randomUUID()}`;
  }

  return `customButton:${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function migrateLegacyCustomButtonId(id: string) {
  if (!id.startsWith("customButton__")) return id;
  return `customButton:${id.slice("customButton__".length)}`;
}

function migrateLegacyMap<T>(input: Record<string, T>) {
  return Object.fromEntries(
    Object.entries(input).map(([id, value]) => [migrateLegacyCustomButtonId(id), value])
  );
}

export function useWidgetsState() {
  const { user } = useAuth();

  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  const [customButtonConfigs, setCustomButtonConfigs] = useState<
    Record<string, CustomButtonConfig>
  >({});
  const [layouts, setLayouts] = useState<Record<string, LayoutItem>>({});
  const [isLoading, setIsLoading] = useState(true);

  const hasLoadedRef = useRef(false);

  const loadLayout = useCallback(async () => {
    if (!user) {
      setActiveWidgets([]);
      setCustomButtonConfigs({});
      setLayouts({});
      setIsLoading(false);
      hasLoadedRef.current = false;
      return;
    }

    try {
      const docRef = doc(db, "users", user.uid, "widgetLayout", "current");
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setActiveWidgets([]);
        setCustomButtonConfigs({});
        setLayouts({});
        hasLoadedRef.current = true;
        return;
      }

      const data = docSnap.data() as WidgetLayoutDocument;

      const migratedActiveWidgets = Array.isArray(data.activeWidgets)
        ? data.activeWidgets.map(migrateLegacyCustomButtonId)
        : [];
      const migratedCustomButtonConfigs = migrateLegacyMap(data.customButtonConfigs ?? {});
      const migratedLayouts = migrateLegacyMap(data.layouts ?? {});

      setActiveWidgets(migratedActiveWidgets);
      setCustomButtonConfigs(migratedCustomButtonConfigs);
      setLayouts(migratedLayouts);
      hasLoadedRef.current = true;
    } catch (error) {
      console.error("Failed to load widget layout:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadLayout();
  }, [loadLayout]);

  useEffect(() => {
    if (!user) return;
    if (isLoading) return;
    if (!hasLoadedRef.current) return;

    const timeout = setTimeout(async () => {
      try {
        const docRef = doc(db, "users", user.uid, "widgetLayout", "current");

        await setDoc(docRef, {
          activeWidgets,
          customButtonConfigs,
          layouts,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error("Failed to save widget layout:", error);
      }
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [user, activeWidgets, customButtonConfigs, layouts, isLoading]);

  const toggleWidget = useCallback((id: string) => {
    setActiveWidgets((prev) => {
      const exists = prev.includes(id);

      if (exists) {
        return prev.filter((widgetId) => widgetId !== id);
      }

      return [...prev, id];
    });

    setLayouts((prev) => {
      if (prev[id]) return prev;

      const defaultLayout = DEFAULT_LAYOUTS[id];
      if (!defaultLayout) return prev;

      return {
        ...prev,
        [id]: defaultLayout,
      };
    });
  }, []);

  const updateLayout = useCallback(
    (newLayouts: Record<string, LayoutItem>) => {
      setLayouts(newLayouts);
    },
    []
  );

  const addCustomButton = useCallback((config: CustomButtonConfig) => {
    const id = createCustomButtonId();

    console.log("🟢 addCustomButton called");
    console.log("generated id:", id);
    console.log("config:", config);

    setActiveWidgets((prev) => {
      const next = [...prev, id];
      console.log("new activeWidgets:", next);
      return next;
    });

    setCustomButtonConfigs((prev) => {
      const next = {
        ...prev,
        [id]: config,
      };
      console.log("new customButtonConfigs:", next);
      return next;
    });

    setLayouts((prev) => {
      const next = {
        ...prev,
        [id]: DEFAULT_LAYOUTS.customButton,
      };
      console.log("new layouts:", next);
      return next;
    });

    return id;
  }, []);

  const removeCustomButton = useCallback((id: string) => {
    setActiveWidgets((prev) => prev.filter((widgetId) => widgetId !== id));

    setCustomButtonConfigs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    setLayouts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  return {
    activeWidgets,
    customButtonConfigs,
    layouts,
    isLoading,
    toggleWidget,
    updateLayout,
    addCustomButton,
    removeCustomButton,
  };
}
