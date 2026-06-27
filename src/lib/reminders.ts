import type { DbItem } from "./items-api";

export type ReminderTone = "bad" | "warn" | "info";

export type Reminder = {
  id: string;
  tone: ReminderTone;
  title: string;
  body: string;
  daysLeft: number;
  kind: "warranty" | "amc" | "insurance";
};

const KIND_LABEL: Record<Reminder["kind"], string> = {
  warranty: "warranty",
  amc: "AMC",
  insurance: "insurance",
};

function daysBetween(target: string): number {
  const t = new Date(target + "T00:00:00").getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((t - today.getTime()) / 86400000);
}

function toneFor(days: number): ReminderTone | null {
  if (days < 0) return "bad"; // already expired
  if (days <= 1) return "bad";
  if (days <= 7) return "warn";
  if (days <= 30) return "info";
  return null;
}

function bodyFor(days: number, kind: Reminder["kind"]): string {
  const label = KIND_LABEL[kind];
  if (days < 0) return `${label} expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago · renew now to stay covered`;
  if (days === 0) return `${label} expires today · renew now`;
  if (days === 1) return `${label} expires tomorrow · renew now`;
  if (days <= 7) return `${label} expires in ${days} days · renew this week`;
  return `${label} expires in ${days} days · plan renewal`;
}

export function buildReminders(items: DbItem[]): Reminder[] {
  const out: Reminder[] = [];
  for (const it of items) {
    const checks: { date: string | null; kind: Reminder["kind"] }[] = [
      { date: it.warranty_until, kind: "warranty" },
      { date: it.amc_until, kind: "amc" },
      { date: it.insured_until, kind: "insurance" },
    ];
    for (const c of checks) {
      if (!c.date) continue;
      const days = daysBetween(c.date);
      const tone = toneFor(days);
      if (!tone) continue;
      out.push({
        id: `${it.id}-${c.kind}`,
        tone,
        title: `${it.name} ${KIND_LABEL[c.kind]} ${days < 0 ? "expired" : "expiring"}`,
        body: bodyFor(days, c.kind),
        daysLeft: days,
        kind: c.kind,
      });
    }
  }
  // Sort: most urgent first
  out.sort((a, b) => a.daysLeft - b.daysLeft);
  return out;
}
