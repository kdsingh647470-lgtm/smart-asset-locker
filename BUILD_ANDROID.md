# Ship GharLog to the Google Play Store (no coding required)

GharLog is already an installable PWA. The fastest way to get a real `.aab`
(Android App Bundle) you can upload to Google Play is to wrap the published
PWA with **PWABuilder** — a free tool from Microsoft. No Android Studio, no
Gradle, no local setup.

---

## Option A — Install directly on a phone today (0 minutes)

1. Open the published URL on Android Chrome:
   **https://smart-asset-locker.lovable.app**
2. Tap the ⋮ menu → **Install app** (or "Add to Home Screen").
3. GharLog now lives on the home screen with its own icon and runs full
   screen, just like a Play Store app. No store account, no review, no APK.

Use this for yourself, family, and beta testers. Move on to Option B only
when you actually want a Play Store listing.

---

## Option B — Generate a signed `.aab` via PWABuilder (~30 min, one-time)

### What you need first
- A **Google Play Developer account** — one-time **$25** at
  https://play.google.com/console/signup
- The published URL: **https://smart-asset-locker.lovable.app**

### Steps
1. Click **Publish** in Lovable so the latest version is live.
2. Go to **https://www.pwabuilder.com**.
3. Paste your published URL → click **Start**.
4. PWABuilder scores the manifest, service worker, and icons. GharLog's
   manifest is already tuned (icons 192/512, maskable, screenshots,
   shortcuts, categories) so you should see green checks.
5. Click **Package for stores** → **Android** → **Generate package**.
6. Leave the defaults. PWABuilder produces a ZIP containing:
   - `app-release-bundle.aab`  ← upload this to Play Console
   - `app-release-signed.apk` ← side-load for testing
   - `signing.keystore` + passwords ← **back this up forever**; you need
     the same keystore for every future update
7. In **Google Play Console** → Create app → fill the listing
   (name, short/long description, category = Productivity, content rating,
   privacy policy URL) → upload the `.aab` to the **Internal testing**
   track first.
8. After Google's review (usually 1–3 days) promote from Internal →
   Closed → Open → Production.

### What you keep updating
Most updates only need a Lovable **Publish** — the wrapped Android app
loads the live web URL, so UI/feature changes appear instantly with no new
upload. You only need to regenerate the `.aab` and ship a new Play release
when you change app metadata (name, icon, version) or platform features.

---

## Option C — Native Capacitor wrapper (advanced)

Only needed if you later want native phone APIs (push notifications,
contacts, deep file system access). This requires Android Studio + JDK on
your machine. Ask Lovable to scaffold Capacitor when you're ready.
