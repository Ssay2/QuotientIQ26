import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Clock, X } from "lucide-react";

/**
 * Top-of-app trial banner. Shows when the user is on the free plan with N days left.
 * Hides after they upgrade, when trial is healthy (>=7 days left), or when dismissed for the session.
 */
export default function TrialBanner() {
  const { user } = useAuth();
  const [info, setInfo] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api.get("/billing/me")
      .then(({ data }) => { if (!cancelled) setInfo(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  if (!user || !info || dismissed) return null;
  if (info.plan && info.plan !== "free") return null;

  const days = info.trial_days_remaining ?? 0;
  if (days >= 7) return null;

  const expired = days <= 0;
  const bg = expired ? "bg-destructive text-destructive-foreground" : "bg-foreground text-background";

  return (
    <div className={`${bg} px-4 py-2.5 flex items-center justify-between gap-3`} data-testid="trial-banner">
      <div className="flex items-center gap-2 text-sm">
        <Clock className="size-4 shrink-0" strokeWidth={1.5} />
        <span className="truncate">
          {expired
            ? "Your free trial has ended. Upgrade to keep your AI workforce running."
            : `${days} day${days === 1 ? "" : "s"} left in your free trial.`}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          to="/billing"
          data-testid="trial-banner-upgrade"
          className="text-xs font-mono uppercase tracking-widest underline underline-offset-4 hover:opacity-80"
        >
          Upgrade
        </Link>
        <button
          data-testid="trial-banner-dismiss"
          onClick={() => setDismissed(true)}
          className="opacity-70 hover:opacity-100"
          aria-label="Dismiss"
        >
          <X className="size-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
