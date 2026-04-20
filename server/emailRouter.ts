import express from "express";
import fetch from "node-fetch";
import { createHash, createHmac, randomBytes } from "crypto";
import type { DocumentReference } from "@google-cloud/firestore";
import { adminAuth, adminDb } from "./firebaseAdmin";

type EmailProvider = "gmail" | "outlook";

type EmailIntegrationDoc = {
  connected?: boolean;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
  scope?: string | null;
  tokenType?: string | null;
  provider?: EmailProvider;
  updatedAt?: number;
};

type EmailMessage = {
  id: string;
  threadId: string;
  provider: EmailProvider;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string | null;
  unread: boolean;
  providerUrl: string;
};

type GmailListResponse = {
  messages?: Array<{ id?: string; threadId?: string }>;
};

type GmailMessageResponse = {
  id?: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: Array<{ name?: string; value?: string }>;
  };
};

type OutlookMessagesResponse = {
  value?: OutlookMessageResponse[];
};

type OutlookMessageResponse = {
  id?: string;
  conversationId?: string;
  subject?: string;
  bodyPreview?: string;
  receivedDateTime?: string;
  isRead?: boolean;
  webLink?: string;
  from?: {
    emailAddress?: {
      name?: string;
      address?: string;
    };
  };
};

class ProviderApiError extends Error {
  provider: EmailProvider;
  status: number;
  body: string;

  constructor(provider: EmailProvider, status: number, body: string) {
    super(`${provider} API request failed with status ${status}`);
    this.provider = provider;
    this.status = status;
    this.body = body;
  }
}

const router = express.Router();
const ENABLED_PROVIDERS: EmailProvider[] = ["gmail", "outlook"];
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const OUTLOOK_SCOPE = "offline_access User.Read Mail.Read";

function getBaseUrl(req: express.Request) {
  const configuredBaseUrl =
    process.env.EMAIL_PUBLIC_BASE_URL ||
    process.env.PUBLIC_SERVER_URL ||
    process.env.SERVER_PUBLIC_URL;

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

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

function parseProvider(value: unknown): EmailProvider | null {
  return value === "gmail" || value === "outlook" ? value : null;
}

function requireProvider(req: express.Request, res: express.Response) {
  const rawProvider = req.method === "GET" ? req.query.provider : req.body?.provider;
  const provider = parseProvider(rawProvider);

  if (!provider || !ENABLED_PROVIDERS.includes(provider)) {
    res.status(400).json({ error: "unsupported email provider" });
    return null;
  }

  return provider;
}

function stateSecret() {
  return process.env.EMAIL_OAUTH_STATE_SECRET || process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.GOOGLE_CLIENT_SECRET || "email-oauth-state";
}

function signState(payload: string) {
  return createHmac("sha256", stateSecret()).update(payload).digest("base64url");
}

function createPkceVerifier() {
  return randomBytes(32).toString("base64url");
}

function createPkceChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

function encodeState(data: { uid: string; returnTo: string; provider: EmailProvider; codeVerifier?: string }) {
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
    const parsed = JSON.parse(json) as {
      uid?: string;
      returnTo?: string;
      provider?: string;
      codeVerifier?: string;
    };

    const provider = parseProvider(parsed.provider);
    if (!parsed.uid || !parsed.returnTo || !provider) return null;
    return {
      uid: parsed.uid,
      returnTo: parsed.returnTo,
      provider,
      codeVerifier: typeof parsed.codeVerifier === "string" ? parsed.codeVerifier : undefined,
    };
  } catch {
    return null;
  }
}

function getGmailRedirectUri(req: express.Request) {
  return process.env.GOOGLE_GMAIL_REDIRECT_URI || process.env.EMAIL_GMAIL_REDIRECT_URI || `${getBaseUrl(req)}/api/email/callback`;
}

function getOutlookRedirectUri(req: express.Request) {
  return process.env.MICROSOFT_OUTLOOK_REDIRECT_URI || process.env.EMAIL_OUTLOOK_REDIRECT_URI || `${getBaseUrl(req)}/api/email/callback`;
}

function buildGmailAuthUrl(req: express.Request, state: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials are not configured");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGmailRedirectUri(req),
    response_type: "code",
    scope: GMAIL_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function getOutlookCredentials() {
  const clientId = process.env.MICROSOFT_CLIENT_ID || process.env.OUTLOOK_CLIENT_ID || process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET || process.env.OUTLOOK_CLIENT_SECRET || process.env.AZURE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Microsoft OAuth credentials are not configured");
  }

  return { clientId, clientSecret };
}

