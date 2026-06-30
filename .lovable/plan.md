Add real web push notifications so users get alerts even when GharLog is closed — triggered by upcoming warranty/AMC/insurance expiries and maintenance due dates.

## How tapping the bell will work

1. First tap: ask the browser for notification permission, then register a Firebase Cloud Messaging (FCM) token and save it to the user's account. Show a "Notifications on ✓" toast.
2. Subsequent taps: open a small panel listing what's coming up (next 30 days of renewals + this month's maintenance tasks), each row tappable to jump to the item. A red dot on the bell shows unread count.
3. If permission was denied: show a one-line tip on how to re-enable it in browser settings; bell still opens the in-app panel.

## What actually triggers a phone notification

A scheduled job (Supabase pg_cron, runs once daily at 08:00 IST) calls a public API route on the app. The route reads each user's items + maintenance tasks, finds anything due in 30 / 7 / 1 days, and sends an FCM push to every device token that user has registered. Notifications deep-link back to the right tab (Inventory item, or Dashboard maintenance month).

Push works on Android (Chrome installed PWA or browser) and desktop. iOS requires the user to first "Add to Home Screen" — iOS only allows push to installed PWAs. The plan covers that messaging in onboarding.

## What you (the user) need to do once

Push notifications require a Firebase Cloud Messaging project — there is no Lovable-native push provider. You'll need to:

1. Create a free Firebase project at console.firebase.google.com (2 min).
2. Enable Cloud Messaging, copy the **VAPID public key** and the **service account JSON** (Project Settings → Cloud Messaging + Service Accounts).
3. Paste them when I prompt — I'll store them as secrets (`FCM_VAPID_PUBLIC_KEY`, `FCM_SERVICE_ACCOUNT_JSON`). The VAPID public key is also safe to expose to the browser.

I'll handle all the code, the worker file, the database table, and the cron job. I'll walk you through the Firebase clicks step-by-step when we get there.

## Technical scope

**New files**
- `public/firebase-messaging-sw.js` — FCM background message worker (separate from any app-shell SW; PWA skill allows this).
- `src/lib/push.ts` — `requestPushPermission()`, `getFcmToken()`, `registerToken()`; uses `firebase/app` + `firebase/messaging`.
- `src/lib/notifications.functions.ts` — `saveDeviceToken`, `listMyNotifications`, `markRead` server fns.
- `src/routes/api/public/send-due-reminders.ts` — public API route called by cron. Verifies `x-cron-secret` header, iterates users with tokens, computes reminders via existing `buildReminders` + maintenance tasks, sends FCM via HTTP v1 API (service account JWT).
- `src/components/NotificationsSheet.tsx` — bottom sheet listing upcoming reminders, opened by the bell.

**Edits**
- `src/routes/index.tsx` Header bell: `onClick` opens `NotificationsSheet`; first open also calls `requestPushPermission` and shows result via sonner toast. Adds a red unread dot when count > 0.
- `src/routes/__root.tsx`: add `<link rel="manifest" href="/firebase-cloud-messaging-push-scope">` is not needed; just keep existing manifest. Add foreground `onMessage` handler in a small client-only effect so in-app notifications also show.
- `public/manifest.webmanifest`: add `gcm_sender_id` only if FCM legacy is used (HTTP v1 doesn't need it; we'll skip).

**Database (one migration)**
- `public.device_tokens` (id, user_id, token unique, platform, created_at, last_seen_at) + RLS: `user_id = auth.uid()` for all; GRANTs for `authenticated` and `service_role`.
- `public.notifications` (id, user_id, kind, title, body, item_id nullable, due_date, sent_at, read_at) + RLS + GRANTs. Powers the bell panel and unread dot.

**Secrets**
- `FCM_VAPID_PUBLIC_KEY` (public, also stored as `VITE_FCM_VAPID_PUBLIC_KEY` for the browser).
- `FCM_SERVICE_ACCOUNT_JSON` (server only).
- `CRON_SECRET` (auto-generated; sent by pg_cron in the `x-cron-secret` header).

**Cron**
- pg_cron job calling `https://project--<id>.lovable.app/api/public/send-due-reminders` daily at 02:30 UTC (08:00 IST) with the secret header.

## What we'll verify after build

- Tap bell on a Chrome desktop / Android → browser prompts for permission → toast confirms → row appears in `device_tokens`.
- Manually invoke the cron endpoint with the secret → see a test notification on the device → row in `notifications` with `sent_at` set.
- Bell shows red dot until panel is opened → `read_at` populated.

## Out of scope (call out explicitly)

- iOS Safari push without Home Screen install — not supported by Apple; we'll show a one-time hint on iOS.
- Native APNs / Play Store push — that needs the Capacitor wrap from `BUILD_ANDROID.md`; this plan covers web push only.
- Email/SMS reminders — different channel; ask separately if you want it.