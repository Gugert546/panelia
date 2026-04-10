import { useNotesWidget } from "./NotesWidgetLogic";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { useFontSize } from "../../../../providers/themeProviders";
import { useLanguage } from "../../../../providers/languageProvider";

type NotesWidgetProps = {
  widgetId: string;
  onClose?: () => void;
};

export default function NotesWidget({ widgetId, onClose }: NotesWidgetProps) {

  const { state, actions } = useNotesWidget(widgetId);
  const { fontSize } = useFontSize();
  const { t } = useLanguage();

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
            type="button"
            onClick={onClose}
            style={{
              position: "absolute",
              top: 6,
              right: 6,
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
            className="notes-widget-textarea"
            value={state.text}
            onChange={(e) => actions.setText(e.target.value)}
            placeholder={t('widgets.notesWidget.placeholder')}
            style={{
              width: "100%",
              height: "100%",
              resize: "none",
              padding: 12,
              borderRadius: 12,
              border: "none",
              background: "transparent",
              color: "inherit",
              outline: "none",
              fontSize,
              fontFamily: "inherit",
              boxSizing: "border-box"
            }}
          />

        </div>

      </WidgetPane>
    </WidgetContainer>
  );
}
