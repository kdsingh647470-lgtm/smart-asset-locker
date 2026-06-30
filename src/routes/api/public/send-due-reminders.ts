// Public cron endpoint. Called daily by pg_cron with the project's anon key in the
// `apikey` header (the /api/public/* prefix bypasses auth at the edge, so we re-verify
// the apikey to keep this from being abused).
//
// For each user with at least one device token, computes reminders due in 30/7/1 days
// (warranty / AMC / insurance + maintenance tasks for the current month) and:
//   1. Inserts a row into public.notifications (de-duped per kind+item+due_date+day-bucket).
//   2. Sends an FCM HTTP v1 push to every registered device token.
//
// FCM credentials come from the FCM_SERVICE_ACCOUNT_JSON secret (full service account
// JSON downloaded from Firebase → Project Settings → Service Accounts).

import { createFileRoute } from "@tanstack/react-router";

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
};

type DueReminder = {
  user_id: string;
  kind: string;
  title: string;
  body: string;
  item_id: string | null;
  due_date: string; // YYYY-MM-DD
  deep_link: string;
};

function daysBetween(target: string): number {
  const t = new Date(target + "T00:00:00Z").getTime();
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((t - today) / 86400000);
}

const TRIGGER_DAYS = [30, 7, 1, 0];

function shouldNotify(days: number): boolean {
  return TRIGGER_DAYS.includes(days);
}

function reminderBody(days: number, label: string): string {
  if (days === 0) return `${label} expires today — renew now.`;
  if (days === 1) return `${label} expires tomorrow — renew now.`;
  return `${label} expires in ${days} days — plan renewal.`;
}

