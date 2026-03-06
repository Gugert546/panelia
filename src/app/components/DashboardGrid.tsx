import GridLayout from "react-grid-layout/legacy";
import { SIZE_MAP, type WidgetSize } from "../features/dashboard/hooks/useWidgets";


type Props = {
  activeWidgets: string[];
  widgetSizes: Record<string, WidgetSize>;
  widgetComponents: Record<string, React.ReactNode>;
  sidebarWidth: number;
};

export default function DashboardGrid({
  activeWidgets,
  widgetSizes,
  widgetComponents,
  sidebarWidth
}: Props) {

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
      style={{ height: "100%" }}
    >
      {activeWidgets.map((widgetId, index) => {

        const size = SIZE_MAP[widgetSizes[widgetId] || "medium"];

        return (
          <div
            key={widgetId}
            data-grid={{
              ...size,
              x: Math.floor((20 - size.w) / 2),
              y: index * size.h
            }}
          >
            {widgetComponents[widgetId]}
          </div>
        );
      })}
    </GridLayout>
  );
}