import { useWeatherWidget } from "./WeatherWidgetLogic";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";

export default function WeatherWidgetUI() {

  const { state } = useWeatherWidget();

  return (
    <WidgetContainer>
      <WidgetPane>

        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 6
          }}
        >

          {state.status === "loading" && <div>Henter vær...</div>}

          {state.status === "error" && (
            <div style={{ color: "#b91c1c" }}>
              {state.error}
            </div>
          )}

          {state.status === "success" && (
            <>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                {state.data.placeLabel}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10
                }}
              >

                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 900,
                    lineHeight: 1
                  }}
                >
                  {state.data.temperatureC}°
                </div>

                {state.data.symbolCode && (
                  <img
                    src={`/yr-icons/${state.data.symbolCode}.png`}
                    width={40}
                    height={40}
                  />
                )}

              </div>

              <div style={{ fontSize: 14 }}>
                Vind: {state.data.windSpeedMs ?? "—"} m/s
              </div>
            </>
          )}

        </div>

      </WidgetPane>
    </WidgetContainer>
  );
}