import { useRef } from "react";
import { useNotesWidget } from "./NotesWidgetLogic";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { useLanguage } from "../../../../providers/languageProvider";
import { useResolvedWidgetFontSize } from "../../hooks/useResolvedWidgetFontSize";

type NotesWidgetProps = {
  widgetId: string;
  onClose?: () => void;
};

export default function NotesWidget({ widgetId, onClose }: NotesWidgetProps) {

  const { state, actions } = useNotesWidget(widgetId);
  const fontSize = useResolvedWidgetFontSize();
  const { t } = useLanguage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <WidgetContainer>
      <WidgetPane>

        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column"
          }}
        >

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                e.stopPropagation();
                textareaRef.current?.focus();
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                e.stopPropagation();
                const widgetRoot = e.currentTarget.closest("[data-widget-id]");
                const lockButton = widgetRoot?.querySelector(
                  "button.widget-lock-btn:not([disabled])"
                ) as HTMLButtonElement | null;
                const styleButton = widgetRoot?.querySelector(
                  "button.widget-style-btn:not([disabled])"
                ) as HTMLButtonElement | null;
                (lockButton ?? styleButton)?.focus();
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                e.stopPropagation();
                textareaRef.current?.focus();
              }
            }}
            style={{
              position: "absolute",
              top: 15,
              right: 15,
              width: 26,
              height: 26,
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.4)",
              cursor: "pointer",
              fontWeight: 700,
              zIndex: 1
            }}
            aria-label={t('widgets.notesWidget.closeNote')}
          >
            ×
          </button>

          <textarea
            ref={textareaRef}
            className="notes-widget-textarea"
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") {
                e.preventDefault();
                e.stopPropagation();
                const widgetRoot = e.currentTarget.closest("[data-widget-id]");
                const lockButton = widgetRoot?.querySelector(
                  "button.widget-lock-btn:not([disabled])"
                ) as HTMLButtonElement | null;
                const styleButton = widgetRoot?.querySelector(
                  "button.widget-style-btn:not([disabled])"
                ) as HTMLButtonElement | null;
                (lockButton ?? styleButton)?.focus();
                return;
              }

              if (e.key === "ArrowRight") {
                const el = e.currentTarget;
                if (el.selectionStart === el.value.length && el.selectionEnd === el.value.length) {
                  e.preventDefault();
                  e.stopPropagation();
                  closeButtonRef.current?.focus();
                }
              }
            }}
            value={state.text}
            onChange={(e) => actions.setText(e.target.value)}
            placeholder={t('widgets.notesWidget.placeholder')}
            style={{
              width: "100%",
              height: "100%",
              resize: "none",
              padding: 15,
              borderRadius: 10,
              border: "1px solid #ffffff36",
              background: "#ffffff23",
              color: "inherit",
              outline: "none",
              fontSize,
              fontFamily: "inherit",
              boxSizing: "border-box",
              marginTop:8,
            }}
          />

        </div>

      </WidgetPane>
    </WidgetContainer>
  );
}
