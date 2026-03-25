import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { useCalendarLogic } from "./calendarLogic";
import EventEditModal from "./EventEditModal";
import CalendarSelector from "./CalendarSelector";
import { useGoogleCalendars } from "./useGoogleCalendars"; // or ./useGoogleCalendars if you renamed
import type { CalendarEvent } from "../../../../../types/firestore";
import { useFontSize } from "../../../../providers/themeProviders";

export type CalendarWidgetVariant = "popup" | "widget";

type StickyDayLabel = {
  key: string;
  title: string;
  timeRange: string;
  event: CalendarEvent | null;
};

export type CalendarWidgetProps = {
  onClose?: () => void;
  leftOffset?: number;
  onConnectCalendar?: () => void;
  onDisconnectCalendar?: () => void;
  onRefreshCalendar?: () => void;
  calendarConnectionStatus?: "loading" | "connected" | "disconnected";
  calendarConnectionBusy?: boolean;
  calendarRefreshBusy?: boolean;
  variant?: CalendarWidgetVariant;
};

const CALENDAR_MIN_WIDTH = 560;
const CALENDAR_MIN_HEIGHT_VH = 82;
const CALENDAR_DAY_COUNT = 7;
const CALENDAR_CELL_HEIGHT = 34;

const WEEK_WHEEL_THRESHOLD = 30;
const GRID_COLUMN_TIME_WIDTH = 56;
const STICKY_LABEL_EVENT_LIMIT = 6;
const STICKY_LABEL_RENDER_LIMIT = 3;
const STICKY_ROW_MIN_HEIGHT = 26;

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

