# Ship GharLog to the Google Play Store (Native Capacitor + Play Billing)

This guide replaces the older PWABuilder path. GharLog now ships as a
real Capacitor Android app with Google Play Billing (via RevenueCat) for
in-app subscriptions. Razorpay stays on the web.

---

## 1. One-time accounts you need

| Account | Cost | Why |
|---|---|---|
| Google Play Developer | **$25** one-time | To publish to the Play Store |
| RevenueCat | Free up to $2.5k MRR | Handles Play Billing SDK + receipt validation + webhooks |
| Google Cloud project for the Play Developer API | Free | Required for RevenueCat ↔ Play Store server-to-server |

App identity (already committed):
- **Package name:** `com.nesake.gharlog`
- **App name:** `GharLog`

---

## 2. What Lovable already did

- `capacitor.config.ts` — permanent `appId` + `appName`, `server.url` removed for release builds.
- `@revenuecat/purchases-capacitor` installed.
- `src/lib/billing.ts` — unified checkout: web → Razorpay, Android → Play Billing via RevenueCat.
- `src/routes/api/public/revenuecat-config.ts` — serves the RevenueCat public Android SDK key to the app.
- `src/routes/api/public/revenuecat-webhook.ts` — authoritative Pro grant from RevenueCat events; upserts `user_plans`.
- Pricing sheet shows **Restore purchases** on Android (Play Store requirement).

---

## 3. Google Play Console setup

1. Create the app in Play Console → package name `com.nesake.gharlog`.
2. **Monetization → Subscriptions → Create subscription**, twice:
   | Product ID | Base plan | Price |
   |---|---|---|
   | `gharlog_pro_monthly` | monthly, auto-renewing | ₹99 |
   | `gharlog_pro_yearly` | yearly, auto-renewing | ₹999 |
   These IDs must match `PLAY_PRODUCT_IDS` in `src/lib/billing.ts`.
3. **Setup → API access** — link a Google Cloud project and create a service account with **Finance** access. Download the JSON key (you'll give it to RevenueCat).
4. Fill in: store listing, content rating, target audience, data safety form (mirror `/data-safety` on the site), privacy policy URL = `https://gharlog.nesake.com/privacy`.
5. Feature graphic (1024×500), phone screenshots (min 2), 512×512 high-res icon.

---

## 4. RevenueCat setup

1. Create a project in RevenueCat → add an **Android app** with package name `com.nesake.gharlog`.
2. Paste the Play Console service-account JSON into RevenueCat (Project settings → Apps → Play Store credentials).
3. **Products** → import `gharlog_pro_monthly` and `gharlog_pro_yearly` from Play.
4. **Entitlements** → create one entitlement with identifier **exactly `pro`** and attach both products.
5. **Offerings** → create a default offering with both packages (optional but recommended).
6. **API keys** → copy the **Android public SDK key** (starts with `goog_`).
7. **Integrations → Webhooks**:
   - URL: `https://gharlog.nesake.com/api/public/revenuecat-webhook`
   - Authorization header: `Bearer <random-strong-secret-you-generate>`
   - Send a test event to verify.

---

## 5. Secrets to add in Lovable Cloud

Two secrets:
- `REVENUECAT_ANDROID_SDK_KEY` → the `goog_...` public SDK key from step 4.6
- `REVENUECAT_WEBHOOK_SECRET` → the same random string you put in the webhook Authorization header

(These are runtime secrets — I'll request them via `add_secret` when you're ready.)

---

## 6. Local Android build (one-time, ~1 hour)

On your Mac / PC (this can't be done in Lovable's sandbox):

```bash
# Prereqs: Node 20+, Java 17, Android Studio installed
git clone <your project>
cd <project>
bun install
bun run build                 # produces dist/
npx cap add android           # scaffolds /android (only first time)
npx cap sync android          # copies web build + plugins into /android
npx cap open android          # opens Android Studio
```

In Android Studio:
1. Wait for Gradle sync to finish.
2. **Build → Generate Signed App Bundle → AAB**. Create a new keystore
   (back up the `.jks` file + passwords **forever** — you need the same
   keystore for every future update).
3. Version code = 1, version name = 1.0.0 for the first release. Bump
   both for every subsequent upload.
4. The `.aab` lands in `android/app/release/`.

---

## 7. Upload & release

1. Play Console → Internal testing → **Create new release** → upload the `.aab`.
2. Add yourself as an internal tester. Install via the opt-in link on a real Android device.
3. Test the full purchase flow using a **licensed tester** account (Play Console → Setup → License testing). You'll be charged real money then refunded within days if you leave the sub active; RevenueCat sandbox events fire the same way.
4. Promote Internal → Closed → Open → Production once QA is clean.

---

## 8. Updating

**Web-only changes (UI, features, backend):** just `Publish` in Lovable. No Play upload needed for anything served from your web app. The Android app ships the **bundled** web build though — for UX/feature updates to land inside the installed Android app, you must:

```bash
bun run build && npx cap sync android
# then bump versionCode/versionName in Android Studio and upload a new .aab
```

**Native changes (Capacitor plugins, native config, icons, splash):** always require a new `.aab`.

---

## 9. Web stays on Razorpay

Nothing to do — `billingChannel()` detects `Capacitor.getPlatform() === 'android'` and routes only the Android build through Play Billing. The website (`gharlog.nesake.com`) and PWA installs continue using Razorpay subscriptions, which stays outside Play's scope.
