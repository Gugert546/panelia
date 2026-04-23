import type { ToolDef } from "./types";
import { adminDb } from "../firebaseAdmin";

type LayoutItem = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type DashboardWidgetId =
  | "clock"
  | "calendar"
  | "google_search"
  | "weather"
  | "news"
  | "spotify"
  | "minesweeper"
  | "bookmark"
  | "info"
  | "ai_chat"
  | "email";

type WidgetLayoutDocument = {
  activeWidgets?: unknown;
  layouts?: unknown;
  widgetLocks?: unknown;
  widgetStyles?: unknown;
};

type WidgetToolArgs = {
  widgetId: string;
};

type ListDashboardWidgetsArgs = {
  includeInactive?: boolean;
};

type DashboardWidgetSummary = {
  id: DashboardWidgetId;
  label: string;
  active: boolean;
};

const GRID_COLUMNS = 40;
const GRID_ROWS = 20;

const DASHBOARD_WIDGETS: Record<DashboardWidgetId, { label: string; aliases: string[] }> = {
  clock: { label: "Clock", aliases: ["clock", "klokke"] },
  calendar: { label: "Calendar", aliases: ["calendar", "kalender"] },
  google_search: {
    label: "Google search",
    aliases: ["google search", "search", "søk", "sok", "google_search"],
  },
  weather: { label: "Weather", aliases: ["weather", "vær", "ver"] },
  news: { label: "News", aliases: ["news", "nyheter", "verdensnyheter"] },
  spotify: { label: "Spotify", aliases: ["spotify"] },
  minesweeper: { label: "Minesweeper", aliases: ["minesweeper"] },
  bookmark: { label: "Bookmarks", aliases: ["bookmark", "bookmarks", "bokmerke", "bokmerker"] },
  info: { label: "Info", aliases: ["info"] },
  ai_chat: { label: "AI chat", aliases: ["ai chat", "ai-chat", "chat", "ai_chat"] },
  email: { label: "Email", aliases: ["email", "e-post", "epost", "mail"] },
};

const WIDGET_IDS = Object.keys(DASHBOARD_WIDGETS) as DashboardWidgetId[];

const DEFAULT_LAYOUTS: Record<DashboardWidgetId, LayoutItem> = {
  clock: { x: 0, y: 0, w: 5, h: 3 },
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
};

const PUBLIC_WIDGET_IDS = ["info", "google_search", "weather", "clock"];
const PUBLIC_LAYOUTS: Record<string, LayoutItem> = {
  info: { x: 1, y: 2, w: 12, h: 12 },
  google_search: { x: 13, y: 14, w: 14, h: 3 },
  weather: { x: 21, y: 6, w: 6, h: 7 },
  clock: { x: 17, y: 10, w: 4, h: 3 },
};

function dashboardLayoutRef(uid: string) {
  return adminDb.collection("users").doc(uid).collection("widgetLayout").doc("current");
}

function isDashboardWidgetId(value: string): value is DashboardWidgetId {
  return WIDGET_IDS.includes(value as DashboardWidgetId);
}

function normalizeWidgetId(input: string): DashboardWidgetId {
  const normalized = input.trim().toLocaleLowerCase("nb").replace(/[_-]+/g, " ");

  if (isDashboardWidgetId(input.trim())) {
    return input.trim() as DashboardWidgetId;
  }

  for (const [id, widget] of Object.entries(DASHBOARD_WIDGETS) as Array<
    [DashboardWidgetId, (typeof DASHBOARD_WIDGETS)[DashboardWidgetId]]
  >) {
    if (widget.aliases.includes(normalized)) {
      return id;
    }
  }

  throw new Error(
    `Unsupported widget: ${input}. Supported widgets are ${WIDGET_IDS.join(", ")}. Notes and custom buttons are not supported by this tool.`
  );
}

function normalizeActiveWidgets(value: unknown, docExists: boolean) {
  if (!Array.isArray(value)) return docExists ? [] : [...PUBLIC_WIDGET_IDS];
  return value.filter((item): item is string => typeof item === "string");
}

function isLayoutItem(value: unknown): value is LayoutItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return ["x", "y", "w", "h"].every(
    (key) => typeof item[key] === "number" && Number.isFinite(item[key])
  );
}

function normalizeLayouts(value: unknown, docExists: boolean) {
  const base: Record<string, LayoutItem> = docExists ? {} : { ...PUBLIC_LAYOUTS };
  if (!value || typeof value !== "object") return base;

  for (const [id, layout] of Object.entries(value as Record<string, unknown>)) {
    if (isLayoutItem(layout)) {
      base[id] = {
        x: layout.x,
        y: layout.y,
        w: layout.w,
        h: layout.h,
      };
    }
  }

  return base;
}

function normalizeBooleanMap(value: unknown) {
  if (!value || typeof value !== "object") return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, boolean] => typeof entry[1] === "boolean"
    )
  );
}

function normalizeObjectMap(value: unknown) {
  if (!value || typeof value !== "object") return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, Record<string, unknown>] =>
        Boolean(entry[1]) && typeof entry[1] === "object" && !Array.isArray(entry[1])
    )
  );
}