function buildOutlookAuthUrl(req: express.Request, state: string, codeVerifier: string) {
  const { clientId } = getOutlookCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getOutlookRedirectUri(req),
    response_type: "code",
    response_mode: "query",
    scope: OUTLOOK_SCOPE,
    state,
    code_challenge: createPkceChallenge(codeVerifier),
    code_challenge_method: "S256",
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

function buildEmailAuthUrl(req: express.Request, provider: EmailProvider, state: string, codeVerifier?: string) {
  if (provider === "gmail") {
    return buildGmailAuthUrl(req, state);
  }

  if (!codeVerifier) {
    throw new Error("Outlook OAuth PKCE verifier is missing");
  }

  return buildOutlookAuthUrl(req, state, codeVerifier);
}

function getIntegrationDocPath(uid: string, provider: EmailProvider) {
  return `users/${uid}/integrations/email_${provider}`;
}

async function getIntegrationRef(uid: string, provider: EmailProvider) {
  return adminDb.doc(getIntegrationDocPath(uid, provider));
}

async function getIntegration(uid: string, provider: EmailProvider) {
  const ref = await getIntegrationRef(uid, provider);
  const snap = await ref.get();
  if (!snap.exists) return { ref, data: null as EmailIntegrationDoc | null };
  return { ref, data: (snap.data() || {}) as EmailIntegrationDoc };
}

async function refreshAccessTokenIfNeeded(
  integration: EmailIntegrationDoc,
  ref: DocumentReference,
  provider: EmailProvider
) {
  const now = Date.now();
  const expiresAt = integration.expiresAt ?? 0;
  const shouldRefresh = Boolean(integration.refreshToken) && (!integration.accessToken || now > expiresAt - 60_000);

  if (!shouldRefresh) {
    return integration.accessToken ?? null;
  }

  const response = await fetch(
    provider === "gmail"
      ? "https://oauth2.googleapis.com/token"
      : "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        ...getTokenCredentials(provider),
        ...(provider === "outlook" ? { scope: OUTLOOK_SCOPE } : {}),
        grant_type: "refresh_token",
        refresh_token: integration.refreshToken ?? "",
      }),
    }
  );

  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(`Failed to refresh ${provider} token: ${JSON.stringify(payload)}`);
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

async function getUsableAccessToken(uid: string, provider: EmailProvider) {
  const { ref, data } = await getIntegration(uid, provider);
  if (!data || !data.connected) {
    throw new Error(`${provider} email is not connected`);
  }

  const token = await refreshAccessTokenIfNeeded(data, ref, provider);
  if (!token) throw new Error("Missing email access token");
  return token;
}

function getTokenCredentials(provider: EmailProvider) {
  if (provider === "gmail") {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth credentials are not configured");
    }

    return { client_id: clientId, client_secret: clientSecret };
  }

  const { clientId, clientSecret } = getOutlookCredentials();
  return { client_id: clientId, client_secret: clientSecret };
}

async function gmailApiGet(accessToken: string, url: string) {
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
    throw new ProviderApiError("gmail", response.status, text);
  }

  return payload;
}

async function graphApiGet(accessToken: string, url: string) {
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
    throw new ProviderApiError("outlook", response.status, text);
  }

  return payload;
}

function getSafeProviderErrorBody(body: string) {
  if (!body) return "";

  try {
    const parsed = JSON.parse(body) as {
      error?: {
        code?: unknown;
        message?: unknown;
      };
    };
    const code = typeof parsed.error?.code === "string" ? parsed.error.code : undefined;
    const message = typeof parsed.error?.message === "string" ? parsed.error.message : undefined;
    return JSON.stringify({ error: { code, message } });
  } catch {
    return body.slice(0, 500);
  }
}

function getHeader(message: GmailMessageResponse, headerName: string) {
  const headers = Array.isArray(message.payload?.headers) ? message.payload?.headers : [];
  const header = headers.find((item) => item.name?.toLowerCase() === headerName.toLowerCase());
  return header?.value?.trim() ?? "";
}

function buildGmailMessageUrl(threadId: string) {
  return `https://mail.google.com/mail/u/0/#inbox/${encodeURIComponent(threadId)}`;
}

function toEmailMessage(message: GmailMessageResponse): EmailMessage | null {
  if (!message.id || !message.threadId) return null;

  const internalDate = Number(message.internalDate);
  const receivedAt = Number.isFinite(internalDate) ? new Date(internalDate).toISOString() : null;
  const subject = getHeader(message, "Subject") || "(No subject)";
  const from = getHeader(message, "From") || "Unknown sender";

  return {
    id: message.id,
    threadId: message.threadId,
    provider: "gmail",
    from,
    subject,
    snippet: message.snippet ?? "",
    receivedAt,
    unread: Array.isArray(message.labelIds) && message.labelIds.includes("UNREAD"),
    providerUrl: buildGmailMessageUrl(message.threadId),
  };
}

