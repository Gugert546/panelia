import type {
  CustomBackgroundMediaType,
  DashboardBackgroundId,
} from "./hooks/useWidgetsState";
import { getBackgroundByTime } from "./hooks/getBackgroundByTime";
import sol1 from "../../../assets/panelia-bg/Sol 1.png";
import sol2 from "../../../assets/panelia-bg/Sol bagrunn 2.png";
import sol3 from "../../../assets/panelia-bg/Sol bagrunn 3.png";
import natt1 from "../../../assets/panelia-bg/Natt bagrunn 1.png";
import natt2 from "../../../assets/panelia-bg/Natt bagrunn 2.png";
import natt3 from "../../../assets/panelia-bg/Natt bagrunn 3.png";
import foregroundSol2 from "../../../assets/panelia-bg/IMG_1111.png";
import foregroundSol3 from "../../../assets/panelia-bg/IMG_1117.png";
import foregroundNatt1 from "../../../assets/panelia-bg/IMG_1114.png";
import foregroundNatt2 from "../../../assets/panelia-bg/IMG_1112.png";
import foregroundNatt3 from "../../../assets/panelia-bg/IMG_1113.png";
import waterSol1 from "../../../assets/panelia-bg/Vann S1.2.png";
import waterSol3 from "../../../assets/panelia-bg/Vann S3.2.png";
import waterNatt2 from "../../../assets/panelia-bg/Vann N2.2.png";
import waterNatt3 from "../../../assets/panelia-bg/Vann N3.2.png";
import { useWeatherWidget } from "../Widgets/builtins/WeatherWidget/WeatherWidgetLogic";
import {
  getWeatherCloudTone,
  getWeatherVisualMode,
  type WeatherCloudTone,
  type WeatherVisualMode,
} from "../Widgets/builtins/WeatherWidget/weatherVisuals";

type DashboardBackgroundProps = {
  backgroundId: DashboardBackgroundId;
  customBackgroundUrl: string;
  customBackgroundType: CustomBackgroundMediaType;
  date?: Date;
};

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 20;
const DAY_DURATION_HOURS = DAY_END_HOUR - DAY_START_HOUR;
const NIGHT_DURATION_HOURS = 24 - DAY_DURATION_HOURS;

function toCssUrl(url: string) {
  return `url("${url.replace(/"/g, '\\"')}")`;
}

function resolveEffectiveBackgroundId(backgroundId: DashboardBackgroundId, date: Date) {
  if (backgroundId === "defaultbg") {
    return getBackgroundByTime(date) as DashboardBackgroundId;
  }

  return backgroundId;
}

function resolveDashboardBackground(backgroundId: DashboardBackgroundId, date: Date) {
  const effectiveBackgroundId = resolveEffectiveBackgroundId(backgroundId, date);

  if (effectiveBackgroundId === "sol1") return sol1;
  if (effectiveBackgroundId === "sol2") return sol2;
  if (effectiveBackgroundId === "sol3") return sol3;
  if (effectiveBackgroundId === "natt1") return natt1;
  if (effectiveBackgroundId === "natt2") return natt2;
  if (effectiveBackgroundId === "natt3") return natt3;
  if (effectiveBackgroundId === "customMedia") return sol1;

  return sol1;
}

function resolveDashboardForeground(backgroundId: DashboardBackgroundId, date: Date) {
  const effectiveBackgroundId = resolveEffectiveBackgroundId(backgroundId, date);

  if (effectiveBackgroundId === "sol2") return foregroundSol2;
  if (effectiveBackgroundId === "sol3") return foregroundSol3;
  if (effectiveBackgroundId === "natt1") return foregroundNatt1;
  if (effectiveBackgroundId === "natt2") return foregroundNatt2;
  if (effectiveBackgroundId === "natt3") return foregroundNatt3;

  return null;
}

function resolveDashboardWater(backgroundId: DashboardBackgroundId, date: Date) {
  const effectiveBackgroundId = resolveEffectiveBackgroundId(backgroundId, date);

  if (effectiveBackgroundId === "sol2") return waterSol1;
  if (effectiveBackgroundId === "sol3") return waterSol3;
  if (effectiveBackgroundId === "natt1") return waterNatt3;
  if (effectiveBackgroundId === "natt2") return waterNatt3;
  if (effectiveBackgroundId === "natt3") return waterNatt2;

  return null;
}

