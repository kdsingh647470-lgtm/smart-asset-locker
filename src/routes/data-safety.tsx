import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalFooter } from "@/components/LegalFooter";

export const Route = createFileRoute("/data-safety")({
  head: () => ({
    meta: [
      { title: "Data Safety — GharLog" },
      {
        name: "description",
        content:
          "A plain-English summary of the data GharLog collects, why, whether it's shared, and how it's protected. Mirrors our Google Play Data Safety disclosure.",
      },
      { property: "og:title", content: "Data Safety — GharLog" },
      {
        property: "og:description",
        content: "What GharLog collects, why, and how it's protected.",
      },
      { property: "og:url", content: "https://gharlog.nesake.com/data-safety" },
    ],
    links: [{ rel: "canonical", href: "https://gharlog.nesake.com/data-safety" }],
  }),
  component: DataSafetyPage,
});

type Row = {
  type: string;
  collected: string;
  purpose: string;
  shared: string;
  optional: boolean;
};

const ROWS: Row[] = [
  {
    type: "Email address",
    collected: "Yes",
    purpose: "Account creation, sign-in, security alerts",
    shared: "No",
    optional: false,
  },
  {
    type: "Phone number",
    collected: "Optional (OTP sign-in)",
    purpose: "Sign-in via SMS OTP",
    shared: "No",
    optional: true,
  },
  {
    type: "Name",
    collected: "Optional (profile)",
    purpose: "Display name in your household",
    shared: "With household members you invite",
    optional: true,
  },
  {
    type: "Photos & documents you upload",
    collected: "Yes (invoices, warranty PDFs, appliance photos)",
    purpose: "Store & display your inventory",
    shared: "With household members you invite",
    optional: true,
  },
  {
    type: "App activity (items, tasks, reminders)",
    collected: "Yes",
    purpose: "Core app functionality",
    shared: "With household members you invite",
    optional: false,
  },
  {
    type: "Device push token",
    collected: "If you enable notifications",
    purpose: "Send warranty/service reminders",
    shared: "With Firebase Cloud Messaging / Web Push",
    optional: true,
  },
  {
    type: "Payment metadata",
    collected: "Order & payment IDs only (for Pro)",
    purpose: "Process Pro upgrade",
    shared: "With Razorpay",
    optional: true,
  },
  {
    type: "AI prompts & scanned invoice text",
    collected: "Only when you use AI features",
    purpose: "Answer your query / extract invoice details",
    shared: "With our AI provider (not used to train third-party models)",
    optional: true,
  },
];

function DataSafetyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 text-[14px] leading-relaxed text-text-primary">
      <Link to="/" className="text-[12px] text-text-muted hover:text-text-secondary">← Back</Link>
      <h1 className="mt-4 text-2xl font-semibold">Data Safety</h1>
      <p className="mt-1 text-[12px] text-text-muted">Last updated: 9 July 2026</p>

      <p className="mt-4">
        This page is a plain-English summary of the data GharLog collects and how we protect it.
        It mirrors the disclosure shown on our Google Play listing. For the full legal text see{" "}
        <Link to="/privacy" className="text-brand underline">Privacy Policy</Link>.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Security practices</h2>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        <li>All traffic is encrypted in transit (HTTPS/TLS).</li>
        <li>Your data is encrypted at rest on managed cloud storage.</li>
        <li>Row-level security — only you and household members you invite can read your data.</li>
        <li>Passwords are hashed and checked against known breach lists.</li>
        <li>You can request deletion any time from{" "}
          <Link to="/account/delete" className="text-brand underline">Settings → Delete account</Link>.
        </li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold">Data we collect</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-[12.5px]">
          <thead className="bg-surface-1 text-[11px] uppercase tracking-wide text-text-muted">
            <tr>
              <th className="px-3 py-2">Data type</th>
              <th className="px-3 py-2">Collected</th>
              <th className="px-3 py-2">Why</th>
              <th className="px-3 py-2">Shared</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.type} className="border-t border-border align-top">
                <td className="px-3 py-2 font-medium">{r.type}</td>
                <td className="px-3 py-2">{r.collected}</td>
                <td className="px-3 py-2">{r.purpose}</td>
                <td className="px-3 py-2">{r.shared}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-lg font-semibold">What we don't do</h2>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        <li>We don't sell your personal data.</li>
        <li>We don't use your data for advertising or ad profiles.</li>
        <li>We don't share data with data brokers.</li>
        <li>We don't collect device location, contacts, SMS, calendar, or microphone data.</li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold">Your controls</h2>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        <li><b>Export:</b> download all your data as JSON from Delete account page.</li>
        <li><b>Correct:</b> edit any item, document or profile field in the app.</li>
        <li><b>Delete:</b> remove your account and all data from{" "}
          <Link to="/account/delete" className="text-brand underline">Settings → Delete account</Link>.
        </li>
        <li><b>Notifications:</b> toggle from device settings any time.</li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold">Contact</h2>
      <p className="mt-2">
        Data protection queries: <a className="text-brand underline" href="mailto:support@gharlog.app">support@gharlog.app</a>
      </p>
      <LegalFooter />
    </main>
  );
}