async function listGmailMessages(accessToken: string, maxResults: number) {
  const fetchLimit = Math.min(25, Math.max(maxResults * 2, maxResults));
  const params = new URLSearchParams({
    maxResults: String(fetchLimit),
    q: "in:inbox",
  });

  const listPayload = (await gmailApiGet(
    accessToken,
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`
  )) as GmailListResponse;

  const messageRefs = Array.isArray(listPayload.messages) ? listPayload.messages : [];

  const messages = await Promise.all(
    messageRefs
      .filter((messageRef) => typeof messageRef.id === "string")
      .map(async (messageRef) => {
        const detailParams = new URLSearchParams({
          format: "metadata",
          metadataHeaders: "From",
        });
        detailParams.append("metadataHeaders", "Subject");
        detailParams.append("metadataHeaders", "Date");

        const payload = (await gmailApiGet(
          accessToken,
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageRef.id ?? "")}?${detailParams.toString()}`
        )) as GmailMessageResponse;

        return toEmailMessage(payload);
      })
  );

  return messages
    .filter((message): message is EmailMessage => message !== null)
    .sort((a, b) => {
      if (a.unread !== b.unread) return a.unread ? -1 : 1;
      const aTime = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
      const bTime = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, maxResults);
}

function buildOutlookMessageUrl(message: OutlookMessageResponse) {
  return message.webLink || "https://outlook.office.com/mail/inbox";
}

function toOutlookMessage(message: OutlookMessageResponse): EmailMessage | null {
  if (!message.id) return null;

  const fromName = message.from?.emailAddress?.name?.trim();
  const fromAddress = message.from?.emailAddress?.address?.trim();
  const from = fromName && fromAddress
    ? `${fromName} <${fromAddress}>`
    : fromName || fromAddress || "Unknown sender";

  return {
    id: message.id,
    threadId: message.conversationId || message.id,
    provider: "outlook",
    from,
    subject: message.subject?.trim() || "(No subject)",
    snippet: message.bodyPreview ?? "",
    receivedAt: message.receivedDateTime || null,
    unread: message.isRead === false,
    providerUrl: buildOutlookMessageUrl(message),
  };
}

async function listOutlookMessages(accessToken: string, maxResults: number) {
  const fetchLimit = Math.min(25, Math.max(maxResults * 2, maxResults));
  const params = new URLSearchParams({
    "$top": String(fetchLimit),
    "$select": "id,conversationId,from,subject,bodyPreview,receivedDateTime,isRead,webLink",
    "$orderby": "receivedDateTime desc",
  });

  const payload = (await graphApiGet(
    accessToken,
    `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?${params.toString()}`
  )) as OutlookMessagesResponse;

  return (Array.isArray(payload.value) ? payload.value : [])
    .map(toOutlookMessage)
    .filter((message): message is EmailMessage => message !== null)
    .sort((a, b) => {
      if (a.unread !== b.unread) return a.unread ? -1 : 1;
      const aTime = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
      const bTime = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, maxResults);
}

async function listEmailMessages(provider: EmailProvider, accessToken: string, maxResults: number) {
  return provider === "gmail"
    ? listGmailMessages(accessToken, maxResults)
    : listOutlookMessages(accessToken, maxResults);
}

router.get("/providers", (_req, res) => {
  return res.json({
    providers: [
      { id: "gmail", label: "Gmail", enabled: true },
      { id: "outlook", label: "Outlook", enabled: true },
      { id: "imap", label: "IMAP", enabled: false },
    ],
  });
});

router.post("/connect-url", async (req, res) => {
  const uid = await requireUid(req, res);
  if (!uid) return;

  const provider = requireProvider(req, res);
  if (!provider) return;

  const returnTo = typeof req.body?.returnTo === "string" && req.body.returnTo ? req.body.returnTo : "/dashboard";

  try {
    const codeVerifier = provider === "outlook" ? createPkceVerifier() : undefined;
    const state = encodeState({ uid, returnTo, provider, codeVerifier });
    const url = buildEmailAuthUrl(req, provider, state, codeVerifier);
    return res.json({ provider, url });
  } catch (err) {
    console.error("Email connect-url error:", err);
    return res.status(500).json({ error: "failed to build email oauth url" });
  }
});

router.get("/callback", async (req, res) => {
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

  const oauthError = typeof req.query.error === "string" ? req.query.error : null;
  if (oauthError) {
    console.error(`${stateData.provider} OAuth returned error:`, {
      error: oauthError,
      description: req.query.error_description,
    });
    const url = new URL(stateData.returnTo, getBaseUrl(req));
    url.searchParams.set("email_oauth", "error");
    url.searchParams.set("email_provider", stateData.provider);
    return res.redirect(url.toString());
  }

  const code = req.query.code;
  if (typeof code !== "string" || !code) {
    const url = new URL(stateData.returnTo, getBaseUrl(req));
    url.searchParams.set("email_oauth", "error");
    url.searchParams.set("email_provider", stateData.provider);
    return res.redirect(url.toString());
  }

  try {
    const tokenResponse = await fetch(
      stateData.provider === "gmail"
        ? "https://oauth2.googleapis.com/token"
        : "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          ...getTokenCredentials(stateData.provider),
          ...(stateData.provider === "outlook" ? { scope: OUTLOOK_SCOPE } : {}),
          ...(stateData.provider === "outlook" && stateData.codeVerifier
            ? { code_verifier: stateData.codeVerifier }
            : {}),
          redirect_uri: stateData.provider === "gmail"
            ? getGmailRedirectUri(req)
            : getOutlookRedirectUri(req),
          grant_type: "authorization_code",
        }),
      }
    );

    const payload = (await tokenResponse.json()) as Record<string, unknown>;

    if (!tokenResponse.ok) {
      console.error(`${stateData.provider} token exchange failed:`, payload);
      const url = new URL(stateData.returnTo, getBaseUrl(req));
      url.searchParams.set("email_oauth", "error");
      url.searchParams.set("email_provider", stateData.provider);
      return res.redirect(url.toString());
    }

    const { ref, data } = await getIntegration(stateData.uid, stateData.provider);
    const expiresAt = typeof payload.expires_in === "number" ? Date.now() + payload.expires_in * 1000 : null;

    await ref.set(
      {
        connected: true,
        provider: stateData.provider,
        accessToken: payload.access_token ?? null,
        refreshToken:
          typeof payload.refresh_token === "string"
            ? payload.refresh_token
            : data?.refreshToken ?? null,
        scope: payload.scope ?? null,
        tokenType: payload.token_type ?? null,
        expiresAt,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    const url = new URL(stateData.returnTo, getBaseUrl(req));
    url.searchParams.set("email_oauth", "connected");
    url.searchParams.set("email_provider", stateData.provider);
    return res.redirect(url.toString());
  } catch (err) {
    console.error("Email OAuth callback error:", err);
    const url = new URL(stateData.returnTo, getBaseUrl(req));
    url.searchParams.set("email_oauth", "error");
    url.searchParams.set("email_provider", stateData.provider);
    return res.redirect(url.toString());
  }
});

