import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CreateOrderResult = {
  orderId: string;
  keyId: string;
  amount: number; // paise
  currency: string;
  userEmail: string | null;
  billing: "monthly" | "yearly";
};

const inputSchema = z.object({
  billing: z.enum(["monthly", "yearly"]).default("yearly"),
});

/**
 * Creates a Razorpay Order for the Pro plan.
 * Yearly: ₹999. Monthly: ₹99.
 * Attaches user_id + billing in notes so the webhook can activate Pro after payment.
 */
export const createRazorpayProOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data ?? {}))
  .handler(async ({ context, data }): Promise<CreateOrderResult> => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new Error("Razorpay is not configured");

    const billing = data.billing;
    const amount = billing === "yearly" ? 99900 : 9900; // paise: ₹999 / ₹99
    const currency = "INR";
    const receipt = `pro_${billing.slice(0, 1)}_${context.userId.slice(0, 8)}_${Date.now()}`;

    const auth = "Basic " + btoa(`${keyId}:${keySecret}`);
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: auth },
      body: JSON.stringify({
        amount,
        currency,
        receipt,
        notes: { user_id: context.userId, plan: "pro", billing },
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
      const { data: u } = await context.supabase.auth.getUser();
      email = u.user?.email ?? null;
    } catch {
      /* ignore */
    }

    return {
      orderId: order.id,
      keyId,
      amount: order.amount,
      currency: order.currency,
      userEmail: email,
      billing,
    };
  });
