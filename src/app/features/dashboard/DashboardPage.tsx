import { useState, useEffect, useRef } from "react";
import AuthMenu from "../../components/authmenu";
import Sidebar from "../../components/sidebar";
import EditPanel, { type EditPanelHandle } from "../../components/editPanel";
import AiChatPanel, { type AiChatPanelHandle } from "../../components/AiChatPanel";
import { AiChatProvider } from "../../components/aiChatContext";

import CalendarWidget from "../Widgets/builtins/CalendarWidget/CalendarWidget";
import type { CalendarWidgetHandle } from "../Widgets/builtins/CalendarWidget/CalendarWidget";

import DashboardGrid from "../../components/DashboardGrid";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { auth } from "../../../lib/firebase/client";
import type {
  CustomBackgroundMediaType,
  DashboardBackgroundId,
} from "./hooks/useWidgetsState";
import { getBackgroundByTime } from "./hooks/getBackgroundByTime";
import sol1 from "../../../assets/panelia-bg/Sol 1.png";
import sol2 from "../../../assets/panelia-bg/Sol 2.png";
import sol3 from "../../../assets/panelia-bg/Sol 3.png";
import natt1 from "../../../assets/panelia-bg/Natt 1.png";
import natt2 from "../../../assets/panelia-bg/Natt 2.png";
import natt3 from "../../../assets/panelia-bg/Natt 3.png";

import {
  AVAILABLE_WIDGETS,
} from "./hooks/useWidgets";

import { WidgetsProvider, useWidgets } from "./hooks/WidgetsContext";
import { useLanguage } from "../../providers/languageProvider";
import { useAuth } from "../auth/useAuth";

type CalendarConnectionStatus = "loading" | "connected" | "disconnected";
type ActivePanel = "edit" | "calendar" | "chat" | null;

function resolveDashboardBackground(
  backgroundId: DashboardBackgroundId
) {
  if (backgroundId === "defaultbg") {
    return resolveDashboardBackground(getBackgroundByTime());
  }

  if (backgroundId === "sol1") return sol1;
  if (backgroundId === "sol2") return sol2;
  if (backgroundId === "sol3") return sol3;
  if (backgroundId === "natt1") return natt1;
  if (backgroundId === "natt2") return natt2;
  if (backgroundId === "natt3") return natt3;

  // Animated backgrounds render as CSS overlays, keep an image fallback below.
  if (backgroundId === "customMedia") {
    return sol1;
  }

  return sol1;
}

function getVideoBackgroundSource(
  backgroundId: DashboardBackgroundId,
  customBackgroundUrl: string,
  customBackgroundType: CustomBackgroundMediaType
) {
  if (backgroundId === "customMedia" && customBackgroundType === "video") {
    return customBackgroundUrl || null;
  }
  return null;
}

function getImageBackgroundSource(
  backgroundId: DashboardBackgroundId,
  customBackgroundUrl: string,
  customBackgroundType: CustomBackgroundMediaType
) {
  if (backgroundId === "customMedia" && customBackgroundType === "image") {
    return customBackgroundUrl || null;
  }
  return resolveDashboardBackground(backgroundId);
}

