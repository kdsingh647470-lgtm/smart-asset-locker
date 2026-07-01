// Firebase Cloud Messaging client helper for GharLog web push.
// Firebase Web config (including apiKey) is fetched from /api/public/firebase-config
// at runtime, so no VITE_ envs are required and the apiKey stays server-managed.
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { saveDeviceToken } from "./notifications.functions";

type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
};

let cachedConfig: FirebaseWebConfig | null = null;
let cachedApp: FirebaseApp | null = null;

async function loadConfig(): Promise<FirebaseWebConfig | null> {
  if (cachedConfig) return cachedConfig;
  try {
    const res = await fetch("/api/public/firebase-config", { credentials: "omit" });
    if (!res.ok) return null;
    const json = (await res.json()) as FirebaseWebConfig;
    if (!json.apiKey || !json.projectId || !json.messagingSenderId || !json.appId || !json.vapidKey) {
      return null;
    }
    cachedConfig = json;
    return json;
  } catch {
    return null;
  }
}

function ensureApp(cfg: FirebaseWebConfig): FirebaseApp {
  if (cachedApp) return cachedApp;
  cachedApp = getApps().length
    ? getApps()[0]!
    : initializeApp({
        apiKey: cfg.apiKey,
        authDomain: cfg.authDomain,
        projectId: cfg.projectId,
        storageBucket: cfg.storageBucket,
        messagingSenderId: cfg.messagingSenderId,
        appId: cfg.appId,
      });
  return cachedApp;
}

export type PushResult =
  | { status: "ok"; token: string }
  | { status: "denied" }
  | { status: "unsupported"; reason: string };

export async function enablePushNotifications(): Promise<PushResult> {
  if (typeof window === "undefined") return { status: "unsupported", reason: "no window" };
  if (!("serviceWorker" in navigator)) return { status: "unsupported", reason: "no service worker" };
  if (!("Notification" in window)) return { status: "unsupported", reason: "no Notification API" };

  const cfg = await loadConfig();
  if (!cfg) return { status: "unsupported", reason: "Push not configured yet" };

  const supported = await isSupported().catch(() => false);
  if (!supported) return { status: "unsupported", reason: "browser unsupported" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  await navigator.serviceWorker.ready;

  const app = ensureApp(cfg);
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: cfg.vapidKey,
    serviceWorkerRegistration: reg,
  });
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

export function listenForegroundMessages(
  handler: (payload: { title?: string; body?: string }) => void,
) {
  let unsub: (() => void) | null = null;
  let cancelled = false;
  (async () => {
    const cfg = await loadConfig();
    if (!cfg || cancelled) return;
    try {
      const app = ensureApp(cfg);
      const messaging = getMessaging(app);
      unsub = onMessage(messaging, (payload) => {
        handler({
          title: payload.notification?.title,
          body: payload.notification?.body,
        });
      });
    } catch {
      // no-op
    }
  })();
  return () => {
    cancelled = true;
    if (unsub) unsub();
  };
}
