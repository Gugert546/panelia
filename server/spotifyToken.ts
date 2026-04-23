import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// Navn på HTTP-only cookie som lagrer Spotify refresh-token.
const SPOTIFY_REFRESH_COOKIE = "spotify_refresh";

type SpotifyTokenPayload = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  [key: string]: unknown;
};

function parseCookies(cookieHeader?: string) {
  if (!cookieHeader) return {} as Record<string, string>;

  // Enkel cookie-parser for å unngå ekstra avhengighet.
  return cookieHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join("=") || "");
    return acc;
  }, {});
}

function spotifyBasicAuthHeader() {
  // Spotify krever client_id + client_secret i Basic Authorization.
  return (
    "Basic " +
    Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64")
  );
}

function spotifyRedirectUri() {
  // Redirect URI må matche eksakt med det som er konfigurert hos Spotify.
  return process.env.NODE_ENV === "production"
    ? "https://panelia.web.app/callback"
    : "http://127.0.0.1:5173/callback";
}

function setRefreshCookie(res: express.Response, refreshToken: string) {
  const isProd = process.env.NODE_ENV === "production";

  // Refresh-token holdes utilgjengelig for JS via HTTP-only cookie.
  res.cookie(SPOTIFY_REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/api/spotify",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: express.Response) {
  const isProd = process.env.NODE_ENV === "production";
  // Bruk samme cookie-attributter som ved set, ellers kan ikke cookie slettes korrekt.
  res.clearCookie(SPOTIFY_REFRESH_COOKIE, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/api/spotify",
  });
}

router.post("/token", async (req, res) => {

  // Frontend sender autorisasjonskoden etter Spotify callback.
  const code = req.body?.code;

  if (typeof code !== "string" || !code) {
    return res.status(400).json({ error: "missing code" });
  }

  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    return res.status(500).json({ error: "Spotify credentials are not configured" });
  }

  const redirect_uri = spotifyRedirectUri();

  try {

    // Bytt autorisasjonskode mot access-token + refresh-token hos Spotify.
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: spotifyBasicAuthHeader(),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri,
      }),
    });

    const payload = (await response.json()) as SpotifyTokenPayload;

    if (!response.ok) {
      return res.status(response.status).json(payload);
    }

    if (typeof payload?.refresh_token === "string" && payload.refresh_token) {
      setRefreshCookie(res, payload.refresh_token);
    }

    // Returnerer kun access token til klient, aldri refresh-token.
    return res.json({
      access_token: payload?.access_token ?? null,
      expires_in: payload?.expires_in ?? null,
      token_type: payload?.token_type ?? null,
      scope: payload?.scope ?? null,
    });

  } catch (err) {

    console.error("Spotify token exchange failed:", err);

    return res.status(500).json({ error: "token exchange failed" });
  }

});
router.post("/refresh", async (req, res) => {

  // Refresh-token leses kun fra HTTP-only cookie (ikke fra body/query/localStorage).
  const cookies = parseCookies(req.headers.cookie);
  const refresh_token = cookies[SPOTIFY_REFRESH_COOKIE];

  if (typeof refresh_token !== "string" || !refresh_token) {
    return res.status(401).json({ error: "missing refresh token cookie" });
  }

  try {

    // Hent nytt access-token ved hjelp av refresh-token.
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: spotifyBasicAuthHeader(),
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token,
      }),
    });

    const data = (await response.json()) as SpotifyTokenPayload;

    if (!response.ok) {
      clearRefreshCookie(res);
      return res.status(response.status).json(data);
    }

    // Spotify kan rotere refresh-token; oppdater cookie hvis vi får en ny.
    if (typeof data?.refresh_token === "string" && data.refresh_token) {
      setRefreshCookie(res, data.refresh_token);
    }

    res.json({
      access_token: data?.access_token ?? null,
      expires_in: data?.expires_in ?? null,
      token_type: data?.token_type ?? null,
      scope: data?.scope ?? null,
    });

  } catch (err) {

    console.error("Spotify refresh failed:", err);

    res.status(500).json({ error: "refresh failed" });

  }

});
export default router;