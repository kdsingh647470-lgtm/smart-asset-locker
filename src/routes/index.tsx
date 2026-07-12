import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { createItem, deleteItem, listItems, updateItem, type DbItem, type NewItem } from "@/lib/items-api";
import {
  listDocuments,
  uploadDocument,
  getDocSignedUrl,
  deleteDocument,
  type DocType,
  type ItemDocument,
} from "@/lib/documents-api";
import {
  listMaintTasks,
  createMaintTask,
  updateMaintTask,
  deleteMaintTask,
  seedDefaultTasks,
  isDoneThisCycle,
  type MaintTask,
  type MaintTone,
  type Recurrence,
} from "@/lib/maintenance-api";
import { buildReminders } from "@/lib/reminders";
import { getMyPlan, redeemProCode } from "@/lib/plan.functions";
import { createRazorpayProOrder } from "@/lib/razorpay.functions";
import { listMyNotifications, markAllRead, type AppNotification } from "@/lib/notifications.functions";
import { toast } from "sonner";
import { EmailVerifyBanner } from "@/components/EmailVerifyBanner";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { APP_VERSION, APP_BUILD } from "@/lib/app-version";
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
  Pencil,
  Users,
  Copy,
  Printer,
  FileDown,
  ChevronDown,
  CalendarDays,

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
import { hasSeenOnboarding } from "@/lib/onboarding-storage";
import {
  createHousehold,
  deleteHousehold,
  inviteLink,
  listInvites,
  listMembers,
  listMyHouseholds,
  removeMember,
  renameHousehold,
  revokeInvite,
  updateMemberRole,
  type HouseholdRole,
} from "@/lib/household-api";
import { createHouseholdInvite } from "@/lib/invite.functions";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { ThemeToggle } from "@/components/ThemeToggle";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GharLog — India's Digital Home Asset Manager" },
      {
        name: "description",
        content:
          "Track every appliance, warranty, document and insurance for your home in one encrypted vault.",
      },
      { property: "og:title", content: "GharLog — India's Digital Home Asset Manager" },
      {
        property: "og:description",
        content:
          "Track every appliance, warranty, document and insurance for your home in one encrypted vault.",
      },
      { property: "og:url", content: "https://gharlog.nesake.com/" },
    ],
    links: [{ rel: "canonical", href: "https://gharlog.nesake.com/" }],
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
  const [notifOpen, setNotifOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const itemsQ = useQuery({ queryKey: ["items"], queryFn: listItems, enabled: !!session });
  const notifQ = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listMyNotifications(),
    enabled: !!session,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!loading && session && !itemsQ.isLoading && (itemsQ.data ?? []).length === 0 && !hasSeenOnboarding()) {
      navigate({ to: "/onboarding" });
    }
  }, [loading, session, itemsQ.isLoading, itemsQ.data, navigate]);

  // Foreground push: refresh panel + toast when an FCM message lands while open.
  useEffect(() => {
    if (!session) return;
    let off = () => {};
    (async () => {
      const { listenForegroundMessages } = await import("@/lib/push");
      off = listenForegroundMessages((p) => {
        toast(p.title ?? "Reminder", { description: p.body });
        notifQ.refetch();
      });
    })();
    return () => off();
  }, [session]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-0 text-sm text-text-muted">
        Loading…
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" />;

  const unread = (notifQ.data ?? []).filter((n) => !n.read_at).length;


  return (
    <div className="min-h-screen bg-surface-0 text-text-primary">
      <div className="mx-auto flex min-h-screen w-full max-w-[1280px] items-stretch gap-4 px-0 lg:px-4">
        <AdRail side="left" />
        <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-surface-0 shadow-sm md:my-4 md:min-h-[calc(100vh-2rem)] md:rounded-2xl md:overflow-hidden">
          <Header
            onHome={() => setTab("dash")}
            onPro={() => setTab("ins")}
            onNotify={() => setNotifOpen(true)}
            unread={unread}
          />
          <TabBar tab={tab} setTab={setTab} />
          <EmailVerifyBanner />
          <AdBanner />
          <main
            className="flex-1 px-4 pb-24 pt-4"
            onTouchStart={(e) => {
              touchStartX.current = e.changedTouches[0].screenX;
            }}
            onTouchEnd={(e) => {
              if (touchStartX.current == null) return;
              const diff = touchStartX.current - e.changedTouches[0].screenX;
              const threshold = 50;
              const idx = TABS.findIndex((t) => t.key === tab);
              if (diff > threshold && idx < TABS.length - 1) {
                setTab(TABS[idx + 1].key);
              } else if (diff < -threshold && idx > 0) {
                setTab(TABS[idx - 1].key);
              }
              touchStartX.current = null;
            }}
          >
            {tab === "dash" && <Dashboard setTab={setTab} />}
            {tab === "inv" && <Inventory setTab={setTab} />}
            {tab === "scan" && <Scan />}
            {tab === "locker" && <Locker setTab={setTab} />}
            {tab === "ai" && <AIAssistant setTab={setTab} />}
            {tab === "ins" && <Insurance setTab={setTab} />}
          </main>
          {notifOpen && (
            <NotificationsSheet
              notifs={notifQ.data ?? []}
              onClose={() => setNotifOpen(false)}
              onRefresh={() => notifQ.refetch()}
              onJump={(tab) => {
                setNotifOpen(false);
                setTab(tab);
              }}
            />
          )}
        </div>
        <AdRail side="right" />
      </div>
      <PwaInstallPrompt />
    </div>
  );
}


function Header({
  onHome,
  onPro,
  onNotify,
  unread,
}: {
  onHome: () => void;
  onPro: () => void;
  onNotify: () => void;
  unread: number;
}) {
  const planQ = useQuery({ queryKey: ["my-plan"], queryFn: () => getMyPlan() });
  const isPro = planQ.data?.plan === "pro";
  const { session } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const user = session?.user;
  const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string; avatar_url?: string; picture?: string };
  const displayName = meta.full_name ?? meta.name ?? user?.email?.split("@")[0] ?? "You";
  const avatarUrl = meta.avatar_url ?? meta.picture;
  const initials = displayName
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex items-center justify-between bg-brand px-4 py-3 text-brand-foreground">
      <button
        type="button"
        onClick={onHome}
        aria-label="Go to home"
        className="flex items-center gap-2.5 rounded-lg -mx-1 px-1 py-0.5 transition hover:bg-white/5 active:bg-white/10"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-blue">
          <HomeIcon className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <div className="text-left leading-tight">
          <div className="text-[17px] font-medium tracking-tight">GharLog</div>
          <div className="text-[10px] text-white/55">India's Digital Home Asset Manager</div>
        </div>
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPro}
          aria-label={isPro ? "Pro plan active" : "Upgrade to Pro"}
          title={isPro ? "Pro active" : "Upgrade to Pro"}
          className="flex items-center gap-1 rounded-full bg-[oklch(0.62_0.13_290)] px-2.5 py-0.5 text-[11px] font-medium text-white transition active:scale-95 hover:opacity-90"
        >
          <Crown className="h-3 w-3" />
          Pro
        </button>
        <button
          type="button"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          onClick={onNotify}
          className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition active:scale-95 hover:bg-white/20"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
        <button
          type="button"
          aria-label="Open profile"
          title={displayName}
          onClick={() => setProfileOpen(true)}
          className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/15 text-[11px] font-semibold ring-1 ring-white/20 transition active:scale-95 hover:bg-white/25"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span>{initials || "U"}</span>
          )}
        </button>
      </div>
      {profileOpen && (
        <ProfileSheet
          name={displayName}
          email={user?.email ?? ""}
          avatarUrl={avatarUrl}
          initials={initials}
          isPro={isPro}
          provider={(user?.app_metadata as { provider?: string } | undefined)?.provider}
          createdAt={user?.created_at}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </header>
  );
}

function ProfileSheet({
  name,
  email,
  avatarUrl,
  initials,
  isPro,
  provider,
  createdAt,
  onClose,
}: {
  name: string;
  email: string;
  avatarUrl?: string;
  initials: string;
  isPro: boolean;
  provider?: string;
  createdAt?: string;
  onClose: () => void;
}) {
  const [familyOpen, setFamilyOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const itemsQ = useQuery({ queryKey: ["items"], queryFn: listItems });
  const joined = createdAt ? new Date(createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-[480px] rounded-t-2xl bg-surface-0 p-5 text-text-primary shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-brand/10 text-lg font-semibold text-brand">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span>{initials || "U"}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold">{name}</div>
            <div className="truncate text-xs text-text-muted">{email}</div>
          </div>
          {isPro && (
            <span className="flex items-center gap-1 rounded-full bg-[oklch(0.62_0.13_290)] px-2 py-0.5 text-[10px] font-medium text-white">
              <Crown className="h-3 w-3" /> Pro
            </span>
          )}
        </div>

        <dl className="space-y-2 rounded-xl border border-border bg-surface-1 p-3 text-xs">
          <div className="flex justify-between"><dt className="text-text-muted">Plan</dt><dd className="font-medium">{isPro ? "Pro" : "Free"}</dd></div>
          {provider && (
            <div className="flex justify-between"><dt className="text-text-muted">Signed in via</dt><dd className="font-medium capitalize">{provider}</dd></div>
          )}
          {joined && (
            <div className="flex justify-between"><dt className="text-text-muted">Member since</dt><dd className="font-medium">{joined}</dd></div>
          )}
        </dl>


        <button
          type="button"
          onClick={() => setFamilyOpen(true)}
          className="mt-3 flex w-full items-center justify-between rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-left text-sm"
        >
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-brand" />
            <span className="font-medium">Family sharing</span>
          </span>
          <span className="text-[11px] text-text-muted">Invite &amp; manage</span>
        </button>

        <button
          type="button"
          onClick={() => setCalendarOpen(true)}
          className="mt-2 flex w-full items-center justify-between rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-left text-sm"
        >
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-brand" />
            <span className="font-medium">Maintenance calendar</span>
          </span>
          <span className="text-[11px] text-text-muted">Yearly plan</span>
        </button>

        <button
          type="button"
          onClick={() => setTimelineOpen(true)}
          className="mt-2 flex w-full items-center justify-between rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-left text-sm"
        >
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand" />
            <span className="font-medium">Home timeline</span>
          </span>
          <span className="text-[11px] text-text-muted">Recent &amp; upcoming</span>
        </button>

        <div className="mt-3">
          <p className="mb-1 text-[11px] font-medium text-text-secondary">Appearance</p>
          <ThemeToggle />
        </div>




        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-text-muted">
          <Link to="/support" onClick={onClose} className="hover:text-text-secondary">Support</Link>
          <span aria-hidden>·</span>
          <Link to="/privacy" onClick={onClose} className="hover:text-text-secondary">Privacy</Link>
          <span aria-hidden>·</span>
          <Link to="/terms" onClick={onClose} className="hover:text-text-secondary">Terms</Link>
          <span aria-hidden>·</span>
          <Link to="/data-safety" onClick={onClose} className="hover:text-text-secondary">Data safety</Link>
          <span aria-hidden>·</span>
          <Link to="/account/delete" onClick={onClose} className="text-[oklch(0.55_0.2_25)] hover:underline">Delete account</Link>
        </div>
        <p className="mt-2 text-center text-[10px] text-text-muted">
          GharLog v{APP_VERSION} · build {APP_BUILD}
        </p>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-border bg-surface-1 py-2 text-sm font-medium"
          >
            Close
          </button>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              onClose();
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand py-2 text-sm font-medium text-brand-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>
      {familyOpen && <FamilySheet onClose={() => setFamilyOpen(false)} />}
      {calendarOpen && (
        <SectionSheet title="Maintenance calendar" onClose={() => setCalendarOpen(false)}>
          <MaintenanceCalendar items={itemsQ.data ?? []} />
        </SectionSheet>
      )}
      {timelineOpen && (
        <SectionSheet title="Home timeline" onClose={() => setTimelineOpen(false)}>
          <HomeTimeline />
        </SectionSheet>
      )}
    </div>
  );
}


function SectionSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-[480px] flex-col rounded-t-2xl bg-surface-0 text-text-primary shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs text-text-muted hover:bg-surface-1"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function HomeTimeline() {
  return (
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
  );
}




