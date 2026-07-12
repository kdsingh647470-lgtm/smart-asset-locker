// Razorpay webhook. Configure in Razorpay Dashboard → Settings → Webhooks with URL:
//   https://gharlog.nesake.com/api/public/razorpay-webhook
// Subscribe to at least: payment.captured, order.paid.
// Set RAZORPAY_WEBHOOK_SECRET to the same value entered in the dashboard.
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

type RzpEvent = {
  event: string;
  payload: {
    payment?: { entity?: { notes?: Record<string, string> } };
    order?: { entity?: { notes?: Record<string, string> } };
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

        if (evt.event !== "payment.captured" && evt.event !== "order.paid") {
          return Response.json({ ok: true, ignored: evt.event });
        }

        const notes =
          evt.payload?.payment?.entity?.notes ?? evt.payload?.order?.entity?.notes ?? {};
        const userId = notes.user_id;
        if (!userId) return Response.json({ ok: false, reason: "no user_id in notes" });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const nowIso = new Date().toISOString();
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
      },
    },
  },
});
