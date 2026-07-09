import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;

    const tables = [
      "items",
      "item_documents",
      "maintenance_tasks",
      "notifications",
      "user_plans",
      "device_tokens",
      "household_members",
      "household_invites",
      "households",
    ] as const;

    const out: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      user: {
        id: userId,
        email: (claims as { email?: string })?.email ?? null,
      },
    };

    for (const t of tables) {
      try {
        const { data } = await supabase.from(t).select("*");
        out[t] = data ?? [];
      } catch {
        out[t] = [];
      }
    }

    return out;
  });
