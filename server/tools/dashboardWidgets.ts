import { FieldValue } from "@google-cloud/firestore";
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

type ArrangeDashboardWidgetsArgs = {
  widgetIds?: string[];
  mode?: "pack" | "nudge" | "place";
  targetArea?: "left" | "right" | "top" | "bottom" | "center";
  spacing?: "none" | "small" | "normal";
  direction?: "vertical" | "horizontal";
  deltaX?: number;
  deltaY?: number;
  relativeToWidgetId?: string;
  placement?: "left_of" | "right_of" | "above" | "below" | "beside";
  align?: "start" | "center" | "end";
  gap?: number;
  includeLocked?: boolean;
};

type ArrangedWidgetSummary = {
  id: string;
  label: string;
  layout: LayoutItem;
};

type PackedWidget = {
  id: string;
  layout: LayoutItem;
  originalIndex: number;
};

const GRID_COLUMNS = 40;
const GRID_ROWS = 20;
const MAX_GRID_ROWS = 40;

const DASHBOARD_WIDGETS: Record<DashboardWidgetId, { label: string; aliases: string[] }> = {
  clock: { label: "Clock", aliases: ["clock", "klokke"] },
  calendar: { label: "Calendar", aliases: ["calendar", "kalender"] },
  google_search: {
    label: "Google search",
    aliases: ["google search", "search", "søk", "sok", "google_search"],
  },
  weather: { label: "Weather", aliases: ["weather", "vær", "ver"] },
  news: { label: "News", aliases: ["news", "nyheter", "nyhetswidget", "nyhets widget", "verdensnyheter"] },
  spotify: { label: "Spotify", aliases: ["spotify"] },
  minesweeper: { label: "Minesweeper", aliases: ["minesweeper"] },
  bookmark: { label: "Bookmarks", aliases: ["bookmark", "bookmarks", "bokmerke", "bokmerker"] },
  info: { label: "Info", aliases: ["info"] },
  ai_chat: { label: "AI chat", aliases: ["ai", "ai chat", "ai-chat", "chat", "ai_chat"] },
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

const EXTRA_DEFAULT_LAYOUTS: Record<string, LayoutItem> = {
  notes: { x: 0, y: 0, w: 4, h: 4 },
  customButton: { x: 0, y: 0, w: 2, h: 2 },
};

const EXTRA_WIDGET_ALIASES: Record<string, { label: string; aliases: string[] }> = {
  notes: { label: "Notes", aliases: ["notes", "note", "notater", "notat"] },
  customButton: {
    label: "Custom button",
    aliases: ["custom button", "custombutton", "button", "knapp", "egendefinert knapp", "snarvei"],
  },
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

function getWidgetBaseType(widgetId: string) {
  const separatorIndex = widgetId.indexOf(":");
  return separatorIndex === -1 ? widgetId : widgetId.slice(0, separatorIndex);
}

function getWidgetLabel(widgetId: string) {
  const baseType = getWidgetBaseType(widgetId);

  if (isDashboardWidgetId(baseType)) {
    return DASHBOARD_WIDGETS[baseType].label;
  }

  if (EXTRA_WIDGET_ALIASES[baseType]) {
    return EXTRA_WIDGET_ALIASES[baseType].label;
  }

  return widgetId;
}

function normalizeWidgetQuery(input: string) {
  return input.trim().toLocaleLowerCase("nb").replace(/[_-]+/g, " ");
}

function resolveActiveWidgetTargets(requestedWidgetIds: string[], activeWidgets: string[]) {
  const resolved = new Set<string>();
  const missing: string[] = [];

  for (const rawQuery of requestedWidgetIds) {
    const query = rawQuery.trim();
    const normalizedQuery = normalizeWidgetQuery(query);

    if (!query) continue;

    const exactMatch = activeWidgets.find((widgetId) => widgetId === query);
    if (exactMatch) {
      resolved.add(exactMatch);
      continue;
    }

    const normalizedIdMatch = activeWidgets.find(
      (widgetId) => normalizeWidgetQuery(widgetId) === normalizedQuery
    );
    if (normalizedIdMatch) {
      resolved.add(normalizedIdMatch);
      continue;
    }

    const aliasMatches = activeWidgets.filter((widgetId) => {
      const baseType = getWidgetBaseType(widgetId);
      if (isDashboardWidgetId(baseType)) {
        return DASHBOARD_WIDGETS[baseType].aliases.includes(normalizedQuery);
      }

      return EXTRA_WIDGET_ALIASES[baseType]?.aliases.includes(normalizedQuery) ?? false;
    });

    if (aliasMatches.length === 1) {
      resolved.add(aliasMatches[0]);
      continue;
    }

    if (aliasMatches.length > 1) {
      throw new Error(
        `Widget target "${rawQuery}" matches multiple active widgets: ${aliasMatches.join(", ")}. Use exact widget IDs.`
      );
    }

    missing.push(rawQuery);
  }

  if (missing.length) {
    throw new Error(`Active widget not found: ${missing.join(", ")}.`);
  }

  return activeWidgets.filter((widgetId) => resolved.has(widgetId));
}

function resolveSingleActiveWidgetTarget(widgetId: string, activeWidgets: string[]) {
  const matches = resolveActiveWidgetTargets([widgetId], activeWidgets);

  if (matches.length !== 1) {
    throw new Error(`Expected exactly one active widget match for "${widgetId}", found ${matches.length}.`);
  }

  return matches[0];
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

function clampLayout(layout: LayoutItem) {
  const w = Math.min(GRID_COLUMNS, Math.max(1, Math.round(layout.w)));
  const h = Math.min(MAX_GRID_ROWS, Math.max(1, Math.round(layout.h)));

  return {
    x: Math.min(Math.max(0, Math.round(layout.x)), GRID_COLUMNS - w),
    y: Math.min(Math.max(0, Math.round(layout.y)), MAX_GRID_ROWS - h),
    w,
    h,
  };
}

function overlapsAny(layout: LayoutItem, occupiedLayouts: LayoutItem[]) {
  return occupiedLayouts.some((occupiedLayout) => rectsOverlap(layout, occupiedLayout));
}

function getFineSpacing(args: ArrangeDashboardWidgetsArgs) {
  if (typeof args.gap === "number" && Number.isFinite(args.gap)) {
    return Math.min(12, Math.max(0, Math.round(args.gap)));
  }

  return getSpacingValue(args.spacing);
}

function getNudgeAmount(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(GRID_COLUMNS, Math.max(-GRID_COLUMNS, Math.round(value)));
}

function getDefaultLayoutForWidget(widgetId: string) {
  const baseType = getWidgetBaseType(widgetId);

  if (isDashboardWidgetId(baseType)) {
    return DEFAULT_LAYOUTS[baseType];
  }

  return EXTRA_DEFAULT_LAYOUTS[baseType] ?? { x: 0, y: 0, w: 4, h: 4 };
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

function getSpacingValue(spacing: ArrangeDashboardWidgetsArgs["spacing"]) {
  if (spacing === "small") return 1;
  if (spacing === "normal") return 2;
  return 0;
}

function getPrimaryDirection(args: ArrangeDashboardWidgetsArgs) {
  if (args.direction) return args.direction;
  return args.targetArea === "top" || args.targetArea === "bottom" ? "horizontal" : "vertical";
}

function sortWidgetsByCurrentPosition(widgets: PackedWidget[]) {
  return [...widgets].sort(
    (a, b) =>
      a.layout.y - b.layout.y ||
      a.layout.x - b.layout.x ||
      b.layout.h * b.layout.w - a.layout.h * a.layout.w ||
      a.originalIndex - b.originalIndex
  );
}

function buildVerticalPackedLayouts(widgets: PackedWidget[], args: ArrangeDashboardWidgetsArgs) {
  const spacing = getSpacingValue(args.spacing);
  const targetArea = args.targetArea ?? "left";
  const columns: Array<{ widgets: PackedWidget[]; width: number; height: number }> = [];

  for (const widget of sortWidgetsByCurrentPosition(widgets)) {
    const currentColumn = columns.length > 0 ? columns[columns.length - 1] : undefined;
    const nextHeight = currentColumn
      ? currentColumn.height + spacing + widget.layout.h
      : widget.layout.h;

    if (currentColumn && nextHeight <= MAX_GRID_ROWS) {
      currentColumn.widgets.push(widget);
      currentColumn.width = Math.max(currentColumn.width, widget.layout.w);
      currentColumn.height = nextHeight;
      continue;
    }

    columns.push({
      widgets: [widget],
      width: widget.layout.w,
      height: widget.layout.h,
    });
  }

  const groupWidth = Math.min(
    GRID_COLUMNS,
    columns.reduce((sum, column, index) => sum + column.width + (index > 0 ? spacing : 0), 0)
  );
  const groupHeight = Math.min(MAX_GRID_ROWS, Math.max(1, ...columns.map((column) => column.height)));
  const relativeLayouts: Record<string, LayoutItem> = {};
  const placeFromRight = targetArea === "right";
  let columnX = placeFromRight ? groupWidth : 0;

  for (const column of columns) {
    const x = placeFromRight ? columnX - column.width : columnX;
    let y = 0;

    for (const widget of column.widgets) {
      const alignedX =
        targetArea === "right"
          ? x + column.width - widget.layout.w
          : targetArea === "center"
            ? x + Math.floor((column.width - widget.layout.w) / 2)
            : x;

      relativeLayouts[widget.id] = {
        x: alignedX,
        y,
        w: widget.layout.w,
        h: widget.layout.h,
      };
      y += widget.layout.h + spacing;
    }

    columnX += placeFromRight ? -(column.width + spacing) : column.width + spacing;
  }

  return { relativeLayouts, groupWidth, groupHeight };
}

function buildHorizontalPackedLayouts(widgets: PackedWidget[], args: ArrangeDashboardWidgetsArgs) {
  const spacing = getSpacingValue(args.spacing);
  const targetArea = args.targetArea ?? "top";
  const rows: Array<{ widgets: PackedWidget[]; width: number; height: number }> = [];

  for (const widget of sortWidgetsByCurrentPosition(widgets)) {
    const currentRow = rows.length > 0 ? rows[rows.length - 1] : undefined;
    const nextWidth = currentRow ? currentRow.width + spacing + widget.layout.w : widget.layout.w;

    if (currentRow && nextWidth <= GRID_COLUMNS) {
      currentRow.widgets.push(widget);
      currentRow.width = nextWidth;
      currentRow.height = Math.max(currentRow.height, widget.layout.h);
      continue;
    }

    rows.push({
      widgets: [widget],
      width: widget.layout.w,
      height: widget.layout.h,
    });
  }

  const groupWidth = Math.min(GRID_COLUMNS, Math.max(1, ...rows.map((row) => row.width)));
  const groupHeight = Math.min(
    MAX_GRID_ROWS,
    rows.reduce((sum, row, index) => sum + row.height + (index > 0 ? spacing : 0), 0)
  );
  const relativeLayouts: Record<string, LayoutItem> = {};
  const placeFromBottom = targetArea === "bottom";
  let rowY = placeFromBottom ? groupHeight : 0;

  for (const row of rows) {
    const y = placeFromBottom ? rowY - row.height : rowY;
    const startX =
      targetArea === "right"
        ? groupWidth - row.width
        : targetArea === "center"
          ? Math.floor((groupWidth - row.width) / 2)
          : 0;
    let x = startX;

    for (const widget of row.widgets) {
      relativeLayouts[widget.id] = {
        x,
        y: y + Math.floor((row.height - widget.layout.h) / 2),
        w: widget.layout.w,
        h: widget.layout.h,
      };
      x += widget.layout.w + spacing;
    }

    rowY += placeFromBottom ? -(row.height + spacing) : row.height + spacing;
  }

  return { relativeLayouts, groupWidth, groupHeight };
}

function buildPackedLayouts(widgets: PackedWidget[], args: ArrangeDashboardWidgetsArgs) {
  if (getPrimaryDirection(args) === "horizontal") {
    return buildHorizontalPackedLayouts(widgets, args);
  }

  return buildVerticalPackedLayouts(widgets, args);
}

function getGroupOrigins(groupWidth: number, groupHeight: number, args: ArrangeDashboardWidgetsArgs) {
  const targetArea = args.targetArea ?? "left";
  const maxX = Math.max(0, GRID_COLUMNS - groupWidth);
  const maxY = Math.max(0, MAX_GRID_ROWS - groupHeight);
  const centerX = Math.max(0, Math.floor((GRID_COLUMNS - groupWidth) / 2));
  const centerY = Math.max(0, Math.floor((MAX_GRID_ROWS - groupHeight) / 2));
  const leftXs = Array.from({ length: maxX + 1 }, (_, index) => index);
  const rightXs = Array.from({ length: maxX + 1 }, (_, index) => maxX - index);
  const topYs = Array.from({ length: maxY + 1 }, (_, index) => index);
  const bottomYs = Array.from({ length: maxY + 1 }, (_, index) => maxY - index);
  const centerXs = Array.from({ length: maxX + 1 }, (_, index) => index).sort(
    (a, b) => Math.abs(a - centerX) - Math.abs(b - centerX)
  );
  const centerYs = Array.from({ length: maxY + 1 }, (_, index) => index).sort(
    (a, b) => Math.abs(a - centerY) - Math.abs(b - centerY)
  );

  const xs =
    targetArea === "right" ? rightXs : targetArea === "center" ? centerXs : targetArea === "left" ? leftXs : centerXs;
  const ys =
    targetArea === "bottom"
      ? bottomYs
      : targetArea === "center"
        ? centerYs
        : targetArea === "top"
          ? topYs
          : topYs;
  const positions: Array<{ x: number; y: number }> = [];

  if (getPrimaryDirection(args) === "horizontal") {
    for (const y of ys) {
      for (const x of xs) positions.push({ x, y });
    }
  } else {
    for (const x of xs) {
      for (const y of ys) positions.push({ x, y });
    }
  }

  return positions;
}

function placePackedLayouts(
  widgets: PackedWidget[],
  occupiedLayouts: LayoutItem[],
  args: ArrangeDashboardWidgetsArgs
) {
  const packed = buildPackedLayouts(widgets, args);

  for (const origin of getGroupOrigins(packed.groupWidth, packed.groupHeight, args)) {
    const candidateLayouts = Object.fromEntries(
      Object.entries(packed.relativeLayouts).map(([widgetId, layout]) => [
        widgetId,
        {
          ...layout,
          x: layout.x + origin.x,
          y: layout.y + origin.y,
        },
      ])
    );
    const candidateValues = Object.values(candidateLayouts);
    const overlapsOccupied = candidateValues.some((candidate) =>
      occupiedLayouts.some((occupied) => rectsOverlap(candidate, occupied))
    );
    const overlapsSelf = candidateValues.some((candidate, index) =>
      candidateValues.slice(index + 1).some((other) => rectsOverlap(candidate, other))
    );

    if (!overlapsOccupied && !overlapsSelf) {
      return candidateLayouts;
    }
  }

  return Object.fromEntries(
    Object.entries(packed.relativeLayouts).map(([widgetId, layout]) => [widgetId, clampLayout(layout)])
  );
}

function getLayoutsBounds(layouts: Record<string, LayoutItem>) {
  const values = Object.values(layouts);
  const minX = Math.min(...values.map((layout) => layout.x));
  const minY = Math.min(...values.map((layout) => layout.y));
  const maxX = Math.max(...values.map((layout) => layout.x + layout.w));
  const maxY = Math.max(...values.map((layout) => layout.y + layout.h));

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function createRelativeLayoutsFromCurrent(widgets: PackedWidget[]) {
  const absoluteLayouts = Object.fromEntries(widgets.map((widget) => [widget.id, widget.layout]));
  const bounds = getLayoutsBounds(absoluteLayouts);

  return {
    relativeLayouts: Object.fromEntries(
      Object.entries(absoluteLayouts).map(([widgetId, layout]) => [
        widgetId,
        {
          ...layout,
          x: layout.x - bounds.minX,
          y: layout.y - bounds.minY,
        },
      ])
    ),
    groupWidth: bounds.width,
    groupHeight: bounds.height,
  };
}

function offsetRelativeLayouts(relativeLayouts: Record<string, LayoutItem>, origin: { x: number; y: number }) {
  return Object.fromEntries(
    Object.entries(relativeLayouts).map(([widgetId, layout]) => [
      widgetId,
      clampLayout({
        ...layout,
        x: layout.x + origin.x,
        y: layout.y + origin.y,
      }),
    ])
  );
}

function layoutsCollide(layouts: Record<string, LayoutItem>, occupiedLayouts: LayoutItem[]) {
  const values = Object.values(layouts);
  const overlapsOccupied = values.some((layout) => overlapsAny(layout, occupiedLayouts));
  const overlapsSelf = values.some((layout, index) =>
    values.slice(index + 1).some((otherLayout) => rectsOverlap(layout, otherLayout))
  );

  return overlapsOccupied || overlapsSelf;
}

function clampGroupOrigin(origin: { x: number; y: number }, groupWidth: number, groupHeight: number) {
  return {
    x: Math.min(Math.max(0, Math.round(origin.x)), Math.max(0, GRID_COLUMNS - groupWidth)),
    y: Math.min(Math.max(0, Math.round(origin.y)), Math.max(0, MAX_GRID_ROWS - groupHeight)),
  };
}

function getPlacementOrigin(
  placement: Exclude<ArrangeDashboardWidgetsArgs["placement"], undefined | "beside">,
  anchorLayout: LayoutItem,
  groupWidth: number,
  groupHeight: number,
  align: ArrangeDashboardWidgetsArgs["align"],
  gap: number
) {
  const crossAxisStart =
    align === "end"
      ? anchorLayout.y + anchorLayout.h - groupHeight
      : align === "center"
        ? anchorLayout.y + Math.floor((anchorLayout.h - groupHeight) / 2)
        : anchorLayout.y;
  const horizontalStart =
    align === "end"
      ? anchorLayout.x + anchorLayout.w - groupWidth
      : align === "center"
        ? anchorLayout.x + Math.floor((anchorLayout.w - groupWidth) / 2)
        : anchorLayout.x;

  if (placement === "left_of") {
    return { x: anchorLayout.x - groupWidth - gap, y: crossAxisStart };
  }

  if (placement === "right_of") {
    return { x: anchorLayout.x + anchorLayout.w + gap, y: crossAxisStart };
  }

  if (placement === "above") {
    return { x: horizontalStart, y: anchorLayout.y - groupHeight - gap };
  }

  return { x: horizontalStart, y: anchorLayout.y + anchorLayout.h + gap };
}

function findNearestSingleLayout(desiredLayout: LayoutItem, occupiedLayouts: LayoutItem[]) {
  const clampedLayout = clampLayout(desiredLayout);
  const maxX = GRID_COLUMNS - clampedLayout.w;
  const maxY = MAX_GRID_ROWS - clampedLayout.h;
  const positions = [];

  for (let x = 0; x <= maxX; x += 1) {
    for (let y = 0; y <= maxY; y += 1) {
      positions.push({ x, y });
    }
  }

  positions.sort(
    (a, b) =>
      Math.abs(a.x - clampedLayout.x) +
      Math.abs(a.y - clampedLayout.y) -
      (Math.abs(b.x - clampedLayout.x) + Math.abs(b.y - clampedLayout.y))
  );

  for (const position of positions) {
    const candidate = { ...clampedLayout, x: position.x, y: position.y };
    if (!overlapsAny(candidate, occupiedLayouts)) return candidate;
  }

  return clampedLayout;
}

function nudgeLayouts(
  widgets: PackedWidget[],
  occupiedLayouts: LayoutItem[],
  args: ArrangeDashboardWidgetsArgs
) {
  const deltaX = getNudgeAmount(args.deltaX);
  const deltaY = getNudgeAmount(args.deltaY);
  const nextLayouts: Record<string, LayoutItem> = {};
  const movingOccupiedLayouts = [...occupiedLayouts];

  for (const widget of sortWidgetsByCurrentPosition(widgets)) {
    const desiredLayout = {
      ...widget.layout,
      x: widget.layout.x + deltaX,
      y: widget.layout.y + deltaY,
    };
    const nextLayout = findNearestSingleLayout(desiredLayout, movingOccupiedLayouts);

    nextLayouts[widget.id] = nextLayout;
    movingOccupiedLayouts.push(nextLayout);
  }

  return nextLayouts;
}

function placeLayoutsRelativeToWidget(
  widgets: PackedWidget[],
  anchorLayout: LayoutItem,
  occupiedLayouts: LayoutItem[],
  args: ArrangeDashboardWidgetsArgs
) {
  const currentGroup = createRelativeLayoutsFromCurrent(widgets);
  const gap = getFineSpacing(args);
  const placement = args.placement ?? "beside";
  const align = args.align ?? "start";
  const placementCandidates =
    placement === "beside"
      ? (["left_of", "right_of"] as const)
      : ([placement] as Array<Exclude<ArrangeDashboardWidgetsArgs["placement"], undefined | "beside">>);
  const origins = placementCandidates.map((candidatePlacement) =>
    clampGroupOrigin(
      getPlacementOrigin(
        candidatePlacement,
        anchorLayout,
        currentGroup.groupWidth,
        currentGroup.groupHeight,
        align,
        gap
      ),
      currentGroup.groupWidth,
      currentGroup.groupHeight
    )
  );
  const currentBounds = getLayoutsBounds(Object.fromEntries(widgets.map((widget) => [widget.id, widget.layout])));

  origins.sort(
    (a, b) =>
      Math.abs(a.x - currentBounds.minX) +
      Math.abs(a.y - currentBounds.minY) -
      (Math.abs(b.x - currentBounds.minX) + Math.abs(b.y - currentBounds.minY))
  );

  for (const origin of origins) {
    const candidateLayouts = offsetRelativeLayouts(currentGroup.relativeLayouts, origin);
    if (!layoutsCollide(candidateLayouts, occupiedLayouts)) return candidateLayouts;
  }

  for (const origin of getGroupOrigins(currentGroup.groupWidth, currentGroup.groupHeight, {
    ...args,
    targetArea: args.placement === "right_of" ? "right" : args.placement === "below" ? "bottom" : args.targetArea,
  })) {
    const candidateLayouts = offsetRelativeLayouts(currentGroup.relativeLayouts, origin);
    if (!layoutsCollide(candidateLayouts, occupiedLayouts)) return candidateLayouts;
  }

  return offsetRelativeLayouts(currentGroup.relativeLayouts, origins[0] ?? { x: currentBounds.minX, y: currentBounds.minY });
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
      const widgetStyles = normalizeObjectMap(data.widgetStyles);

      alreadyActive = activeWidgets.includes(widgetId);

      if (!layouts[widgetId]) {
        layouts[widgetId] = createCenteredLayout(widgetId, layouts);
      }

      widgetLocks[widgetId] = false;
      delete widgetStyles[widgetId];

      if (!snap.exists) {
        transaction.set(ref, {
          activeWidgets: alreadyActive ? activeWidgets : [...activeWidgets, widgetId],
          layouts,
          widgetLocks,
          widgetStyles,
          updatedAt: new Date(),
        });
        return;
      }

      transaction.update(ref, {
        activeWidgets: alreadyActive ? activeWidgets : [...activeWidgets, widgetId],
        layouts,
        [`widgetLocks.${widgetId}`]: false,
        [`widgetStyles.${widgetId}`]: FieldValue.delete(),
        updatedAt: new Date(),
      });
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

export const arrangeDashboardWidgetsTool: ToolDef<
  ArrangeDashboardWidgetsArgs,
  {
    ok: true;
    movedWidgets: ArrangedWidgetSummary[];
    skippedLockedWidgets: string[];
    targetArea: NonNullable<ArrangeDashboardWidgetsArgs["targetArea"]>;
    spacing: NonNullable<ArrangeDashboardWidgetsArgs["spacing"]>;
  }
> = {
  name: "arrangeDashboardWidgets",
  description:
    "Move dashboard widgets on the grid. Supports three modes: pack active widgets as a coherent group, nudge selected widgets by grid cells, or place selected widgets beside/above/below another widget. Use this when the user asks to move widgets, group widgets together, put widgets close together, move a widget a little, or place one widget next to another. If widgetIds is omitted in pack mode, all active widgets are arranged. Supports active built-in widgets, notes, and custom button widget IDs.",
  parameters: {
    type: "object",
    properties: {
      widgetIds: {
        type: "array",
        items: { type: "string" },
        description:
          "Optional active widget IDs or unambiguous widget names to move. Omit to arrange all active widgets.",
      },
      mode: {
        type: "string",
        enum: ["pack", "nudge", "place"],
        description:
          "Use pack for grouping/anchoring many widgets, nudge for small moves by grid cells, and place for positioning relative to another widget.",
      },
      targetArea: {
        type: "string",
        enum: ["left", "right", "top", "bottom", "center"],
        description: "Where to move a packed group. Defaults to left in pack mode.",
      },
      spacing: {
        type: "string",
        enum: ["none", "small", "normal"],
        description: "How tightly widgets should be packed or placed. Use none for requests like close together.",
      },
      direction: {
        type: "string",
        enum: ["vertical", "horizontal"],
        description:
          "Primary packing direction. Defaults to vertical for left/right/center and horizontal for top/bottom.",
      },
      deltaX: {
        type: "number",
        description:
          "Grid columns to nudge selected widgets. Positive moves right, negative moves left. For 'a little right', use 2.",
      },
      deltaY: {
        type: "number",
        description:
          "Grid rows to nudge selected widgets. Positive moves down, negative moves up. For 'a little down', use 2.",
      },
      relativeToWidgetId: {
        type: "string",
        description:
          "Active widget ID or unambiguous widget name used as the anchor for place mode, such as ai_chat or AI chat.",
      },
      placement: {
        type: "string",
        enum: ["left_of", "right_of", "above", "below", "beside"],
        description:
          "Where to place selected widgets relative to relativeToWidgetId. Use beside when the user says next to/ved siden av without a precise side.",
      },
      align: {
        type: "string",
        enum: ["start", "center", "end"],
        description:
          "Alignment against the anchor widget in place mode. start aligns top/left edges, center centers, end aligns bottom/right edges.",
      },
      gap: {
        type: "number",
        description: "Exact grid-cell gap for place mode. Defaults to spacing.",
      },
      includeLocked: {
        type: "boolean",
        description: "Whether locked widgets may be moved. Defaults to false.",
      },
    },
    additionalProperties: false,
  },
  async handler(args, ctx) {
    const ref = dashboardLayoutRef(ctx.uid);
    const targetArea = args.targetArea ?? "left";
    const spacing = args.spacing ?? "none";
    const movedWidgets = await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      const data = (snap.exists ? snap.data() : {}) as WidgetLayoutDocument;
      const activeWidgets = normalizeActiveWidgets(data.activeWidgets, snap.exists);
      const layouts = normalizeLayouts(data.layouts, snap.exists);
      const widgetLocks = normalizeBooleanMap(data.widgetLocks);
      const requestedTargets = Array.isArray(args.widgetIds) && args.widgetIds.length
        ? resolveActiveWidgetTargets(args.widgetIds, activeWidgets)
        : activeWidgets;
      const mode =
        args.mode ??
        (args.relativeToWidgetId
          ? "place"
          : typeof args.deltaX === "number" || typeof args.deltaY === "number"
            ? "nudge"
            : "pack");
      const anchorWidgetId = args.relativeToWidgetId
        ? resolveSingleActiveWidgetTarget(args.relativeToWidgetId, activeWidgets)
        : null;
      const skippedLockedWidgets: string[] = [];
      const targetWidgets = requestedTargets.filter((widgetId) => {
        if (widgetId === anchorWidgetId) return false;
        if (args.includeLocked || !widgetLocks[widgetId]) return true;
        skippedLockedWidgets.push(widgetId);
        return false;
      });
      const moved: ArrangedWidgetSummary[] = [];

      if (targetWidgets.length === 0) {
        return { moved, skippedLockedWidgets };
      }

      const occupiedLayouts = Object.entries(layouts)
        .filter(([widgetId]) => !targetWidgets.includes(widgetId))
        .map(([, layout]) => clampLayout(layout));
      const nextLayouts = { ...layouts };
      const packedWidgets = targetWidgets.map((widgetId) => ({
        id: widgetId,
        layout: clampLayout(layouts[widgetId] ?? getDefaultLayoutForWidget(widgetId)),
        originalIndex: activeWidgets.indexOf(widgetId),
      }));
      const packedLayouts =
        mode === "nudge"
          ? nudgeLayouts(packedWidgets, occupiedLayouts, args)
          : mode === "place" && anchorWidgetId
            ? placeLayoutsRelativeToWidget(
                packedWidgets,
                clampLayout(layouts[anchorWidgetId] ?? getDefaultLayoutForWidget(anchorWidgetId)),
                occupiedLayouts,
                { ...args, spacing }
              )
            : placePackedLayouts(
                packedWidgets,
                occupiedLayouts,
                { ...args, targetArea, spacing }
              );

      for (const widgetId of targetWidgets) {
        const nextLayout =
          packedLayouts[widgetId] ?? clampLayout(layouts[widgetId] ?? getDefaultLayoutForWidget(widgetId));

        nextLayouts[widgetId] = nextLayout;
        moved.push({
          id: widgetId,
          label: getWidgetLabel(widgetId),
          layout: nextLayout,
        });
      }

      if (!snap.exists) {
        transaction.set(ref, {
          activeWidgets,
          layouts: nextLayouts,
          widgetLocks,
          widgetStyles: {},
          updatedAt: new Date(),
        });
      } else {
        transaction.update(ref, {
          layouts: nextLayouts,
          updatedAt: new Date(),
        });
      }

      return { moved, skippedLockedWidgets };
    });

    return {
      ok: true,
      movedWidgets: movedWidgets.moved,
      skippedLockedWidgets: movedWidgets.skippedLockedWidgets,
      targetArea,
      spacing,
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

      if (!snap.exists) {
        transaction.set(ref, {
          activeWidgets: activeWidgets.filter((id) => id !== widgetId),
          layouts,
          widgetLocks,
          widgetStyles,
          updatedAt: new Date(),
        });
        return;
      }

      transaction.update(ref, {
        activeWidgets: activeWidgets.filter((id) => id !== widgetId),
        layouts,
        [`widgetLocks.${widgetId}`]: FieldValue.delete(),
        [`widgetStyles.${widgetId}`]: FieldValue.delete(),
        updatedAt: new Date(),
      });
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
