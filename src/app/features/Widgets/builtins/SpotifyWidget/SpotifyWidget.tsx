import { useEffect, useState } from "react";

export default function SpotifyWidget() {
  const [track, setTrack] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  // Hent token fra localStorage
 useEffect(() => {
  const storedToken = localStorage.getItem("spotify_token");

  if (!storedToken) {
    console.log("No Spotify token found");
    return;
  }

  setToken(storedToken);
}, []);

  // Hent currently playing
 useEffect(() => {
  if (!token) return;

  const fetchTrack = async () => {
    const res = await fetch(
      "https://api.spotify.com/v1/me/player/currently-playing",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("Spotify status:", res.status);

    if (res.status === 204) {
      setTrack(null);
      return;
    }

    const data = await res.json();
    setTrack(data);
  };

  fetchTrack();
}, [token]);

  // Spotify connect
 const handleConnect = () => {
  const clientId = "311e91e754f0449eb4bddba53e9414d1"; //bruke env?
  const redirectUri = "https://panelia.web.app/callback";

 const scope = "user-read-currently-playing user-read-playback-state";

  window.location.href =
  "https://accounts.spotify.com/authorize" +
  `?client_id=${clientId}` +
  `&response_type=code` +
  `&redirect_uri=${encodeURIComponent(redirectUri)}` +
  `&scope=${encodeURIComponent(scope)}`;
};

  // Hvis ikke logget inn
  if (!token) {
    return (
      <div style={{ padding: 20 }}>
        <button onClick={handleConnect}>Connect Spotify</button>
      </div>
    );
  }

  // Hvis ingen sang spiller
  if (!track || !track.item) {
    return <div style={{ padding: 20 }}>Nothing playing</div>;
  }

  const song = track.item;

  return (
    <div
      style={{
        padding: 16,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <img
        src={song.album.images[0].url}
        width={64}
        height={64}
        style={{ borderRadius: 6 }}
      />

      <div>
        <div style={{ fontWeight: 600 }}>{song.name}</div>
        <div style={{ fontSize: 13, opacity: 0.7 }}>
          {song.artists.map((a: any) => a.name).join(", ")}
        </div>
      </div>
    </div>
  );
}