import express from "express";
import fetch from "node-fetch";
import type { DocumentReference } from "@google-cloud/firestore";
import { adminAuth, adminDb } from "./firebaseAdmin";

type OutlookIntegrationDoc = {
  connected?: boolean;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
  scope?: string | null;
  tokenType?: string | null;
  updatedAt?: number;
  selectedCalendarIds?: string[];
  calendarDisabled?: boolean;
};

type SyncEventPayload = {
  id: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  timezone?: string;
  outlookEventId?: string;
  calendarId?: string;
};

type OutlookCalendar = {
  id?: string;
  name?: string;
  color?: string;
  isDefaultCalendar?: boolean;
};

type OutlookEvent = {
  id?: string;
  subject?: string;
  bodyPreview?: string;
  isAllDay?: boolean;
  isCancelled?: boolean;
  lastModifiedDateTime?: string;
  createdDateTime?: string;
  start?: {
    dateTime?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    timeZone?: string;
  };
};

const router = express.Router();
const OUTLOOK_CALENDAR_SCOPE = "offline_access User.Read Mail.Read Calendars.ReadWrite";
const OUTLOOK_CALENDAR_PREFIX = "outlook:";
const OUTLOOK_DEFAULT_CALENDAR_ID = `${OUTLOOK_CALENDAR_PREFIX}primary`;

const OUTLOOK_COLOR_MAP: Record<string, string> = {
  auto: "#0078d4",
  lightBlue: "#60a5fa",
  lightGreen: "#34d399",
  lightOrange: "#fb923c",
  lightGray: "#94a3b8",
  lightYellow: "#facc15",
  lightTeal: "#2dd4bf",
  lightPink: "#f472b6",
  lightBrown: "#a16207",
  lightRed: "#f87171",
  maxColor: "#0078d4",
};

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

function getOutlookCredentials() {
  const clientId = process.env.MICROSOFT_CLIENT_ID || process.env.OUTLOOK_CLIENT_ID || process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET || process.env.OUTLOOK_CLIENT_SECRET || process.env.AZURE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Microsoft OAuth credentials are not configured");
  }

  return { clientId, clientSecret };
}

function getIntegrationRef(uid: string) {
  return adminDb.doc(`users/${uid}/integrations/email_outlook`);
}

async function getIntegration(uid: string) {
  const ref = getIntegrationRef(uid);
  const snap = await ref.get();
  if (!snap.exists) return { ref, data: null as OutlookIntegrationDoc | null };
  return { ref, data: (snap.data() || {}) as OutlookIntegrationDoc };
}

function hasCalendarScope(scope: unknown) {
  if (typeof scope !== "string") return false;
  return scope
    .split(/\s+/)
    .some((item) => item.toLowerCase() === "calendars.readwrite" || item.toLowerCase() === "calendars.read");
}

async function refreshAccessTokenIfNeeded(
  integration: OutlookIntegrationDoc,
  ref: DocumentReference,
  requireCalendarScope = false
) {
  const now = Date.now();
  const expiresAt = integration.expiresAt ?? 0;
  const missingCalendarScope = requireCalendarScope && !hasCalendarScope(integration.scope);
  const shouldRefresh =
    Boolean(integration.refreshToken) &&
    (!integration.accessToken || now > expiresAt - 60_000 || missingCalendarScope);

  if (!shouldRefresh) {
    return integration.accessToken ?? null;
  }

  const { clientId, clientSecret } = getOutlookCredentials();
  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: OUTLOOK_CALENDAR_SCOPE,
      grant_type: "refresh_token",
      refresh_token: integration.refreshToken ?? "",
    }),
  });

  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(`Failed to refresh Outlook token: ${JSON.stringify(payload)}`);
  }

  const nextAccessToken = typeof payload.access_token === "string" ? payload.access_token : null;
  const nextExpiresAt =
    typeof payload.expires_in === "number"
      ? Date.now() + payload.expires_in * 1000
      : integration.expiresAt ?? null;

  await ref.set(
    {
      connected: true,
      accessToken: nextAccessToken,
      refreshToken:
        typeof payload.refresh_token === "string"
          ? payload.refresh_token
          : integration.refreshToken ?? null,
      scope: typeof payload.scope === "string" ? payload.scope : integration.scope ?? null,
      tokenType: typeof payload.token_type === "string" ? payload.token_type : integration.tokenType ?? null,
      expiresAt: nextExpiresAt,
      calendarDisabled: false,
      updatedAt: Date.now(),
    },
    { merge: true }
  );

  return nextAccessToken;
}

