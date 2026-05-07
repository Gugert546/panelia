import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchWidget } from "./SearchWidgetLogic";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { useWidgetInstance } from "../../components/WidgetInstanceContext";
import { useLanguage } from "../../../../providers/languageProvider";
import { useResolvedWidgetFontSize } from "../../hooks/useResolvedWidgetFontSize";

export default function SearchWidgetUI() {

  const { state, actions } = useSearchWidget();
  const widgetInstance = useWidgetInstance();
  const fontSize = useResolvedWidgetFontSize();
  const { t } = useLanguage();

  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const menuButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const engineEntries = Object.entries(state.engines);

  const focusMenuButtonAt = (index: number) => {
    const buttons = menuButtonRefs.current.filter(
      (button): button is HTMLButtonElement => Boolean(button && !button.disabled)
    );

    if (buttons.length === 0) return;

    const nextIndex = (index + buttons.length) % buttons.length;
    buttons[nextIndex]?.focus();
  };

  const focusStyleButton = () => {
    if (!widgetInstance?.widgetId) return false;

    const widgetRoot = document.querySelector(
      `[data-widget-id="${widgetInstance.widgetId}"]`
    );

    if (!(widgetRoot instanceof HTMLElement)) return false;

    const styleButton = widgetRoot.querySelector(
      "button.widget-style-btn:not([disabled])"
    ) as HTMLButtonElement | null;

    if (!styleButton) return false;

    styleButton.focus();
    return true;
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const hasSelection =
      input.selectionStart !== null &&
      input.selectionEnd !== null &&
      input.selectionStart !== input.selectionEnd;
    const caretAtStart =
      input.selectionStart !== null &&
      input.selectionEnd !== null &&
      input.selectionStart === input.selectionEnd &&
      input.selectionStart === 0;
    const caretAtEnd =
      input.selectionStart !== null &&
      input.selectionEnd !== null &&
      input.selectionStart === input.selectionEnd &&
      input.selectionEnd === input.value.length;

    if (event.key === "ArrowLeft" && !hasSelection && caretAtStart) {
      event.preventDefault();
      event.stopPropagation();
      buttonRef.current?.focus();
      return;
    }

    if (
      event.key === "ArrowUp" ||
      (event.key === "ArrowRight" && !hasSelection && caretAtEnd)
    ) {
      event.preventDefault();
      event.stopPropagation();

      if (!focusStyleButton()) {
        requestAnimationFrame(() => {
          focusStyleButton();
        });
      }
      return;
    }

    actions.handleKeyDown(event);
  };

  const handleEngineButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      event.stopPropagation();
      inputRef.current?.focus();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();

      if (!focusStyleButton()) {
        requestAnimationFrame(() => {
          focusStyleButton();
        });
      }
    }
  };

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

  useEffect(() => {
    if (!state.menuOpen) {
      menuButtonRefs.current = [];
      return;
    }

    const selectedIndex = engineEntries.findIndex(([key]) => key === state.engine);

    requestAnimationFrame(() => {
      const indexToFocus = selectedIndex >= 0 ? selectedIndex : 0;
      menuButtonRefs.current[indexToFocus]?.focus();
    });
  }, [state.menuOpen, state.engine, engineEntries]);

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const buttons = menuButtonRefs.current.filter(
      (button): button is HTMLButtonElement => Boolean(button && !button.disabled)
    );
    if (buttons.length === 0) return;

    const currentIndex = buttons.findIndex((button) => button === document.activeElement);

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      actions.closeMenu();
      requestAnimationFrame(() => {
        buttonRef.current?.focus();
      });
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      event.stopPropagation();

      const delta = event.shiftKey ? -1 : 1;
      const nextIndex = currentIndex === -1 ? 0 : currentIndex + delta;
      focusMenuButtonAt(nextIndex);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
      const nextIndex = currentIndex === -1 ? 0 : currentIndex + 1;
      focusMenuButtonAt(nextIndex);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      const nextIndex = currentIndex === -1 ? buttons.length - 1 : currentIndex - 1;
      focusMenuButtonAt(nextIndex);
      return;
    }
  };

  const handleChooseEngine = (key: keyof typeof state.engines) => {
    actions.chooseEngine(key as any);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

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
            position: "relative",
            borderRadius:12,
            paddingLeft:10
          }}
        >

          {/* Engine selector */}
          <div style={{ position: "relative" }}>
            <button
              ref={buttonRef}
              type="button"
              onClick={actions.toggleMenu}
              onKeyDown={handleEngineButtonKeyDown}
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
            ref={inputRef}
            type="text"
            placeholder={`${t('widgets.searchWidget.searchPlaceholder')} ${state.engineInfo.label}`}
            value={state.query}
            onChange={(e) => actions.setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            style={{
              flex: 1,
              border:"1px solid #0000004b",
              outline: "none",
              background: "#ffffff10",
              borderRadius:12,
              padding:10,
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
              onKeyDown={handleMenuKeyDown}
              style={{
                position: "fixed",
                top: rect.bottom + 6,
                left: rect.left,
                minWidth: 160,
                background: "rgba(20, 20, 20, 0.78)",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.35)",
                backdropFilter: "blur(8px)",
                color: "#fff",
                boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
                padding: 6,
                zIndex: 999999
              }}
            >

              {engineEntries.map(([key, cfg], index) => {

                const selected = key === state.engine;

                return (
                  <button
                    key={key}
                    ref={(element) => {
                      menuButtonRefs.current[index] = element;
                    }}
                    type="button"
                    onClick={() => handleChooseEngine(key as keyof typeof state.engines)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      textAlign: "left",
                      border: "none",
                      background: selected
                        ? "rgba(255,255,255,0.18)"
                        : "transparent",
                      color: "inherit",
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