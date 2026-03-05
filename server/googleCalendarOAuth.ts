import express from "express";
import fetch from "node-fetch";
import { createHmac } from "crypto";
import { adminAuth, adminDb } from "./firebaseAdmin";

type IntegrationDoc = {
  connected?: boolean;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
  scope?: string | null;
  tokenType?: string | null;
  updatedAt?: number;
};

type SyncEventPayload = {
  id: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  timezone?: string;
  googleEventId?: string;
};

const router = express.Router();

function getBaseUrl(req: express.Request) {
  return `${req.protocol}://${req.get("host")}`;
}

function getBearerToken(req: express.Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

async function requireUid(req: express.Request, res: express.Response) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "missing bearer token" });
    return null;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    res.status(401).json({ error: "invalid bearer token" });
    return null;
  }
}

function stateSecret() {
  return process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.GOOGLE_CLIENT_SECRET || "calendar-oauth-state";
}

function signState(payload: string) {
  return createHmac("sha256", stateSecret()).update(payload).digest("base64url");
}

function encodeState(data: { uid: string; returnTo: string }) {
  const payload = Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
  const sig = signState(payload);
  return `${payload}.${sig}`;
}

function decodeState(state?: string | string[]) {
  const normalizedState = Array.isArray(state) ? state[0] : state;
  if (!normalizedState || typeof normalizedState !== "string") return null;

  const [payload, sig] = normalizedState.split(".");
  if (!payload || !sig) return null;
  if (signState(payload) !== sig) return null;

  try {
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as { uid?: string; returnTo?: string };

    if (!parsed.uid || !parsed.returnTo) return null;
    return { uid: parsed.uid, returnTo: parsed.returnTo };
  } catch {
    return null;
  }
}

function buildGoogleAuthUrl(req: express.Request, state: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials are not configured");
  }

  const callbackUrl = process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${getBaseUrl(req)}/api/google-calendar/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function getIntegrationRef(uid: string) {
  return adminDb.doc(`users/${uid}/integrations/googleCalendar`);
}

async function getIntegration(uid: string) {
  const ref = await getIntegrationRef(uid);
  const snap = await ref.get();
  if (!snap.exists) return { ref, data: null as IntegrationDoc | null };
  return { ref, data: (snap.data() || {}) as IntegrationDoc };
}

async function refreshAccessTokenIfNeeded(uid: string, integration: IntegrationDoc, ref: FirebaseFirestore.DocumentReference) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials are not configured");
  }

  const now = Date.now();
  const expiresAt = integration.expiresAt ?? 0;
  const shouldRefresh = Boolean(integration.refreshToken) && (!integration.accessToken || now > expiresAt - 60_000);

  if (!shouldRefresh) {
    return integration.accessToken ?? null;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: integration.refreshToken ?? "",
    }),
  });

  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(`Failed to refresh Google token: ${JSON.stringify(payload)}`);
  }

  const nextAccessToken = typeof payload.access_token === "string" ? payload.access_token : null;
  const nextExpiresAt = typeof payload.expires_in === "number" ? Date.now() + payload.expires_in * 1000 : integration.expiresAt ?? null;

  await ref.set(
    {
      connected: true,
      accessToken: nextAccessToken,
      expiresAt: nextExpiresAt,
      updatedAt: Date.now(),
    },
    { merge: true }
  );

  return nextAccessToken;
}

async function getUsableAccessToken(uid: string) {
  const { ref, data } = await getIntegration(uid);
  if (!data || !data.connected) {
    throw new Error("Google Calendar is not connected");
  }

  const token = await refreshAccessTokenIfNeeded(uid, data, ref);
  if (!token) throw new Error("Missing Google access token");
  return token;
}

function toGoogleEventBody(event: SyncEventPayload) {
  const timezone = event.timezone || "UTC";

  if (event.allDay) {
    const startDate = new Date(event.startAt).toISOString().slice(0, 10);
    const endDate = new Date(event.endAt).toISOString().slice(0, 10);
    return {
      summary: event.title,
      description: event.description || "",
      start: { date: startDate },
      end: { date: endDate },
    };
  }

  return {
    summary: event.title,
    description: event.description || "",
    start: {
      dateTime: event.startAt,
      timeZone: timezone,
    },
    end: {
      dateTime: event.endAt,
      timeZone: timezone,
    },
  };
}

