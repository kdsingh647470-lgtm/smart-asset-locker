import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { confirm: string }) => {
    const confirm = String(d?.confirm ?? "").trim();
    if (confirm !== "DELETE") throw new Error("Please type DELETE to confirm");
    return { confirm };
  })
  .handler(async ({ context }): Promise<{ ok: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    // Best-effort cleanup of user-owned rows across tables that reference the user.
    // RLS is bypassed by admin client; ignore per-table errors so deletion still proceeds.
    const tables = [
      "device_tokens",
      "notifications",
      "user_plans",
      "item_documents",
      "maintenance_tasks",
      "items",
      "household_members",
      "household_invites",
      "households",
    ] as const;

    for (const t of tables) {
      try {
        if (t === "households") {
          await supabaseAdmin.from(t).delete().eq("owner_id", userId);
        } else if (t === "household_invites") {
          await supabaseAdmin.from(t).delete().eq("invited_by", userId);
        } else {
          await supabaseAdmin.from(t).delete().eq("user_id", userId);
        }
      } catch {
        /* continue */
      }
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
