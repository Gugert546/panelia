import { useMemo, useState } from "react";
import type { CalendarMeta } from "../../../../../types/firestore";

type Props = {
  calendars: CalendarMeta[];
  selectedCalendarIds: string[];
  fontSize: number;
  loading?: boolean;
  saving?: boolean;
  onToggle: (calendarId: string) => void;
  onSave: () => Promise<unknown> | void;
};

export default function CalendarSelector({
  calendars,
  selectedCalendarIds,
  fontSize,
  loading = false,
  saving = false,
  onToggle,
  onSave,
}: Props) {
  const [open, setOpen] = useState(false);
  const controlFontSize = Math.max(fontSize - 1, 12);
  const menuTitleFontSize = Math.max(fontSize, 12);

  const sortedCalendars = useMemo(
    () =>
      [...calendars].sort((a, b) => {
        if (a.primary && !b.primary) return -1;
        if (!a.primary && b.primary) return 1;
        return a.summary.localeCompare(b.summary);
      }),
    [calendars]
  );

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={loading || saving}
        style={{
          borderRadius: "9999px",
          border: "none",
          padding: "8px 12px",
          background: "rgba(255,255,255,0.55)",
          color: "rgba(15,23,42,0.95)",
          fontSize: controlFontSize,
          fontWeight: 600,
          cursor: loading || saving ? "not-allowed" : "pointer",
          opacity: loading || saving ? 0.7 : 1,
        }}
      >
        {saving ? "Saving..." : "Calendars"}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "110%",
            right: 0,
            width: 260,
            maxHeight: 320,
            overflowY: "auto",
            background: "rgba(255,255,255,0.98)",
            borderRadius: 12,
            boxShadow: "0 12px 28px rgba(15,23,42,0.18)",
            padding: 10,
            zIndex: 2000,
          }}
        >
          <div style={{ fontSize: menuTitleFontSize, fontWeight: 700, marginBottom: 8 }}>
            Show calendars
          </div>

          {sortedCalendars.map((calendar) => {
            const checked = selectedCalendarIds.includes(calendar.id);
            return (
              <label
                key={calendar.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 4px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(calendar.id)}
                />
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "9999px",
                    background: calendar.backgroundColor || "#1a73e8",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: controlFontSize, color: "rgba(15,23,42,0.95)" }}>
                  {calendar.summary}
                </span>
              </label>
            );
          })}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <button
              type="button"
              onClick={async () => {
                await onSave();
                setOpen(false);
              }}
              disabled={saving}
              style={{
                borderRadius: "9999px",
                border: "none",
                padding: "7px 12px",
                fontSize: controlFontSize,
                fontWeight: 600,
                background: "rgba(59,130,246,0.18)",
                color: "rgba(15,23,42,0.95)",
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
