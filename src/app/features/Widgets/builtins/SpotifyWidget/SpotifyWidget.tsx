import { useEffect, useState } from "react";

export default function SpotifyWidget() {

  const [token, setToken] = useState<string | null>(null);
  const [player, setPlayer] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [volume, setVolume] = useState(50);

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

    refreshToken();

    const interval = setInterval(refreshToken, 50 * 60 * 1000);

    return () => clearInterval(interval);

  }, []);

  const fetchPlayer = async () => {

    if (!token) return;

    const res = await fetch(
      "https://api.spotify.com/v1/me/player",
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (res.status === 204) return;

    const data = await res.json();

    if (!data || !data.item) return;

    setPlayer(data);

    if (data.device?.volume_percent !== undefined) {
      setVolume(data.device.volume_percent);
    }

  };

  const fetchDevices = async () => {

    if (!token) return;

    const res = await fetch(
      "https://api.spotify.com/v1/me/player/devices",
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await res.json();

    setDevices(data.devices);

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

    return devices.find((d) => d.is_active) || devices[0];

  };

  const playPause = async () => {

    if (!token) return;

    const device = getDevice();

    if (!device) {
      alert("Open Spotify on a device first");
      return;
    }

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

    setTimeout(fetchPlayer, 500);

  };

  const nextTrack = async () => {

    const device = getDevice();

    if (!device) return;

    await fetch(
      `https://api.spotify.com/v1/me/player/next?device_id=${device.id}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    setTimeout(fetchPlayer, 500);

  };

  const prevTrack = async () => {

    const device = getDevice();

    if (!device) return;

    await fetch(
      `https://api.spotify.com/v1/me/player/previous?device_id=${device.id}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    setTimeout(fetchPlayer, 500);

  };

  const changeVolume = async (v: number) => {

    setVolume(v);

    const device = getDevice();

    if (!device) return;

    await fetch(
      `https://api.spotify.com/v1/me/player/volume?volume_percent=${v}&device_id=${device.id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

  };

  const seek = async (pos: number) => {

    const device = getDevice();

    if (!device) return;

    await fetch(
      `https://api.spotify.com/v1/me/player/seek?position_ms=${pos}&device_id=${device.id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

  };

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

    setTimeout(fetchPlayer, 500);

  };

  if (!token) {

    const clientId = "311e91e754f0449eb4bddba53e9414d1";

    const redirectUri =
      window.location.hostname === "127.0.0.1"
        ? "http://127.0.0.1:5173/callback"
        : "https://panelia.web.app/callback";

    const scope =
      "user-read-playback-state user-read-currently-playing user-modify-playback-state";

    return (
      <button
        onClick={() => {

          window.location.href =
            "https://accounts.spotify.com/authorize" +
            `?client_id=${clientId}` +
            `&response_type=code` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&scope=${encodeURIComponent(scope)}`;

        }}
        style={{
          padding: 12,
          background: "#1DB954",
          color: "white",
          border: "none",
          borderRadius: 8,
          cursor: "pointer"
        }}
      >
        Connect Spotify
      </button>
    );

  }

  if (!player) {
    return <div>Start playing Spotify on a device</div>;
  }

  const track = player.item;
  const progress = player.progress_ms;
  const duration = track.duration_ms;

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
        {track.artists.map((a:any)=>a.name).join(", ")}
      </div>

      <input
        type="range"
        min={0}
        max={duration}
        value={progress}
        onChange={(e)=>seek(Number(e.target.value))}
        style={{
          width:"100%",
          marginTop:10,
          accentColor:"#1DB954"
        }}
      />

      <div style={{marginTop:10}}>
        <button onClick={prevTrack}>⏮</button>
        <button onClick={playPause}>
          {player.is_playing ? "⏸" : "▶"}
        </button>
        <button onClick={nextTrack}>⏭</button>
      </div>

      <div style={{marginTop:10}}>
        🔊
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e)=>changeVolume(Number(e.target.value))}
        />
      </div>

      <div style={{marginTop:10}}>
        🎧
        <select
          onChange={(e)=>changeDevice(e.target.value)}
        >
          {devices.map((d)=>(
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

    </div>

  );

}
