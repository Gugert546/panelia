import { useEffect, useState } from "react";

export default function SpotifyWidget() {

  const [token, setToken] = useState<string | null>(null);
  const [player, setPlayer] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [volume, setVolume] = useState(50);

  /* -------------------------
     TOKEN REFRESH
  -------------------------- */

  useEffect(() => {

    const refresh = localStorage.getItem("spotify_refresh");

    if (!refresh) return;

    const refreshToken = async () => {

      const res = await fetch(
        `/api/spotify/refresh?refresh_token=${refresh}`
      );

      const data = await res.json();

      if (data.access_token) {

        localStorage.setItem(
          "spotify_token",
          data.access_token
        );

        setToken(data.access_token);

      }

    };

    const interval = setInterval(refreshToken, 50 * 60 * 1000);

    return () => clearInterval(interval);

  }, []);

  /* -------------------------
     LOAD TOKEN
  -------------------------- */

  useEffect(() => {

    const storedToken = localStorage.getItem("spotify_token");

    if (storedToken) setToken(storedToken);

  }, []);

  /* -------------------------
     FETCH PLAYER
  -------------------------- */

  const fetchPlayer = async () => {

    if (!token) return;

    const res = await fetch(
      "https://api.spotify.com/v1/me/player",
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (res.status === 204) return;

    const data = await res.json();

    setPlayer(data);

    if (data.device?.volume_percent !== undefined) {
      setVolume(data.device.volume_percent);
    }

  };

  /* -------------------------
     FETCH DEVICES
  -------------------------- */

  const fetchDevices = async () => {

    if (!token) return;

    const res = await fetch(
      "https://api.spotify.com/v1/me/player/devices",
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const data = await res.json();

    setDevices(data.devices);

  };

  /* -------------------------
     AUTO UPDATE PLAYER
  -------------------------- */

  useEffect(() => {

    if (!token) return;

    fetchPlayer();
    fetchDevices();

    const interval = setInterval(() => {

      fetchPlayer();
      fetchDevices();

    }, 5000);

    return () => clearInterval(interval);

  }, [token]);

  /* -------------------------
     PROGRESS TIMER
  -------------------------- */

  useEffect(() => {

    if (!player?.is_playing) return;

    const interval = setInterval(() => {

      setPlayer((prev: any) => ({
        ...prev,
        progress_ms: prev.progress_ms + 1000
      }));

    }, 1000);

    return () => clearInterval(interval);

  }, [player?.is_playing]);

  /* -------------------------
     LOGOUT
  -------------------------- */

  const logoutSpotify = () => {

    localStorage.removeItem("spotify_token");
    localStorage.removeItem("spotify_refresh");

    setToken(null);
    setPlayer(null);

  };

  /* -------------------------
     LOGIN BUTTON
  -------------------------- */

  if (!token) {

    const clientId = "311e91e754f0449eb4bddba53e9414d1";

    const redirectUri =
      window.location.hostname === "127.0.0.1"
        ? "http://127.0.0.1:5173/callback"
        : "https://panelia.web.app/callback";

    const scope =
      "user-read-currently-playing user-read-playback-state user-modify-playback-state";

    return (
      <button
        onClick={() => {

          window.location.href =
            "https://accounts.spotify.com/authorize" +
            `?client_id=${clientId}` +
            `&response_type=code` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&scope=${encodeURIComponent(scope)}` +
            `&show_dialog=true`;

        }}
      >
        Connect Spotify
      </button>
    );

  }

  /* -------------------------
     PLAYER EMPTY
  -------------------------- */

  if (!player || !player.item) {
    return <div>Start playing a song on Spotify</div>;
  }

  const track = player.item;
  const progress = player.progress_ms;
  const duration = track.duration_ms;

  /* -------------------------
     DEVICE SELECTION
  -------------------------- */

  const getActiveDevice = () => {

    return devices.find((d) => d.is_active) || devices[0];

  };

  /* -------------------------
     PLAY / PAUSE
  -------------------------- */

  const playPause = async () => {

    if (!devices.length) {
      alert("Open Spotify on a device first");
      return;
    }

    const device = getActiveDevice();

    const endpoint = player?.is_playing ? "pause" : "play";

    await fetch(
      `https://api.spotify.com/v1/me/player/${endpoint}?device_id=${device.id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    fetchPlayer();

  };

  /* -------------------------
     NEXT
  -------------------------- */

  const nextTrack = async () => {

    await fetch(
      "https://api.spotify.com/v1/me/player/next",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }
    );

  };

  /* -------------------------
     PREVIOUS
  -------------------------- */

  const prevTrack = async () => {

    await fetch(
      "https://api.spotify.com/v1/me/player/previous",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }
    );

  };

  /* -------------------------
     SEEK
  -------------------------- */

  const seek = async (pos: number) => {

    await fetch(
      `https://api.spotify.com/v1/me/player/seek?position_ms=${pos}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      }
    );

  };

  /* -------------------------
     VOLUME
  -------------------------- */

  const changeVolume = async (v: number) => {

    setVolume(v);

    await fetch(
      `https://api.spotify.com/v1/me/player/volume?volume_percent=${v}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      }
    );

  };

  /* -------------------------
     CHANGE DEVICE
  -------------------------- */

  const changeDevice = async (id: string) => {

    await fetch(
      "https://api.spotify.com/v1/me/player",
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          device_ids: [id]
        })
      }
    );

  };

  /* -------------------------
     UI
  -------------------------- */

  return (

    <div style={{
      padding: 16,
      width: 300,
      background: "#181818",
      color: "white",
      borderRadius: 12
    }}>

      <img
        src={track.album.images[0].url}
        width="100%"
        style={{ borderRadius: 8 }}
      />

      <div style={{ marginTop: 10, fontWeight: 600 }}>
        {track.name}
      </div>

      <div style={{ fontSize: 13, opacity: 0.7 }}>
        {track.artists.map((a: any) => a.name).join(", ")}
      </div>

      {/* SEEK BAR */}

      <input
        type="range"
        min={0}
        max={duration}
        value={progress}
        onChange={(e) => seek(Number(e.target.value))}
        style={{
          width: "100%",
          marginTop: 10,
          accentColor: "#1DB954"
        }}
      />

      {/* CONTROLS */}

      <div style={{ marginTop: 10 }}>
        <button onClick={prevTrack}>⏮</button>
        <button onClick={playPause}>
          {player.is_playing ? "⏸" : "▶"}
        </button>
        <button onClick={nextTrack}>⏭</button>
      </div>

      {/* VOLUME */}

      <div style={{ marginTop: 10 }}>
        🔊
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => changeVolume(Number(e.target.value))}
        />
      </div>

      {/* DEVICE SELECTOR */}

      <div style={{ marginTop: 10 }}>
        🎧
        <select onChange={(e) => changeDevice(e.target.value)}>
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* LOGOUT */}

      <button
        onClick={logoutSpotify}
        style={{
          marginTop: 12,
          width: "100%",
          padding: "6px",
          background: "#1DB954",
          border: "none",
          borderRadius: 6,
          color: "white",
          cursor: "pointer"
        }}
      >
        Disconnect Spotify
      </button>

    </div>

  );

}