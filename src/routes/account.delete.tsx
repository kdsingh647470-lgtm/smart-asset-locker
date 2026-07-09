import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AlertTriangle, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { deleteMyAccount } from "@/lib/account.functions";
import { exportMyData } from "@/lib/export.functions";

export const Route = createFileRoute("/account/delete")({
  head: () => ({
    meta: [
      { title: "Delete account — GharLog" },
      { name: "description", content: "Permanently delete your GharLog account and all data." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const del = useServerFn(deleteMyAccount);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!loading && !session) {
    return (
      <main className="mx-auto max-w-md px-5 py-10 text-center">
        <p className="text-sm text-text-secondary">
          Please <Link to="/auth" className="text-brand underline">sign in</Link> to delete your account.
        </p>
      </main>
    );
  }

  async function onDelete(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await del({ data: { confirm } });
      try { await supabase.auth.signOut(); } catch { /* ignore */ }
      navigate({ to: "/auth", replace: true });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not delete account");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <Link to="/" className="text-[12px] text-text-muted hover:text-text-secondary">← Back</Link>
      <div className="mt-4 rounded-2xl border border-border bg-surface-2 p-5">
        <div className="flex items-center gap-2 text-[oklch(0.42_0.15_25)]">
          <AlertTriangle className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Delete your account</h1>
        </div>
        <p className="mt-3 text-[13px] text-text-secondary">
          This will <b>permanently</b> remove your GharLog profile and all associated data:
        </p>
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[12.5px] text-text-secondary">
          <li>All items, appliances and documents</li>
          <li>Maintenance tasks & reminders</li>
          <li>Households you own (members lose access)</li>
          <li>Device tokens, notifications, plan status</li>
          <li>Your login (email/phone/Google/Apple)</li>
        </ul>
        <p className="mt-3 text-[12.5px] text-text-secondary">
          This action cannot be undone. Export anything you need first.
        </p>

        <form onSubmit={onDelete} className="mt-5 space-y-3">
          <label className="block text-[11px] font-medium text-text-secondary">
            Type <span className="font-mono text-[oklch(0.42_0.15_25)]">DELETE</span> to confirm
          </label>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-0 px-3 py-2 text-[13px] outline-none focus:border-brand"
            autoComplete="off"
          />
          {err && (
            <p className="rounded-md bg-[oklch(0.96_0.04_25)] px-2.5 py-2 text-[11px] text-[oklch(0.42_0.15_25)]">
              {err}
            </p>
          )}
          <div className="flex gap-2">
            <Link
              to="/"
              className="flex-1 rounded-lg border border-border bg-surface-0 px-4 py-2.5 text-center text-[13px] font-medium text-text-primary hover:bg-surface-1"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={busy || confirm !== "DELETE"}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[oklch(0.55_0.2_25)] px-4 py-2.5 text-[13px] font-medium text-white disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete forever
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