function getSkyBodyType(backgroundId: DashboardBackgroundId, date: Date) {
  const effectiveBackgroundId = resolveEffectiveBackgroundId(backgroundId, date);

  if (effectiveBackgroundId.startsWith("natt")) return "moon";
  if (effectiveBackgroundId.startsWith("sol")) return "sun";

  return null;
}

function getVideoBackgroundSource(
  backgroundId: DashboardBackgroundId,
  customBackgroundUrl: string,
  customBackgroundType: CustomBackgroundMediaType
) {
  if (backgroundId === "customMedia" && customBackgroundType === "video") {
    return customBackgroundUrl || null;
  }

  return null;
}

function getImageBackgroundSource(
  backgroundId: DashboardBackgroundId,
  customBackgroundUrl: string,
  customBackgroundType: CustomBackgroundMediaType,
  date: Date
) {
  if (backgroundId === "customMedia" && customBackgroundType === "image") {
    return customBackgroundUrl || resolveDashboardBackground("defaultbg", date);
  }

  return resolveDashboardBackground(backgroundId, date);
}

function getDayProgress(date: Date) {
  const hours = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  return Math.min(1, Math.max(0, (hours - DAY_START_HOUR) / DAY_DURATION_HOURS));
}

function getNightProgress(date: Date) {
  const hours = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;

  if (hours >= DAY_END_HOUR) {
    return Math.min(1, Math.max(0, (hours - DAY_END_HOUR) / NIGHT_DURATION_HOURS));
  }

  return Math.min(1, Math.max(0, (hours + 24 - DAY_END_HOUR) / NIGHT_DURATION_HOURS));
}

function DashboardWeatherAtmosphere({
  mode,
  cloudTone,
}: {
  mode: WeatherVisualMode;
  cloudTone: WeatherCloudTone;
}) {
  const clouds = (
    <>
      <div className="dashboard-weather-cloud dashboard-weather-cloud-one" />
      <div className="dashboard-weather-cloud dashboard-weather-cloud-two" />
      <div className="dashboard-weather-cloud dashboard-weather-cloud-three" />
      <div className="dashboard-weather-cloud dashboard-weather-cloud-four" />
    </>
  );
  const pronouncedClouds = (
    <>
      {clouds}
      <div className="dashboard-weather-cloud dashboard-weather-cloud-five" />
      <div className="dashboard-weather-cloud dashboard-weather-cloud-six" />
    </>
  );

  const renderRainDrops = (count: number) =>
    Array.from({ length: count }, (_, index) => (
      <div
        key={index}
        className={`dashboard-weather-raindrop dashboard-weather-particle-${index + 1}`}
      />
    ));

  const renderSnowFlakes = (count: number) =>
    Array.from({ length: count }, (_, index) => (
      <div
        key={index}
        className={`dashboard-weather-snowflake dashboard-weather-particle-${index + 1}`}
      />
    ));

  if (mode === "rain") {
    return (
      <div
        className={`dashboard-weather-atmosphere dashboard-weather-mode-rain dashboard-weather-atmosphere-${cloudTone}`}
        aria-hidden="true"
      >
        <div className="dashboard-weather-vignette" />
        {pronouncedClouds}
        <div className="dashboard-weather-rain-field dashboard-weather-rain-back">
          {renderRainDrops(18)}
        </div>
        <div className="dashboard-weather-rain-field dashboard-weather-rain-front">
          {renderRainDrops(18)}
        </div>
      </div>
    );
  }

  if (mode === "snow") {
    return (
      <div
        className="dashboard-weather-atmosphere dashboard-weather-mode-snow dashboard-weather-atmosphere-normal"
        aria-hidden="true"
      >
        <div className="dashboard-weather-vignette" />
        {pronouncedClouds}
        <div className="dashboard-weather-snow-haze" />
        <div className="dashboard-weather-snow-field dashboard-weather-snow-back">
          {renderSnowFlakes(24)}
        </div>
        <div className="dashboard-weather-snow-field dashboard-weather-snow-front">
          {renderSnowFlakes(24)}
        </div>
      </div>
    );
  }

  if (mode === "fog") {
    return (
      <div
        className="dashboard-weather-atmosphere dashboard-weather-mode-fog dashboard-weather-atmosphere-normal"
        aria-hidden="true"
      >
        {clouds}
      </div>
    );
  }

  if (mode === "clear") {
    return (
      <div
        className="dashboard-weather-atmosphere dashboard-weather-mode-clear dashboard-weather-atmosphere-normal"
        aria-hidden="true"
      >
        <div className="dashboard-weather-clear-glow" />
        <div className="dashboard-weather-sky-shimmer dashboard-weather-sky-shimmer-one" />
        <div className="dashboard-weather-sky-shimmer dashboard-weather-sky-shimmer-two" />
      </div>
    );
  }

  return (
    <div
      className="dashboard-weather-atmosphere dashboard-weather-mode-cloudy dashboard-weather-atmosphere-normal"
      aria-hidden="true"
    >
      {pronouncedClouds}
    </div>
  );
}

