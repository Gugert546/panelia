import { useEffect, useRef, useState } from "react";

export type SpotifyArtist = { name: string };
export type SpotifyImage = { url: string };
export type SpotifyTrack = {
  name: string;
  duration_ms: number;
  artists: SpotifyArtist[];
  album: { images: SpotifyImage[] };
};

export type SpotifyDevice = {
  id: string;
  name: string;
  is_active?: boolean;
};

export type SpotifyPlayerState = {
  item: SpotifyTrack;
  progress_ms: number;
  is_playing: boolean;
  device?: { volume_percent?: number };
};

function getStoredBool(key: string, defaultValue: boolean) {
  if (typeof window === "undefined") return defaultValue;

  const value = localStorage.getItem(key);

  if (value === null) return defaultValue;

  return value === "true";
}

type SpotifyWidgetLogicOptions = {
  noDeviceAlertText?: string;
};

export function useSpotifyWidgetLogic(options: SpotifyWidgetLogicOptions = {}) {
  const [token, setToken] = useState<string | null>(null);
  const [player, setPlayer] = useState<SpotifyPlayerState | null>(null);
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const [volume, setVolume] = useState(50);
  const [isDarkMode, setIsDarkMode] = useState(() => getStoredBool("spotify_widget_dark_mode", true));
  const [isMinimized, setIsMinimized] = useState(() => getStoredBool("spotify_widget_minimized", false));
  const playerRetryAtRef = useRef(0);
  const devicesRetryAtRef = useRef(0);
  const isFetchingPlayerRef = useRef(false);
  const isFetchingDevicesRef = useRef(false);

  useEffect(() => {
    localStorage.setItem("spotify_widget_dark_mode", String(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem("spotify_widget_minimized", String(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    // Rydd opp gamle token-nøkler fra tidligere localStorage-basert løsning.
    localStorage.removeItem("spotify_token");
    localStorage.removeItem("spotify_refresh");
  }, []);

  useEffect(() => {
    const refreshToken = async () => {
      const res = await fetch("/api/spotify/refresh", {
        method: "POST",
        credentials: "same-origin",
      });

      if (!res.ok) {
        // Ingen gyldig cookie eller token ennå; da lar vi widgeten stå i frakoblet tilstand.
        return;
      }

      const data = await res.json();

      if (data.access_token) {
        // Access token beholdes kun i minne for å redusere eksponering ved XSS.
        setToken(data.access_token);
      }
    };

    refreshToken();

    const interval = setInterval(refreshToken, 50 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const parseSpotifyResponse = async (res: Response) => {
    const text = await res.text();

    if (!text) return null;

    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch (error) {
      console.warn("Spotify returned a non-JSON response", res.status, text);
      return null;
    }
  };

  const getRetryDelayMs = (res: Response) => {
    const retryAfterSeconds = Number(res.headers.get("Retry-After"));

    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
      return retryAfterSeconds * 1000;
    }

    return 30_000;
  };

  const fetchPlayer = async () => {
    if (!token || isFetchingPlayerRef.current || Date.now() < playerRetryAtRef.current) return;

    isFetchingPlayerRef.current = true;

    try {
      const res = await fetch("https://api.spotify.com/v1/me/player", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.status === 204) {
        setPlayer(null);
        playerRetryAtRef.current = 0;
        return;
      }

      if (res.status === 429) {
        playerRetryAtRef.current = Date.now() + getRetryDelayMs(res);
        return;
      }

      if (!res.ok) {
        return;
      }

      const data = await parseSpotifyResponse(res);

      if (!data || !("item" in data) || !data.item) {
        setPlayer(null);
        return;
      }

      const nextPlayer = data as unknown as SpotifyPlayerState;

      setPlayer(nextPlayer);
      playerRetryAtRef.current = 0;

      if (nextPlayer.device?.volume_percent !== undefined) {
        setVolume(nextPlayer.device.volume_percent);
      }
    } finally {
      isFetchingPlayerRef.current = false;
    }
  };

  const fetchDevices = async () => {
    if (!token || isFetchingDevicesRef.current || Date.now() < devicesRetryAtRef.current) return;

    isFetchingDevicesRef.current = true;

    try {
      const res = await fetch("https://api.spotify.com/v1/me/player/devices", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.status === 429) {
        devicesRetryAtRef.current = Date.now() + getRetryDelayMs(res);
        return;
      }

      if (!res.ok) {
        return;
      }

      const data = await parseSpotifyResponse(res);
      const nextDevices = Array.isArray(data?.devices) ? (data.devices as SpotifyDevice[]) : [];

      setDevices(nextDevices);
      devicesRetryAtRef.current = 0;
    } finally {
      isFetchingDevicesRef.current = false;
    }
  };

  useEffect(() => {
    if (!token) return;

    fetchPlayer();
    fetchDevices();

    const playerInterval = setInterval(() => {
      fetchPlayer();
    }, 10_000);

    const devicesInterval = setInterval(() => {
      fetchDevices();
    }, 30_000);

    return () => {
      clearInterval(playerInterval);
      clearInterval(devicesInterval);
    };
  }, [token]);

  const getDevice = () => {
    if (!devices.length) return null;
    return devices.find((device) => device.is_active) || devices[0];
  };

  const playPause = async () => {
    if (!token) return;

    const device = getDevice();

    if (!device) {
      alert(options.noDeviceAlertText || "Open Spotify on a device first");
      return;
    }

    const endpoint = player?.is_playing ? "pause" : "play";

    await fetch(`https://api.spotify.com/v1/me/player/${endpoint}?device_id=${device.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    setTimeout(fetchPlayer, 500);
  };

  const nextTrack = async () => {
    if (!token) return;

    const device = getDevice();

    if (!device) return;

    await fetch(`https://api.spotify.com/v1/me/player/next?device_id=${device.id}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    setTimeout(fetchPlayer, 500);
  };

  const prevTrack = async () => {
    if (!token) return;

    const device = getDevice();

    if (!device) return;

    await fetch(`https://api.spotify.com/v1/me/player/previous?device_id=${device.id}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    setTimeout(fetchPlayer, 500);
  };

  const changeVolume = async (nextVolume: number) => {
    setVolume(nextVolume);

    if (!token) return;

    const device = getDevice();

    if (!device) return;

    await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${nextVolume}&device_id=${device.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  };

  const seek = async (positionMs: number) => {
    if (!token) return;

    const device = getDevice();

    if (!device) return;

    await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}&device_id=${device.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  };

  const changeDevice = async (id: string) => {
    if (!token) return;

    await fetch("https://api.spotify.com/v1/me/player", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        device_ids: [id]
      })
    });

    setTimeout(fetchPlayer, 500);
  };

  const connectSpotify = () => {
    const clientId = "311e91e754f0449eb4bddba53e9414d1";

    const redirectUri =
      window.location.hostname === "127.0.0.1"
        ? "http://127.0.0.1:5173/callback"
        : "https://panelia.web.app/callback";

    const scope = "user-read-playback-state user-read-currently-playing user-modify-playback-state";

    window.location.href =
      "https://accounts.spotify.com/authorize" +
      `?client_id=${clientId}` +
      "&response_type=code" +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}`;
  };

  return {
    token,
    player,
    devices,
    volume,
    isDarkMode,
    isMinimized,
    setIsDarkMode,
    setIsMinimized,
    connectSpotify,
    playPause,
    nextTrack,
    prevTrack,
    changeVolume,
    seek,
    changeDevice
  };
}
