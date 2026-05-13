import type { ToolDef } from "./types";
import { adminDb } from "../firebaseAdmin";
import { normalizeBooleanMap, normalizeObjectMap } from "./layoutHelpers";

type WidgetLayoutDocument = {
  activeWidgets?: unknown;
  widgetLocks?: unknown;
  widgetStyles?: unknown;
  widgetSurfaceColor?: unknown;
  widgetBorderColor?: unknown;
  widgetTextColor?: unknown;
  widgetOpacity?: unknown;
  widgetBorderWidth?: unknown;
  widgetFontSize?: unknown;
};

type UpdateDashboardStyleArgs = {
  textSize?: number;
  widgetColor?: string;
  widgetOpacity?: number;
  borderThickness?: number;
  borderColor?: string;
  textColor?: string;
};

type UpdateDashboardWidgetStyleArgs = {
  widgetId: string;
  textSize?: number;
  widgetColor?: string;
  widgetOpacity?: number;
  borderThickness?: number;
  borderColor?: string;
  textColor?: string;
};

type UpdateDashboardStyleResult = {
  ok: true;
  changed: Array<
    | "widgetFontSize"
    | "widgetSurfaceColor"
    | "widgetOpacity"
    | "widgetBorderWidth"
    | "widgetBorderColor"
    | "widgetTextColor"
  >;
  style: {
    widgetFontSize: number;
    widgetSurfaceColor: string;
    widgetOpacity: number;
    widgetBorderWidth: number;
    widgetBorderColor: string;
    widgetTextColor: string;
  };
  preservedLockedWidgets: string[];
};

type WidgetStylePatch = {
  widgetSurfaceColor?: string;
  widgetBorderColor?: string;
  widgetTextColor?: string;
  widgetOpacity?: number;
  widgetBorderWidth?: number;
  widgetFontSize?: number;
  lockSnapshot?: boolean;
};

type UpdateDashboardWidgetStyleResult =
  | {
      ok: true;
      widgetId: string;
      matchedBy: "id" | "exact" | "base_type";
      changed: Array<
        | "widgetFontSize"
        | "widgetSurfaceColor"
        | "widgetOpacity"
        | "widgetBorderWidth"
        | "widgetBorderColor"
        | "widgetTextColor"
      >;
      style: {
        widgetFontSize?: number;
        widgetSurfaceColor?: string;
        widgetOpacity?: number;
        widgetBorderWidth?: number;
        widgetBorderColor?: string;
        widgetTextColor?: string;
      };
    }
  | {
      ok: false;
      reason: "not_found" | "ambiguous" | "locked";
      query: string;
      candidates?: string[];
      widgetId?: string;
    };

const DEFAULT_WIDGET_SURFACE_COLOR = "rgba(255,255,255,0.15)";
const DEFAULT_WIDGET_BORDER_COLOR = "rgba(255,255,255,0.35)";
const DEFAULT_WIDGET_TEXT_COLOR = "#000000";
const DEFAULT_WIDGET_OPACITY = 1;
const DEFAULT_WIDGET_BORDER_WIDTH = 1;
const DEFAULT_WIDGET_FONT_SIZE = 14;
const MIN_WIDGET_FONT_SIZE = 10;
const MAX_WIDGET_FONT_SIZE = 22;
const WIDGET_ALIASES: Record<string, string[]> = {
  clock: ["clock", "klokke"],
  calendar: ["calendar", "kalender"],
  google_search: ["google search", "search", "sok", "søk", "google_search"],
  weather: ["weather", "vær", "ver"],
  news: ["news", "nyheter", "verdensnyheter"],
  spotify: ["spotify"],
  minesweeper: ["minesweeper"],
  bookmark: ["bookmark", "bookmarks", "bokmerke", "bokmerker"],
  info: ["info"],
  ai_chat: ["ai chat", "ai-chat", "chat", "ai_chat"],
  email: ["email", "e-post", "epost", "mail"],
  notes: ["notes", "note", "notater", "notat"],
  customButton: ["custom button", "custom buttons", "button", "buttons", "knapp", "knapper"],
};

function dashboardLayoutRef(uid: string) {
  return adminDb.collection("users").doc(uid).collection("widgetLayout").doc("current");
}

function normalizeTextSize(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_WIDGET_FONT_SIZE;
  }

  return Math.min(MAX_WIDGET_FONT_SIZE, Math.max(MIN_WIDGET_FONT_SIZE, Math.round(value)));
}

function normalizeOpacity(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_WIDGET_OPACITY;
  }

  return Math.min(1, Math.max(0.2, Number(value.toFixed(2))));
}

function normalizeBorderWidth(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_WIDGET_BORDER_WIDTH;
  }

  return Math.min(12, Math.max(0, Math.round(value)));
}

