import { randomUUID } from "crypto";
import type { ToolDef } from "./types";
import { adminDb } from "../firebaseAdmin";
import { normalizeBooleanMap, normalizeLayouts } from "./layoutHelpers";

type LayoutItem = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type ClockMode = "digital" | "analog";
type CustomBackgroundMediaType = "image" | "video";
type DashboardBackgroundId =
  | "defaultbg"
  | "sol1"
  | "sol2"
  | "sol3"
  | "natt1"
  | "natt2"
  | "natt3"
  | "customMedia";

type CustomButtonConfig = {
  label: string;
  url: string;
  favicon: string;
};

type WidgetStyleOverrides = {
  widgetSurfaceColor?: string;
  widgetBorderColor?: string;
  widgetTextColor?: string;
  widgetOpacity?: number;
  widgetBorderWidth?: number;
  widgetFontSize?: number;
  lockSnapshot?: boolean;
};

type DashboardPreset = {
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
  widgetFontSize: number;
  dashboardBackgroundId: DashboardBackgroundId;
  customBackgroundUrl: string;
  customBackgroundType: CustomBackgroundMediaType;
  createdAt: number;
};

type WidgetLayoutDocument = {
  activeWidgets?: unknown;
  layouts?: unknown;
  widgetLocks?: unknown;
  clockModes?: unknown;
  customButtonConfigs?: unknown;
  widgetStyles?: unknown;
  widgetSurfaceColor?: unknown;
  widgetBorderColor?: unknown;
  widgetTextColor?: unknown;
  widgetOpacity?: unknown;
  widgetBorderWidth?: unknown;
  widgetFontSize?: unknown;
  dashboardBackgroundId?: unknown;
  customBackgroundUrl?: unknown;
  customBackgroundType?: unknown;
  dashboardPresets?: unknown;
};

type ApplyDashboardThemeArgs = {
  themeName: string;
};

type ListDashboardThemesArgs = {
  limit?: number;
};

type SaveDashboardThemeArgs = {
  name?: string;
};

type DeleteDashboardThemeArgs = {
  themeName: string;
};

type ThemeSummary = {
  id: string;
  name: string;
};

type ApplyDashboardThemeResult =
  | {
      ok: true;
      themeId: string;
      themeName: string;
      matchedBy: "id" | "exact" | "partial" | "tokens";
    }
  | {
      ok: false;
      reason: "not_found" | "ambiguous";
      query: string;
      candidates: ThemeSummary[];
    };

type DeleteDashboardThemeResult =
  | {
      ok: true;
      themeId: string;
      themeName: string;
      themeCount: number;
      matchedBy: "id" | "exact" | "partial" | "tokens";
    }
  | {
      ok: false;
      reason: "not_found" | "ambiguous";
      query: string;
      candidates: ThemeSummary[];
    };

const MATCH_STOP_WORDS = new Set([
  "theme",
  "themes",
  "preset",
  "presets",
  "dashboard",
  "switch",
  "change",
  "set",
  "to",
  "the",
  "tema",
  "presetet",
  "bytt",
  "endre",
  "sett",
  "til",
]);

function dashboardLayoutRef(uid: string) {
  return adminDb.collection("users").doc(uid).collection("widgetLayout").doc("current");
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("nb")
    .replace(/[^a-z0-9æøå]+/gi, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeSearchText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token && !MATCH_STOP_WORDS.has(token));
}

