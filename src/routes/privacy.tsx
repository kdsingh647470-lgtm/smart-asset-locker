import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalFooter } from "@/components/LegalFooter";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — GharLog" },
      {
        name: "description",
        content:
          "How GharLog collects, stores and protects your home asset data. Encrypted vault, no ad tracking, full deletion on request.",
      },
      { property: "og:title", content: "Privacy Policy — GharLog" },
      {
        property: "og:description",
        content: "How GharLog handles your data and your rights over it.",
      },
      { property: "og:url", content: "https://smart-asset-locker.lovable.app/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://smart-asset-locker.lovable.app/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 text-[14px] leading-relaxed text-text-primary">
      <Link to="/" className="text-[12px] text-text-muted hover:text-text-secondary">← Back</Link>
      <h1 className="mt-4 text-2xl font-semibold">Privacy Policy</h1>
      <p className="mt-1 text-[12px] text-text-muted">Last updated: 9 July 2026</p>

      <section className="mt-6 space-y-3">
        <p>
          GharLog ("we", "us") is India's Digital Home Asset Manager. This policy explains what
          data we collect when you use the GharLog web and mobile app, how we use it, and the
          rights you have over it.
        </p>

        <h2 className="mt-6 text-lg font-semibold">1. What we collect</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li><b>Account:</b> email, phone (if used for OTP), display name, sign-in provider.</li>
          <li><b>Household content you create:</b> items, appliances, documents, warranties, invoices, insurance details, maintenance tasks, household members.</li>
          <li><b>Uploaded files:</b> invoices, receipts, warranty PDFs and photos you attach.</li>
          <li><b>Device data:</b> push notification token, app version, timezone, language.</li>
          <li><b>Payment metadata:</b> for Pro upgrades via Razorpay we store only the order/payment IDs — full card details never touch our servers.</li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold">2. How we use it</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Run the app: show your inventory, remind you about renewals, sync across your household.</li>
          <li>Send transactional notifications (warranty expiry, service due, invite accepted).</li>
          <li>AI features (invoice scan, assistant) — content is sent to our AI provider only to answer your request and is not used to train third-party models.</li>
          <li>Fraud prevention, debugging and legal compliance.</li>
        </ul>
        <p>We do <b>not</b> sell your data and we do not use it for advertising profiles.</p>

        <h2 className="mt-6 text-lg font-semibold">3. Storage & security</h2>
        <p>
          Data is stored on managed cloud infrastructure with encryption at rest and in transit.
          Access is protected by row-level security so only you and the household members you
          invite can read your data.
        </p>

        <h2 className="mt-6 text-lg font-semibold">4. Sharing</h2>
        <p>We share data only with the processors required to run the service:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Cloud database & auth provider (hosting your account and content).</li>
          <li>Push notification providers (Firebase Cloud Messaging, Web Push).</li>
          <li>Razorpay (payments) — for Pro upgrades only.</li>
          <li>AI provider — only when you invoke an AI feature.</li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold">5. Your rights</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li><b>Access & export:</b> email us to receive a copy of your data.</li>
          <li><b>Correction:</b> edit any item, document or profile field in the app.</li>
          <li>
            <b>Deletion:</b> delete your account any time from{" "}
            <Link to="/account/delete" className="text-brand underline">Settings → Delete account</Link>.
            This removes your profile, items, documents, tasks, notifications and household data.
          </li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold">6. Children</h2>
        <p>GharLog is not directed at children under 13. We do not knowingly collect their data.</p>

        <h2 className="mt-6 text-lg font-semibold">7. Changes</h2>
        <p>We'll update this page and the "last updated" date when the policy changes.</p>

        <h2 className="mt-6 text-lg font-semibold">8. Contact</h2>
        <p>
          Questions or data requests: <a className="text-brand underline" href="mailto:support@gharlog.app">support@gharlog.app</a>
        </p>
      </section>
      <LegalFooter />
    </main>
  );
}