async function googleApiRequest(accessToken: string, url: string, method: "POST" | "PUT" | "DELETE", body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload: Record<string, unknown> | null = null;
  try {
    payload = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(`Google Calendar API ${method} failed: ${response.status} ${text}`);
  }

  return payload;
}

async function googleApiGet(accessToken: string, url: string) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const text = await response.text();
  let payload: Record<string, unknown> | null = null;
  try {
    payload = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(`Google Calendar API GET failed: ${response.status} ${text}`);
  }

  return payload;
}

function toEpoch(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }

  if (typeof value === "object" && value !== null) {
    const candidate = value as { toMillis?: () => number };
    if (typeof candidate.toMillis === "function") {
      const millis = candidate.toMillis();
      if (Number.isFinite(millis)) return millis;
    }
  }

  return 0;
}

function toIso(date: string | null | undefined, fallbackMs: number) {
  if (date) {
    const parsed = Date.parse(date);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }

  return new Date(fallbackMs).toISOString();
}

function mapGoogleEvent(item: Record<string, unknown>, fallbackNow: number) {
  const id = typeof item.id === "string" ? item.id : `tmp-${fallbackNow}`;
  const summary = typeof item.summary === "string" ? item.summary : "Untitled event";
  const description = typeof item.description === "string" ? item.description : "";

  const startObj = (item.start ?? {}) as Record<string, unknown>;
  const endObj = (item.end ?? {}) as Record<string, unknown>;

  const startDateTime = typeof startObj.dateTime === "string" ? startObj.dateTime : null;
  const endDateTime = typeof endObj.dateTime === "string" ? endObj.dateTime : null;
  const startDate = typeof startObj.date === "string" ? startObj.date : null;
  const endDate = typeof endObj.date === "string" ? endObj.date : null;

  const allDay = Boolean(startDate && !startDateTime);
  const timezone =
    (typeof startObj.timeZone === "string" && startObj.timeZone) ||
    (typeof endObj.timeZone === "string" && endObj.timeZone) ||
    "UTC";

  const startAt = allDay
    ? toIso(startDate ? `${startDate}T00:00:00.000Z` : null, fallbackNow)
    : toIso(startDateTime, fallbackNow);

  const endAt = allDay
    ? toIso(endDate ? `${endDate}T00:00:00.000Z` : null, fallbackNow + 60 * 60 * 1000)
    : toIso(endDateTime, fallbackNow + 60 * 60 * 1000);

  const updatedAt = typeof item.updated === "string" ? toEpoch(item.updated) : fallbackNow;
  const createdAt = typeof item.created === "string" ? toEpoch(item.created) : updatedAt;

  return {
    googleEventId: id,
    title: summary,
    description,
    startAt,
    endAt,
    allDay,
    timezone,
    updatedAt: updatedAt || fallbackNow,
    createdAt: createdAt || fallbackNow,
  };
}

router.post("/connect-url", async (req, res) => {
  const uid = await requireUid(req, res);
  if (!uid) return;

  const returnTo = typeof req.body?.returnTo === "string" && req.body.returnTo ? req.body.returnTo : "/dashboard";

  try {
    const state = encodeState({ uid, returnTo });
    const url = buildGoogleAuthUrl(req, state);
    return res.json({ url });
  } catch (err) {
    console.error("Google connect-url error:", err);
    return res.status(500).json({ error: "failed to build oauth url" });
  }
});

router.get("/connect", async (req, res) => {
  const uid = await requireUid(req, res);
  if (!uid) return;

  const returnTo = typeof req.query.returnTo === "string" && req.query.returnTo ? req.query.returnTo : "/dashboard";

  try {
    const state = encodeState({ uid, returnTo });
    const url = buildGoogleAuthUrl(req, state);
    return res.redirect(url);
  } catch (err) {
    console.error("Google connect error:", err);
    return res.status(500).json({ error: "failed to build oauth url" });
  }
});

