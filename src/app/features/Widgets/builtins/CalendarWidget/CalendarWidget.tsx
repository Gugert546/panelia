import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { useCalendarLogic } from "./calendarLogic";
import EventEditModal from "./EventEditModal";
import CalendarSelector from "./CalendarSelector";
import { useGoogleCalendars } from "./useGoogleCalendars";
import type { CalendarEvent } from "../../../../../types/firestore";
import type { CalendarProvider } from "../../../../../types/firestore";
import { useLanguage } from "../../../../providers/languageProvider";
import { useResolvedWidgetFontSize } from "../../hooks/useResolvedWidgetFontSize";


export type CalendarWidgetVariant = "popup" | "widget";

type StickyDayLabel = {
  key: string;
  title: string;
  timeRange: string;
  event: CalendarEvent | null;
};

const CALENDAR_PROVIDERS: Array<{ id: CalendarProvider; label: string }> = [
  { id: "google", label: "Google" },
  { id: "outlook", label: "Outlook" },
];

export type CalendarWidgetProps = {
  onClose?: () => void;
  onFocusSidebarCalendarButton?: () => void;
  leftOffset?: number;
  onConnectCalendar?: () => void;
  onDisconnectCalendar?: () => void;
  onRefreshCalendar?: () => void;
  onCalendarProviderChange?: (provider: CalendarProvider) => void;
  calendarConnectionStatus?: "loading" | "connected" | "disconnected";
  calendarProvider?: CalendarProvider;
  calendarConnectionBusy?: boolean;
  calendarRefreshBusy?: boolean;
  variant?: CalendarWidgetVariant;
};

export type CalendarWidgetHandle = {
  focusTopLeftArrowButton: () => void;
};

const CALENDAR_MIN_WIDTH = 620;
const CALENDAR_MIN_HEIGHT_VH = 82;
const CALENDAR_DAY_COUNT = 7;
const CALENDAR_CELL_HEIGHT = 34;

const WEEK_WHEEL_THRESHOLD = 30;
const GRID_COLUMN_TIME_WIDTH = 56;
const STICKY_LABEL_EVENT_LIMIT = 6;
const STICKY_LABEL_RENDER_LIMIT = 3;
const STICKY_ROW_MIN_HEIGHT = 26;
const DAY_COLUMN_DIVIDER = "1px solid rgba(0,0,0,0.28)";



function slotHour(slot: string) {
  return Number(slot.split(":")[0]);
}

function formatRangeLabel(days: Date[]) {
  if (!days.length) return "Plan";

  const first = days[0];
  const last = days[days.length - 1];

  const sameMonth =
    first.getMonth() === last.getMonth() &&
    first.getFullYear() === last.getFullYear();

  if (sameMonth) {
    const month = first.toLocaleDateString("nb-NO", { month: "long" });
    return `${first.getDate()}.–${last.getDate()}. ${month}`;
  }

  const firstLabel = first.toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
  });
  const lastLabel = last.toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
  });
  return `${firstLabel} – ${lastLabel}`;
}

function getInitialVisibleSlot(timeSlots: string[]) {
  const now = new Date();
  const currentHourSlot = `${now.getHours().toString().padStart(2, "0")}:00`;

  if (timeSlots.includes(currentHourSlot)) {
    return currentHourSlot;
  }

  const currentHour = now.getHours();
  const closestSlot = timeSlots.find((slot) => slotHour(slot) >= currentHour);
  return closestSlot ?? timeSlots[0] ?? null;
}

function formatEventTimeRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "";
  }

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };

  return `${start.toLocaleTimeString("nb-NO", timeOptions)}–${end.toLocaleTimeString("nb-NO", timeOptions)}`;
}

function normalizeHexColor(color: string) {
  const raw = color.trim().replace("#", "");

  if (raw.length === 3) {
    return raw
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }

  return raw;
}

