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

export type WidgetSizeMode = "small" | "medium" | "large";
export type DashboardBackgroundId =
  | "sol1"
  | "sol2"
  | "sol3"
  | "natt1"
  | "natt2"
  | "natt3"
  | "videoCustom";

type WidgetLayoutDocument = {
  activeWidgets?: string[];
  layouts?: Record<string, LayoutItem>;
  customButtonConfigs?: Record<string, CustomButtonConfig>;
  widgetSurfaceColor?: string;
  widgetBorderColor?: string;
  widgetBorderWidth?: number;
  widgetSizeMode?: WidgetSizeMode;
  dashboardBackgroundId?: DashboardBackgroundId;
  customVideoBackgroundUrl?: string;
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
const DEFAULT_WIDGET_SURFACE_COLOR = "rgba(255,255,255,0.15)";
const DEFAULT_WIDGET_BORDER_COLOR = "rgba(255,255,255,0.35)";
const DEFAULT_WIDGET_BORDER_WIDTH = 1;
const DEFAULT_WIDGET_SIZE_MODE: WidgetSizeMode = "medium";
const DEFAULT_DASHBOARD_BACKGROUND_ID: DashboardBackgroundId = "sol1";

function isDashboardBackgroundId(value: unknown): value is DashboardBackgroundId {
  return (
    value === "sol1" ||
    value === "sol2" ||
    value === "sol3" ||
    value === "natt1" ||
    value === "natt2" ||
    value === "natt3" ||
    value === "videoCustom"
  );
}

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
  const [widgetSurfaceColor, setWidgetSurfaceColor] = useState(
    DEFAULT_WIDGET_SURFACE_COLOR
  );
  const [widgetBorderColor, setWidgetBorderColor] = useState(
    DEFAULT_WIDGET_BORDER_COLOR
  );
  const [widgetBorderWidth, setWidgetBorderWidth] = useState(
    DEFAULT_WIDGET_BORDER_WIDTH
  );
  const [widgetSizeMode, setWidgetSizeMode] = useState<WidgetSizeMode>(
    DEFAULT_WIDGET_SIZE_MODE
  );
  const [dashboardBackgroundId, setDashboardBackgroundId] =
    useState<DashboardBackgroundId>(DEFAULT_DASHBOARD_BACKGROUND_ID);
  const [customVideoBackgroundUrl, setCustomVideoBackgroundUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const hasLoadedRef = useRef(false);

  const loadLayout = useCallback(async () => {
    if (!user) {
      setActiveWidgets([]);
      setCustomButtonConfigs({});
      setLayouts({});
      setWidgetSurfaceColor(DEFAULT_WIDGET_SURFACE_COLOR);
      setWidgetBorderColor(DEFAULT_WIDGET_BORDER_COLOR);
      setWidgetBorderWidth(DEFAULT_WIDGET_BORDER_WIDTH);
      setWidgetSizeMode(DEFAULT_WIDGET_SIZE_MODE);
      setDashboardBackgroundId(DEFAULT_DASHBOARD_BACKGROUND_ID);
      setCustomVideoBackgroundUrl("");
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
        setWidgetSurfaceColor(DEFAULT_WIDGET_SURFACE_COLOR);
        setWidgetBorderColor(DEFAULT_WIDGET_BORDER_COLOR);
        setWidgetBorderWidth(DEFAULT_WIDGET_BORDER_WIDTH);
        setWidgetSizeMode(DEFAULT_WIDGET_SIZE_MODE);
        setDashboardBackgroundId(DEFAULT_DASHBOARD_BACKGROUND_ID);
        setCustomVideoBackgroundUrl("");
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
      setWidgetSurfaceColor(
        typeof data.widgetSurfaceColor === "string" && data.widgetSurfaceColor
          ? data.widgetSurfaceColor
          : DEFAULT_WIDGET_SURFACE_COLOR
      );
      setWidgetBorderColor(
        typeof data.widgetBorderColor === "string" && data.widgetBorderColor
          ? data.widgetBorderColor
          : DEFAULT_WIDGET_BORDER_COLOR
      );
      setWidgetBorderWidth(
        typeof data.widgetBorderWidth === "number" && Number.isFinite(data.widgetBorderWidth)
          ? Math.min(12, Math.max(0, Math.round(data.widgetBorderWidth)))
          : DEFAULT_WIDGET_BORDER_WIDTH
      );
      setWidgetSizeMode(
        data.widgetSizeMode === "small" ||
          data.widgetSizeMode === "medium" ||
          data.widgetSizeMode === "large"
          ? data.widgetSizeMode
          : DEFAULT_WIDGET_SIZE_MODE
      );
      setDashboardBackgroundId(
        isDashboardBackgroundId(data.dashboardBackgroundId)
          ? data.dashboardBackgroundId
          : DEFAULT_DASHBOARD_BACKGROUND_ID
      );
      setCustomVideoBackgroundUrl(
        typeof data.customVideoBackgroundUrl === "string"
          ? data.customVideoBackgroundUrl
          : ""
      );
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
          widgetSurfaceColor,
          widgetBorderColor,
          widgetBorderWidth,
          widgetSizeMode,
          dashboardBackgroundId,
          customVideoBackgroundUrl,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error("Failed to save widget layout:", error);
      }
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [
    user,
    activeWidgets,
    customButtonConfigs,
    layouts,
    widgetSurfaceColor,
    widgetBorderColor,
    widgetBorderWidth,
    widgetSizeMode,
    dashboardBackgroundId,
    customVideoBackgroundUrl,
    isLoading,
  ]);

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
    widgetSurfaceColor,
    widgetBorderColor,
    widgetBorderWidth,
    widgetSizeMode,
    dashboardBackgroundId,
    customVideoBackgroundUrl,
    isLoading,
    toggleWidget,
    updateLayout,
    addCustomButton,
    removeCustomButton,
    setWidgetSurfaceColor,
    setWidgetBorderColor,
    setWidgetBorderWidth,
    setWidgetSizeMode,
    setDashboardBackgroundId,
    setCustomVideoBackgroundUrl,
  };
}