router.get("/status", async (req, res) => {
  const uid = await requireUid(req, res);
  if (!uid) return;

  const provider = requireProvider(req, res);
  if (!provider) return;

  try {
    const { data } = await getIntegration(uid, provider);
    if (!data) {
      return res.json({ provider, connected: false });
    }

    return res.json({
      provider,
      connected: Boolean(data.connected),
      expiresAt: data.expiresAt ?? null,
      updatedAt: data.updatedAt ?? null,
      hasRefreshToken: Boolean(data.refreshToken),
    });
  } catch (err) {
    console.error("Email status error:", err);
    return res.status(500).json({ error: "failed to read email status" });
  }
});

router.post("/disconnect", async (req, res) => {
  const uid = await requireUid(req, res);
  if (!uid) return;

  const provider = requireProvider(req, res);
  if (!provider) return;

  try {
    const ref = await getIntegrationRef(uid, provider);
    await ref.delete();
    return res.json({ provider, connected: false });
  } catch (err) {
    console.error("Email disconnect error:", err);
    return res.status(500).json({ error: "failed to disconnect email provider" });
  }
});

router.get("/messages", async (req, res) => {
  const uid = await requireUid(req, res);
  if (!uid) return;

  const provider = requireProvider(req, res);
  if (!provider) return;

  const rawMaxResults = Number(req.query.maxResults);
  const maxResults = Number.isFinite(rawMaxResults)
    ? Math.min(15, Math.max(1, Math.round(rawMaxResults)))
    : 8;

  try {
    const accessToken = await getUsableAccessToken(uid, provider);
    const messages = await listEmailMessages(provider, accessToken, maxResults);
    return res.json({ provider, messages });
  } catch (err) {
    if (err instanceof ProviderApiError) {
      const providerError = getSafeProviderErrorBody(err.body);
      console.error("Email provider messages error:", {
        provider: err.provider,
        status: err.status,
        body: providerError,
      });

      return res.status(502).json({
        error: "email provider request failed",
        provider: err.provider,
        providerStatus: err.status,
        providerError,
      });
    }

    console.error("Email messages error:", {
      provider,
      message: err instanceof Error ? err.message : String(err),
    });
    return res.status(500).json({ error: "failed to list email messages" });
  }
});

export const emailRouter = router;
