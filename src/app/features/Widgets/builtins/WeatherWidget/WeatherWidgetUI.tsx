import { useEffect, useState, type CSSProperties } from "react";
import { useWeatherWidget } from "./WeatherWidgetLogic";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { useWidgetInstance } from "../../components/WidgetInstanceContext";
import { useLanguage } from "../../../../providers/languageProvider";
import { useResolvedWidgetFontSize } from "../../hooks/useResolvedWidgetFontSize";
import {
  getWeatherCloudTone,
  getWeatherVisualMode,
  type WeatherCloudTone,
  type WeatherVisualMode,
} from "./weatherVisuals";

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
  const { state, actions } = useWeatherWidget();
  const widgetInstance = useWidgetInstance();
  const fontSize = useResolvedWidgetFontSize();
  const weatherControlIconSize = Math.max(fontSize, 14);
  const weatherControlIconMaxSize = Math.max(fontSize + 4, 18);
  const locationFontSize = Math.max(fontSize - 2, 12);
  const locationFontMaxSize = Math.max(Math.round(fontSize * 1.6), 22);
  const temperatureFontSize = Math.max(Math.round(fontSize * 2.6), 36);
  const temperatureFontMaxSize = Math.max(Math.round(fontSize * 5.5), 88);
  const { t } = useLanguage();
  const [humidityIsEnabled, setHumidityIsEnabled] = useState(false);
  const [windIsEnabled, setWindIsEnabled] = useState(false);
  const [uvIsEnabled, setUvIsEnabled] = useState(false);
  const [isPointerOverWidget, setIsPointerOverWidget] = useState(false);
  const [isFocusWithinWidget, setIsFocusWithinWidget] = useState(false);

  const controlsAreVisible = isPointerOverWidget || isFocusWithinWidget;

  useEffect(() => {
    const widgetId = widgetInstance?.widgetId;
    if (!widgetId) return;

    const selector = `[data-widget-id="${widgetId}"]`;
    const isInsideWidgetRoot = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false;
      const widgetRoot = document.querySelector(selector);
      return Boolean(widgetRoot?.contains(target));
    };

    const handleFocusIn = (event: Event) => {
      if (isInsideWidgetRoot(event.target)) {
        setIsFocusWithinWidget(true);
      }
    };

    const handleFocusOut = (event: Event) => {
      if (!isInsideWidgetRoot(event.target)) return;
      const nextTarget = (event as globalThis.FocusEvent).relatedTarget;
      if (isInsideWidgetRoot(nextTarget)) return;
      setIsFocusWithinWidget(false);
    };

    if (isInsideWidgetRoot(document.activeElement)) {
      setIsFocusWithinWidget(true);
    }

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, [widgetInstance?.widgetId]);

  //const debug = "clear"; // legg inn "debug ??" før "state.data?.symbolCode" i neste linje
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
            <div
              style={{
                color: "#b91c1c",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <div>{state.error}</div>
              <button
                type="button"
                onClick={() => {
                  void actions.refresh();
                }}
                style={{
                  border: "1px solid rgba(185, 28, 28, 0.24)",
                  borderRadius: 8,
                  background: "rgba(254, 242, 242, 0.9)",
                  color: "#991b1b",
                  cursor: "pointer",
                  font: "inherit",
                  fontWeight: 700,
                  padding: "6px 10px",
                }}
              >
                {t("widgets.weatherWidget.retry")}
              </button>
            </div>
          )}

          {state.status === "success" && (
            <div
              style={{
                position: "relative",
                flex: 1,
                minHeight: 0,
                display: "flex",
                alignItems: "end",
                containerType: "inline-size",
              }}
              onMouseEnter={() => setIsPointerOverWidget(true)}
              onMouseLeave={() => setIsPointerOverWidget(false)}
            >
              <WeatherAtmosphere mode={visualMode} cloudTone={cloudTone} />

              <div
                onKeyDown={(event) => {
                  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                  const container = event.currentTarget;
                  const buttons = Array.from(
                    container.querySelectorAll<HTMLButtonElement>("button:not([disabled])")
                  );
                  const index = buttons.indexOf(event.target as HTMLButtonElement);
                  if (index === -1) return;
                  event.preventDefault();
                  event.stopPropagation();

                  const widgetRoot = container.closest("[data-widget-id]");
                  const topControls = widgetRoot
                    ? Array.from(
                        widgetRoot.querySelectorAll<HTMLButtonElement>(
                          "button.widget-style-btn:not([disabled]), button.widget-lock-btn:not([disabled])"
                        )
                      )
                    : [];

                  if (event.key === "ArrowRight" && index === buttons.length - 1) {
                    topControls[0]?.focus();
                    return;
                  }
                  if (event.key === "ArrowLeft" && index === 0) {
                    topControls[topControls.length - 1]?.focus();
                    return;
                  }

                  const delta = event.key === "ArrowRight" ? 1 : -1;
                  buttons[index + delta]?.focus();
                }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  zIndex: 4,
                  display: "flex",
                  gap: "clamp(6px, 1.5cqw, 10px)",
                  opacity: controlsAreVisible ? 1 : 0,
                  transform: controlsAreVisible ? "translateY(0)" : "translateY(-4px)",
                  pointerEvents: controlsAreVisible ? "auto" : "none",
                  transition: "opacity 160ms ease, transform 160ms ease",
                }}
              >
                <button
                  type="button"
                  onClick={() => setWindIsEnabled((current) => !current)}
                  aria-label={windIsEnabled ? t("widgets.weatherWidget.hideWind") : t("widgets.weatherWidget.showWind")}
                  title={windIsEnabled ? t("widgets.weatherWidget.hideWind") : t("widgets.weatherWidget.showWind")}
                  aria-pressed={windIsEnabled}
                  style={{
                    width: "clamp(24px, 6cqw, 32px)",
                    height: "clamp(24px, 6cqw, 32px)",
                    borderRadius: "999px",
                    border: "1px solid rgba(255, 255, 255, 0.35)",
                    display: "grid",
                    placeItems: "center",
                    background: windIsEnabled ? "rgba(15, 23, 42, 0.78)" : "rgba(15, 23, 42, 0.58)",
                    color: "#f8fafc",
                    cursor: "pointer",
                    backdropFilter: "blur(10px)",
                    boxShadow: "0 8px 22px rgba(15, 23, 42, 0.3)",
                  }}
                >
                  <span
                    className="material-symbols-rounded"
                    aria-hidden="true"
                    style={{ fontSize: `clamp(${weatherControlIconSize}px, 3.8cqw, ${weatherControlIconMaxSize}px)`, lineHeight: 1 }}
                  >
                    air
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setHumidityIsEnabled((current) => !current)}
                  aria-label={humidityIsEnabled ? t("widgets.weatherWidget.hideHumidity") : t("widgets.weatherWidget.showHumidity")}
                  title={humidityIsEnabled ? t("widgets.weatherWidget.hideHumidity") : t("widgets.weatherWidget.showHumidity")}
                  aria-pressed={humidityIsEnabled}
                  style={{
                    width: "clamp(24px, 6cqw, 32px)",
                    height: "clamp(24px, 6cqw, 32px)",
                    borderRadius: "999px",
                    border: "1px solid rgba(255, 255, 255, 0.35)",
                    display: "grid",
                    placeItems: "center",
                    background: humidityIsEnabled ? "rgba(15, 23, 42, 0.78)" : "rgba(15, 23, 42, 0.58)",
                    color: "#f8fafc",
                    cursor: "pointer",
                    backdropFilter: "blur(10px)",
                    boxShadow: "0 8px 22px rgba(15, 23, 42, 0.3)",
                  }}
                >
                  <span
                    className="material-symbols-rounded"
                    aria-hidden="true"
                    style={{ fontSize: `clamp(${weatherControlIconSize}px, 3.8cqw, ${weatherControlIconMaxSize}px)`, lineHeight: 1 }}
                  >
                    humidity_percentage
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setUvIsEnabled((current) => !current)}
                  aria-label={uvIsEnabled ? t("widgets.weatherWidget.hideUvIndex") : t("widgets.weatherWidget.showUvIndex")}
                  title={uvIsEnabled ? t("widgets.weatherWidget.hideUvIndex") : t("widgets.weatherWidget.showUvIndex")}
                  aria-pressed={uvIsEnabled}
                  style={{
                    width: "clamp(24px, 6cqw, 32px)",
                    height: "clamp(24px, 6cqw, 32px)",
                    borderRadius: "999px",
                    border: "1px solid rgba(255, 255, 255, 0.35)",
                    display: "grid",
                    placeItems: "center",
                    background: uvIsEnabled ? "rgba(15, 23, 42, 0.78)" : "rgba(15, 23, 42, 0.58)",
                    color: "#f8fafc",
                    cursor: "pointer",
                    backdropFilter: "blur(10px)",
                    boxShadow: "0 8px 22px rgba(15, 23, 42, 0.3)",
                  }}
                >
                  <span
                    className="material-symbols-rounded"
                    aria-hidden="true"
                    style={{ fontSize: `clamp(${weatherControlIconSize}px, 3.8cqw, ${weatherControlIconMaxSize}px)`, lineHeight: 1 }}
                  >
                    sunny
                  </span>
                </button>
              </div>
              <div
              //venstre blokk
                  style={{
                    paddingBottom:20,
                  }}
              
                >     
                  <div
                    style={{
                      position: "relative",
                      zIndex: 1,
                      width: "100%",
                      display: "flex",
                      flexDirection: "column-reverse",
                      justifyContent: "center",
                      gap: "clamp(6px, 1.8cqw, 16px)",
                    }}
                    >
                    <div style={{ fontSize: `clamp(${locationFontSize}px, 4.2cqw, ${locationFontMaxSize}px)`, opacity: 0.8 }}>
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
                              fontSize: `clamp(${temperatureFontSize}px, 14cqw, ${temperatureFontMaxSize}px)`,
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
                  </div>
                </div>
                <div
                  //høyre blokk
                  >
                    {windIsEnabled && (
                      <div style={{ fontSize: `clamp(${fontSize}px, 4.6cqw, ${Math.round(fontSize * 1.8)}px)` }}>
                        <div>
                          <b style={{fontWeight:600}}>{t("widgets.weatherWidget.wind")}</b>: {state.data.windSpeedMs ?? "—"} m/s
                        </div>
                        <div>
                          <b style={{fontWeight:600}}>{t("widgets.weatherWidget.windDirection")}</b>: {state.data.windDirection != null ? `${state.data.windDirection}°` : "—"}
                        </div>
                      </div>
                    )}
                    {humidityIsEnabled && (
                      <div style={{ fontSize: `clamp(${fontSize}px, 4.6cqw, ${Math.round(fontSize * 1.8)}px)` }}>
                        <div>
                          <b style={{fontWeight:600}}>{t("widgets.weatherWidget.humidity")}</b>: {state.data.humidity != null ? `${state.data.humidity}%` : "—"}
                        </div>
                        <div>
                          <b style={{fontWeight:600}}>{t("widgets.weatherWidget.chanceOfRain")}</b>: {state.data.chanceOfRain != null ? `${state.data.chanceOfRain}%` : "—"}
                        </div>
                      </div>
                    )}
                    {uvIsEnabled && (
                      <div style={{ fontSize: `clamp(${fontSize}px, 4.6cqw, ${Math.round(fontSize * 1.8)}px)` }}>
                        <div>
                          <b style={{fontWeight:600}}>{t("widgets.weatherWidget.uvIndex")}</b>: {state.data.uvIndex ?? "—"}
                        </div>
                      </div>
                    )}
                </div>
              </div>
          )}

        </div>

      </WidgetPane>
    </WidgetContainer>
  );
}
