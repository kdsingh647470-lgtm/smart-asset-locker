import { Link } from "@tanstack/react-router";
import { APP_VERSION } from "@/lib/app-version";

export function LegalFooter() {
  return (
    <footer className="mt-10 border-t border-border px-5 py-6 text-center text-[11px] text-text-muted">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <Link to="/privacy" className="hover:text-text-secondary">Privacy</Link>
        <span aria-hidden>·</span>
        <Link to="/terms" className="hover:text-text-secondary">Terms</Link>
        <span aria-hidden>·</span>
        <Link to="/data-safety" className="hover:text-text-secondary">Data safety</Link>
        <span aria-hidden>·</span>
        <Link to="/support" className="hover:text-text-secondary">Support</Link>
      </div>
      <p className="mt-2">
        © {new Date().getFullYear()} GharLog · v{APP_VERSION}
      </p>
    </footer>
  );
}
