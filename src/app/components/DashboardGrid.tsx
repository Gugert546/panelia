import { useState } from "react";
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
  widgetStyles: Record<string, WidgetStyleOverrides>;
  widgetSurfaceColor: string;
  widgetBorderColor: string;
  widgetTextColor: string;
  widgetBorderWidth: number;
  onLayoutChange: (layouts: Record<string, { x: number; y: number; w: number; h: number }>) => void;
  onCloseWidget: (widgetId: string) => void;
  onToggleWidgetLock: (widgetId: string) => void;
  onToggleClockMode: (widgetId: string) => void;
  onSetWidgetStyle: (widgetId: string, patch: WidgetStyleOverrides) => void;
  onResetWidgetStyle: (widgetId: string) => void;
  containerWidth?: number;
  isInteractive?: boolean;
  isMovable?: boolean;
  calendarWidgetConfig?: Record<string, unknown>;
};

const BASE_GRID_COLUMNS = 40;
const GRID_ROW_HEIGHT = 30;
const GRID_MIN_WIDTH = 320;

function resolveGridColumns(width: number) {
  if (width >= 1500) return 40;
  if (width >= 1200) return 32;
  if (width >= 900) return 24;
  if (width >= 700) return 18;
  return 12;
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

export default function DashboardGrid({
  activeWidgets,
  layouts,
  widgetLocks,
  clockModes,
  widgetStyles,
  widgetSurfaceColor,
  widgetBorderColor,
  widgetTextColor,
  widgetBorderWidth,
  onLayoutChange,
  onCloseWidget,
  onToggleWidgetLock,
  onToggleClockMode,
  onSetWidgetStyle,
  onResetWidgetStyle,
  containerWidth,
  isInteractive = true,
  isMovable = isInteractive,
  calendarWidgetConfig
}: Props) {
  const [hoveredWidgetId, setHoveredWidgetId] = useState<string | null>(null);
  const [styleEditorWidgetId, setStyleEditorWidgetId] = useState<string | null>(null);
  const { t } = useLanguage();
  const { fontSize: globalFontSize } = useFontSize();

  const fallbackWidth = typeof window === "undefined" ? 1200 : window.innerWidth;
  const resolvedContainerWidth =
    typeof containerWidth === "number" && Number.isFinite(containerWidth)
      ? containerWidth
      : fallbackWidth;
  const gridWidth = Math.max(GRID_MIN_WIDTH, resolvedContainerWidth);

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

  const handleLayoutChange = (newLayout: Layout) => {
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
    <div style={{ width: "100%", height: "100%", display: "flex", justifyContent: "flex-start" }}>
      <GridLayout
        className="layout"
        layout={computedLayout}
        cols={activeGridColumns}
        rowHeight={GRID_ROW_HEIGHT}
        width={gridWidth}
        isDraggable={isMovable}
        isResizable={isMovable}
        draggableCancel="input,button,select,option,textarea,label,[role='button'],[contenteditable='true'],.widget-lock-btn,.widget-clock-mode-btn,.widget-style-btn,.widget-style-control"
        compactType={null}
        preventCollision={true}
        margin={[0, 0]}
        maxRows={40}
        containerPadding={[0, 0]}
        autoSize={false}
        style={{ height: "100%" }}
        onLayoutChange={handleLayoutChange}
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
        const clockMode = clockModes[widgetId] ?? "digital";
        const isStyleEditorOpen = styleEditorWidgetId === widgetId;
        return (
          <div
            key={widgetId}
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
              zIndex: isStyleEditorOpen ? 50 : hoveredWidgetId === widgetId ? 10 : 1,
            }}
            onMouseEnter={() => setHoveredWidgetId(widgetId)}
            onMouseLeave={() => setHoveredWidgetId((prev) => (prev === widgetId ? null : prev))}
          >
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

            <WidgetInstanceProvider widgetId={widgetId}>
              <Component
                config={
                  widgetType === "calendar"
                    ? (calendarWidgetConfig ?? {})
                    : widgetType === "clock"
                      ? { mode: clockMode }
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
