import { useEffect, useState } from "react";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";

export default function SpotifyWidget() {

  const [track, setTrack] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("spotify_token");
    if (!storedToken) return;

    setToken(storedToken);
  }, []);

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

      if (res.status === 204) {
        setTrack(null);
        return;
      }

      const data = await res.json();
      setTrack(data);

    };

    fetchTrack();

  }, [token]);

  const handleConnect = () => {

    const clientId = "311e91e754f0449eb4bddba53e9414d1";
    const redirectUri = "https://panelia.web.app/callback";
    const scope = "user-read-currently-playing user-read-playback-state";

    window.location.href =
      "https://accounts.spotify.com/authorize" +
      `?client_id=${clientId}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}`;

  };

  return (
    <WidgetContainer>
      <WidgetPane>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            height: "100%",
          }}
        >

          {!token && (
            <button
              onClick={handleConnect}
              style={{
                padding: "6px 10px",
                fontSize: 14,
                cursor: "pointer"
              }}
            >
              Connect Spotify
            </button>
          )}

          {token && (!track || !track.item) && (
            <div style={{ fontSize: 14 }}>
              Nothing playing
            </div>
          )}

          {token && track && track.item && (
            <>
              <img
                src={track.item.album.images[0].url}
                width={48}
                height={48}
                style={{ borderRadius: 6 }}
              />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  fontSize: 14
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  {track.item.name}
                </div>

                <div style={{ opacity: 0.7 }}>
                  {track.item.artists.map((a: any) => a.name).join(", ")}
                </div>
              </div>
            </>
          )}

        </div>

      </WidgetPane>
    </WidgetContainer>
  );
}