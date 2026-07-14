// Razorpay webhook. Configure in Razorpay Dashboard → Settings → Webhooks with URL:
//   https://gharlog.nesake.com/api/public/razorpay-webhook
// Subscribe to (at least):
//   subscription.activated, subscription.charged, subscription.completed,
//   subscription.cancelled, subscription.halted, subscription.paused,
//   payment.captured, order.paid  (legacy one-time)
// Set RAZORPAY_WEBHOOK_SECRET to the same value entered in the dashboard.
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

type RzpEvent = {
  event: string;
  payload: {
    payment?: { entity?: { notes?: Record<string, string> } };
    order?: { entity?: { notes?: Record<string, string> } };
    subscription?: {
      entity?: {
        id?: string;
        status?: string;
        current_end?: number | null;
        notes?: Record<string, string>;
      };
    };
  };
};

export const Route = createFileRoute("/api/public/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) return new Response("Webhook not configured", { status: 500 });

        const signature = request.headers.get("x-razorpay-signature") ?? "";
        const raw = await request.text();
        const expected = createHmac("sha256", secret).update(raw).digest("hex");
        const sigBuf = Buffer.from(signature, "utf8");
        const expBuf = Buffer.from(expected, "utf8");
        if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let evt: RzpEvent;
        try {
          evt = JSON.parse(raw) as RzpEvent;
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const nowIso = new Date().toISOString();

        // --- Subscription lifecycle ---
        if (evt.event.startsWith("subscription.")) {
          const s = evt.payload.subscription?.entity;
          const userId = s?.notes?.user_id;
          const billing = (s?.notes?.billing as "monthly" | "yearly" | undefined) ?? "yearly";
          const subId = s?.id;
          if (!userId || !subId) {
            return Response.json({ ok: false, reason: "missing user_id or sub id" });
          }
          const currentEnd = s?.current_end ? new Date(s.current_end * 1000).toISOString() : null;
          const status = s?.status ?? evt.event.replace("subscription.", "");

          // Upsert subscription record.
          const { error: subErr } = await supabaseAdmin.from("user_subscriptions").upsert(
            {
              user_id: userId,
              subscription_id: subId,
              billing,
              status,
              current_end: currentEnd,
              updated_at: nowIso,
            },
            { onConflict: "user_id" },
          );
          if (subErr) return Response.json({ ok: false, error: subErr.message }, { status: 500 });

          // Grant / revoke Pro based on event.
          const activate = [
            "subscription.activated",
            "subscription.charged",
            "subscription.resumed",
          ].includes(evt.event);
          const revoke = [
            "subscription.cancelled",
            "subscription.completed",
            "subscription.halted",
            "subscription.paused",
            "subscription.expired",
          ].includes(evt.event);

          if (activate) {
            await supabaseAdmin.from("user_plans").upsert(
              {
                user_id: userId,
                plan: "pro",
                activated_at: nowIso,
                promo_code: `razorpay_${billing}`,
                updated_at: nowIso,
              },
              { onConflict: "user_id" },
            );
          } else if (revoke) {
            // Only downgrade if cycle ended (cancelled/expired/completed/halted).
            // For "paused" you may want to keep Pro; we downgrade to be safe.
            await supabaseAdmin.from("user_plans").upsert(
              {
                user_id: userId,
                plan: "free",
                activated_at: nowIso,
                promo_code: null,
                updated_at: nowIso,
              },
              { onConflict: "user_id" },
            );
          }
          return Response.json({ ok: true, event: evt.event });
        }

        // --- Legacy one-time payments (kept for backwards compat) ---
        if (evt.event === "payment.captured" || evt.event === "order.paid") {
          const notes =
            evt.payload?.payment?.entity?.notes ?? evt.payload?.order?.entity?.notes ?? {};
          const userId = notes.user_id;
          if (!userId) return Response.json({ ok: false, reason: "no user_id in notes" });
          const { error } = await supabaseAdmin.from("user_plans").upsert(
            {
              user_id: userId,
              plan: "pro",
              activated_at: nowIso,
              promo_code: "razorpay",
              updated_at: nowIso,
            },
            { onConflict: "user_id" },
          );
          if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
          return Response.json({ ok: true });
        }

        return Response.json({ ok: true, ignored: evt.event });
      },
    },
  },
});
