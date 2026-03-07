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
      style={{ height: "100%" }}
    >
      {activeWidgets.map((widgetId) => {

        const widget = WIDGETS[widgetId as keyof typeof WIDGETS];

        const Component = widget.Component;

        return (
          <div
            key={widgetId}
            data-grid={{
              ...widget.defaultGrid,
              x: 0,
              y: Infinity
            }}
          >
            <Component config={{}} onConfigChange={() => {}} />
          </div>
        );
      })}
    </GridLayout>
  );
}