export default function DashboardBackground({
  backgroundId,
  customBackgroundUrl,
  customBackgroundType,
  date,
}: DashboardBackgroundProps) {
  const now = date ?? new Date();
  const weatherAnimationsAreEnabled = backgroundId === "defaultbg";
  const { state: weatherState } = useWeatherWidget({ enabled: weatherAnimationsAreEnabled });
  const backgroundImageUrl = getImageBackgroundSource(
    backgroundId,
    customBackgroundUrl,
    customBackgroundType,
    now
  );
  const foregroundImageUrl =
    backgroundId === "customMedia" ? null : resolveDashboardForeground(backgroundId, now);
  const waterImageUrl =
    backgroundId === "customMedia" ? null : resolveDashboardWater(backgroundId, now);
  const skyBodyType =
    backgroundId === "customMedia" ? null : getSkyBodyType(backgroundId, now);
  // For testing weather animations, set this to "cloudy", "fog", "rain", "snow","heavyrainandthunder","clearsky_day" sett til undefined(uten "") for å bruke current vær
  const debugWeatherSymbolCode: string | undefined = undefined;
  const weatherSymbolCode =
    weatherAnimationsAreEnabled
      ? debugWeatherSymbolCode ??
        (weatherState.status === "success" ? weatherState.data.symbolCode : undefined)
      : undefined;
  const weatherVisualMode = weatherSymbolCode
    ? getWeatherVisualMode(weatherSymbolCode)
    : null;
  const weatherCloudTone = weatherSymbolCode
    ? getWeatherCloudTone(weatherSymbolCode)
    : "normal";
  const videoBackgroundSource = getVideoBackgroundSource(
    backgroundId,
    customBackgroundUrl,
    customBackgroundType
  );

  const skyOrbitStyle = skyBodyType
    ? {
        animationDuration: `${
          skyBodyType === "sun" ? DAY_DURATION_HOURS * 3600 : NIGHT_DURATION_HOURS * 3600
        }s`,
        animationDelay: `-${(
          (skyBodyType === "sun" ? getDayProgress(now) : getNightProgress(now)) *
          (skyBodyType === "sun" ? DAY_DURATION_HOURS * 3600 : NIGHT_DURATION_HOURS * 3600)
        ).toFixed(2)}s`,
      }
    : undefined;

  return (
    <>
      <div
        className="dashboard-background-layer"
        aria-hidden="true"
        style={{
          backgroundImage: toCssUrl(backgroundImageUrl),
        }}
      />

      {videoBackgroundSource && (
        <video
          className="dashboard-bg-video"
          src={videoBackgroundSource}
          autoPlay
          loop
          muted
          playsInline
        />
      )}

      {skyBodyType && (
        <div
          className={`dashboard-sky-orbit dashboard-sky-orbit-${skyBodyType}`}
          style={skyOrbitStyle}
          aria-hidden="true"
        >
          <div className={`dashboard-sky-body dashboard-sky-body-${skyBodyType}`} />
        </div>
      )}

      {waterImageUrl && (
        <div className="dashboard-water-layer" aria-hidden="true">
          <img className="dashboard-water-texture" src={waterImageUrl} alt="" />
        </div>
      )}

      {foregroundImageUrl && (
        <img
          className="dashboard-foreground-layer"
          src={foregroundImageUrl}
          alt=""
          aria-hidden="true"
        />
      )}

      {weatherVisualMode && (
        <DashboardWeatherAtmosphere
          mode={weatherVisualMode}
          cloudTone={weatherCloudTone}
        />
      )}
    </>
  );
}
