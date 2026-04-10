import { useCallback, useEffect, useState } from "react";

export type WeatherView = {
  placeLabel: string;
  countryCode?: string; 
  temperatureC: number;
  windSpeedMs?: number;
  symbolCode?: string;
  updatedAtISO: string;
};

type WeatherState =
  | { status: "idle" | "loading"; data?: undefined; error?: undefined; refreshing?: boolean }
  | { status: "success"; data: WeatherView; error?: undefined; refreshing?: boolean }
  | { status: "error"; data?: undefined; error: string; refreshing?: boolean };

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

async function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation støttes ikke"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 25_000,
    });
  });
}

async function reverseGeocode(
  lat: number,
  lon: number
): Promise<{ label: string; countryCode?: string }> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;

  const r = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!r.ok) return { label: "Din posisjon" };

  const j = await r.json();
  const a = j?.address;

  const city = a?.city || a?.town || a?.village || a?.municipality;
  const country = a?.country;
  const countryCode = a?.country_code;

  let label = "Din posisjon";

  if (city && country) label = `${city}, ${country}`;
  else if (city) label = city;

  return {
    label,
    countryCode: countryCode?.toLowerCase(), 
  };
}

async function fetchWeatherFromProxy(lat: number, lon: number) {
  const r = await fetch(
    `https://panelia-server-1044777021142.europe-west1.run.app/api/weather?lat=${lat}&lon=${lon}`
  );
  if (!r.ok) throw new Error(`Værkall feilet (${r.status})`);
  return r.json();
}

export function useWeatherWidget() {
  const [state, setState] = useState<WeatherState>({ status: "idle" });

  const load = useCallback(async () => {
    //Ikke "loading" hvis vi allerede har data, bare marker refreshing
    setState((prev) => {
      if (prev.status === "success") {
        return { ...prev, refreshing: true };
      }
      return { status: "loading" };
    });

    try {
      // 1) Posisjon
      const pos = await getPosition();
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      // 2) Stednavn
      const geo = await reverseGeocode(lat, lon);

      // 3) Vær
      const json = await fetchWeatherFromProxy(lat, lon);

      const temperature = json?.temperature;
      const wind = json?.windSpeed;
      const symbol = json?.symbol;

      if (typeof temperature !== "number") {
        throw new Error("Fant ikke temperatur i respons");
      }

      const view: WeatherView = {
      placeLabel: geo.label,
      countryCode: geo.countryCode, 
      temperatureC: round1(temperature),
      windSpeedMs: typeof wind === "number" ? round1(wind) : undefined,
      symbolCode: typeof symbol === "string" ? symbol : undefined,
      updatedAtISO: new Date().toISOString(),
};

      setState({ status: "success", data: view, refreshing: false });
    } catch (e: any) {
      // Hvis vi allerede har data, behold den og bare stopp refreshing
      setState((prev) => {
        if (prev.status === "success") {
          return { ...prev, refreshing: false };
        }
        return { status: "error", error: e?.message ?? "Ukjent feil", refreshing: false };
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