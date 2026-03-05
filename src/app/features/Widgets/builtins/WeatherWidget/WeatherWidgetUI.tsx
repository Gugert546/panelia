import { useWeatherWidget } from "./WeatherWidgetLogic";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";

type WidgetSize = "small" | "medium" | "large" | "wide";

type Props = {
  size: WidgetSize;
};

export default function WeatherWidgetUI({ size }: Props) {
  const { state } = useWeatherWidget();

  const tempSize =
    size === "small" ? 28 :
    size === "medium" ? 36 :
    size === "large" ? 48 :
    36;

  const iconSize =
    size === "small" ? 28 :
    size === "medium" ? 36 :
    size === "large" ? 44 :
    36;

  return (
    <WidgetContainer size={size}>
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
            <div style={{ color: "#b91c1c" }}>{state.error}</div>
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
                    fontSize: tempSize,
                    fontWeight: 900,
                    lineHeight: 1
                  }}
                >
                  {state.data.temperatureC}°
                </div>

                {state.data.symbolCode ? (
                  <img
                    src={`/yr-icons/${state.data.symbolCode}.png`}
                    alt={state.data.symbolCode}
                    width={iconSize}
                    height={iconSize}
                    style={{ display: "block" }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <span>—</span>
                )}
              </div>

              {size !== "small" && (
                <div style={{ fontSize: 14, opacity: 0.9 }}>
                  Vind: {state.data.windSpeedMs ?? "—"} m/s
                </div>
              )}

              {size === "large" && (
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Oppdatert:{" "}
                  {new Date(state.data.updatedAtISO).toLocaleTimeString()}
                </div>
              )}
            </>
          )}
        </div>
      </WidgetPane>
    </WidgetContainer>
  );
}