import { useCallback, useEffect, useState } from "react";
import { getUserCoordinates, getUserLocation } from "../../hooks/userLocation";
import { useLanguage } from "../../../../providers/languageProvider";

export type WeatherView = {
  placeLabel: string;
  countryCode?: string; 
  temperatureC: number;
  windSpeedMs?: number;
  symbolCode?: string;
  updatedAtISO: string;
  humidity?: number;
  windDirection?: number;
  uvIndex?: number;
  chanceOfRain?: number;
};

type WeatherState =
  | { status: "idle" | "loading"; data?: undefined; error?: undefined; refreshing?: boolean }
  | { status: "success"; data: WeatherView; error?: undefined; refreshing?: boolean }
  | { status: "error"; data?: undefined; error: string; refreshing?: boolean };

const WEATHER_CACHE_KEY = "panelia:weather:v1";
const WEATHER_CACHE_MAX_AGE_MS = 15 * 60 * 1000;
const WEATHER_STALE_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const WEATHER_RETRY_DELAY_MS = 700;
const GEOLOCATION_ERROR_PERMISSION_DENIED = 1;
const GEOLOCATION_ERROR_TIMEOUT = 3;

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "";
}

function getErrorCode(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "number"
  ) {
    return error.code;
  }

  return undefined;
}

function isRetryableWeatherError(error: unknown) {
  const message = getErrorMessage(error);

  if (!message.startsWith("WEATHER_FETCH_FAILED:")) {
    return true;
  }

  const status = Number(message.split(":")[1]);
  return status === 408 || status === 429 || status >= 500;
}

async function fetchWeatherFromProxy(lat: number, lon: number) {
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
  let lastError: unknown;

  // Prøver igjen ved korte API-/nettverksfeil.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const r = await fetch(
        `${apiBase}/api/weather?lat=${lat}&lon=${lon}`
      );
      if (!r.ok) throw new Error(`WEATHER_FETCH_FAILED:${r.status}`);
      return r.json();
    } catch (error: unknown) {
      lastError = error;

      if (attempt === 1 || !isRetryableWeatherError(error)) {
        throw error;
      }

      await sleep(WEATHER_RETRY_DELAY_MS);
    }
  }

  throw lastError;
}

function isFresh(iso: string, maxAgeMs = WEATHER_CACHE_MAX_AGE_MS) {
  const time = new Date(iso).getTime();
  return Number.isFinite(time) && Date.now() - time < maxAgeMs;
}

function readCachedWeather(maxAgeMs = WEATHER_CACHE_MAX_AGE_MS): WeatherView | undefined {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return undefined;

    const value = JSON.parse(raw) as Partial<WeatherView>;
    if (
      typeof value.placeLabel !== "string" ||
      typeof value.temperatureC !== "number" ||
      typeof value.updatedAtISO !== "string" ||
      !isFresh(value.updatedAtISO, maxAgeMs)
    ) {
      return undefined;
    }

    return {
      placeLabel: value.placeLabel,
      countryCode: typeof value.countryCode === "string" ? value.countryCode : undefined,
      temperatureC: value.temperatureC,
      windSpeedMs: typeof value.windSpeedMs === "number" ? value.windSpeedMs : undefined,
      symbolCode: typeof value.symbolCode === "string" ? value.symbolCode : undefined,
      updatedAtISO: value.updatedAtISO,
      humidity: typeof value.humidity === "number" ? value.humidity : undefined,
      windDirection: typeof value.windDirection === "number" ? value.windDirection : undefined,
      uvIndex: typeof value.uvIndex === "number" ? value.uvIndex : undefined,
      chanceOfRain: typeof value.chanceOfRain === "number" ? value.chanceOfRain : undefined,
    };
  } catch {
    return undefined;
  }
}

function writeCachedWeather(view: WeatherView) {
  try {
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(view));
  } catch {
    // Ignorerer lagringsfeil.
  }
}

export function useWeatherWidget(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const { t } = useLanguage();
  const [state, setState] = useState<WeatherState>(() => {
    // Starter med cache hvis tilgjengelig.
    const cached = readCachedWeather();
    return cached ? { status: "success", data: cached } : { status: "idle" };
  });

  const load = useCallback(async () => {
    if (!enabled) return;

    // Beholder gamle data mens oppdatering kjører.
    setState((prev) => {
      if (prev.status === "success") {
        return { ...prev, refreshing: true };
      }
      return { status: "loading" };
    });

    try {
      const coordinates = await getUserCoordinates();
      const [location, json] = await Promise.all([
        getUserLocation(),
        fetchWeatherFromProxy(coordinates.lat, coordinates.lon),
      ]);

      const temperature = json?.temperature;
      const wind = json?.windSpeed;
      const symbol = json?.symbol;
      const humidity = json?.humidity;
      const windDirection = json?.windFrom;
      const uvIndex = json?.uvIndex;
      const chanceOfRain = json?.chanceOfRain;

      if (typeof temperature !== "number") {
        throw new Error("WEATHER_NO_TEMP");
      }

      const view: WeatherView = {
        placeLabel: location.placeLabel,
        countryCode: location.countryCode,
        temperatureC: round1(temperature),
        windSpeedMs: typeof wind === "number" ? round1(wind) : undefined,
        symbolCode: typeof symbol === "string" ? symbol : undefined,
        updatedAtISO: new Date().toISOString(),
        humidity: typeof humidity === "number" ? round1(humidity) : undefined,
        windDirection: typeof windDirection === "number" ? windDirection : undefined,
        uvIndex: typeof uvIndex === "number" ? uvIndex : undefined,
        chanceOfRain: typeof chanceOfRain === "number" ? round1(chanceOfRain) : undefined,
      };

      writeCachedWeather(view);
      setState({ status: "success", data: view, refreshing: false });
    } catch (e: unknown) {
      // Bruker nåværende data, ellers cache, ellers feilmelding.
      setState((prev) => {
        if (prev.status === "success") {
          return { ...prev, refreshing: false };
        }
        const cached = readCachedWeather(WEATHER_STALE_CACHE_MAX_AGE_MS);
        if (cached) {
          return { status: "success", data: cached, refreshing: false };
        }

        const raw = getErrorMessage(e);
        let error: string;
        if (raw.startsWith("WEATHER_FETCH_FAILED:")) {
          const status = raw.split(":")[1];
          error = `${t("widgets.weatherWidget.errorFailed")} (${status})`;
        } else if (raw === "WEATHER_NO_TEMP") {
          error = t("widgets.weatherWidget.errorNoTemp");
        } else if (getErrorCode(e) === GEOLOCATION_ERROR_PERMISSION_DENIED) {
          error = t("widgets.weatherWidget.errorLocationDenied");
        } else if (
          getErrorCode(e) === GEOLOCATION_ERROR_TIMEOUT ||
          raw.toLowerCase().includes("timed out")
        ) {
          error = t("widgets.weatherWidget.errorLocationTimeout");
        } else {
          error = raw || t("widgets.weatherWidget.errorUnknown");
        }
        return { status: "error", error, refreshing: false };
      });
    }
  }, [enabled, t]);

  useEffect(() => {
    if (!enabled) return;

    void load();

    // Oppdaterer periodisk.
    const id = setInterval(() => {
      void load();
    }, 15 * 60 * 1000);

    return () => clearInterval(id);
  }, [enabled, load]);

  return {
    state,
    actions: {
      refresh: load,
    },
  };
}
