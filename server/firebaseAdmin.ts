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

  return withoutQuotes.replace(/\\n/g, "\n");
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

    return admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    });
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
