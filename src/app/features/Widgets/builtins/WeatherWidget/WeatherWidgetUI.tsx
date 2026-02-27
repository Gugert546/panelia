import { useWeatherWidget } from "./WeatherWidgetLogic";
import WidgetPane from "../../components/WidgetPane"; // samme som NewsWidget

export default function WeatherWidgetUI() {
  const { state, actions } = useWeatherWidget();

  return (
    <WidgetPane title="Vær">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 800 }}>Vær</div>

        <button
          type="button"
          onClick={actions.refresh}
          style={{
            border: "none",
            borderRadius: 999,
            padding: "6px 10px",
            background: "rgba(255,255,255,0.6)",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Oppdater
        </button>
      </div>

      <div style={{ marginTop: 10 }}>
        {state.status === "loading" && <div>Henter vær...</div>}

        {state.status === "error" && (
          <div style={{ color: "#b91c1c" }}>{state.error}</div>
        )}

        {state.status === "success" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{state.data.placeLabel}</div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1 }}>
                {state.data.temperatureC}°
              </div>

              {state.data.symbolCode ? (
                <img
                  src={`/yr-icons/${state.data.symbolCode}.png`}
                  alt={state.data.symbolCode}
                  width={40}
                  height={40}
                  style={{ display: "block" }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <span>—</span>
              )}
            </div>

            <div style={{ fontSize: 14, opacity: 0.9 }}>
              Vind: {state.data.windSpeedMs ?? "—"} m/s
            </div>

            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Oppdatert: {new Date(state.data.updatedAtISO).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>
    </WidgetPane>
  );
}