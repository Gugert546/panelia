import { useNotesWidget } from "./NotesWidgetLogic";
import WidgetPane from "../../components/WidgetPane";

export default function NotesWidget() {
  const { state, actions } = useNotesWidget();

  return (
    <WidgetPane
      title=""
      style={{
        background: "#e5e7eb",   // ✅ grå widget
        backdropFilter: "none",  // ✅ fjern blur-glass
        boxShadow: "none",       // ✅ fjern shadow om du vil
        alignItems: "stretch",   // ✅ så innhold kan fylle bredden
      }}
    >
      <div style={{ position: "relative", width: "100%" }}>
        <button
  type="button"
  onClick={actions.clear}
  style={{
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "none",
    background: "#e5e7eb",   // 👈 endret
    cursor: "pointer",
    fontWeight: 700,
    zIndex: 1,
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
            height: 200,
            resize: "none",
            padding: 16,
            borderRadius: 16,
            border: "none",
            background: "transparent",
            outline: "none",
            fontSize: 16,
            boxSizing: "border-box",
          }}
        />
      </div>
    </WidgetPane>
  );
}