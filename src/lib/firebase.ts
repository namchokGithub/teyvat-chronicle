import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

/** Firebase is intentionally optional while Phase 1 reads local mock data. */
export function getFirebaseApp(): FirebaseApp | null {
  const {
    VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_APP_ID,
  } = import.meta.env;

  if (
    !VITE_FIREBASE_API_KEY ||
    !VITE_FIREBASE_AUTH_DOMAIN ||
    !VITE_FIREBASE_PROJECT_ID ||
    !VITE_FIREBASE_APP_ID
  ) {
    return null;
  }

  return getApps().length
    ? getApp()
    : initializeApp({
        apiKey: VITE_FIREBASE_API_KEY,
        authDomain: VITE_FIREBASE_AUTH_DOMAIN,
        projectId: VITE_FIREBASE_PROJECT_ID,
        appId: VITE_FIREBASE_APP_ID,
      });
}
