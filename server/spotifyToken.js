import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.get("/token", async (req, res) => {
  const code = req.query.code;

  console.log("Received Spotify code:", code);

  if (!code) {
    return res.status(400).json({ error: "missing code" });
  }

  try {
    const response = await fetch(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(
              process.env.SPOTIFY_CLIENT_ID +
              ":" +
              process.env.SPOTIFY_CLIENT_SECRET
            ).toString("base64"),
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: "http://127.0.0.1:5173/callback",
        }),
      }
    );

    const text = await response.text();
    console.log("Spotify response:", text);

    res.send(text);

  } catch (err) {
    console.error("Spotify token exchange failed:", err);
    res.status(500).json({ error: "token exchange failed" });
  }
});

export default router;