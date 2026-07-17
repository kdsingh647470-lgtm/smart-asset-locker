// Minimal no-op service worker for PWA installability.
// Does NOT cache anything — avoids stale-asset issues in Lovable preview and prod.
// The Firebase Cloud Messaging worker lives separately at /firebase-messaging-sw.js.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* pass-through to network */ });
