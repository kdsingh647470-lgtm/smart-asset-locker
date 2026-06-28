import { supabase } from "@/integrations/supabase/client";

export type DbItem = {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  serial: string | null;
  room: string;
  icon_key: string;
  icon_tone: string;
  price_paid: number;
  price_now: number;
  purchased_at: string | null;
  warranty_until: string | null;
  amc_until: string | null;
  insured_until: string | null;
  has_invoice: boolean;
  has_manual: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type NewItem = {
  name: string;
  brand?: string;
  serial?: string;
  room: string;
  price_paid: number;
  price_now?: number;
  purchased_at?: string | null;
  warranty_until?: string | null;
  amc_until?: string | null;
  insured_until?: string | null;
  has_invoice?: boolean;
  has_manual?: boolean;
  notes?: string | null;
};

export async function listItems(): Promise<DbItem[]> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbItem[];
}

export async function createItem(input: NewItem, userId: string): Promise<DbItem> {
  const { data, error } = await supabase
    .from("items")
    .insert({
      user_id: userId,
      name: input.name,
      brand: input.brand ?? null,
      serial: input.serial ?? null,
      room: input.room,
      price_paid: input.price_paid,
      price_now: input.price_now ?? input.price_paid,
      purchased_at: input.purchased_at ?? null,
      warranty_until: input.warranty_until ?? null,
      amc_until: input.amc_until ?? null,
      insured_until: input.insured_until ?? null,
      has_invoice: input.has_invoice ?? false,
      has_manual: input.has_manual ?? false,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as DbItem;
}

export async function updateItem(
  id: string,
  patch: Partial<NewItem>,
): Promise<DbItem> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.brand !== undefined) payload.brand = patch.brand || null;
  if (patch.serial !== undefined) payload.serial = patch.serial || null;
  if (patch.room !== undefined) payload.room = patch.room;
  if (patch.price_paid !== undefined) payload.price_paid = patch.price_paid;
  if (patch.price_now !== undefined) payload.price_now = patch.price_now;
  if (patch.purchased_at !== undefined) payload.purchased_at = patch.purchased_at || null;
  if (patch.warranty_until !== undefined) payload.warranty_until = patch.warranty_until || null;
  if (patch.amc_until !== undefined) payload.amc_until = patch.amc_until || null;
  if (patch.insured_until !== undefined) payload.insured_until = patch.insured_until || null;
  if (patch.has_invoice !== undefined) payload.has_invoice = patch.has_invoice;
  if (patch.has_manual !== undefined) payload.has_manual = patch.has_manual;
  if (patch.notes !== undefined) payload.notes = patch.notes || null;
  const { data, error } = await supabase
    .from("items")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(payload as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as DbItem;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw error;
}


