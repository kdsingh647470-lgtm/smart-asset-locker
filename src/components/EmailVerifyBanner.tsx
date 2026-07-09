import { useState } from "react";
import { MailWarning, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function EmailVerifyBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user || dismissed) return null;
  // Only show for email accounts that aren't confirmed
  const email = user.email;
  if (!email) return null;
  if (user.email_confirmed_at) return null;

  const resend = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      toast.success("Verification email sent", { description: `Check ${email}` });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not resend email");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-3 mt-3 flex items-start gap-2 rounded-xl border border-[oklch(0.85_0.12_75)] bg-[oklch(0.98_0.05_75)] p-3 text-[12.5px] text-[oklch(0.35_0.12_75)]">
      <MailWarning className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Verify your email to secure your account</p>
        <p className="mt-0.5 text-[11.5px] opacity-80">
          We sent a link to <b className="break-all">{email}</b>. Verify to unlock invites, exports and Pro upgrade.
        </p>
        <button
          type="button"
          onClick={resend}
          disabled={busy}
          className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-[11.5px] font-medium text-[oklch(0.35_0.12_75)] shadow-sm disabled:opacity-50"
        >
          {busy && <Loader2 className="h-3 w-3 animate-spin" />}
          Resend verification email
        </button>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="text-[oklch(0.35_0.12_75)] opacity-60 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
