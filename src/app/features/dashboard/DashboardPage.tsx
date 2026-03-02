import { useState } from "react";
import Sidebar from "../../components/sidebar";
import EditPanel from "../../components/editPanel";
import bg from "../../../assets/sol.png";

import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import ClockWidget from "../Widgets/builtins/ClockWidget/ClockWidget";
import SearchWidget from "../Widgets/builtins/searchWidget/GoogleSearchWidget";
import NewsWidget from "../Widgets/builtins/NewsWidget/NewsWidget";
import WeatherWidget from "../Widgets/builtins/WeatherWidget/WeatherWidgetUI";

type WidgetSize = "small" | "medium" | "large" | "wide";

const SIZE_MAP = {
  small:  { w: 2, h: 1 },
  medium: { w: 4, h: 1 },
  large:  { w: 6, h: 2 },
  wide:   { w: 8, h: 1 },
};

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

  const [widgetSizes, setWidgetSizes] = useState<Record<string, WidgetSize>>({
    clock: "small",
    search: "wide",
    news: "medium",
    weather: "small",
  });

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
        widgetSizes={widgetSizes}
        setWidgetSizes={setWidgetSizes}
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
          paddingTop: 220,
        }}
      >
        <GridLayout
          className="layout"
          cols={12}
          rowHeight={90}
          width={window.innerWidth - SIDEBAR_WIDTH}
          isDraggable={false}
          isResizable={false}
          margin={[20, 8]}
          containerPadding={[20, 20]}
        >
          {activeWidgets.map((widgetId, index) => {

            const size = SIZE_MAP[widgetSizes[widgetId] || "medium"];

            return (
              <div
                key={widgetId}
                data-grid={{
                  ...size,
                  x: Math.floor((12 - size.w) / 2),
                  y: index * size.h,
                }}
              >
                {WIDGET_COMPONENTS[widgetId]}
              </div>
            );
          })}
        </GridLayout>
      </main>
    </div>
  );
}