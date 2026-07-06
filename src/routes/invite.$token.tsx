import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { acceptHouseholdInvite } from "@/lib/household.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({
    meta: [
      { title: "Join a GharLog household" },
      { name: "description", content: "Accept your invitation to a shared home inventory." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvitePage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-center text-sm text-text-muted">Something went wrong: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6 text-center text-sm text-text-muted">Invite not found.</div>,
});

function InvitePage() {
  const { token } = Route.useParams();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!session) {
      // Preserve intent, send to auth
      try {
        sessionStorage.setItem("gharlog:pending-invite", token);
      } catch { /* ignore */ }
      navigate({ to: "/auth" });
      return;
    }
    if (state !== "idle") return;
    setState("working");
    acceptHouseholdInvite({ data: { token } })
      .then((res) => {
        setMessage(res.message);
        if (res.ok) {
          setState("done");
          toast.success("Household joined", { description: res.message });
          setTimeout(() => navigate({ to: "/" }), 1200);
        } else {
          setState("error");
        }
      })
      .catch((e) => {
        setState("error");
        setMessage((e as Error).message);
      });
  }, [loading, session, token, navigate, state]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-lg font-semibold">Joining household…</h1>
      <p className="text-sm text-text-muted">
        {state === "working" && "Accepting your invite."}
        {state === "done" && message}
        {state === "error" && message}
        {state === "idle" && "Preparing…"}
      </p>
      {state === "error" && (
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="mt-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground"
        >
          Go home
        </button>
      )}
    </div>
  );
}
