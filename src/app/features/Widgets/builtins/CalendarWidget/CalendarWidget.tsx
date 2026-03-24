import React, { useLayoutEffect, useMemo, useRef } from "react";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { useCalendarLogic } from "./calendarLogic";
import EventEditModal from "./EventEditModal";
import CalendarSelector from "./CalendarSelector";
import { useGoogleCalendars } from "./useGoogleCalendars"; // or ./useGoogleCalendars if you renamed
import { useFontSize } from "../../../../providers/themeProviders";

export type CalendarWidgetSizeMode = "small" | "medium" | "large" | "xlarge";
export type CalendarWidgetVariant = "popup" | "widget";

export type CalendarWidgetProps = {
  onClose?: () => void;
  leftOffset?: number;
  onConnectCalendar?: () => void;
  onDisconnectCalendar?: () => void;
  onRefreshCalendar?: () => void;
  calendarConnectionStatus?: "loading" | "connected" | "disconnected";
  calendarConnectionBusy?: boolean;
  calendarRefreshBusy?: boolean;
  sizeMode?: CalendarWidgetSizeMode;
  onSizeModeChange?: (mode: CalendarWidgetSizeMode) => void;
  variant?: CalendarWidgetVariant;
};

const SIZE_CONFIG: Record<
  CalendarWidgetSizeMode,
  {
    width: number;
    heightVh: number;
    dayCount: number;
    fromHour: number;
    toHour: number;
    cellHeight: number;
  }
> = {
  small: {
    width: 380,
    heightVh: 58,
    dayCount: 3,
    fromHour: 8,
    toHour: 18,
    cellHeight: 28,
  },
  medium: {
    width: 450,
    heightVh: 68,
    dayCount: 5,
    fromHour: 7,
    toHour: 21,
    cellHeight: 30,
  },
  large: {
    width: 510,
    heightVh: 76,
    dayCount: 6,
    fromHour: 6,
    toHour: 22,
    cellHeight: 32,
  },
  xlarge: {
    width: 560,
    heightVh: 82,
    dayCount: 7,
    fromHour: 6,
    toHour: 23,
    cellHeight: 34,
  },
};

const WEEK_WHEEL_THRESHOLD = 30;
const GRID_COLUMN_TIME_WIDTH = 56;
const MAX_VISIBLE_EVENTS_PER_CELL = 2;

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

export default function CalendarWidget({
  onClose,
  leftOffset = 80,
  onConnectCalendar,
  onDisconnectCalendar,
  onRefreshCalendar,
  calendarConnectionStatus = "disconnected",
  calendarConnectionBusy = false,
  calendarRefreshBusy = false,
  sizeMode = "xlarge",
  onSizeModeChange: _onSizeModeChange,
  variant = "popup",
}: CalendarWidgetProps) {
  const isPopup = variant === "popup";
  const config = SIZE_CONFIG[sizeMode];
  const { fontSize } = useFontSize();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const headerWheelDeltaRef = useRef(0);

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
    () => weekDays.slice(0, config.dayCount),
    [weekDays, config.dayCount]
  );

  const displayTimeSlots = useMemo(
    () =>
      isPopup
        ? timeSlots.filter(
            (slot) =>
              slotHour(slot) >= config.fromHour && slotHour(slot) < config.toHour
          )
        : timeSlots,
    [isPopup, timeSlots, config.fromHour, config.toHour]
  );

  const rangeLabel = useMemo(
    () => formatRangeLabel(displayWeekDays),
    [displayWeekDays]
  );

  const initialVisibleSlot = useMemo(
    () => (isPopup ? null : getInitialVisibleSlot(displayTimeSlots)),
    [isPopup, displayTimeSlots]
  );

  useLayoutEffect(() => {
    if (isPopup || !initialVisibleSlot || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;

    const scrollToCurrentHour = () => {
      const target = container.querySelector<HTMLElement>(
        `[data-time-slot="${initialVisibleSlot}"]`
      );

      if (!target) return;

      container.scrollTo({
        top: Math.max(0, target.offsetTop - config.cellHeight),
        behavior: "auto",
      });
    };

    const frameOne = requestAnimationFrame(() => {
      scrollToCurrentHour();
      requestAnimationFrame(scrollToCurrentHour);
    });

    return () => cancelAnimationFrame(frameOne);
  }, [isPopup, initialVisibleSlot, config.cellHeight, rangeLabel]);

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

  const gridTemplateColumns = `${GRID_COLUMN_TIME_WIDTH}px repeat(${displayWeekDays.length}, minmax(0, 1fr))`;

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
            MAX_VISIBLE_EVENTS_PER_CELL
          );
          const hasEvents = items.length > 0;

          return (
            <div
              key={`${timeIdx}-${dayIdx}`}
              style={{
                backgroundColor: hasEvents
                  ? "rgba(59,130,246,0.08)"
                  : "rgba(255,255,255,0.92)",
                borderLeft: hasEvents
                  ? "3px solid rgba(59,130,246,0.35)"
                  : "3px solid transparent",
                minHeight: `${config.cellHeight}px`,
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
                  ? "rgba(59,130,246,0.08)"
                  : "rgba(255,255,255,0.92)";
              }}
              onClick={() => {
                void handleCellClick(dayIdx, time);
              }}
            >
              {items.map((item) => {
                const laneTone = Math.max(0.16, 0.28 - item.lane * 0.04);

                return (
                  <div
                    key={item.event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(item.event);
                    }}
                    style={{
                      fontSize: item.isStart ? fontSize : fontSize - 2,
                      lineHeight: 1.15,
                      padding: item.isContinuation ? "1px 4px" : "2px 5px",
                      borderRadius: item.isStart
                        ? "6px 6px 4px 4px"
                        : item.isEnd
                          ? "4px 4px 6px 6px"
                          : "3px",
                      background: `rgba(59,130,246,${laneTone})`,
                      borderLeft: "2px solid rgba(59,130,246,0.6)",
                      color: "rgba(15,23,42,0.95)",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      cursor: "pointer",
                    }}
                    title={item.event.title || "Untitled event"}
                  >
                    {item.isStart ? item.event.title || "Untitled" : "…"}
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
            {/*{isPopup && (
              <select
                value={sizeMode}
                onChange={(e) =>
                  onSizeModeChange?.(e.target.value as CalendarWidgetSizeMode)
                }
                style={{
                  borderRadius: "9999px",
                  border: "none",
                  padding: "8px 10px",
                  background: "rgba(255,255,255,0.55)",
                  color: "rgba(15,23,42,0.95)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                title="Calendar size"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="xlarge">XLarge</option>
              </select>
            )}*/}
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
            style={{
              overflowY: "hidden",
              overflowX: "auto",
              width: "100%",
              flex: 1,
              minHeight: 0,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns,
                gap: "1px",
                backgroundColor: "rgba(255,255,255,0.32)",
                padding: "1px",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              {renderWeekHeader()}
              {renderTimeRows()}
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
                  display: "grid",
                  gridTemplateColumns,
                  gap: "1px",
                  backgroundColor: "rgba(255,255,255,0.32)",
                  padding: "1px",
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
            width: config.width,
            height: `${config.heightVh}vh`,
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
