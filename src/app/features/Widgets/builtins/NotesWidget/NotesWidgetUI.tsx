import { useNotesWidget } from "./NotesWidgetLogic";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";

type NotesWidgetProps = {
  widgetId: string;
  onClose?: () => void;
};

export default function NotesWidget({ widgetId, onClose }: NotesWidgetProps) {

  const { state, actions } = useNotesWidget(widgetId);

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
            aria-label="Lukk notat"
          >
            ×
          </button>

          <textarea
            value={state.text}
            onChange={(e) => actions.setText(e.target.value)}
            placeholder="Skriv notater her..."
            style={{
              width: "100%",
              height: "100%",
              resize: "none",
              padding: 12,
              borderRadius: 12,
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: 14,
              boxSizing: "border-box"
            }}
          />

        </div>

      </WidgetPane>
    </WidgetContainer>
  );
}