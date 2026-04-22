import admin from "firebase-admin";
import { Firestore } from "@google-cloud/firestore";
import dotenv from "dotenv";

dotenv.config();

function env(key: string) {
  return process.env[key]?.trim();
}

function normalizeDatabaseId(raw?: string | null) {
  const value = raw?.trim();
  if (!value) return "(default)";
  return value === "default" ? "default" : value;
}

function getProjectId() {
  return env("FIREBASE_PROJECT_ID") || env("VITE_FIREBASE_PROJECT_ID") || env("GOOGLE_CLOUD_PROJECT");
}

function normalizePrivateKey(raw: string) {
  const trimmed = raw.trim();
  const withoutQuotes =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed;

  const normalizedLineBreaks = withoutQuotes.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
  const normalizedMarkers = normalizedLineBreaks
    .replace(/-+\s*-*\s*BEGIN PRIVATE KEY\s*-+/i, "-----BEGIN PRIVATE KEY-----")
    .replace(/-+\s*-*\s*END PRIVATE KEY\s*-+/i, "-----END PRIVATE KEY-----");

  const lines = normalizedMarkers
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const beginIndex = lines.findIndex((line) => line === "-----BEGIN PRIVATE KEY-----");
  const endIndex = lines.findIndex((line) => line === "-----END PRIVATE KEY-----");

  if (beginIndex !== -1 && endIndex > beginIndex) {
    const base64Body = lines.slice(beginIndex + 1, endIndex).join("");
    const wrappedBody = base64Body.match(/.{1,64}/g)?.join("\n") ?? base64Body;
    return `-----BEGIN PRIVATE KEY-----\n${wrappedBody}\n-----END PRIVATE KEY-----\n`;
  }

  return normalizedMarkers;
}

function getCredential() {
  const serviceAccountJson = env("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson) as admin.ServiceAccount;
      return admin.credential.cert(parsed);
    } catch (err) {
      throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${String(err)}`);
    }
  }

  const projectId = env("FIREBASE_PROJECT_ID");
  const clientEmail = env("FIREBASE_CLIENT_EMAIL");
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKeyRaw) {
    const privateKey = normalizePrivateKey(privateKeyRaw);

    try {
      return admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      });
    } catch (err) {
      throw new Error(
        `Invalid FIREBASE_PRIVATE_KEY format. Ensure the value contains a full PEM key with BEGIN/END PRIVATE KEY markers. ${String(err)}`,
      );
    }
  }

  return admin.credential.applicationDefault();
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: getCredential(),
    projectId: getProjectId(),
  });
}

function getFirestoreClient() {
  const databaseId = normalizeDatabaseId(env("FIRESTORE_DATABASE_ID"));
  const serviceAccountJson = env("FIREBASE_SERVICE_ACCOUNT_JSON");
  const projectId = getProjectId();

  if (serviceAccountJson) {
    const parsed = JSON.parse(serviceAccountJson) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };

    return new Firestore({
      projectId: parsed.project_id || projectId,
      databaseId,
      credentials:
        parsed.client_email && parsed.private_key
          ? {
              client_email: parsed.client_email,
              private_key: normalizePrivateKey(parsed.private_key),
            }
          : undefined,
    });
  }

  const clientEmail = env("FIREBASE_CLIENT_EMAIL");
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKeyRaw) {
    return new Firestore({
      projectId,
      databaseId,
      credentials: {
        client_email: clientEmail,
        private_key: normalizePrivateKey(privateKeyRaw),
      },
    });
  }

  return new Firestore({
    projectId,
    databaseId,
  });
}

export const adminAuth = admin.auth();
export const adminDb = getFirestoreClient();
