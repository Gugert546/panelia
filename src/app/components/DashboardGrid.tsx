import GridLayout from "react-grid-layout/legacy";
import { WIDGETS } from "../features/Widgets/registry/WidgetRegistry";

type Props = {
  activeWidgets: string[];
  sidebarWidth: number;
};

export default function DashboardGrid({
  activeWidgets,
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
      autoSize={false}
      style={{ height: "100%" }}
    >
      {activeWidgets.map((widgetId, index) => {

        const widget = WIDGETS[widgetId as keyof typeof WIDGETS];

        if (!widget) return null;

        const Component = widget.Component;

        return (
          <div
            key={widgetId}
            data-grid={{
              ...widget.defaultGrid,
              x: (index * 4) % 20,
              y: Math.floor(index / 5) * widget.defaultGrid.h
            }}
          >
            <Component config={{}} onConfigChange={() => {}} />
          </div>
        );
      })}
    </GridLayout>
  );
}