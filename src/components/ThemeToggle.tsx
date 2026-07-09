import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";
const KEY = "gharlog:theme";

function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const wantsDark =
    t === "dark" ||
    (t === "system" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches === true);
  root.classList.toggle("dark", wantsDark);
  // Update mobile browser theme-color chip to match
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = wantsDark ? "#0b1220" : "#0F1F4B";
}

export function initTheme() {
  if (typeof window === "undefined") return;
  const saved = (localStorage.getItem(KEY) as Theme | null) ?? "system";
  applyTheme(saved);
  // React to system changes when in "system" mode
  const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
  mq?.addEventListener?.("change", () => {
    const cur = (localStorage.getItem(KEY) as Theme | null) ?? "system";
    if (cur === "system") applyTheme("system");
  });
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try {
      const saved = (localStorage.getItem(KEY) as Theme | null) ?? "system";
      setTheme(saved);
    } catch { /* ignore */ }
  }, []);

  const pick = (t: Theme) => {
    setTheme(t);
    try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
    applyTheme(t);
  };

  const btn = (t: Theme, Icon: typeof Sun, label: string) => (
    <button
      key={t}
      type="button"
      onClick={() => pick(t)}
      aria-pressed={theme === t}
      className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11.5px] font-medium transition ${
        theme === t
          ? "bg-surface-2 text-text-primary shadow-sm"
          : "text-text-secondary hover:text-text-primary"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-1 p-0.5">
      {btn("light", Sun, "Light")}
      {btn("dark", Moon, "Dark")}
      {btn("system", Monitor, "Auto")}
    </div>
  );
}
