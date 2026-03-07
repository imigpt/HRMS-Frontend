import { useEffect, useRef, useCallback } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging, isFirebaseConfigured } from '@/lib/firebase';
import { notificationsAPI } from '@/lib/apiClient';

const FCM_TOKEN_KEY = 'hrms_fcm_token';
const FCM_USER_KEY  = 'hrms_fcm_user';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

/**
 * Manages FCM token lifecycle with localStorage deduplication:
 * - Registers the token only when it changes (prevents repeated POSTs)
 * - Removes the token from the server on logout / userId cleared
 * - Listens for foreground messages and shows a toast (optional callback)
 *
 * @param userId  - currently authenticated user's _id; null/'' when logged out
 * @param onForegroundMessage - optional callback for foreground push messages
 */
export function useFCMToken(
  userId: string | null | undefined,
  onForegroundMessage?: (payload: any) => void
) {
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ── Register / refresh token ──────────────────────────────────────────────
  const registerToken = useCallback(async (uid: string) => {
    if (!isFirebaseConfigured() || !VAPID_KEY) return;

    const msg = getFirebaseMessaging();
    if (!msg) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const token = await getToken(msg, { vapidKey: VAPID_KEY });
      if (!token) return;

      const prevToken = localStorage.getItem(FCM_TOKEN_KEY);
      const prevUser  = localStorage.getItem(FCM_USER_KEY);

      // Only call the server when something changed
      if (token === prevToken && uid === prevUser) return;

      await notificationsAPI.saveToken({ token, device: 'web' });
      localStorage.setItem(FCM_TOKEN_KEY, token);
      localStorage.setItem(FCM_USER_KEY,  uid);
    } catch {
      // Permission denied or Firebase not available — silent
    }
  }, []);

  // ── Remove token on logout ─────────────────────────────────────────────────
  const removeToken = useCallback(async () => {
    const prevToken = localStorage.getItem(FCM_TOKEN_KEY);
    if (!prevToken) return;

    try {
      await notificationsAPI.removeToken({ token: prevToken });
    } catch {
      // Best-effort; clear local storage regardless
    } finally {
      localStorage.removeItem(FCM_TOKEN_KEY);
      localStorage.removeItem(FCM_USER_KEY);
    }
  }, []);

  // ── Foreground message listener ────────────────────────────────────────────
  useEffect(() => {
    if (!userId || !isFirebaseConfigured()) return;

    const msg = getFirebaseMessaging();
    if (!msg) return;

    const unsub = onMessage(msg, (payload) => {
      onForegroundMessage?.(payload);
    });
    unsubscribeRef.current = unsub;
    return () => { unsub(); unsubscribeRef.current = null; };
  }, [userId, onForegroundMessage]);

  // ── Register when userId becomes available; remove when it disappears ──────
  useEffect(() => {
    if (userId) {
      registerToken(userId);
    } else {
      // User logged out — clean up if there was a previous session
      const prevUser = localStorage.getItem(FCM_USER_KEY);
      if (prevUser) removeToken();
    }
  }, [userId, registerToken, removeToken]);

  return { registerToken, removeToken };
}
