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

export default router;
