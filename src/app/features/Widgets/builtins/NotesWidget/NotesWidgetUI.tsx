import { useNotesWidget } from "./NotesWidgetLogic";
import WidgetPane from "../../components/WidgetPane";

export default function NotesWidget() {
  const { state, actions } = useNotesWidget();

  return (
    <WidgetPane >
      <textarea
        value={state.text}
        onChange={(e) => actions.setText(e.target.value)}
        placeholder="Skriv notater her..."
        style={{
          width: "100%",
          minHeight: 120,
          resize: "vertical",
          padding: 10,
          borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.1)",
          background: "rgba(255,255,255,0.6)",
          outline: "none",
        }}
      />

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button
          type="button"
          onClick={actions.clear}
          style={{
            border: "none",
            borderRadius: 999,
            padding: "6px 10px",
            background: "rgba(255,255,255,0.6)",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Slett
        </button>
      </div>
    </WidgetPane>
  );
}