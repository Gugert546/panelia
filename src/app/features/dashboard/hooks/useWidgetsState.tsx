import { useState, useEffect, useCallback, useRef } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../lib/firebase/client";
import { useAuth } from "../../auth/useAuth";
import { useFontSize } from "../../../providers/themeProviders";

// Representer posisjonen og størrelsen på en widget i rutenett
type LayoutItem = {
  x: number;
  y: number;
  w: number;
  h: number;
};

// Rutenett-dimensjoner for dashboard-layoutet
const GRID_COLUMNS = 40; // Horisontale spalter for widget-plassering
const GRID_ROWS = 20; // Vertikale rader tilgjengelige i dashboard

// Konfigurasjonsalternativer for egendefinert knapp-widget
export type CustomButtonConfig = {
  label: string;
  url: string;
  favicon: string;
};

// Displaymodus for klokke-widget
export type ClockMode = "digital" | "analog";

// En instans av en widget med sitt unike ID, type og konfigurasjonsdata
export type WidgetInstance = {
  id: string; // Unikt ID (format: "type:uuid" eller bare "type")
  type: string; // Widget-type (f.eks. "notes", "calendar", "clock")
  config: Record<string, unknown>; // Widget-spesifikk konfigurasjonsdata
};

// Størrelse-preset for widgets (påvirker padding, tekststørrelse osv.)
export type WidgetSizeMode = "small" | "medium" | "large";
export type WidgetStyleOverrides = {
  widgetSurfaceColor?: string;
  widgetBorderColor?: string;
  widgetTextColor?: string;
  widgetOpacity?: number;
  widgetBorderWidth?: number;
  widgetFontSize?: number;
  lockSnapshot?: boolean;
};
export type CustomBackgroundMediaType = "image" | "video";

// Tilgjengelige forhåndsinnstillinger for dashboard-bakgrunn
// "sol1-3" = dagtidskonfigurasjoner, "natt1-3" = nattidskonfigurasjoner
export type DashboardBackgroundId =
  | "defaultbg" // Standard lysegrå bakgrunn
  | "sol1"
  | "sol2"
  | "sol3"
  | "natt1" // Første nattidsbakgrunn
  | "natt2" // Andre nattidsbakgrunn
  | "natt3" // Tredje nattidsbakgrunn
  | "customMedia";

