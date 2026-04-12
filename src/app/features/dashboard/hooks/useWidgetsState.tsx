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

const GRID_COLUMNS = 40; // Brukes for å plassere widget ved spawn
const GRID_ROWS = 20;

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
export type CustomBackgroundMediaType = "image" | "video";
export type DashboardBackgroundId =
  | "defaultbg"
  | "sol1"
  | "sol2"
  | "sol3"
  | "natt1"
  | "natt2"
  | "natt3"
  | "customMedia";

export type DashboardPreset = {
  id: string;
  name: string;
  activeWidgets: string[];
  layouts: Record<string, LayoutItem>;
  widgetLocks: Record<string, boolean>;
  customButtonConfigs: Record<string, CustomButtonConfig>;
  widgetSurfaceColor: string;
  widgetBorderColor: string;
  widgetTextColor: string;
  widgetOpacity: number;
  widgetBorderWidth: number;
  widgetSizeMode: WidgetSizeMode;
  dashboardBackgroundId: DashboardBackgroundId;
  customBackgroundUrl: string;
  customBackgroundType: CustomBackgroundMediaType;
  createdAt: number;
};

type WidgetLayoutDocument = {
  activeWidgets?: string[];
  layouts?: Record<string, LayoutItem>;
  widgetLocks?: Record<string, boolean>;
  customButtonConfigs?: Record<string, CustomButtonConfig>;
  widgetSurfaceColor?: string;
  widgetBorderColor?: string;
  widgetTextColor?: string;
  widgetOpacity?: number;
  widgetBorderWidth?: number;
  widgetSizeMode?: WidgetSizeMode;
  dashboardBackgroundId?: DashboardBackgroundId | "videoCustom";
  customBackgroundUrl?: string;
  customBackgroundType?: CustomBackgroundMediaType;
  customVideoBackgroundUrl?: string;
  dashboardPresets?: DashboardPreset[];
  updatedAt?: unknown;
};

// Available widgets for the dashboard
export const AVAILABLE_WIDGETS = [
  { id: "clock", label: "Klokke", icon: "schedule" },
  { id: "calendar", label: "Kalender", icon: "calendar_month" },
  { id: "google_search", label: "Søk", icon: "search" },
  { id: "news", label: "Nyheter", icon: "newsmode" },
  { id: "weather", label: "Vær", icon: "partly_cloudy_day" },
  { id: "bookmark", label: "Bokmerke", icon: "bookmark" },
  { id: "info", label: "Info", icon: "info" },
  { id: "notes", label: "Notater", icon: "sticky_note_2" },
  { id: "spotify", label: "Spotify", icon: "music_note" },
] as const;

// Debounce delay for saving to Firestore (5 seconds)
const SAVE_DEBOUNCE_MS = 5000;
const DEFAULT_WIDGET_SURFACE_COLOR = "rgba(255,255,255,0.15)";
const DEFAULT_WIDGET_BORDER_COLOR = "rgba(255,255,255,0.35)";
const DEFAULT_WIDGET_TEXT_COLOR = "#000000";
const DEFAULT_WIDGET_OPACITY = 1;
const DEFAULT_WIDGET_BORDER_WIDTH = 1;
const DEFAULT_WIDGET_SIZE_MODE: WidgetSizeMode = "medium";
const DEFAULT_DASHBOARD_BACKGROUND_ID: DashboardBackgroundId = "defaultbg";

function isDashboardBackgroundId(value: unknown): value is DashboardBackgroundId {
  return (
    value === "defaultbg" ||
    value === "sol1" ||
    value === "sol2" ||
    value === "sol3" ||
    value === "natt1" ||
    value === "natt2" ||
    value === "natt3" ||
    value === "customMedia"
  );
}

function normalizeDashboardBackgroundId(value: unknown): DashboardBackgroundId {
  if (value === "videoCustom") return "customMedia";
  return isDashboardBackgroundId(value) ? value : DEFAULT_DASHBOARD_BACKGROUND_ID;
}

function createDashboardPresetId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `preset:${crypto.randomUUID()}`;
  }
  return `preset:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createNotesWidgetId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `notes:${crypto.randomUUID()}`;
  }

  return `notes:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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

