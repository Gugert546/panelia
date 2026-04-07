import { useState } from "react";
import GridLayout from "react-grid-layout/legacy";
import type { Layout } from "react-grid-layout";
import { WIDGETS } from "../features/Widgets/registry/WidgetRegistry";

type Props = {
  activeWidgets: string[];
  layouts: Record<string, { x: number; y: number; w: number; h: number }>;
  widgetLocks: Record<string, boolean>;
  onLayoutChange: (layouts: Record<string, { x: number; y: number; w: number; h: number }>) => void;
  onCloseWidget: (widgetId: string) => void;
  onToggleWidgetLock: (widgetId: string) => void;
  sidebarWidth: number;
  calendarWidgetConfig?: Record<string, unknown>;
};

function getWidgetType(widgetId: string) {
  const separatorIndex = widgetId.indexOf(":");
  if (separatorIndex === -1) return widgetId;
  return widgetId.slice(0, separatorIndex);
}

export default function DashboardGrid({
  activeWidgets,
  layouts,
  widgetLocks,
  onLayoutChange,
  onCloseWidget,
  onToggleWidgetLock,
  sidebarWidth,
  calendarWidgetConfig
}: Props) {
  const [hoveredWidgetId, setHoveredWidgetId] = useState<string | null>(null);

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

      return {
        i: widgetId,
        x: currentLayout.x ?? (index * 4) % 20,
        y: currentLayout.y ?? Math.floor(index / 5) * widget.defaultGrid.h,
        w: currentLayout.w,
        h: currentLayout.h,
        minW: baseGrid.w,
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

      newLayouts[item.i] = {
        x: item.x,
        y: item.y,
        
        // Clamp to widget minimums so users can’t resize smaller than starting size
        w: baseGrid ? Math.max(item.w, baseGrid.w) : item.w,
        h: baseGrid ? Math.max(item.h, baseGrid.h) : item.h,
      };
    });

    onLayoutChange(newLayouts);
  };

  return (
    <GridLayout
      className="layout"
      layout={computedLayout}
      cols={40}          // Mer columns --> Finere horisontal kontroll
      rowHeight={30}    // Mindre rowHeight --> Mer vertikal kontroll og flere rader tilgjengelig
      width={window.innerWidth - sidebarWidth}
      isDraggable
      isResizable
      draggableCancel="input,button,select,option,textarea,label,[role='button'],[contenteditable='true'],.widget-lock-btn"
      compactType={null}
      preventCollision={true}  // blokkerer auto-flytting av andre widgets ved hover / drag
      margin={[0, 0]}    
      maxRows={40}      // tillatter flere rader for å unngå at widgets blir presset sammen vertikalt
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

        type SafeLayout = { x?: number; y?: number; w: number; h: number };
        const currentLayout: SafeLayout = storedLayout
          ? {
              ...storedLayout,
              // Ensure persisted layouts never shrink below the widget's default size
              w: Math.max(storedLayout.w, baseGrid.w),
              h: Math.max(storedLayout.h, baseGrid.h),
            }
          : baseGrid;
        return (
          <div
            key={widgetId}
            data-grid={{
              ...currentLayout,
              x: currentLayout.x !== undefined ? currentLayout.x : (index * 4) % 20,
              y: currentLayout.y !== undefined ? currentLayout.y : Math.floor(index / 5) * widget.defaultGrid.h,
              minW: baseGrid.w,
              minH: baseGrid.h,
              static: isLocked,
            }}
            style={{ position: "relative" }}
            onMouseEnter={() => setHoveredWidgetId(widgetId)}
            onMouseLeave={() => setHoveredWidgetId((prev) => (prev === widgetId ? null : prev))}
          >
            {hoveredWidgetId === widgetId && (
              <button
                type="button"
                className="widget-lock-btn"
                aria-label={isLocked ? "Unlock widget" : "Lock widget"}
                title={isLocked ? "Unlock widget" : "Lock widget"}
                onClick={() => onToggleWidgetLock(widgetId)}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.35)",
                  background: isLocked
                    ? "rgba(32, 32, 32, 0.75)"
                    : "rgba(255,255,255,0.22)",
                  backdropFilter: "blur(6px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  zIndex: 2,
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
            )}
            <Component
              config={widgetType === "calendar" ? (calendarWidgetConfig ?? {}) : {}}
              onConfigChange={() => {}}
              widgetId={widgetId}
              onClose={() => onCloseWidget(widgetId)}
            />
          </div>
        );
      })}
    </GridLayout>
  );
}