export default function CalendarWidget({
  onClose,
  leftOffset = 80,
  onConnectCalendar,
  onDisconnectCalendar,
  onRefreshCalendar,
  calendarConnectionStatus = "disconnected",
  calendarConnectionBusy = false,
  calendarRefreshBusy = false,
  variant = "popup",
}: CalendarWidgetProps) {
  const isPopup = variant === "popup";
  const { fontSize } = useFontSize();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const headerWheelDeltaRef = useRef(0);
  const [topVisibleTime, setTopVisibleTime] = useState<string | null>(null);
  const popupHeaderRef = useRef<HTMLDivElement | null>(null);
  const [popupHeaderHeight, setPopupHeaderHeight] = useState(0);

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

  const {
    calendars,
    selectedCalendarIds,
    loading: calendarsLoading,
    saving: calendarsSaving,
    toggleCalendar,
    saveSelection,
  } = useGoogleCalendars(calendarConnectionStatus === "connected");

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

  const connectButtonLabel = calendarConnectionBusy
    ? "Working..."
    : calendarConnectionStatus === "loading"
      ? "Checking..."
      : calendarConnectionStatus === "connected"
        ? "Connected"
        : "Connect Calendar";

  const refreshButtonLabel = calendarRefreshBusy
    ? "Refreshing..."
    : "Refresh from Google";

  const {
    weekDays,
    timeSlots,
    formatDate,
    goToPreviousWeek,
    goToNextWeek,
    handleCellClick,
    creatingKey,
    editingEvent,
    savingEdit,
    deletingEdit,
    openEditModal,
    patchEditingEvent,
    closeEditModal,
    saveEditModal,
    deleteEditModal,
    getCellRenderState,
  } = useCalendarLogic(selectedCalendarIds);

  const displayWeekDays = useMemo(
    () => weekDays.slice(0, CALENDAR_DAY_COUNT),
    [weekDays]
  );

  const displayTimeSlots = useMemo(() => timeSlots, [timeSlots]);

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
          backgroundColor: "rgba(255,255,255,0.55)",
          padding: "8px 6px",
          fontWeight: 600,
          fontSize: "11px",
          textAlign: "center",
        }}
      >
        Time
      </div>

      {displayWeekDays.map((date, idx) => {
        const { day, date: dateNum } = formatDate(date);

        return (
          <div
            key={`header-${idx}`}
            style={{
              backgroundColor: "rgba(255,255,255,0.55)",
              padding: "8px 6px",
              fontWeight: 600,
              fontSize: "11px",
              textAlign: "center",
            }}
          >
            <div>{day}</div>
            <div style={{ fontSize: "12px", marginTop: "2px" }}>{dateNum}</div>
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
          }}
        >
          {labels.map((label) => (
            <div
              key={label.key}
              onClick={(e) => {
                if (!label.event) return;
                e.stopPropagation();
                openEditModal(label.event);
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
            backgroundColor: "rgba(255,255,255,0.55)",
            padding: "8px 6px",
            fontSize: "10px",
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          {time}
        </div>

        {displayWeekDays.map((_, dayIdx) => {
          const cellKey = `${dayIdx}-${time}`;
          const { items, hiddenCount } = getCellRenderState(
            dayIdx,
            time,
            maxVisibleEventsPerCell
          );
          const hasEvents = items.length > 0;

          return (
            <div
              key={`${timeIdx}-${dayIdx}`}
              style={{
                backgroundColor: hasEvents
                  ? hexToRgba(
                      calendarColorById.get(items[0].event.calendarId || "primary") || "#3b82f6",
                      0.08
                    )
                  : "rgba(255,255,255,0.92)",
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
                opacity: creatingKey === cellKey ? 0.6 : 1,
                pointerEvents: creatingKey === cellKey ? "none" : "auto",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                overflow: "hidden",
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
                  : "rgba(255,255,255,0.92)";
              }}
              onClick={() => {
                void handleCellClick(dayIdx, time);
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
                      openEditModal(item.event);
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
                      color: "rgba(15,23,42,0.95)",
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
                    fontSize: "10px",
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
              onClick={goToPreviousWeek}
              style={{
                background: "rgba(255,255,255,0.45)",
                border: "none",
                borderRadius: "9999px",
                width: 30,
                height: 30,
                fontSize: "16px",
                fontWeight: 700,
                cursor: "pointer",
                color: "rgba(15,23,42,0.95)",
              }}
              title="Previous week"
            >
              ←
            </button>

            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 600 }}>
              {rangeLabel}
            </h2>

            <button
              onClick={goToNextWeek}
              style={{
                background: "rgba(255,255,255,0.45)",
                border: "none",
                borderRadius: "9999px",
                width: 30,
                height: 30,
                fontSize: "16px",
                fontWeight: 700,
                cursor: "pointer",
                color: "rgba(15,23,42,0.95)",
              }}
              title="Next week"
            >
              →
            </button>
          </div>
          

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isPopup && calendarConnectionStatus === "connected" && (
              <CalendarSelector
                calendars={calendars}
                selectedCalendarIds={selectedCalendarIds}
                loading={calendarsLoading}
                saving={calendarsSaving}
                onToggle={toggleCalendar}
                onSave={saveSelection}
              />
            )}
            
            <button
              onClick={handleRefreshCalendar}
              style={{
                background: "rgba(59,130,246,0.14)",
                border: "none",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: 600,
                cursor:
                  calendarRefreshBusy ||
                  calendarConnectionBusy ||
                  calendarConnectionStatus !== "connected"
                    ? "not-allowed"
                    : "pointer",
                padding: "8px 12px",
                color: "rgba(15, 23, 42, 0.95)",
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
              onClick={handleConnectCalendar}
              style={{
                background:
                  calendarConnectionStatus === "connected"
                    ? "rgba(34,197,94,0.22)"
                    : "rgba(59,130,246,0.2)",
                border: "none",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: 600,
                cursor:
                  calendarConnectionBusy || calendarConnectionStatus === "loading"
                    ? "not-allowed"
                    : "pointer",
                padding: "8px 12px",
                color: "rgba(15, 23, 42, 0.95)",
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
                onClick={onClose}
                style={{
                  background: "rgba(255,255,255,0.25)",
                  border: "none",
                  borderRadius: "9999px",
                  fontSize: "20px",
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
        onCancel={closeEditModal}
        onSave={saveEditModal}
        onDelete={deleteEditModal}
      />
    </>
  );
}
