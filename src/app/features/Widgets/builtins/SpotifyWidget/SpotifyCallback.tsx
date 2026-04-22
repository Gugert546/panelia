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

    fetch("/api/spotify/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({ code }),
    })
      .then(res => res.json())
      .then(data => {
        // Token lagres ikke i localStorage; refresh håndteres av HTTP-only cookie i backend.
        // Rydd opp gamle nøkler fra tidligere implementasjon.
        localStorage.removeItem("spotify_token");
        localStorage.removeItem("spotify_refresh");

        if (!data?.access_token) {
          console.error("Spotify token response mangler access_token");
        }

        navigate("/dashboard");

      });

  }, []);

  return <div>Connecting Spotify...</div>;
}