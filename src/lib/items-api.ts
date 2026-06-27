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
    })
    .select()
    .single();
  if (error) throw error;
  return data as DbItem;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw error;
}
