import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CreateOrderResult = {
  orderId: string;
  keyId: string;
  amount: number; // paise
  currency: string;
  userEmail: string | null;
};

/**
 * Creates a Razorpay Order for the Pro plan (₹999).
 * Attaches user_id in notes so the webhook can activate Pro after payment.
 */
export const createRazorpayProOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CreateOrderResult> => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new Error("Razorpay is not configured");

    const amount = 100; // ₹1 in paise (TEST MODE)
    const currency = "INR";
    const receipt = `pro_${context.userId.slice(0, 8)}_${Date.now()}`;

    const auth = "Basic " + btoa(`${keyId}:${keySecret}`);
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: auth },
      body: JSON.stringify({
        amount,
        currency,
        receipt,
        notes: { user_id: context.userId, plan: "pro" },
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Razorpay order failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const order = (await res.json()) as { id: string; amount: number; currency: string };

    // Fetch email for prefill (best-effort).
    let email: string | null = null;
    try {
      const { data } = await context.supabase.auth.getUser();
      email = data.user?.email ?? null;
    } catch {
      /* ignore */
    }

    return {
      orderId: order.id,
      keyId,
      amount: order.amount,
      currency: order.currency,
      userEmail: email,
    };
  });
