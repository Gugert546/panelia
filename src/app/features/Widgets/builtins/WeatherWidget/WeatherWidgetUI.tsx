import type { CSSProperties } from "react";
import { useWeatherWidget } from "./WeatherWidgetLogic";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { useFontSize } from "../../../../providers/themeProviders";
import { useLanguage } from "../../../../providers/languageProvider";

type WeatherVisualMode = "clear" | "cloudy" | "rain" | "fog" | "snow";
type WeatherCloudTone = "normal" | "rain" | "storm";


function getWeatherVisualMode(symbolCode?: string): WeatherVisualMode {
  const code = symbolCode?.toLowerCase() ?? "";

  if (code.includes("fog")) return "fog";
  if (code.includes("snow") || code.includes("sleet")) return "snow";
  if (code.includes("rain")) return "rain";
  if (code.includes("cloudy")) return "cloudy";
  if (code.includes("clear") || code.includes("fair")) return "clear";

  return "cloudy";
}

function getWeatherCloudTone(symbolCode?: string): WeatherCloudTone {
  const code = symbolCode?.toLowerCase() ?? "";

  if (code.includes("heavyrain") || code.includes("thunder")) return "storm";
  if (code.includes("rain")) return "rain";

  return "normal";
}

function WeatherAtmosphere({ mode, cloudTone }: { mode: WeatherVisualMode; cloudTone: WeatherCloudTone }) {
  const atmosphereClassName = `weather-widget-atmosphere weather-widget-atmosphere-${cloudTone}`;
  const topClouds = (
    <>
      <div className="weather-widget-cloud weather-widget-cloud-one" />
      <div className="weather-widget-cloud weather-widget-cloud-two" />
      <div className="weather-widget-cloud weather-widget-cloud-three" />
    </>
  );

  const rainDrops = Array.from({ length: 10 }, (_, index) => (
    <div
      key={index}
      className={`weather-widget-raindrop weather-widget-raindrop-${index + 1}`}
    />
  ));

  const snowFlakes = Array.from({ length: 12 }, (_, index) => (
    <div
      key={index}
      className={`weather-widget-snowflake weather-widget-snowflake-${index + 1}`}
    />
  ));

  if (mode === "rain") {
    return (
      <div className={atmosphereClassName} aria-hidden="true">
        {topClouds}
        <div className="weather-widget-rain-field weather-widget-rain-back">{rainDrops}</div>
        <div className="weather-widget-rain-field weather-widget-rain-front">{rainDrops}</div>
      </div>
    );
  }

  if (mode === "fog") {
    return (
      <div className={atmosphereClassName} aria-hidden="true">
        <div className="weather-widget-fog-band weather-widget-fog-top" />
        <div className="weather-widget-fog-band weather-widget-fog-middle" />
        <div className="weather-widget-fog-band weather-widget-fog-bottom" />
      </div>
    );
  }

  if (mode === "clear") {
    return (
      <div className={atmosphereClassName} aria-hidden="true">
        <div className="weather-widget-sun-glow" />
        <div className="weather-widget-sky-shimmer" />
      </div>
    );
  }

  if (mode === "snow") {
    return (
      <div className={atmosphereClassName} aria-hidden="true">
        {topClouds}
        <div className="weather-widget-snow-field weather-widget-snow-back">{snowFlakes}</div>
        <div className="weather-widget-snow-field weather-widget-snow-front">{snowFlakes}</div>
        <div className="weather-widget-snow-haze" />
      </div>
    );
  }

  return (
    <div className={atmosphereClassName} aria-hidden="true">
      {topClouds}
    </div>
  );
}

export default function WeatherWidgetUI() {
  const { state } = useWeatherWidget();
  const { fontSize } = useFontSize();
  const { t } = useLanguage();

  const debug = "clear"; // legg inn "debug ??" før "state.data?.symbolCode" i neste linje
  const resolvedSymbolCode = state.data?.symbolCode;
  const visualMode = state.status === "success"
    ? getWeatherVisualMode(resolvedSymbolCode)  
    : "cloudy";
  const cloudTone = state.status === "success"
    ? getWeatherCloudTone(resolvedSymbolCode)
    : "normal";

  const contentStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: "clamp(6px, 1.6cqw, 14px)",
  };

  return (
    <WidgetContainer>
      <WidgetPane>
        <div style={contentStyle}>

          {state.status === "loading" && <div>{t('widgets.weatherWidget.loading')}</div>}

          {state.status === "error" && (
            <div style={{ color: "#b91c1c" }}>
              {state.error}
            </div>
          )}

          {state.status === "success" && (
            <div
              style={{
                position: "relative",
                flex: 1,
                minHeight: 0,
                display: "flex",
                alignItems: "stretch",
                containerType: "inline-size",
              }}
            >
              <WeatherAtmosphere mode={visualMode} cloudTone={cloudTone} />

              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: "clamp(6px, 1.8cqw, 16px)",
                }}
              >
                <div style={{ fontSize: "clamp(12px, 4.2cqw, 22px)", opacity: 0.8 }}>
                  {state.data.placeLabel}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "clamp(10px, 3cqw, 20px)"
                  }}
                >

                  <div
                    style={{
                      fontSize: "clamp(36px, 14cqw, 88px)",
                      fontWeight: 900,
                      lineHeight: 1
                    }}
                  >
                    {state.data.temperatureC}°
                  </div>

                  {state.data.symbolCode && (
                    <img
                      src={`/yr-icons/${state.data.symbolCode}.png`}
                      width={64}
                      height={64}
                      style={{
                        width: "clamp(40px, 12cqw, 72px)",
                        height: "clamp(40px, 12cqw, 72px)",
                      }}
                      alt=""
                    />
                  )}

                </div>

                <div style={{ fontSize: `clamp(${fontSize}px, 4.6cqw, ${Math.round(fontSize * 1.8)}px)` }}>
                  {t('widgets.weatherWidget.wind')}: {state.data.windSpeedMs ?? "—"} m/s
                </div>
              </div>
            </div>
          )}

        </div>

      </WidgetPane>
    </WidgetContainer>
  );
}
