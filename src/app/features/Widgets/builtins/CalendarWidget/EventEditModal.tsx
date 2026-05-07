import React, { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../../../providers/languageProvider";

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
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const startInputRef = useRef<HTMLInputElement | null>(null);
  const endInputRef = useRef<HTMLInputElement | null>(null);
  const deleteButtonRef = useRef<HTMLButtonElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const saveButtonRef = useRef<HTMLButtonElement | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (!open || !value) return;

    setStartAtInput(toNorwegianDateTime(value.startAt));
    setEndAtInput(toNorwegianDateTime(value.endAt));
  }, [open, value?.startAt, value?.endAt]);

  useEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    });

    return () => cancelAnimationFrame(frame);
  }, [open, value?.id]);

  if (!open || !value) return null;

  const isBusy = saving || deleting;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "8px 12px",
    borderRadius: 8,
    border: "1.5px solid rgba(0,0,0,0.15)",
    background: "rgba(255,255,255,0.8)",
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
    color: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    fontSize: 12,
    fontWeight: 600,
    color: "rgba(0,0,0,0.5)",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  };

  const handleTitleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    descriptionInputRef.current?.focus();
  };

  const handleDescriptionKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      startInputRef.current?.focus();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      titleInputRef.current?.focus();
    }
  };

  const handleStartKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      descriptionInputRef.current?.focus();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      saveButtonRef.current?.focus();
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      endInputRef.current?.focus();
    }
  };

  const handleEndKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      descriptionInputRef.current?.focus();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      startInputRef.current?.focus();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      saveButtonRef.current?.focus();
    }
  };

  const handleSaveButtonKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (event) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      startInputRef.current?.focus();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      cancelButtonRef.current?.focus();
    }
  };

  const handleCancelButtonKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (event) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      startInputRef.current?.focus();
      return;
    }

    if (event.key === "ArrowLeft") {
      if (value.id === "") return;
      event.preventDefault();
      deleteButtonRef.current?.focus();
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      saveButtonRef.current?.focus();
    }
  };

  const handleDeleteButtonKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (event) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      startInputRef.current?.focus();
      return;
    }

    if (event.key !== "ArrowRight") return;
    event.preventDefault();
    cancelButtonRef.current?.focus();
  };

  const handleDialogKeyDownCapture: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.key !== "Escape") return;

    event.preventDefault();
    event.stopPropagation();
    onCancel();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.32)",
        display: "grid",
        placeItems: "center",
        zIndex: 2500,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: 400,
          borderRadius: 20,
          padding: 28,
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.22)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
        onKeyDownCapture={handleDialogKeyDownCapture}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "rgba(0,0,0,0.85)" }}>
          {t("widgets.calendarWidget.eventEditModal.heading")}
        </h3>

        <label style={labelStyle}>
          {t("widgets.calendarWidget.eventEditModal.titleLabel")}
          <input
            ref={titleInputRef}
            value={value.title}
            onChange={(e) => onChange({ title: e.target.value })}
            onKeyDown={handleTitleKeyDown}
            placeholder={t("widgets.calendarWidget.eventEditModal.titlePlaceholder")}
            disabled={isBusy}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          {t("widgets.calendarWidget.eventEditModal.descriptionLabel")}
          <textarea
            ref={descriptionInputRef}
            value={value.description}
            onChange={(e) => onChange({ description: e.target.value })}
            onKeyDown={handleDescriptionKeyDown}
            placeholder={t("widgets.calendarWidget.eventEditModal.descriptionPlaceholder")}
            rows={3}
            disabled={isBusy}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={labelStyle}>
            {t("widgets.calendarWidget.eventEditModal.startLabel")}
            <input
              ref={startInputRef}
              type="text"
              value={startAtInput}
              onChange={(e) => {
                const nextValue = e.target.value;
                setStartAtInput(nextValue);
                const parsedValue = toLocalDateTime(nextValue);
                if (parsedValue) onChange({ startAt: parsedValue });
              }}
              onKeyDown={handleStartKeyDown}
              placeholder="dd.mm.åååå tt:mm"
              disabled={isBusy}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            {t("widgets.calendarWidget.eventEditModal.endLabel")}
            <input
              ref={endInputRef}
              type="text"
              value={endAtInput}
              onChange={(e) => {
                const nextValue = e.target.value;
                setEndAtInput(nextValue);
                const parsedValue = toLocalDateTime(nextValue);
                if (parsedValue) onChange({ endAt: parsedValue });
              }}
              onKeyDown={handleEndKeyDown}
              placeholder="dd.mm.åååå tt:mm"
              disabled={isBusy}
              style={inputStyle}
            />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 4 }}>
          {value.id !== "" ? (
            <button
              ref={deleteButtonRef}
              onClick={onDelete}
              onKeyDown={handleDeleteButtonKeyDown}
              disabled={isBusy}
              style={{
                padding: "9px 0",
                borderRadius: 10,
                border: "1.5px solid rgba(220,38,38,0.35)",
                background: "rgba(254,226,226,0.7)",
                color: "rgb(185,28,28)",
                fontWeight: 600,
                fontSize: 13,
                cursor: isBusy ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                opacity: isBusy ? 0.6 : 1,
              }}
            >
              {deleting
                ? t("widgets.calendarWidget.eventEditModal.deleting")
                : t("widgets.calendarWidget.eventEditModal.delete")}
            </button>
          ) : (
            <div />
          )}

          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            onKeyDown={handleCancelButtonKeyDown}
            disabled={isBusy}
            style={{
              padding: "9px 0",
              borderRadius: 10,
              border: "1.5px solid rgba(0,0,0,0.15)",
              background: "rgba(0,0,0,0.05)",
              color: "rgba(0,0,0,0.7)",
              fontWeight: 600,
              fontSize: 13,
              cursor: isBusy ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: isBusy ? 0.6 : 1,
            }}
          >
            {t("widgets.calendarWidget.eventEditModal.cancel")}
          </button>

          <button
            ref={saveButtonRef}
            onClick={onSave}
            onKeyDown={handleSaveButtonKeyDown}
            disabled={isBusy}
            style={{
              padding: "9px 0",
              borderRadius: 10,
              border: "none",
              background: "rgb(59,130,246)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 13,
              cursor: isBusy ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: isBusy ? 0.6 : 1,
            }}
          >
            {saving
              ? t("widgets.calendarWidget.eventEditModal.saving")
              : t("widgets.calendarWidget.eventEditModal.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