function NotificationsSheet({
  notifs,
  onClose,
  onRefresh,
  onJump,
}: {
  notifs: AppNotification[];
  onClose: () => void;
  onRefresh: () => void;
  onJump: (tab: TabKey) => void;
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [pushState, setPushState] = useState<"idle" | "asking" | "on" | "denied" | "unsupported">(
    typeof Notification !== "undefined" && Notification.permission === "granted" ? "on" : "idle",
  );

  useEffect(() => {
    // Mark all as read when the sheet opens.
    (async () => {
      try {
        await markAllRead();
        qc.invalidateQueries({ queryKey: ["notifications"] });
      } catch {
        /* ignore */
      }
    })();
  }, [qc]);

  async function enablePush() {
    setBusy(true);
    setPushState("asking");
    try {
      const { enablePushNotifications } = await import("@/lib/push");
      const res = await enablePushNotifications();
      if (res.status === "ok") {
        setPushState("on");
        toast.success("Notifications on", { description: "We'll alert you 30, 7 and 1 days before each renewal." });
      } else if (res.status === "denied") {
        setPushState("denied");
        toast.error("Permission denied", { description: "Enable notifications in your browser settings to receive alerts." });
      } else {
        setPushState("unsupported");
        toast.error("Push unavailable", { description: res.reason });
      }
    } catch (e) {
      setPushState("unsupported");
      toast.error("Couldn't enable push", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-2 pb-2" onClick={onClose}>
      <div
        className="w-full max-w-[480px] rounded-t-2xl bg-surface-1 shadow-xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h3 className="text-[15px] font-medium">Notifications</h3>
            <p className="text-[11px] text-text-muted">{notifs.length} recent · push {pushState === "on" ? "on" : "off"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full bg-surface-2 px-3 py-1 text-[12px]"
          >
            Done
          </button>
        </div>

        {pushState !== "on" && (
          <div className="border-b border-border bg-accent-blue/5 px-4 py-3">
            <div className="text-[12.5px] font-medium">Get reminders on your phone</div>
            <p className="text-[11px] text-text-muted mt-0.5">
              We'll ping you 30, 7 and 1 days before each warranty or insurance renewal — even when GharLog is closed.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={enablePush}
              className="mt-2 rounded-full bg-brand px-3 py-1.5 text-[12px] font-medium text-brand-foreground disabled:opacity-60"
            >
              {busy ? "Asking…" : "Turn on push"}
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {notifs.length === 0 ? (
            <div className="p-6 text-center text-[12px] text-text-muted">
              You're all caught up. Reminders will appear here as renewals approach.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notifs.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onJump("inv")}
                    className="block w-full px-4 py-3 text-left transition hover:bg-surface-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[13px] font-medium">{n.title}</div>
                      {!n.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />}
                    </div>
                    <div className="text-[11.5px] text-text-muted mt-0.5">{n.body}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-border px-4 py-2 text-right">
          <button type="button" onClick={onRefresh} className="text-[11px] text-text-muted">
            Refresh
          </button>
        </div>
      </div>
    </div>
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

/* ------------------------- DEMO BANNER ------------------------- */
function DemoBanner({ setTab }: { setTab: (t: TabKey) => void }) {
  return (
    <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-3 border-b border-accent-blue/40 bg-[oklch(0.96_0.04_255)] px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand text-[14px] text-brand-foreground">
          👋
        </span>
        <div className="min-w-0 flex-1 text-[11px] leading-snug text-[oklch(0.32_0.13_255)]">
          You're viewing <span className="font-semibold">sample data</span>. Add your first item to make this your home.
        </div>
        <button
          type="button"
          onClick={() => setTab("inv")}
          className="flex-shrink-0 rounded-full bg-brand px-2.5 py-1 text-[11px] font-medium text-brand-foreground"
        >
          + Add
        </button>
      </div>
    </div>
  );
}

function SampleChip() {
  return (
    <span className="rounded-full bg-[oklch(0.95_0.03_255)] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-[oklch(0.36_0.13_255)]">
      Sample
    </span>
  );
}

/* ------------------------- DASHBOARD ------------------------- */
function Dashboard({ setTab }: { setTab: (t: TabKey) => void }) {
  const itemsQ = useQuery({ queryKey: ["items"], queryFn: listItems });
  const items = itemsQ.data ?? [];
  const isDemo = items.length === 0;
  const docsQ = useQuery({ queryKey: ["documents"], queryFn: listDocuments });
  const tasksQ = useQuery({ queryKey: ["maint-tasks"], queryFn: listMaintTasks });

  const reminders = buildReminders(items);
  const attentionCount = reminders.length;
  const fallbackAlerts = ALERTS;
  return (
    <>
      <OnboardingChecklist
        hasItems={items.length > 0}
        hasDocuments={(docsQ.data ?? []).length > 0}
        hasTasks={(tasksQ.data ?? []).length > 0}
        onAdd={() => setTab("inv")}
        onScan={() => setTab("scan")}
        onLocker={() => setTab("locker")}
        onTasks={() => setTab("ins")}
      />
      {isDemo && <DemoBanner setTab={setTab} />}

      {isDemo ? (
        <section className="mb-3.5 rounded-2xl bg-brand p-5 text-brand-foreground">
          <p className="text-[13px] opacity-70">Good evening</p>
          <h1 className="mb-3.5 text-[20px] font-medium">Kedar's Home</h1>
          <div className="mb-3.5 grid grid-cols-2 gap-2">
            <StatChip icon={HomeIcon} label="Home value" value="₹8,42,000" sub="34 items tracked" />
            <StatChip
              icon={AlertTriangle}
              label="Needs attention"
              value="3 items"
              sub="renewals due soon"
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
      ) : (
        <section className="mb-3.5 rounded-2xl bg-brand p-5 text-brand-foreground">
          <p className="text-[13px] opacity-70">Welcome back</p>
          <h1 className="mb-3.5 text-[20px] font-medium">Your Home</h1>
          <div className="grid grid-cols-2 gap-2">
            <StatChip
              icon={HomeIcon}
              label="Home value"
              value={`₹${items.reduce((s, i) => s + (i.price_now ?? i.price_paid ?? 0), 0).toLocaleString("en-IN")}`}
              sub={`${items.length} item${items.length === 1 ? "" : "s"} tracked`}
            />
            <StatChip
              icon={AlertTriangle}
              label="Needs attention"
              value={attentionCount > 0 ? `${attentionCount} item${attentionCount === 1 ? "" : "s"}` : "All good"}
              sub={attentionCount > 0 ? "renewals due soon" : "no expiries in 30 days"}
              valueTone={attentionCount > 0 ? "bad" : "ok"}
            />
          </div>
        </section>
      )}


      <SectionTitle>
        {reminders.length > 0 ? "Renewal reminders" : "Today"}
      </SectionTitle>
      <div className="space-y-2.5">
        {reminders.length > 0
          ? reminders.map((r) => (
              <AlertBanner key={r.id} tone={r.tone} title={r.title} body={r.body} />
            ))
          : fallbackAlerts.map((a, i) => <AlertBanner key={i} {...a} />)}
      </div>
      {reminders.length > 0 && (
        <p className="mt-2 text-[11px] text-text-muted">
          Auto-tracked from your inventory · alerts at 30, 7 and 1 days before expiry
        </p>
      )}

      <ServiceMarketplace items={itemsQ.data ?? []} />



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

/* --------------------- MAINTENANCE CALENDAR --------------------- */
type DefaultTask = { label: string; tone: MaintTone };

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DEFAULT_SCHEDULE: Record<number, DefaultTask[]> = {
  0: [{ label: "AC Service", tone: "blue" }],
  1: [{ label: "RO Filter", tone: "teal" }],
  2: [{ label: "Car Insurance", tone: "purple" }],
  3: [{ label: "Pest Control", tone: "amber" }],
  4: [{ label: "AC Deep Clean", tone: "blue" }],
  5: [{ label: "Roof / Leak Check", tone: "red" }],
  6: [{ label: "Geyser Service", tone: "amber" }],
  7: [{ label: "Chimney Clean", tone: "teal" }],
  8: [{ label: "Inverter Battery", tone: "purple" }],
  9: [{ label: "Home Insurance", tone: "red" }],
  10: [{ label: "Heater Service", tone: "amber" }],
  11: [{ label: "Annual Deep Clean", tone: "green" }],
};

const TONE_STYLES: Record<MaintTone, string> = {
  blue: "bg-[oklch(0.94_0.04_255)] text-[oklch(0.36_0.13_255)]",
  teal: "bg-[oklch(0.94_0.05_165)] text-[oklch(0.38_0.1_165)]",
  purple: "bg-[oklch(0.94_0.05_290)] text-[oklch(0.4_0.13_290)]",
  amber: "bg-[oklch(0.95_0.06_85)] text-[oklch(0.42_0.1_70)]",
  red: "bg-[oklch(0.95_0.04_25)] text-[oklch(0.45_0.15_25)]",
  green: "bg-[oklch(0.94_0.07_158)] text-[oklch(0.38_0.15_158)]",
};


function MaintenanceCalendar({ items }: { items: DbItem[] }) {
  const { user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();
  const tasksQ = useQuery({
    queryKey: ["maintenance"],
    queryFn: listMaintTasks,
    enabled: !!userId,
  });
  const [openMonth, setOpenMonth] = useState<number | null>(null);
  const seededRef = useRef(false);

  // One-time seed of default schedule for new users.
  useEffect(() => {
    if (!userId || tasksQ.isLoading || seededRef.current) return;
    if ((tasksQ.data ?? []).length > 0) return;
    if (typeof window !== "undefined" && localStorage.getItem("ghar.maint.seeded")) return;
    seededRef.current = true;
    const defaults = Object.entries(DEFAULT_SCHEDULE).flatMap(([m, list]) =>
      list.map((t) => ({ month: Number(m), label: t.label, tone: t.tone })),
    );
    seedDefaultTasks(userId, defaults)
      .then(() => {
        if (typeof window !== "undefined") localStorage.setItem("ghar.maint.seeded", "1");
        qc.invalidateQueries({ queryKey: ["maintenance"] });
      })
      .catch(() => {
        seededRef.current = false;
      });
  }, [userId, tasksQ.data, tasksQ.isLoading, qc]);

  const autoTasks = useMemo(() => buildAutoTasks(items), [items]);
  const tasksByMonth = useMemo(() => {
    const map: Record<number, DisplayTask[]> = {};
    for (let i = 0; i < 12; i++) map[i] = [];
    for (const t of tasksQ.data ?? []) {
      const m = t.due_date ? new Date(t.due_date + "T00:00:00").getMonth() : t.month;
      if (!Number.isNaN(m)) map[m].push({ kind: "db", task: t });
    }
    for (const a of autoTasks) {
      // Avoid duplicates if a DB task already covers the same linked item label.
      const dup = (tasksQ.data ?? []).some(
        (t) => t.linked_item_id === a.linked_item_id && t.label === a.label,
      );
      if (!dup) map[a.month].push({ kind: "auto", task: a });
    }
    return map;
  }, [tasksQ.data, autoTasks]);

  const currentMonth = new Date().getMonth();

  return (
    <>
      <SectionTitle>Maintenance calendar</SectionTitle>
      <p className="-mt-1 mb-2 text-[11px] text-text-muted">
        Tap any month to add, edit or mark tasks done. Auto-built from inventory + seasonal defaults.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {MONTHS.map((m, idx) => {
          const tasks = tasksByMonth[idx];
          const isNow = idx === currentMonth;
          return (
            <button
              type="button"
              key={m}
              onClick={() => setOpenMonth(idx)}
              className={`rounded-xl border p-2.5 text-left transition active:scale-[0.98] ${
                isNow ? "border-brand bg-brand/5" : "border-border bg-surface-2"
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider ${
                    isNow ? "text-brand" : "text-text-secondary"
                  }`}
                >
                  {m}
                </span>
                {isNow && (
                  <span className="rounded-full bg-brand px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wider text-brand-foreground">
                    Now
                  </span>
                )}
              </div>
              {tasks.length === 0 ? (
                <p className="text-[10px] text-text-muted">+ Add task</p>
              ) : (
                <div className="space-y-1">
                  {tasks.slice(0, 3).map((t, i) => {
                    const done = t.kind === "db" && isDoneThisCycle(t.task);
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium ${TONE_STYLES[t.kind === "db" ? t.task.tone : t.task.tone]} ${done ? "opacity-50 line-through" : ""}`}
                        title={t.kind === "db" ? t.task.label : t.task.label}
                      >
                        {done && <Check className="h-2.5 w-2.5 flex-shrink-0" />}
                        <span className="truncate">{t.kind === "db" ? t.task.label : t.task.label}</span>
                      </div>
                    );
                  })}
                  {tasks.length > 3 && (
                    <div className="text-[9px] text-text-muted">+{tasks.length - 3} more</div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
      {openMonth !== null && userId && (
        <MonthTasksSheet
          month={openMonth}
          tasks={tasksByMonth[openMonth]}
          items={items}
          userId={userId}
          onClose={() => setOpenMonth(null)}
        />
      )}
    </>
  );
}

type DisplayTask =
  | { kind: "db"; task: MaintTask }
  | { kind: "auto"; task: { month: number; label: string; tone: MaintTone; linked_item_id: string | null; brand: string | null; itemName: string } };

function buildAutoTasks(items: DbItem[]) {
  const out: { month: number; label: string; tone: MaintTone; linked_item_id: string; brand: string | null; itemName: string }[] = [];
  for (const it of items) {
    const dates: { d: string | null; tone: MaintTone; suffix: string }[] = [
      { d: it.warranty_until, tone: "red", suffix: "warranty" },
      { d: it.amc_until, tone: "amber", suffix: "AMC" },
      { d: it.insured_until, tone: "purple", suffix: "insurance" },
    ];
    for (const { d, tone, suffix } of dates) {
      if (!d) continue;
      const m = new Date(d + "T00:00:00").getMonth();
      if (Number.isNaN(m)) continue;
      out.push({
        month: m,
        label: `${it.name} ${suffix}`,
        tone,
        linked_item_id: it.id,
        brand: it.brand,
        itemName: it.name,
      });
    }
  }
  return out;
}

function MonthTasksSheet({
  month,
  tasks,
  items,
  userId,
  onClose,
}: {
  month: number;
  tasks: DisplayTask[];
  items: DbItem[];
  userId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<MaintTask | null>(null);
  const [adding, setAdding] = useState(false);

  const toggleDone = useMutation({
    mutationFn: (t: MaintTask) =>
      updateMaintTask(t.id, { done_at: isDoneThisCycle(t) ? null : new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance"] }),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteMaintTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance"] }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-[480px] rounded-t-2xl bg-surface-0 p-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">{MONTHS[month]} — maintenance</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-surface-2">
            <X className="h-4 w-4" />
          </button>
        </div>

        {tasks.length === 0 && (
          <p className="mb-3 text-[12px] text-text-muted">No tasks yet. Add your first one below.</p>
        )}

        <div className="space-y-2">
          {tasks.map((t, i) => {
            if (t.kind === "auto") {
              return (
                <div
                  key={`auto-${i}`}
                  className="flex items-start justify-between gap-2 rounded-lg border border-border bg-surface-2 p-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${TONE_STYLES[t.task.tone]}`}>
                        {t.task.label}
                      </span>
                      <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-text-muted">
                        Auto
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-text-muted">From your inventory</p>
                  </div>
                </div>
              );
            }
            const done = isDoneThisCycle(t.task);
            const linked = items.find((i) => i.id === t.task.linked_item_id) ?? null;
            const partner = linked
              ? `https://www.google.com/search?q=${encodeURIComponent(`${linked.brand ?? ""} ${linked.name} service near me`)}`
              : `https://www.google.com/search?q=${encodeURIComponent(`${t.task.label} service near me`)}`;
            return (
              <div
                key={t.task.id}
                className="rounded-lg border border-border bg-surface-2 p-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className={`text-[13px] font-medium ${done ? "line-through opacity-60" : ""}`}>
                      {t.task.label}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-text-muted">
                      <span className="capitalize">{t.task.recurrence}</span>
                      {t.task.due_date && <span>· due {t.task.due_date}</span>}
                      {t.task.done_at && (
                        <span>· last done {new Date(t.task.done_at).toLocaleDateString()}</span>
                      )}
                    </div>
                    {t.task.notes && (
                      <p className="mt-1 text-[11px] text-text-secondary">{t.task.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      type="button"
                      onClick={() => toggleDone.mutate(t.task)}
                      aria-label={done ? "Mark not done" : "Mark done"}
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${done ? "bg-[oklch(0.94_0.07_158)] text-[oklch(0.38_0.13_158)]" : "bg-surface-3 text-text-secondary"}`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(t.task)}
                      aria-label="Edit"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-3 text-text-secondary"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => del.mutate(t.task.id)}
                      aria-label="Delete"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-3 text-[oklch(0.55_0.18_25)]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {t.task.vendor_name || t.task.vendor_phone ? (
                    <a
                      href={t.task.vendor_phone ? `tel:${t.task.vendor_phone.replace(/\s+/g, "")}` : undefined}
                      className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.94_0.07_158)] px-2.5 py-1 text-[10px] font-medium text-[oklch(0.32_0.13_158)]"
                    >
                      📞 {t.task.vendor_name || t.task.vendor_phone}
                    </a>
                  ) : null}
                  <a
                    href={partner}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[10px] font-medium text-brand-foreground"
                  >
                    <Wrench className="h-3 w-3" /> Book service
                  </a>
                </div>

              </div>
            );
          })}
        </div>

        {!adding && !editing && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-surface-2 py-2 text-[12px] font-medium text-text-secondary"
          >
            <Plus className="h-3.5 w-3.5" /> Add task to {MONTHS[month]}
          </button>
        )}

        {(adding || editing) && (
          <TaskForm
            month={month}
            userId={userId}
            editing={editing}
            onDone={() => {
              setAdding(false);
              setEditing(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

const TONE_CHOICES: { value: MaintTone; label: string }[] = [
  { value: "blue", label: "Blue" },
  { value: "teal", label: "Teal" },
  { value: "purple", label: "Purple" },
  { value: "amber", label: "Amber" },
  { value: "red", label: "Red" },
  { value: "green", label: "Green" },
];

function TaskForm({
  month,
  userId,
  editing,
  onDone,
}: {
  month: number;
  userId: string;
  editing: MaintTask | null;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [label, setLabel] = useState(editing?.label ?? "");
  const [tone, setTone] = useState<MaintTone>(editing?.tone ?? "blue");
  const [recurrence, setRecurrence] = useState<Recurrence>(editing?.recurrence ?? "yearly");
  const [dueDate, setDueDate] = useState(editing?.due_date ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [vendorName, setVendorName] = useState(editing?.vendor_name ?? "");
  const [vendorPhone, setVendorPhone] = useState(editing?.vendor_phone ?? "");
  const [err, setErr] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () => {
      const derivedMonth = dueDate
        ? new Date(dueDate + "T00:00:00").getMonth()
        : month;
      const payload = {
        month: derivedMonth,
        label: label.trim(),
        tone,
        recurrence,
        due_date: dueDate || null,
        notes: notes.trim() || null,
        vendor_name: vendorName.trim() || null,
        vendor_phone: vendorPhone.trim() || null,
      };

      return editing ? updateMaintTask(editing.id, payload) : createMaintTask(payload, userId);
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance"] });
      onDone();
    },
    onError: (e: unknown) => setErr(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!label.trim()) {
          setErr("Label is required");
          return;
        }
        setErr(null);
        mut.mutate();
      }}
      className="mt-3 space-y-2 rounded-lg border border-border bg-surface-1 p-3"
    >
      <div className="text-[12px] font-medium">{editing ? "Edit task" : "New task"}</div>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="e.g. AC service, RO filter change"
        className="w-full rounded-md border border-border bg-surface-0 px-2.5 py-1.5 text-[13px]"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value as MaintTone)}
          className="rounded-md border border-border bg-surface-0 px-2 py-1.5 text-[12px]"
        >
          {TONE_CHOICES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value as Recurrence)}
          className="rounded-md border border-border bg-surface-0 px-2 py-1.5 text-[12px]"
        >
          <option value="none">One-off</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
      <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
        Due date (optional) <span className="text-[10px] opacity-70">— exact day this task is due. Leave blank to just keep it in the chosen month.</span>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full rounded-md border border-border bg-surface-0 px-2.5 py-1.5 text-[12px] text-foreground"
        />
      </label>
      {dueDate && new Date(dueDate + "T00:00:00").getMonth() !== month && (
        <p className="text-[11px] text-[oklch(0.55_0.15_60)]">
          Heads up: this due date is in a different month — task will move to that month.
        </p>
      )}


      <div className="grid grid-cols-2 gap-2">
        <input
          value={vendorName}
          onChange={(e) => setVendorName(e.target.value)}
          placeholder="Vendor / technician name"
          className="rounded-md border border-border bg-surface-0 px-2.5 py-1.5 text-[12px]"
        />
        <input
          type="tel"
          inputMode="tel"
          value={vendorPhone}
          onChange={(e) => setVendorPhone(e.target.value)}
          placeholder="Phone (e.g. +91…)"
          className="rounded-md border border-border bg-surface-0 px-2.5 py-1.5 text-[12px]"
        />
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            // Contact Picker API (Chrome on Android, PWA-installed apps)
            const nav = navigator as Navigator & {
              contacts?: {
                select: (
                  props: string[],
                  opts?: { multiple?: boolean },
                ) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
              };
            };
            if (!nav.contacts?.select) {
              setErr(
                "Contact picker isn't supported in this browser. On Android, open the app in Chrome or install it as a PWA to pick from your saved contacts.",
              );
              return;
            }
            const picked = await nav.contacts.select(["name", "tel"], { multiple: false });
            const c = picked?.[0];
            if (!c) return;
            const nm = c.name?.[0]?.trim();
            const ph = c.tel?.[0]?.trim();
            if (nm && !vendorName) setVendorName(nm);
            else if (nm) setVendorName(nm);
            if (ph) setVendorPhone(ph);
            setErr(null);
          } catch (e) {
            // User cancel throws — ignore silently
            if ((e as Error)?.name !== "AbortError") {
              setErr((e as Error).message || "Couldn't open contact picker");
            }
          }
        }}
        className="self-start rounded-md border border-border bg-surface-0 px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-surface-1"
      >
        📇 Pick from phone contacts
      </button>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (last cost, parts replaced, next-time tips)"
        rows={2}
        className="w-full rounded-md border border-border bg-surface-0 px-2.5 py-1.5 text-[12px]"
      />

      {err && <p className="text-[11px] text-[oklch(0.55_0.18_25)]">{err}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={mut.isPending}
          className="flex-1 rounded-md bg-brand py-1.5 text-[12px] font-medium text-brand-foreground disabled:opacity-50"
        >
          {mut.isPending ? "Saving…" : editing ? "Save changes" : "Add task"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md border border-border px-3 py-1.5 text-[12px]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}



/* --------------------- SERVICE MARKETPLACE --------------------- */
type ServicePartner = { name: string; tag: string; url: string };

function partnersFor(brand: string | null, name: string): ServicePartner[] {
  const b = (brand ?? "").toLowerCase();
  const n = name.toLowerCase();
  const brandKey =
    ["lg", "samsung", "sony", "dell", "bosch", "ifb", "whirlpool", "haier", "voltas", "daikin"].find(
      (k) => b.includes(k) || n.includes(k),
    ) ?? null;
  const oem: ServicePartner = brandKey
    ? {
        name: `${brandKey.toUpperCase()} Service`,
        tag: "Authorised OEM",
        url: `https://www.google.com/search?q=${encodeURIComponent(`${brandKey} service center near me`)}`,
      }
    : {
        name: "Brand Service",
        tag: "Authorised OEM",
        url: `https://www.google.com/search?q=${encodeURIComponent(`${brand ?? name} service center near me`)}`,
      };
  return [
    {
      name: "Urban Company",
      tag: "Top rated",
      url: `https://www.urbancompany.com/`,
    },
    oem,
    {
      name: "Local Technician",
      tag: "Best price",
      url: `https://www.justdial.com/search?q=${encodeURIComponent(`${name} repair`)}`,
    },
  ];
}

function ServiceMarketplace({ items }: { items: DbItem[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expired = items.filter(
    (it) => it.warranty_until && new Date(it.warranty_until + "T00:00:00") < today,
  );
  if (expired.length === 0) return null;

  return (
    <>
      <SectionTitle>Service marketplace</SectionTitle>
      <p className="-mt-1 mb-2 text-[11px] text-text-muted">
        Warranty expired — book a trusted partner. GharLog earns a small commission, you pay the
        partner directly.
      </p>
      <div className="space-y-3">
        {expired.map((it) => (
          <ServiceCard key={it.id} item={it} />
        ))}
      </div>
    </>
  );
}

function ServiceCard({ item }: { item: DbItem }) {
  const partners = partnersFor(item.brand, item.name);
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-[13px] font-medium leading-tight">{item.name}</div>
          <div className="mt-0.5 text-[11px] text-text-muted">
            {item.brand ?? "—"} · {item.room}
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.96_0.04_25)] px-2 py-0.5 text-[10px] font-medium text-[oklch(0.42_0.15_25)]">
          <AlertCircle className="h-3 w-3" />
          Warranty expired
        </span>
      </div>
      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-muted">
        Recommended partners
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {partners.map((p) => (
          <a
            key={p.name}
            href={p.url}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-start gap-0.5 rounded-lg border border-border bg-surface-0 p-2 transition-colors hover:border-brand"
          >
            <span className="text-[11px] font-medium leading-tight">{p.name}</span>
            <span className="text-[9px] text-text-muted">{p.tag}</span>
          </a>
        ))}
      </div>
      <a
        href={partners[0].url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-[12px] font-medium text-brand-foreground"
      >
        <Wrench className="h-4 w-4" />
        Book now
      </a>
    </div>
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
  void setTab;

  const { user } = useAuth();
  const qc = useQueryClient();
  const [room, setRoom] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DbItem | null>(null);

  const itemsQ = useQuery({ queryKey: ["items"], queryFn: listItems });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["items"] }),
  });

  const all = itemsQ.data ?? [];
  const filtered = useMemo(
    () => (room === "all" ? all : all.filter((i) => i.room === room)),
    [room, all],
  );
  const rooms = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const it of all) counts[it.room] = (counts[it.room] ?? 0) + 1;
    const base = [{ key: "all", label: "All", count: all.length }];
    for (const r of ROOMS.filter((r) => r.key !== "all")) {
      base.push({ key: r.key, label: r.label, count: counts[r.key] ?? 0 });
    }
    return base;
  }, [all]);

  const isDemo = !itemsQ.isLoading && all.length === 0;
  const formOpen = showForm || editing !== null;

  return (
    <>
      {isDemo && <DemoBanner setTab={setTab} />}
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowForm((s) => !s);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-[12px] font-medium text-brand-foreground"
        >
          <Plus className="h-4 w-4" />
          {formOpen ? "Close" : "Add item"}
        </button>
        <span className="text-[11px] text-text-muted">
          {itemsQ.isLoading ? "Loading…" : `${all.length} saved`}
        </span>
      </div>

      {formOpen && user && (
        <AddItemForm
          userId={user.id}
          editing={editing}
          onDone={() => {
            setShowForm(false);
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["items"] });
          }}
        />
      )}


      <div className="mb-3">
        <label htmlFor="room-filter" className="sr-only">
          Filter by room
        </label>
        <select
          id="room-filter"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-[13px] font-medium text-text-primary outline-none focus:border-accent-blue"
        >
          {rooms.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label} ({r.count})
            </option>
          ))}
        </select>
      </div>

      {itemsQ.error && (
        <p className="mb-3 rounded-md bg-[oklch(0.96_0.04_25)] px-2.5 py-2 text-[11px] text-[oklch(0.42_0.15_25)]">
          {(itemsQ.error as Error).message}
        </p>
      )}

      {isDemo && (
        <>
          <div className="mb-2 flex items-center justify-between">
            <SectionTitle>Sample inventory</SectionTitle>
            <SampleChip />
          </div>
          <div className="space-y-2.5">
            {(room === "all" ? ITEMS : ITEMS.filter((i) => i.room === room)).map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </>
      )}

      <div className="space-y-2.5">
        {filtered.map((item) => (
          <DbItemCard
            key={item.id}
            item={item}
            onDelete={() => {
              if (confirm(`Delete "${item.name}"? This cannot be undone.`)) {
                delMut.mutate(item.id);
              }
            }}
            onEdit={() => {
              setEditing(item);
              setShowForm(false);
            }}
            busy={delMut.isPending}
          />
        ))}
      </div>

    </>
  );
}




function AddItemForm({
  userId,
  editing,
  onDone,
}: {
  userId: string;
  editing?: DbItem | null;
  onDone: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [brand, setBrand] = useState(editing?.brand ?? "");
  const [room, setRoom] = useState(editing?.room ?? "kitchen");
  const [price, setPrice] = useState(editing ? String(editing.price_paid) : "");
  const [purchasedAt, setPurchasedAt] = useState(editing?.purchased_at ?? "");
  const [warrantyUntil, setWarrantyUntil] = useState(editing?.warranty_until ?? "");
  const [err, setErr] = useState<string | null>(null);
  const qc = useQueryClient();


  const mut = useMutation({
    mutationFn: () => {
      const paid = Number(price) || 0;
      const payload = {
        name,
        brand: brand || undefined,
        room,
        price_paid: paid,
        price_now: paid,
        purchased_at: purchasedAt || null,
        warranty_until: warrantyUntil || null,
      };
      return editing
        ? updateItem(editing.id, payload)
        : createItem(payload, userId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      if (!editing) {
        setName("");
        setBrand("");
        setPrice("");
        setPurchasedAt("");
        setWarrantyUntil("");
      }
      onDone();
    },
    onError: (e: unknown) => setErr(e instanceof Error ? e.message : "Could not save"),
  });


  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErr(null);
        mut.mutate();
      }}
      className="mb-3 space-y-2 rounded-xl border border-border bg-surface-2 p-3"
    >
      <div className="grid grid-cols-2 gap-2">
        <input
          required
          placeholder="Item name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="col-span-2 rounded-md border border-border bg-surface-0 px-2.5 py-2 text-[12px] outline-none focus:border-brand"
        />
        <input
          placeholder="Brand"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="rounded-md border border-border bg-surface-0 px-2.5 py-2 text-[12px] outline-none focus:border-brand"
        />
        <select
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          className="rounded-md border border-border bg-surface-0 px-2.5 py-2 text-[12px] outline-none focus:border-brand"
        >
          {ROOMS.filter((r) => r.key !== "all").map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
          <option value="other">Other</option>
        </select>
        <input
          type="number"
          inputMode="decimal"
          placeholder="Price paid (₹)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="rounded-md border border-border bg-surface-0 px-2.5 py-2 text-[12px] outline-none focus:border-brand"
        />
        <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
          Purchase date <span className="text-[10px] opacity-70">(when you bought it)</span>
          <input
            type="date"
            value={purchasedAt}
            onChange={(e) => setPurchasedAt(e.target.value)}
            className="rounded-md border border-border bg-surface-0 px-2.5 py-2 text-[12px] text-foreground outline-none focus:border-brand"
          />
        </label>
        <label className="col-span-2 flex flex-col gap-1 text-[11px] text-muted-foreground">
          Warranty expiry date <span className="text-[10px] opacity-70">(last day warranty is valid — used for renewal alerts)</span>
          <input
            type="date"
            value={warrantyUntil}
            onChange={(e) => setWarrantyUntil(e.target.value)}
            className="rounded-md border border-border bg-surface-0 px-2.5 py-2 text-[12px] text-foreground outline-none focus:border-brand"
          />
        </label>

      </div>
      {err && (
        <p className="rounded-md bg-[oklch(0.96_0.04_25)] px-2.5 py-1.5 text-[11px] text-[oklch(0.42_0.15_25)]">
          {err}
        </p>
      )}
      <button
        type="submit"
        disabled={mut.isPending}
        className="w-full rounded-md bg-brand px-3 py-2 text-[12px] font-medium text-brand-foreground disabled:opacity-60"
      >
        {mut.isPending ? "Saving…" : editing ? "Update item" : "Save item"}
      </button>
    </form>
  );
}

function DbItemCard({
  item,
  onDelete,
  onEdit,
  busy,
}: {
  item: DbItem;
  onDelete: () => void;
  onEdit?: () => void;
  busy?: boolean;
}) {

  const tone = ICON_TONE[(item.icon_tone as keyof typeof ICON_TONE) ?? "blue"] ?? ICON_TONE.blue;
  const lifecycle: LifecycleStatus = item.warranty_until
    ? new Date(item.warranty_until) > new Date()
      ? "ok"
      : "bad"
    : "na";
  return (
    <article className="rounded-xl border border-border bg-surface-2 p-3">
      <div className="mb-3 flex gap-3">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Box className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium leading-tight">{item.name}</div>
          <div className="mt-0.5 truncate text-[11px] text-text-muted">
            {capitalize(item.room)}
            {item.brand ? ` · ${item.brand}` : ""}
            {item.serial ? ` · ${item.serial}` : ""}
          </div>
          {item.warranty_until && (
            <div className="mt-1.5">
              <Badge tone={lifecycle === "ok" ? "ok" : "bad"}>
                Warranty {lifecycle === "ok" ? "until" : "expired"} {item.warranty_until}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
          <div className="text-[13px] font-medium tabular-nums">{inr(Number(item.price_paid))}</div>
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                aria-label="Edit"
                className="rounded-md p-1 text-text-muted hover:text-brand"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              aria-label="Delete"
              className="rounded-md p-1 text-text-muted hover:text-bad"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </article>
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
type ScanDocType = DocType | "any";
const DOC_TYPES: { key: ScanDocType; label: string; hint: string }[] = [
  { key: "any", label: "Any", hint: "Auto-detect" },
  { key: "invoice", label: "Invoice", hint: "Bill / receipt" },
  { key: "warranty", label: "Warranty", hint: "Card / certificate" },
  { key: "insurance", label: "Insurance", hint: "Policy doc" },
  { key: "manual", label: "Manual", hint: "User guide" },
  { key: "amc", label: "AMC", hint: "Service contract" },
];

type ScanResponse = {
  docType: DocType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  partial?: boolean;
};


function Scan() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const [docType, setDocType] = useState<ScanDocType>("any");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [attachTo, setAttachTo] = useState<string>("new"); // "new" or item id

  const itemsQ = useQuery({ queryKey: ["items"], queryFn: listItems });

  async function onFile(f: File) {
    setErr(null);
    setResult(null);
    setSaved(false);
    setFile(f);
    if (f.size > 10 * 1024 * 1024) {
      setErr("File too large — max 10 MB.");
      return;
    }
    const url: string = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = () => rej(r.error);
      r.readAsDataURL(f);
    });
    setDataUrl(url);
    setPreview(f.type.startsWith("image/") ? url : null);
    setBusy(true);
    try {
      const resp = await fetch("/api/scan-invoice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileDataUrl: url,
          fileName: f.name,
          mimeType: f.type,
          docType,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error ?? "Scan failed");
      if (json.error) throw new Error(json.error);
      setResult(json as ScanResponse);

    } catch (e) {
      setErr(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveScan() {
    if (!result || !user || !file) return;
    const d = result.data ?? {};
    let itemId = attachTo;

    // Build item payload depending on doc type
    const patch: Partial<NewItem> = {
      ...(d.name ? { name: String(d.name) } : {}),
      ...(d.brand ? { brand: String(d.brand) } : {}),
      ...(d.serial ? { serial: String(d.serial) } : {}),
      ...(d.room ? { room: String(d.room) } : {}),
      ...(typeof d.price_paid === "number" && d.price_paid > 0 ? { price_paid: d.price_paid } : {}),
      ...(typeof d.price_now === "number" && d.price_now > 0 ? { price_now: d.price_now } : {}),
      ...(d.purchased_at ? { purchased_at: d.purchased_at } : {}),
      ...(d.warranty_until ? { warranty_until: d.warranty_until } : {}),
      ...(d.insured_until ? { insured_until: d.insured_until } : {}),
      ...(d.amc_until ? { amc_until: d.amc_until } : {}),
    };
    const saveDocType = result.docType;
    if (saveDocType === "invoice") patch.has_invoice = true;
    if (saveDocType === "manual") patch.has_manual = true;

    try {
      if (attachTo === "new") {
        const created = await createItem(
          {
            name: patch.name ?? d.name ?? `${saveDocType[0].toUpperCase()}${saveDocType.slice(1)} item`,
            room: patch.room ?? "other",
            price_paid: patch.price_paid ?? 0,
            ...patch,
          } as NewItem,
          user.id,
        );
        itemId = created.id;
      } else {
        await updateItem(itemId, patch);
      }

      await uploadDocument({
        userId: user.id,
        itemId,
        docType: saveDocType,
        file,
        extracted: d,
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["items"] }),
        qc.invalidateQueries({ queryKey: ["documents"] }),
      ]);
      setSaved(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    }
  }

  const d = result?.data ?? {};

  return (
    <>
      <div className="mb-3 overflow-hidden rounded-xl border border-border bg-surface-2">
        <div className="bg-brand px-4 py-3.5 text-brand-foreground">
          <h3 className="text-[14px] font-medium">AI document scanner</h3>
          <p className="mt-1 text-[11px] leading-relaxed opacity-70">
            Pick what you're scanning, then snap or upload. Works with images and PDFs (warranty
            cards, insurance policies, manuals, AMCs).
          </p>
        </div>

        <div className="p-3">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-text-muted">
            Document type
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {DOC_TYPES.map((t) => {
              const active = docType === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setDocType(t.key);
                    setResult(null);
                    setSaved(false);
                  }}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                    active
                      ? "border-brand bg-brand text-brand-foreground"
                      : "border-border bg-surface-1 text-text-secondary hover:border-accent-blue"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
          <input
            ref={uploadRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-xl border border-border bg-surface-1 p-3 text-center transition-colors hover:border-accent-blue hover:bg-surface-2"
            >
              <Camera className="mx-auto mb-1.5 h-5 w-5 text-text-secondary" />
              <div className="text-[12px] font-medium">Camera scan</div>
              <div className="mt-0.5 text-[10px] text-text-muted">Point at any document</div>
            </button>
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              className="rounded-xl border border-border bg-surface-1 p-3 text-center transition-colors hover:border-accent-blue hover:bg-surface-2"
            >
              <FileUp className="mx-auto mb-1.5 h-5 w-5 text-text-secondary" />
              <div className="text-[12px] font-medium">Upload file</div>
              <div className="mt-0.5 text-[10px] text-text-muted">JPG, PNG, PDF</div>
            </button>

            <ScanMethod icon={MailPlus} name="Gmail import" sub="Coming soon" />
            <ScanMethod icon={QrCode} name="Scan QR label" sub="Coming soon" />
          </div>
        </div>
      </div>

      {(preview || file || busy || result || err) && (
        <div className="mb-3 rounded-xl border border-border bg-surface-2 p-3">
          {preview ? (
            <img
              src={preview}
              alt="Preview of uploaded document"
              className="mb-3 max-h-48 w-full rounded-lg object-contain bg-surface-1"
            />
          ) : file ? (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-surface-1 p-3">
              <FileText className="h-5 w-5 text-text-muted" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium">{file.name}</div>
                <div className="text-[10px] text-text-muted">
                  {(file.size / 1024).toFixed(0)} KB · {file.type || "file"}
                </div>
              </div>
            </div>
          ) : null}
          {busy && <p className="text-[12px] text-text-muted">Reading {docType} with AI…</p>}
          {err && (
            <p className="rounded-md bg-[oklch(0.96_0.04_25)] px-2.5 py-2 text-[11px] text-[oklch(0.42_0.15_25)]">
              {err}
            </p>
          )}
          {result && (
            <div className="space-y-2">
              {result.partial && (
                <div className="rounded-md bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800 ring-1 ring-amber-200">
                  Couldn't extract every field — please verify before saving.
                </div>
              )}
              <div className="text-[13px] font-medium">{d.name ?? "—"}</div>
              <div className="text-[11px] text-text-muted">
                {(d.brand ?? "—") + " · " + capitalize(String(d.room ?? "other"))}
                {d.confidence ? ` · confidence ${d.confidence}` : ""}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {result.docType === "invoice" && (
                  <>
                    <KV k="Paid" v={d.price_paid ? inr(d.price_paid) : "—"} />
                    <KV k="Now" v={d.price_now ? inr(d.price_now) : "—"} />
                    <KV k="Purchased" v={d.purchased_at ?? "—"} />
                    <KV k="Warranty" v={d.warranty_until ?? "—"} />
                    <KV k="Serial" v={d.serial ?? "—"} />
                    <KV k="Seller" v={d.seller ?? "—"} />
                  </>
                )}
                {result.docType === "warranty" && (
                  <>
                    <KV k="Provider" v={d.provider ?? "—"} />
                    <KV k="Ends" v={d.warranty_until ?? "—"} />
                    <KV k="Claim #" v={d.claim_number ?? "—"} />
                    <KV k="Serial" v={d.serial ?? "—"} />
                    <KV k="Coverage" v={d.coverage ?? "—"} />
                  </>
                )}
                {result.docType === "insurance" && (
                  <>
                    <KV k="Insurer" v={d.insurer ?? "—"} />
                    <KV k="Policy #" v={d.policy_number ?? "—"} />
                    <KV k="Sum insured" v={d.sum_insured ? inr(d.sum_insured) : "—"} />
                    <KV k="Premium" v={d.premium ? inr(d.premium) : "—"} />
                    <KV k="Ends" v={d.insured_until ?? "—"} />
                    <KV k="Coverage" v={d.coverage ?? "—"} />
                  </>
                )}
                {result.docType === "manual" && (
                  <>
                    <KV k="Category" v={d.category ?? "—"} />
                    <KV k="Model" v={d.serial ?? "—"} />
                    <KV k="Specs" v={d.key_specs ?? "—"} />
                  </>
                )}
                {result.docType === "amc" && (
                  <>
                    <KV k="Provider" v={d.provider ?? "—"} />
                    <KV k="Contract #" v={d.contract_number ?? "—"} />
                    <KV k="Ends" v={d.amc_until ?? "—"} />
                    <KV k="Contact" v={d.contact ?? "—"} />
                    <KV k="Scope" v={d.scope ?? "—"} />
                  </>
                )}
              </div>

              <div className="mt-2">
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">
                  Attach to
                </label>
                <select
                  value={attachTo}
                  onChange={(e) => setAttachTo(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface-1 px-2 py-1.5 text-[12px]"
                >
                  <option value="new">+ Create new item</option>
                  {(itemsQ.data ?? []).map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} {it.brand ? `· ${it.brand}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                disabled={saved}
                onClick={saveScan}
                className="mt-1 w-full rounded-lg bg-brand px-3 py-2 text-[12px] font-medium text-brand-foreground disabled:opacity-60"
              >
                {saved ? "Saved to locker ✓" : "Save & file in Locker"}
              </button>
            </div>
          )}
        </div>
      )}

    </>
  );
}


function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md border border-border bg-surface-1 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-text-muted">{k}</div>
      <div className="truncate text-[12px] font-medium">{v}</div>
    </div>
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
function Locker({ setTab }: { setTab: (t: TabKey) => void }) {
  const { user } = useAuth();
  const itemsQ = useQuery({ queryKey: ["items"], queryFn: listItems });
  const docsQ = useQuery({ queryKey: ["documents"], queryFn: listDocuments });
  const qc = useQueryClient();
  const isDemo = (itemsQ.data ?? []).length === 0;
  const [activeCat, setActiveCat] = useState<DocType | null>(null);
  const [uploading, setUploading] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const docCategories: { key: DocType; name: string; icon: LucideIcon; tone: string }[] = [
    { key: "invoice", name: "Invoices", icon: FileCheck, tone: "text-[oklch(0.36_0.13_255)]" },
    { key: "warranty", name: "Warranties", icon: ShieldCheck, tone: "text-[oklch(0.38_0.1_158)]" },
    { key: "insurance", name: "Insurance", icon: ShieldHalf, tone: "text-[oklch(0.4_0.15_28)]" },
    { key: "manual", name: "Manuals", icon: BookOpen, tone: "text-[oklch(0.4_0.1_70)]" },
    { key: "amc", name: "AMC contracts", icon: Wrench, tone: "text-[oklch(0.36_0.13_255)]" },
  ];

  const docs = docsQ.data ?? [];
  const items = itemsQ.data ?? [];
  const countBy = (k: DocType) => docs.filter((d) => d.doc_type === k).length;
  const itemName = (id: string | null) => items.find((i) => i.id === id)?.name ?? "Unlinked";
  const activeDocs = activeCat ? docs.filter((d) => d.doc_type === activeCat) : [];

  function openCategory(k: DocType) {
    setActiveCat(k);
    setTimeout(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  async function openDoc(d: ItemDocument) {
    try {
      const url = await getDocSignedUrl(d.file_path);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not open");
    }
  }

  async function removeDoc(d: ItemDocument) {
    if (!confirm(`Delete ${d.file_name}?`)) return;
    await deleteDocument(d);
    await qc.invalidateQueries({ queryKey: ["documents"] });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !activeCat) return;
    if (!user) {
      toast.error("Please sign in to upload");
      return;
    }
    setUploading(true);
    try {
      await uploadDocument({
        userId: user.id,
        itemId: null,
        docType: activeCat,
        file,
      });
      await qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }


  return (
    <>
      {isDemo && <DemoBanner setTab={setTab} />}
      <div className="mb-3.5 flex items-center gap-2 rounded-xl border border-[oklch(0.78_0.12_158)] bg-[oklch(0.95_0.05_158)] px-3 py-2.5">
        <Lock className="h-[18px] w-[18px] flex-shrink-0 text-[oklch(0.38_0.1_158)]" />
        <p className="text-[12px] leading-snug text-[oklch(0.38_0.1_158)]">
          Private, RLS-protected storage. Only you can access your documents.
        </p>
      </div>

      <SectionTitle>Your documents</SectionTitle>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {docCategories.map((c) => {
          const Icon = c.icon;
          const n = countBy(c.key);
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => openCategory(c.key)}
              className="rounded-xl border border-border bg-surface-2 p-3 text-left transition-colors hover:border-accent-blue"
            >
              <Icon className={`mb-1.5 h-[22px] w-[22px] ${c.tone}`} />
              <div className="text-[12px] font-medium">{c.name}</div>
              <div className="mt-0.5 text-[10px] text-text-muted">
                {n} {n === 1 ? "file" : "files"}
              </div>
              <span className="mt-1.5 inline-block rounded bg-[oklch(0.95_0.05_158)] px-1.5 py-0.5 text-[10px] text-[oklch(0.38_0.1_158)]">
                Tap to view
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setTab("scan")}
          className="rounded-xl border border-dashed border-border bg-surface-2 p-3 text-left transition-colors hover:border-accent-blue"
        >
          <Plus className="mb-1.5 h-[22px] w-[22px] text-text-secondary" />
          <div className="text-[12px] font-medium">Add document</div>
          <div className="mt-0.5 text-[10px] text-text-muted">Scan or upload</div>
        </button>
      </div>

      {activeCat && (
        <div ref={panelRef} className="mb-3 scroll-mt-4 rounded-xl border border-border bg-surface-2 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[13px] font-medium">
              {docCategories.find((c) => c.key === activeCat)?.name}
            </h3>
            <button
              type="button"
              onClick={() => setActiveCat(null)}
              className="text-[11px] text-text-muted hover:text-text-primary"
            >
              Close
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleUpload}
          />
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex-1 rounded-md border border-accent-blue bg-accent-blue/10 px-2 py-1.5 text-[11px] font-medium text-accent-blue disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "+ Upload file"}
            </button>
            <button
              type="button"
              onClick={() => setTab("scan")}
              className="flex-1 rounded-md border border-border px-2 py-1.5 text-[11px] font-medium hover:border-accent-blue"
            >
              Scan with camera
            </button>
          </div>
          {activeDocs.length === 0 ? (
            <p className="py-4 text-center text-[12px] text-text-muted">
              No {activeCat} documents yet. Upload or scan to add one.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {activeDocs.map((d) => (
                <li key={d.id} className="flex items-center gap-2 py-2.5">
                  <FileText className="h-5 w-5 flex-shrink-0 text-text-muted" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-medium">{d.file_name}</div>
                    <div className="truncate text-[10px] text-text-muted">
                      {itemName(d.item_id)} · {(d.size_bytes / 1024).toFixed(0)} KB
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openDoc(d)}
                    className="rounded-md border border-border px-2 py-1 text-[11px] hover:border-accent-blue"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => removeDoc(d)}
                    className="rounded-md border border-border p-1 text-text-muted hover:border-bad hover:text-bad"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <SectionTitle>Other categories</SectionTitle>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {LOCKER_CATEGORIES.filter((c) =>
          ["Property docs", "Personal IDs", "Vehicle docs", "Medical records"].includes(c.name),
        ).map((c) => {
          const iconMap: Record<string, LucideIcon> = {
            "Property docs": HomeIcon,
            "Personal IDs": IdCard,
            "Vehicle docs": Car,
            "Medical records": HeartPulse,
          };
          const Icon = iconMap[c.name] ?? FileText;
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
                Coming soon
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}


/* ------------------------- AI ASSISTANT ------------------------- */
function AIAssistant({ setTab }: { setTab: (t: TabKey) => void }) {
  const itemsQ = useQuery({ queryKey: ["items"], queryFn: listItems });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ inventory: itemsQ.data ?? [] }),
      }),
    [itemsQ.data],
  );

  const { messages, sendMessage, status, error } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = (text: string) => {
    const msg = text.trim();
    if (!msg || busy) return;
    void sendMessage({ text: msg });
    setInput("");
  };

  const isDemo = (itemsQ.data ?? []).length === 0;

  const valuationItems = (itemsQ.data ?? []).filter(
    (i) => i.price_paid != null && i.price_now != null,
  );

  return (
    <div className="flex h-[calc(100vh-180px)] flex-col">
      {isDemo && <DemoBanner setTab={setTab} />}

      <details className="mb-3 rounded-xl border border-border bg-surface-1">
        <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-2.5 text-[12px] font-medium">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent-blue" />
            AI valuation — current market value
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
        </summary>
        <div className="space-y-2 px-2.5 pb-2.5">
          {isDemo
            ? ITEMS.slice(0, 3).map((item) => {
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
                    className="flex gap-3 rounded-xl border border-border bg-surface-2 p-3"
                  >
                    <div
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${ICON_TONE[item.iconTone]}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium">{item.name}</div>
                      <div className="text-[10px] text-text-muted">
                        Bought {inr(item.pricePaid)} · {item.purchasedAt}
                      </div>
                      <div className="mt-1.5">
                        <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-surface-1">
                          <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="font-medium text-[oklch(0.36_0.13_255)]">
                            {inr(item.priceNow)} today
                          </span>
                          <span className="text-bad">−{dep}% depreciation</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            : valuationItems.length === 0
            ? (
                <p className="px-1 py-2 text-[11px] text-text-muted">
                  Add price paid and current value to items to see AI valuation.
                </p>
              )
            : valuationItems.slice(0, 5).map((item) => {
                const paid = Number(item.price_paid);
                const now = Number(item.price_now);
                const pct = paid > 0 ? Math.round((now / paid) * 100) : 0;
                const dep = Math.max(0, 100 - pct);
                const fill = dep < 20 ? "bg-ok" : dep < 45 ? "bg-warn" : "bg-bad";
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border bg-surface-2 p-3"
                  >
                    <div className="truncate text-[12px] font-medium">{item.name}</div>
                    <div className="text-[10px] text-text-muted">
                      Bought {inr(paid)}
                      {item.brand ? ` · ${item.brand}` : ""}
                    </div>
                    <div className="mt-1.5">
                      <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-surface-1">
                        <div className={`h-full rounded-full ${fill}`} style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="font-medium text-[oklch(0.36_0.13_255)]">
                          {inr(now)} today
                        </span>
                        <span className="text-bad">−{dep}% depreciation</span>
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>
      </details>


      <div className="mb-2 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => send(s)}
            disabled={busy}
            className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] text-text-secondary transition-colors hover:border-accent-blue hover:text-[oklch(0.32_0.13_255)] disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto pb-2">
        {messages.length === 0 && (
          <div className="mr-auto max-w-[85%] rounded-[12px_12px_12px_3px] border border-border bg-surface-2 px-3 py-2.5 text-[13px] leading-relaxed">
            <div className="mb-1 flex items-center gap-1 text-[10px] text-text-muted">
              <Sparkles className="h-3 w-3 text-accent-blue" />
              GharLog AI
            </div>
            Namaste! Ask me anything about your home — warranties, values, service schedules, or
            documents.
          </div>
        )}
        {messages.map((m) => {
          const text = m.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("");
          if (m.role === "user") {
            return (
              <div
                key={m.id}
                className="ml-auto max-w-[85%] rounded-[12px_12px_3px_12px] bg-brand px-3 py-2.5 text-[13px] leading-relaxed text-brand-foreground"
              >
                {text}
              </div>
            );
          }
          return (
            <div
              key={m.id}
              className="mr-auto max-w-[85%] rounded-[12px_12px_12px_3px] border border-border bg-surface-2 px-3 py-2.5 text-[13px] leading-relaxed"
            >
              <div className="mb-1 flex items-center gap-1 text-[10px] text-text-muted">
                <Sparkles className="h-3 w-3 text-accent-blue" />
                GharLog AI
              </div>
              <div
                className="whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: renderMd(text) }}
              />
            </div>
          );
        })}
        {busy && (
          <div className="mr-auto max-w-[85%] rounded-[12px_12px_12px_3px] border border-border bg-surface-2 px-3 py-2.5 text-[12px] text-text-muted">
            Thinking…
          </div>
        )}
        {error && (
          <div className="rounded-md bg-[oklch(0.96_0.04_25)] px-2.5 py-2 text-[11px] text-[oklch(0.42_0.15_25)]">
            {error.message}
          </div>
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
          disabled={busy}
          aria-label="Send"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground disabled:opacity-60"
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
function Insurance({ setTab }: { setTab: (t: TabKey) => void }) {
  const planQ = useQuery({ queryKey: ["my-plan"], queryFn: () => getMyPlan() });
  const qc = useQueryClient();
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const redeem = useMutation({
    mutationFn: (code: string) => redeemProCode({ data: { code } }),
    onSuccess: (res) => {
      setPromoMsg({ ok: res.ok, text: res.message });
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ["my-plan"] });
        setTimeout(() => setPromoOpen(false), 1200);
      }
    },
  });
  const isPro = planQ.data?.plan === "pro";
  const itemsQ = useQuery({ queryKey: ["items"], queryFn: listItems });
  const isDemo = (itemsQ.data ?? []).length === 0;
  const [reportOpen, setReportOpen] = useState(false);
  return (
    <>
      {isDemo && <DemoBanner setTab={setTab} />}

      <button
        type="button"
        onClick={() => setReportOpen(true)}
        className="mb-3 flex w-full items-center justify-between rounded-xl border border-border bg-surface-1 px-3.5 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand" />
          <span>
            <span className="block text-[13px] font-medium">Insurance report</span>
            <span className="block text-[11px] text-text-muted">Coverage summary, gaps and PDF for your insurer</span>
          </span>
        </span>
        <FileDown className="h-4 w-4 text-text-muted" />
      </button>


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
          cta={isPro ? "Downgraded" : "Current plan"}
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
          cta={isPro ? "Active ✓" : "Upgrade to Pro"}
          onCta={isPro ? undefined : () => { setPromoMsg(null); setPromoCode(""); setPromoOpen(true); }}
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

      {promoOpen && (
        <UpgradeModal
          onClose={() => setPromoOpen(false)}
          onProActivated={() => {
            qc.invalidateQueries({ queryKey: ["my-plan"] });
            setTimeout(() => setPromoOpen(false), 1200);
          }}
          promoCode={promoCode}
          setPromoCode={setPromoCode}
          promoMsg={promoMsg}
          setPromoMsg={setPromoMsg}
          onRedeem={() => redeem.mutate(promoCode.trim())}
          redeemPending={redeem.isPending}
        />
      )}

      {reportOpen && <InsuranceReport items={itemsQ.data ?? []} onClose={() => setReportOpen(false)} />}
    </>
  );
}

function UpgradeModal({
  onClose,
  onProActivated,
  promoCode,
  setPromoCode,
  promoMsg,
  setPromoMsg,
  onRedeem,
  redeemPending,
}: {
  onClose: () => void;
  onProActivated: () => void;
  promoCode: string;
  setPromoCode: (v: string) => void;
  promoMsg: { ok: boolean; text: string } | null;
  setPromoMsg: (v: { ok: boolean; text: string } | null) => void;
  onRedeem: () => void;
  redeemPending: boolean;
}) {
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState<string | null>(null);
  const qc = useQueryClient();

  async function loadRzp(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    if ((window as any).Razorpay) return true;
    return new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });
  }

  async function payNow() {
    setPayMsg(null);
    setPaying(true);
    try {
      const ok = await loadRzp();
      if (!ok) throw new Error("Could not load Razorpay. Check your connection.");
      const order = await createRazorpayProOrder();
      const rzp = new (window as any).Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "GharLog Pro",
        description: "Pro plan — 1 year",
        prefill: order.userEmail ? { email: order.userEmail } : undefined,
        theme: { color: "#0f766e" },
        handler: () => {
          // Payment succeeded on client. Webhook activates Pro server-side.
          setPayMsg("Payment received — activating Pro…");
          // Poll plan a few times.
          let tries = 0;
          const t = setInterval(async () => {
            tries++;
            await qc.invalidateQueries({ queryKey: ["my-plan"] });
            const fresh = qc.getQueryData<{ plan: string }>(["my-plan"]);
            if (fresh?.plan === "pro" || tries > 10) {
              clearInterval(t);
              if (fresh?.plan === "pro") onProActivated();
              else setPayMsg("Payment received. Pro will activate shortly — refresh in a moment.");
            }
          }, 1500);
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.on("payment.failed", (e: any) => {
        setPayMsg(e?.error?.description ?? "Payment failed");
        setPaying(false);
      });
      rzp.open();
    } catch (e: any) {
      setPayMsg(e?.message ?? "Something went wrong");
      setPaying(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-surface-1 p-4 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center gap-2">
          <Crown className="h-4 w-4 text-[oklch(0.78_0.14_85)]" />
          <h3 className="text-[15px] font-medium">Unlock Pro</h3>
        </div>
        <p className="mb-3 text-[12px] text-text-muted">
          ₹999 / year. Unlimited items, AI scanner, insurance reports & family sharing.
        </p>

        <button
          type="button"
          disabled={paying}
          onClick={payNow}
          className="w-full rounded-xl bg-brand px-3 py-2.5 text-[13px] font-medium text-brand-foreground disabled:opacity-60"
        >
          {paying ? "Processing…" : "Pay ₹999 with Razorpay"}
        </button>
        {payMsg && (
          <div className="mt-2 rounded-md bg-surface-2 px-2.5 py-2 text-[11px] text-text-secondary">
            {payMsg}
          </div>
        )}

        <div className="my-3 flex items-center gap-2 text-[10px] uppercase tracking-wide text-text-muted">
          <div className="h-px flex-1 bg-border" />
          or use promo code
          <div className="h-px flex-1 bg-border" />
        </div>

        <input
          value={promoCode}
          onChange={(e) => {
            setPromoCode(e.target.value);
            setPromoMsg(null);
          }}
          placeholder="Promo code"
          className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-[13px] uppercase tracking-wide outline-none focus:border-accent-blue"
        />
        {promoMsg && (
          <div
            className={`mt-2 rounded-md px-2.5 py-2 text-[11px] ${
              promoMsg.ok
                ? "bg-[oklch(0.95_0.05_150)] text-[oklch(0.38_0.13_150)]"
                : "bg-[oklch(0.96_0.04_25)] text-[oklch(0.42_0.15_25)]"
            }`}
          >
            {promoMsg.text}
          </div>
        )}
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-[12px]"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!promoCode.trim() || redeemPending}
            onClick={onRedeem}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-[12px] font-medium disabled:opacity-60"
          >
            {redeemPending ? "Checking…" : "Redeem code"}
          </button>
        </div>
      </div>
    </div>
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
  onCta,
}: {
  name: string;
  price: string;
  per: string;
  features: { ok: boolean; label: string }[];
  cta: string;
  recommended?: boolean;
  onCta?: () => void;
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
        onClick={onCta}
        disabled={!onCta}
        className={`mt-2.5 w-full rounded-lg border px-2 py-2 text-[12px] font-medium ${
          recommended
            ? "border-brand bg-brand text-brand-foreground"
            : "border-border bg-surface-1 text-text-primary"
        } ${!onCta ? "opacity-70 cursor-default" : "hover:opacity-90"}`}
      >
        {cta}
      </button>
    </div>
  );
}

/* ------------------------- FAMILY SHARING ------------------------- */
function FamilySheet({ onClose }: { onClose: () => void }) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const createInviteFn = useServerFn(createHouseholdInvite);
  const userId = session?.user.id ?? "";
  const myEmail = session?.user.email ?? "";
  const householdsQ = useQuery({ queryKey: ["households"], queryFn: listMyHouseholds, enabled: !!session });
  const households = householdsQ.data ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = households.find((h) => h.id === activeId) ?? households[0] ?? null;
  const isOwner = !!(active && active.owner_id === userId);

  const membersQ = useQuery({
    queryKey: ["household-members", active?.id],
    queryFn: () => listMembers(active!.id),
    enabled: !!active,
  });
  const invitesQ = useQuery({
    queryKey: ["household-invites", active?.id],
    queryFn: () => listInvites(active!.id),
    enabled: !!active && isOwner,
  });

  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<HouseholdRole>("viewer");
  const [shareInvite, setShareInvite] = useState<{ email: string; link: string; role: "editor" | "viewer" } | null>(null);

  const createH = useMutation({
    mutationFn: () => createHousehold(name || "My Household", userId),
    onSuccess: (h) => {
      setName("");
      setActiveId(h.id);
      qc.invalidateQueries({ queryKey: ["households"] });
      toast.success("Household created");
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const invite = useMutation({
    mutationFn: () =>
      createInviteFn({
        data: {
          householdId: active!.id,
          email: inviteEmail,
          role: inviteRole === "owner" ? "editor" : (inviteRole as "editor" | "viewer"),
        },
      }),
    onSuccess: (inv) => {
      setInviteEmail("");
      qc.invalidateQueries({ queryKey: ["household-invites", active?.id] });
      const link = inviteLink(inv.token);
      setShareInvite({ email: inv.email, link, role: inv.role });
      navigator.clipboard?.writeText(link).catch(() => {});
      toast.success("Invite ready", { description: "Choose WhatsApp or email below to share it." });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const removeM = useMutation({
    mutationFn: (id: string) => removeMember(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["household-members", active?.id] }),
    onError: (e) => toast.error((e as Error).message),
  });
  const changeRole = useMutation({
    mutationFn: (v: { id: string; role: HouseholdRole }) => updateMemberRole(v.id, v.role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["household-members", active?.id] }),
    onError: (e) => toast.error((e as Error).message),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => revokeInvite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["household-invites", active?.id] }),
  });
  const rename = useMutation({
    mutationFn: (v: { id: string; name: string }) => renameHousehold(v.id, v.name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["households"] }),
  });
  const deleteH = useMutation({
    mutationFn: (id: string) => deleteHousehold(id),
    onSuccess: () => {
      setActiveId(null);
      qc.invalidateQueries({ queryKey: ["households"] });
      toast.success("Household deleted");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function copyLink(token: string) {
    navigator.clipboard?.writeText(inviteLink(token)).then(
      () => toast.success("Link copied"),
      () => toast.error("Copy failed"),
    );
  }

  function copyInviteLink(link: string) {
    navigator.clipboard?.writeText(link).then(
      () => toast.success("Link copied"),
      () => toast.error("Copy failed"),
    );
  }

  const inviteShareText = shareInvite
    ? `Join my GharLog household as ${shareInvite.role}. Open this secure invite link: ${shareInvite.link}`
    : "";
  const whatsappHref = shareInvite
    ? `https://wa.me/?text=${encodeURIComponent(inviteShareText)}`
    : "#";
  const emailHref = shareInvite
    ? `mailto:${encodeURIComponent(shareInvite.email)}?subject=${encodeURIComponent("GharLog family invite")}&body=${encodeURIComponent(inviteShareText)}`
    : "#";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-2xl bg-surface-0 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-surface-1 px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-brand" />
            <h3 className="text-[15px] font-medium text-text-primary">Family sharing</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2 text-text-primary shadow-sm hover:bg-surface-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {householdsQ.isLoading && <div className="text-sm text-text-muted">Loading…</div>}

          {!householdsQ.isLoading && households.length === 0 && (
            <div className="space-y-3">
              <p className="text-[13px] text-text-muted">
                Create a household to share your inventory, warranties and documents with family.
              </p>
              <div className="flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Household name (e.g. Sharma Home)"
                  className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-muted outline-none focus:border-accent-blue"
                />
                <button
                  type="button"
                  disabled={createH.isPending}
                  onClick={() => createH.mutate()}
                  className="rounded-lg bg-brand px-3 py-2 text-[12px] font-medium text-brand-foreground disabled:opacity-60"
                >
                  Create
                </button>
              </div>
            </div>
          )}

          {active && (
            <>
              {households.length > 1 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {households.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setActiveId(h.id)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] ${
                        active.id === h.id
                          ? "border-brand bg-brand text-brand-foreground"
                          : "border-border bg-surface-1 text-text-secondary"
                      }`}
                    >
                      {h.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="mb-4 rounded-xl border border-border bg-surface-1 p-3">
                <div className="flex items-center justify-between gap-2">
                  <input
                    defaultValue={active.name}
                    disabled={!isOwner}
                    onBlur={(e) => {
                      const v = e.currentTarget.value.trim();
                      if (v && v !== active.name) rename.mutate({ id: active.id, name: v });
                    }}
                    className="flex-1 rounded-md bg-transparent px-1 py-0.5 text-[14px] font-medium text-text-primary outline-none disabled:opacity-70 focus:bg-surface-2"
                  />
                  <span className="text-[10px] uppercase tracking-wide text-text-muted">
                    {isOwner ? "Owner" : "Member"}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-muted">
                  Members ({membersQ.data?.length ?? 0})
                </div>
                <ul className="space-y-1.5">
                  {(membersQ.data ?? []).map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-1 px-3 py-2 text-[12.5px]"
                    >
                      <div className="min-w-0 flex-1 truncate">
                        <div className="font-medium">
                          {m.user_id === userId ? "You" : m.user_id.slice(0, 8) + "…"}
                        </div>
                      </div>
                      {isOwner && m.user_id !== userId ? (
                        <>
                          <select
                            value={m.role}
                            onChange={(e) => changeRole.mutate({ id: m.id, role: e.target.value as HouseholdRole })}
                            className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[11px]"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => removeM.mutate(m.id)}
                            className="rounded p-1 text-bad hover:bg-bad/10"
                            aria-label="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] capitalize text-text-muted">
                          {m.role}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {isOwner && (
                <div className="mb-4 rounded-xl border border-border bg-surface-1 p-3">
                  <div className="mb-2 text-[12px] font-medium">Invite a family member</div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      type="email"
                      placeholder="family@example.com"
                      className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-muted outline-none focus:border-accent-blue"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as HouseholdRole)}
                      className="rounded-lg border border-border bg-surface-2 px-2 py-2 text-[12px] text-text-primary"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                    <button
                      type="button"
                      disabled={!inviteEmail.trim() || invite.isPending}
                      onClick={() => invite.mutate()}
                      className="rounded-lg bg-brand px-3 py-2 text-[12px] font-medium text-brand-foreground disabled:opacity-60"
                    >
                      {invite.isPending ? "Creating…" : "Send invite"}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[10.5px] text-text-muted">
                    Creates a secure invite link, valid for 14 days. Share via WhatsApp, email or SMS.
                  </p>
                  {invite.isError && (
                    <p className="mt-2 rounded-md border border-bad/30 bg-bad/10 px-2 py-1.5 text-[11px] font-medium text-bad">
                      {(invite.error as Error).message || "Could not create invite. Please try again."}
                    </p>
                  )}
                  {shareInvite && (
                    <div className="mt-3 rounded-lg border border-brand/40 bg-surface-2 p-3">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[12px] font-semibold text-text-primary">Invite link ready</div>
                          <div className="text-[10.5px] text-text-secondary">For {shareInvite.email}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShareInvite(null)}
                          className="rounded-full p-1 text-text-secondary hover:bg-surface-3 hover:text-text-primary"
                          aria-label="Hide invite share options"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="mb-2 break-all rounded-md border border-border bg-surface-0 px-2 py-1.5 text-[11px] font-medium text-text-primary">
                        {shareInvite.link}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <a
                          href={whatsappHref}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-1.5 rounded-lg border border-ok bg-ok/15 px-2 py-2 text-[11px] font-semibold text-text-primary"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp
                        </a>
                        <a
                          href={emailHref}
                          className="flex items-center justify-center gap-1.5 rounded-lg bg-surface-3 px-2 py-2 text-[11px] font-semibold text-text-primary"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          Email
                        </a>
                        <button
                          type="button"
                          onClick={() => copyInviteLink(shareInvite.link)}
                          className="flex items-center justify-center gap-1.5 rounded-lg bg-surface-3 px-2 py-2 text-[11px] font-semibold text-text-primary"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isOwner && (invitesQ.data ?? []).length > 0 && (
                <div className="mb-4">
                  <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-muted">
                    Pending invites
                  </div>
                  <ul className="space-y-1.5">
                    {(invitesQ.data ?? [])
                      .filter((i) => !i.accepted_at)
                      .map((i) => (
                        <li
                          key={i.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-1 px-3 py-2 text-[12px]"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{i.email}</div>
                            <div className="text-[10px] text-text-muted">
                              {i.role} · expires {new Date(i.expires_at).toLocaleDateString("en-IN")}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyLink(i.token)}
                            className="rounded p-1 text-brand hover:bg-brand/10"
                            aria-label="Copy link"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => revoke.mutate(i.id)}
                            className="rounded p-1 text-bad hover:bg-bad/10"
                            aria-label="Revoke"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete household "${active.name}"? Members will lose access.`))
                      deleteH.mutate(active.id);
                  }}
                  className="mt-2 w-full rounded-lg border border-bad/30 bg-bad/5 py-2 text-[12px] font-medium text-bad"
                >
                  Delete household
                </button>
              )}

              {!isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    const me = (membersQ.data ?? []).find((m) => m.user_id === userId);
                    if (me && confirm(`Leave "${active.name}"?`)) removeM.mutate(me.id);
                  }}
                  className="mt-2 w-full rounded-lg border border-border bg-surface-1 py-2 text-[12px] font-medium"
                >
                  Leave household
                </button>
              )}

              <p className="mt-4 text-[10.5px] text-text-muted">
                Signed in as {myEmail || "—"}. Editors can add and change items; viewers see everything read-only.
              </p>

              {households.length > 0 && (
                <div className="mt-4 rounded-xl border border-dashed border-border bg-surface-1 p-3">
                  <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">
                    Create another household
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="New household name"
                      className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-accent-blue"
                    />
                    <button
                      type="button"
                      disabled={createH.isPending}
                      onClick={() => createH.mutate()}
                      className="rounded-lg bg-brand px-3 py-2 text-[12px] font-medium text-brand-foreground disabled:opacity-60"
                    >
                      Create
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------- INSURANCE REPORT ------------------------- */
function InsuranceReport({ items, onClose }: { items: DbItem[]; onClose: () => void }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalValue = items.reduce((s, it) => s + Number(it.price_now || 0), 0);
  const insured = items.filter(
    (it) => it.insured_until && new Date(it.insured_until + "T00:00:00") >= today,
  );
  const insuredValue = insured.reduce((s, it) => s + Number(it.price_now || 0), 0);
  const expired = items.filter(
    (it) => it.insured_until && new Date(it.insured_until + "T00:00:00") < today,
  );
  const uninsured = items.filter((it) => !it.insured_until);
  const gap = Math.max(0, totalValue - insuredValue);
  const coveragePct = totalValue > 0 ? Math.round((insuredValue / totalValue) * 100) : 0;

  const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  const fmtDate = (d: string | null) =>
    d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "—";

  const printReport = () => {
    const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=1100");
    if (!win) {
      toast.error("Enable pop-ups to download the PDF");
      return;
    }
    const rows = items
      .map(
        (it) => `
        <tr>
          <td>${escapeHtml(it.name)}</td>
          <td>${escapeHtml(it.brand ?? "")}</td>
          <td>${escapeHtml(it.room)}</td>
          <td class="num">${inr(it.price_now)}</td>
          <td>${fmtDate(it.insured_until)}</td>
          <td class="status status-${insuranceStatus(it, today)}">${insuranceStatusLabel(it, today)}</td>
        </tr>`,
      )
      .join("");
    win.document.write(`<!doctype html><html><head><meta charset="utf-8" />
      <title>GharLog Insurance Report — ${new Date().toLocaleDateString("en-IN")}</title>
      <style>
        *{box-sizing:border-box}
        body{font:13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111;margin:32px;}
        h1{font-size:22px;margin:0 0 4px;}
        .sub{color:#666;font-size:12px;margin-bottom:20px;}
        .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:22px;}
        .card{border:1px solid #ddd;border-radius:10px;padding:10px;}
        .lbl{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.05em;}
        .val{font-size:16px;font-weight:600;margin-top:4px;}
        .val.bad{color:#c53030;} .val.ok{color:#276749;}
        table{width:100%;border-collapse:collapse;margin-top:8px;}
        th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #eee;font-size:12px;}
        th{background:#f7f7f8;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.04em;}
        td.num{text-align:right;font-variant-numeric:tabular-nums;}
        .status{font-weight:600;font-size:11px;}
        .status-insured{color:#276749;} .status-expired{color:#c53030;} .status-none{color:#a05a00;}
        .foot{margin-top:20px;font-size:11px;color:#777;}
        h2{font-size:14px;margin:22px 0 6px;}
        @media print{body{margin:14mm;} .noprint{display:none;}}
      </style></head><body>
      <button class="noprint" onclick="window.print()" style="float:right;padding:6px 12px;border-radius:6px;border:1px solid #333;background:#fff;cursor:pointer">Print / Save PDF</button>
      <h1>Insurance Report</h1>
      <div class="sub">GharLog · Generated ${new Date().toLocaleString("en-IN")}</div>
      <div class="grid">
        <div class="card"><div class="lbl">Total home value</div><div class="val">${inr(totalValue)}</div></div>
        <div class="card"><div class="lbl">Currently insured</div><div class="val ok">${inr(insuredValue)}</div></div>
        <div class="card"><div class="lbl">Coverage</div><div class="val">${coveragePct}%</div></div>
        <div class="card"><div class="lbl">Coverage gap</div><div class="val ${gap > 0 ? "bad" : "ok"}">${inr(gap)}</div></div>
      </div>
      <h2>All items (${items.length})</h2>
      <table>
        <thead><tr><th>Item</th><th>Brand</th><th>Room</th><th class="num">Value</th><th>Insured until</th><th>Status</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="6" style="text-align:center;color:#999;padding:20px">No items</td></tr>`}</tbody>
      </table>
      <div class="foot">
        Uninsured items: ${uninsured.length} · Expired: ${expired.length}<br/>
        Share this report with your insurer to discuss revised coverage. Verified asset records typically qualify for 10–15% premium discounts.
      </div>
      <script>setTimeout(()=>window.print(),400)</script>
    </body></html>`);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-2xl bg-surface-0 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-surface-1 px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-brand" />
            <h3 className="text-[15px] font-medium">Insurance report</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-surface-2 px-3 py-1 text-[12px]">
            Done
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Total value" value={inr(totalValue)} />
            <StatCard label="Insured" value={inr(insuredValue)} tone="ok" />
            <StatCard label="Coverage" value={`${coveragePct}%`} />
            <StatCard label="Gap" value={inr(gap)} tone={gap > 0 ? "bad" : "ok"} />
          </div>

          {expired.length > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-bad">
                <AlertTriangle className="h-3.5 w-3.5" /> Expired ({expired.length})
              </div>
              <ul className="space-y-1">
                {expired.map((it) => (
                  <li key={it.id} className="flex justify-between rounded-md bg-bad/5 px-2.5 py-1.5 text-[12px]">
                    <span className="truncate">{it.name}</span>
                    <span className="text-text-muted">{fmtDate(it.insured_until)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {uninsured.length > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-[oklch(0.5_0.14_65)]">
                <AlertCircle className="h-3.5 w-3.5" /> Uninsured ({uninsured.length})
              </div>
              <ul className="space-y-1">
                {uninsured.slice(0, 8).map((it) => (
                  <li key={it.id} className="flex justify-between rounded-md bg-surface-1 px-2.5 py-1.5 text-[12px]">
                    <span className="truncate">{it.name}</span>
                    <span className="tabular-nums text-text-muted">{inr(it.price_now)}</span>
                  </li>
                ))}
                {uninsured.length > 8 && (
                  <li className="text-[11px] text-text-muted">+ {uninsured.length - 8} more</li>
                )}
              </ul>
            </div>
          )}

          {insured.length > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-ok">
                <ShieldCheck className="h-3.5 w-3.5" /> Insured ({insured.length})
              </div>
              <ul className="space-y-1">
                {insured.map((it) => (
                  <li key={it.id} className="flex justify-between rounded-md bg-ok/5 px-2.5 py-1.5 text-[12px]">
                    <span className="truncate">{it.name}</span>
                    <span className="text-text-muted">until {fmtDate(it.insured_until)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-border bg-surface-1 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-border bg-surface-2 py-2 text-[12px] font-medium"
          >
            Close
          </button>
          <button
            type="button"
            onClick={printReport}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand py-2 text-[12px] font-medium text-brand-foreground"
          >
            <FileDown className="h-3.5 w-3.5" /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" }) {
  return (
    <div className="rounded-xl border border-border bg-surface-1 p-3">
      <div className="text-[10px] uppercase tracking-wide text-text-muted">{label}</div>
      <div
        className={`mt-1 text-[16px] font-medium tabular-nums ${
          tone === "ok" ? "text-ok" : tone === "bad" ? "text-bad" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function insuranceStatus(it: DbItem, today: Date): "insured" | "expired" | "none" {
  if (!it.insured_until) return "none";
  return new Date(it.insured_until + "T00:00:00") >= today ? "insured" : "expired";
}
function insuranceStatusLabel(it: DbItem, today: Date): string {
  const s = insuranceStatus(it, today);
  return s === "insured" ? "Insured" : s === "expired" ? "Expired" : "Uninsured";
}
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

/* ------------------------- DESKTOP AD RAILS ------------------------- */
function AdRail({ side }: { side: "left" | "right" }) {
  const client =
    (typeof window !== "undefined" && (window as unknown as { __ADSENSE_CLIENT__?: string }).__ADSENSE_CLIENT__) ||
    (import.meta.env.VITE_ADSENSE_CLIENT as string | undefined);
  const slot =
    side === "left"
      ? (import.meta.env.VITE_ADSENSE_SLOT_LEFT as string | undefined)
      : (import.meta.env.VITE_ADSENSE_SLOT_RIGHT as string | undefined);
  return (
    <aside
      className="pointer-events-none hidden lg:flex lg:w-[240px] xl:w-[300px] shrink-0 items-start justify-center pt-6"
      aria-label={`Sponsored ${side} rail`}
    >
      <div className="pointer-events-auto sticky top-4 flex h-[600px] w-full max-w-[300px] flex-col overflow-hidden rounded-xl border border-dashed border-border bg-surface-1 text-[11px] text-text-muted">
        {client && slot ? (
          <AdSlot client={client} slot={slot} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center">
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] uppercase tracking-wide">Ad</span>
            <span className="mt-2 text-[11px]">Sponsored space</span>
            <span className="text-[10px] opacity-70">Set VITE_ADSENSE_CLIENT to enable</span>
          </div>
        )}
      </div>
    </aside>
  );
}

/* ------------------------- MOBILE AD BANNER ------------------------- */
function AdBanner() {
  const client =
    (typeof window !== "undefined" && (window as unknown as { __ADSENSE_CLIENT__?: string }).__ADSENSE_CLIENT__) ||
    (import.meta.env.VITE_ADSENSE_CLIENT as string | undefined);
  const slot = import.meta.env.VITE_ADSENSE_SLOT_MOBILE as string | undefined;
  return (
    <aside
      className="lg:hidden w-full px-4 pt-3 pb-1"
      aria-label="Sponsored banner"
    >
      <div className="mx-auto flex h-[90px] w-full max-w-[480px] flex-col overflow-hidden rounded-lg border border-dashed border-border bg-surface-1 text-[11px] text-text-muted">
        {client && slot ? (
          <AdSlot client={client} slot={slot} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center">
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] uppercase tracking-wide">Ad</span>
            <span className="text-[11px]">Sponsored space</span>
            <span className="text-[10px] opacity-70">Set VITE_ADSENSE_CLIENT to enable</span>
          </div>
        )}
      </div>
    </aside>
  );
}

function AdSlot({ client, slot }: { client: string; slot: string }) {
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      (w.adsbygoogle = w.adsbygoogle || []).push({});
    } catch { /* ignore */ }
  }, []);
  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block", width: "100%", height: "100%" }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

