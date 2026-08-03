import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalFooter } from "@/components/LegalFooter";

const TITLE = "Home Maintenance Checklist for Indian Homes (Month by Month)";
const DESCRIPTION =
  "A month-by-month home maintenance checklist built for the Indian climate — AC servicing before summer, monsoon waterproofing, geyser checks before winter, and warranty reminders.";
const URL = "https://gharlog.nesake.com/guides/seasonal-maintenance-checklist";

export const Route = createFileRoute("/guides/seasonal-maintenance-checklist")({
  head: () => ({
    meta: [
      { title: "Home Maintenance Checklist for Indian Homes — GharLog" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          mainEntityOfPage: URL,
          author: { "@type": "Organization", name: "GharLog" },
          publisher: { "@type": "Organization", name: "GharLog" },
        }),
      },
    ],
  }),
  component: MaintenanceGuidePage,
});

type Month = {
  month: string;
  season: string;
  tasks: string[];
};

const MONTHS: Month[] = [
  {
    month: "January",
    season: "Peak winter (North India)",
    tasks: [
      "Service the geyser / water heater — descale the element and check the thermostat.",
      "Check room heater and blower cords for fraying before daily use.",
      "Clean chimney filters after heavy winter cooking.",
      "Inspect window and door seals for cold draughts.",
    ],
  },
  {
    month: "February",
    season: "Late winter",
    tasks: [
      "Book AC servicing now — technicians are cheap and available before the summer rush.",
      "Deep-clean ceiling fans and check mounting bolts.",
      "Test the inverter battery: top up distilled water and clean terminals.",
      "Renew any home insurance or AMC expiring before summer.",
    ],
  },
  {
    month: "March",
    season: "Pre-summer",
    tasks: [
      "Install / uncover ACs, replace filters and check gas pressure.",
      "Clean the overhead and underground water tanks before peak usage.",
      "Service the water purifier — replace RO membrane and sediment filters.",
      "Check refrigerator door gaskets and defrost the freezer.",
    ],
  },
  {
    month: "April",
    season: "Summer",
    tasks: [
      "Clean AC filters every 2–3 weeks during heavy use.",
      "Inspect the terrace for heat cracks; apply reflective coating if needed.",
      "Test the inverter under load — summer outages start now.",
      "Check the cooler pump, pads and water lines if you use an air cooler.",
    ],
  },
  {
    month: "May",
    season: "Peak summer",
    tasks: [
      "Check the electrical load: MCBs tripping often means an overloaded circuit.",
      "Clean and lubricate the exhaust fans.",
      "Look for termite activity around wooden frames before the rains.",
      "Inspect the washing machine inlet hose for bulges or leaks.",
    ],
  },
  {
    month: "June",
    season: "Pre-monsoon",
    tasks: [
      "Clear terrace drains, balcony outlets and rainwater downpipes.",
      "Waterproof visible cracks on the terrace and external walls.",
      "Trim tree branches touching the roof or power lines.",
      "Test the earthing and check that all outdoor points are covered.",
    ],
  },
  {
    month: "July",
    season: "Monsoon",
    tasks: [
      "Watch for damp patches on ceilings and shared walls — log them early.",
      "Run the dehumidifier or keep silica packs in the document cupboard.",
      "Check the seepage around window chajjas after the first heavy spell.",
      "Keep the inverter dry and ventilated.",
    ],
  },
  {
    month: "August",
    season: "Monsoon",
    tasks: [
      "Clean and disinfect water tanks after heavy rain.",
      "Service the washing machine drain — humidity clogs the filter faster.",
      "Inspect wiring in damp areas for insulation damage.",
      "Treat wooden furniture and doors against swelling and fungus.",
    ],
  },
  {
    month: "September",
    season: "Post-monsoon",
    tasks: [
      "Repaint or patch any wall that developed monsoon damp.",
      "Pest control: post-monsoon is the best window for cockroaches and termites.",
      "Deep-clean the AC before switching it off for the season.",
      "Check the roof and parapet for cracks the rain opened up.",
    ],
  },
  {
    month: "October",
    season: "Festive season",
    tasks: [
      "Pre-Diwali deep clean: chimney, fans, filters, curtains and upholstery.",
      "Test smoke detectors, fire extinguisher expiry and gas pipe condition.",
      "Check every gas connection hose — replace if older than 2 years.",
      "Verify warranty status before buying new appliances in festive sales.",
    ],
  },
  {
    month: "November",
    season: "Pre-winter",
    tasks: [
      "Service the geyser before first use and check the pressure valve.",
      "Cover or uninstall ACs; clean and store the outdoor unit cover.",
      "Check the electricity load balance for heaters and geysers.",
      "Renew vehicle and home insurance policies expiring this quarter.",
    ],
  },
  {
    month: "December",
    season: "Winter",
    tasks: [
      "Insulate exposed water pipes in colder regions.",
      "Annual review: list every appliance's warranty and AMC status.",
      "File the year's invoices and service receipts in one place.",
      "Plan next year's AMC renewals and budget for replacements.",
    ],
  },
];

const QUARTERLY = [
  "Flush and clean water tanks and check the pump.",
  "Test the inverter battery and top up distilled water.",
  "Run a full AMC and warranty audit on every appliance.",
  "Check for leaks under sinks and behind the washing machine.",
];

function MaintenanceGuidePage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 text-[14px] leading-relaxed text-text-primary">
      <Link to="/" className="text-[12px] text-text-muted hover:text-text-secondary">
        ← Back
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">
        Home Maintenance Checklist for Indian Homes
      </h1>
      <p className="mt-1 text-[12px] text-text-muted">
        A month-by-month schedule built around Indian seasons
      </p>

      <p className="mt-4">
        Most home repairs in India are seasonal and predictable. ACs fail in April because
        nobody serviced them in February. Ceilings leak in July because the terrace drains
        were never cleared in June. This home maintenance checklist maps every routine task
        to the month it actually matters, so nothing turns into an emergency.
      </p>

      <h2 className="mt-8 text-lg font-semibold">How to use this checklist</h2>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        <li>Do the tasks for the current month, then skim the next month to plan bookings.</li>
        <li>Book seasonal servicing one month early — cheaper rates, better availability.</li>
        <li>Keep every invoice and service record together so warranty claims are easy.</li>
        <li>
          Set reminders so recurring tasks don't slip — GharLog's{" "}
          <Link to="/" className="text-brand underline">
            maintenance calendar
          </Link>{" "}
          can track these automatically alongside your warranties.
        </li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold">Month-by-month maintenance calendar</h2>
      <div className="mt-3 space-y-4">
        {MONTHS.map((m) => (
          <section key={m.month} className="rounded-xl border border-border p-4">
            <h3 className="text-[15px] font-semibold">{m.month}</h3>
            <p className="text-[11px] uppercase tracking-wide text-text-muted">{m.season}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {m.tasks.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-semibold">Every quarter, whatever the season</h2>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        {QUARTERLY.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>

      <h2 className="mt-8 text-lg font-semibold">Keep the paperwork with the schedule</h2>
      <p className="mt-2">
        A maintenance schedule only pays off if you can prove what was serviced and when.
        Store invoices, warranty cards, AMC contracts and insurance policies against each
        appliance, and you'll never lose a claim to a missing receipt.
      </p>
      <p className="mt-3">
        <Link to="/" className="text-brand underline">
          Start tracking your home with GharLog →
        </Link>
      </p>

      <LegalFooter />
    </main>
  );
}