function normalizeColor(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function withAlpha(color: string, alpha: number) {
  const trimmed = color.trim();
  const rgbaMatch = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i
  );

  if (rgbaMatch) {
    const [, red, green, blue] = rgbaMatch;
    return `rgba(${red},${green},${blue},${alpha})`;
  }

  const hexMatch = trimmed.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (hexMatch) {
    const hex = hexMatch[1].length === 3
      ? hexMatch[1].split("").map((char) => char + char).join("")
      : hexMatch[1];

    const red = Number.parseInt(hex.slice(0, 2), 16);
    const green = Number.parseInt(hex.slice(2, 4), 16);
    const blue = Number.parseInt(hex.slice(4, 6), 16);

    return `rgba(${red},${green},${blue},${alpha})`;
  }

  return color;
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeWidgetStyleMap(value: unknown) {
  const map = normalizeObjectMap(value);
  const next: Record<string, WidgetStylePatch> = {};

  for (const [widgetId, style] of Object.entries(map)) {
    const rawStyle = style as Record<string, unknown>;
    const normalized: WidgetStylePatch = {};

    if (typeof rawStyle.widgetSurfaceColor === "string" && rawStyle.widgetSurfaceColor.trim()) {
      normalized.widgetSurfaceColor = rawStyle.widgetSurfaceColor.trim();
    }
    if (typeof rawStyle.widgetBorderColor === "string" && rawStyle.widgetBorderColor.trim()) {
      normalized.widgetBorderColor = rawStyle.widgetBorderColor.trim();
    }
    if (typeof rawStyle.widgetTextColor === "string" && rawStyle.widgetTextColor.trim()) {
      normalized.widgetTextColor = rawStyle.widgetTextColor.trim();
    }
    if (typeof rawStyle.widgetOpacity === "number" && Number.isFinite(rawStyle.widgetOpacity)) {
      normalized.widgetOpacity = normalizeOpacity(rawStyle.widgetOpacity);
    }
    if (typeof rawStyle.widgetBorderWidth === "number" && Number.isFinite(rawStyle.widgetBorderWidth)) {
      normalized.widgetBorderWidth = normalizeBorderWidth(rawStyle.widgetBorderWidth);
    }
    if (typeof rawStyle.widgetFontSize === "number" && Number.isFinite(rawStyle.widgetFontSize)) {
      normalized.widgetFontSize = normalizeTextSize(rawStyle.widgetFontSize);
    }
    if (rawStyle.lockSnapshot === true) {
      normalized.lockSnapshot = true;
    }

    next[widgetId] = normalized;
  }

  return next;
}

function normalizeWidgetQuery(value: string) {
  return value.trim().toLocaleLowerCase("nb").replace(/[_-]+/g, " ");
}

function getWidgetBaseType(widgetId: string) {
  const separatorIndex = widgetId.indexOf(":");
  return separatorIndex === -1 ? widgetId : widgetId.slice(0, separatorIndex);
}

function resolveDashboardWidgetId(query: string, activeWidgets: string[]) {
  const trimmedQuery = query.trim();
  const normalizedQuery = normalizeWidgetQuery(query);

  if (!trimmedQuery) {
    return { ok: false as const, reason: "not_found" as const, query };
  }

  const exactIdMatch = activeWidgets.find((widgetId) => widgetId === trimmedQuery);
  if (exactIdMatch) {
    return { ok: true as const, widgetId: exactIdMatch, matchedBy: "id" as const };
  }

  const normalizedIdMatch = activeWidgets.find(
    (widgetId) => normalizeWidgetQuery(widgetId) === normalizedQuery
  );
  if (normalizedIdMatch) {
    return { ok: true as const, widgetId: normalizedIdMatch, matchedBy: "exact" as const };
  }

  const aliasMatches = activeWidgets.filter((widgetId) => {
    const baseType = getWidgetBaseType(widgetId);
    const aliases = WIDGET_ALIASES[baseType] ?? [baseType];
    return aliases.includes(normalizedQuery);
  });

  if (aliasMatches.length === 1) {
    return { ok: true as const, widgetId: aliasMatches[0], matchedBy: "base_type" as const };
  }

  if (aliasMatches.length > 1) {
    return { ok: false as const, reason: "ambiguous" as const, query, candidates: aliasMatches };
  }

  return {
    ok: false as const,
    reason: "not_found" as const,
    query,
    candidates: activeWidgets.slice(0, 12),
  };
}

export const updateDashboardStyleTool: ToolDef<
  UpdateDashboardStyleArgs,
  UpdateDashboardStyleResult
> = {
  name: "updateDashboardStyle",
  description:
    "Update the current dashboard styling. Supports global text size, widget color, widget background opacity, border thickness, border color, and text color.",
  parameters: {
    type: "object",
    properties: {
      textSize: {
        type: "number",
        description: "Global widget text size in px. Valid range is 10-22.",
        minimum: MIN_WIDGET_FONT_SIZE,
        maximum: MAX_WIDGET_FONT_SIZE,
      },
      widgetColor: {
        type: "string",
        description: "Widget background color, for example '#ffffff' or 'rgba(255,255,255,0.15)'.",
      },
      widgetOpacity: {
        type: "number",
        description: "Widget background opacity from 0.2 to 1.",
        minimum: 0.2,
        maximum: 1,
      },
      borderThickness: {
        type: "number",
        description: "Widget border thickness in px. Valid range is 0-12.",
        minimum: 0,
        maximum: 12,
      },
      borderColor: {
        type: "string",
        description: "Widget border color.",
      },
      textColor: {
        type: "string",
        description: "Widget text color.",
      },
    },
    additionalProperties: false,
  },
  async handler(args, ctx) {
    const ref = dashboardLayoutRef(ctx.uid);
    const changed: UpdateDashboardStyleResult["changed"] = [];
    const patch: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    const snap = await ref.get();
    const data = (snap.exists ? snap.data() : {}) as WidgetLayoutDocument;
    const widgetLocks = normalizeBooleanMap(data.widgetLocks);
    const widgetStyles = normalizeObjectMap(data.widgetStyles);
    const preservedLockedWidgets = Object.entries(widgetLocks)
      .filter(([, isLocked]) => isLocked)
      .map(([widgetId]) => widgetId);

    const nextStyle = {
      widgetFontSize: normalizeTextSize(data.widgetFontSize),
      widgetSurfaceColor: normalizeColor(data.widgetSurfaceColor, DEFAULT_WIDGET_SURFACE_COLOR),
      widgetOpacity: normalizeOpacity(data.widgetOpacity),
      widgetBorderWidth: normalizeBorderWidth(data.widgetBorderWidth),
      widgetBorderColor: normalizeColor(data.widgetBorderColor, DEFAULT_WIDGET_BORDER_COLOR),
      widgetTextColor: normalizeColor(data.widgetTextColor, DEFAULT_WIDGET_TEXT_COLOR),
    };

    if (args.textSize !== undefined) {
      nextStyle.widgetFontSize = normalizeTextSize(args.textSize);
      patch.widgetFontSize = nextStyle.widgetFontSize;
      changed.push("widgetFontSize");
    }

    if (args.widgetColor !== undefined) {
      nextStyle.widgetSurfaceColor = normalizeColor(args.widgetColor, DEFAULT_WIDGET_SURFACE_COLOR);
      patch.widgetSurfaceColor = nextStyle.widgetSurfaceColor;
      changed.push("widgetSurfaceColor");
    }

    if (args.widgetOpacity !== undefined) {
      nextStyle.widgetOpacity = normalizeOpacity(args.widgetOpacity);
      nextStyle.widgetSurfaceColor = withAlpha(nextStyle.widgetSurfaceColor, nextStyle.widgetOpacity);
      patch.widgetOpacity = DEFAULT_WIDGET_OPACITY;
      patch.widgetSurfaceColor = nextStyle.widgetSurfaceColor;
      changed.push("widgetOpacity");
    }

    if (args.borderThickness !== undefined) {
      nextStyle.widgetBorderWidth = normalizeBorderWidth(args.borderThickness);
      patch.widgetBorderWidth = nextStyle.widgetBorderWidth;
      changed.push("widgetBorderWidth");
    }

    if (args.borderColor !== undefined) {
      nextStyle.widgetBorderColor = normalizeColor(args.borderColor, DEFAULT_WIDGET_BORDER_COLOR);
      patch.widgetBorderColor = nextStyle.widgetBorderColor;
      changed.push("widgetBorderColor");
    }

    if (args.textColor !== undefined) {
      nextStyle.widgetTextColor = normalizeColor(args.textColor, DEFAULT_WIDGET_TEXT_COLOR);
      patch.widgetTextColor = nextStyle.widgetTextColor;
      changed.push("widgetTextColor");
    }

    // Match the edit panel behavior: when global widget styling changes,
    // unlocked widgets should fall back to the new shared style.
    patch.widgetStyles = Object.fromEntries(
      Object.entries(widgetStyles).filter(([widgetId]) => widgetLocks[widgetId])
    );

    await ref.set(patch, { merge: true });

    return {
      ok: true,
      changed,
      style: nextStyle,
      preservedLockedWidgets,
    };
  },
};

export const updateDashboardWidgetStyleTool: ToolDef<
  UpdateDashboardWidgetStyleArgs,
  UpdateDashboardWidgetStyleResult
> = {
  name: "updateDashboardWidgetStyle",
  description:
    "Update styling for one specific dashboard widget. Supports widget text size, widget color, widget background opacity, border thickness, border color, and text color. Use the widget's visible name or exact widget ID.",
  parameters: {
    type: "object",
    properties: {
      widgetId: {
        type: "string",
        description:
          "The target widget. Can be a visible widget name like 'weather', 'bookmarks', 'notes', or an exact widget id such as 'notes:123'.",
      },
      textSize: {
        type: "number",
        description: "Widget text size in px. Valid range is 10-22.",
        minimum: MIN_WIDGET_FONT_SIZE,
        maximum: MAX_WIDGET_FONT_SIZE,
      },
      widgetColor: {
        type: "string",
        description: "Widget background color, for example '#ffffff' or 'rgba(255,255,255,0.15)'.",
      },
      widgetOpacity: {
        type: "number",
        description: "Widget background opacity from 0.2 to 1.",
        minimum: 0.2,
        maximum: 1,
      },
      borderThickness: {
        type: "number",
        description: "Widget border thickness in px. Valid range is 0-12.",
        minimum: 0,
        maximum: 12,
      },
      borderColor: {
        type: "string",
        description: "Widget border color.",
      },
      textColor: {
        type: "string",
        description: "Widget text color.",
      },
    },
    required: ["widgetId"],
    additionalProperties: false,
  },
  async handler(args, ctx) {
    const ref = dashboardLayoutRef(ctx.uid);
    const snap = await ref.get();
    const data = (snap.exists ? snap.data() : {}) as WidgetLayoutDocument;
    const activeWidgets = normalizeStringArray(data.activeWidgets);
    const widgetLocks = normalizeBooleanMap(data.widgetLocks);
    const widgetStyles = normalizeWidgetStyleMap(data.widgetStyles);
    const match = resolveDashboardWidgetId(args.widgetId, activeWidgets);

    if (!match.ok) {
      return match;
    }

    if (widgetLocks[match.widgetId]) {
      return {
        ok: false,
        reason: "locked",
        query: args.widgetId,
        widgetId: match.widgetId,
      };
    }

    const previousStyle = widgetStyles[match.widgetId] ?? {};
    const nextStyle: WidgetStylePatch = {
      ...previousStyle,
      lockSnapshot: false,
    };
    const changed: UpdateDashboardWidgetStyleResult extends infer Result
      ? Result extends { ok: true; changed: infer C }
        ? C
        : never
      : never = [];

    if (args.textSize !== undefined) {
      nextStyle.widgetFontSize = normalizeTextSize(args.textSize);
      changed.push("widgetFontSize");
    }
    if (args.widgetColor !== undefined) {
      nextStyle.widgetSurfaceColor = normalizeColor(args.widgetColor, DEFAULT_WIDGET_SURFACE_COLOR);
      changed.push("widgetSurfaceColor");
    }
    if (args.widgetOpacity !== undefined) {
      nextStyle.widgetOpacity = normalizeOpacity(args.widgetOpacity);
      nextStyle.widgetSurfaceColor = withAlpha(
        nextStyle.widgetSurfaceColor ?? DEFAULT_WIDGET_SURFACE_COLOR,
        nextStyle.widgetOpacity
      );
      changed.push("widgetOpacity");
    }
    if (args.borderThickness !== undefined) {
      nextStyle.widgetBorderWidth = normalizeBorderWidth(args.borderThickness);
      changed.push("widgetBorderWidth");
    }
    if (args.borderColor !== undefined) {
      nextStyle.widgetBorderColor = normalizeColor(args.borderColor, DEFAULT_WIDGET_BORDER_COLOR);
      changed.push("widgetBorderColor");
    }
    if (args.textColor !== undefined) {
      nextStyle.widgetTextColor = normalizeColor(args.textColor, DEFAULT_WIDGET_TEXT_COLOR);
      changed.push("widgetTextColor");
    }

    widgetStyles[match.widgetId] = nextStyle;

    await ref.set(
      {
        widgetStyles,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return {
      ok: true,
      widgetId: match.widgetId,
      matchedBy: match.matchedBy,
      changed,
      style: {
        widgetFontSize: nextStyle.widgetFontSize,
        widgetSurfaceColor: nextStyle.widgetSurfaceColor,
        widgetOpacity: nextStyle.widgetOpacity,
        widgetBorderWidth: nextStyle.widgetBorderWidth,
        widgetBorderColor: nextStyle.widgetBorderColor,
        widgetTextColor: nextStyle.widgetTextColor,
      },
    };
  },
};