export type DashboardPreset = {
  id: string;
  name: string;
  activeWidgets: string[];
  layouts: Record<string, LayoutItem>;
  widgetLocks: Record<string, boolean>;
  clockModes: Record<string, ClockMode>;
  customButtonConfigs: Record<string, CustomButtonConfig>;
  widgetStyles: Record<string, WidgetStyleOverrides>;
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

// Skjema for widget-layout-dokumentet fra Firestore
// Alle felter er valgfrie for fleksibilitet ved migrering av gamle data
type WidgetLayoutDocument = {
  activeWidgets?: string[];
  layouts?: Record<string, LayoutItem>;
  widgetLocks?: Record<string, boolean>;
  clockModes?: Record<string, ClockMode>;
  customButtonConfigs?: Record<string, CustomButtonConfig>;
  widgetStyles?: Record<string, WidgetStyleOverrides>;
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
  updatedAt?: unknown; // Firebase serverTimestamp
};

// Widgets som vises for ikke-autentiserte brukere (offentlig visning)
const PUBLIC_WIDGET_IDS = ["info", "google_search", "weather","clock"] as const;

// Standard layout for offentlige widgets (brukes når bruker ikke er logget inn)
const PUBLIC_LAYOUTS: Record<string, LayoutItem> = {
  info: { x: 1, y: 2, w: 12, h: 12 },
  google_search: { x: 13, y: 14, w: 14, h: 3 },
  weather: { x: 21, y: 6, w: 6, h: 7 },
  clock:{x:17,y:10,w:4,h:3}
};

// Liste over alle tilgjengelige widgets som kan legges til dashboardet
export const AVAILABLE_WIDGETS = [
  { id: "clock", label: "Klokke", icon: "schedule" },
  { id: "calendar", label: "Kalender", icon: "calendar_month" },
  { id: "google_search", label: "Søk", icon: "search" },
  { id: "news", label: "Nyheter", icon: "newsmode" },
  { id: "weather", label: "Vær", icon: "partly_cloudy_day" },
  { id: "bookmark", label: "Bokmerke", icon: "bookmark" },
  { id: "info", label: "Info", icon: "info" },
  { id: "ai_chat", label: "AI Chat", icon: "smart_toy" },
  { id: "email", label: "E-post", icon: "mail" },
  { id: "notes", label: "Notater", icon: "sticky_note_2" },
  { id: "spotify", label: "Spotify", icon: "music_note" },
  { id: "minesweeper", label: "Minesweeper", icon: "bomb" },
] as const;

// Debounce delay for saving to Firestore (5 seconds)
const SAVE_DEBOUNCE_MS = 5000;
const DEFAULT_WIDGET_SURFACE_COLOR = "rgba(255,255,255,0.15)";
const DEFAULT_WIDGET_BORDER_COLOR = "rgba(255,255,255,0.35)";
const DEFAULT_WIDGET_TEXT_COLOR = "#000000";
const DEFAULT_WIDGET_OPACITY = 1;
const DEFAULT_WIDGET_BORDER_WIDTH = 1;
const MIN_WIDGET_FONT_SIZE = 10;
const MAX_WIDGET_FONT_SIZE = 22;
const DEFAULT_WIDGET_SIZE_MODE: WidgetSizeMode = "medium";
const DEFAULT_DASHBOARD_BACKGROUND_ID: DashboardBackgroundId = "defaultbg";

// Validerer at en verdi er en gyldig bakgrunns-ID
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

// Normaliserer bakgrunns-ID fra Firestore (håndterer legacy verdier)
function normalizeDashboardBackgroundId(value: unknown): DashboardBackgroundId {
  if (value === "videoCustom") return "customMedia";
  return isDashboardBackgroundId(value) ? value : DEFAULT_DASHBOARD_BACKGROUND_ID;
}

// Genererer unikt preset-ID ved hjelp av crypto.randomUUID eller fallback
function createDashboardPresetId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `preset:${crypto.randomUUID()}`;
  }
  return `preset:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Genererer unikt ID for notater-widget (tillater flere notater-instanser)
function createNotesWidgetId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `notes:${crypto.randomUUID()}`;
  }

  return `notes:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Validerer og normaliserer layout-data fra Firestore
// Brukes ved innlasting for å sikre at alle layout-verdier er gyldige tall
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

    // Validerer at alle verdier er endelige tall før de inkluderes
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

function normalizeClockModes(value: unknown): Record<string, ClockMode> {
  if (!value || typeof value !== "object") return {};

  const entries = Object.entries(value as Record<string, unknown>);
  const next: Record<string, ClockMode> = {};

  for (const [id, rawValue] of entries) {
    if (rawValue === "analog" || rawValue === "digital") {
      next[migrateLegacyCustomButtonId(id)] = rawValue;
    }
  }

  return next;
}

function normalizeWidgetStyleOverride(value: unknown): WidgetStyleOverrides {
  if (!value || typeof value !== "object") return {};

  const rawStyle = value as Record<string, unknown>;
  const normalized: WidgetStyleOverrides = {};

  if (typeof rawStyle.widgetSurfaceColor === "string" && rawStyle.widgetSurfaceColor) {
    normalized.widgetSurfaceColor = rawStyle.widgetSurfaceColor;
  }

  if (typeof rawStyle.widgetBorderColor === "string" && rawStyle.widgetBorderColor) {
    normalized.widgetBorderColor = rawStyle.widgetBorderColor;
  }

  if (typeof rawStyle.widgetTextColor === "string" && rawStyle.widgetTextColor) {
    normalized.widgetTextColor = rawStyle.widgetTextColor;
  }

  if (typeof rawStyle.widgetOpacity === "number" && Number.isFinite(rawStyle.widgetOpacity)) {
    normalized.widgetOpacity = Math.min(1, Math.max(0.2, Number(rawStyle.widgetOpacity.toFixed(2))));
  }

  if (typeof rawStyle.widgetBorderWidth === "number" && Number.isFinite(rawStyle.widgetBorderWidth)) {
    normalized.widgetBorderWidth = Math.min(12, Math.max(0, Math.round(rawStyle.widgetBorderWidth)));
  }

  if (typeof rawStyle.widgetFontSize === "number" && Number.isFinite(rawStyle.widgetFontSize)) {
    normalized.widgetFontSize = Math.min(
      MAX_WIDGET_FONT_SIZE,
      Math.max(MIN_WIDGET_FONT_SIZE, Math.round(rawStyle.widgetFontSize))
    );
  }

  if (rawStyle.lockSnapshot === true) {
    normalized.lockSnapshot = true;
  }

  return normalized;
}

