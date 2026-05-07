import { useState, useEffect, useCallback, useRef } from "react";
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
import type { CalendarProvider } from "../../../types/firestore";
import DashboardBackground from "./DashboardBackground";

import {
  AVAILABLE_WIDGETS,
} from "./hooks/useWidgets";

import { WidgetsProvider, useWidgets } from "./hooks/WidgetsContext";
import { useLanguage } from "../../providers/languageProvider";
import { useAuth } from "../auth/useAuth";

type CalendarConnectionStatus = "loading" | "connected" | "disconnected";
type ActivePanel = "edit" | "calendar" | "chat" | null;

const DEFAULT_CALENDAR_CONNECTIONS: Record<CalendarProvider, CalendarConnectionStatus> = {
  google: "loading",
  outlook: "loading",
};

function DashboardPageContent() {
  const SIDEBAR_WIDTH = 86;
  const editPanelRef = useRef<EditPanelHandle | null>(null);
  const calendarPanelRef = useRef<CalendarWidgetHandle | null>(null);
  const chatPanelRef = useRef<AiChatPanelHandle | null>(null);
  const GUEST_INFO_LAYOUT = { x: 1, y: 2, w: 12, h: 12 };
  const [gridContainerWidth, setGridContainerWidth] = useState(() =>
    typeof window === "undefined"
      ? 1200
      : Math.max(320, window.innerWidth - SIDEBAR_WIDTH)
  );

  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  const [calendarProvider, setCalendarProvider] = useState<CalendarProvider>("google");
  const [calendarConnections, setCalendarConnections] =
    useState<Record<CalendarProvider, CalendarConnectionStatus>>(DEFAULT_CALENDAR_CONNECTIONS);

  const [calendarConnectionBusy, setCalendarConnectionBusy] = useState(false);
  const [calendarRefreshBusy, setCalendarRefreshBusy] = useState(false);
  const calendarRefreshBusyRef = useRef(false);

  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const isAuthenticated = Boolean(user);

  const {
    activeWidgets,
    customButtonConfigs,
    layouts,
    widgetLocks,
    clockModes,
    clockBackgrounds,
    widgetStyles,
    widgetSurfaceColor,
    widgetBorderColor,
    widgetTextColor,
    widgetOpacity,
    widgetBlur,
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
    toggleClockBackground,
    setWidgetStyle,
    resetWidgetStyle,
    setWidgetSurfaceColor,
    setWidgetBorderColor,
    setWidgetTextColor,
    setWidgetOpacity,
    setWidgetBlur,
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

  const [time, setTime] = useState(new Date());

  const isCalendarWidgetActive = activeWidgets.includes("calendar");
  const shouldManageCalendarConnection =
    isAuthenticated && (activePanel === "calendar" || isCalendarWidgetActive);
  const calendarConnectionStatus = calendarConnections[calendarProvider];
  const visibleWidgets = isAuthenticated ? activeWidgets : ["info"];
  const visibleLayouts = isAuthenticated
    ? layouts
    : {
      info: layouts.info ?? GUEST_INFO_LAYOUT,
    };

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 900000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateGridWidth = () => {
      setGridContainerWidth(Math.max(320, window.innerWidth - SIDEBAR_WIDTH));
    };

    updateGridWidth();
    window.addEventListener("resize", updateGridWidth);

    return () => {
      window.removeEventListener("resize", updateGridWidth);
    };
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
        if (!cancelled) {
          setCalendarConnections({ google: "disconnected", outlook: "disconnected" });
        }
        return;
      }

      if (!cancelled) {
        setCalendarConnections({ google: "loading", outlook: "loading" });
      }

      try {
        const idToken = await user.getIdToken();

        const headers = {
          Authorization: `Bearer ${idToken}`,
        };
        const [googleResponse, outlookResponse] = await Promise.all([
          fetch("/api/google-calendar/status", { headers }),
          fetch("/api/outlook-calendar/status", { headers }),
        ]);

        const googlePayload = googleResponse.ok ? await googleResponse.json() : {};
        const outlookPayload = outlookResponse.ok ? await outlookResponse.json() : {};

        if (!cancelled) {
          const nextConnections: Record<CalendarProvider, CalendarConnectionStatus> = {
            google: googlePayload.connected ? "connected" : "disconnected",
            outlook: outlookPayload.connected ? "connected" : "disconnected",
          };

          setCalendarConnections(nextConnections);

          setCalendarProvider((currentProvider) => {
            if (nextConnections[currentProvider] === "connected") return currentProvider;
            if (nextConnections.google === "connected") return "google";
            if (nextConnections.outlook === "connected") return "outlook";
            return currentProvider;
          });
        }
      } catch {
        if (!cancelled) {
          setCalendarConnections({ google: "disconnected", outlook: "disconnected" });
        }
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
    const emailOauthResult = url.searchParams.get("email_oauth");
    const emailProvider = url.searchParams.get("email_provider");

    if (!oauthResult && !emailOauthResult) return;

    url.searchParams.delete("calendar_oauth");
    url.searchParams.delete("email_oauth");
    url.searchParams.delete("email_provider");

    if (emailOauthResult && emailProvider === "outlook") {
      setCalendarProvider("outlook");
    }

    window.history.replaceState(
      {},
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  }, []);

  const calendarApiBase = calendarProvider === "outlook" ? "/api/outlook-calendar" : "/api/google-calendar";
  const calendarProviderLabel = calendarProvider === "outlook" ? "Outlook" : "Google Calendar";

  const handleCalendarProviderChange = useCallback((provider: CalendarProvider) => {
    setCalendarProvider(provider);
  }, []);

  const pullFromConnectedCalendar = useCallback(async (showAlert = false) => {
    if (calendarConnectionStatus !== "connected") return;
    if (calendarRefreshBusyRef.current) return;

    const user = auth.currentUser;
    if (!user) return;

    calendarRefreshBusyRef.current = true;
    setCalendarRefreshBusy(true);

    try {
      const idToken = await user.getIdToken();

      const response = await fetch(`${calendarApiBase}/sync/pull`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ maxResults: 500 }),
      });

      if (!response.ok && showAlert) {
        window.alert(`Failed to refresh events from ${calendarProviderLabel}.`);
      }
    } catch {
      if (showAlert) {
        window.alert(`Failed to refresh events from ${calendarProviderLabel}.`);
      }
    } finally {
      calendarRefreshBusyRef.current = false;
      setCalendarRefreshBusy(false);
    }
  }, [calendarApiBase, calendarConnectionStatus, calendarProviderLabel]);

  useEffect(() => {
    if (!shouldManageCalendarConnection) return;
    if (calendarConnectionStatus !== "connected") return;

    void pullFromConnectedCalendar(false);

    const interval = setInterval(() => {
      void pullFromConnectedCalendar(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [
    shouldManageCalendarConnection,
    calendarConnectionStatus,
    pullFromConnectedCalendar,
  ]);

  const handleConnectCalendar = async () => {
    const user = auth.currentUser;
    if (!user) {
      window.alert(`Please sign in before connecting ${calendarProviderLabel}.`);
      return;
    }

    setCalendarConnectionBusy(true);

    try {
      const idToken = await user.getIdToken();
      const returnTo = window.location.href;

      const response = await fetch(
        calendarProvider === "outlook"
          ? "/api/email/connect-url"
          : "/api/google-calendar/connect-url",
        {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(
          calendarProvider === "outlook"
            ? { provider: "outlook", scope: "calendar", returnTo }
            : { returnTo }
        ),
      });

      if (!response.ok) {
        window.alert(`Failed to start ${calendarProviderLabel} OAuth.`);
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
      window.alert(`Failed to start ${calendarProviderLabel} OAuth.`);
      setCalendarConnectionBusy(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    const user = auth.currentUser;

    if (!user) {
      setCalendarConnections((current) => ({
        ...current,
        [calendarProvider]: "disconnected",
      }));
      return;
    }

    setCalendarConnectionBusy(true);

    try {
      const idToken = await user.getIdToken();

      const response = await fetch(`${calendarApiBase}/disconnect`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        window.alert(`Failed to disconnect ${calendarProviderLabel}.`);
        return;
      }

      setCalendarConnections((current) => ({
        ...current,
        [calendarProvider]: "disconnected",
      }));
    } catch {
      window.alert(`Failed to disconnect ${calendarProviderLabel}.`);
    } finally {
      setCalendarConnectionBusy(false);
    }
  };

  const handleRefreshCalendar = async () => {
    if (calendarConnectionStatus !== "connected") {
      window.alert("Connect a calendar before refreshing.");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      window.alert(`Please sign in before refreshing ${calendarProviderLabel}.`);
      return;
    }

    await pullFromConnectedCalendar(true);
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
        backgroundColor: "#000",
      }}
    >
      <DashboardBackground
        backgroundId={dashboardBackgroundId}
        customBackgroundUrl={customBackgroundUrl}
        customBackgroundType={customBackgroundType}
        date={time}
      />

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
        widgetBlur={widgetBlur}
        setWidgetBlur={setWidgetBlur}
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
          width: `calc(100vw - ${SIDEBAR_WIDTH}px)`,
          height: "100vh",
          position: "relative",
          zIndex: 3,
        }}
      >
        <DashboardGrid
          activeWidgets={visibleWidgets}
          layouts={visibleLayouts}
          widgetLocks={widgetLocks}
          clockModes={clockModes}
          clockBackgrounds={clockBackgrounds}
          widgetStyles={widgetStyles}
          widgetSurfaceColor={widgetSurfaceColor}
          widgetBorderColor={widgetBorderColor}
          widgetTextColor={widgetTextColor}
          widgetBlur={widgetBlur}
          widgetBorderWidth={widgetBorderWidth}
          onLayoutChange={updateLayout}
          onCloseWidget={removeCustomButton}
          onToggleWidgetLock={toggleWidgetLock}
          onToggleClockMode={toggleClockMode}
          onToggleClockBackground={toggleClockBackground}
          onSetWidgetStyle={setWidgetStyle}
          onResetWidgetStyle={resetWidgetStyle}
          containerWidth={gridContainerWidth}
          isInteractive={isAuthenticated}
          isMovable={true}
          calendarWidgetConfig={{
            calendarConnectionStatus,
            calendarProvider,
            calendarConnectionBusy,
            calendarRefreshBusy,
            onConnectCalendar: handleConnectCalendar,
            onDisconnectCalendar: handleDisconnectCalendar,
            onRefreshCalendar: handleRefreshCalendar,
            onCalendarProviderChange: handleCalendarProviderChange,
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
          calendarProvider={calendarProvider}
          calendarConnectionBusy={calendarConnectionBusy}
          calendarRefreshBusy={calendarRefreshBusy}
          onConnectCalendar={handleConnectCalendar}
          onDisconnectCalendar={handleDisconnectCalendar}
          onRefreshCalendar={handleRefreshCalendar}
          onCalendarProviderChange={handleCalendarProviderChange}
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
