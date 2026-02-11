import { useMemo, useState, useEffect } from "react";
import Calendar from "react-calendar";
import type { WidgetComponentProps } from "../WidgetRegistry";

type CalendarConfig = {
  selectedDate?: string; // YYYY-MM-DD
  notesByDate?: Record<string, string>; // { "2026-02-06": "..." }
};

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CalendarWidget({ config, onConfigChange }: WidgetComponentProps) {
  const cfg = (config ?? {}) as CalendarConfig;

  const selected = cfg.selectedDate ? new Date(cfg.selectedDate) : new Date();
  const selectedISO = toISODate(selected);

  const notesByDate = cfg.notesByDate ?? {};
  const existingNote = notesByDate[selectedISO] ?? "";

  // Lokal tekst i input (så du kan skrive uten at hvert tastetrykk spammer config hvis du vil)
  const [draft, setDraft] = useState(existingNote);

  // Når du bytter dato, oppdater draft til notatet for den datoen
  useEffect(() => {
    setDraft(existingNote);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedISO]);

  function setSelectedDate(d: Date) {
    onConfigChange({ selectedDate: toISODate(d) });
  }

  function saveNote() {
    const t = draft.trim();

    // Tom tekst = slett notat
    if (!t) {
      if (!notesByDate[selectedISO]) return;
      const { [selectedISO]: _, ...rest } = notesByDate;
      onConfigChange({ notesByDate: rest });
      return;
    }

    onConfigChange({
      notesByDate: {
        ...notesByDate,
        [selectedISO]: t,
      },
    });
  }

  function deleteNote() {
    if (!notesByDate[selectedISO]) return;
    const { [selectedISO]: _, ...rest } = notesByDate;
    onConfigChange({ notesByDate: rest });
    setDraft("");
  }

  // Highlight datoer med notat
  const tileClassName = useMemo(() => {
    return ({ date, view }: { date: Date; view: string }) => {
      if (view !== "month") return "";
      const iso = toISODate(date);
      const hasNote = (notesByDate[iso] ?? "").trim().length > 0;
      return hasNote ? "has-note" : "";
    };
  }, [notesByDate]);

  // (Valgfritt) Autosave mens du skriver (kommentér inn om du vil)
  // useEffect(() => {
  //   const t = setTimeout(() => saveNote(), 400);
  //   return () => clearTimeout(t);
  // }, [draft]);

  const hasSavedNote = (notesByDate[selectedISO] ?? "").trim().length > 0;

  return (
    <div className="calendar-widget" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="calendar-surface">
        <Calendar
          value={selected}
          onChange={(v) => setSelectedDate(v as Date)}
          tileClassName={tileClassName}
        />
      </div>

      <div style={{ fontWeight: 600 }}>Notat for {selectedISO}</div>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Skriv notat for denne datoen…"
        style={{ width: "100%", minHeight: 110, padding: 8, resize: "vertical" }}
      />

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={saveNote}>
          {hasSavedNote ? "Oppdater notat" : "Lagre notat"}
        </button>

        <button type="button" onClick={deleteNote} disabled={!hasSavedNote}>
          Slett
        </button>

        <div style={{ marginLeft: "auto", opacity: 0.7, fontSize: 12 }}>
          {hasSavedNote ? "Har lagret notat" : "Ingen lagret notat"}
        </div>
      </div>
    </div>
  );
}