function normalizeWidgetStyles(value: unknown): Record<string, WidgetStyleOverrides> {
  if (!value || typeof value !== "object") return {};

  const entries = Object.entries(value as Record<string, unknown>);
  const next: Record<string, WidgetStyleOverrides> = {};

  for (const [id, rawStyle] of entries) {
    const normalized = normalizeWidgetStyleOverride(rawStyle);

    if (Object.keys(normalized).length > 0) {
      next[migrateLegacyCustomButtonId(id)] = normalized;
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
      clockModes: normalizeClockModes(preset.clockModes),
      customButtonConfigs: normalizeCustomButtonConfigs(preset.customButtonConfigs),
      widgetStyles: normalizeWidgetStyles(preset.widgetStyles),
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

// Standard layout-størrelser når nye widgets legges til dashboardet
// Justert i henhold til WidgetRegistry defaultGrid-størrelser
const DEFAULT_LAYOUTS: Record<string, LayoutItem> = {
  clock: { x: 0, y: 0, w: 5, h: 3 },
  notes: { x: 0, y: 0, w: 8, h: 8 },
  calendar: { x: 0, y: 0, w: 16, h: 12 },
  google_search: { x: 0, y: 0, w: 14, h: 3 },
  weather: { x: 0, y: 0, w: 5, h: 4 },
  news: { x: 0, y: 0, w: 10, h: 10 },
  spotify: { x: 0, y: 0, w: 4, h: 3 },
  minesweeper: { x: 0, y: 0, w: 6, h: 6 },
  bookmark: { x: 0, y: 0, w: 4, h: 4 },
  info: { x: 0, y: 0, w: 6, h: 6 },
  ai_chat: { x: 0, y: 0, w: 6, h: 8 },
  email: { x: 0, y: 0, w: 8, h: 8 },
  customButton: { x: 0, y: 0, w: 2, h: 2 },
};

// Sjekker om to rektangler overlapper hverandre
function rectsOverlap(a: LayoutItem, b: LayoutItem) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

// Plasserer en widget sentralt i dashboardet, og utenom overlappende widgets
// Hvis sentralt ikke funker, forsøk å stappe ned i små trinn
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

// Genererer unikt ID for egendefinert knapp-widget
function createCustomButtonId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `customButton:${crypto.randomUUID()}`;
  }
  return `customButton:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Migreringsfunksjoner for bakoverkompatibilitet med gamle ID-formater
// Gamle custom buttons brukte "customButton__uuid", nye bruker "customButton:uuid"
function migrateLegacyCustomButtonId(id: string) {
  if (!id.startsWith("customButton__")) return id;
  return `customButton:${id.slice("customButton__".length)}`;
}

function migrateLegacyMap<T>(input: Record<string, T>) {
  return Object.fromEntries(
    Object.entries(input).map(([id, value]) => [migrateLegacyCustomButtonId(id), value])
  );
}

// Returnerer standard dashboard-state for offentlige (ikke-autentiserte) brukere
function applyPublicDashboardDefaults() {
  return {
    activeWidgets: [...PUBLIC_WIDGET_IDS],
    customButtonConfigs: {},
    layouts: { ...PUBLIC_LAYOUTS },
    widgetLocks: {},
    clockModes: {},
    widgetStyles: {},
    widgetSurfaceColor: DEFAULT_WIDGET_SURFACE_COLOR,
    widgetBorderColor: DEFAULT_WIDGET_BORDER_COLOR,
    widgetTextColor: DEFAULT_WIDGET_TEXT_COLOR,
    widgetOpacity: DEFAULT_WIDGET_OPACITY,
    widgetBorderWidth: DEFAULT_WIDGET_BORDER_WIDTH,
    widgetSizeMode: DEFAULT_WIDGET_SIZE_MODE,
    dashboardBackgroundId: DEFAULT_DASHBOARD_BACKGROUND_ID,
    customBackgroundUrl: "",
    customBackgroundType: "image" as CustomBackgroundMediaType,
    dashboardPresets: [],
  };
}

export function useWidgetsState() {
  const { user, loading } = useAuth();
  const { fontSize } = useFontSize();

  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  const [customButtonConfigs, setCustomButtonConfigs] = useState<Record<string, CustomButtonConfig>>({});
  const [layouts, setLayouts] = useState<Record<string, LayoutItem>>({});
  const [widgetLocks, setWidgetLocks] = useState<Record<string, boolean>>({});
  const [clockModes, setClockModes] = useState<Record<string, ClockMode>>({});
  const [widgetStyles, setWidgetStyles] = useState<Record<string, WidgetStyleOverrides>>({});
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

  const createLockSnapshotStyle = useCallback((styles: Record<string, WidgetStyleOverrides>, widgetId: string) => {
    const existingStyle = styles[widgetId];

    return {
      widgetSurfaceColor: existingStyle?.widgetSurfaceColor ?? widgetSurfaceColor,
      widgetBorderColor: existingStyle?.widgetBorderColor ?? widgetBorderColor,
      widgetTextColor: existingStyle?.widgetTextColor ?? widgetTextColor,
      widgetOpacity: existingStyle?.widgetOpacity ?? widgetOpacity,
      widgetBorderWidth: existingStyle?.widgetBorderWidth ?? widgetBorderWidth,
      widgetFontSize: existingStyle?.widgetFontSize ?? fontSize,
      lockSnapshot: true,
    } satisfies WidgetStyleOverrides;
  }, [fontSize, widgetBorderColor, widgetBorderWidth, widgetOpacity, widgetSurfaceColor, widgetTextColor]);

  // Load widget layout from Firestore
  const loadLayout = useCallback(async () => {
    if (loading) return;

    if (!user) {
      const publicDefaults = applyPublicDashboardDefaults();

      setActiveWidgets(publicDefaults.activeWidgets);
      setCustomButtonConfigs(publicDefaults.customButtonConfigs);
      setLayouts(publicDefaults.layouts);
      setWidgetLocks(publicDefaults.widgetLocks);
      setClockModes(publicDefaults.clockModes);
      setWidgetStyles(publicDefaults.widgetStyles);
      setWidgetSurfaceColor(publicDefaults.widgetSurfaceColor);
      setWidgetBorderColor(publicDefaults.widgetBorderColor);
      setWidgetTextColor(publicDefaults.widgetTextColor);
      setWidgetOpacity(publicDefaults.widgetOpacity);
      setWidgetBorderWidth(publicDefaults.widgetBorderWidth);
      setWidgetSizeMode(publicDefaults.widgetSizeMode);
      setDashboardBackgroundId(publicDefaults.dashboardBackgroundId);
      setCustomBackgroundUrl(publicDefaults.customBackgroundUrl);
      setCustomBackgroundType(publicDefaults.customBackgroundType);
      setDashboardPresets(publicDefaults.dashboardPresets);
      setIsLoading(false);
      hasLoadedRef.current = false;
      return;
    }

    try {
      const docRef = doc(db, "users", user.uid, "widgetLayout", "current");
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        const publicDefaults = applyPublicDashboardDefaults();

        setActiveWidgets(publicDefaults.activeWidgets);
        setCustomButtonConfigs(publicDefaults.customButtonConfigs);
        setLayouts(publicDefaults.layouts);
        setWidgetLocks(publicDefaults.widgetLocks);
        setClockModes(publicDefaults.clockModes);
        setWidgetStyles(publicDefaults.widgetStyles);
        setWidgetSurfaceColor(publicDefaults.widgetSurfaceColor);
        setWidgetBorderColor(publicDefaults.widgetBorderColor);
        setWidgetTextColor(publicDefaults.widgetTextColor);
        setWidgetOpacity(publicDefaults.widgetOpacity);
        setWidgetBorderWidth(publicDefaults.widgetBorderWidth);
        setWidgetSizeMode(publicDefaults.widgetSizeMode);
        setDashboardBackgroundId(publicDefaults.dashboardBackgroundId);
        setCustomBackgroundUrl(publicDefaults.customBackgroundUrl);
        setCustomBackgroundType(publicDefaults.customBackgroundType);
        setDashboardPresets(publicDefaults.dashboardPresets);
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
      const migratedClockModes = migrateLegacyMap(normalizeClockModes(data.clockModes));
      const migratedWidgetStyles = migrateLegacyMap(normalizeWidgetStyles(data.widgetStyles));

      setActiveWidgets(migratedActiveWidgets);
      setCustomButtonConfigs(migratedCustomButtonConfigs);
      setLayouts(migratedLayouts);
      setWidgetLocks(migratedWidgetLocks);
      setClockModes(migratedClockModes);
      setWidgetStyles(migratedWidgetStyles);
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
  }, [loading, user]);

  useEffect(() => {
    void loadLayout();
  }, [loadLayout]);

  // Autosave-effekt: lagrer endringer til Firestore med debounce-forsinkelse
  // Dette minimerer antall Firestore-writes under rask oppfølging av endringer (f.eks. drag/resize)
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
          clockModes,
          widgetStyles,
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
    clockModes,
    widgetStyles,
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

  useEffect(() => {
    if (isLoading) return;

    setWidgetStyles((prevStyles) => {
      let hasChanges = false;
      const nextStyles = { ...prevStyles };

      for (const [widgetId, isLocked] of Object.entries(widgetLocks)) {
        if (!isLocked) continue;
        const existingStyle = nextStyles[widgetId];

        if (!existingStyle || !existingStyle.lockSnapshot) {
          nextStyles[widgetId] = createLockSnapshotStyle(nextStyles, widgetId);
          hasChanges = true;
          continue;
        }

        if (existingStyle.widgetFontSize === undefined) {
          nextStyles[widgetId] = createLockSnapshotStyle(nextStyles, widgetId);
          hasChanges = true;
        }
      }

      return hasChanges ? nextStyles : prevStyles;
    });
  }, [createLockSnapshotStyle, isLoading, widgetLocks]);

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
      clockModes: { ...clockModes },
      customButtonConfigs: { ...customButtonConfigs },
      widgetStyles: Object.fromEntries(
        Object.entries(widgetStyles).map(([widgetId, style]) => [widgetId, { ...style }])
      ),
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
    clockModes,
    widgetStyles,
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
    setClockModes({ ...preset.clockModes });
    setCustomButtonConfigs({ ...preset.customButtonConfigs });
    setWidgetStyles(
      Object.fromEntries(
        Object.entries(preset.widgetStyles).map(([widgetId, style]) => [widgetId, { ...style }])
      )
    );
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

  // Slår widget av/på, eller legger til ny notater-instans hvis det er notater
  // Notater er spesiell: hver gang man trykker på "legg til notater" får man ny instans
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

      setWidgetStyles((prevStyles) => {
        if (!exists) return prevStyles;

        const next = { ...prevStyles };
        delete next[id];
        return next;
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

  // Oppdaterer widget-layouter etter drag/resize-operasjoner i rutenett
  const updateLayout = useCallback((newLayouts: Record<string, LayoutItem>) => {
    setLayouts(newLayouts);
  }, []);

  // Legger til ny egendefinert knapp-widget med gitt konfigurasjon
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

  // Fjerner egendefinert knapp-widget og sletter dens layout, konfig og eventuelle låser
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
    setWidgetStyles((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const setWidgetStyle = useCallback((widgetId: string, patch: WidgetStyleOverrides) => {
    setWidgetStyles((prev) => {
      const previousStyle = prev[widgetId] ?? {};
      const mergedStyle = normalizeWidgetStyleOverride({
        ...previousStyle,
        ...patch,
        lockSnapshot: false,
      });

      if (Object.keys(mergedStyle).length === 0) {
        if (!prev[widgetId]) return prev;

        const next = { ...prev };
        delete next[widgetId];
        return next;
      }

      return {
        ...prev,
        [widgetId]: mergedStyle,
      };
    });
  }, []);

  const resetWidgetStyle = useCallback((widgetId: string) => {
    setWidgetStyles((prev) => {
      if (widgetLocks[widgetId]) {
        return {
          ...prev,
          [widgetId]: createLockSnapshotStyle(prev, widgetId),
        };
      }

      if (!prev[widgetId]) return prev;

      const next = { ...prev };
      delete next[widgetId];
      return next;
    });
  }, [createLockSnapshotStyle, widgetLocks]);

  const toggleWidgetLock = useCallback((widgetId: string) => {
    setWidgetLocks((prev) => {
      const isCurrentlyLocked = Boolean(prev[widgetId]);
      const willLock = !isCurrentlyLocked;

      setWidgetStyles((prevStyles) => {
        if (willLock) {
          return {
            ...prevStyles,
            [widgetId]: createLockSnapshotStyle(prevStyles, widgetId),
          };
        }

        // Keep the current local style on unlock. It will be cleared automatically
        // next time the global theme settings are changed.
        return prevStyles;
      });

      return {
        ...prev,
        [widgetId]: willLock,
      };
    });
  }, [createLockSnapshotStyle]);

  const toggleClockMode = useCallback((widgetId: string) => {
    setClockModes((prev) => ({
      ...prev,
      [widgetId]: prev[widgetId] === "analog" ? "digital" : "analog",
    }));
  }, []);

  const clearUnlockedWidgetStyles = useCallback(() => {
    setWidgetStyles((prevStyles) => {
      let hasChanges = false;
      const nextStyles: Record<string, WidgetStyleOverrides> = {};

      for (const [widgetId, style] of Object.entries(prevStyles)) {
        if (widgetLocks[widgetId]) {
          nextStyles[widgetId] = style;
          continue;
        }

        hasChanges = true;
      }

      return hasChanges ? nextStyles : prevStyles;
    });
  }, [widgetLocks]);

  const updateWidgetSurfaceColor = useCallback((value: string) => {
    setWidgetSurfaceColor(value);
    clearUnlockedWidgetStyles();
  }, [clearUnlockedWidgetStyles]);

  const updateWidgetBorderColor = useCallback((value: string) => {
    setWidgetBorderColor(value);
    clearUnlockedWidgetStyles();
  }, [clearUnlockedWidgetStyles]);

  const updateWidgetTextColor = useCallback((value: string) => {
    setWidgetTextColor(value);
    clearUnlockedWidgetStyles();
  }, [clearUnlockedWidgetStyles]);

  const updateWidgetOpacity = useCallback((value: number) => {
    setWidgetOpacity(value);
    clearUnlockedWidgetStyles();
  }, [clearUnlockedWidgetStyles]);

  const updateWidgetBorderWidth = useCallback((value: number) => {
    setWidgetBorderWidth(value);
    clearUnlockedWidgetStyles();
  }, [clearUnlockedWidgetStyles]);

  return {
    activeWidgets,
    customButtonConfigs,
    layouts,
    widgetLocks,
    clockModes,
    widgetStyles,
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
    reloadLayout: loadLayout,
    toggleWidget,
    updateLayout,
    addCustomButton,
    removeCustomButton,
    toggleWidgetLock,
    toggleClockMode,
    setWidgetStyle,
    resetWidgetStyle,
    setWidgetSurfaceColor: updateWidgetSurfaceColor,
    setWidgetBorderColor: updateWidgetBorderColor,
    setWidgetTextColor: updateWidgetTextColor,
    setWidgetOpacity: updateWidgetOpacity,
    setWidgetBorderWidth: updateWidgetBorderWidth,
    setWidgetSizeMode,
    setDashboardBackgroundId,
    setCustomBackgroundUrl,
    setCustomBackgroundType,
    saveCurrentAsPreset,
    applyDashboardPreset,
    deleteDashboardPreset,
  };
}
