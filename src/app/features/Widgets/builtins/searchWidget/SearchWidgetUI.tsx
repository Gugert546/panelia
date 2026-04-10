import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchWidget } from "./SearchWidgetLogic";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { useFontSize } from "../../../../providers/themeProviders";
import { useLanguage } from "../../../../providers/languageProvider";

export default function SearchWidgetUI() {

  const { state, actions } = useSearchWidget();
  const { fontSize } = useFontSize();
  const { t } = useLanguage();

  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {

    function onDocClick(e: MouseEvent) {

      if (!state.menuOpen) return;

      const el = menuRef.current;

      if (el && !el.contains(e.target as Node)) {
        actions.closeMenu();
      }

    }

    document.addEventListener("mousedown", onDocClick);

    return () => document.removeEventListener("mousedown", onDocClick);

  }, [state.menuOpen, actions]);

  const rect = buttonRef.current?.getBoundingClientRect();

  return (
    <WidgetContainer>
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
          <div style={{ position: "relative" }}>

            <button
              ref={buttonRef}
              type="button"
              onClick={actions.toggleMenu}
              aria-label={t('widgets.searchWidget.chooseEngine')}
              style={{
                border: "none",
                background: "transparent",
                padding: 0,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >

              <img
                src={state.engineInfo.icon}
                alt={state.engineInfo.label}
                style={{
                  width: 24,
                  height: 24,
                  objectFit: "contain"
                }}
              />

            </button>

          </div>

          {/* Search input */}

          <input
            type="text"
            placeholder={`${t('widgets.searchWidget.searchPlaceholder')} ${state.engineInfo.label}`}
            value={state.query}
            onChange={(e) => actions.setQuery(e.target.value)}
            onKeyDown={actions.handleKeyDown}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "#ffffff10",
              borderRadius:12,
              padding:8,
              fontSize,
              color: "inherit"
            }}
          />

        </div>

        {/* PORTAL DROPDOWN */}

        {state.menuOpen && rect &&
          createPortal(

            <div
              ref={menuRef}
              style={{
                position: "fixed",
                top: rect.bottom + 6,
                left: rect.left,
                minWidth: 160,
                background: "rgba(255,255,255,0.98)",
                borderRadius: 10,
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                padding: 6,
                zIndex: 999999
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
                      background: selected
                        ? "rgba(0,0,0,0.06)"
                        : "transparent",
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
                        objectFit: "contain"
                      }}
                    />

                    <span>{cfg.label}</span>

                  </button>
                );

              })}

            </div>,

            document.body
          )}

      </WidgetPane>
    </WidgetContainer>
  );
}