function DashboardPageContent() {
  const SIDEBAR_WIDTH = 86;
  const editPanelRef = useRef<EditPanelHandle | null>(null);
  const calendarPanelRef = useRef<CalendarWidgetHandle | null>(null);
  const chatPanelRef = useRef<AiChatPanelHandle | null>(null);

  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  const [calendarConnectionStatus, setCalendarConnectionStatus] =
    useState<CalendarConnectionStatus>("loading");

  const [calendarConnectionBusy, setCalendarConnectionBusy] = useState(false);
  const [calendarRefreshBusy, setCalendarRefreshBusy] = useState(false);

  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const isAuthenticated = Boolean(user);

  const {
    activeWidgets,
    customButtonConfigs,
    layouts,
    widgetLocks,
    clockModes,
    widgetStyles,
    widgetSurfaceColor,
    widgetBorderColor,
    widgetTextColor,
    widgetOpacity,
    widgetBorderWidth,
    widgetSizeMode,
    dashboardBackgroundId,
    customBackgroundUrl,
    customBackgroundType,
    dashboardPresets,
    updateLayout,
    toggleWidget,
    removeCustomButton,
    toggleWidgetLock,
    toggleClockMode,
    setWidgetStyle,
    resetWidgetStyle,
    setWidgetSurfaceColor,
    setWidgetBorderColor,
    setWidgetTextColor,
    setWidgetOpacity,
    setWidgetBorderWidth,
    setWidgetSizeMode,
    setDashboardBackgroundId,
    setCustomBackgroundUrl,
    setCustomBackgroundType,
    saveCurrentAsPreset,
    applyDashboardPreset,
    deleteDashboardPreset,
    clearUnlockedWidgetStyles,
    clearAllWidgetStyles,
  } = useWidgets();

  const translatedAvailableWidgets = AVAILABLE_WIDGETS.map(widget => ({
    ...widget,
    label: t(`widgets.${widget.id}`)
  }));

  const [, setTime] = useState(new Date());

  const backgroundImageUrl = getImageBackgroundSource(
    dashboardBackgroundId,
    customBackgroundUrl,
    customBackgroundType
  );
  const videoBackgroundSource = getVideoBackgroundSource(
    dashboardBackgroundId,
    customBackgroundUrl,
    customBackgroundType
  );
  const isCalendarWidgetActive = activeWidgets.includes("calendar");
  const shouldManageCalendarConnection =
    isAuthenticated && (activePanel === "calendar" || isCalendarWidgetActive);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 900000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) return;

    setActivePanel(null);
  }, [isAuthenticated, loading]);

  useEffect(() => {
    if (!activePanel) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActivePanel(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activePanel]);

  useEffect(() => {
    if (!shouldManageCalendarConnection) return;

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
  }, [shouldManageCalendarConnection]);

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

  useEffect(() => {
    if (!shouldManageCalendarConnection) return;
    if (calendarConnectionStatus !== "connected") return;
    if (calendarRefreshBusy) return;

    void pullFromGoogleCalendar(false);

    const interval = setInterval(() => {
      void pullFromGoogleCalendar(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [
    shouldManageCalendarConnection,
    calendarConnectionStatus,
  ]);

  const handleConnectCalendar = async () => {
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
        window.alert("Failed to start Google Calendar OAuth.");
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
  };

  const handleDisconnectCalendar = async () => {
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
  };

  const handleRefreshCalendar = async () => {
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
  };


  const handleSidebarNavigation = (itemKey: string) => {
    if (!isAuthenticated) return;

    if (itemKey === "calendar") {
      setActivePanel((prev) => (prev === "calendar" ? null : "calendar"));
    }

    if (itemKey === "chat") {
      setActivePanel((prev) => (prev === "chat" ? null : "chat"));
    }
  };

  const handleSidebarArrowRight = (itemKey: string) => {
    if (!isAuthenticated) return;

    if (itemKey === "calendar") {
      setActivePanel("calendar");
      requestAnimationFrame(() => {
        calendarPanelRef.current?.focusTopLeftArrowButton();
      });
      return;
    }

    if (itemKey === "chat") {
      setActivePanel("chat");
      requestAnimationFrame(() => {
        chatPanelRef.current?.focusMessageInput();
      });
    }
  };

  const handleSidebarArrowLeft = (itemKey: string) => {
    if (!isAuthenticated) return;
    if (itemKey !== "edit" && itemKey !== "calendar") return;

    setActivePanel((prev) => {
      if (prev === "edit" || prev === "calendar") {
        return null;
      }
      return prev;
    });
  };

  const focusSidebarEditButton = () => {
    setActivePanel((prev) => (prev === "edit" ? null : prev));
    const editButton = document.querySelector('button[aria-label="Rediger"]') as HTMLButtonElement | null;
    editButton?.focus();
  };

  const focusSidebarCalendarButton = () => {
    const calendarButton = document.querySelector('button[aria-label="Calendar"]') as HTMLButtonElement | null;
    calendarButton?.focus();
  };

  const focusEditPanelWidgetList = () => {
    if (!isAuthenticated) return;

    if (activePanel !== "edit") {
      setActivePanel("edit");
    }

    requestAnimationFrame(() => {
      editPanelRef.current?.focusFirstWidget();
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        backgroundImage: `url(${backgroundImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {videoBackgroundSource && (
        <video
          className="dashboard-bg-video"
          src={videoBackgroundSource}
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            objectFit: "cover",
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
      )}

      <Sidebar
        disabled={!isAuthenticated}
        onEditArrowRight={focusEditPanelWidgetList}
        onSidebarNav={handleSidebarNavigation}
        onSidebarArrowRight={handleSidebarArrowRight}
        onSidebarArrowLeft={handleSidebarArrowLeft}
        onEditClick={() => {
          if (!isAuthenticated) return;
          setActivePanel((prev) => (prev === "edit" ? null : "edit"));
        }}
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
        ref={editPanelRef}
        open={activePanel === "edit"}
        onClose={() => setActivePanel(null)}
        onFocusSidebar={focusSidebarEditButton}
        availableWidgets={translatedAvailableWidgets}
        activeWidgets={activeWidgets}
        toggleWidget={toggleWidget}
        customButtonConfigs={customButtonConfigs}
        removeCustomButton={removeCustomButton}
        widgetSurfaceColor={widgetSurfaceColor}
        setWidgetSurfaceColor={setWidgetSurfaceColor}
        widgetBorderColor={widgetBorderColor}
        setWidgetBorderColor={setWidgetBorderColor}
        widgetTextColor={widgetTextColor}
        setWidgetTextColor={setWidgetTextColor}
        widgetOpacity={widgetOpacity}
        setWidgetOpacity={setWidgetOpacity}
        widgetBorderWidth={widgetBorderWidth}
        setWidgetBorderWidth={setWidgetBorderWidth}
        widgetSizeMode={widgetSizeMode}
        setWidgetSizeMode={setWidgetSizeMode}
        dashboardBackgroundId={dashboardBackgroundId}
        setDashboardBackgroundId={setDashboardBackgroundId}
        setCustomBackgroundUrl={setCustomBackgroundUrl}
        setCustomBackgroundType={setCustomBackgroundType}
        dashboardPresets={dashboardPresets}
        saveCurrentAsPreset={saveCurrentAsPreset}
        applyDashboardPreset={applyDashboardPreset}
        deleteDashboardPreset={deleteDashboardPreset}
        clearUnlockedWidgetStyles={clearUnlockedWidgetStyles}
        clearAllWidgetStyles={clearAllWidgetStyles}
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
          layouts={layouts}
          widgetLocks={widgetLocks}
          clockModes={clockModes}
          widgetStyles={widgetStyles}
          widgetSurfaceColor={widgetSurfaceColor}
          widgetBorderColor={widgetBorderColor}
          widgetTextColor={widgetTextColor}
          widgetBorderWidth={widgetBorderWidth}
          onLayoutChange={updateLayout}
          onCloseWidget={removeCustomButton}
          onToggleWidgetLock={toggleWidgetLock}
          onToggleClockMode={toggleClockMode}
          onSetWidgetStyle={setWidgetStyle}
          onResetWidgetStyle={resetWidgetStyle}
          sidebarWidth={SIDEBAR_WIDTH}
          isInteractive={isAuthenticated}
          calendarWidgetConfig={{
            calendarConnectionStatus,
            calendarConnectionBusy,
            calendarRefreshBusy,
            onConnectCalendar: handleConnectCalendar,
            onDisconnectCalendar: handleDisconnectCalendar,
            onRefreshCalendar: handleRefreshCalendar,
          }}
        />
      </main>

      <AiChatPanel
        ref={chatPanelRef}
        open={activePanel === "chat"}
        onClose={() => setActivePanel(null)}
        sidebarWidth={SIDEBAR_WIDTH}
      />

      {activePanel === "calendar" && (
        <CalendarWidget
          ref={calendarPanelRef}
          onClose={() => setActivePanel(null)}
          onFocusSidebarCalendarButton={focusSidebarCalendarButton}
          leftOffset={SIDEBAR_WIDTH + 20}
          calendarConnectionStatus={calendarConnectionStatus}
          calendarConnectionBusy={calendarConnectionBusy}
          calendarRefreshBusy={calendarRefreshBusy}
          onConnectCalendar={handleConnectCalendar}
          onDisconnectCalendar={handleDisconnectCalendar}
          onRefreshCalendar={handleRefreshCalendar}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <WidgetsProvider>
      <AiChatProvider>
        <DashboardPageContent />
      </AiChatProvider>
    </WidgetsProvider>
  );
}
