import { useNotesWidget } from "./NotesWidgetLogic";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";

type WidgetSize = "small" | "medium" | "large" | "wide";

type Props = {
  size: WidgetSize;
};

export default function NotesWidget({ size }: Props) {
  const { state, actions } = useNotesWidget();

  const fontSize =
    size === "small" ? 12 :
    size === "medium" ? 14 :
    16;

  return (
    <WidgetContainer size={size}>
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
            onClick={actions.clear}
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
              fontSize,
              boxSizing: "border-box"
            }}
          />

        </div>

      </WidgetPane>
    </WidgetContainer>
  );
}