import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { createItem, deleteItem, listItems, type DbItem } from "@/lib/items-api";
import {
  HomeIcon,
  Box,
  ScanLine,
  Lock,
  MessageCircle,
  Shield,
  Bell,
  Crown,
  AlertCircle,
  Clock,
  Mail,
  Lightbulb,
  Plus,
  ShieldCheck,
  Camera,
  FileUp,
  MailPlus,
  QrCode,
  FileText,
  Wrench,
  BookOpen,
  ShieldHalf,
  FileCheck,
  IdCard,
  Car,
  HeartPulse,
  Sparkles,
  Send,
  Check,
  X,
  TrendingUp,
  Coins,
  AlertTriangle,
  LogOut,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  ALERTS,
  AI_REPLIES,
  GMAIL_SOURCES,
  ICON_TONE,
  ITEMS,
  LOCKER_CATEGORIES,
  LOCKER_TONE,
  PARTNERS,
  ROOMS,
  SUGGESTIONS,
  TIMELINE,
  inr,
  type LifecycleStatus,
} from "@/lib/gharlog-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GharLog — India's Digital Home Asset Manager" },
      {
        name: "description",
        content:
          "Track every appliance, warranty, document and insurance for your home in one encrypted vault.",
      },
    ],
  }),
  component: GharLogApp,
});

type TabKey = "dash" | "inv" | "scan" | "locker" | "ai" | "ins";

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "dash", label: "Home", icon: HomeIcon },
  { key: "inv", label: "Inventory", icon: Box },
  { key: "scan", label: "Scan", icon: ScanLine },
  { key: "locker", label: "Locker", icon: Lock },
  { key: "ai", label: "AI", icon: MessageCircle },
  { key: "ins", label: "Insurance", icon: Shield },
];

