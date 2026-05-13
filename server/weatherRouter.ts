import express from "express";

export const weatherRouter = express.Router();

const CACHE_TTL = 15 * 60 * 1000; // 15 minutter
const STALE_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 timer

type WeatherResponse = {
  time?: string;
  temperature?: number;
  windSpeed?: number;
  windFrom?: number;
  humidity?: number;
  uvIndex?: number | null;
  chanceOfRain?: number | null;
  symbol?: string;
};

type WeatherCacheEntry = {
  timestamp: number;
  data: WeatherResponse;
};

type ForecastDetails = {
  air_temperature?: unknown;
  wind_speed?: unknown;
  wind_from_direction?: unknown;
  relative_humidity?: unknown;
  ultraviolet_index_clear_sky?: unknown;
  probability_of_precipitation?: unknown;
};

type ForecastWindow = {
  details?: ForecastDetails;
  summary?: {
    symbol_code?: unknown;
  };
};

type ForecastStep = {
  time?: string;
  data?: {
    instant?: {
      details?: ForecastDetails;
    };
    next_1_hours?: ForecastWindow;
    next_6_hours?: ForecastWindow;
    next_12_hours?: ForecastWindow;
  };
};

class WeatherUpstreamError extends Error {
  constructor(
    message: string,
    readonly status = 502
  ) {
    super(message);
  }
}

const weatherCache = new Map<string, WeatherCacheEntry>();
const pendingWeatherRequests = new Map<string, Promise<WeatherResponse>>();

function pickFirstNumber(values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function getCachedWeather(cacheKey: string, maxAgeMs: number) {
  const cached = weatherCache.get(cacheKey);
  if (!cached || Date.now() - cached.timestamp >= maxAgeMs) {
    return undefined;
  }

  return cached.data;
}

function getQueryNumber(value: unknown) {
  if (typeof value !== "string") return undefined;

  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function getForecastSteps(payload: unknown): ForecastStep[] {
  if (!isRecord(payload) || !isRecord(payload.properties)) {
    return [];
  }

  return Array.isArray(payload.properties.timeseries)
    ? (payload.properties.timeseries as ForecastStep[])
    : [];
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

async function fetchWeatherFromMet(lat: number, lon: number): Promise<WeatherResponse> {
  const url = new URL("https://api.met.no/weatherapi/locationforecast/2.0/complete");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));

  const r = await fetch(url, {
    headers: {
      "User-Agent": "PaneliaStartside/1.0 (contact: jonas.lo.sk@hotmail.no)",
      Accept: "application/json",
    },
  });

  const bodyText = await r.text();

  if (!r.ok) {
    console.warn("MET weather request failed", {
      status: r.status,
      body: bodyText.slice(0, 300),
    });
    throw new WeatherUpstreamError("MET request failed", r.status);
  }

  let data: unknown;
  try {
    data = JSON.parse(bodyText);
  } catch {
    console.warn("MET weather returned non-JSON response", {
      status: r.status,
      body: bodyText.slice(0, 300),
    });
    throw new WeatherUpstreamError("MET returned an invalid response");
  }

  const timeseries = getForecastSteps(data);
  const ts = timeseries[0];
  const details = ts?.data?.instant?.details;
  const temperature = getNumber(details?.air_temperature);

  if (temperature == null) {
    throw new WeatherUpstreamError("MET response did not include temperature");
  }

  const precipitationProbability = pickFirstNumber(
    timeseries.slice(0, 12).flatMap((step) => [
      step?.data?.next_1_hours?.details?.probability_of_precipitation,
      step?.data?.next_6_hours?.details?.probability_of_precipitation,
      step?.data?.next_12_hours?.details?.probability_of_precipitation,
    ])
  );
  const uvIndex = pickFirstNumber(
    timeseries.slice(0, 12).map((step) => step?.data?.instant?.details?.ultraviolet_index_clear_sky)
  );

  return {
    time: ts?.time,
    temperature,
    windSpeed: getNumber(details?.wind_speed),
    windFrom: getNumber(details?.wind_from_direction),
    humidity: getNumber(details?.relative_humidity),
    uvIndex,
    chanceOfRain: precipitationProbability,
    symbol:
      getString(ts?.data?.next_1_hours?.summary?.symbol_code) ??
      getString(ts?.data?.next_6_hours?.summary?.symbol_code),
  };
}

weatherRouter.get("/", async (req, res) => {
  const lat = getQueryNumber(req.query.lat);
  const lon = getQueryNumber(req.query.lon);

  if (lat == null || lon == null) {
    return res.status(400).json({ error: "Missing or invalid lat/lon" });
  }

  const cacheKey = `${lat.toFixed(4)}_${lon.toFixed(4)}`;
  const cached = getCachedWeather(cacheKey, CACHE_TTL);

  if (cached) {
    return res.json(cached);
  }

  const pendingRequest =
    pendingWeatherRequests.get(cacheKey) ??
    fetchWeatherFromMet(lat, lon).finally(() => {
      pendingWeatherRequests.delete(cacheKey);
    });

  pendingWeatherRequests.set(cacheKey, pendingRequest);

  try {
    const result = await pendingRequest;

    weatherCache.set(cacheKey, {
      timestamp: Date.now(),
      data: result,
    });

    return res.json(result);
  } catch (error: unknown) {
    console.error("Weather router error:", error);

    const stale = getCachedWeather(cacheKey, STALE_CACHE_TTL);
    if (stale) {
      return res.json(stale);
    }

    if (error instanceof WeatherUpstreamError) {
      return res.status(error.status >= 500 ? 502 : error.status).json({ error: error.message });
    }

    return res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});
