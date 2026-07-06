import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type HouseholdRole = "owner" | "editor" | "viewer";

export const acceptHouseholdInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { token: string }) => {
    const token = String(d?.token ?? "").trim();
    if (!token || token.length > 128) throw new Error("Invalid invite");
    return { token };
  })
  .handler(async ({ data, context }): Promise<{
    ok: boolean;
    message: string;
    household_id?: string;
    household_name?: string;
  }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invite, error: invErr } = await supabaseAdmin
      .from("household_invites")
      .select("id, household_id, role, email, expires_at, accepted_at")
      .eq("token", data.token)
      .maybeSingle();
    if (invErr) return { ok: false, message: invErr.message };
    if (!invite) return { ok: false, message: "Invite not found or already used" };
    if (invite.accepted_at) return { ok: false, message: "This invite was already used" };
    if (new Date(invite.expires_at).getTime() < Date.now())
      return { ok: false, message: "This invite has expired" };

    const email = (context.claims?.email ?? "").toLowerCase();
    const inviteEmail = String(invite.email ?? "").toLowerCase();
    if (inviteEmail && email && inviteEmail !== email) {
      return { ok: false, message: `Invite is for ${invite.email}. Sign in with that email to accept.` };
    }

    const { data: household } = await supabaseAdmin
      .from("households")
      .select("id, name")
      .eq("id", invite.household_id)
      .maybeSingle();
    if (!household) return { ok: false, message: "Household no longer exists" };

    const { error: memErr } = await supabaseAdmin
      .from("household_members")
      .upsert(
        { household_id: invite.household_id, user_id: context.userId, role: invite.role },
        { onConflict: "household_id,user_id" },
      );
    if (memErr) return { ok: false, message: memErr.message };

    await supabaseAdmin
      .from("household_invites")
      .update({ accepted_at: new Date().toISOString(), accepted_by: context.userId })
      .eq("id", invite.id);

    return {
      ok: true,
      message: `Joined ${household.name}`,
      household_id: household.id,
      household_name: household.name,
    };
  });
