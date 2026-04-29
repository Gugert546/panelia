import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const env = (key: string) => (import.meta.env[key] as string | undefined)?.trim() ?? "";

const projectId = env("VITE_FIREBASE_PROJECT_ID");

if (!projectId) throw new Error("Missing VITE_FIREBASE_PROJECT_ID");

const runtimeHost = typeof window !== "undefined" ? window.location.hostname : "";
const projectWebDomain = `${projectId}.web.app`;
const projectFirebaseAppDomain = `${projectId}.firebaseapp.com`;
const configuredAuthDomain = env("VITE_FIREBASE_AUTH_DOMAIN");

const authDomain =
  runtimeHost === projectWebDomain || runtimeHost === projectFirebaseAppDomain
    ? runtimeHost
    : configuredAuthDomain || projectFirebaseAppDomain;

const firebaseConfig = {
  apiKey: env("VITE_FIREBASE_API_KEY"),
  authDomain,
  projectId,
  storageBucket: env("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: env("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: env("VITE_FIREBASE_APP_ID"),
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});
export const db = getFirestore(app, "default");