function GharLogApp() {
  const [tab, setTab] = useState<TabKey>("dash");
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-0 text-sm text-text-muted">
        Loading…
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" />;

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary">
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col bg-surface-0 shadow-sm md:my-4 md:min-h-[calc(100vh-2rem)] md:rounded-2xl md:overflow-hidden">
        <Header />
        <TabBar tab={tab} setTab={setTab} />
        <main className="flex-1 px-4 pb-24 pt-4">
          {tab === "dash" && <Dashboard setTab={setTab} />}
          {tab === "inv" && <Inventory setTab={setTab} />}
          {tab === "scan" && <Scan />}
          {tab === "locker" && <Locker />}
          {tab === "ai" && <AIAssistant />}
          {tab === "ins" && <Insurance />}
        </main>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between bg-brand px-4 py-3 text-brand-foreground">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-blue">
          <HomeIcon className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <div className="leading-tight">
          <div className="text-[17px] font-medium tracking-tight">GharLog</div>
          <div className="text-[10px] text-white/55">India's Digital Home Asset Manager</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 rounded-full bg-[oklch(0.62_0.13_290)] px-2.5 py-0.5 text-[11px] font-medium text-white">
          <Crown className="h-3 w-3" />
          Pro
        </span>
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10"
        >
          <Bell className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Sign out"
          title="Sign out"
          onClick={() => supabase.auth.signOut()}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function TabBar({ tab, setTab }: { tab: TabKey; setTab: (t: TabKey) => void }) {
  return (
    <nav className="flex border-b border-border bg-surface-2">
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = tab === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex flex-1 flex-col items-center gap-1 border-b-2 px-1 py-2.5 text-[11px] font-medium transition-colors ${
              active
                ? "border-brand text-brand"
                : "border-transparent text-text-muted hover:text-text-secondary"
            }`}
          >
            <Icon className="h-[18px] w-[18px]" />
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}

/* ------------------------- DASHBOARD ------------------------- */
function Dashboard({ setTab }: { setTab: (t: TabKey) => void }) {
  return (
    <>
      <section className="mb-3.5 rounded-2xl bg-brand p-5 text-brand-foreground">
        <p className="text-[13px] opacity-70">Good evening</p>
        <h1 className="mb-3.5 text-[20px] font-medium">Kedar's Home</h1>
        <div className="mb-3.5 grid grid-cols-2 gap-2">
          <StatChip icon={HomeIcon} label="Home value" value="₹8,42,000" sub="34 items tracked" />
          <StatChip
            icon={AlertTriangle}
            label="Needs attention"
            value="3 items"
            sub="warranty expiring"
            valueTone="bad"
          />
          <StatChip icon={TrendingUp} label="This month" value="4 items" sub="new purchases" />
          <StatChip
            icon={Coins}
            label="Potential saving"
            value="₹7,800"
            sub="replace AMC"
            valueTone="ok"
          />
        </div>
        <div className="flex items-start gap-2.5 rounded-xl border border-accent-blue/40 bg-accent-blue/20 p-3">
          <Lightbulb className="mt-0.5 h-[18px] w-[18px] flex-shrink-0 text-[oklch(0.83_0.11_255)]" />
          <div>
            <div className="text-[10px] font-medium text-[oklch(0.83_0.11_255)]">AI suggestion</div>
            <p className="text-[12px] leading-relaxed text-white/90">
              Upload your LG Microwave invoice to increase your insurance coverage by ₹18,500 and
              unlock 2-year warranty tracking.
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-2.5">
        {ALERTS.map((a, i) => (
          <AlertBanner key={i} {...a} />
        ))}
      </div>

      <SectionTitle>Quick actions</SectionTitle>
      <div className="grid grid-cols-4 gap-2">
        <QuickAction icon={ScanLine} label="Scan invoice" onClick={() => setTab("scan")} />
        <QuickAction icon={MessageCircle} label="Ask GharLog" onClick={() => setTab("ai")} />
        <QuickAction icon={ShieldCheck} label="Get insured" onClick={() => setTab("ins")} />
        <QuickAction icon={Lock} label="Open locker" onClick={() => setTab("locker")} />
      </div>
    </>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
  sub,
  valueTone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  valueTone?: "ok" | "bad";
}) {
  const tone =
    valueTone === "bad"
      ? "text-[oklch(0.82_0.13_25)]"
      : valueTone === "ok"
      ? "text-[oklch(0.84_0.16_158)]"
      : "text-white";
  return (
    <div className="rounded-xl bg-white/10 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-[12px] text-white/70">
        <Icon className="h-[14px] w-[14px]" />
        {label}
      </div>
      <div className={`text-[18px] font-medium tabular-nums ${tone}`}>{value}</div>
      <div className="mt-0.5 text-[10px] text-white/55">{sub}</div>
    </div>
  );
}

function AlertBanner({
  tone,
  title,
  body,
}: {
  tone: "bad" | "warn" | "info";
  title: string;
  body: string;
}) {
  const styles = {
    bad: {
      box: "bg-[oklch(0.96_0.04_25)] border-[oklch(0.78_0.12_25)]",
      text: "text-[oklch(0.36_0.15_25)]",
      sub: "text-[oklch(0.5_0.16_25)]",
      Icon: AlertCircle,
    },
    warn: {
      box: "bg-[oklch(0.96_0.05_75)] border-[oklch(0.78_0.13_75)]",
      text: "text-[oklch(0.36_0.1_70)]",
      sub: "text-[oklch(0.5_0.13_75)]",
      Icon: Clock,
    },
    info: {
      box: "bg-[oklch(0.96_0.03_255)] border-[oklch(0.78_0.1_255)]",
      text: "text-[oklch(0.32_0.13_255)]",
      sub: "text-[oklch(0.48_0.15_255)]",
      Icon: Mail,
    },
  }[tone];
  const { Icon } = styles;
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${styles.box}`}>
      <Icon className={`mt-0.5 h-[17px] w-[17px] flex-shrink-0 ${styles.sub}`} />
      <div>
        <div className={`text-[12px] font-medium ${styles.text}`}>{title}</div>
        <div className={`mt-0.5 text-[11px] ${styles.sub}`}>{body}</div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2.5 mt-4 text-[11px] font-medium uppercase tracking-wider text-text-muted">
      {children}
    </h2>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-1 py-3 text-[11px] leading-tight text-text-secondary transition-colors hover:border-accent-blue"
    >
      <Icon className="h-5 w-5 text-brand" />
      <span>{label}</span>
    </button>
  );
}

