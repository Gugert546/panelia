import GridLayout from "react-grid-layout/legacy";
import type { Layout } from "react-grid-layout";
import { WIDGETS } from "../features/Widgets/registry/WidgetRegistry";

type Props = {
  activeWidgets: string[];
  layouts: Record<string, { x: number; y: number; w: number; h: number }>;
  onLayoutChange: (layouts: Record<string, { x: number; y: number; w: number; h: number }>) => void;
  onCloseWidget: (widgetId: string) => void;
  sidebarWidth: number;
};

function getWidgetType(widgetId: string) {
  const separatorIndex = widgetId.indexOf(":");
  if (separatorIndex === -1) return widgetId;
  return widgetId.slice(0, separatorIndex);
}

export default function DashboardGrid({
  activeWidgets,
  layouts,
  onLayoutChange,
  onCloseWidget,
  sidebarWidth
}: Props) {

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
      cols={20}
      rowHeight={50}
      width={window.innerWidth - sidebarWidth}
      isDraggable
      isResizable
      compactType={null}
      preventCollision={false}
      margin={[10, 10]}
      maxRows={22}
      containerPadding={[20, 20]}
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
            }}
          >
            <Component
              config={{}}
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