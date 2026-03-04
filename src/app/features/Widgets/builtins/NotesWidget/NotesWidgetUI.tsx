import { useNotesWidget } from "./NotesWidgetLogic";

export default function NotesWidget() {
  const { state, actions } = useNotesWidget();

  return (
    <div
      style={{
        minWidth: 280,
        padding: 20,
        borderRadius: 20,
        background: "#e5e7eb",
        display: "flex",
        flexDirection: "column",
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
            background: "#e5e7eb",
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
    </div>
  );
}