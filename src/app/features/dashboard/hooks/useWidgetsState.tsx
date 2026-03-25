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

export type DashboardPreset = {
  id: string;
  name: string;
  activeWidgets: string[];
  layouts: Record<string, LayoutItem>;
  customButtonConfigs: Record<string, CustomButtonConfig>;
  widgetSurfaceColor: string;
  widgetBorderColor: string;
  widgetBorderWidth: number;
  widgetSizeMode: WidgetSizeMode;
  dashboardBackgroundId: DashboardBackgroundId;
  customVideoBackgroundUrl: string;
  createdAt: number;
};

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
  dashboardPresets?: DashboardPreset[];
  updatedAt?: unknown;
};

// Available widgets for the dashboard
export const AVAILABLE_WIDGETS = [
  { id: "clock", label: "Klokke" },
  { id: "calendar", label: "Kalender" },
  { id: "google_search", label: "Søk" },
  { id: "news", label: "Nyheter" },
  { id: "weather", label: "Vær" },
  { id: "bookmark", label: "Bokmerke" },
  { id: "notes", label: "Notater" },
  { id: "spotify", label: "Spotify" },
] as const;

// Debounce delay for saving to Firestore (5 seconds)
const SAVE_DEBOUNCE_MS = 5000;
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

function createDashboardPresetId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `preset:${crypto.randomUUID()}`;
  }
  return `preset:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeLayouts(value: unknown): Record<string, LayoutItem> {
  if (!value || typeof value !== "object") return {};

  const entries = Object.entries(value as Record<string, unknown>);
  const next: Record<string, LayoutItem> = {};

  for (const [id, rawLayout] of entries) {
    if (!rawLayout || typeof rawLayout !== "object") continue;

    const layout = rawLayout as Record<string, unknown>;
    const x = Number(layout.x);
    const y = Number(layout.y);
    const w = Number(layout.w);
    const h = Number(layout.h);

    if (
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      Number.isFinite(w) &&
      Number.isFinite(h)
    ) {
      next[migrateLegacyCustomButtonId(id)] = { x, y, w, h };
    }
  }

  return next;
}

function normalizeCustomButtonConfigs(value: unknown): Record<string, CustomButtonConfig> {
  if (!value || typeof value !== "object") return {};

  const entries = Object.entries(value as Record<string, unknown>);
  const next: Record<string, CustomButtonConfig> = {};

  for (const [id, rawConfig] of entries) {
    if (!rawConfig || typeof rawConfig !== "object") continue;

    const config = rawConfig as Record<string, unknown>;
    if (
      typeof config.label === "string" &&
      typeof config.url === "string" &&
      typeof config.favicon === "string"
    ) {
      next[migrateLegacyCustomButtonId(id)] = {
        label: config.label,
        url: config.url,
        favicon: config.favicon,
      };
    }
  }

  return next;
}

function normalizeDashboardPresets(value: unknown): DashboardPreset[] {
  if (!Array.isArray(value)) return [];

  const presets: DashboardPreset[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const rawPreset = value[index];
    if (!rawPreset || typeof rawPreset !== "object") continue;

    const preset = rawPreset as Record<string, unknown>;
    const name = typeof preset.name === "string" && preset.name.trim()
      ? preset.name.trim()
      : `Preset ${index + 1}`;

    const activeWidgets = Array.isArray(preset.activeWidgets)
      ? preset.activeWidgets
        .filter((widgetId): widgetId is string => typeof widgetId === "string")
        .map(migrateLegacyCustomButtonId)
      : [];

    const widgetBorderWidth =
      typeof preset.widgetBorderWidth === "number" && Number.isFinite(preset.widgetBorderWidth)
        ? Math.min(12, Math.max(0, Math.round(preset.widgetBorderWidth)))
        : DEFAULT_WIDGET_BORDER_WIDTH;

    presets.push({
      id:
        typeof preset.id === "string" && preset.id
          ? preset.id
          : createDashboardPresetId(),
      name,
      activeWidgets,
      layouts: normalizeLayouts(preset.layouts),
      customButtonConfigs: normalizeCustomButtonConfigs(preset.customButtonConfigs),
      widgetSurfaceColor:
        typeof preset.widgetSurfaceColor === "string" && preset.widgetSurfaceColor
          ? preset.widgetSurfaceColor
          : DEFAULT_WIDGET_SURFACE_COLOR,
      widgetBorderColor:
        typeof preset.widgetBorderColor === "string" && preset.widgetBorderColor
          ? preset.widgetBorderColor
          : DEFAULT_WIDGET_BORDER_COLOR,
      widgetBorderWidth,
      widgetSizeMode:
        preset.widgetSizeMode === "small" ||
        preset.widgetSizeMode === "medium" ||
        preset.widgetSizeMode === "large"
          ? preset.widgetSizeMode
          : DEFAULT_WIDGET_SIZE_MODE,
      dashboardBackgroundId: isDashboardBackgroundId(preset.dashboardBackgroundId)
        ? preset.dashboardBackgroundId
        : DEFAULT_DASHBOARD_BACKGROUND_ID,
      customVideoBackgroundUrl:
        typeof preset.customVideoBackgroundUrl === "string"
          ? preset.customVideoBackgroundUrl
          : "",
      createdAt:
        typeof preset.createdAt === "number" && Number.isFinite(preset.createdAt)
          ? preset.createdAt
          : Date.now(),
    });
  }

  return presets;
}

function normalizePersistedVideoUrl(url: string) {
  if (url.startsWith("blob:")) {
    return "";
  }

  return url;
}

function sanitizePresetForPersistence(preset: DashboardPreset): DashboardPreset {
  return {
    ...preset,
    customVideoBackgroundUrl: normalizePersistedVideoUrl(
      preset.customVideoBackgroundUrl
    ),
  };
}

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
  const [dashboardPresets, setDashboardPresets] = useState<DashboardPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const hasLoadedRef = useRef(false);

  // Load widget layout from Firestore
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
      setDashboardPresets([]);
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
        setDashboardPresets([]);
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
          ? normalizePersistedVideoUrl(data.customVideoBackgroundUrl)
          : ""
      );
      setDashboardPresets(normalizeDashboardPresets(data.dashboardPresets));
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
          widgetSurfaceColor,
          widgetBorderColor,
          widgetBorderWidth,
          widgetSizeMode,
          dashboardBackgroundId,
          customVideoBackgroundUrl: normalizePersistedVideoUrl(
            customVideoBackgroundUrl
          ),
          dashboardPresets: dashboardPresets.map(sanitizePresetForPersistence),
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
    dashboardPresets,
    isLoading,
  ]);

  const persistPresetsImmediately = useCallback(
    async (nextPresets: DashboardPreset[]) => {
      if (!user || isLoading || !hasLoadedRef.current) return;

      try {
        const docRef = doc(db, "users", user.uid, "widgetLayout", "current");
        await setDoc(
          docRef,
          {
            dashboardPresets: nextPresets.map(sanitizePresetForPersistence),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.error("Failed to save dashboard presets:", error);
      }
    },
    [isLoading, user]
  );

  const saveCurrentAsPreset = useCallback((name?: string) => {
    const trimmedName = name?.trim() ?? "";

    const newPreset: DashboardPreset = {
      id: createDashboardPresetId(),
      name: trimmedName || `Preset ${dashboardPresets.length + 1}`,
      activeWidgets: [...activeWidgets],
      layouts: { ...layouts },
      customButtonConfigs: { ...customButtonConfigs },
      widgetSurfaceColor,
      widgetBorderColor,
      widgetBorderWidth,
      widgetSizeMode,
      dashboardBackgroundId,
      customVideoBackgroundUrl: normalizePersistedVideoUrl(customVideoBackgroundUrl),
      createdAt: Date.now(),
    };

    const nextPresets = [newPreset, ...dashboardPresets].slice(0, 30);
    setDashboardPresets(nextPresets);
    void persistPresetsImmediately(nextPresets);

    return newPreset.id;
  }, [
    activeWidgets,
    customButtonConfigs,
    customVideoBackgroundUrl,
    dashboardBackgroundId,
    dashboardPresets.length,
    dashboardPresets,
    layouts,
    persistPresetsImmediately,
    widgetBorderColor,
    widgetBorderWidth,
    widgetSizeMode,
    widgetSurfaceColor,
  ]);

  const applyDashboardPreset = useCallback((presetId: string) => {
    const preset = dashboardPresets.find((item) => item.id === presetId);
    if (!preset) return false;

    setActiveWidgets([...preset.activeWidgets]);
    setLayouts({ ...preset.layouts });
    setCustomButtonConfigs({ ...preset.customButtonConfigs });
    setWidgetSurfaceColor(preset.widgetSurfaceColor);
    setWidgetBorderColor(preset.widgetBorderColor);
    setWidgetBorderWidth(preset.widgetBorderWidth);
    setWidgetSizeMode(preset.widgetSizeMode);
    setDashboardBackgroundId(preset.dashboardBackgroundId);
    setCustomVideoBackgroundUrl(preset.customVideoBackgroundUrl);

    return true;
  }, [dashboardPresets]);

  const deleteDashboardPreset = useCallback((presetId: string) => {
    const nextPresets = dashboardPresets.filter((preset) => preset.id !== presetId);
    setDashboardPresets(nextPresets);
    void persistPresetsImmediately(nextPresets);
  }, [dashboardPresets, persistPresetsImmediately]);

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
    widgetSurfaceColor,
    widgetBorderColor,
    widgetBorderWidth,
    widgetSizeMode,
    dashboardBackgroundId,
    customVideoBackgroundUrl,
    dashboardPresets,
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
    saveCurrentAsPreset,
    applyDashboardPreset,
    deleteDashboardPreset,
  };
}
