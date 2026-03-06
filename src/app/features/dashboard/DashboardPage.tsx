import { useState, useEffect } from "react";
import AuthMenu from "../../components/authmenu";

import Sidebar from "../../components/sidebar";
import EditPanel from "../../components/editPanel";
import Chat from "../../components/chatUI";

import CalendarWidget, {
  type CalendarWidgetSizeMode,
} from "../Widgets/builtins/CalendarWidget/CalendarWidget";

import DashboardGrid from "../../components/DashboardGrid";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// bakgrunn
import { getBackgroundByTime } from "./hooks/getBackgroundByTime";

// widgets
import ClockWidget from "../Widgets/builtins/ClockWidget/ClockWidget";
import SearchWidget from "../Widgets/builtins/searchWidget/SearchWidgetUI";
import NewsWidget from "../Widgets/builtins/NewsWidget/NewsWidget";
import WeatherWidget from "../Widgets/builtins/WeatherWidget/WeatherWidgetUI";
import NotesWidget from "../Widgets/builtins/NotesWidget/NotesWidgetUI";
import BookmarkUi from "../Widgets/builtins/BookmarkWidget/BookmarkUi";
import SpotifyWidget from "../Widgets/builtins/SpotifyWidget/SpotifyWidget";

import { auth } from "../../../lib/firebase/client";

// widget hook
import {
  useWidgets,
  AVAILABLE_WIDGETS,
} from "./hooks/useWidgets";

type CalendarConnectionStatus = "loading" | "connected" | "disconnected";

export default function DashboardPage() {

  const SIDEBAR_WIDTH = 60;

  const [editOpen, setEditOpen] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);

  const [calendarConnectionStatus, setCalendarConnectionStatus] =
    useState<CalendarConnectionStatus>("loading");

  const [calendarConnectionBusy, setCalendarConnectionBusy] =
    useState(false);

  const [calendarRefreshBusy, setCalendarRefreshBusy] =
    useState(false);

  const [calendarSizeMode, setCalendarSizeMode] =
    useState<CalendarWidgetSizeMode>("xlarge");

  // widget system
  const {
    activeWidgets,
    widgetSizes,
    setWidgetSizes,
    toggleWidget,
  } = useWidgets();

  // widget components
  const WIDGET_COMPONENTS: Record<string, React.ReactNode> = {
    clock: <ClockWidget size="small" />,
    search: <SearchWidget size="medium" />,
    news: <NewsWidget size="large" />,
    weather: <WeatherWidget size="large" />,
    Bookmark: <BookmarkUi size="small" />,
    Notes: <NotesWidget size="small" />,
    spotify: <SpotifyWidget size="small" />,
  };

  // Natt / Dag refresh
  const [, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 900000);

    return () => clearInterval(interval);
  }, []);

  // Kalender status
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

        const payload = await response.json();

        if (!cancelled) {
          setCalendarConnectionStatus(
            payload.connected ? "connected" : "disconnected"
          );
        }

      } catch {

        if (!cancelled) setCalendarConnectionStatus("disconnected");

      }
    };

    void fetchCalendarStatus();

    return () => {
      cancelled = true;
    };

  }, [isCalendarVisible]);

  // OAuth refresh
  useEffect(() => {

    const url = new URL(window.location.href);
    const oauthResult = url.searchParams.get("calendar_oauth");

    if (!oauthResult) return;

    url.searchParams.delete("calendar_oauth");

    window.history.replaceState(
      {},
      "",
      `${url.pathname}${url.search}${url.hash}`
    );

  }, []);

  // Pull Google events
  const pullFromGoogleCalendar = async (showAlert = false) => {

    if (calendarConnectionStatus !== "connected") return;

    const user = auth.currentUser;

    if (!user) return;

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

      if (!response.ok && showAlert) {
        window.alert("Failed to refresh events from Google Calendar.");
      }

    } catch {

      if (showAlert) {
        window.alert("Failed to refresh events from Google Calendar.");
      }

    } finally {

      setCalendarRefreshBusy(false);

    }
  };

  // Poll calendar
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

  // chat toggle
  const toggleChat = () => {
    setIsChatVisible((prev) => !prev);
  };

  // sidebar nav
  const handleSidebarNavigation = (itemKey: string) => {

    if (itemKey === "calendar") {
      setIsCalendarVisible((prev) => !prev);
    }

    if (itemKey === "chat") {
      setIsChatVisible((prev) => !prev);
    }

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

      <Sidebar
        onSidebarNav={handleSidebarNavigation}
        onEditClick={() => setEditOpen((prev) => !prev)}
      />

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
        toggleWidget={toggleWidget}
      />

      <main
        style={{
          marginLeft: SIDEBAR_WIDTH,
          width: window.innerWidth - SIDEBAR_WIDTH,
          height: "100vh",
          position: "relative",
        }}
      >

        <DashboardGrid
          activeWidgets={activeWidgets}
          widgetSizes={widgetSizes}
          widgetComponents={WIDGET_COMPONENTS}
          sidebarWidth={SIDEBAR_WIDTH}
        />

      </main>

      <button
        onClick={toggleChat}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          padding: "10px 20px",
          borderRadius: "50px",
        }}
      >
        {isChatVisible ? "Close Chat" : "Open Chat"}
      </button>

      {isChatVisible && (
        <div
          style={{
            position: "fixed",
            bottom: 80,
            right: 20,
          }}
        >
          <Chat />
        </div>
      )}

      {isCalendarVisible && (
        <CalendarWidget
          onClose={() => setIsCalendarVisible(false)}
          leftOffset={SIDEBAR_WIDTH + 20}
          calendarConnectionStatus={calendarConnectionStatus}
          calendarConnectionBusy={calendarConnectionBusy}
          calendarRefreshBusy={calendarRefreshBusy}
          sizeMode={calendarSizeMode}
          onSizeModeChange={setCalendarSizeMode}
          onRefreshCalendar={() => pullFromGoogleCalendar(true)}
        />
      )}
    </div>
  );
}