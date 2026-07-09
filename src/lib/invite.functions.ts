import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_INVITES_PER_DAY = 10;

export const createHouseholdInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { householdId: string; email: string; role: "editor" | "viewer" }) => {
    const householdId = String(d?.householdId ?? "").trim();
    const email = String(d?.email ?? "").trim().toLowerCase();
    const role = d?.role === "editor" ? "editor" : "viewer";
    if (!householdId) throw new Error("Missing household");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new Error("Enter a valid email address");
    return { householdId, email, role };
  })
  .handler(async ({ data, context }): Promise<{
    id: string;
    token: string;
    email: string;
    role: "editor" | "viewer";
    expires_at: string;
  }> => {
    const { supabase, userId } = context;

    // Rate limit: cap invites created by this user in the last 24 hours.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: cErr } = await supabase
      .from("household_invites")
      .select("id", { count: "exact", head: true })
      .eq("invited_by", userId)
      .gte("created_at", since);
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) >= MAX_INVITES_PER_DAY) {
      throw new Error(
        `Daily invite limit reached (${MAX_INVITES_PER_DAY}/day). Try again tomorrow.`,
      );
    }

    // RLS ensures the caller can only insert on households they belong to as owner/editor.
    const { data: row, error } = await supabase
      .from("household_invites")
      .insert({
        household_id: data.householdId,
        email: data.email,
        role: data.role,
        invited_by: userId,
      })
      .select("id, token, email, role, expires_at")
      .single();
    if (error) throw new Error(error.message);
    return row as {
      id: string;
      token: string;
      email: string;
      role: "editor" | "viewer";
      expires_at: string;
    };
  });
