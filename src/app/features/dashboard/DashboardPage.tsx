import { useState } from "react";
import { useEffect } from "react";
import AuthMenu from "../../components/authmenu";

import Sidebar from "../../components/sidebar";
import EditPanel from "../../components/editPanel";
import Chat from "../../components/chatUI";
import CalendarWidget from "../Widgets/builtins/CalendarWidget/CalendarWidget";
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
import SearchWidget from "../Widgets/builtins/searchWidget/SearchWidgetUI";
import NewsWidget from "../Widgets/builtins/NewsWidget/NewsWidget";
import WeatherWidget from "../Widgets/builtins/WeatherWidget/WeatherWidgetUI";
import NotesWidget from "../Widgets/builtins/NotesWidget/NotesWidgetUI";
import BookmarkUi from "../Widgets/builtins/BookmarkWidget/BookmarkUi";
import SpotifyWidget from "../Widgets/builtins/SpotifyWidget/SpotifyWidget";

type WidgetSize = "small" | "medium" | "large" | "wide";

const SIZE_MAP = {
  small:  { w: 6,  h: 3 },
  medium: { w: 12, h: 4 },
  large:  { w: 18, h: 8 },
  wide:   { w: 24, h: 4 },
};

export default function DashboardPage() {
  
  const SIDEBAR_WIDTH = 60;
  const [editOpen, setEditOpen] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);

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
    clock: <ClockWidget size="large" />,
    search: <SearchWidget size="large"/>,
    news: <NewsWidget size="large"/>,
    weather: <WeatherWidget size="large"/>,
    Bookmark: <BookmarkUi size="large"/>,
    Notes: <NotesWidget size="large"/>,
    spotify: <SpotifyWidget size="large"/>,
  };

  const [activeWidgets, setActiveWidgets] = useState<string[]>(["clock", "search", "spotify"]);

  const [widgetSizes, setWidgetSizes] = useState<Record<string, WidgetSize>>({
    clock: "medium",
    search: "wide",
    news: "medium",
    weather: "medium",
    Bookmark: "medium",
    Notes: "medium",
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

  // Handle sidebar navigation
  const handleSidebarNavigation = (itemKey: string) => {
    if (itemKey === "calendar") {
      setIsCalendarVisible((prev) => !prev);
    } else if (itemKey === "chat") {
      setIsChatVisible((prev) => !prev);
    }
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
      <Sidebar onSidebarNav={handleSidebarNavigation} onEditClick={() => setEditOpen(prev => !prev)} />
      <div
      style={{
        position: "fixed",
        top: 20,
        right: isCalendarVisible ? 920 : 20,
        zIndex: 1000,
        transition: "right 0.3s ease",
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
          marginRight: isCalendarVisible ? 900 : 0,
          height: "100vh",
          position: "relative",
          transition: "margin-right 0.3s ease",
        }}
      >
        <GridLayout
          className="layout"
          cols={60}
          rowHeight={20}
          width={window.innerWidth - SIDEBAR_WIDTH - (isCalendarVisible ? 900 : 0)}
          isDraggable={true}
          isResizable={true}
          compactType={null}
          preventCollision={false}
          margin={[10, 10]}
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
          right: isCalendarVisible ? 920 : 20,
          padding: "10px 20px",
          fontSize: "16px",
          color: "#fff",
          backgroundColor: "#007BFF",
          border: "none",
          borderRadius: "50px",
          cursor: "pointer",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          transition: "right 0.3s ease",
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
            right: isCalendarVisible ? 920 : 20, //lengde fra høyre kant
            transition: "right 0.3s ease",
          }}
        >
          <Chat />
        </div>
      )}

      {/* Calendar Sidebar */}
      {isCalendarVisible && (
        <CalendarWidget onClose={() => setIsCalendarVisible(false)} />
      )}
    </div>
  );
}
