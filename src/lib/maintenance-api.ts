import { supabase } from "@/integrations/supabase/client";

export type MaintTone = "blue" | "teal" | "purple" | "amber" | "red" | "green";
export type Recurrence = "none" | "yearly" | "quarterly" | "monthly";

export type MaintTask = {
  id: string;
  user_id: string;
  month: number;
  due_date: string | null;
  label: string;
  tone: MaintTone;
  recurrence: Recurrence;
  linked_item_id: string | null;
  done_at: string | null;
  notes: string | null;
  vendor_name: string | null;
  vendor_phone: string | null;
  created_at: string;
  updated_at: string;
};

export type NewMaintTask = {
  month: number;
  label: string;
  tone?: MaintTone;
  recurrence?: Recurrence;
  due_date?: string | null;
  notes?: string | null;
  linked_item_id?: string | null;
  vendor_name?: string | null;
  vendor_phone?: string | null;
};


export async function listMaintTasks(): Promise<MaintTask[]> {
  const { data, error } = await supabase
    .from("maintenance_tasks")
    .select("*")
    .order("month", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MaintTask[];
}

export async function createMaintTask(input: NewMaintTask, userId: string): Promise<MaintTask> {
  const { data, error } = await supabase
    .from("maintenance_tasks")
    .insert({
      user_id: userId,
      month: input.month,
      label: input.label,
      tone: input.tone ?? "blue",
      recurrence: input.recurrence ?? "yearly",
      due_date: input.due_date ?? null,
      notes: input.notes ?? null,
      linked_item_id: input.linked_item_id ?? null,
      vendor_name: input.vendor_name ?? null,
      vendor_phone: input.vendor_phone ?? null,

    })
    .select()
    .single();
  if (error) throw error;
  return data as MaintTask;
}

export async function updateMaintTask(
  id: string,
  patch: Partial<NewMaintTask> & { done_at?: string | null },
): Promise<MaintTask> {
  const payload: Record<string, unknown> = {};
  for (const k of [
    "month",
    "label",
    "tone",
    "recurrence",
    "due_date",
    "notes",
    "linked_item_id",
    "done_at",
  ] as const) {
    if (patch[k] !== undefined) payload[k] = patch[k];
  }
  const { data, error } = await supabase
    .from("maintenance_tasks")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(payload as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as MaintTask;
}

export async function deleteMaintTask(id: string): Promise<void> {
  const { error } = await supabase.from("maintenance_tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function seedDefaultTasks(
  userId: string,
  defaults: { month: number; label: string; tone: MaintTone }[],
): Promise<void> {
  if (defaults.length === 0) return;
  const rows = defaults.map((d) => ({
    user_id: userId,
    month: d.month,
    label: d.label,
    tone: d.tone,
    recurrence: "yearly" as Recurrence,
  }));
  const { error } = await supabase.from("maintenance_tasks").insert(rows);
  if (error) throw error;
}

/** Was this task already done within the current cycle? */
export function isDoneThisCycle(t: MaintTask): boolean {
  if (!t.done_at) return false;
  const done = new Date(t.done_at);
  const now = new Date();
  switch (t.recurrence) {
    case "none":
      return true;
    case "monthly":
      return done.getFullYear() === now.getFullYear() && done.getMonth() === now.getMonth();
    case "quarterly": {
      const dq = Math.floor(done.getMonth() / 3);
      const nq = Math.floor(now.getMonth() / 3);
      return done.getFullYear() === now.getFullYear() && dq === nq;
    }
    case "yearly":
    default:
      return done.getFullYear() === now.getFullYear();
  }
}
