import express from "express";
import fetch from "node-fetch";

const router = express.Router();

function getSpotifyBasicAuthHeader() {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    return null;
  }

  return (
    "Basic " +
    Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64")
  );
}

router.get("/token", async (req, res) => {
  const code = req.query.code;

  if (typeof code !== "string" || !code) {
    return res.status(400).json({ error: "missing code" });
  }

  const authHeader = getSpotifyBasicAuthHeader();
  if (!authHeader) {
    return res.status(500).json({ error: "Spotify credentials are not configured" });
  }

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: authHeader,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: "https://panelia.web.app/callback",
      }),
    });

    const payload = await response.json();
    return res.status(response.status).json(payload);
  } catch (err) {
    console.error("Spotify token exchange failed:", err);
    return res.status(500).json({ error: "token exchange failed" });
  }
});

router.post("/refresh", async (req, res) => {
  const refreshToken = req.body?.refresh_token;

  if (typeof refreshToken !== "string" || !refreshToken) {
    return res.status(400).json({ error: "missing refresh_token" });
  }

  const authHeader = getSpotifyBasicAuthHeader();
  if (!authHeader) {
    return res.status(500).json({ error: "Spotify credentials are not configured" });
  }

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: authHeader,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const payload = await response.json();
    return res.status(response.status).json(payload);
  } catch (err) {
    console.error("Spotify token refresh failed:", err);
    return res.status(500).json({ error: "token refresh failed" });
  }
});

export default router;
