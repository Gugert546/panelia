import { useEffect, useRef } from "react";
import { useSearchWidget } from "./SearchWidgetLogic";

export default function SearchWidgetUI() {
  const { state, actions } = useSearchWidget();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!state.menuOpen) return;
      const el = menuRef.current;
      if (el && !el.contains(e.target as Node)) actions.closeMenu();
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [state.menuOpen, actions]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "min(750px, 100vw)",
        background: "rgba(255,255,255,0.35)",
        borderRadius: 999,
        padding: "12px 16px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
        border: "1px solid rgba(255,255,255,0.35)",
        backdropFilter: "blur(12px)",
        position: "relative",
      }}
    >
      {/* Logo + dropdown */}
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          type="button"
          onClick={actions.toggleMenu}
          aria-label="Velg søkemotor"
          style={{
            border: "none",
            background: "transparent",
            padding: 0,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={state.engineInfo.icon}
            alt={state.engineInfo.label}
            style={{
              width: 38,
              height: 30,
              objectFit: "contain",
              display: "block",
              opacity: 0.95,
            }}
          />
        </button>

        {state.menuOpen && (
          <div
            style={{
              position: "absolute",
              top: 40,
              left: 0,
              minWidth: 180,
              background: "rgba(255,255,255,0.95)",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 12,
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
              padding: 6,
              zIndex: 50,
            }}
          >
            {Object.entries(state.engines).map(([key, cfg]) => {
              const selected = key === state.engine;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => actions.chooseEngine(key as any)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    textAlign: "left",
                    border: "none",
                    background: selected ? "rgba(0,0,0,0.06)" : "transparent",
                    padding: "10px 10px",
                    borderRadius: 10,
                    cursor: "pointer",
                    fontWeight: selected ? 700 : 600,
                  }}
                >
                  <img
                    src={cfg.icon}
                    alt={cfg.label}
                    style={{
                      width: 18,
                      height: 18,
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Input */}
      <input
        type="text"
        placeholder={`Søk med ${state.engineInfo.label}`}
        value={state.query}
        onChange={(e) => actions.setQuery(e.target.value)}
        onKeyDown={actions.handleKeyDown}
        style={{
          flex: 1,
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: 15,
          color: "#111",
          opacity: 0.9,
        }}
      />

      {/* Søk-knapp */}
      <button
        type="button"
        aria-label="Søk"
        onClick={actions.search}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          padding: 0,
          opacity: 0.9,
        }}
      >
      </button>
    </div>
  );
}