import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type UserPlan = "free" | "pro";

export const getMyPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ plan: UserPlan; activated_at: string | null }> => {
    const { data, error } = await context.supabase
      .from("user_plans")
      .select("plan, activated_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return {
      plan: (data?.plan as UserPlan) ?? "free",
      activated_at: data?.activated_at ?? null,
    };
  });

export const redeemProCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) => {
    const code = String(d?.code ?? "").trim();
    if (!code || code.length > 64) throw new Error("Invalid code");
    return { code };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean; message: string }> => {
    const expected = (process.env.PRO_PROMO_CODE || "GHARPRO2026").trim();
    if (data.code.toUpperCase() !== expected.toUpperCase()) {
      return { ok: false, message: "Invalid promo code" };
    }
    const { error } = await context.supabase
      .from("user_plans")
      .upsert(
        {
          user_id: context.userId,
          plan: "pro",
          activated_at: new Date().toISOString(),
          promo_code: data.code,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Pro unlocked!" };
  });
