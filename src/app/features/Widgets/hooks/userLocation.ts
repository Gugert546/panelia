import { useCallback, useEffect, useState } from "react";

export type UserLocation = {
  lat: number;
  lon: number;
  placeLabel: string;
  countryCode?: string;
  updatedAtISO: string;
};

export type UserCoordinates = Pick<UserLocation, "lat" | "lon">;

type UserLocationState =
  | { status: "idle" | "loading"; data?: undefined; error?: undefined; refreshing?: boolean }
  | { status: "success"; data: UserLocation; error?: undefined; refreshing?: boolean }
  | { status: "error"; data?: undefined; error: string; refreshing?: boolean };

const LOCATION_CACHE_KEY = "panelia:user-location:v1";
const LOCATION_CACHE_MAX_AGE_MS = 30 * 60 * 1000;
const GEOLOCATION_MAX_AGE_MS = 10 * 60 * 1000;
const GEOLOCATION_TIMEOUT_MS = 8_000;
const GEOLOCATION_RETRY_TIMEOUT_MS = 18_000;
const GEOLOCATION_RETRY_DELAY_MS = 600;
const GEOLOCATION_ERROR_TIMEOUT = 3;

// Deler cache mellom widgets.
let memoryLocation: UserLocation | undefined;
let memoryCoordinates: UserCoordinates | undefined;
let locationPromise: Promise<UserLocation> | undefined;
let coordinatesPromise: Promise<UserCoordinates> | undefined;

function isFresh(iso: string, maxAgeMs: number) {
  const time = new Date(iso).getTime();
  return Number.isFinite(time) && Date.now() - time < maxAgeMs;
}

function readCachedLocation() {
  try {
    const raw = localStorage.getItem(LOCATION_CACHE_KEY);
    if (!raw) return undefined;

    const value = JSON.parse(raw) as Partial<UserLocation>;
    if (
      typeof value.lat !== "number" ||
      typeof value.lon !== "number" ||
      typeof value.placeLabel !== "string" ||
      typeof value.updatedAtISO !== "string" ||
      !isFresh(value.updatedAtISO, LOCATION_CACHE_MAX_AGE_MS)
    ) {
      return undefined;
    }

    return {
      lat: value.lat,
      lon: value.lon,
      placeLabel: value.placeLabel,
      countryCode: typeof value.countryCode === "string" ? value.countryCode : undefined,
      updatedAtISO: value.updatedAtISO,
    };
  } catch {
    return undefined;
  }
}

function writeCachedLocation(location: UserLocation) {
  try {
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(location));
  } catch {
    // Ignorer lagringsfeil.
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isGeolocationTimeout(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const code = "code" in error ? error.code : undefined;
  if (code === GEOLOCATION_ERROR_TIMEOUT) return true;

  const message = "message" in error ? error.message : undefined;
  return typeof message === "string" && message.toLowerCase().includes("timed out");
}

function requestPosition(timeout: number): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation støttes ikke"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      maximumAge: GEOLOCATION_MAX_AGE_MS,
      timeout,
    });
  });
}

async function getPosition(): Promise<GeolocationPosition> {
  try {
    return await requestPosition(GEOLOCATION_TIMEOUT_MS);
  } catch (error: unknown) {
    // Prøv igjen med lengre timeout.
    if (!isGeolocationTimeout(error)) throw error;

    await sleep(GEOLOCATION_RETRY_DELAY_MS);
    return requestPosition(GEOLOCATION_RETRY_TIMEOUT_MS);
  }
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
    countryCode: typeof countryCode === "string" ? countryCode.toLowerCase() : undefined,
  };
}

export function getCountryCodeFromLocale() {
  const language = navigator.languages?.[0] ?? navigator.language;
  const region = language?.split("-")[1];
  return region?.toLowerCase();
}

export async function getUserCoordinates(forceRefresh = false) {
  const cached = memoryLocation ?? readCachedLocation();
  if (!forceRefresh && cached) {
    memoryLocation = cached;
    memoryCoordinates = { lat: cached.lat, lon: cached.lon };
    return memoryCoordinates;
  }

  if (!forceRefresh && memoryCoordinates) return memoryCoordinates;
  // Deler samme forespørsel mellom samtidige kall.
  if (!forceRefresh && coordinatesPromise) return coordinatesPromise;

  coordinatesPromise = (async () => {
    const pos = await getPosition();
    const coordinates = {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
    };

    memoryCoordinates = coordinates;
    return coordinates;
  })();

  try {
    return await coordinatesPromise;
  } finally {
    coordinatesPromise = undefined;
  }
}

export async function getUserLocation(forceRefresh = false) {
  const cached = memoryLocation ?? readCachedLocation();
  if (!forceRefresh && cached) {
    memoryLocation = cached;
    memoryCoordinates = { lat: cached.lat, lon: cached.lon };
    return cached;
  }

  // Unngår dupliserte oppslag.
  if (!forceRefresh && locationPromise) return locationPromise;

  locationPromise = (async () => {
    const coordinates = await getUserCoordinates(forceRefresh);
    let geo: Awaited<ReturnType<typeof reverseGeocode>>;

    try {
      geo = await reverseGeocode(coordinates.lat, coordinates.lon);
    } catch {
      geo = { label: "Din posisjon" };
    }

    const location: UserLocation = {
      lat: coordinates.lat,
      lon: coordinates.lon,
      placeLabel: geo.label,
      countryCode: geo.countryCode,
      updatedAtISO: new Date().toISOString(),
    };

    memoryLocation = location;
    writeCachedLocation(location);
    return location;
  })();

  try {
    return await locationPromise;
  } finally {
    locationPromise = undefined;
  }
}

export function useUserLocation() {
  const [state, setState] = useState<UserLocationState>(() => {
    const cached = memoryLocation ?? readCachedLocation();
    return cached ? { status: "success", data: cached } : { status: "idle" };
  });

  const load = useCallback(async (forceRefresh = false) => {
    setState((prev) => {
      if (prev.status === "success") return { ...prev, refreshing: true };
      return { status: "loading" };
    });

    try {
      const location = await getUserLocation(forceRefresh);
      setState({ status: "success", data: location, refreshing: false });
    } catch (e: unknown) {
      setState((prev) => {
        if (prev.status === "success") return { ...prev, refreshing: false };
        const error = e instanceof Error ? e.message : "Ukjent feil";
        return { status: "error", error, refreshing: false };
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    state,
    actions: {
      refresh: () => load(true),
    },
  };
}
