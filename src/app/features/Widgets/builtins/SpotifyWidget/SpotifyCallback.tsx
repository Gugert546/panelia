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

    fetch(`/api/spotify/token?code=${code}`)
      .then((res) => res.json())
      .then((data) => {

        console.log("Spotify token response:", data);

        if (data.access_token) {

          localStorage.setItem(
            "spotify_token",
            data.access_token
          );

        }

        if (data.refresh_token) {

          localStorage.setItem(
            "spotify_refresh",
            data.refresh_token
          );

        }

        navigate("/dashboard");

      })
      .catch((err) => {

        console.error("Spotify login failed:", err);

        navigate("/dashboard");

      });

  }, []);

  return <div>Connecting Spotify...</div>;
}