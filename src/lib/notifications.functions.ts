import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  item_id: string | null;
  due_date: string | null;
  deep_link: string | null;
  sent_at: string | null;
  read_at: string | null;
  created_at: string;
};

export const saveDeviceToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { token: string; platform?: string; user_agent?: string }) => {
    const token = String(d?.token ?? "").trim();
    if (!token || token.length < 20 || token.length > 4096) throw new Error("Invalid token");
    return {
      token,
      platform: (d.platform ?? "web").slice(0, 32),
      user_agent: (d.user_agent ?? "").slice(0, 512) || null,
    };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("device_tokens")
      .upsert(
        {
          user_id: context.userId,
          token: data.token,
          platform: data.platform,
          user_agent: data.user_agent,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "token" },
      );
    if (error) throw error;
    return { ok: true };
  });

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AppNotification[]> => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as AppNotification[];
  });

export const markAllRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("read_at", null);
    if (error) throw error;
    return { ok: true };
  });
