// Serves the Firebase Cloud Messaging service worker with the Web apiKey
// interpolated from the server-side GOOGLE_API_KEY env var. All other Firebase
// web config values are public per Firebase's docs and are hard-coded here.
// Browsers must fetch this from the root path so its scope is the whole app.
import { createFileRoute } from "@tanstack/react-router";

const PUBLIC_CONFIG = {
  authDomain: "gharlog-21a1f.firebaseapp.com",
  projectId: "gharlog-21a1f",
  storageBucket: "gharlog-21a1f.firebasestorage.app",
  messagingSenderId: "321404491846",
  appId: "1:321404491846:web:b40eb08e8871e938cb5247",
};

export const Route = createFileRoute("/firebase-messaging-sw.js")({
  server: {
    handlers: {
      GET: async () => {
        const apiKey = process.env.GOOGLE_API_KEY ?? "";
        const config = JSON.stringify({ apiKey, ...PUBLIC_CONFIG });
        const body = `/* GharLog FCM background worker — served dynamically so the Firebase Web apiKey
   stays out of the git repo. All values delivered here are public by Firebase design. */
/* eslint-disable */
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp(${config});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || "GharLog";
  const body = (payload.notification && payload.notification.body) || "";
  const data = payload.data || {};
  self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data,
    tag: data.tag || "gharlog",
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
`;
        return new Response(body, {
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Service-Worker-Allowed": "/",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
