import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home as HomeIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — GharLog" },
      { name: "description", content: "Set a new password for your GharLog account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase places a recovery access_token in the URL hash; the client picks
    // it up and fires a PASSWORD_RECOVERY event. We just wait for a session.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    if (password.length < 8) return setErr("Use at least 8 characters.");
    if (password !== confirm) return setErr("Passwords don't match.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setInfo("Password updated. Redirecting…");
      setTimeout(() => navigate({ to: "/" }), 800);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-0 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-2 p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-brand-foreground">
            <HomeIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[17px] font-medium tracking-tight">Reset password</h1>
            <p className="text-[11px] text-text-muted">Choose a new password for your vault.</p>
          </div>
        </div>

        {!ready ? (
          <p className="text-[12px] text-text-muted">
            Open this page from the password-reset link in your email. If you didn't request one, you can{" "}
            <button
              className="text-brand underline"
              onClick={() => navigate({ to: "/auth" })}
            >
              return to sign in
            </button>
            .
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary">
                New password
              </label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-0 px-3 py-2 text-[13px] outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary">
                Confirm password
              </label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-0 px-3 py-2 text-[13px] outline-none focus:border-brand"
              />
            </div>
            {err && (
              <p className="rounded-md bg-[oklch(0.96_0.04_25)] px-2.5 py-2 text-[11px] text-[oklch(0.42_0.15_25)]">
                {err}
              </p>
            )}
            {info && (
              <p className="rounded-md bg-[oklch(0.96_0.04_150)] px-2.5 py-2 text-[11px] text-[oklch(0.38_0.12_150)]">
                {info}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-medium text-brand-foreground disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