function hexToRgba(color: string, alpha: number) {
  const normalized = normalizeHexColor(color);
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `rgba(59,130,246,${alpha})`;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r},${g},${b},${alpha})`;
}

const CalendarWidget = forwardRef<CalendarWidgetHandle, CalendarWidgetProps>(function CalendarWidget({
  onClose,
  onFocusSidebarCalendarButton,
  leftOffset = 80,
  onConnectCalendar,
  onDisconnectCalendar,
  onRefreshCalendar,
  onCalendarProviderChange,
  calendarConnectionStatus = "disconnected",
  calendarProvider = "google",
  calendarConnectionBusy = false,
  calendarRefreshBusy = false,
  variant = "popup",
}: CalendarWidgetProps, ref) {
  const isPopup = variant === "popup";
  const fontSize = useResolvedWidgetFontSize();
  const headerFontSize = Math.max(fontSize - 2, 11);
  const headerDateFontSize = Math.max(fontSize - 1, 12);
  const timeColumnFontSize = Math.max(fontSize - 3, 10);
  const overflowBadgeFontSize = Math.max(fontSize - 3, 10);
  const navButtonFontSize = Math.max(fontSize + 2, 16);
  const rangeLabelFontSize = Math.max(fontSize + 8, 22);
  const actionButtonFontSize = Math.max(fontSize - 1, 12);
  const closeButtonFontSize = Math.max(fontSize + 6, 20);
  const previousWeekButtonRef = useRef<HTMLButtonElement | null>(null);
  const nextWeekButtonRef = useRef<HTMLButtonElement | null>(null);
  const providerSelectRef = useRef<HTMLSelectElement | null>(null);
  const connectButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const gridCellRefs = useRef<(HTMLDivElement | null)[][]>([]);
  const editModalReturnFocusRef = useRef<HTMLElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const headerWheelDeltaRef = useRef(0);
  const [topVisibleTime, setTopVisibleTime] = useState<string | null>(null);
  const [focusedGridCell, setFocusedGridCell] = useState({ row: 0, col: 0 });
  const [pendingWeekFocus, setPendingWeekFocus] = useState<{ row: number; col: number } | null>(null);
  const popupHeaderRef = useRef<HTMLDivElement | null>(null);
  const [popupHeaderHeight, setPopupHeaderHeight] = useState(0);
  const [providerSelectFocused, setProviderSelectFocused] = useState(false);

  useEffect(() => {
    const selectElement = providerSelectRef.current;
    if (!selectElement) return;

    const handleNativeKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== "ArrowLeft" &&
        event.key !== "ArrowRight" &&
        event.key !== "ArrowDown" &&
        event.key !== "ArrowUp"
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (event.key === "ArrowUp") {
        const widgetRoot = selectElement.closest("[data-widget-id]");
        const lockButton = widgetRoot?.querySelector(
          "button.widget-lock-btn:not([disabled])"
        ) as HTMLButtonElement | null;
        const styleButton = widgetRoot?.querySelector(
          "button.widget-style-btn:not([disabled])"
        ) as HTMLButtonElement | null;
        (lockButton ?? styleButton)?.focus();
      } else if (event.key === "ArrowRight") {
        connectButtonRef.current?.focus();
      } else if (event.key === "ArrowLeft") {
        nextWeekButtonRef.current?.focus();
      } else if (event.key === "ArrowDown") {
        focusGridCell(0, 0);
      }
    };

    selectElement.addEventListener("keydown", handleNativeKeyDown, true);
    return () => {
      selectElement.removeEventListener("keydown", handleNativeKeyDown, true);
    };
  }, []);

  const handleConnectCalendar = () => {
    if (calendarConnectionBusy) return;

    if (calendarConnectionStatus === "connected") {
      onDisconnectCalendar?.();
      return;
    }

    if (onConnectCalendar) {
      onConnectCalendar();
      return;
    }

    window.alert("Google Calendar connect will be enabled in the next step.");
  };
  const { t } = useLanguage();
  const {
    calendars,
    selectedCalendarIds,
    loading: calendarsLoading,
    saving: calendarsSaving,
    toggleCalendar,
    saveSelection,
  } = useGoogleCalendars(calendarConnectionStatus === "connected", calendarProvider);

  const handleRefreshCalendar = () => {
    if (
      calendarRefreshBusy ||
      calendarConnectionBusy ||
      calendarConnectionStatus !== "connected"
    ) {
      return;
    }

    onRefreshCalendar?.();
  };

  const handleProviderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onCalendarProviderChange?.(event.target.value as CalendarProvider);
  };

  const handleProviderSelectKeyDownCapture: React.KeyboardEventHandler<HTMLSelectElement> = (event) => {
    if (
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight" &&
      event.key !== "ArrowDown" &&
      event.key !== "ArrowUp"
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.key === "ArrowUp") {
      const widgetRoot = event.currentTarget.closest("[data-widget-id]");
      const lockButton = widgetRoot?.querySelector(
        "button.widget-lock-btn:not([disabled])"
      ) as HTMLButtonElement | null;
      const styleButton = widgetRoot?.querySelector(
        "button.widget-style-btn:not([disabled])"
      ) as HTMLButtonElement | null;
      (lockButton ?? styleButton)?.focus();
    } else if (event.key === "ArrowRight") {
      connectButtonRef.current?.focus();
    } else if (event.key === "ArrowLeft") {
      nextWeekButtonRef.current?.focus();
    } else if (event.key === "ArrowDown") {
      focusGridCell(0, 0);
    }
  };

  const checking = t("widgets.calendarWidget.checking")
  const connected = t("widgets.calendarWidget.connected")
  const connectCalendar = t("widgets.calendarWidget.connectCalendar")

  const connectButtonLabel = calendarConnectionBusy
    ? "Working..."
    : calendarConnectionStatus === "loading"
      ? checking
      : calendarConnectionStatus === "connected"
        ? connected
        : connectCalendar;

  const refreshing = t("widgets.calendarWidget.refreshing")
  const refreshFromGoogle = calendarProvider === "outlook"
    ? t("widgets.calendarWidget.refreshFromOutlook")
    : t("widgets.calendarWidget.refreshFromGoogle")

  const refreshButtonLabel = calendarRefreshBusy
    ? refreshing
    : refreshFromGoogle;

  const focusTopCalendarRow = () => {
    focusGridCell(0, focusedGridCell.col);
  };

  const focusWidgetTopControl = (start: HTMLElement) => {
    const widgetRoot = start.closest("[data-widget-id]");
    if (!(widgetRoot instanceof HTMLElement)) return;

    const preferredControl = widgetRoot.querySelector(
      "button.widget-style-btn, button.widget-lock-btn"
    ) as HTMLButtonElement | null;

    preferredControl?.focus();
  };

  const handlePreviousWeekButtonKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (event) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusWidgetTopControl(event.currentTarget);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onFocusSidebarCalendarButton?.();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusGridCell(0, 0);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      nextWeekButtonRef.current?.focus();
    }
  };

  const handleNextWeekButtonKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (event) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusWidgetTopControl(event.currentTarget);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      previousWeekButtonRef.current?.focus();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusTopCalendarRow();
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      providerSelectRef.current?.focus();
    }
  };

  const handleConnectButtonKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (event) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusWidgetTopControl(event.currentTarget);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      providerSelectRef.current?.focus();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusTopCalendarRow();
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (isPopup) {
        closeButtonRef.current?.focus();
      }
    }
  };

  const handleCloseButtonKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      connectButtonRef.current?.focus();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusTopCalendarRow();
    }
  };

  const handleRefreshButtonKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (event) => {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    focusTopCalendarRow();
  };

  const handleTodayButtonKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (event) => {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    focusTopCalendarRow();
  };

  useImperativeHandle(ref, () => ({
    focusTopLeftArrowButton: () => {
      requestAnimationFrame(() => {
        previousWeekButtonRef.current?.focus();
      });
    },
  }), []);

  const {
    weekDays,
    timeSlots,
    formatDate,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    isViewingCurrentWeek,
    handleCellClick,
    editingEvent,
    savingEdit,
    deletingEdit,
    openEditModal,
    patchEditingEvent,
    closeEditModal,
    saveEditModal,
    deleteEditModal,
    getCellRenderState,
  } = useCalendarLogic(selectedCalendarIds, calendarProvider);

  const displayWeekDays = useMemo(
    () => weekDays.slice(0, CALENDAR_DAY_COUNT),
    [weekDays]
  );

  const displayTimeSlots = useMemo(() => timeSlots, [timeSlots]);

  const focusGridCell = useCallback((row: number, col: number) => {
    const maxRow = Math.max(0, displayTimeSlots.length - 1);
    const maxCol = Math.max(0, displayWeekDays.length - 1);
    const nextRow = Math.min(Math.max(row, 0), maxRow);
    const nextCol = Math.min(Math.max(col, 0), maxCol);

    setFocusedGridCell({ row: nextRow, col: nextCol });

    requestAnimationFrame(() => {
      gridCellRefs.current[nextRow]?.[nextCol]?.focus();
    });
  }, [displayTimeSlots.length, displayWeekDays.length]);

  const rememberFocusBeforeEditModal = useCallback((origin?: HTMLElement | null) => {
    if (origin) {
      editModalReturnFocusRef.current = origin;
      return;
    }

    const activeElement = document.activeElement;
    editModalReturnFocusRef.current = activeElement instanceof HTMLElement ? activeElement : null;
  }, []);

  const restoreFocusAfterEditModal = useCallback(() => {
    requestAnimationFrame(() => {
      const target = editModalReturnFocusRef.current;
      if (target && target.isConnected) {
        target.focus();
        return;
      }

      gridCellRefs.current[focusedGridCell.row]?.[focusedGridCell.col]?.focus();
    });
  }, [focusedGridCell.col, focusedGridCell.row]);

  const openExistingEventModal = useCallback((eventData: CalendarEvent, origin?: HTMLElement | null) => {
    rememberFocusBeforeEditModal(origin);
    openEditModal(eventData);
  }, [openEditModal, rememberFocusBeforeEditModal]);

  const openNewEventModal = useCallback((dayIdx: number, time: string, origin?: HTMLElement | null) => {
    rememberFocusBeforeEditModal(origin);
    void handleCellClick(dayIdx, time);
  }, [handleCellClick, rememberFocusBeforeEditModal]);

  const handleEditModalCancel = useCallback(() => {
    closeEditModal();
    restoreFocusAfterEditModal();
  }, [closeEditModal, restoreFocusAfterEditModal]);

  const handleEditModalSave = useCallback(async () => {
    await saveEditModal();
    restoreFocusAfterEditModal();
  }, [restoreFocusAfterEditModal, saveEditModal]);

  const handleEditModalDelete = useCallback(async () => {
    await deleteEditModal();
    restoreFocusAfterEditModal();
  }, [deleteEditModal, restoreFocusAfterEditModal]);

  useLayoutEffect(() => {
    if (displayTimeSlots.length === 0 || displayWeekDays.length === 0) {
      return;
    }

    setFocusedGridCell((prev) => ({
      row: Math.min(prev.row, displayTimeSlots.length - 1),
      col: Math.min(prev.col, displayWeekDays.length - 1),
    }));
  }, [displayTimeSlots.length, displayWeekDays.length]);

  useLayoutEffect(() => {
    if (!pendingWeekFocus) return;

    focusGridCell(pendingWeekFocus.row, pendingWeekFocus.col);
    setPendingWeekFocus(null);
  }, [pendingWeekFocus, focusGridCell]);

  const rangeLabel = useMemo(
    () => formatRangeLabel(displayWeekDays),
    [displayWeekDays]
  );

  const initialVisibleSlot = useMemo(
    () => (isPopup ? null : getInitialVisibleSlot(displayTimeSlots)),
    [isPopup, displayTimeSlots]
  );

  const updateTopVisibleTime = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const slotNodes = Array.from(
      container.querySelectorAll<HTMLElement>("[data-time-slot]")
    );

    if (!slotNodes.length) {
      setTopVisibleTime(null);
      return;
    }

    const targetTop = container.scrollTop + 1;
    let active = slotNodes[0].dataset.timeSlot ?? null;

    for (const node of slotNodes) {
      if (node.offsetTop <= targetTop) {
        active = node.dataset.timeSlot ?? active;
        continue;
      }

      break;
    }

    setTopVisibleTime((prev) => (prev === active ? prev : active));
  }, []);

    useLayoutEffect(() => {
    if (!isPopup || !popupHeaderRef.current) return;
  
    const updateHeaderHeight = () => {
      setPopupHeaderHeight(popupHeaderRef.current?.offsetHeight ?? 0);
    };
  
    updateHeaderHeight();
  
    const observer = new ResizeObserver(updateHeaderHeight);
    observer.observe(popupHeaderRef.current);
  
    return () => observer.disconnect();
  }, [isPopup, rangeLabel]);

  useLayoutEffect(() => {
    if (isPopup || !initialVisibleSlot || !scrollContainerRef.current) {
      requestAnimationFrame(updateTopVisibleTime);
      return;
    }

    const container = scrollContainerRef.current;

    const scrollToCurrentHour = () => {
      const target = container.querySelector<HTMLElement>(
        `[data-time-slot="${initialVisibleSlot}"]`
      );

      if (!target) return;

      container.scrollTo({
        top: Math.max(0, target.offsetTop - CALENDAR_CELL_HEIGHT),
        behavior: "auto",
      });

      updateTopVisibleTime();
    };

    const frameOne = requestAnimationFrame(() => {
      scrollToCurrentHour();
      requestAnimationFrame(scrollToCurrentHour);
    });

    return () => cancelAnimationFrame(frameOne);
  }, [
    isPopup,
    initialVisibleSlot,
    rangeLabel,
    updateTopVisibleTime,
  ]);

  const handleHeaderWheel: React.WheelEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    headerWheelDeltaRef.current += event.deltaY;

    if (headerWheelDeltaRef.current >= WEEK_WHEEL_THRESHOLD) {
      headerWheelDeltaRef.current = 0;
      goToNextWeek();
      return;
    }

    if (headerWheelDeltaRef.current <= -WEEK_WHEEL_THRESHOLD) {
      headerWheelDeltaRef.current = 0;
      goToPreviousWeek();
    }
  };

  const maxVisibleEventsPerCell = 3;

  const calendarColorById = useMemo(() => {
    const map = new Map<string, string>();

    for (const calendar of calendars) {
      if (!calendar.id) continue;
      map.set(calendar.id, calendar.backgroundColor || "#3b82f6");
    }

    if (!map.has("primary")) {
      map.set("primary", "#3b82f6");
    }

    return map;
  }, [calendars]);

  const gridTemplateColumns = `${GRID_COLUMN_TIME_WIDTH}px repeat(${displayWeekDays.length}, minmax(0, 1fr))`;

    const stickyReferenceTime = topVisibleTime ?? displayTimeSlots[0] ?? null;
  
  const stickyLabelsByDay = useMemo(() => {
    return displayWeekDays.map((_, dayIdx) => {
      if (!stickyReferenceTime) return [];
  
      const { items, hiddenCount } = getCellRenderState(
        dayIdx,
        stickyReferenceTime,
        STICKY_LABEL_EVENT_LIMIT
      );
  
      const continuingItems = items.filter((item) => item.isContinuation);
  
      const labels: StickyDayLabel[] = continuingItems
        .slice(0, STICKY_LABEL_RENDER_LIMIT)
        .map((item) => ({
          key: item.event.id,
          title: item.event.title || "Untitled",
          timeRange: formatEventTimeRange(item.event.startAt, item.event.endAt),
          event: item.event,
        }));
  
      const continuingHiddenCount = Math.max(
        0,
        continuingItems.length - STICKY_LABEL_RENDER_LIMIT
      );
  
      if (continuingHiddenCount > 0 || hiddenCount > 0) {
        labels.push({
          key: `overflow-${dayIdx}`,
          title: `+${continuingHiddenCount + hiddenCount} more`,
          timeRange: "",
          event: null,
        });
      }
  
      return labels;
    });
  }, [displayWeekDays, stickyReferenceTime, getCellRenderState]);

  const renderWeekHeader = () => (
    <>
      <div
        style={{
          backgroundColor: "rgba(255,255,255,0.15)",
          padding: "8px 6px",
          fontWeight: 600,
          fontSize: headerFontSize,
          textAlign: "center",
        }}
      >
        {t("widgets.calendarWidget.time")}
      </div>

      {displayWeekDays.map((date, idx) => {
        const { day, date: dateNum } = formatDate(date);

        return (
          <div
            key={`header-${idx}`}
            style={{
              backgroundColor: "rgba(255,255,255,0.15)",
              padding: "8px 6px",
              fontWeight: 600,
              fontSize: headerFontSize,
              textAlign: "center",
              borderRight:
                idx < displayWeekDays.length - 1 ? DAY_COLUMN_DIVIDER : "none",
            }}
          >
            <div>{day}</div>
            <div style={{ fontSize: headerDateFontSize, marginTop: "2px" }}>{dateNum}</div>
          </div>
        );
      })}
    </>
  );

  const renderStickyLabels = () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns,
        gap: "1px",
        backgroundColor: "rgba(255, 255, 255, 0)",
        padding: "1px",
        borderTop: "1px solid rgba(148,163,184,0.22)",
      }}
    >
      <div
        style={{
          backgroundColor: "transparent",
          minHeight: `${STICKY_ROW_MIN_HEIGHT}px`,
        }}
      />

      {stickyLabelsByDay.map((labels, dayIdx) => (
        <div
          key={`sticky-${dayIdx}`}
          style={{
            backgroundColor: "transparent",
            padding: "2px 4px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            minHeight: `${STICKY_ROW_MIN_HEIGHT}px`,
            borderRight:
              dayIdx < displayWeekDays.length - 1 ? DAY_COLUMN_DIVIDER : "none",
          }}
        >
          {labels.map((label) => (
            <div
              key={label.key}
              onClick={(e) => {
                if (!label.event) return;
                e.stopPropagation();
                const focusOrigin = e.currentTarget.closest("[data-calendar-focus-target='true']") as HTMLElement | null;
                openExistingEventModal(label.event, focusOrigin);
              }}
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: 1.15,
                padding: "1px 4px",
                borderRadius: "4px",
                background: label.event
                  ? hexToRgba(
                      calendarColorById.get(label.event.calendarId || "primary") || "#3b82f6",
                      0.95
                    )
                  : "rgba(15,23,42,0.12)",
                color: "rgba(15,23,42,0.95)",
                whiteSpace: "normal",
                wordBreak: "break-word",
                textOverflow: "clip",
                overflow: "visible",
                cursor: label.event ? "pointer" : "default",
              }}
              title={label.timeRange ? `${label.title} · ${label.timeRange}` : label.title}
            >
              {label.timeRange ? `${label.title} · ${label.timeRange}` : label.title}
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  const renderTimeRows = () =>
    displayTimeSlots.map((time, timeIdx) => (
      <React.Fragment key={timeIdx}>
        <div
          data-time-slot={time}
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            padding: "8px 6px",
            fontSize: timeColumnFontSize,
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          {time}
        </div>

        {displayWeekDays.map((_, dayIdx) => {
          //const cellKey = `${dayIdx}-${time}`;
          const { items, hiddenCount } = getCellRenderState(
            dayIdx,
            time,
            maxVisibleEventsPerCell
          );
          const hasEvents = items.length > 0;
          const isFocusedCell = focusedGridCell.row === timeIdx && focusedGridCell.col === dayIdx;
          const cellDate = displayWeekDays[dayIdx];

          const handleGridCellKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
            if (event.key === "ArrowUp") {
              event.preventDefault();
              if (timeIdx === 0) {
                previousWeekButtonRef.current?.focus();
                return;
              }

              focusGridCell(timeIdx - 1, dayIdx);
              return;
            }

            if (event.key === "ArrowDown") {
              event.preventDefault();
              focusGridCell(timeIdx + 1, dayIdx);
              return;
            }

            if (event.key === "ArrowLeft") {
              event.preventDefault();
              if (dayIdx === 0) {
                setPendingWeekFocus({
                  row: timeIdx,
                  col: Math.max(0, displayWeekDays.length - 1),
                });
                goToPreviousWeek();
                return;
              }
              focusGridCell(timeIdx, dayIdx - 1);
              return;
            }

            if (event.key === "ArrowRight") {
              event.preventDefault();
              if (dayIdx === displayWeekDays.length - 1) {
                setPendingWeekFocus({ row: timeIdx, col: 0 });
                goToNextWeek();
                return;
              }
              focusGridCell(timeIdx, dayIdx + 1);
              return;
            }

            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();

              if (hasEvents) {
                openExistingEventModal(items[0].event, event.currentTarget);
                return;
              }

              openNewEventModal(dayIdx, time, event.currentTarget);
            }
          };

          return (
            <div
              key={`${timeIdx}-${dayIdx}`}
              ref={(element) => {
                if (!gridCellRefs.current[timeIdx]) {
                  gridCellRefs.current[timeIdx] = [];
                }

                gridCellRefs.current[timeIdx][dayIdx] = element;
              }}
              tabIndex={isFocusedCell ? 0 : -1}
              data-calendar-focus-target="true"
              onFocus={() => {
                setFocusedGridCell({ row: timeIdx, col: dayIdx });
              }}
              onKeyDown={handleGridCellKeyDown}
              aria-label={`${cellDate.toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "long" })} klokken ${time}`}
              style={{
                backgroundColor: hasEvents
                  ? hexToRgba(
                      calendarColorById.get(items[0].event.calendarId || "primary") || "#3b82f6",
                      0.08
                    )
                  : "rgba(59, 130, 246, 0.08)",
                borderLeft: hasEvents
                  ? `3px solid ${hexToRgba(
                      calendarColorById.get(items[0].event.calendarId || "primary") || "#3b82f6",
                      0.35
                    )}`
                  : "3px solid transparent",
                minHeight: `${CALENDAR_CELL_HEIGHT}px`,
                padding: "4px",
                cursor:
                  calendarConnectionBusy ||
                  calendarConnectionStatus === "loading"
                    ? "not-allowed"
                    : "pointer",
                transition: "background-color 0.2s",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                overflow: "hidden",
                borderRight:
                  dayIdx < displayWeekDays.length - 1 ? DAY_COLUMN_DIVIDER : "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(224, 242, 254, 1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = hasEvents
                  ? hexToRgba(
                      calendarColorById.get(items[0].event.calendarId || "primary") || "#3b82f6",
                      0.08
                    )
                  : "rgba(59, 130, 246, 0.08)";
              }}
              onClick={() => {
                const target = gridCellRefs.current[timeIdx]?.[dayIdx];
                openNewEventModal(dayIdx, time, target ?? null);
              }}
            >
              {items.map((item) => {
                const laneTone = Math.max(0.16, 0.28 - item.lane * 0.04);
                const calendarColor =
                  calendarColorById.get(item.event.calendarId || "primary") || "#3b82f6";
                const eventTitle = item.event.title || "Untitled";
                const timeRangeLabel = formatEventTimeRange(item.event.startAt, item.event.endAt);
                const continuationTitle = timeRangeLabel
                  ? `${eventTitle} (${timeRangeLabel})`
                  : eventTitle;

                return (
                  <div
                    key={item.event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      const focusOrigin = e.currentTarget.closest("[data-calendar-focus-target='true']") as HTMLElement | null;
                      openExistingEventModal(item.event, focusOrigin);
                    }}
                    style={{
                      fontSize: item.isStart ? fontSize : Math.max(fontSize - 3, 9),
                      lineHeight: 1.15,
                      padding: item.isStart ? "2px 5px" : "1px 0px",
                      borderRadius: item.isStart
                        ? "6px 6px 3px 3px"
                        : item.isEnd
                          ? "3px 3px 6px 6px"
                          : "0px",
                      background: hexToRgba(calendarColor, laneTone),
                      borderLeft: `2px solid ${hexToRgba(calendarColor, 0.72)}`,
                      color: "inherit",
                      whiteSpace: item.isStart ? "normal" : "nowrap",
                      wordBreak: item.isStart ? "break-word" : "normal",
                      textOverflow: item.isStart ? "clip" : "ellipsis",
                      overflow: item.isStart ? "visible" : "hidden",
                      cursor: "pointer",
                    }}
                    title={item.isStart ? continuationTitle : `Continues: ${continuationTitle}`}
                  >
                    {item.isStart ? (
                      <span style={{ display: "block" }}>
                        {eventTitle}
                        {timeRangeLabel ? ` · ${timeRangeLabel}` : ""}
                      </span>
                    ) : (
                      <span style={{ display: "block", width: "100%", height: "100%" }} />
                    )}
                  </div>
                );
              })}

              {hiddenCount > 0 && (
                <div
                  style={{
                    alignSelf: "flex-start",
                    fontSize: overflowBadgeFontSize,
                    fontWeight: 600,
                    lineHeight: 1,
                    padding: "2px 5px",
                    borderRadius: "9999px",
                    background: "rgba(15,23,42,0.1)",
                    color: "rgba(15,23,42,0.9)",
                  }}
                  title={`${hiddenCount} more events in this slot`}
                >
                  +{hiddenCount}
                </div>
              )}
            </div>
          );
        })}
      </React.Fragment>
    ));

  const pane = (
    <WidgetPane>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
        }}
      >
        <div
          onWheel={handleHeaderWheel}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              ref={previousWeekButtonRef}
              data-calendar-nav="previous-week"
              onKeyDown={handlePreviousWeekButtonKeyDown}
              onClick={goToPreviousWeek}
              style={{
                background: "rgba(255,255,255,0.45)",
                border: "none",
                borderRadius: "9999px",
                width: 30,
                height: 30,
                fontSize: navButtonFontSize,
                fontWeight: 700,
                cursor: "pointer",
                color: "rgba(15,23,42,0.95)",
              }}
              title="Previous week"
            >
              ←
            </button>

            <h2 style={{ margin: 0, fontSize: rangeLabelFontSize, fontWeight: 600 }}>
              {rangeLabel}
            </h2>

            <button
              ref={nextWeekButtonRef}
              onKeyDown={handleNextWeekButtonKeyDown}
              onClick={goToNextWeek}
              style={{
                background: "rgba(255,255,255,0.45)",
                border: "none",
                borderRadius: "9999px",
                width: 30,
                height: 30,
                fontSize: navButtonFontSize,
                fontWeight: 700,
                cursor: "pointer",
                color: "rgba(15,23,42,0.95)",
              }}
              title="Next week"
            >
              →
            </button>

            {!isViewingCurrentWeek && (
              <button
                onKeyDown={handleTodayButtonKeyDown}
                onClick={goToCurrentWeek}
                style={{
                  background: "rgba(15,23,42,0.12)",
                  border: "none",
                  borderRadius: "9999px",
                  padding: "8px 12px",
                  fontSize: actionButtonFontSize,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: "rgba(15,23,42,0.95)",
                }}
                title="Back to current date"
              >
                {t("widgets.calendarWidget.today")}
              </button>
            )}
          </div>
          
          {/* sub-kalender velger*/}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              ref={providerSelectRef}
              onKeyDownCapture={handleProviderSelectKeyDownCapture}
              onFocus={() => setProviderSelectFocused(true)}
              onBlur={() => setProviderSelectFocused(false)}
              value={calendarProvider}
              onChange={handleProviderChange}
              disabled={calendarConnectionBusy}
              style={{
                border: "1px solid rgba(255,255,255,0.32)",
                borderRadius: "9999px",
                background: "rgba(255,255,255,0.45)",
                color: "rgba(15,23,42,0.95)",
                padding: "8px 10px",
                fontSize: actionButtonFontSize,
                fontWeight: 700,
                outline: "none",
                boxShadow: providerSelectFocused ? "0 0 0 2px #fff, 0 0 0 4px rgba(59,130,246,0.7)" : undefined,
                cursor:
                  calendarConnectionBusy
                    ? "not-allowed"
                    : "pointer",
                opacity: calendarConnectionBusy ? 0.7 : 1,
              }}
              aria-label="Calendar provider"
              title="Calendar provider"
            >
              {CALENDAR_PROVIDERS.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.label}
                </option>
              ))}
            </select>

            {calendarConnectionStatus === "connected" && (
              <CalendarSelector
                calendars={calendars}
                selectedCalendarIds={selectedCalendarIds}
                fontSize={fontSize}
                loading={calendarsLoading}
                saving={calendarsSaving}
                onToggle={toggleCalendar}
                onSave={saveSelection}
              />
            )}
            
            <button
              onKeyDown={handleRefreshButtonKeyDown}
              onClick={handleRefreshCalendar}
              style={{
                background: "rgba(59,130,246,0.14)",
                border: "none",
                borderRadius: "9999px",
                fontSize: actionButtonFontSize,
                fontWeight: 600,
                cursor:
                  calendarRefreshBusy ||
                  calendarConnectionBusy ||
                  calendarConnectionStatus !== "connected"
                    ? "not-allowed"
                    : "pointer",
                padding: "8px 12px",
                color: "inherit",
                opacity:
                  calendarRefreshBusy ||
                  calendarConnectionBusy ||
                  calendarConnectionStatus !== "connected"
                    ? 0.7
                    : 1,
              }}
              disabled={
                calendarRefreshBusy ||
                calendarConnectionBusy ||
                calendarConnectionStatus !== "connected"
              }
            >
              {refreshButtonLabel}
            </button>
            
            <button
              ref={connectButtonRef}
              onKeyDown={handleConnectButtonKeyDown}
              onClick={handleConnectCalendar}
              style={{
                background:
                  calendarConnectionStatus === "connected"
                    ? "rgba(34,197,94,0.22)"
                    : "rgba(59,130,246,0.2)",
                border: "none",
                borderRadius: "9999px",
                fontSize: actionButtonFontSize,
                fontWeight: 600,
                cursor:
                  calendarConnectionBusy || calendarConnectionStatus === "loading"
                    ? "not-allowed"
                    : "pointer",
                padding: "8px 12px",
                color: "inherit",
                opacity:
                  calendarConnectionBusy || calendarConnectionStatus === "loading"
                    ? 0.7
                    : 1,
              }}
              disabled={
                calendarConnectionBusy || calendarConnectionStatus === "loading"
              }
            >
              {connectButtonLabel}
            </button>

            {isPopup && (
              <button
                ref={closeButtonRef}
                onKeyDown={handleCloseButtonKeyDown}
                onClick={onClose}
                style={{
                  background: "rgba(255,255,255,0.25)",
                  border: "none",
                  borderRadius: "9999px",
                  fontSize: closeButtonFontSize,
                  cursor: "pointer",
                  width: 34,
                  height: 34,
                  color: "rgba(0, 0, 0, 0.8)",
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {isPopup ? (
          <div
            data-arrow-scope="calendar-panel"
            ref={scrollContainerRef}
            onScroll={updateTopVisibleTime}
            style={{
              overflowY: "auto",
              overflowX: "auto",
              width: "100%",
              flex: 1,
              minHeight: 0,
            }}
          >
            <div
              style={{
                position: "relative",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <div
                ref={popupHeaderRef}
                style={{
                  display: "grid",
                  gridTemplateColumns,
                  gap: "1px",
                  backgroundColor: "rgba(255,255,255,0.32)",
                  padding: "1px",
                  position: "sticky",
                  top: 0,
                  zIndex: 30,
                }}
              >
                {renderWeekHeader()}
              </div>

              <div
                style={{
                  position: "sticky",
                  top: popupHeaderHeight - 1,
                  height: 0,
                  overflow: "visible",
                  zIndex: 20,
                  pointerEvents: "none",
                }}
              >
                <div style={{ pointerEvents: "auto" }}>
                  {renderStickyLabels()}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns,
                  gap: "1px",
                  backgroundColor: "rgba(255,255,255,0.32)",
                  padding: "1px",
                }}
              >
                {renderTimeRows()}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns,
                gap: "1px",
                backgroundColor: "rgba(255,255,255,0.32)",
                padding: "1px",
                borderTopLeftRadius: "12px",
                borderTopRightRadius: "12px",
                overflow: "hidden",
              }}
            >
              {renderWeekHeader()}
            </div>

            <div
              ref={scrollContainerRef}
              onScroll={updateTopVisibleTime}
              style={{
                position: "relative",
                overflowY: "auto",
                overflowX: "auto",
                width: "100%",
                flex: 1,
                minHeight: 0,
              }}
            >
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  height: 0,
                  overflow: "visible",
                  zIndex: 20,
                  pointerEvents: "none",
                }}
              >
                <div style={{ pointerEvents: "auto" }}>
                  {renderStickyLabels()}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns,
                  gap: "1px",
                  backgroundColor: "rgba(255,255,255,0.32)",
                  padding: "1px",
                  position: "relative",
                  zIndex: 1,
                  borderBottomLeftRadius: "12px",
                  borderBottomRightRadius: "12px",
                  overflow: "hidden",
                }}
              >
                {renderTimeRows()}
              </div>
            </div>
          </>
        )}
      </div>
    </WidgetPane>
  );

  return (
    <>
      {isPopup ? (
        <div
          data-arrow-scope="calendar-panel"
          style={{
            position: "fixed",
            top: 20,
            left: leftOffset,
            zIndex: 1500,
            width: `${CALENDAR_MIN_WIDTH}px`,
            minWidth: `${CALENDAR_MIN_WIDTH}px`,
            height: `${CALENDAR_MIN_HEIGHT_VH}vh`,
            minHeight: `${CALENDAR_MIN_HEIGHT_VH}vh`,
            resize: "both",
            overflow: "hidden",
          }}
        >
          <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
            {pane}
          </div>
        </div>
      ) : (
        <WidgetContainer>
          <div style={{ width: "100%", height: "100%", minHeight: 0 }}>{pane}</div>
        </WidgetContainer>
      )}

      <EventEditModal
        open={!!editingEvent}
        value={editingEvent}
        saving={savingEdit}
        deleting={deletingEdit}
        onChange={patchEditingEvent}
        onCancel={handleEditModalCancel}
        onSave={handleEditModalSave}
        onDelete={handleEditModalDelete}
      />
    </>
  );
});

export default CalendarWidget;