async function getUsableAccessToken(uid: string) {
  const { ref, data } = await getIntegration(uid);
  if (!data || !data.connected || data.calendarDisabled) {
    throw new Error("Outlook calendar is not connected");
  }

  const token = await refreshAccessTokenIfNeeded(data, ref, true);
  if (!token) throw new Error("Missing Outlook access token");
  return token;
}

async function graphApiGet(accessToken: string, url: string) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.timezone="UTC"',
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
    throw new Error(`Outlook Calendar API GET failed: ${response.status} ${text}`);
  }

  return payload;
}

async function graphApiRequest(
  accessToken: string,
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown
) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: 'outlook.timezone="UTC"',
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
    throw new Error(`Outlook Calendar API ${method} failed: ${response.status} ${text}`);
  }

  return payload;
}

function stripOutlookCalendarPrefix(calendarId: string) {
  return calendarId.startsWith(OUTLOOK_CALENDAR_PREFIX)
    ? calendarId.slice(OUTLOOK_CALENDAR_PREFIX.length)
    : calendarId;
}

function normalizeCalendarId(value: unknown) {
  const raw = typeof value === "string" && value.trim() ? value.trim() : OUTLOOK_DEFAULT_CALENDAR_ID;
  return raw.startsWith(OUTLOOK_CALENDAR_PREFIX) ? raw : `${OUTLOOK_CALENDAR_PREFIX}${raw}`;
}

function sanitizeCalendarIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((id): id is string => typeof id === "string")
        .map(normalizeCalendarId)
        .filter(Boolean)
    )
  );
}

function safeDocPart(value: string) {
  return value.replace(/[^\w-]/g, "_");
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
    const normalized = /(?:Z|[+-]\d{2}:\d{2})$/i.test(date) ? date : `${date}Z`;
    const parsed = Date.parse(normalized);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }

  return new Date(fallbackMs).toISOString();
}

function getCalendarEventsUrl(calendarId: string) {
  const rawCalendarId = stripOutlookCalendarPrefix(calendarId);
  if (rawCalendarId === "primary") {
    return "https://graph.microsoft.com/v1.0/me/calendar/events";
  }

  return `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(rawCalendarId)}/events`;
}

function getCalendarEventUrl(calendarId: string, eventId: string) {
  return `${getCalendarEventsUrl(calendarId)}/${encodeURIComponent(eventId)}`;
}

function toOutlookEventBody(event: SyncEventPayload) {
  const timezone = "UTC";
  const startAt = toIso(event.startAt, Date.now());
  const endAt = toIso(event.endAt, Date.now() + 60 * 60 * 1000);

  return {
    subject: event.title,
    body: {
      contentType: "text",
      content: event.description || "",
    },
    isAllDay: Boolean(event.allDay),
    start: {
      dateTime: startAt.replace(/\.000Z$/, "").replace(/Z$/, ""),
      timeZone: timezone,
    },
    end: {
      dateTime: endAt.replace(/\.000Z$/, "").replace(/Z$/, ""),
      timeZone: timezone,
    },
  };
}

function mapOutlookCalendar(item: OutlookCalendar) {
  const rawId = typeof item.id === "string" ? item.id : "";
  if (!rawId) return null;

  const color = typeof item.color === "string" ? item.color : "auto";

  return {
    id: `${OUTLOOK_CALENDAR_PREFIX}${rawId}`,
    summary: typeof item.name === "string" && item.name.trim() ? item.name : "Outlook calendar",
    backgroundColor: OUTLOOK_COLOR_MAP[color] || "#0078d4",
    foregroundColor: "#ffffff",
    selected: undefined,
    primary: Boolean(item.isDefaultCalendar),
  };
}

function mapOutlookEvent(item: OutlookEvent, fallbackNow: number) {
  const id = typeof item.id === "string" ? item.id : `tmp-${fallbackNow}`;
  const title = typeof item.subject === "string" && item.subject.trim() ? item.subject : "Untitled event";
  const description = typeof item.bodyPreview === "string" ? item.bodyPreview : "";
  const allDay = Boolean(item.isAllDay);
  const timezone = item.start?.timeZone || item.end?.timeZone || "UTC";
  const startAt = toIso(item.start?.dateTime, fallbackNow);
  const endAt = toIso(item.end?.dateTime, fallbackNow + 60 * 60 * 1000);
  const updatedAt =
    typeof item.lastModifiedDateTime === "string" ? toEpoch(item.lastModifiedDateTime) : fallbackNow;
  const createdAt =
    typeof item.createdDateTime === "string" ? toEpoch(item.createdDateTime) : updatedAt;

  return {
    outlookEventId: id,
    title,
    description,
    startAt,
    endAt,
    allDay,
    timezone,
    updatedAt: updatedAt || fallbackNow,
    createdAt: createdAt || fallbackNow,
  };
}

