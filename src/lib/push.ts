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
  console.log("[push] enable requested");
  if (typeof window === "undefined") return { status: "unsupported", reason: "no window" };
  if (!("serviceWorker" in navigator)) return { status: "unsupported", reason: "no service worker" };
  if (!("Notification" in window)) return { status: "unsupported", reason: "no Notification API" };

  // Lovable editor preview runs the app inside an iframe on a different origin.
  // Browsers block Notification.requestPermission() and service worker registration
  // in that context — the click appears to do nothing.
  if (window.top !== window.self) {
    return {
      status: "unsupported",
      reason: "Open the published app in its own tab (not the editor preview) to enable push.",
    };
  }

  if (!window.isSecureContext) {
    return { status: "unsupported", reason: "Push requires HTTPS." };
  }

  if (Notification.permission === "denied") {
    console.log("[push] permission previously denied");
    return { status: "denied" };
  }

  const cfg = await loadConfig();
  console.log("[push] config loaded?", !!cfg);
  if (!cfg) return { status: "unsupported", reason: "Push not configured yet" };

  const supported = await isSupported().catch(() => false);
  console.log("[push] fcm supported?", supported);
  if (!supported) {
    return {
      status: "unsupported",
      reason: "This browser doesn't support web push (iOS Safari needs iOS 16.4+ and Add to Home Screen first).",
    };
  }

  const permission = await Notification.requestPermission();
  console.log("[push] permission result:", permission);
  if (permission !== "granted") return { status: "denied" };

  const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  await navigator.serviceWorker.ready;
  console.log("[push] SW registered", reg.scope);

  const app = ensureApp(cfg);
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: cfg.vapidKey,
    serviceWorkerRegistration: reg,
  });
  console.log("[push] token?", token ? token.slice(0, 12) + "…" : null);
  if (!token) return { status: "unsupported", reason: "no token returned" };

  await saveDeviceToken({
    data: {
      token,
      platform: "web",
      user_agent: navigator.userAgent.slice(0, 512),
    },
  });
  console.log("[push] token saved to server");

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