function normalizeThemeQuery(value: string) {
  return tokenize(value).join(" ");
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeClockModes(value: unknown) {
  const result: Record<string, ClockMode> = {};
  if (!value || typeof value !== "object") return result;

  for (const [id, mode] of Object.entries(value as Record<string, unknown>)) {
    if (mode === "digital" || mode === "analog") {
      result[id] = mode;
    }
  }

  return result;
}

function normalizeCustomButtonConfigs(value: unknown) {
  const result: Record<string, CustomButtonConfig> = {};
  if (!value || typeof value !== "object") return result;

  for (const [id, config] of Object.entries(value as Record<string, unknown>)) {
    if (!config || typeof config !== "object") continue;
    const item = config as Record<string, unknown>;
    if (typeof item.label !== "string" || typeof item.url !== "string") continue;

    result[id] = {
      label: item.label,
      url: item.url,
      favicon: typeof item.favicon === "string" ? item.favicon : "",
    };
  }

  return result;
}

function normalizeWidgetStyles(value: unknown) {
  const result: Record<string, WidgetStyleOverrides> = {};
  if (!value || typeof value !== "object") return result;

  for (const [id, rawStyle] of Object.entries(value as Record<string, unknown>)) {
    if (!rawStyle || typeof rawStyle !== "object" || Array.isArray(rawStyle)) continue;
    const style = rawStyle as Record<string, unknown>;
    const nextStyle: WidgetStyleOverrides = {};

    if (typeof style.widgetSurfaceColor === "string") nextStyle.widgetSurfaceColor = style.widgetSurfaceColor;
    if (typeof style.widgetBorderColor === "string") nextStyle.widgetBorderColor = style.widgetBorderColor;
    if (typeof style.widgetTextColor === "string") nextStyle.widgetTextColor = style.widgetTextColor;
    if (typeof style.widgetOpacity === "number") nextStyle.widgetOpacity = style.widgetOpacity;
    if (typeof style.widgetBorderWidth === "number") nextStyle.widgetBorderWidth = style.widgetBorderWidth;
    if (typeof style.widgetFontSize === "number") nextStyle.widgetFontSize = style.widgetFontSize;
    if (typeof style.lockSnapshot === "boolean") nextStyle.lockSnapshot = style.lockSnapshot;

    result[id] = nextStyle;
  }

  return result;
}


function normalizeDashboardBackgroundId(value: unknown): DashboardBackgroundId {
  if (
    value === "defaultbg" ||
    value === "sol1" ||
    value === "sol2" ||
    value === "sol3" ||
    value === "natt1" ||
    value === "natt2" ||
    value === "natt3" ||
    value === "customMedia"
  ) {
    return value;
  }

  return "defaultbg";
}

function normalizeCustomBackgroundType(value: unknown): CustomBackgroundMediaType {
  return value === "video" ? "video" : "image";
}

function normalizeDashboardPresets(value: unknown): DashboardPreset[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((rawPreset, index): DashboardPreset[] => {
    if (!rawPreset || typeof rawPreset !== "object") return [];
    const preset = rawPreset as Record<string, unknown>;
    const id =
      typeof preset.id === "string" && preset.id.trim()
        ? preset.id.trim()
        : `preset:${index + 1}`;
    const name =
      typeof preset.name === "string" && preset.name.trim()
        ? preset.name.trim()
        : `Preset ${index + 1}`;

    return [
      {
        id,
        name,
        activeWidgets: normalizeStringArray(preset.activeWidgets),
        layouts: normalizeLayouts(preset.layouts),
        widgetLocks: normalizeBooleanMap(preset.widgetLocks),
        clockModes: normalizeClockModes(preset.clockModes),
        customButtonConfigs: normalizeCustomButtonConfigs(preset.customButtonConfigs),
        widgetStyles: normalizeWidgetStyles(preset.widgetStyles),
        widgetSurfaceColor:
          typeof preset.widgetSurfaceColor === "string" ? preset.widgetSurfaceColor : "rgba(255,255,255,0.15)",
        widgetBorderColor:
          typeof preset.widgetBorderColor === "string" ? preset.widgetBorderColor : "rgba(255,255,255,0.35)",
        widgetTextColor: typeof preset.widgetTextColor === "string" ? preset.widgetTextColor : "#000000",
        widgetOpacity: typeof preset.widgetOpacity === "number" ? preset.widgetOpacity : 1,
        widgetBorderWidth: typeof preset.widgetBorderWidth === "number" ? preset.widgetBorderWidth : 1,
        widgetFontSize:
          typeof preset.widgetFontSize === "number" && Number.isFinite(preset.widgetFontSize)
            ? Math.min(22, Math.max(10, Math.round(preset.widgetFontSize)))
            : 14,
        dashboardBackgroundId: normalizeDashboardBackgroundId(preset.dashboardBackgroundId),
        customBackgroundUrl:
          typeof preset.customBackgroundUrl === "string" ? preset.customBackgroundUrl : "",
        customBackgroundType: normalizeCustomBackgroundType(preset.customBackgroundType),
        createdAt: typeof preset.createdAt === "number" ? preset.createdAt : Date.now(),
      },
    ];
  });
}

function summarizeThemes(presets: DashboardPreset[]): ThemeSummary[] {
  return presets.map((preset) => ({
    id: preset.id,
    name: preset.name,
  }));
}

function createDashboardPresetId() {
  return `preset:${randomUUID()}`;
}

function createDashboardPresetFromCurrentLayout(
  data: WidgetLayoutDocument,
  name: string,
  existingPresetCount: number
): DashboardPreset {
  const trimmedName = name.trim();

  return {
    id: createDashboardPresetId(),
    name: trimmedName || `Preset ${existingPresetCount + 1}`,
    activeWidgets: normalizeStringArray(data.activeWidgets),
    layouts: normalizeLayouts(data.layouts),
    widgetLocks: normalizeBooleanMap(data.widgetLocks),
    clockModes: normalizeClockModes(data.clockModes),
    customButtonConfigs: normalizeCustomButtonConfigs(data.customButtonConfigs),
    widgetStyles: normalizeWidgetStyles(data.widgetStyles),
    widgetSurfaceColor:
      typeof data.widgetSurfaceColor === "string" ? data.widgetSurfaceColor : "rgba(255,255,255,0.15)",
    widgetBorderColor:
      typeof data.widgetBorderColor === "string" ? data.widgetBorderColor : "rgba(255,255,255,0.35)",
    widgetTextColor: typeof data.widgetTextColor === "string" ? data.widgetTextColor : "#000000",
    widgetOpacity: typeof data.widgetOpacity === "number" ? data.widgetOpacity : 1,
    widgetBorderWidth: typeof data.widgetBorderWidth === "number" ? data.widgetBorderWidth : 1,
    widgetFontSize:
      typeof data.widgetFontSize === "number" && Number.isFinite(data.widgetFontSize)
        ? Math.min(22, Math.max(10, Math.round(data.widgetFontSize)))
        : 14,
    dashboardBackgroundId: normalizeDashboardBackgroundId(data.dashboardBackgroundId),
    customBackgroundUrl: typeof data.customBackgroundUrl === "string" ? data.customBackgroundUrl : "",
    customBackgroundType: normalizeCustomBackgroundType(data.customBackgroundType),
    createdAt: Date.now(),
  };
}

function findThemeMatch(query: string, presets: DashboardPreset[]): ApplyDashboardThemeResult {
  const trimmedQuery = query.trim();
  const normalizedQuery = normalizeThemeQuery(trimmedQuery);
  const queryTokens = tokenize(trimmedQuery);

  if (!trimmedQuery || !normalizedQuery) {
    return {
      ok: false,
      reason: "not_found",
      query,
      candidates: summarizeThemes(presets).slice(0, 8),
    };
  }

  const idMatch = presets.find((preset) => preset.id === trimmedQuery);
  if (idMatch) {
    return { ok: true, themeId: idMatch.id, themeName: idMatch.name, matchedBy: "id" };
  }

  const scored = presets
    .map((preset) => {
      const normalizedName = normalizeSearchText(preset.name);
      const nameTokens = tokenize(preset.name);
      let score = 0;
      let matchedBy: ApplyDashboardThemeResult extends infer Result
        ? Result extends { ok: true; matchedBy: infer M }
          ? M
          : never
        : never = "partial";

      if (normalizedName === normalizedQuery) {
        score = 100;
        matchedBy = "exact";
      } else if (normalizedName.includes(normalizedQuery)) {
        score = 80 + Math.min(10, normalizedQuery.length);
        matchedBy = "partial";
      } else if (queryTokens.length && queryTokens.every((token) => nameTokens.includes(token))) {
        score = 70 + queryTokens.length;
        matchedBy = "tokens";
      } else if (queryTokens.length === 1 && nameTokens.some((token) => token.includes(queryTokens[0]))) {
        score = 55;
        matchedBy = "partial";
      }

      return { preset, score, matchedBy };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.preset.name.localeCompare(b.preset.name, "nb"));

  if (!scored.length) {
    return {
      ok: false,
      reason: "not_found",
      query,
      candidates: summarizeThemes(presets).slice(0, 8),
    };
  }

  const bestScore = scored[0].score;
  const bestMatches = scored.filter((item) => item.score === bestScore);

  if (bestMatches.length > 1) {
    return {
      ok: false,
      reason: "ambiguous",
      query,
      candidates: bestMatches.map((item) => ({
        id: item.preset.id,
        name: item.preset.name,
      })),
    };
  }

  return {
    ok: true,
    themeId: scored[0].preset.id,
    themeName: scored[0].preset.name,
    matchedBy: scored[0].matchedBy,
  };
}

function createPresetPatch(preset: DashboardPreset) {
  return {
    activeWidgets: [...preset.activeWidgets],
    layouts: { ...preset.layouts },
    widgetLocks: { ...preset.widgetLocks },
    clockModes: { ...preset.clockModes },
    customButtonConfigs: { ...preset.customButtonConfigs },
    widgetStyles: { ...preset.widgetStyles },
    widgetSurfaceColor: preset.widgetSurfaceColor,
    widgetBorderColor: preset.widgetBorderColor,
    widgetTextColor: preset.widgetTextColor,
    widgetOpacity: preset.widgetOpacity,
    widgetBorderWidth: preset.widgetBorderWidth,
    widgetFontSize: preset.widgetFontSize,
    dashboardBackgroundId: preset.dashboardBackgroundId,
    customBackgroundUrl: preset.customBackgroundUrl,
    customBackgroundType: preset.customBackgroundType,
    updatedAt: new Date(),
  };
}

export const applyDashboardThemeTool: ToolDef<ApplyDashboardThemeArgs, ApplyDashboardThemeResult> = {
  name: "applyDashboardTheme",
  description:
    "Apply a saved dashboard theme/preset by forgiving name match. Partial names like 'cat' can match a preset named 'floating cat' when unambiguous.",
  parameters: {
    type: "object",
    properties: {
      themeName: {
        type: "string",
        description: "Theme or preset name, ID, or a partial name such as 'cat' for 'floating cat'.",
      },
    },
    required: ["themeName"],
    additionalProperties: false,
  },
  async handler(args, ctx) {
    const ref = dashboardLayoutRef(ctx.uid);

    return adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      const data = (snap.exists ? snap.data() : {}) as WidgetLayoutDocument;
      const presets = normalizeDashboardPresets(data.dashboardPresets);
      const match = findThemeMatch(args.themeName, presets);

      if (!match.ok) return match;

      const preset = presets.find((item) => item.id === match.themeId);
      if (!preset) {
        return {
          ok: false,
          reason: "not_found",
          query: args.themeName,
          candidates: summarizeThemes(presets).slice(0, 8),
        };
      }

      transaction.set(ref, createPresetPatch(preset), { merge: true });

      return match;
    });
  },
};

