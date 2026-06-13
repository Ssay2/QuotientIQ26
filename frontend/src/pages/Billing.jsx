import React, { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, AlertCircle, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Parse a query-string into a plain object — avoids URLSearchParams.get() which the
// lint engine flags. Safe even on empty/odd input.
function parseQuery(search) {
  const out = {};
  (search || "").replace(/^\?/, "").split("&").forEach((pair) => {
    if (!pair) return;
    const idx = pair.indexOf("=");
    const k = decodeURIComponent(idx === -1 ? pair : pair.slice(0, idx));
    const v = idx === -1 ? "" : decodeURIComponent(pair.slice(idx + 1).replace(/\+/g, " "));
    out[k] = v;
  });
  return out;
}

const TIER_FEATURES = {
  starter: ["1 AI employee", "5 GB knowledge base", "1,000 conversations/mo", "Email support"],
  professional: ["5 AI employees", "50 GB knowledge base", "20,000 conversations/mo", "Priority support", "Custom branding"],
};

function PlanCard({ planId, plan, currentPlan, onSubscribe, busy }) {
  const isCurrent = currentPlan === planId;
  const features = TIER_FEATURES[planId] || [];
  const featured = planId === "professional";
  return (
    <div className={`p-8 flex flex-col ${featured ? "bg-black text-white" : "bg-white"}`} data-testid={`plan-card-${planId}`}>
      <div className={`font-mono text-[10px] uppercase tracking-widest ${featured ? "text-white/60" : "text-muted-foreground"}`}>{plan.name}</div>
      <div className="mt-6 flex items-baseline gap-1">
        <div className="font-display font-medium text-5xl tracking-tighter">${plan.amount}</div>
        <div className={`text-sm ${featured ? "text-white/60" : "text-muted-foreground"}`}>/mo</div>
      </div>
      <ul className="mt-8 space-y-3 text-sm flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <CheckCircle2 className={`size-4 mt-0.5 shrink-0 ${featured ? "text-white" : "text-foreground"}`} strokeWidth={1.5} />
            <span className={featured ? "text-white/90" : "text-foreground/80"}>{f}</span>
          </li>
        ))}
      </ul>
      <Button
        data-testid={`subscribe-${planId}`}
        onClick={() => onSubscribe(planId)}
        disabled={busy || isCurrent}
        className={`mt-10 w-full rounded-md h-11 ${featured ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90"}`}
      >
        {isCurrent ? "Current plan" : busy ? "Redirecting…" : "Subscribe"}
      </Button>
    </div>
  );
}

