import { supabase } from "@/integrations/supabase/client";

export type HouseholdRole = "owner" | "editor" | "viewer";

export type Household = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

export type HouseholdMember = {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  joined_at: string;
};

export type HouseholdInvite = {
  id: string;
  household_id: string;
  email: string;
  role: HouseholdRole;
  token: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

export async function listMyHouseholds(): Promise<Household[]> {
  const { data, error } = await supabase
    .from("households")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Household[];
}

export async function createHousehold(name: string, userId: string): Promise<Household> {
  const { data, error } = await supabase
    .from("households")
    .insert({ name: name.trim() || "My Household", owner_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as Household;
}

export async function renameHousehold(id: string, name: string) {
  const { error } = await supabase.from("households").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deleteHousehold(id: string) {
  const { error } = await supabase.from("households").delete().eq("id", id);
  if (error) throw error;
}

export async function listMembers(householdId: string): Promise<HouseholdMember[]> {
  const { data, error } = await supabase
    .from("household_members")
    .select("*")
    .eq("household_id", householdId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as HouseholdMember[];
}

export async function updateMemberRole(id: string, role: HouseholdRole) {
  const { error } = await supabase.from("household_members").update({ role }).eq("id", id);
  if (error) throw error;
}

export async function removeMember(id: string) {
  const { error } = await supabase.from("household_members").delete().eq("id", id);
  if (error) throw error;
}

export async function listInvites(householdId: string): Promise<HouseholdInvite[]> {
  const { data, error } = await supabase
    .from("household_invites")
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as HouseholdInvite[];
}

export async function createInvite(
  householdId: string,
  email: string,
  role: HouseholdRole,
  invitedBy: string,
): Promise<HouseholdInvite> {
  const { data, error } = await supabase
    .from("household_invites")
    .insert({
      household_id: householdId,
      email: email.trim().toLowerCase(),
      role,
      invited_by: invitedBy,
    })
    .select()
    .single();
  if (error) throw error;
  return data as HouseholdInvite;
}

export async function revokeInvite(id: string) {
  const { error } = await supabase.from("household_invites").delete().eq("id", id);
  if (error) throw error;
}

export function inviteLink(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/invite/${token}`;
}
