import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalFooter } from "@/components/LegalFooter";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — GharLog" },
      {
        name: "description",
        content: "The rules for using GharLog, India's Digital Home Asset Manager.",
      },
      { property: "og:title", content: "Terms of Service — GharLog" },
      { property: "og:description", content: "The rules for using GharLog." },
      { property: "og:url", content: "https://smart-asset-locker.lovable.app/terms" },
    ],
    links: [{ rel: "canonical", href: "https://smart-asset-locker.lovable.app/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 text-[14px] leading-relaxed text-text-primary">
      <Link to="/" className="text-[12px] text-text-muted hover:text-text-secondary">← Back</Link>
      <h1 className="mt-4 text-2xl font-semibold">Terms of Service</h1>
      <p className="mt-1 text-[12px] text-text-muted">Last updated: 9 July 2026</p>

      <section className="mt-6 space-y-3">
        <h2 className="mt-6 text-lg font-semibold">1. The service</h2>
        <p>
          GharLog lets you track home assets, warranties, documents and services for your
          household. Free and Pro plans are available.
        </p>

        <h2 className="mt-6 text-lg font-semibold">2. Your account</h2>
        <p>
          You are responsible for keeping your login credentials safe and for the activity on your
          account. Notify us if you suspect unauthorised use.
        </p>

        <h2 className="mt-6 text-lg font-semibold">3. Acceptable use</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Don't upload illegal content or content you don't have rights to.</li>
          <li>Don't attempt to break, reverse-engineer or overload the service.</li>
          <li>Don't use GharLog to spam or harass other household members.</li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold">4. Payments</h2>
        <p>
          Pro upgrades are processed by Razorpay. Prices are shown in INR and include applicable
          taxes unless stated. Refunds are handled on a case-by-case basis — contact support within
          7 days.
        </p>

        <h2 className="mt-6 text-lg font-semibold">5. Termination</h2>
        <p>
          You can delete your account any time from{" "}
          <Link to="/account/delete" className="text-brand underline">Settings → Delete account</Link>.
          We may suspend accounts that violate these terms.
        </p>

        <h2 className="mt-6 text-lg font-semibold">6. Disclaimer</h2>
        <p>
          GharLog is provided "as is". We do our best to keep your data safe and reminders
          accurate, but we can't guarantee uninterrupted service or that every reminder will fire
          on time. Always cross-check critical dates (insurance, warranties).
        </p>

        <h2 className="mt-6 text-lg font-semibold">7. Governing law</h2>
        <p>These terms are governed by the laws of India.</p>

        <h2 className="mt-6 text-lg font-semibold">8. Contact</h2>
        <p>
          <a className="text-brand underline" href="mailto:support@gharlog.app">support@gharlog.app</a>
        </p>
      </section>
      <LegalFooter />
    </main>
  );
}
