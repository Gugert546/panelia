import { useState } from "react";
import { useEffect } from "react";
import AuthMenu from "../../components/authmenu";

import Sidebar from "../../components/sidebar";
import EditPanel from "../../components/editPanel";
import Chat from "../../components/chatUI";
import CalendarWidget, { type CalendarWidgetSizeMode } from "../Widgets/builtins/CalendarWidget/CalendarWidget";
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
import { auth } from "../../../lib/firebase/client";

type WidgetSize = "small" | "medium" | "large" | "wide";
type CalendarConnectionStatus = "loading" | "connected" | "disconnected";

const SIZE_MAP = {
  small:  { w: 4,  h: 2 },
  medium: { w: 9,  h: 5 },
  large:  { w: 13, h: 6 },
  wide:   { w: 18, h: 3 },
};

export default function DashboardPage() {
  
  const SIDEBAR_WIDTH = 60;
  const [editOpen, setEditOpen] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [calendarConnectionStatus, setCalendarConnectionStatus] = useState<CalendarConnectionStatus>("loading");
  const [calendarConnectionBusy, setCalendarConnectionBusy] = useState(false);
  const [calendarRefreshBusy, setCalendarRefreshBusy] = useState(false);
  const [calendarSizeMode, setCalendarSizeMode] = useState<CalendarWidgetSizeMode>("xlarge");


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
    clock: <ClockWidget size="small" />,
    search: <SearchWidget size="medium"/>,
    news: <NewsWidget size="large"/>,
    weather: <WeatherWidget size="large"/>,
    Bookmark: <BookmarkUi size="small"/>,
    Notes: <NotesWidget size="small"/>,
    spotify: <SpotifyWidget size="small"/>,
  };

  const [activeWidgets, setActiveWidgets] = useState<string[]>(["clock", "search", "spotify"]);

  const [widgetSizes, setWidgetSizes] = useState<Record<string, WidgetSize>>({
    clock: "small",
    search: "small",
    news: "medium",
    weather: "small",
    Bookmark: "medium",
    Notes: "small",
    spotify: "small",
  });


  // Natt - Dag oppdatering
    const [, setTime] = useState(new Date());

    useEffect(() => {
      const interval = setInterval(() => {
        setTime(new Date());
      }, 900000); // oppdater hvert 15.minutt

      return () => clearInterval(interval);
    }, []);

  useEffect(() => {
    if (!isCalendarVisible) return;

    let cancelled = false;

    const fetchCalendarStatus = async () => {
      const user = auth.currentUser;
      if (!user) {
        if (!cancelled) setCalendarConnectionStatus("disconnected");
        return;
      }

      if (!cancelled) setCalendarConnectionStatus("loading");

      try {
        const idToken = await user.getIdToken();
        const response = await fetch("/api/google-calendar/status", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          if (!cancelled) setCalendarConnectionStatus("disconnected");
          return;
        }

        const payload = (await response.json()) as { connected?: boolean };
        if (!cancelled) setCalendarConnectionStatus(payload.connected ? "connected" : "disconnected");
      } catch {
        if (!cancelled) setCalendarConnectionStatus("disconnected");
      }
    };

    void fetchCalendarStatus();

    return () => {
      cancelled = true;
    };
  }, [isCalendarVisible]);


  useEffect(() => {
    const url = new URL(window.location.href);
    const oauthResult = url.searchParams.get("calendar_oauth");

    if (!oauthResult) return;

    let cancelled = false;

    const refreshStatusAfterOAuth = async () => {
      const user = auth.currentUser;
      if (!user) {
        if (!cancelled) setCalendarConnectionStatus("disconnected");
        return;
      }

      if (!cancelled) setCalendarConnectionStatus("loading");

      try {
        const idToken = await user.getIdToken();
        const response = await fetch("/api/google-calendar/status", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          if (!cancelled) setCalendarConnectionStatus("disconnected");
          return;
        }

        const payload = (await response.json()) as { connected?: boolean };
        if (!cancelled) setCalendarConnectionStatus(payload.connected ? "connected" : "disconnected");
      } catch {
        if (!cancelled) setCalendarConnectionStatus("disconnected");
      }
    };

    void refreshStatusAfterOAuth();

    url.searchParams.delete("calendar_oauth");
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, "", nextUrl);

    return () => {
      cancelled = true;
    };
  }, []);

  const pullFromGoogleCalendar = async (showAlertOnError = false) => {
    if (calendarConnectionStatus !== "connected") return false;

    const user = auth.currentUser;
    if (!user) return false;

    setCalendarRefreshBusy(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/google-calendar/sync/pull", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ maxResults: 500 }),
      });

      if (!response.ok) {
        if (showAlertOnError) {
          window.alert("Failed to refresh events from Google Calendar.");
        }
        return false;
      }

      return true;
    } catch {
      if (showAlertOnError) {
        window.alert("Failed to refresh events from Google Calendar.");
      }
      return false;
    } finally {
      setCalendarRefreshBusy(false);
    }
  };

  useEffect(() => {
    if (!isCalendarVisible) return;
    if (calendarConnectionStatus !== "connected") return;
    if (calendarRefreshBusy) return;

    void pullFromGoogleCalendar(false);

    const interval = setInterval(() => {
      void pullFromGoogleCalendar(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [isCalendarVisible, calendarConnectionStatus]);

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
        right: 20,
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
          marginRight: 0,
          width: window.innerWidth - SIDEBAR_WIDTH,
          height: "100vh",
          position: "relative",
          transition: "none",
        }}
      >
        <GridLayout
          className="layout"
          cols={20}
          rowHeight={50}
          width={window.innerWidth - SIDEBAR_WIDTH}
          isDraggable={true}
          isResizable={true}
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
            right: 20, //lengde fra høyre kant
            transition: "right 0.3s ease",
          }}
        >
          <Chat />
        </div>
      )}

      {/* Calendar Sidebar */}
      {isCalendarVisible && (
        <CalendarWidget
          onClose={() => setIsCalendarVisible(false)}
          leftOffset={SIDEBAR_WIDTH + 20}
          calendarConnectionStatus={calendarConnectionStatus}
          calendarConnectionBusy={calendarConnectionBusy}
          calendarRefreshBusy={calendarRefreshBusy}
          sizeMode={calendarSizeMode}
          onSizeModeChange={setCalendarSizeMode}
          onConnectCalendar={async () => {
            const user = auth.currentUser;
            if (!user) {
              window.alert("Please sign in before connecting Google Calendar.");
              return;
            }

            setCalendarConnectionBusy(true);
            try {
              const idToken = await user.getIdToken();
              const returnTo = window.location.href;

              const response = await fetch("/api/google-calendar/connect-url", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ returnTo }),
              });

              if (!response.ok) {
                let details = "";
                try {
                  const errorPayload = (await response.json()) as { error?: string };
                  if (errorPayload?.error) details = ` (${errorPayload.error})`;
                } catch {
                  // ignore parse failures
                }
                window.alert(`Failed to start Google Calendar OAuth.${details}`);
                setCalendarConnectionBusy(false);
                return;
              }

              const payload = (await response.json()) as { url?: string };
              if (!payload.url) {
                window.alert("OAuth URL missing from server response.");
                setCalendarConnectionBusy(false);
                return;
              }

              window.location.href = payload.url;
            } catch {
              window.alert("Failed to start Google Calendar OAuth.");
              setCalendarConnectionBusy(false);
            }
          }}
          onDisconnectCalendar={async () => {
            const user = auth.currentUser;
            if (!user) {
              setCalendarConnectionStatus("disconnected");
              return;
            }

            setCalendarConnectionBusy(true);
            try {
              const idToken = await user.getIdToken();
              const response = await fetch("/api/google-calendar/disconnect", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${idToken}`,
                },
              });

              if (!response.ok) {
                window.alert("Failed to disconnect Google Calendar.");
                return;
              }

              setCalendarConnectionStatus("disconnected");
            } catch {
              window.alert("Failed to disconnect Google Calendar.");
            } finally {
              setCalendarConnectionBusy(false);
            }
          }}
          onRefreshCalendar={async () => {
            if (calendarConnectionStatus !== "connected") {
              window.alert("Connect Google Calendar before refreshing.");
              return;
            }

            const user = auth.currentUser;
            if (!user) {
              window.alert("Please sign in before refreshing Google Calendar.");
              return;
            }

            await pullFromGoogleCalendar(true);
          }}
        />
      )}
    </div>
  );
}
