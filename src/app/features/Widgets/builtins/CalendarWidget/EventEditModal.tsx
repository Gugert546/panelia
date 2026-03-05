import { useEffect, useState } from "react";

type EventFormState = {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
};

type EventEditModalProps = {
  open: boolean;
  value: EventFormState | null;
  saving: boolean;
  deleting: boolean;
  onChange: (patch: Partial<EventFormState>) => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
};

function toNorwegianDateTime(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return "";

  const [, year, month, day, hour, minute] = match;
  return `${day}.${month}.${year} ${hour}:${minute}`;
}

function toLocalDateTime(value: string) {
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, day, month, year, hour, minute] = match;
  const localValue = `${year}-${month}-${day}T${hour}:${minute}`;
  const parsed = new Date(localValue);

  if (Number.isNaN(parsed.getTime())) return null;

  if (
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() + 1 !== Number(month) ||
    parsed.getDate() !== Number(day) ||
    parsed.getHours() !== Number(hour) ||
    parsed.getMinutes() !== Number(minute)
  ) {
    return null;
  }

  return localValue;
}

export default function EventEditModal({
  open,
  value,
  saving,
  deleting,
  onChange,
  onCancel,
  onSave,
  onDelete,
}: EventEditModalProps) {
  const [startAtInput, setStartAtInput] = useState("");
  const [endAtInput, setEndAtInput] = useState("");

  useEffect(() => {
    if (!open || !value) return;

    setStartAtInput(toNorwegianDateTime(value.startAt));
    setEndAtInput(toNorwegianDateTime(value.endAt));
  }, [open, value?.startAt, value?.endAt]);

  if (!open || !value) return null;

  const isBusy = saving || deleting;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.28)",
        display: "grid",
        placeItems: "center",
        zIndex: 2500,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: 360,
          borderRadius: 16,
          padding: 16,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: 0 }}>Edit event</h3>

        <input
          value={value.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Title"
          disabled={isBusy}
        />

        <textarea
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Description"
          rows={3}
          disabled={isBusy}
        />

        <label>
          Start
          <input
            type="text"
            value={startAtInput}
            onChange={(e) => {
              const nextValue = e.target.value;
              setStartAtInput(nextValue);

              const parsedValue = toLocalDateTime(nextValue);
              if (parsedValue) onChange({ startAt: parsedValue });
            }}
            placeholder="dd.mm.åååå tt:mm"
            disabled={isBusy}
          />
        </label>

        <label>
          End
          <input
            type="text"
            value={endAtInput}
            onChange={(e) => {
              const nextValue = e.target.value;
              setEndAtInput(nextValue);

              const parsedValue = toLocalDateTime(nextValue);
              if (parsedValue) onChange({ endAt: parsedValue });
            }}
            placeholder="dd.mm.åååå tt:mm"
            disabled={isBusy}
          />
        </label>

        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          <button onClick={onDelete} disabled={isBusy}>
            {deleting ? "Deleting..." : "Delete"}
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onCancel} disabled={isBusy}>Cancel</button>
            <button onClick={onSave} disabled={isBusy}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