router.get("/status", async (req, res) => {
  const uid = await requireUid(req, res);
  if (!uid) return;

  try {
    const { ref, data } = await getIntegration(uid);
    if (!data || !data.connected || data.calendarDisabled) {
      return res.json({ connected: false, needsConsent: false });
    }

    if (!hasCalendarScope(data.scope)) {
      try {
        await refreshAccessTokenIfNeeded(data, ref, true);
      } catch {
        return res.json({ connected: false, needsConsent: true });
      }
    }

    return res.json({
      connected: true,
      needsConsent: false,
      expiresAt: data.expiresAt ?? null,
      updatedAt: data.updatedAt ?? null,
      hasRefreshToken: Boolean(data.refreshToken),
    });
  } catch (err) {
    console.error("Outlook calendar status error:", err);
    return res.status(500).json({ error: "failed to read outlook calendar status" });
  }
});

router.post("/disconnect", async (req, res) => {
  const uid = await requireUid(req, res);
  if (!uid) return;

  try {
    await getIntegrationRef(uid).set(
      {
        calendarDisabled: true,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    return res.json({ connected: false });
  } catch (err) {
    console.error("Outlook calendar disconnect error:", err);
    return res.status(500).json({ error: "failed to disconnect outlook calendar" });
  }
});

router.get("/calendars", async (req, res) => {
  const uid = await requireUid(req, res);
  if (!uid) return;

  try {
    const accessToken = await getUsableAccessToken(uid);
    const payload = await graphApiGet(
      accessToken,
      "https://graph.microsoft.com/v1.0/me/calendars?$select=id,name,color,isDefaultCalendar"
    );

    const calendars = (Array.isArray(payload?.value) ? (payload.value as OutlookCalendar[]) : [])
      .map(mapOutlookCalendar)
      .filter((item): item is NonNullable<ReturnType<typeof mapOutlookCalendar>> => Boolean(item));

    const fallbackSelected =
      calendars.find((calendar) => calendar.primary)?.id ||
      calendars[0]?.id ||
      OUTLOOK_DEFAULT_CALENDAR_ID;
    const { data: integration } = await getIntegration(uid);
    const selectedCalendarIds = sanitizeCalendarIds(integration?.selectedCalendarIds);
    const calendarIds = selectedCalendarIds.length ? selectedCalendarIds : [fallbackSelected];

    return res.json({ ok: true, calendars, selectedCalendarIds: calendarIds });
  } catch (err) {
    console.error("Outlook calendars list error:", err);
    return res.status(500).json({ error: "failed to list outlook calendars" });
  }
});

router.post("/calendars/selected", async (req, res) => {
  const uid = await requireUid(req, res);
  if (!uid) return;

  const incoming = sanitizeCalendarIds(req.body?.calendarIds);
  const calendarIds = incoming.length ? incoming : [OUTLOOK_DEFAULT_CALENDAR_ID];

  try {
    await getIntegrationRef(uid).set(
      {
        selectedCalendarIds: calendarIds,
        calendarDisabled: false,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    return res.json({ ok: true, selectedCalendarIds: calendarIds });
  } catch (err) {
    console.error("Outlook calendars selection error:", err);
    return res.status(500).json({ error: "failed to save outlook calendar selection" });
  }
});

router.post("/sync/create", async (req, res) => {
  const uid = await requireUid(req, res);
  if (!uid) return;

  const event = req.body?.event as SyncEventPayload | undefined;
  if (!event?.id || !event?.title || !event?.startAt || !event?.endAt) {
    return res.status(400).json({ error: "invalid event payload" });
  }

  const calendarId = normalizeCalendarId(req.body?.calendarId || event.calendarId);

  try {
    const accessToken = await getUsableAccessToken(uid);
    const payload = await graphApiRequest(
      accessToken,
      getCalendarEventsUrl(calendarId),
      "POST",
      toOutlookEventBody(event)
    );

    return res.json({
      ok: true,
      outlookEventId: typeof payload?.id === "string" ? payload.id : null,
      calendarId,
    });
  } catch (err) {
    console.error("Outlook sync create error:", err);
    return res.status(500).json({ error: "failed to sync outlook create" });
  }
});

router.post("/sync/update", async (req, res) => {
  const uid = await requireUid(req, res);
  if (!uid) return;

  const event = req.body?.event as SyncEventPayload | undefined;
  const outlookEventId =
    typeof req.body?.outlookEventId === "string" ? req.body.outlookEventId : event?.outlookEventId;
  const calendarId = normalizeCalendarId(req.body?.calendarId || event?.calendarId);

  if (!event?.id || !event?.title || !event?.startAt || !event?.endAt || !outlookEventId) {
    return res.status(400).json({ error: "invalid update payload" });
  }

  try {
    const accessToken = await getUsableAccessToken(uid);
    await graphApiRequest(
      accessToken,
      getCalendarEventUrl(calendarId, outlookEventId),
      "PATCH",
      toOutlookEventBody(event)
    );

    return res.json({ ok: true, outlookEventId, calendarId });
  } catch (err) {
    console.error("Outlook sync update error:", err);
    return res.status(500).json({ error: "failed to sync outlook update" });
  }
});

router.post("/sync/delete", async (req, res) => {
  const uid = await requireUid(req, res);
  if (!uid) return;

  const outlookEventId = typeof req.body?.outlookEventId === "string" ? req.body.outlookEventId : null;
  const calendarId = normalizeCalendarId(req.body?.calendarId);

  if (!outlookEventId) {
    return res.status(400).json({ error: "missing outlookEventId" });
  }

  try {
    const accessToken = await getUsableAccessToken(uid);
    await graphApiRequest(accessToken, getCalendarEventUrl(calendarId, outlookEventId), "DELETE");

    return res.json({ ok: true, calendarId });
  } catch (err) {
    console.error("Outlook sync delete error:", err);
    return res.status(500).json({ error: "failed to sync outlook delete" });
  }
});

router.post("/sync/pull", async (req, res) => {
  const uid = await requireUid(req, res);
  if (!uid) return;

  const maxResultsRaw = Number(req.body?.maxResults ?? 250);
  const maxResults = Number.isFinite(maxResultsRaw)
    ? Math.max(1, Math.min(999, Math.floor(maxResultsRaw)))
    : 250;

  try {
    const accessToken = await getUsableAccessToken(uid);
    const requestedCalendarIds = sanitizeCalendarIds(req.body?.calendarIds);
    const { data: integration } = await getIntegration(uid);
    const selectedCalendarIds = sanitizeCalendarIds(integration?.selectedCalendarIds);
    const calendarIds = requestedCalendarIds.length
      ? requestedCalendarIds
      : selectedCalendarIds.length
        ? selectedCalendarIds
        : [OUTLOOK_DEFAULT_CALENDAR_ID];

    const syncNow = Date.now();
    const syncTwoWeeksBackIso = new Date(syncNow - 14 * 24 * 60 * 60 * 1000).toISOString();
    const syncTwoWeeksBackEpoch = toEpoch(syncTwoWeeksBackIso);
    const syncTwoYearsAheadIso = new Date(syncNow + 2 * 365 * 24 * 60 * 60 * 1000).toISOString();

    const items: Array<OutlookEvent & { __calendarId: string }> = [];
    const failedCalendarIds: string[] = [];
    const pulledByCalendar: Record<string, number> = {};
    const createdByCalendar: Record<string, number> = {};
    const updatedByCalendar: Record<string, number> = {};

    for (const calendarId of calendarIds) {
      const rawCalendarId = stripOutlookCalendarPrefix(calendarId);
      const baseUrl =
        rawCalendarId === "primary"
          ? "https://graph.microsoft.com/v1.0/me/calendar/calendarView"
          : `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(rawCalendarId)}/calendarView`;
      const listUrl = new URL(baseUrl);
      listUrl.searchParams.set("startDateTime", syncTwoWeeksBackIso);
      listUrl.searchParams.set("endDateTime", syncTwoYearsAheadIso);
      listUrl.searchParams.set("$top", String(maxResults));
      listUrl.searchParams.set(
        "$select",
        "id,subject,bodyPreview,start,end,isAllDay,isCancelled,lastModifiedDateTime,createdDateTime"
      );

      try {
        const payload = await graphApiGet(accessToken, listUrl.toString());
        const calendarItems = Array.isArray(payload?.value) ? (payload.value as OutlookEvent[]) : [];
        pulledByCalendar[calendarId] = calendarItems.length;

        for (const item of calendarItems) {
          items.push({ ...item, __calendarId: calendarId });
        }
      } catch (err) {
        failedCalendarIds.push(calendarId);
        console.error(`Outlook sync pull calendar error (${calendarId}):`, err);
      }
    }

    const eventsCollection = adminDb.collection(`users/${uid}/calendarEvents`);
    const localSnapshot = await eventsCollection.get();
    const byOutlookEventId = new Map<
      string,
      { id: string; updatedAt: number; createdAt: number; ref: FirebaseFirestore.DocumentReference }
    >();
    const byLocalFingerprint = new Map<
      string,
      { id: string; updatedAt: number; createdAt: number; ref: FirebaseFirestore.DocumentReference }
    >();

    const toFingerprint = (calendarId: string, title: string, startAt: string, endAt: string) =>
      `${calendarId}|${title.trim().toLowerCase()}|${startAt}|${endAt}`;

    const batch = adminDb.batch();
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let deleted = 0;

    for (const doc of localSnapshot.docs) {
      const data = (doc.data() || {}) as Record<string, unknown>;
      const source = typeof data.source === "string" ? data.source : "";
      const endAt = toEpoch(data.endAt);
      const hasOutlookEventId = typeof data.outlookEventId === "string" && data.outlookEventId.length > 0;

      if ((source === "outlook" || hasOutlookEventId) && endAt > 0 && endAt < syncTwoWeeksBackEpoch) {
        batch.delete(doc.ref);
        deleted += 1;
        continue;
      }

      const outlookEventId = typeof data.outlookEventId === "string" ? data.outlookEventId : null;
      const docCalendarId =
        typeof data.calendarId === "string" ? normalizeCalendarId(data.calendarId) : OUTLOOK_DEFAULT_CALENDAR_ID;

      if (!outlookEventId) {
        if (source === "local") {
          const title = typeof data.title === "string" ? data.title : "";
          const startAt = typeof data.startAt === "string" ? data.startAt : "";
          const endAt = typeof data.endAt === "string" ? data.endAt : "";

          if (title && startAt && endAt) {
            const fingerprint = toFingerprint(docCalendarId, title, startAt, endAt);
            byLocalFingerprint.set(fingerprint, {
              id: doc.id,
              updatedAt: toEpoch(data.updatedAt),
              createdAt: toEpoch(data.createdAt),
              ref: doc.ref,
            });
          }
        }

        continue;
      }

      byOutlookEventId.set(`${docCalendarId}/${outlookEventId}`, {
        id: doc.id,
        updatedAt: toEpoch(data.updatedAt),
        createdAt: toEpoch(data.createdAt),
        ref: doc.ref,
      });
    }

    for (const item of items) {
      const calendarId = item.__calendarId || OUTLOOK_DEFAULT_CALENDAR_ID;
      const mapped = mapOutlookEvent(item, syncNow);
      const mapKey = `${calendarId}/${mapped.outlookEventId}`;
      const localFingerprint = toFingerprint(calendarId, mapped.title, mapped.startAt, mapped.endAt);
      const existingByProviderId = byOutlookEventId.get(mapKey);
      const localDuplicate = byLocalFingerprint.get(localFingerprint);

      if (existingByProviderId && localDuplicate && existingByProviderId.id !== localDuplicate.id) {
        batch.delete(localDuplicate.ref);
        deleted += 1;
      }

      const existing = existingByProviderId ?? localDuplicate;

      if (item.isCancelled) {
        if (existing) {
          batch.delete(existing.ref);
          deleted += 1;
        }
        continue;
      }

      const nextId =
        existing?.id ??
        `o_${safeDocPart(calendarId)}_${safeDocPart(mapped.outlookEventId)}`;
      const targetRef = existing?.ref ?? eventsCollection.doc(nextId);

      if (existing && mapped.updatedAt < existing.updatedAt) {
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
          source: "outlook",
          outlookEventId: mapped.outlookEventId,
          calendarId,
          syncStatus: "synced",
          updatedAt: mapped.updatedAt,
          createdAt: existing?.createdAt || mapped.createdAt,
        },
        { merge: true }
      );

      if (existing) {
        updated += 1;
        updatedByCalendar[calendarId] = (updatedByCalendar[calendarId] || 0) + 1;
      } else {
        created += 1;
        createdByCalendar[calendarId] = (createdByCalendar[calendarId] || 0) + 1;
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
      calendarIds,
      failedCalendarIds,
      pulledByCalendar,
      createdByCalendar,
      updatedByCalendar,
    });
  } catch (err) {
    console.error("Outlook sync pull error:", err);
    return res.status(500).json({ error: "failed to sync outlook pull" });
  }
});

export default router;
