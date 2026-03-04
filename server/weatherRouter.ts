import express from "express";

export const weatherRouter = express.Router();

const CACHE_TTL = 15 * 60 * 1000; // 15 minutter
const weatherCache = new Map();

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

  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;

  const r = await fetch(url, {
    headers: {
      "User-Agent": "PaneliaStartside/1.0 (contact: jonas.lo.sk@hotmail.no)",
    },
  });

  if (!r.ok) {
    return res.status(r.status).json({ error: "MET request failed" });
  }

  const data: any = await r.json();

  const ts = data?.properties?.timeseries?.[0];
  const details = ts?.data?.instant?.details;

  const result = {
    time: ts?.time,
    temperature: details?.air_temperature,
    windSpeed: details?.wind_speed,
    windFrom: details?.wind_from_direction,
    humidity: details?.relative_humidity,
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