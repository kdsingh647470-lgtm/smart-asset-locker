import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home as HomeIcon, Loader2, Mail, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — GharLog" },
      { name: "description", content: "Sign in to your encrypted GharLog home asset vault." },
    ],
  }),
  component: AuthPage,
});

type Channel = "email" | "phone";

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [channel, setChannel] = useState<Channel>("email");
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  // email
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // phone
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/" });
  }, [loading, session, navigate]);

  function normalizePhone(raw: string) {
    const trimmed = raw.trim().replace(/\s+/g, "");
    if (trimmed.startsWith("+")) return trimmed;
    // Default to India country code if user just typed 10 digits
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length === 10) return `+91${digits}`;
    return `+${digits}`;
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setBusy(true);
    try {
      const p = normalizePhone(phone);
      const { error } = await supabase.auth.signInWithOtp({ phone: p });
      if (error) throw error;
      setOtpSent(true);
      setInfo(`OTP sent to ${p}. Enter the 6-digit code below.`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Couldn't send OTP");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const p = normalizePhone(phone);
      const { error } = await supabase.auth.verifyOtp({
        phone: p,
        token: otp.trim(),
        type: "sms",
      });
      if (error) throw error;
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Invalid or expired OTP");
    } finally {
      setBusy(false);
    }
  }

  function switchChannel(next: Channel) {
    setChannel(next);
    setErr(null);
    setInfo(null);
    setOtpSent(false);
    setOtp("");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-0 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-2 p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-brand-foreground">
            <HomeIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[17px] font-medium tracking-tight">GharLog</h1>
            <p className="text-[11px] text-text-muted">India's Digital Home Asset Manager</p>
          </div>
        </div>

        <h2 className="mb-1 text-[18px] font-medium">
          {channel === "phone"
            ? otpSent
              ? "Enter OTP"
              : "Sign in with mobile"
            : mode === "signin"
              ? "Welcome back"
              : "Create your vault"}
        </h2>
        <p className="mb-4 text-[12px] text-text-muted">
          {channel === "phone"
            ? otpSent
              ? "We sent a 6-digit code to your mobile."
              : "We'll text you a one-time password."
            : mode === "signin"
              ? "Sign in to access your encrypted home inventory."
              : "Start tracking every asset, warranty and document."}
        </p>

        {/* Channel switcher */}
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface-0 p-1">
          <button
            type="button"
            onClick={() => switchChannel("email")}
            className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium transition ${
              channel === "email"
                ? "bg-brand text-brand-foreground"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <Mail className="h-3.5 w-3.5" /> Email
          </button>
          <button
            type="button"
            onClick={() => switchChannel("phone")}
            className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium transition ${
              channel === "phone"
                ? "bg-brand text-brand-foreground"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" /> Mobile OTP
          </button>
        </div>

        {channel === "email" ? (
          <form onSubmit={submitEmail} className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-0 px-3 py-2 text-[13px] outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-0 px-3 py-2 text-[13px] outline-none focus:border-brand"
              />
            </div>
            {err && (
              <p className="rounded-md bg-[oklch(0.96_0.04_25)] px-2.5 py-2 text-[11px] text-[oklch(0.42_0.15_25)]">
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-medium text-brand-foreground disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
            <button
              type="button"
              onClick={() => {
                setErr(null);
                setMode(mode === "signin" ? "signup" : "signin");
              }}
              className="w-full text-center text-[12px] text-text-muted hover:text-text-secondary"
            >
              {mode === "signin"
                ? "New here? Create an account"
                : "Already have an account? Sign in"}
            </button>
          </form>
        ) : (
          <form onSubmit={otpSent ? verifyOtp : sendOtp} className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary">
                Mobile number
              </label>
              <input
                type="tel"
                required
                inputMode="tel"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={otpSent}
                className="w-full rounded-lg border border-border bg-surface-0 px-3 py-2 text-[13px] outline-none focus:border-brand disabled:opacity-60"
              />
              <p className="mt-1 text-[10.5px] text-text-muted">
                Include country code (e.g. +91 for India). 10-digit Indian numbers auto-prefix +91.
              </p>
            </div>

            {otpSent && (
              <div>
                <label className="mb-1 block text-[11px] font-medium text-text-secondary">
                  6-digit OTP
                </label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  pattern="\d{4,8}"
                  maxLength={8}
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-lg border border-border bg-surface-0 px-3 py-2 text-center text-[16px] tracking-[0.4em] outline-none focus:border-brand"
                />
              </div>
            )}

            {info && (
              <p className="rounded-md bg-[oklch(0.96_0.04_150)] px-2.5 py-2 text-[11px] text-[oklch(0.38_0.12_150)]">
                {info}
              </p>
            )}
            {err && (
              <p className="rounded-md bg-[oklch(0.96_0.04_25)] px-2.5 py-2 text-[11px] text-[oklch(0.42_0.15_25)]">
                {err}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-medium text-brand-foreground disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {otpSent ? "Verify & sign in" : "Send OTP"}
            </button>

            {otpSent && (
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                  setErr(null);
                  setInfo(null);
                }}
                className="w-full text-center text-[12px] text-text-muted hover:text-text-secondary"
              >
                Change number or resend
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