/* ------------------------- INVENTORY ------------------------- */
function Inventory({ setTab }: { setTab: (t: TabKey) => void }) {
  const [room, setRoom] = useState("all");
  const filtered = useMemo(
    () => (room === "all" ? ITEMS : ITEMS.filter((i) => i.room === room)),
    [room],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setTab("scan")}
        className="mb-3 inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-[12px] font-medium text-brand-foreground"
      >
        <Plus className="h-4 w-4" />
        Add item
      </button>

      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {ROOMS.map((r) => {
          const active = room === r.key;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => setRoom(r.key)}
              className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                active
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-border bg-surface-2 text-text-secondary"
              }`}
            >
              {r.label} ({r.count})
            </button>
          );
        })}
      </div>

      <div className="space-y-2.5">
        {filtered.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </>
  );
}

function ItemCard({ item }: { item: (typeof ITEMS)[number] }) {
  const Icon = item.icon;
  const depTone =
    item.depreciationTone === "ok"
      ? "text-ok"
      : item.depreciationTone === "warn"
      ? "text-warn"
      : "text-bad";

  return (
    <article className="rounded-xl border border-border bg-surface-2 p-3 transition-colors hover:border-accent-blue">
      <div className="mb-3 flex gap-3">
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${ICON_TONE[item.iconTone]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium leading-tight">{item.name}</div>
          <div className="mt-0.5 truncate text-[11px] text-text-muted">
            {capitalize(item.room)} · {item.serial} · {item.brand}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {item.badges.map((b, i) => (
              <Badge key={i} tone={b.tone}>
                {b.label}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-[13px] font-medium tabular-nums">{inr(item.pricePaid)}</div>
          <div className={`mt-0.5 text-[10px] tabular-nums ${depTone}`}>
            {inr(item.priceNow)} now
          </div>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1 border-t border-border pt-2.5">
        <Lifecycle status={item.lifecycle.invoice} label="Invoice" icon={FileText} />
        <Lifecycle status={item.lifecycle.warranty} label="Warranty" icon={Shield} />
        <Lifecycle status={item.lifecycle.amc} label="AMC" icon={Wrench} />
        <Lifecycle status={item.lifecycle.insured} label="Insured" icon={ShieldHalf} />
        <Lifecycle status={item.lifecycle.manual} label="Manual" icon={BookOpen} />
      </div>
    </article>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "bad" | "info" | "muted";
  children: React.ReactNode;
}) {
  const styles = {
    ok: "bg-[oklch(0.95_0.05_158)] text-[oklch(0.38_0.1_158)]",
    warn: "bg-[oklch(0.95_0.06_75)] text-[oklch(0.4_0.1_70)]",
    bad: "bg-[oklch(0.95_0.04_25)] text-[oklch(0.42_0.15_25)]",
    info: "bg-[oklch(0.95_0.03_255)] text-[oklch(0.36_0.13_255)]",
    muted: "bg-surface-1 text-text-secondary border border-border",
  }[tone];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${styles}`}>{children}</span>
  );
}

