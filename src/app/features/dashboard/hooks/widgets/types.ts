
// Felles typer for widget-state, presets og lagring i dashboardet.

export type LayoutItem = {
  x: number;
  y: number;
  w: number;
  h: number;
};

// Konfigurasjon for brukerlagde snarveisknapper.

export type CustomButtonConfig = {
  label: string;
  url: string;
  favicon: string;
};

// Mulig type for fremtidig widget-instansmodell.

export type WidgetInstance = {
  id: string;
  type: string;
  config: Record<string, unknown>;
};

export type WidgetSizeMode = "small" | "medium" | "large";

// Tillatte bakgrunns-ID-er som lagres i state/presets.

export type DashboardBackgroundId =
  | "sol1"
  | "sol2"
  | "sol3"
  | "natt1"
  | "natt2"
  | "natt3"
  | "videoCustom";

// Komplett snapshot av dashboard-oppsettet.

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
  customVideoBackgroundUrl: string;
  createdAt: number;
};

// Dokumentformen i Firestore (flere felt kan mangle i eldre data).

export type WidgetLayoutDocument = {
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
  dashboardBackgroundId?: DashboardBackgroundId;
  customVideoBackgroundUrl?: string;
  dashboardPresets?: DashboardPreset[];
  updatedAt?: unknown;
};