function normalizeWidgetLocks(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object") return {};

  const entries = Object.entries(value as Record<string, unknown>);
  const next: Record<string, boolean> = {};

  for (const [id, rawValue] of entries) {
    next[migrateLegacyCustomButtonId(id)] = Boolean(rawValue);
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

    const widgetOpacity =
      typeof preset.widgetOpacity === "number" && Number.isFinite(preset.widgetOpacity)
        ? Math.min(1, Math.max(0.2, Number(preset.widgetOpacity.toFixed(2))))
        : DEFAULT_WIDGET_OPACITY;

    presets.push({
      id:
        typeof preset.id === "string" && preset.id
          ? preset.id
          : createDashboardPresetId(),
      name,
      activeWidgets,
      layouts: normalizeLayouts(preset.layouts),
      widgetLocks: normalizeWidgetLocks(preset.widgetLocks),
      customButtonConfigs: normalizeCustomButtonConfigs(preset.customButtonConfigs),
      widgetSurfaceColor:
        typeof preset.widgetSurfaceColor === "string" && preset.widgetSurfaceColor
          ? preset.widgetSurfaceColor
          : DEFAULT_WIDGET_SURFACE_COLOR,
      widgetBorderColor:
        typeof preset.widgetBorderColor === "string" && preset.widgetBorderColor
          ? preset.widgetBorderColor
          : DEFAULT_WIDGET_BORDER_COLOR,
      widgetTextColor:
        typeof preset.widgetTextColor === "string" && preset.widgetTextColor
          ? preset.widgetTextColor
          : DEFAULT_WIDGET_TEXT_COLOR,
      widgetOpacity,
      widgetBorderWidth,
      widgetSizeMode:
        preset.widgetSizeMode === "small" ||
        preset.widgetSizeMode === "medium" ||
        preset.widgetSizeMode === "large"
          ? preset.widgetSizeMode
          : DEFAULT_WIDGET_SIZE_MODE,
      dashboardBackgroundId: normalizeDashboardBackgroundId(
        preset.dashboardBackgroundId
      ),
      customBackgroundUrl: normalizeCustomBackgroundUrl(
        typeof preset.customBackgroundUrl === "string"
          ? preset.customBackgroundUrl
          : typeof preset.customVideoBackgroundUrl === "string"
            ? preset.customVideoBackgroundUrl
            : ""
      ),
      customBackgroundType: normalizeCustomBackgroundType(
        preset.customBackgroundType,
        typeof preset.customVideoBackgroundUrl === "string" &&
          preset.customVideoBackgroundUrl
          ? "video"
          : "image"
      ),
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

function normalizeCustomBackgroundUrl(url: string) {
  return normalizePersistedVideoUrl(url);
}

function normalizeCustomBackgroundType(
  value: unknown,
  fallback: CustomBackgroundMediaType = "image"
): CustomBackgroundMediaType {
  return value === "image" || value === "video" ? value : fallback;
}

function sanitizePresetForPersistence(preset: DashboardPreset): DashboardPreset {
  return {
    ...preset,
    customBackgroundUrl: normalizeCustomBackgroundUrl(preset.customBackgroundUrl),
    customBackgroundType: normalizeCustomBackgroundType(
      preset.customBackgroundType,
      "image"
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
  info: { x: 0, y: 0, w: 6, h: 6 },
  customButton: { x: 0, y: 0, w: 2, h: 2 },
};

function rectsOverlap(a: LayoutItem, b: LayoutItem) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function createCenteredLayout(
  widgetType: string,
  existingLayouts: Record<string, LayoutItem>
): LayoutItem {
  const baseLayout = DEFAULT_LAYOUTS[widgetType] ?? DEFAULT_LAYOUTS.notes;
  const centeredX = Math.max(0, Math.floor((GRID_COLUMNS - baseLayout.w) / 2));
  const centeredY = Math.max(0, Math.floor((GRID_ROWS - baseLayout.h) / 2));

  const candidate: LayoutItem = {
    x: centeredX,
    y: centeredY,
    w: baseLayout.w,
    h: baseLayout.h,
  };

  const occupiedLayouts = Object.values(existingLayouts);

  if (!occupiedLayouts.some((layout) => rectsOverlap(candidate, layout))) {
    return candidate;
  }

  for (let offset = 1; offset < GRID_ROWS; offset += 1) {
    const staggeredCandidate: LayoutItem = {
      ...candidate,
      y: Math.min(GRID_ROWS - baseLayout.h, centeredY + offset),
    };

    if (!occupiedLayouts.some((layout) => rectsOverlap(staggeredCandidate, layout))) {
      return staggeredCandidate;
    }
  }

  return candidate;
}

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
  const [widgetLocks, setWidgetLocks] = useState<Record<string, boolean>>({});
  const [widgetSurfaceColor, setWidgetSurfaceColor] = useState(
    DEFAULT_WIDGET_SURFACE_COLOR
  );
  const [widgetBorderColor, setWidgetBorderColor] = useState(
    DEFAULT_WIDGET_BORDER_COLOR
  );
  const [widgetTextColor, setWidgetTextColor] = useState(
    DEFAULT_WIDGET_TEXT_COLOR
  );
  const [widgetOpacity, setWidgetOpacity] = useState(
    DEFAULT_WIDGET_OPACITY
  );
  const [widgetBorderWidth, setWidgetBorderWidth] = useState(
    DEFAULT_WIDGET_BORDER_WIDTH
  );
  const [widgetSizeMode, setWidgetSizeMode] = useState<WidgetSizeMode>(
    DEFAULT_WIDGET_SIZE_MODE
  );
  const [dashboardBackgroundId, setDashboardBackgroundId] =
    useState<DashboardBackgroundId>(DEFAULT_DASHBOARD_BACKGROUND_ID);
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState("");
  const [customBackgroundType, setCustomBackgroundType] =
    useState<CustomBackgroundMediaType>("image");
  const [dashboardPresets, setDashboardPresets] = useState<DashboardPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const hasLoadedRef = useRef(false);

  // Load widget layout from Firestore
  const loadLayout = useCallback(async () => {
    if (!user) {
      setActiveWidgets([]);
      setCustomButtonConfigs({});
      setLayouts({});
      setWidgetLocks({});
      setWidgetSurfaceColor(DEFAULT_WIDGET_SURFACE_COLOR);
      setWidgetBorderColor(DEFAULT_WIDGET_BORDER_COLOR);
      setWidgetTextColor(DEFAULT_WIDGET_TEXT_COLOR);
      setWidgetOpacity(DEFAULT_WIDGET_OPACITY);
      setWidgetBorderWidth(DEFAULT_WIDGET_BORDER_WIDTH);
      setWidgetSizeMode(DEFAULT_WIDGET_SIZE_MODE);
      setDashboardBackgroundId(DEFAULT_DASHBOARD_BACKGROUND_ID);
      setCustomBackgroundUrl("");
      setCustomBackgroundType("image");
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
        setWidgetLocks({});
        setWidgetSurfaceColor(DEFAULT_WIDGET_SURFACE_COLOR);
        setWidgetBorderColor(DEFAULT_WIDGET_BORDER_COLOR);
        setWidgetTextColor(DEFAULT_WIDGET_TEXT_COLOR);
        setWidgetOpacity(DEFAULT_WIDGET_OPACITY);
        setWidgetBorderWidth(DEFAULT_WIDGET_BORDER_WIDTH);
        setWidgetSizeMode(DEFAULT_WIDGET_SIZE_MODE);
        setDashboardBackgroundId(DEFAULT_DASHBOARD_BACKGROUND_ID);
        setCustomBackgroundUrl("");
        setCustomBackgroundType("image");
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
      const migratedWidgetLocks = migrateLegacyMap(normalizeWidgetLocks(data.widgetLocks));

      setActiveWidgets(migratedActiveWidgets);
      setCustomButtonConfigs(migratedCustomButtonConfigs);
      setLayouts(migratedLayouts);
      setWidgetLocks(migratedWidgetLocks);
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
      setWidgetTextColor(
        typeof data.widgetTextColor === "string" && data.widgetTextColor
          ? data.widgetTextColor
          : DEFAULT_WIDGET_TEXT_COLOR
      );
      setWidgetOpacity(
        typeof data.widgetOpacity === "number" && Number.isFinite(data.widgetOpacity)
          ? Math.min(1, Math.max(0.2, Number(data.widgetOpacity.toFixed(2))))
          : DEFAULT_WIDGET_OPACITY
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
        normalizeDashboardBackgroundId(data.dashboardBackgroundId)
      );
      const legacyVideoBackgroundUrl =
        typeof data.customVideoBackgroundUrl === "string"
          ? normalizeCustomBackgroundUrl(data.customVideoBackgroundUrl)
          : "";
      const nextCustomBackgroundUrl =
        typeof data.customBackgroundUrl === "string"
          ? normalizeCustomBackgroundUrl(data.customBackgroundUrl)
          : legacyVideoBackgroundUrl;
      setCustomBackgroundUrl(nextCustomBackgroundUrl);
      setCustomBackgroundType(
        normalizeCustomBackgroundType(
          data.customBackgroundType,
          legacyVideoBackgroundUrl ? "video" : "image"
        )
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
          widgetLocks,
          widgetSurfaceColor,
          widgetBorderColor,
          widgetTextColor,
          widgetOpacity,
          widgetBorderWidth,
          widgetSizeMode,
          dashboardBackgroundId,
          customBackgroundUrl: normalizeCustomBackgroundUrl(customBackgroundUrl),
          customBackgroundType,
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
    widgetLocks,
    widgetSurfaceColor,
    widgetBorderColor,
    widgetTextColor,
    widgetOpacity,
    widgetBorderWidth,
    widgetSizeMode,
    dashboardBackgroundId,
    customBackgroundUrl,
    customBackgroundType,
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
      widgetLocks: { ...widgetLocks },
      customButtonConfigs: { ...customButtonConfigs },
      widgetSurfaceColor,
      widgetBorderColor,
      widgetTextColor,
      widgetOpacity,
      widgetBorderWidth,
      widgetSizeMode,
      dashboardBackgroundId,
      customBackgroundUrl: normalizeCustomBackgroundUrl(customBackgroundUrl),
      customBackgroundType,
      createdAt: Date.now(),
    };

    const nextPresets = [newPreset, ...dashboardPresets].slice(0, 30);
    setDashboardPresets(nextPresets);
    void persistPresetsImmediately(nextPresets);

    return newPreset.id;
  }, [
    activeWidgets,
    customButtonConfigs,
    customBackgroundUrl,
    customBackgroundType,
    dashboardBackgroundId,
    dashboardPresets.length,
    dashboardPresets,
    layouts,
    widgetLocks,
    persistPresetsImmediately,
    widgetBorderColor,
    widgetTextColor,
    widgetOpacity,
    widgetBorderWidth,
    widgetSizeMode,
    widgetSurfaceColor,
  ]);

  const applyDashboardPreset = useCallback((presetId: string) => {
    const preset = dashboardPresets.find((item) => item.id === presetId);
    if (!preset) return false;

    setActiveWidgets([...preset.activeWidgets]);
    setLayouts({ ...preset.layouts });
    setWidgetLocks({ ...preset.widgetLocks });
    setCustomButtonConfigs({ ...preset.customButtonConfigs });
    setWidgetSurfaceColor(preset.widgetSurfaceColor);
    setWidgetBorderColor(preset.widgetBorderColor);
    setWidgetTextColor(preset.widgetTextColor);
    setWidgetOpacity(preset.widgetOpacity);
    setWidgetBorderWidth(preset.widgetBorderWidth);
    setWidgetSizeMode(preset.widgetSizeMode);
    setDashboardBackgroundId(preset.dashboardBackgroundId);
    setCustomBackgroundUrl(preset.customBackgroundUrl);
    setCustomBackgroundType(preset.customBackgroundType);

    return true;
  }, [dashboardPresets]);

  const deleteDashboardPreset = useCallback((presetId: string) => {
    const nextPresets = dashboardPresets.filter((preset) => preset.id !== presetId);
    setDashboardPresets(nextPresets);
    void persistPresetsImmediately(nextPresets);
  }, [dashboardPresets, persistPresetsImmediately]);

  // Toggle a widget on/off
  const toggleWidget = useCallback((id: string) => {
    if (id === "notes") {
      const noteId = createNotesWidgetId();

      setActiveWidgets((prev) => [...prev, noteId]);
      setLayouts((prev) => ({
        ...prev,
        [noteId]: createCenteredLayout("notes", prev),
      }));
      setWidgetLocks((prev) => ({ ...prev, [noteId]: false }));
      return;
    }

    setActiveWidgets((prev) => {
      const exists = prev.includes(id);

      setWidgetLocks((prevLocks) => {
        if (exists) {
          const next = { ...prevLocks };
          delete next[id];
          return next;
        }

        return { ...prevLocks, [id]: false };
      });

      return exists ? prev.filter((widgetId) => widgetId !== id) : [...prev, id];
    });

    setLayouts((prev) => {
      if (prev[id]) return prev;
      const defaultLayout = DEFAULT_LAYOUTS[id]
        ? createCenteredLayout(id, prev)
        : undefined;
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
    setLayouts((prev) => ({
      ...prev,
      [id]: createCenteredLayout("customButton", prev),
    }));
    setWidgetLocks((prev) => ({ ...prev, [id]: false }));

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
    setWidgetLocks((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const toggleWidgetLock = useCallback((widgetId: string) => {
    setWidgetLocks((prev) => ({
      ...prev,
      [widgetId]: !prev[widgetId],
    }));
  }, []);

  return {
    activeWidgets,
    customButtonConfigs,
    layouts,
    widgetLocks,
    widgetSurfaceColor,
    widgetBorderColor,
    widgetTextColor,
    widgetOpacity,
    widgetBorderWidth,
    widgetSizeMode,
    dashboardBackgroundId,
    customBackgroundUrl,
    customBackgroundType,
    dashboardPresets,
    isLoading,
    toggleWidget,
    updateLayout,
    addCustomButton,
    removeCustomButton,
    toggleWidgetLock,
    setWidgetSurfaceColor,
    setWidgetBorderColor,
    setWidgetTextColor,
    setWidgetOpacity,
    setWidgetBorderWidth,
    setWidgetSizeMode,
    setDashboardBackgroundId,
    setCustomBackgroundUrl,
    setCustomBackgroundType,
    saveCurrentAsPreset,
    applyDashboardPreset,
    deleteDashboardPreset,
  };
}