router.get("/callback", async (req, res) => {
  const code = req.query.code;

  if (typeof code !== "string" || !code) {
    return res.status(400).json({ error: "missing code" });
  }

  const stateParam = req.query.state;
  const normalizedStateParam =
    typeof stateParam === "string"
      ? stateParam
      : Array.isArray(stateParam)
        ? stateParam.filter((item): item is string => typeof item === "string")
        : undefined;
  const stateData = decodeState(normalizedStateParam);
  if (!stateData) {
    return res.status(400).json({ error: "invalid oauth state" });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: "Google OAuth credentials are not configured" });
  }

  const callbackUrl = process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${getBaseUrl(req)}/api/google-calendar/callback`;

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      }),
    });

    const payload = (await tokenResponse.json()) as Record<string, unknown>;

    if (!tokenResponse.ok) {
      console.error("Google token exchange failed:", payload);
      const url = new URL(stateData.returnTo, getBaseUrl(req));
      url.searchParams.set("calendar_oauth", "error");
      return res.redirect(url.toString());
    }

    const expiresAt = typeof payload.expires_in === "number" ? Date.now() + payload.expires_in * 1000 : null;

    await adminDb
      .doc(`users/${stateData.uid}/integrations/googleCalendar`)
      .set(
        {
          connected: true,
          accessToken: payload.access_token ?? null,
          refreshToken: payload.refresh_token ?? null,
          scope: payload.scope ?? null,
          tokenType: payload.token_type ?? null,
          expiresAt,
          updatedAt: Date.now(),
        },
        { merge: true }
      );

    const url = new URL(stateData.returnTo, getBaseUrl(req));
    url.searchParams.set("calendar_oauth", "connected");
    return res.redirect(url.toString());
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    const url = new URL(stateData.returnTo, getBaseUrl(req));
    url.searchParams.set("calendar_oauth", "error");
    return res.redirect(url.toString());
  }
});

router.get("/status", async (req, res) => {
  const uid = await requireUid(req, res);
  if (!uid) return;

  try {
    const docSnap = await adminDb.doc(`users/${uid}/integrations/googleCalendar`).get();
    if (!docSnap.exists) {
      return res.json({ connected: false });
    }

    const data = (docSnap.data() || {}) as IntegrationDoc;
    return res.json({
      connected: Boolean(data.connected),
      expiresAt: data.expiresAt ?? null,
      updatedAt: data.updatedAt ?? null,
      hasRefreshToken: Boolean(data.refreshToken),
    });
  } catch (err) {
    console.error("Google status error:", err);
    return res.status(500).json({ error: "failed to read status" });
  }
});

router.post("/disconnect", async (req, res) => {
  const uid = await requireUid(req, res);
  if (!uid) return;

  try {
    await adminDb.doc(`users/${uid}/integrations/googleCalendar`).delete();
    return res.json({ connected: false });
  } catch (err) {
    console.error("Google disconnect error:", err);
    return res.status(500).json({ error: "failed to disconnect" });
  }
});

router.post("/sync/create", async (req, res) => {
  const uid = await requireUid(req, res);
  if (!uid) return;

  const event = req.body?.event as SyncEventPayload | undefined;
  if (!event?.id || !event?.title || !event?.startAt || !event?.endAt) {
    return res.status(400).json({ error: "invalid event payload" });
  }

  try {
    const accessToken = await getUsableAccessToken(uid);
    const payload = await googleApiRequest(
      accessToken,
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      "POST",
      toGoogleEventBody(event)
    );

    return res.json({
      ok: true,
      googleEventId: typeof payload?.id === "string" ? payload.id : null,
    });
  } catch (err) {
    console.error("Google sync create error:", err);
    return res.status(500).json({ error: "failed to sync create" });
  }
});

router.post("/sync/update", async (req, res) => {
  const uid = await requireUid(req, res);
  if (!uid) return;

  const event = req.body?.event as SyncEventPayload | undefined;
  const googleEventId = typeof req.body?.googleEventId === "string" ? req.body.googleEventId : event?.googleEventId;

  if (!event?.id || !event?.title || !event?.startAt || !event?.endAt || !googleEventId) {
    return res.status(400).json({ error: "invalid update payload" });
  }

  try {
    const accessToken = await getUsableAccessToken(uid);
    await googleApiRequest(
      accessToken,
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(googleEventId)}`,
      "PUT",
      toGoogleEventBody(event)
    );

    return res.json({ ok: true, googleEventId });
  } catch (err) {
    console.error("Google sync update error:", err);
    return res.status(500).json({ error: "failed to sync update" });
  }
});

