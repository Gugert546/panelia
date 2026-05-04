import { useEffect, useRef, useState } from "react";
import GridLayout from "react-grid-layout/legacy";
import type { Layout } from "react-grid-layout";
import { WIDGETS } from "../features/Widgets/registry/WidgetRegistry";
import { WidgetInstanceProvider } from "../features/Widgets/components/WidgetInstanceContext";
import type { WidgetStyleOverrides } from "../features/dashboard/hooks/useWidgetsState";
import { useLanguage } from "../providers/languageProvider";
import { useFontSize } from "../providers/themeProviders";

type Props = {
  activeWidgets: string[];
  layouts: Record<string, { x: number; y: number; w: number; h: number }>;
  widgetLocks: Record<string, boolean>;
  clockModes: Record<string, "digital" | "analog">;
  clockBackgrounds: Record<string, boolean>;
  widgetStyles: Record<string, WidgetStyleOverrides>;
  widgetSurfaceColor: string;
  widgetBorderColor: string;
  widgetTextColor: string;
  widgetBlur: number;
  widgetBorderWidth: number;
  onLayoutChange: (layouts: Record<string, { x: number; y: number; w: number; h: number }>) => void;
  onCloseWidget: (widgetId: string) => void;
  onToggleWidgetLock: (widgetId: string) => void;
  onToggleClockMode: (widgetId: string) => void;
  onToggleClockBackground: (widgetId: string) => void;
  onSetWidgetStyle: (widgetId: string, patch: WidgetStyleOverrides) => void;
  onResetWidgetStyle: (widgetId: string) => void;
  onRequestSidebarFocus?: () => void;
  containerWidth?: number;
  isInteractive?: boolean;
  isMovable?: boolean;
  calendarWidgetConfig?: Record<string, unknown>;
};

const BASE_GRID_COLUMNS = 40;
const BASE_GRID_ROWS = 40;
const GRID_MAX_ROW_HEIGHT = 30;
const GRID_MIN_ROW_HEIGHT = 12;
const GRID_MIN_WIDTH = 320;
const GRID_MIN_HEIGHT = 360;

function resolveGridColumns(width: number) {
  void width;
  return BASE_GRID_COLUMNS;
}

function resolveGridRowHeight(height: number) {
  const available = Math.max(GRID_MIN_HEIGHT, height);
  return clampGridValue(
    Math.floor(available / BASE_GRID_ROWS),
    GRID_MIN_ROW_HEIGHT,
    GRID_MAX_ROW_HEIGHT
  );
}

function clampGridValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function scaleSpanToCurrent(span: number, currentCols: number) {
  return clampGridValue(Math.round((span / BASE_GRID_COLUMNS) * currentCols), 1, currentCols);
}

function scaleXToCurrent(x: number, w: number, currentCols: number) {
  const scaledW = scaleSpanToCurrent(w, currentCols);
  const scaledX = Math.round((x / BASE_GRID_COLUMNS) * currentCols);
  return clampGridValue(scaledX, 0, Math.max(0, currentCols - scaledW));
}

function scaleSpanToBase(span: number, currentCols: number) {
  return clampGridValue(Math.round((span / currentCols) * BASE_GRID_COLUMNS), 1, BASE_GRID_COLUMNS);
}

function scaleXToBase(x: number, w: number, currentCols: number) {
  const scaledW = scaleSpanToBase(w, currentCols);
  const scaledX = Math.round((x / currentCols) * BASE_GRID_COLUMNS);
  return clampGridValue(scaledX, 0, Math.max(0, BASE_GRID_COLUMNS - scaledW));
}

function toColorInputValue(value: string) {
  const trimmed = value.trim();

  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
    if (trimmed.length === 4) {
      const r = trimmed[1];
      const g = trimmed[2];
      const b = trimmed[3];
      return `#${r}${r}${g}${g}${b}${b}`;
    }

    return trimmed;
  }

  const rgbaMatch = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i
  );

  if (rgbaMatch) {
    const [, red, green, blue] = rgbaMatch;
    return `#${[red, green, blue]
      .map((channel) => Number(channel).toString(16).padStart(2, "0"))
      .join("")}`;
  }

  return "#ffffff";
}

