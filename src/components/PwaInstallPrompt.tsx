import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "gharlog:pwa-install-dismissed-at";
const DISMISS_DAYS = 14;

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function PwaInstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const age = Date.now() - Number(raw);
        if (age < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
      }
    } catch { /* ignore */ }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setVisible(false));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible || !evt) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setVisible(false);
  };

  const install = async () => {
    try {
      await evt.prompt();
      await evt.userChoice;
    } catch { /* ignore */ }
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-border bg-surface-2 p-3 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-brand/10 p-2 text-brand">
          <Download className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-text-primary">Install GharLog</p>
          <p className="mt-0.5 text-[11.5px] text-text-secondary">
            Add to your home screen for faster access and reminders.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={install}
              className="rounded-md bg-brand px-3 py-1.5 text-[12px] font-medium text-brand-foreground"
            >
              Install
            </button>
            <button
              onClick={dismiss}
              className="rounded-md border border-border bg-surface-0 px-3 py-1.5 text-[12px] font-medium text-text-secondary"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="text-text-muted hover:text-text-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
