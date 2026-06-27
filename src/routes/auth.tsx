import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home as HomeIcon, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
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

        {/* Google sign-in */}
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setErr(null);
            setInfo(null);
            setBusy(true);
            try {
              const result = await lovable.auth.signInWithOAuth("google", {
                redirect_uri: window.location.origin,
              });
              if (result.error) throw result.error;
            } catch (e: unknown) {
              setErr(e instanceof Error ? e.message : "Google sign-in failed");
            } finally {
              setBusy(false);
            }
          }}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-0 px-4 py-2.5 text-[13px] font-medium text-text-primary transition hover:bg-surface-1 disabled:opacity-60"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
          </svg>
          Continue with Google
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setErr(null);
            setInfo(null);
            setBusy(true);
            try {
              const result = await lovable.auth.signInWithOAuth("apple", {
                redirect_uri: window.location.origin,
              });
              if (result.error) throw result.error;
            } catch (e: unknown) {
              setErr(e instanceof Error ? e.message : "Apple sign-in failed");
            } finally {
              setBusy(false);
            }
          }}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.05 12.04c-.03-2.86 2.34-4.23 2.45-4.3-1.34-1.96-3.42-2.23-4.16-2.26-1.77-.18-3.46 1.04-4.36 1.04-.91 0-2.3-1.02-3.78-.99-1.94.03-3.74 1.13-4.74 2.86-2.02 3.5-.52 8.68 1.45 11.52.96 1.39 2.11 2.95 3.61 2.9 1.45-.06 2-.94 3.76-.94 1.75 0 2.25.94 3.78.91 1.56-.03 2.55-1.42 3.5-2.82 1.1-1.61 1.55-3.18 1.58-3.26-.03-.02-3.04-1.17-3.07-4.66zM14.2 3.57c.8-.97 1.34-2.32 1.19-3.66-1.15.05-2.55.77-3.38 1.74-.74.86-1.39 2.23-1.22 3.55 1.28.1 2.6-.65 3.41-1.63z"/>
          </svg>
          Continue with Apple
        </button>


        <div className="mb-3 flex items-center gap-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10.5px] uppercase tracking-wider text-text-muted">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-surface-0 px-3 py-2 text-[12px] font-medium text-brand">
          <Mail className="h-3.5 w-3.5" /> Email
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