// --- Google OAuth: sign a JWT with the service account private key ---
function base64UrlFromBytes(bytes: Uint8Array): string {
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64UrlFromString(s: string): string {
  return base64UrlFromBytes(new TextEncoder().encode(s));
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

async function getFcmAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64UrlFromString(JSON.stringify(header))}.${base64UrlFromString(JSON.stringify(claims))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${base64UrlFromBytes(new Uint8Array(sig))}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) throw new Error(`oauth ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

async function sendFcm(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<{ ok: boolean; status: number; bodyText: string }> {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      message: { token, notification: { title, body }, data },
    }),
  });
  return { ok: res.ok, status: res.status, bodyText: await res.text().catch(() => "") };
}

export const Route = createFileRoute("/api/public/send-due-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? "";
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        if (!expected || apikey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. Find every user that has at least one device token.
        const { data: tokenRows, error: tokenErr } = await supabaseAdmin
          .from("device_tokens")
          .select("user_id, token");
        if (tokenErr) return Response.json({ error: tokenErr.message }, { status: 500 });
        const tokensByUser = new Map<string, string[]>();
        for (const r of tokenRows ?? []) {
          const arr = tokensByUser.get(r.user_id) ?? [];
          arr.push(r.token);
          tokensByUser.set(r.user_id, arr);
        }
        if (tokensByUser.size === 0) {
          return Response.json({ ok: true, users: 0, sent: 0, reason: "no device tokens" });
        }

        const userIds = [...tokensByUser.keys()];

        // 2. Pull items + maintenance tasks for those users.
        const { data: items } = await supabaseAdmin
          .from("items")
          .select("id, user_id, name, warranty_until, amc_until, insured_until")
          .in("user_id", userIds);
        const { data: tasks } = await supabaseAdmin
          .from("maintenance_tasks")
          .select("id, user_id, label, due_date, month, recurrence, done_at")
          .in("user_id", userIds);

        const due: DueReminder[] = [];
        for (const it of items ?? []) {
          const checks: { date: string | null; kind: string; label: string }[] = [
            { date: it.warranty_until, kind: "warranty", label: `${it.name} warranty` },
            { date: it.amc_until, kind: "amc", label: `${it.name} AMC` },
            { date: it.insured_until, kind: "insurance", label: `${it.name} insurance` },
          ];
          for (const c of checks) {
            if (!c.date) continue;
            const d = daysBetween(c.date);
            if (!shouldNotify(d)) continue;
            due.push({
              user_id: it.user_id,
              kind: c.kind,
              title: `${c.label} ${d === 0 ? "expires today" : d === 1 ? "expires tomorrow" : `in ${d} days`}`,
              body: reminderBody(d, c.label),
              item_id: it.id,
              due_date: c.date,
              deep_link: "/?tab=inv",
            });
          }
        }
        for (const t of tasks ?? []) {
          if (!t.due_date || t.done_at) continue;
          const d = daysBetween(t.due_date);
          if (!shouldNotify(d)) continue;
          due.push({
            user_id: t.user_id,
            kind: "maintenance",
            title: `${t.label} ${d === 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`}`,
            body: `Maintenance: ${t.label} due ${d <= 0 ? "now" : `in ${d} days`}.`,
            item_id: null,
            due_date: t.due_date,
            deep_link: "/?tab=dash",
          });
        }

        if (due.length === 0) {
          return Response.json({ ok: true, users: userIds.length, sent: 0, reason: "nothing due" });
        }

        // 3. Dedupe against notifications sent in the last 20 hours.
        const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
        const { data: recent } = await supabaseAdmin
          .from("notifications")
          .select("user_id, kind, item_id, due_date")
          .in("user_id", userIds)
          .gte("created_at", since);
        const seen = new Set(
          (recent ?? []).map((r) => `${r.user_id}|${r.kind}|${r.item_id ?? ""}|${r.due_date ?? ""}`),
        );
        const fresh = due.filter((d) => !seen.has(`${d.user_id}|${d.kind}|${d.item_id ?? ""}|${d.due_date}`));

        if (fresh.length === 0) {
          return Response.json({ ok: true, users: userIds.length, sent: 0, reason: "already sent" });
        }

        // 4. Insert notification rows.
        const nowIso = new Date().toISOString();
        await supabaseAdmin.from("notifications").insert(
          fresh.map((f) => ({
            user_id: f.user_id,
            kind: f.kind,
            title: f.title,
            body: f.body,
            item_id: f.item_id,
            due_date: f.due_date,
            deep_link: f.deep_link,
            sent_at: nowIso,
          })),
        );

        // 5. Send FCM pushes if configured.
        const saRaw = process.env.FCM_SERVICE_ACCOUNT_JSON;
        if (!saRaw) {
          return Response.json({
            ok: true,
            users: userIds.length,
            queued: fresh.length,
            sent: 0,
            warning: "FCM_SERVICE_ACCOUNT_JSON not set — in-app notifications saved but no push delivered.",
          });
        }
        let sa: ServiceAccount;
        try {
          sa = JSON.parse(saRaw) as ServiceAccount;
        } catch {
          return Response.json({ ok: false, error: "FCM_SERVICE_ACCOUNT_JSON is not valid JSON" }, { status: 500 });
        }
        const accessToken = await getFcmAccessToken(sa);

        let sent = 0;
        const invalidTokens: string[] = [];
        for (const f of fresh) {
          const tokens = tokensByUser.get(f.user_id) ?? [];
          for (const tok of tokens) {
            const r = await sendFcm(accessToken, sa.project_id, tok, f.title, f.body, {
              url: f.deep_link,
              kind: f.kind,
              item_id: f.item_id ?? "",
            });
            if (r.ok) sent++;
            else if (r.status === 404 || r.status === 400) invalidTokens.push(tok);
          }
        }
        if (invalidTokens.length) {
          await supabaseAdmin.from("device_tokens").delete().in("token", invalidTokens);
        }

        return Response.json({
          ok: true,
          users: userIds.length,
          queued: fresh.length,
          sent,
          pruned: invalidTokens.length,
        });
      },
    },
  },
});