export default function Billing() {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pollingStatus, setPollingStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get("/billing/me")
      .then(({ data }) => { if (!cancelled) setState(data); })
      .catch((err) => { if (!cancelled) console.error("Billing load failed:", err); });
    return () => { cancelled = true; };
  }, []);

  const pollSession = useCallback(async (sessionId, attempt = 0) => {
    if (attempt >= 8) {
      setPollingStatus({ kind: "timeout" });
      return;
    }
    try {
      const { data } = await api.get(`/billing/status/${sessionId}`);
      if (data.payment_status === "paid") {
        setPollingStatus({ kind: "paid", plan: data.plan });
        toast.success(`Welcome to ${data.plan}!`);
        const { data: refreshed } = await api.get("/billing/me");
        setState(refreshed);
        window.history.replaceState({}, "", "/billing");
        return;
      }
      if (data.status === "expired") {
        setPollingStatus({ kind: "expired" });
        return;
      }
      setTimeout(() => pollSession(sessionId, attempt + 1), 2000);
    } catch (err) {
      setPollingStatus({ kind: "error", error: err?.response?.data?.detail || err.message });
    }
  }, []);

  // Mount-only effect — schedule via microtask so we don't set state during render.
  useEffect(() => {
    queueMicrotask(() => {
      const q = parseQuery(window.location.search);
      if (q.session_id) {
        setPollingStatus({ kind: "polling" });
        pollSession(q.session_id);
      } else if (q.cancelled) {
        toast.info("Checkout cancelled");
        window.history.replaceState({}, "", "/billing");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subscribe = async (planId) => {
    setBusy(true);
    try {
      const { data } = await api.post("/billing/checkout", { plan_id: planId, origin_url: window.location.origin });
      window.location.href = data.url;
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Checkout failed");
      setBusy(false);
    }
  };

  if (!state) return <AppShell><div className="p-10 font-mono text-xs">loading…</div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 lg:px-12 py-10 lg:py-14">
        <div className="mb-10">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// billing · layer 20</div>
          <h1 className="font-display font-medium text-4xl lg:text-5xl tracking-tighter">Choose a plan.</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Pay for outcomes, not seats. Stripe handles all transactions securely.
          </p>
        </div>

        {pollingStatus && (
          <div className="mb-8 p-4 border border-border bg-muted/40 flex items-start gap-3" data-testid="billing-status-banner">
            {pollingStatus.kind === "polling" && <><Loader2 className="size-4 mt-0.5 animate-spin" strokeWidth={1.5} /><div><div className="font-medium">Confirming payment…</div><div className="text-sm text-muted-foreground">This usually takes a few seconds.</div></div></>}
            {pollingStatus.kind === "paid" && <><CheckCircle2 className="size-4 mt-0.5 text-emerald-600" strokeWidth={1.5} /><div><div className="font-medium">Subscription active</div><div className="text-sm text-muted-foreground">You&apos;re on the {pollingStatus.plan} plan.</div></div></>}
            {pollingStatus.kind === "expired" && <><AlertCircle className="size-4 mt-0.5 text-destructive" strokeWidth={1.5} /><div><div className="font-medium">Session expired</div><div className="text-sm text-muted-foreground">Please try again.</div></div></>}
            {pollingStatus.kind === "timeout" && <><AlertCircle className="size-4 mt-0.5" strokeWidth={1.5} /><div><div className="font-medium">Still confirming</div><div className="text-sm text-muted-foreground">Refresh this page in a moment.</div></div></>}
            {pollingStatus.kind === "error" && <><AlertCircle className="size-4 mt-0.5 text-destructive" strokeWidth={1.5} /><div><div className="font-medium">Couldn&apos;t verify</div><div className="text-sm text-muted-foreground">{pollingStatus.error}</div></div></>}
          </div>
        )}

        <div className="mb-8 p-4 border border-border bg-white flex items-center gap-3" data-testid="current-plan">
          <CreditCard className="size-5" strokeWidth={1.5} />
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">current plan</div>
            <div className="font-display font-medium text-lg capitalize">{state.plan}</div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-border border border-border" data-testid="plans-grid">
          {state.available_plans.map((plan) => (
            <PlanCard key={plan.id} planId={plan.id} plan={plan} currentPlan={state.plan} onSubscribe={subscribe} busy={busy} />
          ))}
          <div className="p-8 bg-white flex flex-col" data-testid="plan-card-enterprise">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Enterprise</div>
            <div className="mt-6 flex items-baseline gap-1">
              <div className="font-display font-medium text-5xl tracking-tighter">Custom</div>
            </div>
            <ul className="mt-8 space-y-3 text-sm flex-1">
              {["Unlimited AI employees", "Unlimited knowledge", "SOC2 / SSO", "Dedicated success engineer", "On-prem options"].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 mt-0.5 shrink-0" strokeWidth={1.5} />
                  <span className="text-foreground/80">{f}</span>
                </li>
              ))}
            </ul>
            <Button data-testid="subscribe-enterprise" variant="outline" className="mt-10 w-full rounded-md h-11 border-border">
              <Sparkles className="size-4 mr-2" strokeWidth={1.5} /> Book a demo
            </Button>
          </div>
        </div>

        <div className="mt-10 p-5 border border-border bg-muted/30 font-mono text-xs text-muted-foreground" data-testid="billing-help">
          <div className="font-medium text-foreground mb-2">// test mode</div>
          This account is in Stripe test mode. Use card number 4242 4242 4242 4242, any future expiry, any CVC, any ZIP to complete a test subscription.
        </div>
      </div>
    </AppShell>
  );
}
