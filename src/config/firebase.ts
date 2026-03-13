import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
} from "firebase/firestore";

// ── Firebase configuration ───────────────────────────────────────
// Populate these via a .env file at the project root.
// Vite exposes env vars prefixed with VITE_ automatically.

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ── Auth ─────────────────────────────────────────────────────────
export const auth = getAuth(app);

// ── Firestore ────────────────────────────────────────────────────
export const db = getFirestore(app);

// ── Local emulator support (for development) ─────────────────────
// Start Firebase emulators with: firebase emulators:start
// Then set VITE_USE_EMULATORS=true in your .env

if (import.meta.env.VITE_USE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", {
    disableWarnings: true,
  });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  console.log("🔧 Using Firebase emulators");
}

export default app;