function rectsOverlap(a: LayoutItem, b: LayoutItem) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function createCenteredLayout(widgetId: DashboardWidgetId, existingLayouts: Record<string, LayoutItem>) {
  const baseLayout = DEFAULT_LAYOUTS[widgetId];
  const centeredX = Math.max(0, Math.floor((GRID_COLUMNS - baseLayout.w) / 2));
  const centeredY = Math.max(0, Math.floor((GRID_ROWS - baseLayout.h) / 2));
  const candidate = {
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
    const staggeredCandidate = {
      ...candidate,
      y: Math.min(GRID_ROWS - baseLayout.h, centeredY + offset),
    };

    if (!occupiedLayouts.some((layout) => rectsOverlap(staggeredCandidate, layout))) {
      return staggeredCandidate;
    }
  }

  return candidate;
}

function summarizeWidgets(activeWidgets: string[], includeInactive = true): DashboardWidgetSummary[] {
  return WIDGET_IDS.map((id) => ({
    id,
    label: DASHBOARD_WIDGETS[id].label,
    active: activeWidgets.includes(id),
  })).filter((widget) => includeInactive || widget.active);
}

export const addDashboardWidgetTool: ToolDef<
  WidgetToolArgs,
  { ok: true; widgetId: DashboardWidgetId; label: string; active: true; alreadyActive: boolean }
> = {
  name: "addDashboardWidget",
  description:
    "Turn on a built-in dashboard widget for the current user. Supports clock, calendar, google_search, weather, news, spotify, minesweeper, bookmark, info, ai_chat, and email. Does not support notes or custom buttons.",
  parameters: {
    type: "object",
    properties: {
      widgetId: {
        type: "string",
        enum: WIDGET_IDS,
        description: "Built-in widget ID to add. Notes and custom buttons are not supported.",
      },
    },
    required: ["widgetId"],
    additionalProperties: false,
  },
  async handler(args, ctx) {
    const widgetId = normalizeWidgetId(args.widgetId);
    const ref = dashboardLayoutRef(ctx.uid);
    let alreadyActive = false;

    await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      const data = (snap.exists ? snap.data() : {}) as WidgetLayoutDocument;
      const activeWidgets = normalizeActiveWidgets(data.activeWidgets, snap.exists);
      const layouts = normalizeLayouts(data.layouts, snap.exists);
      const widgetLocks = normalizeBooleanMap(data.widgetLocks);

      alreadyActive = activeWidgets.includes(widgetId);

      if (!layouts[widgetId]) {
        layouts[widgetId] = createCenteredLayout(widgetId, layouts);
      }

      if (typeof widgetLocks[widgetId] !== "boolean") {
        widgetLocks[widgetId] = false;
      }

      transaction.set(
        ref,
        {
          activeWidgets: alreadyActive ? activeWidgets : [...activeWidgets, widgetId],
          layouts,
          widgetLocks,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    });

    return {
      ok: true,
      widgetId,
      label: DASHBOARD_WIDGETS[widgetId].label,
      active: true,
      alreadyActive,
    };
  },
};

export const removeDashboardWidgetTool: ToolDef<
  WidgetToolArgs,
  { ok: true; widgetId: DashboardWidgetId; label: string; active: false; wasActive: boolean }
> = {
  name: "removeDashboardWidget",
  description:
    "Turn off a built-in dashboard widget for the current user. Supports clock, calendar, google_search, weather, news, spotify, minesweeper, bookmark, info, ai_chat, and email. Does not support notes or custom buttons.",
  parameters: {
    type: "object",
    properties: {
      widgetId: {
        type: "string",
        enum: WIDGET_IDS,
        description: "Built-in widget ID to remove. Notes and custom buttons are not supported.",
      },
    },
    required: ["widgetId"],
    additionalProperties: false,
  },
  async handler(args, ctx) {
    const widgetId = normalizeWidgetId(args.widgetId);
    const ref = dashboardLayoutRef(ctx.uid);
    let wasActive = false;

    await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      const data = (snap.exists ? snap.data() : {}) as WidgetLayoutDocument;
      const activeWidgets = normalizeActiveWidgets(data.activeWidgets, snap.exists);
      const layouts = normalizeLayouts(data.layouts, snap.exists);
      const widgetLocks = normalizeBooleanMap(data.widgetLocks);
      const widgetStyles = normalizeObjectMap(data.widgetStyles);

      wasActive = activeWidgets.includes(widgetId);
      delete layouts[widgetId];
      delete widgetLocks[widgetId];
      delete widgetStyles[widgetId];

      transaction.set(
        ref,
        {
          activeWidgets: activeWidgets.filter((id) => id !== widgetId),
          layouts,
          widgetLocks,
          widgetStyles,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    });

    return {
      ok: true,
      widgetId,
      label: DASHBOARD_WIDGETS[widgetId].label,
      active: false,
      wasActive,
    };
  },
};

export const listDashboardWidgetsTool: ToolDef<
  ListDashboardWidgetsArgs,
  { ok: true; widgets: DashboardWidgetSummary[] }
> = {
  name: "listDashboardWidgets",
  description:
    "List built-in dashboard widgets and whether each is currently active. Notes and custom buttons are not included.",
  parameters: {
    type: "object",
    properties: {
      includeInactive: {
        type: "boolean",
        description: "Include inactive widgets. Defaults to true.",
      },
    },
    additionalProperties: false,
  },
  async handler(args, ctx) {
    const snap = await dashboardLayoutRef(ctx.uid).get();
    const data = (snap.exists ? snap.data() : {}) as WidgetLayoutDocument;
    const activeWidgets = normalizeActiveWidgets(data.activeWidgets, snap.exists);

    return {
      ok: true,
      widgets: summarizeWidgets(activeWidgets, args.includeInactive ?? true),
    };
  },
};
