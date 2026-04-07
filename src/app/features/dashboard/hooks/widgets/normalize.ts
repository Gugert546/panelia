
// Normalisering og sanitering av data fra Firestore og presets.

import {
  DEFAULT_DASHBOARD_BACKGROUND_ID,
  DEFAULT_WIDGET_BORDER_COLOR,
  DEFAULT_WIDGET_BORDER_WIDTH,
  DEFAULT_WIDGET_OPACITY,
  DEFAULT_WIDGET_SIZE_MODE,
  DEFAULT_WIDGET_SURFACE_COLOR,
  DEFAULT_WIDGET_TEXT_COLOR,
} from "./constants";
import { createDashboardPresetId, migrateLegacyCustomButtonId } from "./idUtils";
import type {
  CustomButtonConfig,
  DashboardBackgroundId,
  DashboardPreset,
  LayoutItem,
} from "./types";

// Type-guard for lovlige bakgrunnsverdier.

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

export function normalizeLayouts(value: unknown): Record<string, LayoutItem> {

  // Sikrer at kun gyldige numeriske layoutverdier lagres videre.

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

export function normalizeCustomButtonConfigs(value: unknown): Record<string, CustomButtonConfig> {

  // Filtrerer bort ugyldige custom button-objekter fra lagret data.

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

export function normalizeWidgetLocks(value: unknown): Record<string, boolean> {

  // Tvinger lock-verdier til eksplisitte booleans.

  if (!value || typeof value !== "object") return {};

  const entries = Object.entries(value as Record<string, unknown>);
  const next: Record<string, boolean> = {};

  for (const [id, rawValue] of entries) {
    next[migrateLegacyCustomButtonId(id)] = Boolean(rawValue);
  }

  return next;
}

export function normalizeDashboardPresets(value: unknown): DashboardPreset[] {

  // Gjør presets robuste mot manglende felt og eldre datamodeller.

  if (!Array.isArray(value)) return [];

  const presets: DashboardPreset[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const rawPreset = value[index];
    if (!rawPreset || typeof rawPreset !== "object") continue;

    const preset = rawPreset as Record<string, unknown>;
    const name =
      typeof preset.name === "string" && preset.name.trim()
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

export function normalizePersistedVideoUrl(url: string) {

  // Blob-URL-er er lokale og skal ikke persisteres mellom enheter.
  
  if (url.startsWith("blob:")) {
    return "";
  }

  return url;
}

export function sanitizePresetForPersistence(preset: DashboardPreset): DashboardPreset {

  // Rydder preset-data før lagring i Firestore.

  return {
    ...preset,
    customVideoBackgroundUrl: normalizePersistedVideoUrl(
      preset.customVideoBackgroundUrl
    ),
  };
}
