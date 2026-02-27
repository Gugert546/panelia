import { useState } from "react";
import Sidebar from "../../components/sidebar";
import EditPanel from "../../components/editPanel";
import bg from "../../../assets/sol.png";

import RGL from "react-grid-layout";
import type { LayoutItem } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const GridLayout = RGL as unknown as React.FC<any>;

// Widget imports
import ClockWidget from "../Widgets/builtins/ClockWidget/ClockWidget";
import SearchWidget from "../Widgets/builtins/searchWidget/GoogleSearchWidget";
import NewsWidget from "../Widgets/builtins/NewsWidget/NewsWidget";
import WeatherWidget from "../Widgets/builtins/WeatherWidget/WeatherWidgetUI";

export default function DashboardPage() {

  const SIDEBAR_WIDTH = 86;
  const [editOpen, setEditOpen] = useState(false);

  const AVAILABLE_WIDGETS = [
    { id: "clock", label: "Klokke" },
    { id: "search", label: "Søk" },
    { id: "news", label: "Nyheter" },
    { id: "weather", label: "Vær" },
  ];

  const WIDGET_COMPONENTS: Record<string, React.ReactNode> = {
    clock: <ClockWidget />,
    search: <SearchWidget />,
    news: <NewsWidget />,
    weather: <WeatherWidget />,
  };

  const [activeWidgets, setActiveWidgets] = useState<string[]>(["clock", "search"]);

  // Midtstilt vertikal stack
  const generateLayout = (widgets: string[]): LayoutItem[] => {
    return widgets.map((id, index) => ({
      i: id,
      x: 10,
      y: index * 4,
      w: 4,
      h: 4,
      static: true
    }));
  };

  const gridWidth = window.innerWidth - SIDEBAR_WIDTH;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Sidebar onEditClick={() => setEditOpen(prev => !prev)} />

      <EditPanel
        open={editOpen}
        onClose={() => setEditOpen(false)}
        availableWidgets={AVAILABLE_WIDGETS}
        activeWidgets={activeWidgets}
        toggleWidget={(id) => {
          setActiveWidgets(prev =>
            prev.includes(id)
              ? prev.filter(w => w !== id)
              : [...prev, id]
          );
        }}
      />

      <main
        style={{
          marginLeft: SIDEBAR_WIDTH,
          height: "100%",
          paddingTop: 120,
        }}
      >
        <div style={{ width: gridWidth }}>
          <GridLayout
            layout={generateLayout(activeWidgets)}
            cols={24}
            rowHeight={30}
            width={gridWidth}
            margin={[10, 10]}
            isDraggable={false}
            isResizable={false}
            compactType={null}
            preventCollision={true}
          >
            {activeWidgets.map(widgetId => (
              <div key={widgetId}>
                {WIDGET_COMPONENTS[widgetId]}
              </div>
            ))}
          </GridLayout>
        </div>
      </main>
    </div>
  );
}