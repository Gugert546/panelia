import React, { useMemo } from "react";

type CalendarWidgetProps = {
  onClose?: () => void;
};

export default function CalendarWidget({ onClose }: CalendarWidgetProps) {
  // Get next 7 days starting from tomorrow
  const weekDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  }, []);

  // Generate time slots (6 AM to 11 PM)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 6; hour < 23; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
    }
    return slots;
  }, []);

  const formatDate = (date: Date) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return {
      day: days[date.getDay()],
      date: date.getDate(),
    };
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width: "900px",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(14px)",
        boxShadow: "-8px 0 24px rgba(0, 0, 0, 0.15)",
        zIndex: 1500,
        display: "flex",
        flexDirection: "column",
        padding: "20px",
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "600" }}>
          Next Week Schedule
        </h2>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            fontSize: "24px",
            cursor: "pointer",
            padding: "0",
            color: "rgba(0, 0, 0, 0.6)",
          }}
        >
          ✕
        </button>
      </div>

      {/* Calendar Grid */}
      <div style={{ overflowX: "auto", flex: 1 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `80px repeat(7, 1fr)`,
            gap: "1px",
            backgroundColor: "#e5e7eb",
            padding: "1px",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {/* Time header */}
          <div
            style={{
              backgroundColor: "#f9fafb",
              padding: "12px 8px",
              fontWeight: "600",
              fontSize: "12px",
              textAlign: "center",
              borderRight: "2px solid #d1d5db",
            }}
          >
            Time
          </div>

          {/* Day headers */}
          {weekDays.map((date, idx) => {
            const { day, date: dateNum } = formatDate(date);
            return (
              <div
                key={idx}
                style={{
                  backgroundColor: "#f9fafb",
                  padding: "12px 8px",
                  fontWeight: "600",
                  fontSize: "12px",
                  textAlign: "center",
                  borderBottom: "2px solid #d1d5db",
                }}
              >
                <div>{day}</div>
                <div style={{ fontSize: "14px", marginTop: "4px" }}>{dateNum}</div>
              </div>
            );
          })}

          {/* Time slots and cells */}
          {timeSlots.map((time, timeIdx) => (
            <React.Fragment key={timeIdx}>
              {/* Time label */}
              <div
                style={{
                  backgroundColor: "#f9fafb",
                  padding: "12px 8px",
                  fontSize: "12px",
                  fontWeight: "600",
                  textAlign: "center",
                  borderRight: "2px solid #d1d5db",
                }}
              >
                {time}
              </div>

              {/* Cells for each day */}
              {weekDays.map((_, dayIdx) => (
                <div
                  key={`${timeIdx}-${dayIdx}`}
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    minHeight: "50px",
                    padding: "8px",
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f0f9ff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                  }}
                  onClick={() => {
                    console.log(`Clicked: ${weekDays[dayIdx].toDateString()} at ${time}`);
                    // Future: Add event creation
                  }}
                />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
