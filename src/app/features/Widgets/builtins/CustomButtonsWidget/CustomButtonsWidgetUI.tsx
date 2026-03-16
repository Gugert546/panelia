import WidgetPane from "../../components/WidgetPane";
import { useCustomButtonsWidget } from "./CustomButtonsWidgetLogic";

export default function CustomButtonsWidgetUI() {
  const { state, actions } = useCustomButtonsWidget();

  return (
    <WidgetPane title="Egne knapper">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <input
          type="text"
          placeholder="Knappenavn"
          value={state.label}
          onChange={(e) => actions.setLabel(e.target.value)}
          style={{
            padding: 8,
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />

        <input
          type="text"
          placeholder="Lenke"
          value={state.url}
          onChange={(e) => actions.setUrl(e.target.value)}
          style={{
            padding: 8,
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />

        <button
          type="button"
          onClick={actions.addButton}
          style={{
            padding: 8,
            borderRadius: 8,
            border: "none",
            background: "#cde8ff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Legg til
        </button>


      </div>
    </WidgetPane>
  );
}