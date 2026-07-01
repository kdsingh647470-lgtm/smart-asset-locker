## Why your paste keeps turning into `@secret:GOOGLE_API_KEY`

Lovable's chat detects strings that look like Google API keys (they start with `AIzaSy…`) and automatically replaces them with a `@secret:` reference so the raw key never sits in chat history. That's why every time you paste it, you see `@secret:GOOGLE_API_KEY` instead of the actual value.

The good news: since Lovable already stored the value as the `GOOGLE_API_KEY` secret, I don't need you to paste it again at all. I just need to reference it from the right place.

## The catch for Firebase web apiKey

Firebase's web `apiKey` has to be embedded in:
1. The client JS bundle (`src/lib/push.ts`)
2. The service worker (`public/firebase-messaging-sw.js`) — served as a static file

Both are downloaded by every browser, so the value ends up public regardless (this is by Firebase design — the web apiKey is not a secret, it only identifies the project; real security comes from Firebase Auth rules and API key HTTP-referrer restrictions in Google Cloud Console).

Because it must be public, it cannot stay inside a Lovable server-only secret. We have to put the literal string into those two files.

## Plan

### Option A — recommended: I inject it at build via a build-time replace

1. Confirm `GOOGLE_API_KEY` is the same value shown as `apiKey` in Firebase Console. (It usually is when Firebase auto-provisioned the project.)
2. Add a Vite `define` in `vite.config.ts` that inlines `process.env.GOOGLE_API_KEY` into the client bundle as a compile-time constant.
3. Update `src/lib/push.ts` to read that constant.
4. For the static SW file (`public/firebase-messaging-sw.js`), add a tiny server route `/firebase-messaging-sw.js` that serves the worker with the key interpolated from `process.env.GOOGLE_API_KEY`. This keeps the raw key out of the repo but still delivers it to browsers (which is fine — see above).
5. Fill in the other public Firebase values (authDomain, projectId, messagingSenderId, appId) inline in both files.
6. Lock the key down in Google Cloud Console → APIs & Services → Credentials → your browser key → set "HTTP referrers" to your Lovable domains, so even though it's public it can only be used from your app.

### Option B — you paste it outside chat

If Option A can't use `GOOGLE_API_KEY` (e.g. it isn't actually the Firebase Web apiKey), you can bypass chat masking by:

- Opening **Project Settings → Secrets** in Lovable directly and creating a new secret named `FIREBASE_WEB_API_KEY` with the value pasted into that form (that form doesn't rewrite `AIzaSy…` values). Then tell me the secret is set and I'll use it the same way as Option A.

### Verification after wiring

- Open the deployed app on Chrome, tap the bell → allow notifications → confirm a row appears in the `device_tokens` table.
- Manually invoke `/api/public/send-due-reminders` with the anon key in the `apikey` header → confirm a push arrives and a row lands in `notifications`.

## Question for you

Do you want me to proceed with **Option A** (assume `GOOGLE_API_KEY` is the same string as the Firebase Web apiKey — true in ~95% of Firebase projects), or would you rather go with **Option B** and save it as a new `FIREBASE_WEB_API_KEY` secret via the Settings → Secrets form?
