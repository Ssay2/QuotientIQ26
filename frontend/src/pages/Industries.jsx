import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Briefcase, Check, AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export default function Industries() {
  const [items, setItems] = useState([]);
  const [installing, setInstalling] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let c = false;
    api.get("/industries").then(({ data }) => { if (!c) setItems(data || []); }).catch(() => {}).finally(() => { if (!c) setLoading(false); });
    return () => { c = true; };
  }, []);

  const install = async (id, force = false) => {
    setInstalling(id);
    try {
      const url = force ? `/industries/${id}/install?force=true` : `/industries/${id}/install`;
      const { data } = await api.post(url);
      toast.success(`Installed ${data.agents_created} agents`);
    } catch (err) {
      if (err?.response?.status === 409) {
        if (window.confirm("This workforce is already installed. Install a duplicate set?")) install(id, true);
      } else if (err?.response?.status === 402) {
        toast.error("Trial ended — upgrade to install.");
      } else {
        toast.error(err?.response?.data?.detail || "Failed");
      }
    } finally { setInstalling(null); }
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 lg:px-12 py-10 lg:py-14">
        <div className="mb-8">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// industry workforces</div>
          <h1 className="font-display font-medium text-4xl lg:text-5xl tracking-tighter">Pre-built Workforces</h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">One click and a tuned team of AI employees is in your account, ready to chat.</p>
        </div>

        {loading ? (
          <div className="font-mono text-xs text-muted-foreground">loading…</div>
        ) : items.length === 0 ? (
          <EmptyState icon={Briefcase} title="No workforces" description="Try again later." testid="empty-industries" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border" data-testid="industries-grid">
            {items.map((i) => (
              <div key={i.id} data-testid={`industry-${i.id}`} className="bg-card p-6 lg:p-8 flex flex-col">
                <div className="size-10 border border-border grid place-items-center mb-5">
                  <Briefcase className="size-5" strokeWidth={1.5} />
                </div>
                <div className="font-display font-medium text-xl tracking-tight">{i.name}</div>
                <p className="text-sm text-muted-foreground mt-2 flex-1">{i.tagline}</p>
                <div className="flex items-center gap-2 mt-4 mb-5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span>{i.agent_count} agents</span>
                  <span>•</span>
                  <span>company profile included</span>
                </div>
                <Button
                  data-testid={`install-${i.id}`}
                  onClick={() => install(i.id)}
                  disabled={installing === i.id}
                  className="bg-foreground text-background gap-2 w-full"
                >
                  {installing === i.id ? "Installing…" : <><Check className="size-4" /> Install workforce</>}
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 border border-amber-500/30 bg-amber-500/5 rounded-md p-5 flex gap-3">
          <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="text-sm">
            More verticals coming soon: <strong>SaaS</strong>, <strong>E-commerce</strong>, <strong>Agencies</strong>, <strong>Healthcare</strong>, <strong>Finance</strong>. Need one now? Use the Builder.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
