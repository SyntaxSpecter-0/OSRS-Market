import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

// Firebase is used ONLY for push notification delivery (FCM) in this app —
// Supabase handles Auth, the database, and scheduling. A Firebase project
// on the free Spark plan is enough; Cloud Messaging doesn't require Blaze.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/** Messaging only works in the browser with service-worker support (not SSR). */
export async function getMessagingIfSupported() {
  if (typeof window === 'undefined') return null;
  if (!(await isSupported())) return null;
  return getMessaging(app);
}
