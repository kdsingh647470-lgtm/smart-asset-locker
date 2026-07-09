import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";

type Step = {
  key: string;
  label: string;
  done: boolean;
  onClick?: () => void;
  to?: string;
};

export function OnboardingChecklist({
  hasItems,
  hasDocuments,
  hasTasks,
  onAdd,
  onScan,
  onLocker,
  onTasks,
}: {
  hasItems: boolean;
  hasDocuments: boolean;
  hasTasks: boolean;
  onAdd: () => void;
  onScan: () => void;
  onLocker: () => void;
  onTasks: () => void;
}) {
  const steps: Step[] = [
    { key: "item", label: "Add your first item", done: hasItems, onClick: onAdd },
    { key: "scan", label: "Scan an invoice with AI", done: hasDocuments, onClick: onScan },
    { key: "doc", label: "Upload a warranty or bill", done: hasDocuments, onClick: onLocker },
    { key: "task", label: "Set your first maintenance task", done: hasTasks, onClick: onTasks },
    { key: "share", label: "Invite your family", done: false, to: "/#family" },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <section className="mb-3.5 rounded-2xl border border-border bg-surface-2 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand" />
        <h2 className="text-[13px] font-semibold text-text-primary">Set up your home vault</h2>
        <span className="ml-auto text-[11px] text-text-muted">{doneCount}/{steps.length}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-1">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="mt-3 space-y-1.5">
        {steps.map((s) => {
          const inner = (
            <>
              {s.done ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[oklch(0.66_0.14_158)]" />
              ) : (
                <Circle className="h-4 w-4 flex-shrink-0 text-text-muted" />
              )}
              <span
                className={
                  s.done
                    ? "text-[12.5px] text-text-muted line-through"
                    : "text-[12.5px] text-text-primary"
                }
              >
                {s.label}
              </span>
            </>
          );
          const cls =
            "flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-surface-1 disabled:hover:bg-transparent";
          if (s.to && !s.done) {
            return (
              <li key={s.key}>
                <Link to={s.to} className={cls}>
                  {inner}
                </Link>
              </li>
            );
          }
          return (
            <li key={s.key}>
              <button
                type="button"
                onClick={s.onClick}
                disabled={s.done}
                className={cls}
              >
                {inner}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
