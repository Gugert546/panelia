import { useState, type FormEvent } from "react";
import type { WidgetComponentProps } from "../WidgetRegistry";

type Props = WidgetComponentProps & {
  onRemove?: () => void;
};

export function GoogleSearchWidget({ onRemove }: Props) {
  const [query, setQuery] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    const url = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <form onSubmit={submit} className="google-search-widget">
      {/* Hamburger (klikkbar, gjør ingenting ennå) */}
      <button
        type="button"
        className="gs-menu-btn"
        aria-label="Meny"
        onClick={() => {
          // TODO: åpne meny senere
        }}
      >
        <span className="gs-menu-icon" aria-hidden="true" />
      </button>

      <input
        type="text"
        placeholder="Søk på Google"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <button type="submit" className="gs-icon-btn" aria-label="Søk">
        🔍
      </button>

      {onRemove && (
        <button
          type="button"
          className="gs-close-btn"
          onClick={onRemove}
          aria-label="Fjern widget"
        >
          ✕
        </button>
      )}
    </form>
  );
}