function Lifecycle({
  status,
  label,
  icon: Icon,
}: {
  status: LifecycleStatus;
  label: string;
  icon: LucideIcon;
}) {
  const color =
    status === "ok"
      ? "text-ok"
      : status === "warn"
      ? "text-warn"
      : status === "bad"
      ? "text-bad"
      : "text-border";
  return (
    <div className="flex flex-col items-center text-[10px] text-text-muted">
      <Icon className={`mb-1 h-4 w-4 ${color}`} />
      {label}
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ------------------------- SCAN ------------------------- */
function Scan() {
  return (
    <>
      <div className="mb-3 overflow-hidden rounded-xl border border-border bg-surface-2">
        <div className="bg-brand px-4 py-3.5 text-brand-foreground">
          <h3 className="text-[14px] font-medium">AI invoice scanner</h3>
          <p className="mt-1 text-[11px] leading-relaxed opacity-70">
            Upload an invoice — GharLog extracts product, brand, model, serial number, GST, price,
            warranty, and seller automatically.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3">
          <ScanMethod icon={Camera} name="Camera scan" sub="Point at any invoice" />
          <ScanMethod icon={FileUp} name="Upload PDF" sub="Invoice or e-bill" />
          <ScanMethod icon={MailPlus} name="Gmail import" sub="Auto-detect invoices" />
          <ScanMethod icon={QrCode} name="Scan QR label" sub="Open item instantly" />
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-border bg-surface-2 p-3.5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[13px] font-medium">38 invoices found in Gmail</h3>
          <button className="rounded-full bg-[oklch(0.95_0.03_255)] px-2.5 py-0.5 text-[11px] font-medium text-[oklch(0.36_0.13_255)]">
            Import all
          </button>
        </div>
        <ul className="divide-y divide-border">
          {GMAIL_SOURCES.map((s) => (
            <li key={s.name} className="flex items-center gap-2.5 py-2.5">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-surface-1 text-[10px] font-semibold text-text-muted">
                {s.logo}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium">{s.name}</div>
                <div className="truncate text-[10px] text-text-muted">{s.latest}</div>
              </div>
              <div className="text-[12px] font-medium text-[oklch(0.36_0.13_255)]">{s.count}</div>
            </li>
          ))}
        </ul>
      </div>

      <SectionTitle>AI valuation — current market value</SectionTitle>
      <div className="space-y-2">
        {ITEMS.slice(0, 3).map((item) => {
          const Icon = item.icon;
          const pct = Math.round((item.priceNow / item.pricePaid) * 100);
          const dep = Math.round(100 - pct);
          const fill =
            item.depreciationTone === "ok"
              ? "bg-ok"
              : item.depreciationTone === "warn"
              ? "bg-warn"
              : "bg-bad";
          return (
            <div
              key={item.id}
              className="flex gap-3 rounded-xl border border-border bg-surface-2 p-3.5"
            >
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${ICON_TONE[item.iconTone]}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium">{item.name}</div>
                <div className="text-[11px] text-text-muted">
                  Bought {inr(item.pricePaid)} · {item.purchasedAt}
                </div>
                <div className="mt-2">
                  <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-surface-1">
                    <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="font-medium text-[oklch(0.36_0.13_255)]">
                      {inr(item.priceNow)} today
                    </span>
                    <span className="text-bad">−{dep}% depreciation</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ScanMethod({ icon: Icon, name, sub }: { icon: LucideIcon; name: string; sub: string }) {
  return (
    <button
      type="button"
      className="rounded-xl border border-border bg-surface-1 p-3 text-center transition-colors hover:border-accent-blue hover:bg-surface-2"
    >
      <Icon className="mx-auto mb-1.5 h-5 w-5 text-text-secondary" />
      <div className="text-[12px] font-medium">{name}</div>
      <div className="mt-0.5 text-[10px] text-text-muted">{sub}</div>
    </button>
  );
}

/* ------------------------- LOCKER ------------------------- */
function Locker() {
  const lockerIcons: Record<string, LucideIcon> = {
    Invoices: FileCheck,
    Warranties: ShieldCheck,
    Insurance: ShieldHalf,
    Manuals: BookOpen,
    "Property docs": HomeIcon,
    "Personal IDs": IdCard,
    "Vehicle docs": Car,
    "Medical records": HeartPulse,
  };

  return (
    <>
      <div className="mb-3.5 flex items-center gap-2 rounded-xl border border-[oklch(0.78_0.12_158)] bg-[oklch(0.95_0.05_158)] px-3 py-2.5">
        <Lock className="h-[18px] w-[18px] flex-shrink-0 text-[oklch(0.38_0.1_158)]" />
        <p className="text-[12px] leading-snug text-[oklch(0.38_0.1_158)]">
          All documents are AES-256 encrypted. Only you can access them.
        </p>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        {LOCKER_CATEGORIES.map((c) => {
          const Icon = lockerIcons[c.name] ?? FileText;
          return (
            <button
              key={c.name}
              type="button"
              className="rounded-xl border border-border bg-surface-2 p-3 text-left transition-colors hover:border-accent-blue"
            >
              <Icon className={`mb-1.5 h-[22px] w-[22px] ${LOCKER_TONE[c.tone]}`} />
              <div className="text-[12px] font-medium">{c.name}</div>
              <div className="mt-0.5 text-[10px] text-text-muted">{c.count}</div>
              <span className="mt-1.5 inline-block rounded bg-[oklch(0.95_0.05_158)] px-1.5 py-0.5 text-[10px] text-[oklch(0.38_0.1_158)]">
                Encrypted
              </span>
            </button>
          );
        })}
      </div>

      <SectionTitle>Home timeline — June 2024</SectionTitle>
      <ol className="space-y-0">
        {TIMELINE.map((t, i) => {
          const dotColor =
            t.dot === "ok" ? "bg-ok" : t.dot === "warn" ? "bg-warn" : "bg-bad";
          return (
            <li key={i} className="flex gap-3 border-b border-border py-3 last:border-none">
              <div className="flex w-3 flex-col items-center">
                <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                {i < TIMELINE.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium">{t.title}</div>
                <div className="mt-0.5 text-[11px] text-text-muted">{t.sub}</div>
                {t.state === "upcoming" ? (
                  <span className="mt-1 inline-block rounded bg-[oklch(0.95_0.06_75)] px-1.5 py-0.5 text-[11px] font-medium text-[oklch(0.4_0.1_70)]">
                    {t.when}
                  </span>
                ) : (
                  <span className="mt-1 inline-block text-[11px] text-text-muted">Completed</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}

/* ------------------------- AI ASSISTANT ------------------------- */
type ChatMsg = { from: "user" | "ai"; text: string };

function AIAssistant() {
  const [input, setInput] = useState("");
  const [log, setLog] = useState<ChatMsg[]>([
    {
      from: "ai",
      text: "Namaste! Ask me anything about your home — warranties, values, service schedules, or documents. What would you like to know?",
    },
  ]);

  const send = (text: string) => {
    const msg = text.trim();
    if (!msg) return;
    const reply =
      AI_REPLIES[msg.toLowerCase()] ??
      `I found relevant items matching "${msg}" in your home inventory. Tap any item to see the full lifecycle — invoice, warranty, service history, and insurance status.`;
    setLog((l) => [...l, { from: "user", text: msg }, { from: "ai", text: reply }]);
    setInput("");
  };

  return (
    <div className="flex h-[calc(100vh-180px)] flex-col">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => send(s)}
            className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] text-text-secondary transition-colors hover:border-accent-blue hover:text-[oklch(0.32_0.13_255)]"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto pb-2">
        {log.map((m, i) =>
          m.from === "user" ? (
            <div
              key={i}
              className="ml-auto max-w-[85%] rounded-[12px_12px_3px_12px] bg-brand px-3 py-2.5 text-[13px] leading-relaxed text-brand-foreground"
            >
              {m.text}
            </div>
          ) : (
            <div
              key={i}
              className="mr-auto max-w-[85%] rounded-[12px_12px_12px_3px] border border-border bg-surface-2 px-3 py-2.5 text-[13px] leading-relaxed"
            >
              <div className="mb-1 flex items-center gap-1 text-[10px] text-text-muted">
                <Sparkles className="h-3 w-3 text-accent-blue" />
                GharLog AI
              </div>
              <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: renderMd(m.text) }} />
            </div>
          ),
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 pt-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-[13px] outline-none focus:border-accent-blue"
          placeholder="Ask about your home…"
        />
        <button
          type="submit"
          aria-label="Send"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function renderMd(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");
}

/* ------------------------- INSURANCE ------------------------- */
function Insurance() {
  return (
    <>
      <section className="mb-3 rounded-2xl bg-brand p-4 text-brand-foreground">
        <h3 className="mb-3 text-[14px] font-medium opacity-90">
          Home value vs insurance coverage
        </h3>
        <div className="mb-3.5 space-y-2">
          <InsBar label="Total value" pct={100} value="₹8,99,000" fill="bg-accent-blue" />
          <InsBar label="Current cover" pct={44} value="₹4,00,000" fill="bg-ok" />
        </div>
        <div className="mb-3 flex items-center justify-between rounded-xl border border-bad/40 bg-bad/20 px-3 py-2.5">
          <div>
            <div className="text-[11px] opacity-70">Coverage gap</div>
            <div className="mt-0.5 text-[10px] text-white/45">You're underinsured by</div>
          </div>
          <div className="text-[16px] font-medium text-[oklch(0.82_0.13_25)]">₹4,99,000</div>
        </div>
        <p className="text-[11px] leading-relaxed text-white/55">
          GharLog verified your asset register. Sharing this with your insurer can increase coverage
          and often reduces premiums by 10–15% due to documented proof.
        </p>
      </section>

      <SectionTitle>Get quotes — insurance partners</SectionTitle>
      <div className="space-y-2">
        {PARTNERS.map((p) => (
          <div
            key={p.name}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-2 px-3 py-2.5"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-1 text-center text-[9px] font-semibold leading-tight text-text-muted">
              {p.logo}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium">{p.name}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-text-muted">{p.desc}</div>
            </div>
            <button className="flex-shrink-0 text-[12px] font-medium text-[oklch(0.48_0.15_255)]">
              Get quote
            </button>
          </div>
        ))}
      </div>

      <SectionTitle>Plans</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        <PlanCard
          name="Free"
          price="₹0"
          per="forever"
          features={[
            { ok: true, label: "10 items" },
            { ok: true, label: "Manual entry" },
            { ok: true, label: "Basic alerts" },
            { ok: false, label: "AI scanner" },
            { ok: false, label: "Insurance reports" },
          ]}
          cta="Current plan"
        />
        <PlanCard
          name="Pro"
          price="₹999"
          per="per year · ₹83/mo"
          recommended
          features={[
            { ok: true, label: "Unlimited items" },
            { ok: true, label: "AI scanner" },
            { ok: true, label: "Gmail import" },
            { ok: true, label: "Insurance reports" },
            { ok: true, label: "Family sharing" },
            { ok: true, label: "QR labels" },
            { ok: true, label: "AI assistant" },
          ]}
          cta="Upgrade to Pro"
        />
        <PlanCard
          name="Business"
          price="₹3,999"
          per="per year"
          features={[
            { ok: true, label: "Everything in Pro" },
            { ok: true, label: "Multiple locations" },
            { ok: true, label: "GST reports" },
            { ok: true, label: "Team access" },
            { ok: true, label: "Bulk QR labels" },
            { ok: true, label: "Priority support" },
          ]}
          cta="For offices"
        />
      </div>
    </>
  );
}

function InsBar({
  label,
  pct,
  value,
  fill,
}: {
  label: string;
  pct: number;
  value: string;
  fill: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="min-w-[80px] text-[11px] opacity-70">{label}</div>
      <div className="h-2 flex-1 rounded-full bg-white/10">
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="min-w-[60px] text-right text-[11px] font-medium tabular-nums">{value}</div>
    </div>
  );
}

function PlanCard({
  name,
  price,
  per,
  features,
  cta,
  recommended,
}: {
  name: string;
  price: string;
  per: string;
  features: { ok: boolean; label: string }[];
  cta: string;
  recommended?: boolean;
}) {
  return (
    <div
      className={`rounded-xl bg-surface-2 p-3 ${
        recommended ? "border-2 border-accent-blue" : "border border-border"
      }`}
    >
      {recommended && (
        <div className="mb-1.5 inline-block rounded bg-[oklch(0.95_0.03_255)] px-1.5 py-0.5 text-[10px] font-medium text-[oklch(0.36_0.13_255)]">
          Most popular
        </div>
      )}
      <div className="text-[12px] font-medium">{name}</div>
      <div className="mt-1 text-[20px] font-medium tabular-nums leading-none">{price}</div>
      <div className="mt-0.5 mb-2.5 text-[10px] text-text-muted">{per}</div>
      <ul className="space-y-0.5 text-[11px] leading-snug text-text-secondary">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-1">
            {f.ok ? (
              <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-ok" />
            ) : (
              <X className="mt-0.5 h-3 w-3 flex-shrink-0 text-bad" />
            )}
            <span>{f.label}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={`mt-2.5 w-full rounded-lg border px-2 py-2 text-[12px] font-medium ${
          recommended
            ? "border-brand bg-brand text-brand-foreground"
            : "border-border bg-surface-1 text-text-primary"
        }`}
      >
        {cta}
      </button>
    </div>
  );
}
