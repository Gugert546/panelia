import express from "express";

export const weatherRouter = express.Router();

const CACHE_TTL = 15 * 60 * 1000; // 15 minutter
const weatherCache = new Map();

function pickFirstNumber(values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

weatherRouter.get("/", async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing lat/lon" });
  }

  const cacheKey = `${lat}_${lon}`;
  const cached = weatherCache.get(cacheKey);

  // ✅ hvis cache finnes og er fersk
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json(cached.data);
  }

  const url = `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${lat}&lon=${lon}`;

  const r = await fetch(url, {
    headers: {
      "User-Agent": "PaneliaStartside/1.0 (contact: jonas.lo.sk@hotmail.no)",
    },
  });

  if (!r.ok) {
    return res.status(r.status).json({ error: "MET request failed" });
  }

  const data: any = await r.json();

  const timeseries = Array.isArray(data?.properties?.timeseries)
    ? data.properties.timeseries
    : [];
  const ts = timeseries[0];
  const details = ts?.data?.instant?.details;
  const precipitationProbability = pickFirstNumber(
    timeseries.slice(0, 12).flatMap((step: any) => [
      step?.data?.next_1_hours?.details?.probability_of_precipitation,
      step?.data?.next_6_hours?.details?.probability_of_precipitation,
      step?.data?.next_12_hours?.details?.probability_of_precipitation,
    ])
  );
  const uvIndex = pickFirstNumber(
    timeseries.slice(0, 12).map((step: any) => step?.data?.instant?.details?.ultraviolet_index_clear_sky)
  );

  const result = {
    time: ts?.time,
    temperature: details?.air_temperature,
    windSpeed: details?.wind_speed,
    windFrom: details?.wind_from_direction,
    humidity: details?.relative_humidity,
    uvIndex,
    chanceOfRain: precipitationProbability ?? null,
    symbol:
      ts?.data?.next_1_hours?.summary?.symbol_code ??
      ts?.data?.next_6_hours?.summary?.symbol_code,
  };

  // ✅ lagre i cache
  weatherCache.set(cacheKey, {
    timestamp: Date.now(),
    data: result,
  });

  res.json(result);
});