function getColorAlpha(value: string) {
  const trimmed = value.trim();
  const rgbaMatch = trimmed.match(
    /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$/i
  );

  if (rgbaMatch) {
    return Number(rgbaMatch[1]);
  }

  return 1;
}

function withAlpha(color: string, alpha: number) {
  const normalizedColor = toColorInputValue(color);
  const hex = normalizedColor.slice(1);
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);

  return `rgba(${red},${green},${blue},${alpha})`;
}

function getWidgetType(widgetId: string) {
  const separatorIndex = widgetId.indexOf(":");
  if (separatorIndex === -1) return widgetId;
  return widgetId.slice(0, separatorIndex);
}

const NEWS_COUNTRY_OPTIONS = [
  { code: "no", label: "Norway" },
  { code: "se", label: "Sweden" },
  { code: "dk", label: "Denmark" },
  { code: "gb", label: "United Kingdom" },
  { code: "us", label: "United States" },
  { code: "de", label: "Germany" },
  { code: "fr", label: "France" },
  { code: "es", label: "Spain" },
] as const;

function getNewsCountryStorageKey(widgetId: string) {
  return `panelia:news:selected-country:${widgetId}`;
}

export default function DashboardGrid({
  activeWidgets,
  layouts,
  widgetLocks,
  clockModes,
  clockBackgrounds,
  widgetStyles,
  widgetSurfaceColor,
  widgetBorderColor,
  widgetTextColor,
  widgetBlur,
  widgetBorderWidth,
  onLayoutChange,
  onCloseWidget,
  onToggleWidgetLock,
  onToggleClockMode,
  onToggleClockBackground,
  onSetWidgetStyle,
  onResetWidgetStyle,
  onRequestSidebarFocus,
  containerWidth,
  isInteractive = true,
  isMovable = isInteractive,
  calendarWidgetConfig
}: Props) {
  const [hoveredWidgetId, setHoveredWidgetId] = useState<string | null>(null);
  const [styleEditorWidgetId, setStyleEditorWidgetId] = useState<string | null>(null);
  const [newsCountryMenuWidgetId, setNewsCountryMenuWidgetId] = useState<string | null>(null);
  const [newsCountries, setNewsCountries] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("panelia:news:selected-country:")) {
          const widgetId = key.slice("panelia:news:selected-country:".length);
          const value = localStorage.getItem(key);
          if (value) initial[widgetId] = value;
        }
      }
    } catch {
      // ignore
    }
    return initial;
  });
  const [focusedWidgetId, setFocusedWidgetId] = useState<string | null>(null);
  const [keyboardMoveWidgetId, setKeyboardMoveWidgetId] = useState<string | null>(null);
  const [keyboardStatusMessage, setKeyboardStatusMessage] = useState("");
  const widgetElementRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { t } = useLanguage();
  const { fontSize: globalFontSize } = useFontSize();

  const fallbackWidth = typeof window === "undefined" ? 1200 : window.innerWidth;
  const resolvedContainerWidth =
    typeof containerWidth === "number" && Number.isFinite(containerWidth)
      ? containerWidth
      : fallbackWidth;
  const gridWidth = Math.max(GRID_MIN_WIDTH, resolvedContainerWidth);
  const fallbackHeight = typeof window === "undefined" ? 900 : window.innerHeight;
  const gridHeight = Math.max(GRID_MIN_HEIGHT, fallbackHeight);
  const gridRowHeight = resolveGridRowHeight(gridHeight);

  const activeGridColumns = resolveGridColumns(gridWidth);

  const computedLayout = activeWidgets
    .map((widgetId, index) => {
      const widgetType = getWidgetType(widgetId);
      const widget = WIDGETS[widgetType as keyof typeof WIDGETS];

      if (!widget) return null;

      const baseGrid = widget.defaultGrid;
      const storedLayout = layouts[widgetId];

      const currentLayout: { x?: number; y?: number; w: number; h: number } = storedLayout
        ? {
            ...storedLayout,
            w: Math.max(storedLayout.w, baseGrid.w),
            h: Math.max(storedLayout.h, baseGrid.h),
          }
        : baseGrid;

      const scaledW = scaleSpanToCurrent(currentLayout.w, activeGridColumns);
      const scaledH = currentLayout.h;
      const scaledX = scaleXToCurrent(currentLayout.x ?? (index * 4) % 20, currentLayout.w, activeGridColumns);
      const scaledMinW = scaleSpanToCurrent(baseGrid.w, activeGridColumns);

      return {
        i: widgetId,
        x: scaledX,
        y: currentLayout.y ?? Math.floor(index / 5) * widget.defaultGrid.h,
        w: scaledW,
        h: scaledH,
        minW: scaledMinW,
        minH: baseGrid.h,
        static: Boolean(widgetLocks[widgetId]),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  useEffect(() => {
    if (!keyboardMoveWidgetId) return;
    if (widgetLocks[keyboardMoveWidgetId]) {
      setKeyboardMoveWidgetId(null);
    }
  }, [keyboardMoveWidgetId, widgetLocks]);

  const overlaps = (
    first: { x: number; y: number; w: number; h: number },
    second: { x: number; y: number; w: number; h: number }
  ) => {
    return (
      first.x < second.x + second.w &&
      first.x + first.w > second.x &&
      first.y < second.y + second.h &&
      first.y + first.h > second.y
    );
  };

  const moveWidgetByKeyboard = (widgetId: string, deltaX: number, deltaY: number) => {
    const widgetLayout = computedLayout.find((item) => item.i === widgetId);
    if (!widgetLayout) return;

    const maxX = Math.max(0, activeGridColumns - widgetLayout.w);
    const maxY = Math.max(0, BASE_GRID_ROWS - widgetLayout.h);

    const nextX = clampGridValue(widgetLayout.x + deltaX, 0, maxX);
    const nextY = clampGridValue(widgetLayout.y + deltaY, 0, maxY);

    if (nextX === widgetLayout.x && nextY === widgetLayout.y) return;

    const collides = computedLayout.some((item) => {
      if (item.i === widgetId) return false;
      return overlaps(
        { x: nextX, y: nextY, w: widgetLayout.w, h: widgetLayout.h },
        { x: item.x, y: item.y, w: item.w, h: item.h }
      );
    });

    if (collides) {
      setKeyboardStatusMessage(t("widgets.widgetKeyboard.moveBlocked"));
      return;
    }

    const nextLayout = computedLayout.map((item) =>
      item.i === widgetId ? { ...item, x: nextX, y: nextY } : item
    );

    persistLayout(nextLayout);
    setKeyboardStatusMessage(
      `${t("widgets.widgetKeyboard.position")}: ${nextX + 1}, ${nextY + 1}`
    );
  };

  const focusAdjacentWidget = (
    widgetId: string,
    direction: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown"
  ): boolean => {
    const current = computedLayout.find((item) => item.i === widgetId);
    if (!current) return false;

    const cx = current.x + current.w / 2;
    const cy = current.y + current.h / 2;
    const isHorizontal = direction === "ArrowLeft" || direction === "ArrowRight";

    // Step 1: Filter to only widgets in the target direction (by center)
    const inDirection = computedLayout.filter((item) => {
      if (item.i === widgetId) return false;
      const nx = item.x + item.w / 2;
      const ny = item.y + item.h / 2;
      if (direction === "ArrowLeft")  return nx < cx;
      if (direction === "ArrowRight") return nx > cx;
      if (direction === "ArrowUp")    return ny < cy;
      return ny > cy; // ArrowDown
    });

    if (inDirection.length === 0) return false;

    // Step 2: Prefer widgets that share overlap on the perpendicular axis (same row/col).
    //         If any exist, use only those. Otherwise fall back to all in-direction widgets.
    const overlapping = inDirection.filter((item) =>
      isHorizontal
        ? current.y < item.y + item.h && current.y + current.h > item.y
        : current.x < item.x + item.w && current.x + current.w > item.x
    );

    const pool = overlapping.length > 0 ? overlapping : inDirection;

    // Step 3: Among the pool, pick the one closest in the primary direction
    const best = pool.reduce((a, b) => {
      const distA = isHorizontal
        ? Math.abs((a.x + a.w / 2) - cx)
        : Math.abs((a.y + a.h / 2) - cy);
      const distB = isHorizontal
        ? Math.abs((b.x + b.w / 2) - cx)
        : Math.abs((b.y + b.h / 2) - cy);
      return distA <= distB ? a : b;
    });

    const nextElement = document.querySelector(
      `[data-widget-id="${best.i}"]`
    ) as HTMLElement | null;
    if (!nextElement) return false;

    setFocusedWidgetId(best.i);
    nextElement.focus();
    return true;
  };

  const focusSidebarFallback = () => {
    const editButton = document.querySelector(
      'aside button[aria-label="Rediger"]:not([disabled])'
    ) as HTMLButtonElement | null;

    if (editButton) {
      editButton.focus();
      return;
    }

    const firstSidebarButton = document.querySelector(
      "aside button:not([disabled])"
    ) as HTMLButtonElement | null;
    firstSidebarButton?.focus();
  };

  const handleWidgetKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, widgetId: string) => {
    if (event.target !== event.currentTarget) return;
    if (widgetLocks[widgetId]) return;

    const isInMoveMode = keyboardMoveWidgetId === widgetId;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      const nextIsMoveMode = !isInMoveMode;
      setKeyboardMoveWidgetId(nextIsMoveMode ? widgetId : null);
      setKeyboardStatusMessage(
        nextIsMoveMode
          ? t("widgets.widgetKeyboard.moveEnabled")
          : t("widgets.widgetKeyboard.moveDisabled")
      );
      return;
    }

    if (!isInMoveMode) {
      if (
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown"
      ) {
        event.preventDefault();
        event.stopPropagation();

        const succeeded = focusAdjacentWidget(widgetId, event.key);

        if (!succeeded && event.key === "ArrowLeft") {
          setFocusedWidgetId(null);
          setKeyboardMoveWidgetId(null);
          if (onRequestSidebarFocus) {
            onRequestSidebarFocus();
          } else {
            focusSidebarFallback();
          }
        }
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setKeyboardMoveWidgetId(null);
      setKeyboardStatusMessage(t("widgets.widgetKeyboard.moveDisabled"));
      return;
    }

    const step = event.shiftKey ? 4 : 1;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopPropagation();
      moveWidgetByKeyboard(widgetId, -step, 0);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      event.stopPropagation();
      moveWidgetByKeyboard(widgetId, step, 0);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      moveWidgetByKeyboard(widgetId, 0, -step);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
      moveWidgetByKeyboard(widgetId, 0, step);
    }
  };

  const persistLayout = (newLayout: Layout) => {
    const newLayouts: Record<string, { x: number; y: number; w: number; h: number }> = {};

    newLayout.forEach(item => {
      const widgetType = getWidgetType(item.i);
      const widget = WIDGETS[widgetType as keyof typeof WIDGETS];
      const baseGrid = widget?.defaultGrid;

      const baseW = scaleSpanToBase(item.w, activeGridColumns);

      newLayouts[item.i] = {
        x: scaleXToBase(item.x, item.w, activeGridColumns),
        y: item.y,
        
        // Clamp to widget minimums so users can’t resize smaller than starting size
        w: baseGrid ? Math.max(baseW, baseGrid.w) : baseW,
        h: baseGrid ? Math.max(item.h, baseGrid.h) : item.h,
      };
    });

    onLayoutChange(newLayouts);
  };

  return (
    <div
      data-arrow-scope="dashboard-grid"
      style={{ width: "100%", height: "100%", display: "flex", justifyContent: "flex-start" }}
    >
      <div
        aria-live="polite"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
        }}
      >
        {keyboardStatusMessage}
      </div>
      <GridLayout
        className="layout"
        layout={computedLayout}
        cols={activeGridColumns}
        rowHeight={gridRowHeight}
        width={gridWidth}
        isDraggable={isMovable}
        isResizable={isMovable}
        isBounded={true}
        draggableCancel="input,button,select,option,textarea,label,[role='button'],[contenteditable='true'],.widget-lock-btn,.widget-clock-mode-btn,.widget-style-btn,.widget-style-control,.widget-news-country-btn,.widget-news-country-menu"
        compactType={null}
        preventCollision={true}
        allowOverlap={false}
        margin={[0, 0]}
        maxRows={BASE_GRID_ROWS}
        containerPadding={[0, 0]}
        autoSize={false}
        style={{ height: "100%" }}
        onDragStop={(layout) => persistLayout(layout)}
        onResizeStop={(layout) => persistLayout(layout)}
      >
        {activeWidgets.map((widgetId, index) => {

        const widgetType = getWidgetType(widgetId);
        const widget = WIDGETS[widgetType as keyof typeof WIDGETS];

        if (!widget) return null;

        const Component = widget.Component;
        const baseGrid = widget.defaultGrid;
        const storedLayout = layouts[widgetId];
        const isLocked = Boolean(widgetLocks[widgetId]);
        const widgetStyle = widgetStyles[widgetId];
        const resolvedSurfaceColor = widgetStyle?.widgetSurfaceColor ?? widgetSurfaceColor;
        const resolvedBorderColor = widgetStyle?.widgetBorderColor ?? widgetBorderColor;
        const resolvedTextColor = widgetStyle?.widgetTextColor ?? widgetTextColor;
        const resolvedBlur = widgetStyle?.widgetBlur ?? widgetBlur;
        const resolvedBorderWidth = widgetStyle?.widgetBorderWidth ?? widgetBorderWidth;
        const resolvedFontSize = widgetStyle?.widgetFontSize ?? globalFontSize;
        const surfaceAlpha = getColorAlpha(resolvedSurfaceColor);
        const widgetControlBackground = "rgba(15, 23, 42, 0.58)";
        const widgetControlActiveBackground = "rgba(15, 23, 42, 0.78)";

        type SafeLayout = { x?: number; y?: number; w: number; h: number };
        const currentLayout: SafeLayout = storedLayout
          ? {
              ...storedLayout,
              // Ensure persisted layouts never shrink below the widget's default size
              w: Math.max(storedLayout.w, baseGrid.w),
              h: Math.max(storedLayout.h, baseGrid.h),
            }
          : baseGrid;
        const isClockWidget = widgetType === "clock";
        const isNewsWidget = widgetType === "news";
        const clockMode = clockModes[widgetId] ?? "digital";
        const showClockBackground = clockBackgrounds[widgetId] ?? (clockMode === "analog");
        const isStyleEditorOpen = styleEditorWidgetId === widgetId;
        const isKeyboardFocused = focusedWidgetId === widgetId;
        const isKeyboardMoveActive = keyboardMoveWidgetId === widgetId;
        return (
          <div
            key={widgetId}
            ref={(element) => {
              if (element) {
                widgetElementRefs.current[widgetId] = element;
              }
            }}
            data-widget-id={widgetId}
            tabIndex={isInteractive ? 0 : -1}
            role="group"
            aria-label={`${widgetType} widget`}
            aria-roledescription="dashboard widget"
            aria-keyshortcuts="Enter Space ArrowLeft ArrowRight ArrowUp ArrowDown Escape Shift+ArrowLeft Shift+ArrowRight Shift+ArrowUp Shift+ArrowDown"
            data-grid={{
              ...currentLayout,
              x:
                currentLayout.x !== undefined
                  ? scaleXToCurrent(currentLayout.x, currentLayout.w, activeGridColumns)
                  : scaleXToCurrent((index * 4) % 20, currentLayout.w, activeGridColumns),
              y: currentLayout.y !== undefined ? currentLayout.y : Math.floor(index / 5) * widget.defaultGrid.h,
              w: scaleSpanToCurrent(currentLayout.w, activeGridColumns),
              minW: scaleSpanToCurrent(baseGrid.w, activeGridColumns),
              minH: baseGrid.h,
              static: isLocked,
            }}
            style={{
              position: "relative",
              overflow: "visible",
              outline:
                isKeyboardFocused
                  ? isKeyboardMoveActive
                    ? "2px solid rgba(59,130,246,0.95)"
                    : "2px solid rgba(255,255,255,0.75)"
                  : "none",
              outlineOffset: 2,
              zIndex: isStyleEditorOpen ? 50 : hoveredWidgetId === widgetId ? 10 : 1,
            }}
            onFocus={() => setFocusedWidgetId(widgetId)}
            onBlur={(event) => {
              const nextTarget = event.relatedTarget;
              // If focus is moving to another widget child, don't clear (e.g., button inside widget)
              if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
                return;
              }

              // Always clear the focused widget ID for this widget when it loses focus
              setFocusedWidgetId((prev) => (prev === widgetId ? null : prev));
              setKeyboardMoveWidgetId((prev) => (prev === widgetId ? null : prev));
            }}
            onKeyDown={(event) => handleWidgetKeyDown(event, widgetId)}
            onMouseEnter={() => setHoveredWidgetId(widgetId)}
            onMouseLeave={() => setHoveredWidgetId((prev) => (prev === widgetId ? null : prev))}
          >
            {isInteractive && isKeyboardFocused && !isLocked && (
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  zIndex: 3,
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: isKeyboardMoveActive ? "rgba(37, 99, 235, 0.95)" : "rgba(15, 23, 42, 0.72)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  letterSpacing: 0.2,
                  pointerEvents: "none",
                }}
              >
                {isKeyboardMoveActive
                  ? t("widgets.widgetKeyboard.moveActiveHint")
                  : t("widgets.widgetKeyboard.moveInactiveHint")}
              </div>
            )}
            {isInteractive && hoveredWidgetId === widgetId && (
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  zIndex: 2,
                }}
              >
                {isClockWidget && (
                  <button
                    type="button"
                    className="widget-clock-mode-btn"
                    aria-label={clockMode === "analog" ? "Use digital clock" : "Use analog clock"}
                    title={clockMode === "analog" ? "Use digital clock" : "Use analog clock"}
                    onClick={() => onToggleClockMode(widgetId)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.35)",
                      background:
                        clockMode === "analog"
                          ? widgetControlActiveBackground
                          : widgetControlBackground,
                      backdropFilter: "blur(6px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      className="material-symbols-rounded"
                      aria-hidden="true"
                      style={{ fontSize: 14, color: "#fff", lineHeight: 1 }}
                    >
                      {clockMode === "analog" ? "schedule" : "av_timer"}
                    </span>
                  </button>
                )}
                {isClockWidget && (
                  <button
                    type="button"
                    className="widget-clock-background-btn"
                    aria-label={showClockBackground ? "Hide clock background" : "Show clock background"}
                    title={showClockBackground ? "Hide clock background" : "Show clock background"}
                    onClick={() => onToggleClockBackground(widgetId)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.35)",
                      background: showClockBackground
                        ? widgetControlActiveBackground
                        : widgetControlBackground,
                      backdropFilter: "blur(6px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      className="material-symbols-rounded"
                      aria-hidden="true"
                      style={{ fontSize: 14, color: "#fff", lineHeight: 1 }}
                    >
                      {showClockBackground ? "crop_square" : "check_box_outline_blank"}
                    </span>
                  </button>
                )}
                {isNewsWidget && (
                  <button
                    type="button"
                    className="widget-news-country-btn"
                    aria-label="Select news country"
                    title="Select news country"
                    aria-haspopup="menu"
                    aria-expanded={newsCountryMenuWidgetId === widgetId}
                    onClick={() =>
                      setNewsCountryMenuWidgetId((prev) => (prev === widgetId ? null : widgetId))
                    }
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.35)",
                      background:
                        newsCountryMenuWidgetId === widgetId
                          ? widgetControlActiveBackground
                          : widgetControlBackground,
                      backdropFilter: "blur(6px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      className="material-symbols-rounded"
                      aria-hidden="true"
                      style={{ fontSize: 14, color: "#fff", lineHeight: 1 }}
                    >
                      flag
                    </span>
                  </button>
                )}
                {!isLocked && (
                  <button
                    type="button"
                    className="widget-style-btn"
                    aria-label={t("editPanel.widgetStyleOpen")}
                    title={t("editPanel.widgetStyleOpen")}
                    onClick={() =>
                      setStyleEditorWidgetId((prev) => (prev === widgetId ? null : widgetId))
                    }
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.35)",
                      background:
                        styleEditorWidgetId === widgetId
                          ? widgetControlActiveBackground
                          : widgetControlBackground,
                      backdropFilter: "blur(6px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      className="material-symbols-rounded"
                      aria-hidden="true"
                      style={{ fontSize: 14, color: "#fff", lineHeight: 1 }}
                    >
                      palette
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  className="widget-lock-btn"
                  aria-label={isLocked ? "Unlock widget" : "Lock widget"}
                  title={isLocked ? "Unlock widget" : "Lock widget"}
                  onClick={() => {
                    const willLock = !isLocked;
                    onToggleWidgetLock(widgetId);

                    if (willLock && styleEditorWidgetId === widgetId) {
                      setStyleEditorWidgetId(null);
                    }
                  }}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.35)",
                    background: isLocked
                      ? widgetControlActiveBackground
                      : widgetControlBackground,
                    backdropFilter: "blur(6px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <span
                    className="material-symbols-rounded"
                    aria-hidden="true"
                    style={{ fontSize: 14, color: "#fff", lineHeight: 1 }}
                  >
                    {isLocked ? "lock" : "lock_open"}
                  </span>
                </button>
              </div>
            )}

            {isInteractive && !isLocked && isStyleEditorOpen && (
              <div
                className="widget-style-control"
                style={{
                  position: "absolute",
                  top: 0,
                  left: "calc(100% + 8px)",
                  width: 220,
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.35)",
                  background: "rgba(20, 20, 20, 0.78)",
                  backdropFilter: "blur(8px)",
                  color: "#fff",
                  zIndex: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  {t("editPanel.widgetStyleThis")}
                </div>

                <label style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  {t("editPanel.widgetColorMenu")}
                  <input
                    type="color"
                    value={toColorInputValue(resolvedSurfaceColor)}
                    onChange={(event) =>
                      onSetWidgetStyle(widgetId, {
                        widgetSurfaceColor: withAlpha(event.target.value, surfaceAlpha),
                      })
                    }
                  />
                </label>

                <label style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  {t("editPanel.widgetBlur")}: {resolvedBlur}px
                  <input
                    type="range"
                    min={0}
                    max={20}
                    step={1}
                    value={resolvedBlur}
                    onChange={(event) =>
                      onSetWidgetStyle(widgetId, {
                        widgetBlur: Number(event.target.value),
                      })
                    }
                  />
                </label>

                <label style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  {t("editPanel.widgetOpacity")}: {Math.round(surfaceAlpha * 100)}%
                  <input
                    type="range"
                    min={0.2}
                    max={1}
                    step={0.05}
                    value={surfaceAlpha}
                    onChange={(event) =>
                      onSetWidgetStyle(widgetId, {
                        widgetSurfaceColor: withAlpha(resolvedSurfaceColor, Number(event.target.value)),
                      })
                    }
                  />
                </label>

                <label style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  {t("editPanel.widgetBorderColorTitle")}
                  <input
                    type="color"
                    value={toColorInputValue(resolvedBorderColor)}
                    onChange={(event) =>
                      onSetWidgetStyle(widgetId, { widgetBorderColor: event.target.value })
                    }
                  />
                </label>

                <label style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  {t("editPanel.widgetTextColor")}
                  <input
                    type="color"
                    value={toColorInputValue(resolvedTextColor)}
                    onChange={(event) =>
                      onSetWidgetStyle(widgetId, { widgetTextColor: event.target.value })
                    }
                  />
                </label>

                <label style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  {t("editPanel.fontSize")}: {resolvedFontSize}px
                  <input
                    type="range"
                    min={10}
                    max={22}
                    step={1}
                    value={resolvedFontSize}
                    onChange={(event) =>
                      onSetWidgetStyle(widgetId, {
                        widgetFontSize: Number(event.target.value),
                      })
                    }
                  />
                </label>

                <label style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  {t("editPanel.widgetBorderWidth")}: {resolvedBorderWidth}px
                  <input
                    type="range"
                    min={0}
                    max={12}
                    step={1}
                    value={resolvedBorderWidth}
                    onChange={(event) =>
                      onSetWidgetStyle(widgetId, {
                        widgetBorderWidth: Number(event.target.value),
                      })
                    }
                  />
                </label>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => onResetWidgetStyle(widgetId)}
                    style={{
                      flex: 1,
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.35)",
                      background: "rgba(255,255,255,0.15)",
                      color: "#fff",
                      cursor: "pointer",
                      padding: "6px 8px",
                      fontSize: 12,
                    }}
                  >
                    {t("editPanel.widgetStyleResetThis")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStyleEditorWidgetId(null)}
                    style={{
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.35)",
                      background: "rgba(255,255,255,0.15)",
                      color: "#fff",
                      cursor: "pointer",
                      padding: "6px 8px",
                      fontSize: 12,
                    }}
                  >
                    {t("editPanel.close")}
                  </button>
                </div>
              </div>
            )}

            {isInteractive && isNewsWidget && newsCountryMenuWidgetId === widgetId && (
              <div
                className="widget-news-country-menu"
                style={{
                  position: "absolute",
                  top: 36,
                  right: 8,
                  zIndex: 20,
                  padding: 8,
                  borderRadius: 12,
                  background: "rgba(15, 23, 42, 0.88)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  backdropFilter: "blur(10px)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: 6,
                }}
              >
                {NEWS_COUNTRY_OPTIONS.map((option) => {
                  const currentCountry =
                    newsCountries[widgetId] ??
                    (() => {
                      try {
                        return localStorage.getItem(getNewsCountryStorageKey(widgetId)) ?? undefined;
                      } catch {
                        return undefined;
                      }
                    })();
                  const isActive = currentCountry === option.code;

                  return (
                    <button
                      key={option.code}
                      type="button"
                      aria-label={option.label}
                      title={option.label}
                      aria-pressed={isActive}
                      onClick={() => {
                        try {
                          localStorage.setItem(getNewsCountryStorageKey(widgetId), option.code);
                        } catch {
                          // ignore
                        }
                        setNewsCountries((prev) => ({ ...prev, [widgetId]: option.code }));
                        window.dispatchEvent(
                          new CustomEvent("panelia:news:country-change", {
                            detail: { widgetId, country: option.code },
                          })
                        );
                        setNewsCountryMenuWidgetId(null);
                      }}
                      style={{
                        width: 34,
                        height: 26,
                        borderRadius: 8,
                        border: isActive
                          ? "1px solid rgba(255,255,255,0.95)"
                          : "1px solid rgba(255,255,255,0.25)",
                        background: isActive
                          ? "rgba(255,255,255,0.24)"
                          : "rgba(255,255,255,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                        cursor: "pointer",
                      }}
                    >
                      <img
                        src={`https://flagcdn.com/w40/${option.code}.png`}
                        alt=""
                        loading="lazy"
                        width={20}
                        height={15}
                        style={{ borderRadius: 2, objectFit: "cover" }}
                      />
                    </button>
                  );
                })}
              </div>
            )}

            <WidgetInstanceProvider widgetId={widgetId}>
                <Component
                config={
                  widgetType === "calendar"
                    ? (calendarWidgetConfig ?? {})
                    : widgetType === "clock"
                      ? { mode: clockMode, showBackground: showClockBackground }
                      : {}
                }
                onConfigChange={() => {}}
                widgetId={widgetId}
                onClose={() => onCloseWidget(widgetId)}
              />
            </WidgetInstanceProvider>
          </div>
        );
        })}
      </GridLayout>
    </div>
  );
}
