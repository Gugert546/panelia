import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function SpotifyCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      navigate("/dashboard");
      return;
    }

    const exchangeCode = async () => {
      try {
        const res = await fetch(`/api/spotify/token?code=${encodeURIComponent(code)}`);
        const raw = await res.text();

        let data: any = null;
        try {
          data = JSON.parse(raw);
        } catch {
          throw new Error(`Non-JSON response (${res.status}): ${raw.slice(0, 120)}`);
        }

        if (!res.ok) {
          throw new Error(data?.error || `Spotify token exchange failed (${res.status})`);
        }

        if (data?.access_token) {
          localStorage.setItem("spotify_token", data.access_token);

          if (typeof data.expires_in === "number") {
            const expiresAt = Date.now() + data.expires_in * 1000;
            localStorage.setItem("spotify_expires_at", String(expiresAt));
          }

          if (data.refresh_token) {
            localStorage.setItem("spotify_refresh", data.refresh_token);
          }
        }

        navigate("/dashboard");
      } catch (err) {
        console.error("Spotify error:", err);
        navigate("/dashboard");
      }
    };

    void exchangeCode();
  }, [navigate]);

  return <div>Connecting Spotify...</div>;
}
