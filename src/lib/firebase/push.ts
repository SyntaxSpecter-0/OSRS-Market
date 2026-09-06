import { getToken } from 'firebase/messaging';
import { getMessagingIfSupported } from '@/lib/firebase/client';
import { createClient } from '@/lib/supabase/client';

/**
 * Requests notification permission, retrieves an FCM token, and stores it
 * in Supabase (push_tokens table) so the poll-prices Edge Function can send
 * to it. Call this from a button click (not on page load) — browsers
 * require a user gesture for the permission prompt.
 *
 * Requires NEXT_PUBLIC_FIREBASE_VAPID_KEY (Firebase Console -> Project
 * Settings -> Cloud Messaging -> Web Push certificates).
 */
export async function enablePushNotifications(
  uid: string,
  platform: 'web' | 'electron' | 'pwa_ios' | 'pwa_android'
) {
  const messaging = await getMessagingIfSupported();
  if (!messaging) {
    throw new Error('Push messaging is not supported in this browser/context.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  const supabase = createClient();
  await supabase.from('push_tokens').upsert(
    { user_id: uid, fcm_token: token, platform },
    { onConflict: 'fcm_token' }
  );

  return token;
}
