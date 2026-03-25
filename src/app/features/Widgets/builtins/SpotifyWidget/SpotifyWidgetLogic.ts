import { useEffect, useState } from "react";

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

export function useSpotifyWidgetLogic() {
  const [token, setToken] = useState<string | null>(null);
  const [player, setPlayer] = useState<SpotifyPlayerState | null>(null);
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const [volume, setVolume] = useState(50);
  const [isDarkMode, setIsDarkMode] = useState(() => getStoredBool("spotify_widget_dark_mode", true));
  const [isMinimized, setIsMinimized] = useState(() => getStoredBool("spotify_widget_minimized", false));

  useEffect(() => {
    localStorage.setItem("spotify_widget_dark_mode", String(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem("spotify_widget_minimized", String(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    const refresh = localStorage.getItem("spotify_refresh");

    if (!refresh) return;

    const refreshToken = async () => {
      const res = await fetch(`/api/spotify/refresh?refresh_token=${refresh}`);
      const data = await res.json();

      if (data.access_token) {
        localStorage.setItem("spotify_token", data.access_token);
        setToken(data.access_token);
      }
    };

    refreshToken();

    const interval = setInterval(refreshToken, 50 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchPlayer = async () => {
    if (!token) return;

    const res = await fetch("https://api.spotify.com/v1/me/player", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.status === 204) {
      setPlayer(null);
      return;
    }

    const data = await res.json();

    if (!data || !data.item) {
      setPlayer(null);
      return;
    }

    setPlayer(data);

    if (data.device?.volume_percent !== undefined) {
      setVolume(data.device.volume_percent);
    }
  };

  const fetchDevices = async () => {
    if (!token) return;

    const res = await fetch("https://api.spotify.com/v1/me/player/devices", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    setDevices(data.devices || []);
  };

  useEffect(() => {
    if (!token) return;

    fetchPlayer();
    fetchDevices();

    const interval = setInterval(() => {
      fetchPlayer();
      fetchDevices();
    }, 4000);

    return () => clearInterval(interval);
  }, [token]);

  const getDevice = () => {
    if (!devices.length) return null;
    return devices.find((device) => device.is_active) || devices[0];
  };

  const playPause = async () => {
    if (!token) return;

    const device = getDevice();

    if (!device) {
      alert("Open Spotify on a device first");
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
