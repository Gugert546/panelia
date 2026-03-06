import { useEffect, useRef, useState } from "react";

export default function SpotifyWidget() {

  const [token, setToken] = useState<string | null>(null);
  const [track, setTrack] = useState<any>(null);
  const [volume, setVolume] = useState(1);

  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {

    const stored = localStorage.getItem("spotify_token");

    if (stored) setToken(stored);

  }, []);

  const fetchTrack = async () => {

    if (!token) return;

    const res = await fetch(
      "https://api.spotify.com/v1/me/player/currently-playing",
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (res.status === 204) return;

    const data = await res.json();

    setTrack(data.item);

  };

  useEffect(() => {

    if (!token) return;

    fetchTrack();

    const interval = setInterval(fetchTrack, 5000);

    return () => clearInterval(interval);

  }, [token]);

const changeVolume = async (v:number) => {

  await fetch(
    `https://api.spotify.com/v1/me/player/volume?volume_percent=${v}`,
    {
      method:"PUT",
      headers:{
        Authorization:`Bearer ${token}`
      }
    }
  );

};

  if (!token) {

    const clientId = "311e91e754f0449eb4bddba53e9414d1";

    const redirectUri =
      window.location.hostname === "127.0.0.1"
        ? "http://127.0.0.1:5173/callback"
        : "https://panelia.web.app/callback";

    const scope =
      "user-read-playback-state user-read-currently-playing";

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
      >
        Connect Spotify
      </button>

    );

  }

  if (!track) {
    return <div>Start playing something on Spotify</div>;
  }

  return (

    <div style={{
      padding: 16,
      width: 350,
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

      <div ref={playerRef}>

        <iframe
          src={`https://open.spotify.com/embed/track/${track.id}`}
          width="100%"
          height="80"
          allow="autoplay; clipboard-write; encrypted-media"
          style={{
            border: "none",
            marginTop: 10
          }}
        />

      </div>

      {/* Volume */}

      <div style={{ marginTop: 10 }}>

        🔊

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) =>
            changeVolume(Number(e.target.value))
          }
        />

      </div>

    </div>

  );

}