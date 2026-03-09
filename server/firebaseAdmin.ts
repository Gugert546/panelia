import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";

dotenv.config();

function env(key: string) {
  return process.env[key]?.trim();
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
    .replace(/-+\s*BEGIN PRIVATE KEY-+/i, "-----BEGIN PRIVATE KEY-----")
    .replace(/-+\s*END PRIVATE KEY-+/i, "-----END PRIVATE KEY-----");

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

export const adminAuth = admin.auth();
export const adminDb = getFirestore(admin.app());
