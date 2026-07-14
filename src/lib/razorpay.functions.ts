import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CreateSubscriptionResult = {
  subscriptionId: string;
  keyId: string;
  userEmail: string | null;
  billing: "monthly" | "yearly";
};

export type MySubscription = {
  subscriptionId: string;
  billing: "monthly" | "yearly";
  status: string;
  currentEnd: string | null;
  cancelAtCycleEnd: boolean;
} | null;

const billingSchema = z.object({
  billing: z.enum(["monthly", "yearly"]).default("yearly"),
});

// Razorpay auth helper (Basic auth with key_id:key_secret)
function rzpAuth(keyId: string, keySecret: string) {
  return "Basic " + btoa(`${keyId}:${keySecret}`);
}

/**
 * Ensure a Razorpay plan exists for the given billing cycle. Cached in
 * public.razorpay_plans so we don't recreate plans on every subscription.
 */
async function ensurePlanId(
  billing: "monthly" | "yearly",
  keyId: string,
  keySecret: string,
): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const existing = await supabaseAdmin
    .from("razorpay_plans")
    .select("plan_id")
    .eq("billing", billing)
    .maybeSingle();
  if (existing.data?.plan_id) return existing.data.plan_id;

  const amount = billing === "yearly" ? 99900 : 9900; // paise
  const period = billing === "yearly" ? "yearly" : "monthly";

  const res = await fetch("https://api.razorpay.com/v1/plans", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: rzpAuth(keyId, keySecret) },
    body: JSON.stringify({
      period,
      interval: 1,
      item: {
        name: billing === "yearly" ? "GharLog Pro (Yearly)" : "GharLog Pro (Monthly)",
        amount,
        currency: "INR",
        description: billing === "yearly" ? "Pro plan — billed yearly" : "Pro plan — billed monthly",
      },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Razorpay plan create failed (${res.status}): ${t.slice(0, 200)}`);
  }
  const plan = (await res.json()) as { id: string };
  await supabaseAdmin
    .from("razorpay_plans")
    .upsert({ billing, plan_id: plan.id }, { onConflict: "billing" });
  return plan.id;
}

/**
 * Creates a Razorpay Subscription for Pro. Recurring, auto-billed each cycle
 * until cancelled. total_count is set high so the mandate lasts effectively
 * indefinitely (Razorpay requires a finite count).
 */
export const createRazorpayProSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => billingSchema.parse(data ?? {}))
  .handler(async ({ context, data }): Promise<CreateSubscriptionResult> => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new Error("Razorpay is not configured");

    const billing = data.billing;
    const planId = await ensurePlanId(billing, keyId, keySecret);
    // total_count is the max number of billing cycles the mandate covers.
    // Yearly: 10 years. Monthly: 10 years (120 cycles). User can cancel anytime.
    const totalCount = billing === "yearly" ? 10 : 120;

    const res = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: rzpAuth(keyId, keySecret) },
      body: JSON.stringify({
        plan_id: planId,
        total_count: totalCount,
        customer_notify: 1,
        notes: { user_id: context.userId, plan: "pro", billing },
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Razorpay subscription failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const sub = (await res.json()) as { id: string };

    let email: string | null = null;
    try {
      const { data: u } = await context.supabase.auth.getUser();
      email = u.user?.email ?? null;
    } catch {
      /* ignore */
    }

    return { subscriptionId: sub.id, keyId, userEmail: email, billing };
  });

/** Read the caller's current subscription record (if any). */
export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MySubscription> => {
    const { data, error } = await context.supabase
      .from("user_subscriptions")
      .select("subscription_id, billing, status, current_end, cancel_at_cycle_end")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      subscriptionId: data.subscription_id,
      billing: data.billing as "monthly" | "yearly",
      status: data.status,
      currentEnd: data.current_end,
      cancelAtCycleEnd: data.cancel_at_cycle_end,
    };
  });

/**
 * Cancel the caller's subscription. cancel_at_cycle_end=true keeps Pro
 * active until the paid period ends; false cancels immediately.
 */
export const cancelMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ atCycleEnd: z.boolean().default(true) }).parse(data ?? {}),
  )
  .handler(async ({ context, data }) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new Error("Razorpay is not configured");

    const { data: sub, error } = await context.supabase
      .from("user_subscriptions")
      .select("subscription_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!sub?.subscription_id) throw new Error("No active subscription");

    const res = await fetch(
      `https://api.razorpay.com/v1/subscriptions/${sub.subscription_id}/cancel`,
      {
        method: "POST",
        headers: { "content-type": "application/json", authorization: rzpAuth(keyId, keySecret) },
        body: JSON.stringify({ cancel_at_cycle_end: data.atCycleEnd ? 1 : 0 }),
      },
    );
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Cancel failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("user_subscriptions")
      .update({ cancel_at_cycle_end: data.atCycleEnd })
      .eq("user_id", context.userId);
    return { ok: true };
  });
