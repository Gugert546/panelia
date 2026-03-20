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

type WidgetLayoutDocument = {
  activeWidgets?: string[];
  layouts?: Record<string, LayoutItem>;
  customButtonConfigs?: Record<string, CustomButtonConfig>;
  updatedAt?: unknown;
};

// Available widgets for the dashboard
export const AVAILABLE_WIDGETS = [
  { id: "clock", label: "Klokke" },
  { id: "google_search", label: "Søk" },
  { id: "news", label: "Nyheter" },
  { id: "weather", label: "Vær" },
  { id: "bookmark", label: "Bokmerke" },
  { id: "notes", label: "Notater" },
  { id: "spotify", label: "Spotify" },
] as const;

// Debounce delay for saving to Firestore (5 seconds)
const SAVE_DEBOUNCE_MS = 5000;

// Default layouts for new widgets (aligned with WidgetRegistry defaultGrid sizes)
const DEFAULT_LAYOUTS: Record<string, LayoutItem> = {
  clock: { x: 0, y: 0, w: 5, h: 3 },
  notes: { x: 0, y: 0, w: 8, h: 8 },
  calendar: { x: 0, y: 0, w: 16, h: 12 },
  google_search: { x: 0, y: 0, w: 14, h: 3 },
  weather: { x: 0, y: 0, w: 5, h: 4 },
  news: { x: 0, y: 0, w: 10, h: 10 },
  spotify: { x: 0, y: 0, w: 4, h: 3 },
  bookmark: { x: 0, y: 0, w: 4, h: 4 },
  customButton: { x: 0, y: 0, w: 2, h: 2 },
};

// Generate a unique ID for custom buttons
function createCustomButtonId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `customButton:${crypto.randomUUID()}`;
  }
  return `customButton:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Legacy migration functions (for backward compatibility)
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
  const [customButtonConfigs, setCustomButtonConfigs] = useState<Record<string, CustomButtonConfig>>({});
  const [layouts, setLayouts] = useState<Record<string, LayoutItem>>({});
  const [isLoading, setIsLoading] = useState(true);

  const hasLoadedRef = useRef(false);

  // Load widget layout from Firestore
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

      // Apply legacy migrations
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

  // Auto-save changes to Firestore with debouncing
  useEffect(() => {
    if (!user || isLoading || !hasLoadedRef.current) return;

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

  // Toggle a widget on/off
  const toggleWidget = useCallback((id: string) => {
    setActiveWidgets((prev) => {
      const exists = prev.includes(id);
      return exists ? prev.filter((widgetId) => widgetId !== id) : [...prev, id];
    });

    setLayouts((prev) => {
      if (prev[id]) return prev;
      const defaultLayout = DEFAULT_LAYOUTS[id];
      return defaultLayout ? { ...prev, [id]: defaultLayout } : prev;
    });
  }, []);

  // Update widget layouts (e.g., after dragging/resizing)
  const updateLayout = useCallback((newLayouts: Record<string, LayoutItem>) => {
    setLayouts(newLayouts);
  }, []);

  // Add a new custom button
  const addCustomButton = useCallback((config: CustomButtonConfig) => {
    const id = createCustomButtonId();

    setActiveWidgets((prev) => [...prev, id]);
    setCustomButtonConfigs((prev) => ({ ...prev, [id]: config }));
    setLayouts((prev) => ({ ...prev, [id]: DEFAULT_LAYOUTS.customButton }));

    return id;
  }, []);

  // Remove a custom button
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
