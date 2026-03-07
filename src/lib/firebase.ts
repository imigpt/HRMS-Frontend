import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

/**
 * Returns true if all required Firebase env-vars are present.
 */
export const isFirebaseConfigured = (): boolean =>
  Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
  );

/**
 * Lazily initialises the Firebase app (only once) and returns
 * the Firebase Messaging instance.  Returns null if the config
 * is missing or the browser doesn't support service workers.
 */
export const getFirebaseMessaging = (): Messaging | null => {
  if (!isFirebaseConfigured()) return null;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  if (!messaging) {
    messaging = getMessaging(app);
  }
  return messaging;
};
