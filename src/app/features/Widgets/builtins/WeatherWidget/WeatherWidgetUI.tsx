import { useWeatherWidget } from "./WeatherWidgetLogic";

export default function WeatherWidgetUI() {
  const { state, actions } = useWeatherWidget();

  return (
    <div
      style={{
        width: 320,
        borderRadius: 16,
        padding: 14,
        background: "rgba(255,255,255,0.35)",
        border: "1px solid rgba(255,255,255,0.35)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
        color: "#111",
      }}
    >
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

            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1 }}>
                {state.data.temperatureC}°
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.9 }}>
                {state.data.symbolCode ?? "—"}
              </div>
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
    </div>
  );
}