import { useEffect, useState } from "react";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";

type WidgetSize = "small" | "medium" | "large" | "wide";

type Props = {
  size: WidgetSize;
};

type SpotifyTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
};

const SPOTIFY_CURRENTLY_PLAYING_URL =
  "https://api.spotify.com/v1/me/player/currently-playing";

function storeSpotifyTokenData(data: SpotifyTokenResponse) {
  if (data.access_token) {
    localStorage.setItem("spotify_token", data.access_token);
  }

  if (typeof data.expires_in === "number") {
    const expiresAt = Date.now() + data.expires_in * 1000;
    localStorage.setItem("spotify_expires_at", String(expiresAt));
  }

  if (data.refresh_token) {
    localStorage.setItem("spotify_refresh", data.refresh_token);
  }
}

async function refreshSpotifyAccessToken() {
  const refreshToken = localStorage.getItem("spotify_refresh");

  if (!refreshToken) {
    throw new Error("Missing Spotify refresh token");
  }

  const response = await fetch("/api/spotify/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const payload = (await response.json()) as SpotifyTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new Error(payload?.error || `Spotify refresh failed (${response.status})`);
  }

  storeSpotifyTokenData(payload);
  return payload.access_token;
}

async function ensureSpotifyAccessToken(currentToken: string) {
  const expiresAtRaw = localStorage.getItem("spotify_expires_at");
  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : Number.NaN;
  const msUntilExpiry = expiresAt - Date.now();

  if (Number.isFinite(msUntilExpiry) && msUntilExpiry > 60_000) {
    return currentToken;
  }

  return refreshSpotifyAccessToken();
}

export default function SpotifyWidget({ size }: Props) {
  const [track, setTrack] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("spotify_token");
    if (!storedToken) {
      return;
    }

    setToken(storedToken);
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    const fetchTrack = async () => {
      try {
        let activeToken = await ensureSpotifyAccessToken(token);

        if (activeToken !== token) {
          setToken(activeToken);
        }

        let res = await fetch(SPOTIFY_CURRENTLY_PLAYING_URL, {
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
        });

        if (res.status === 401) {
          activeToken = await refreshSpotifyAccessToken();
          setToken(activeToken);

          res = await fetch(SPOTIFY_CURRENTLY_PLAYING_URL, {
            headers: {
              Authorization: `Bearer ${activeToken}`,
            },
          });
        }

        if (res.status === 204) {
          setTrack(null);
          return;
        }

        if (!res.ok) {
          throw new Error(`Spotify request failed (${res.status})`);
        }

        const data = await res.json();
        setTrack(data);
      } catch (error) {
        console.error("Spotify currently-playing failed:", error);
        setTrack(null);
      }
    };

    void fetchTrack();
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

  const coverSize = size === "small" ? 36 : size === "medium" ? 48 : size === "large" ? 64 : 48;

  const fontSize = size === "small" ? 12 : size === "medium" ? 14 : 16;

  return (
    <WidgetContainer size={size}>
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
                fontSize,
              }}
            >
              Connect Spotify
            </button>
          )}

          {token && (!track || !track.item) && <div style={{ fontSize }}>Nothing playing</div>}

          {token && track && track.item && (
            <>
              <img
                src={track.item.album.images[0].url}
                width={coverSize}
                height={coverSize}
                style={{ borderRadius: 6 }}
              />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  fontSize,
                }}
              >
                <div style={{ fontWeight: 600 }}>{track.item.name}</div>

                {size !== "small" && (
                  <div style={{ opacity: 0.7 }}>{track.item.artists.map((a: any) => a.name).join(", ")}</div>
                )}
              </div>
            </>
          )}
        </div>
      </WidgetPane>
    </WidgetContainer>
  );
}
