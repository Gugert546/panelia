import { randomUUID } from "crypto";
import type { ToolDef } from "./types";
import { adminDb } from "../firebaseAdmin";
import {
  normalizeActiveWidgetsWithDefaults,
  normalizeBooleanMap,
  normalizeLayoutsWithDefaults,
  normalizeObjectMap,
  rectsOverlap,
} from "./layoutHelpers";

type LayoutItem = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type CustomButtonConfig = {
  label: string;
  url: string;
  favicon: string;
};

type WidgetLayoutDocument = {
  activeWidgets?: unknown;
  customButtonConfigs?: unknown;
  layouts?: unknown;
  widgetLocks?: unknown;
  widgetStyles?: unknown;
};

type AddCustomButtonArgs = {
  label: string;
  url: string;
  favicon?: string;
};

type RemoveCustomButtonArgs = {
  buttonId?: string;
  label?: string;
};

type ListCustomButtonsArgs = {
  limit?: number;
};

type CustomButtonSummary = {
  id: string;
  label: string;
  url: string;
};

const GRID_COLUMNS = 40;
const GRID_ROWS = 20;
const DEFAULT_CUSTOM_BUTTON_LAYOUT: LayoutItem = { x: 0, y: 0, w: 2, h: 2 };
const PUBLIC_WIDGET_IDS = ["info", "google_search", "weather", "clock"];
const CUSTOM_BUTTON_PREFIX = "customButton:";
const PUBLIC_LAYOUTS: Record<string, LayoutItem> = {
  info: { x: 1, y: 2, w: 12, h: 12 },
  google_search: { x: 13, y: 14, w: 14, h: 3 },
  weather: { x: 21, y: 6, w: 6, h: 7 },
  clock: { x: 17, y: 10, w: 4, h: 3 },
};

function dashboardLayoutRef(uid: string) {
  return adminDb.collection("users").doc(uid).collection("widgetLayout").doc("current");
}

function isCustomButtonId(id: string) {
  return id.startsWith(CUSTOM_BUTTON_PREFIX);
}

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("url is required");

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error("url must be a valid http(s) URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("url must start with http:// or https://");
  }

  return parsed.toString();
}

function getOriginFaviconUrl(pageUrl: string) {
  try {
    const { origin } = new URL(pageUrl);
    return `${origin}/favicon.ico`;
  } catch {
    return "";
  }
}

function normalizeLabel(input: string) {
  const label = input.trim().slice(0, 80);
  if (!label) throw new Error("label is required");
  return label;
}

function isCustomButtonConfig(value: unknown): value is CustomButtonConfig {
  if (!value || typeof value !== "object") return false;
  const config = value as Record<string, unknown>;
  return typeof config.label === "string" && typeof config.url === "string";
}

function normalizeCustomButtonConfigs(value: unknown) {
  const result: Record<string, CustomButtonConfig> = {};
  if (!value || typeof value !== "object") return result;

  for (const [id, config] of Object.entries(value as Record<string, unknown>)) {
    if (!isCustomButtonConfig(config)) continue;

    result[id] = {
      label: config.label.trim().slice(0, 80),
      url: config.url.trim(),
      favicon: typeof config.favicon === "string" ? config.favicon.trim() : "",
    };
  }

  return result;
}

function createCenteredCustomButtonLayout(existingLayouts: Record<string, LayoutItem>): LayoutItem {
  const centeredX = Math.max(0, Math.floor((GRID_COLUMNS - DEFAULT_CUSTOM_BUTTON_LAYOUT.w) / 2));
  const centeredY = Math.max(0, Math.floor((GRID_ROWS - DEFAULT_CUSTOM_BUTTON_LAYOUT.h) / 2));
  const candidate = {
    x: centeredX,
    y: centeredY,
    w: DEFAULT_CUSTOM_BUTTON_LAYOUT.w,
    h: DEFAULT_CUSTOM_BUTTON_LAYOUT.h,
  };
  const occupiedLayouts = Object.values(existingLayouts);

  if (!occupiedLayouts.some((layout) => rectsOverlap(candidate, layout))) {
    return candidate;
  }

  for (let offset = 1; offset < GRID_ROWS; offset += 1) {
    const staggeredCandidate = {
      ...candidate,
      y: Math.min(GRID_ROWS - DEFAULT_CUSTOM_BUTTON_LAYOUT.h, centeredY + offset),
    };

    if (!occupiedLayouts.some((layout) => rectsOverlap(staggeredCandidate, layout))) {
      return staggeredCandidate;
    }
  }

  return candidate;
}

function summarizeButtons(customButtonConfigs: Record<string, CustomButtonConfig>) {
  return Object.entries(customButtonConfigs)
    .sort(([, a], [, b]) => a.label.localeCompare(b.label, "nb"))
    .map(([id, config]) => ({
      id,
      label: config.label,
      url: config.url,
    }));
}

function getActiveCustomButtonConfigs(
  activeWidgets: string[],
  customButtonConfigs: Record<string, CustomButtonConfig>
) {
  const activeCustomButtonIds = new Set(activeWidgets.filter(isCustomButtonId));

  return Object.fromEntries(
    Object.entries(customButtonConfigs).filter(([id]) => activeCustomButtonIds.has(id))
  );
}

