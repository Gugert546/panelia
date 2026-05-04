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

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

async function fetchWeatherFromProxy(lat: number, lon: number) {
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
  const r = await fetch(
    `${apiBase}/api/weather?lat=${lat}&lon=${lon}`
  );
  if (!r.ok) throw new Error(`WEATHER_FETCH_FAILED:${r.status}`);
  return r.json();
}

function isFresh(iso: string) {
  const time = new Date(iso).getTime();
  return Number.isFinite(time) && Date.now() - time < WEATHER_CACHE_MAX_AGE_MS;
}

function readCachedWeather(): WeatherView | undefined {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return undefined;

    const value = JSON.parse(raw) as Partial<WeatherView>;
    if (
      typeof value.placeLabel !== "string" ||
      typeof value.temperatureC !== "number" ||
      typeof value.updatedAtISO !== "string" ||
      !isFresh(value.updatedAtISO)
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
    // Storage is best-effort; the visible state has already been updated.
  }
}

export function useWeatherWidget() {
  const { t } = useLanguage();
  const [state, setState] = useState<WeatherState>(() => {
    const cached = readCachedWeather();
    return cached ? { status: "success", data: cached } : { status: "idle" };
  });

  const load = useCallback(async () => {
    //Ikke "loading" hvis vi allerede har data, bare marker refreshing
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
      // Hvis vi allerede har data, behold den og bare stopp refreshing
      setState((prev) => {
        if (prev.status === "success") {
          return { ...prev, refreshing: false };
        }
        const raw = e instanceof Error ? e.message : "";
        let error: string;
        if (raw.startsWith("WEATHER_FETCH_FAILED:")) {
          const status = raw.split(":")[1];
          error = `${t("widgets.weatherWidget.errorFailed")} (${status})`;
        } else if (raw === "WEATHER_NO_TEMP") {
          error = t("widgets.weatherWidget.errorNoTemp");
        } else {
          error = raw || t("widgets.weatherWidget.errorUnknown");
        }
        return { status: "error", error, refreshing: false };
      });
    }
  }, []);

  useEffect(() => {
    void load();

    //Auto-refresh hvert 15 minutt
    const id = setInterval(() => {
      void load();
    }, 15 * 60 * 1000);

    return () => clearInterval(id);
  }, [load]);

  return {
    state,
    actions: {
      refresh: load,
    },
  };
}
