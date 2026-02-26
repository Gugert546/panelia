import { useState } from "react";
import Sidebar from "../../components/sidebar";
import EditPanel from "../../components/editPanel";
import bg from "../../../assets/sol.png";

// Widget imports

import ClockWidget from "../Widgets/builtins/ClockWidget/ClockWidget";
import SearchWidget from "../Widgets/builtins/searchWidget/GoogleSearchWidget";
import NewsWidget from "../Widgets/builtins/NewsWidget/NewsWidget";
import WeatherWidget from "../Widgets/builtins/WeatherWidget/WeatherWidgetUI";
//import NotesWidget from "../Widgets/builtins/NotesWidget/NotesWidget";



export default function DashboardPage() {

  const SIDEBAR_WIDTH = 86;

  const [editOpen, setEditOpen] = useState(false);

  // Liste over tilgjengelige widgets
  const AVAILABLE_WIDGETS = [
    { id: "clock", label: "Klokke" },
    { id: "search", label: "Søk" },
    { id: "news", label: "Nyheter" },
    { id: "weather", label: "Vær" },
    //{ id: "notes", label: "Notater" }
  ];
  
  const WIDGET_COMPONENTS: Record<string, React.ReactNode> = {
    clock: <ClockWidget />,
    search: <SearchWidget />,
    news: <NewsWidget />,
    weather: <WeatherWidget />,
    //notes: <NotesWidget />
  };


  // Hvilke widgets er aktive på siden
  const [activeWidgets, setActiveWidgets] = useState<string[]>(["clock", "search"]); // Starter med disse 2 aktive

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
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          paddingTop: 220,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            alignItems: "center",
          }}
        >
          {activeWidgets.map(widgetId => (
            <div key={widgetId}>
              {WIDGET_COMPONENTS[widgetId]}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}