function findButtonId(args: RemoveCustomButtonArgs, customButtonConfigs: Record<string, CustomButtonConfig>) {
  const buttonId = args.buttonId?.trim();
  if (buttonId) {
    if (!customButtonConfigs[buttonId]) throw new Error(`Custom button not found: ${buttonId}`);
    return buttonId;
  }

  const label = args.label?.trim().toLocaleLowerCase("nb");
  if (!label) throw new Error("Provide buttonId or label");

  const matches = Object.entries(customButtonConfigs).filter(
    ([, config]) => config.label.trim().toLocaleLowerCase("nb") === label
  );

  if (matches.length === 0) throw new Error(`Custom button not found with label: ${args.label}`);
  if (matches.length > 1) {
    const choices = matches.map(([id, config]) => `${config.label} (${id})`).join(", ");
    throw new Error(`Multiple buttons match that label. Ask which one to remove: ${choices}`);
  }

  return matches[0][0];
}

export const addCustomButtonTool: ToolDef<
  AddCustomButtonArgs,
  { ok: true; buttonId: string; label: string; url: string; favicon: string }
> = {
  name: "addCustomButton",
  description: "Add a custom button widget to the current user's Panelia dashboard.",
  parameters: {
    type: "object",
    properties: {
      label: { type: "string", description: "Visible button label" },
      url: { type: "string", description: "Destination URL. http(s) preferred; https is added when omitted." },
      favicon: { type: "string", description: "Optional favicon URL" },
    },
    required: ["label", "url"],
    additionalProperties: false,
  },
  async handler(args, ctx) {
    const label = normalizeLabel(args.label);
    const url = normalizeUrl(args.url);
    const favicon = (args.favicon?.trim() || getOriginFaviconUrl(url)).slice(0, 300);
    const buttonId = `customButton:${randomUUID()}`;
    const ref = dashboardLayoutRef(ctx.uid);

    await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      const data = (snap.exists ? snap.data() : {}) as WidgetLayoutDocument;
      const activeWidgets = normalizeActiveWidgetsWithDefaults(data.activeWidgets, snap.exists, PUBLIC_WIDGET_IDS);
      const customButtonConfigs = normalizeCustomButtonConfigs(data.customButtonConfigs);
      const layouts = normalizeLayoutsWithDefaults(data.layouts, snap.exists, PUBLIC_LAYOUTS);
      const widgetLocks = normalizeBooleanMap(data.widgetLocks);

      customButtonConfigs[buttonId] = { label, url, favicon };
      layouts[buttonId] = createCenteredCustomButtonLayout(layouts);
      widgetLocks[buttonId] = false;

      transaction.set(
        ref,
        {
          activeWidgets: activeWidgets.includes(buttonId)
            ? activeWidgets
            : [...activeWidgets, buttonId],
          customButtonConfigs,
          layouts,
          widgetLocks,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    });

    return { ok: true, buttonId, label, url, favicon };
  },
};

export const removeCustomButtonTool: ToolDef<
  RemoveCustomButtonArgs,
  { ok: true; buttonId: string; label: string; url: string }
> = {
  name: "removeCustomButton",
  description:
    "Remove a custom button widget from the current user's Panelia dashboard. Use only after explicit confirmation.",
  parameters: {
    type: "object",
    properties: {
      buttonId: { type: "string", description: "Exact custom button widget ID from listCustomButtons" },
      label: { type: "string", description: "Exact visible label, only safe when it uniquely identifies one button" },
    },
    additionalProperties: false,
  },
  async handler(args, ctx) {
    const ref = dashboardLayoutRef(ctx.uid);

    const removed = await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists) throw new Error("Dashboard layout not found");

      const data = snap.data() as WidgetLayoutDocument;
      const activeWidgets = normalizeActiveWidgetsWithDefaults(data.activeWidgets, true, PUBLIC_WIDGET_IDS);
      const customButtonConfigs = normalizeCustomButtonConfigs(data.customButtonConfigs);
      const layouts = normalizeLayoutsWithDefaults(data.layouts, true, PUBLIC_LAYOUTS);
      const widgetLocks = normalizeBooleanMap(data.widgetLocks);
      const widgetStyles = normalizeObjectMap(data.widgetStyles);
      const buttonId = findButtonId(args, customButtonConfigs);
      const config = customButtonConfigs[buttonId];

      const removedButton = {
        id: buttonId,
        label: config.label,
        url: config.url,
      };

      delete customButtonConfigs[buttonId];
      delete layouts[buttonId];
      delete widgetLocks[buttonId];
      delete widgetStyles[buttonId];

      transaction.set(
        ref,
        {
          activeWidgets: activeWidgets.filter((id) => id !== buttonId),
          customButtonConfigs,
          layouts,
          widgetLocks,
          widgetStyles,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      return removedButton;
    });

    return {
      ok: true,
      buttonId: removed.id,
      label: removed.label,
      url: removed.url,
    };
  },
};

export const listCustomButtonsTool: ToolDef<
  ListCustomButtonsArgs,
  { ok: true; count: number; buttons: CustomButtonSummary[] }
> = {
  name: "listCustomButtons",
  description: "List the current user's custom button widgets with IDs, labels, and URLs.",
  parameters: {
    type: "object",
    properties: {
      limit: { type: "number", description: "Maximum number of buttons to return, 1-100", minimum: 1, maximum: 100 },
    },
    additionalProperties: false,
  },
  async handler(args, ctx) {
    const limit = Math.max(1, Math.min(100, Math.floor(args.limit ?? 50)));
    const snap = await dashboardLayoutRef(ctx.uid).get();
    const data = (snap.exists ? snap.data() : {}) as WidgetLayoutDocument;
    const activeWidgets = normalizeActiveWidgetsWithDefaults(data.activeWidgets, snap.exists, PUBLIC_WIDGET_IDS);
    const buttons = summarizeButtons(
      getActiveCustomButtonConfigs(
        activeWidgets,
        normalizeCustomButtonConfigs(data.customButtonConfigs)
      )
    ).slice(0, limit);

    return {
      ok: true,
      count: buttons.length,
      buttons,
    };
  },
};
