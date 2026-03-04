
import { useState } from "react";
import { useEffect } from "react";
import AuthMenu from "../../components/authmenu";

import Sidebar from "../../components/sidebar";
import EditPanel from "../../components/editPanel";
import Chat from "../../components/chatUI";
import GridLayout from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// Bakgrunnsbilder for dag/natt
import sol1 from "../../../assets/panelia-bg/Sol 1.png";
import sol2 from "../../../assets/panelia-bg/Sol 2.png";
import sol3 from "../../../assets/panelia-bg/Sol 3.png";
import natt1 from "../../../assets/panelia-bg/Natt 1.png";
import natt2 from "../../../assets/panelia-bg/Natt 2.png";
import natt3 from "../../../assets/panelia-bg/Natt 3.png";

//widgets
import ClockWidget from "../Widgets/builtins/ClockWidget/ClockWidget";
import SearchWidget from "../Widgets/builtins/searchWidget/GoogleSearchWidget";
import NewsWidget from "../Widgets/builtins/NewsWidget/NewsWidget";
import WeatherWidget from "../Widgets/builtins/WeatherWidget/WeatherWidgetUI";
import NotesWidget from "../Widgets/builtins/NotesWidget/NotesWidgetUI";
import BookmarkUi from "../Widgets/builtins/BookmarkWidget/BookmarkUi";
import SpotifyWidget from "../Widgets/builtins/SpotifyWidget/SpotifyWidget";

type WidgetSize = "small" | "medium" | "large" | "wide";

const SIZE_MAP = {
  small:  { w: 2, h: 1 },
  medium: { w: 4, h: 1 },
  large:  { w: 6, h: 2 },
  wide:   { w: 8, h: 1 },
};

export default function DashboardPage() {
  
  const SIDEBAR_WIDTH = 60;
  const [editOpen, setEditOpen] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);

  const AVAILABLE_WIDGETS = [
    { id: "clock", label: "Klokke" },
    { id: "search", label: "Søk" },
    { id: "news", label: "Nyheter" },
    { id: "weather", label: "Vær" },
    { id: "Bookmark", label: "bokmerke" },
    { id: "Notes", label: "notater" },
    { id: "spotify", label: "Spotify" },
  ];

  const WIDGET_COMPONENTS: Record<string, React.ReactNode> = {
    clock: <ClockWidget size="medium" />,
    search: <SearchWidget />,
    news: <NewsWidget />,
    weather: <WeatherWidget />,
    Bookmark: <BookmarkUi />,
    Notes: <NotesWidget />,
    spotify: <SpotifyWidget />,
  };

  const [activeWidgets, setActiveWidgets] = useState<string[]>(["clock", "search", "spotify"]);

  const [widgetSizes, setWidgetSizes] = useState<Record<string, WidgetSize>>({
    clock: "small",
    search: "wide",
    news: "small",
    weather: "small",
    Bookmark: "small",
    Notes: "small",
    spotify: "medium",
  });


  // Natt - Dag oppdatering
    const [, setTime] = useState(new Date());

    useEffect(() => {
      const interval = setInterval(() => {
        setTime(new Date());
      }, 900000); // oppdater hvert 15.minutt

      return () => clearInterval(interval);
    }, []);

  // Funksjon for å toggle chat-vinduet 
  const toggleChat = () => {
    setIsChatVisible((prev) => !prev);
  };

  const getBackgroundByTime = () => {
  const hour = new Date().getHours();

  // DAG
  if (hour >= 6 && hour < 8) return sol1; // Mellom 06:00 og 08:00 her
  if (hour >= 8 && hour < 11) return sol2; // Mellom 08:00 og 11:00 her
  if (hour >= 11 && hour < 17) return sol3; // Mellom 11:00 og 17:00 osv...
  if (hour >= 17 && hour < 20) return sol2;

  // KVELD
  if (hour >= 20 && hour < 23) return natt1;

  // NATT
  if (hour >= 23 || hour < 2) return natt2;
  if (hour >= 2 && hour < 3) return natt3;
  if (hour >= 3 && hour < 5) return natt2;
  if (hour >= 5 && hour < 6) return natt1;

  return sol1;
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        backgroundImage: `url(${getBackgroundByTime()})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Sidebar onEditClick={() => setEditOpen(prev => !prev)} />
      <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 1000,
      }}
    >
      <AuthMenu />
    </div>

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
          height: "100vh",
          position: "relative"
        }}
      >
        <GridLayout
          className="layout"
          cols={20}
          rowHeight={50}
          width={window.innerWidth - SIDEBAR_WIDTH}
          isDraggable={true}
          isResizable={true}
          margin={[20, 8]}
          containerPadding={[20, 20]}
          style={{ minHeight: "100%" }}
        >
          {activeWidgets.map((widgetId, index) => {

            const size = SIZE_MAP[widgetSizes[widgetId] || "medium"];

            return (
              <div
                key={widgetId}
                data-grid={{
                  ...size,
                  x: Math.floor((20 - size.w) / 2),
                  y: index * size.h,
                }}
              >
                {WIDGET_COMPONENTS[widgetId]}
              </div>
            );
          })}
        </GridLayout>
      </main>
            {/* Chat Toggle Button */}
            <button
        onClick={toggleChat}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          padding: "10px 20px",
          fontSize: "16px",
          color: "#fff",
          backgroundColor: "#007BFF",
          border: "none",
          borderRadius: "50px",
          cursor: "pointer",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        {isChatVisible ? "Close Chat" : "Open Chat"}
      </button>

      {/* Chat Window */}
      {isChatVisible && (
        <div
          style={{
            position: "fixed",
            bottom: 80, //høyde fra bunn av skjermen
            right: 20, //lengde fra høyre kant
          }}
        >
          <Chat />
        </div>
      )}
    </div>
  );
}