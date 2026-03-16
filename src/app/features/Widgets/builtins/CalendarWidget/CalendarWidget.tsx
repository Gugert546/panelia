import React, { useMemo } from "react";
import WidgetPane from "../../components/WidgetPane";
import { useCalendarLogic } from "./calendarLogic";
import EventEditModal from "./EventEditModal";
import { useFontSize } from "../../../../providers/themeProviders";

export type CalendarWidgetSizeMode = "small" | "medium" | "large" | "xlarge";

type CalendarWidgetProps = {
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

function slotHour(slot: string) {
  return Number(slot.split(":")[0]);
}


function formatRangeLabel(days: Date[]) {
  if (!days.length) return "Plan";

  const first = days[0];
  const last = days[days.length - 1];

  const sameMonth = first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear();

  if (sameMonth) {
    const month = first.toLocaleDateString("nb-NO", { month: "long" });
    return `${first.getDate()}.–${last.getDate()}. ${month}`;
  }

  const firstLabel = first.toLocaleDateString("nb-NO", { day: "numeric", month: "long" });
  const lastLabel = last.toLocaleDateString("nb-NO", { day: "numeric", month: "long" });
  return `${firstLabel} – ${lastLabel}`;
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
  onSizeModeChange,
}: CalendarWidgetProps) {
  const config = SIZE_CONFIG[sizeMode];
  const { fontSize } = useFontSize();

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

  const refreshButtonLabel = calendarRefreshBusy ? "Refreshing..." : "Refresh from Google";

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
  } = useCalendarLogic();

  const displayWeekDays = useMemo(() => weekDays.slice(0, config.dayCount), [weekDays, config.dayCount]);
  const displayTimeSlots = useMemo(
    () => timeSlots.filter((slot) => slotHour(slot) >= config.fromHour && slotHour(slot) < config.toHour),
    [timeSlots, config.fromHour, config.toHour]
  );

  const rangeLabel = useMemo(() => formatRangeLabel(displayWeekDays), [displayWeekDays]);

  return (
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
        <WidgetPane>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: 8 }}>
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
              <select
                value={sizeMode}
                onChange={(e) => onSizeModeChange?.(e.target.value as CalendarWidgetSizeMode)}
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
                  cursor: calendarConnectionBusy || calendarConnectionStatus === "loading" ? "not-allowed" : "pointer",
                  padding: "8px 12px",
                  color: "rgba(15, 23, 42, 0.95)",
                  opacity: calendarConnectionBusy || calendarConnectionStatus === "loading" ? 0.7 : 1,
                }}
                disabled={calendarConnectionBusy || calendarConnectionStatus === "loading"}
              >
                {connectButtonLabel}
              </button>

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
            </div>
          </div>

          <div style={{ overflow: "auto", maxHeight: `calc(${config.heightVh}vh - 110px)`, width: "100%" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `56px repeat(${displayWeekDays.length}, minmax(0, 1fr))`,
                gap: "1px",
                backgroundColor: "rgba(255,255,255,0.32)",
                padding: "1px",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
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
                    key={idx}
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

              {displayTimeSlots.map((time, timeIdx) => (
                <React.Fragment key={timeIdx}>
                  <div
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
                    const { primaryEvent, isStart, isEnd, isContinuation } = getCellRenderState(dayIdx, time);

                    return (
                      <div
                        key={`${timeIdx}-${dayIdx}`}
                        style={{
                          backgroundColor: primaryEvent ? "rgba(59,130,246,0.14)" : "rgba(255,255,255,0.92)",
                          borderLeft: primaryEvent ? "3px solid rgba(59,130,246,0.45)" : "3px solid transparent",
                          borderTopLeftRadius: isStart ? "8px" : "0px",
                          borderTopRightRadius: isStart ? "8px" : "0px",
                          borderBottomLeftRadius: isEnd ? "8px" : "0px",
                          borderBottomRightRadius: isEnd ? "8px" : "0px",
                          minHeight: `${config.cellHeight}px`,
                          padding: "4px",
                          cursor: calendarConnectionBusy || calendarConnectionStatus === "loading" ? "not-allowed" : "pointer",
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
                          e.currentTarget.style.backgroundColor = primaryEvent ? "rgba(59,130,246,0.14)" : "rgba(255,255,255,0.92)";
                        }}
                        onClick={() => {
                          void handleCellClick(dayIdx, time);
                        }}
                      >
                        {primaryEvent && isStart && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(primaryEvent);
                            }}
                            style={{
                              fontSize,
                              lineHeight: 1.2,
                              padding: "2px 5px",
                              borderRadius: "5px",
                              background: "rgba(59,130,246,0.28)",
                              color: "rgba(15,23,42,0.95)",
                              whiteSpace: "nowrap",
                              textOverflow: "ellipsis",
                              overflow: "hidden",
                            }}
                            title={primaryEvent.title}
                          >
                            {primaryEvent.title}
                          </div>
                        )}
                        {primaryEvent && isContinuation && (
                          <div
                            style={{
                              fontSize: fontSize - 2,
                              lineHeight: 1.2,
                              padding: "2px 4px",
                              borderRadius: "4px",
                              background: "rgba(59,130,246,0.25)",
                              color: "rgba(15,23,42,0.95)",
                              whiteSpace: "nowrap",
                              textOverflow: "ellipsis",
                              overflow: "hidden",
                            }}
                            title="Continuation of event"
                          >
                            ...
                          </div>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </WidgetPane>
      </div>
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
    </div>
  );
}