export const saveDashboardThemeTool: ToolDef<
  SaveDashboardThemeArgs,
  { ok: true; themeId: string; themeName: string; themeCount: number }
> = {
  name: "saveDashboardTheme",
  description:
    "Save the user's current dashboard layout and styling as a reusable dashboard theme/preset. Name is optional.",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Optional name for the new theme/preset. Defaults to 'Preset N'.",
      },
    },
    additionalProperties: false,
  },
  async handler(args, ctx) {
    const ref = dashboardLayoutRef(ctx.uid);

    return adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      const data = (snap.exists ? snap.data() : {}) as WidgetLayoutDocument;
      const existingPresets = normalizeDashboardPresets(data.dashboardPresets);
      const preset = createDashboardPresetFromCurrentLayout(
        data,
        args.name ?? "",
        existingPresets.length
      );
      const nextPresets = [preset, ...existingPresets].slice(0, 30);

      transaction.set(
        ref,
        {
          dashboardPresets: nextPresets,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      return {
        ok: true,
        themeId: preset.id,
        themeName: preset.name,
        themeCount: nextPresets.length,
      };
    });
  },
};

export const deleteDashboardThemeTool: ToolDef<DeleteDashboardThemeArgs, DeleteDashboardThemeResult> = {
  name: "deleteDashboardTheme",
  description:
    "Delete a saved dashboard theme/preset by forgiving name match. Use only after explicit user confirmation. This deletes the saved preset, not the active dashboard.",
  parameters: {
    type: "object",
    properties: {
      themeName: {
        type: "string",
        description: "Theme or preset name, ID, or partial name to delete.",
      },
    },
    required: ["themeName"],
    additionalProperties: false,
  },
  async handler(args, ctx) {
    const ref = dashboardLayoutRef(ctx.uid);

    return adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      const data = (snap.exists ? snap.data() : {}) as WidgetLayoutDocument;
      const presets = normalizeDashboardPresets(data.dashboardPresets);
      const match = findThemeMatch(args.themeName, presets);

      if (!match.ok) return match;

      const nextPresets = presets.filter((preset) => preset.id !== match.themeId);

      transaction.set(
        ref,
        {
          dashboardPresets: nextPresets,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      return {
        ok: true,
        themeId: match.themeId,
        themeName: match.themeName,
        themeCount: nextPresets.length,
        matchedBy: match.matchedBy,
      };
    });
  },
};

export const listDashboardThemesTool: ToolDef<
  ListDashboardThemesArgs,
  { ok: true; count: number; themes: ThemeSummary[] }
> = {
  name: "listDashboardThemes",
  description: "List the user's saved dashboard themes/presets.",
  parameters: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description: "Maximum themes to return, 1-30. Defaults to 30.",
        minimum: 1,
        maximum: 30,
      },
    },
    additionalProperties: false,
  },
  async handler(args, ctx) {
    const limit = Math.max(1, Math.min(30, Math.floor(args.limit ?? 30)));
    const snap = await dashboardLayoutRef(ctx.uid).get();
    const data = (snap.exists ? snap.data() : {}) as WidgetLayoutDocument;
    const themes = summarizeThemes(normalizeDashboardPresets(data.dashboardPresets)).slice(0, limit);

    return {
      ok: true,
      count: themes.length,
      themes,
    };
  },
};
