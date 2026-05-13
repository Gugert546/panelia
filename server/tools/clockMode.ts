import type { ToolDef } from "./types";
import { adminDb } from "../firebaseAdmin";
import {
  normalizeActiveWidgetsWithDefaults,
  normalizeBooleanMap,
  normalizeLayoutsWithDefaults,
  rectsOverlap,
} from "./layoutHelpers";

type ClockMode = "digital" | "analog";

type LayoutItem = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type WidgetLayoutDocument = {
  activeWidgets?: unknown;
  clockModes?: unknown;
  layouts?: unknown;
  widgetLocks?: unknown;
};

type SetClockModeArgs = {
  mode: ClockMode;
};

type ToggleClockModeArgs = Record<string, never>;

const CLOCK_WIDGET_ID = "clock";
const DEFAULT_CLOCK_LAYOUT: LayoutItem = { x: 0, y: 0, w: 5, h: 3 };
const GRID_COLUMNS = 40;
const GRID_ROWS = 20;
const PUBLIC_WIDGET_IDS = ["info", "google_search", "weather", "clock"];
const PUBLIC_LAYOUTS: Record<string, LayoutItem> = {
  info: { x: 1, y: 2, w: 12, h: 12 },
  google_search: { x: 13, y: 14, w: 14, h: 3 },
  weather: { x: 21, y: 6, h: 7, w: 6 },
  clock: { x: 17, y: 10, w: 4, h: 3 },
};

function dashboardLayoutRef(uid: string) {
  return adminDb.collection("users").doc(uid).collection("widgetLayout").doc("current");
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

function normalizeClockMode(value: string) {
  const mode = value.trim().toLocaleLowerCase("nb");
  if (mode === "digital" || mode === "analog") return mode;
  throw new Error("mode must be digital or analog");
}

function createCenteredClockLayout(existingLayouts: Record<string, LayoutItem>) {
  const centeredX = Math.max(0, Math.floor((GRID_COLUMNS - DEFAULT_CLOCK_LAYOUT.w) / 2));
  const centeredY = Math.max(0, Math.floor((GRID_ROWS - DEFAULT_CLOCK_LAYOUT.h) / 2));
  const candidate = {
    x: centeredX,
    y: centeredY,
    w: DEFAULT_CLOCK_LAYOUT.w,
    h: DEFAULT_CLOCK_LAYOUT.h,
  };
  const occupiedLayouts = Object.values(existingLayouts);

  if (!occupiedLayouts.some((layout) => rectsOverlap(candidate, layout))) {
    return candidate;
  }

  for (let offset = 1; offset < GRID_ROWS; offset += 1) {
    const staggeredCandidate = {
      ...candidate,
      y: Math.min(GRID_ROWS - DEFAULT_CLOCK_LAYOUT.h, centeredY + offset),
    };

    if (!occupiedLayouts.some((layout) => rectsOverlap(staggeredCandidate, layout))) {
      return staggeredCandidate;
    }
  }

  return candidate;
}

async function writeClockMode(uid: string, mode: ClockMode) {
  const ref = dashboardLayoutRef(uid);
  let wasActive = false;

  await adminDb.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const data = (snap.exists ? snap.data() : {}) as WidgetLayoutDocument;
    const activeWidgets = normalizeActiveWidgetsWithDefaults(data.activeWidgets, snap.exists, PUBLIC_WIDGET_IDS);
    const clockModes = normalizeClockModes(data.clockModes);
    const layouts = normalizeLayoutsWithDefaults(data.layouts, snap.exists, PUBLIC_LAYOUTS);
    const widgetLocks = normalizeBooleanMap(data.widgetLocks);

    wasActive = activeWidgets.includes(CLOCK_WIDGET_ID);
    clockModes[CLOCK_WIDGET_ID] = mode;

    if (!layouts[CLOCK_WIDGET_ID]) {
      layouts[CLOCK_WIDGET_ID] = createCenteredClockLayout(layouts);
    }

    if (typeof widgetLocks[CLOCK_WIDGET_ID] !== "boolean") {
      widgetLocks[CLOCK_WIDGET_ID] = false;
    }

    transaction.set(
      ref,
      {
        activeWidgets: wasActive ? activeWidgets : [...activeWidgets, CLOCK_WIDGET_ID],
        clockModes,
        layouts,
        widgetLocks,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  });

  return wasActive;
}

export const setClockModeTool: ToolDef<
  SetClockModeArgs,
  { ok: true; widgetId: "clock"; mode: ClockMode; activatedClock: boolean }
> = {
  name: "setClockMode",
  description:
    "Set the clock widget mode to digital or analog. If the clock widget is not on the dashboard, it will be added.",
  parameters: {
    type: "object",
    properties: {
      mode: {
        type: "string",
        enum: ["digital", "analog"],
        description: "Clock display mode",
      },
    },
    required: ["mode"],
    additionalProperties: false,
  },
  async handler(args, ctx) {
    const mode = normalizeClockMode(args.mode);
    const wasActive = await writeClockMode(ctx.uid, mode);

    return {
      ok: true,
      widgetId: CLOCK_WIDGET_ID,
      mode,
      activatedClock: !wasActive,
    };
  },
};

export const toggleClockModeTool: ToolDef<
  ToggleClockModeArgs,
  { ok: true; widgetId: "clock"; mode: ClockMode; activatedClock: boolean }
> = {
  name: "toggleClockMode",
  description:
    "Switch the clock widget between digital and analog mode. If the clock widget is not on the dashboard, it will be added.",
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  async handler(_args, ctx) {
    const snap = await dashboardLayoutRef(ctx.uid).get();
    const data = (snap.exists ? snap.data() : {}) as WidgetLayoutDocument;
    const currentMode = normalizeClockModes(data.clockModes)[CLOCK_WIDGET_ID] ?? "digital";
    const nextMode: ClockMode = currentMode === "analog" ? "digital" : "analog";
    const wasActive = await writeClockMode(ctx.uid, nextMode);

    return {
      ok: true,
      widgetId: CLOCK_WIDGET_ID,
      mode: nextMode,
      activatedClock: !wasActive,
    };
  },
};
