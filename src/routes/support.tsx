import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Loader2, Copy, Check, LifeBuoy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { APP_VERSION, APP_BUILD } from "@/lib/app-version";

const SUPPORT_EMAIL = "support@gharlog.app";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — GharLog" },
      {
        name: "description",
        content:
          "Get help with GharLog: report a problem, ask a question, or contact our team. We aim to respond within 2 business days.",
      },
      { property: "og:title", content: "Support — GharLog" },
      {
        property: "og:description",
        content: "Report a problem or contact the GharLog team.",
      },
      { property: "og:url", content: "https://smart-asset-locker.lovable.app/support" },
    ],
    links: [{ rel: "canonical", href: "https://smart-asset-locker.lovable.app/support" }],
  }),
  component: SupportPage,
});

function SupportPage() {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const diagnostics = [
    `— — —`,
    `App: GharLog v${APP_VERSION} (build ${APP_BUILD})`,
    `User: ${user?.email ?? user?.phone ?? "not signed in"}`,
    `User ID: ${user?.id ?? "—"}`,
    typeof navigator !== "undefined" ? `UA: ${navigator.userAgent}` : "",
    typeof window !== "undefined" ? `URL: ${window.location.href}` : "",
    `Time: ${new Date().toISOString()}`,
  ]
    .filter(Boolean)
    .join("\n");

  const fullBody = `${body || "Describe what happened, what you expected, and any steps to reproduce."}\n\n${diagnostics}`;

  function mailtoUrl() {
    const params = new URLSearchParams({
      subject: subject || "GharLog support request",
      body: fullBody,
    });
    return `mailto:${SUPPORT_EMAIL}?${params.toString()}`;
  }

  async function copyDiagnostics() {
    try {
      setBusy(true);
      await navigator.clipboard.writeText(diagnostics);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-[14px] leading-relaxed text-text-primary">
      <Link to="/" className="text-[12px] text-text-muted hover:text-text-secondary">← Back</Link>

      <div className="mt-4 flex items-center gap-2">
        <LifeBuoy className="h-5 w-5 text-brand" />
        <h1 className="text-2xl font-semibold">Support</h1>
      </div>
      <p className="mt-2 text-text-secondary">
        Something not working? Have a suggestion? We usually reply within 2 business days.
      </p>

      <section className="mt-6 rounded-2xl border border-border bg-surface-2 p-5">
        <h2 className="text-lg font-semibold">Report a problem</h2>
        <label className="mt-4 block text-[11px] font-medium text-text-secondary">Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Warranty reminder didn't fire"
          className="mt-1 w-full rounded-lg border border-border bg-surface-0 px-3 py-2 text-[13px] outline-none focus:border-brand"
        />

        <label className="mt-3 block text-[11px] font-medium text-text-secondary">
          What happened?
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="Steps to reproduce, what you expected, screenshots if any."
          className="mt-1 w-full rounded-lg border border-border bg-surface-0 px-3 py-2 text-[13px] outline-none focus:border-brand"
        />

        <details className="mt-3 rounded-lg border border-border bg-surface-1 p-3 text-[12px]">
          <summary className="cursor-pointer font-medium text-text-secondary">
            Diagnostics attached to your email
          </summary>
          <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] text-text-muted">
            {diagnostics}
          </pre>
          <button
            type="button"
            onClick={copyDiagnostics}
            disabled={busy}
            className="mt-2 inline-flex items-center gap-1 rounded-md border border-border bg-surface-0 px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:bg-surface-1"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy diagnostics"}
          </button>
        </details>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={mailtoUrl()}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-medium text-brand-foreground"
          >
            <Mail className="h-4 w-4" /> Send email
          </a>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-1 px-4 py-2.5 text-[13px] font-medium text-text-primary"
          >
            Email us directly
          </a>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface-2 p-5">
        <h2 className="text-lg font-semibold">Common questions</h2>
        <dl className="mt-3 space-y-4 text-[13px]">
          <div>
            <dt className="font-medium">Reminders aren't arriving</dt>
            <dd className="text-text-secondary">
              Make sure notifications are enabled in your device settings and inside the app
              (Profile → Notifications). Reminders start firing once your first item has a warranty
              or service date set.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Can I share with my family?</dt>
            <dd className="text-text-secondary">
              Yes. Open Profile → Family sharing, invite by email, and everyone sees the same
              household inventory.
            </dd>
          </div>
          <div>
            <dt className="font-medium">How do I upgrade to Pro?</dt>
            <dd className="text-text-secondary">
              Tap the Pro badge in the header. Payments are processed securely by Razorpay.
            </dd>
          </div>
          <div>
            <dt className="font-medium">How do I delete my account?</dt>
            <dd className="text-text-secondary">
              Profile → Delete account. You can also{" "}
              <Link to="/account/delete" className="text-brand underline">
                open it directly
              </Link>
              . Export your data first if needed.
            </dd>
          </div>
        </dl>
      </section>

      <p className="mt-6 text-center text-[11px] text-text-muted">
        GharLog v{APP_VERSION} · build {APP_BUILD}
      </p>
    </main>
  );
}
