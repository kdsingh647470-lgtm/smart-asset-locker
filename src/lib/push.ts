// Firebase Cloud Messaging client helper for GharLog web push.
// All values prefixed VITE_ are safe to expose to the browser.
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { saveDeviceToken } from "./notifications.functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_PUBLIC_KEY as string | undefined;

export function isPushConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId && firebaseConfig.appId && VAPID_KEY);
}

function ensureApp() {
  if (!isPushConfigured()) throw new Error("Push not configured");
  return getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
}

export type PushResult =
  | { status: "ok"; token: string }
  | { status: "denied" }
  | { status: "unsupported"; reason: string };

export async function enablePushNotifications(): Promise<PushResult> {
  if (typeof window === "undefined") return { status: "unsupported", reason: "no window" };
  if (!("serviceWorker" in navigator)) return { status: "unsupported", reason: "no service worker" };
  if (!("Notification" in window)) return { status: "unsupported", reason: "no Notification API" };
  if (!isPushConfigured()) return { status: "unsupported", reason: "Push not configured yet" };
  const supported = await isSupported().catch(() => false);
  if (!supported) return { status: "unsupported", reason: "browser unsupported" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  await navigator.serviceWorker.ready;

  const app = ensureApp();
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey: VAPID_KEY!, serviceWorkerRegistration: reg });
  if (!token) return { status: "unsupported", reason: "no token returned" };

  await saveDeviceToken({
    data: {
      token,
      platform: "web",
      user_agent: navigator.userAgent.slice(0, 512),
    },
  });

  return { status: "ok", token };
}

export function listenForegroundMessages(handler: (payload: { title?: string; body?: string }) => void) {
  if (!isPushConfigured()) return () => {};
  try {
    const app = ensureApp();
    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      handler({
        title: payload.notification?.title,
        body: payload.notification?.body,
      });
    });
  } catch {
    return () => {};
  }
}
