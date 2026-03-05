import { useEffect, useRef } from "react";
import { useSearchWidget } from "./SearchWidgetLogic";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";

type WidgetSize = "small" | "medium" | "large" | "wide";

type Props = {
  size: WidgetSize;
};

export default function SearchWidgetUI({ size }: Props) {
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

  const iconSize =
    size === "small" ? 20 :
    size === "medium" ? 24 :
    28;

  const fontSize =
    size === "small" ? 12 :
    size === "medium" ? 14 :
    16;

  return (
    <WidgetContainer size={size}>
      <WidgetPane>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            height: "100%",
            position: "relative"
          }}
        >

          {/* Engine selector */}
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
                  width: iconSize,
                  height: iconSize,
                  objectFit: "contain",
                }}
              />
            </button>

            {state.menuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: 30,
                  left: 0,
                  minWidth: 160,
                  background: "rgba(255,255,255,0.95)",
                  borderRadius: 10,
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
                        padding: "8px 8px",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontWeight: selected ? 700 : 600,
                        fontSize
                      }}
                    >
                      <img
                        src={cfg.icon}
                        alt={cfg.label}
                        style={{
                          width: 16,
                          height: 16,
                          objectFit: "contain",
                        }}
                      />
                      <span>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Search input */}
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
              fontSize,
              color: "#111",
            }}
          />

        </div>

      </WidgetPane>
    </WidgetContainer>
  );
}