router.post("/sync/delete", async (req, res) => {
  const uid = await requireUid(req, res);
  if (!uid) return;

  const googleEventId = typeof req.body?.googleEventId === "string" ? req.body.googleEventId : null;
  if (!googleEventId) {
    return res.status(400).json({ error: "missing googleEventId" });
  }

  try {
    const accessToken = await getUsableAccessToken(uid);
    await googleApiRequest(
      accessToken,
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(googleEventId)}`,
      "DELETE"
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("Google sync delete error:", err);
    return res.status(500).json({ error: "failed to sync delete" });
  }
});

router.post("/sync/pull", async (req, res) => {
  const uid = await requireUid(req, res);
  if (!uid) return;

  const maxResultsRaw = Number(req.body?.maxResults ?? 250);
  const maxResults = Number.isFinite(maxResultsRaw)
    ? Math.max(1, Math.min(2500, Math.floor(maxResultsRaw)))
    : 250;

  try {
    const accessToken = await getUsableAccessToken(uid);

    const listUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    listUrl.searchParams.set("singleEvents", "true");
    listUrl.searchParams.set("orderBy", "startTime");
    listUrl.searchParams.set("timeMin", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    listUrl.searchParams.set("maxResults", String(maxResults));

    const payload = await googleApiGet(accessToken, listUrl.toString());
    const items = Array.isArray(payload?.items) ? (payload.items as Record<string, unknown>[]) : [];

    const eventsCollection = adminDb.collection(`users/${uid}/calendarEvents`);
    const localSnapshot = await eventsCollection.get();

    const byGoogleEventId = new Map<
      string,
      { id: string; updatedAt: number; createdAt: number; ref: FirebaseFirestore.DocumentReference }
    >();

    for (const doc of localSnapshot.docs) {
      const data = (doc.data() || {}) as Record<string, unknown>;
      const googleEventId = typeof data.googleEventId === "string" ? data.googleEventId : null;
      if (!googleEventId) continue;

      byGoogleEventId.set(googleEventId, {
        id: doc.id,
        updatedAt: toEpoch(data.updatedAt),
        createdAt: toEpoch(data.createdAt),
        ref: doc.ref,
      });
    }

    const batch = adminDb.batch();
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let deleted = 0;

    for (const item of items) {
      const now = Date.now();
      const status = typeof item.status === "string" ? item.status : "confirmed";
      const mapped = mapGoogleEvent(item, now);
      const existing = byGoogleEventId.get(mapped.googleEventId);

      if (status === "cancelled") {
        if (existing) {
          batch.delete(existing.ref);
          deleted += 1;
        }
        continue;
      }

      const nextId = existing?.id ?? `g_${mapped.googleEventId.replace(/\//g, "_")}`;
      const targetRef = existing?.ref ?? eventsCollection.doc(nextId);
      const incomingUpdatedAt = mapped.updatedAt;
      const currentUpdatedAt = existing?.updatedAt ?? 0;

      if (existing && incomingUpdatedAt < currentUpdatedAt) {
        skipped += 1;
        continue;
      }

      batch.set(
        targetRef,
        {
          id: nextId,
          userId: uid,
          title: mapped.title,
          description: mapped.description,
          startAt: mapped.startAt,
          endAt: mapped.endAt,
          allDay: mapped.allDay,
          timezone: mapped.timezone,
          source: "google",
          googleEventId: mapped.googleEventId,
          syncStatus: "synced",
          updatedAt: mapped.updatedAt,
          createdAt: existing?.createdAt || mapped.createdAt,
        },
        { merge: true }
      );

      if (existing) {
        updated += 1;
      } else {
        created += 1;
      }
    }

    await batch.commit();

    return res.json({
      ok: true,
      pulled: items.length,
      created,
      updated,
      deleted,
      skipped,
    });
  } catch (err) {
    console.error("Google sync pull error:", err);
    return res.status(500).json({ error: "failed to sync pull" });
  }
});

export default router;
