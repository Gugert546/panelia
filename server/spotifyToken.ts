import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.get("/token", async (req, res) => {

  const code = req.query.code;

  if (typeof code !== "string" || !code) {
    return res.status(400).json({ error: "missing code" });
  }

  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    return res.status(500).json({ error: "Spotify credentials are not configured" });
  }

  const redirect_uri =
    process.env.NODE_ENV === "production"
      ? "https://panelia.web.app/callback"
      : "http://127.0.0.1:5173/callback";

  try {

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri,
      }),
    });

    const payload = await response.json();

    return res.status(response.status).json(payload);

  } catch (err) {

    console.error("Spotify token exchange failed:", err);

    return res.status(500).json({ error: "token exchange failed" });
  }

});
router.get("/refresh", async (req, res) => {

  const refresh_token = req.query.refresh_token;

if (typeof refresh_token !== "string") {
  return res.status(400).json({ error: "invalid refresh_token" });
}

  if (!refresh_token) {
    return res.status(400).json({ error: "missing refresh_token" });
  }

  try {

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token,
      }),
    });

    const data = await response.json();

    res.json(data);

  } catch (err) {

    console.error("Spotify refresh failed:", err);

    res.status(500).json({ error: "refresh failed" });

  }

});
export default router;