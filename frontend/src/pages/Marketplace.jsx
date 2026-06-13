import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Headphones, TrendingUp, Users, Megaphone, BarChart3, Cog, Scale, DollarSign, Sparkles, Plus, Building2 } from "lucide-react";
import { toast } from "sonner";

const ICON = { Headphones, TrendingUp, Users, Megaphone, BarChart3, Cog, Scale, DollarSign, Sparkles };
const CATEGORIES = ["All", "Customer Service", "Sales", "Marketing", "HR", "Finance", "Operations", "Legal"];

export default function Marketplace() {
  const [items, setItems] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [cat, setCat] = useState("All");
  const [installing, setInstalling] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get("/marketplace"), api.get("/industries")])
      .then(([m, i]) => { if (!cancelled) { setItems(m.data); setIndustries(i.data); } })
      .catch((err) => { if (!cancelled) console.error("Marketplace load failed:", err); });
    return () => { cancelled = true; };
  }, []);

  const install = async (id) => {
    setInstalling(id);
    try {
      const { data } = await api.post(`/marketplace/install/${id}`);
      toast.success(`${data.name} hired`);
      nav(`/chat/${data.id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to install");
    } finally { setInstalling(null); }
  };

  const installIndustry = async (id) => {
    setInstalling(`industry-${id}`);
    try {
      const { data } = await api.post(`/industries/${id}/install`);
      toast.success(`Hired ${data.agents_created} agents`);
      nav("/dashboard");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to install");
    } finally { setInstalling(null); }
  };

  const filtered = cat === "All" ? items : items.filter((i) => i.category === cat);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 lg:px-12 py-10 lg:py-14">
        <div className="mb-12">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// marketplace</div>
          <h1 className="font-display font-medium text-4xl lg:text-5xl tracking-tighter">Agent Marketplace</h1>
          <p className="mt-3 text-muted-foreground">Install specialists like apps. Custom AI employees, ready in seconds.</p>
        </div>

        {industries.length > 0 && (
          <div className="mb-14" data-testid="industries-section">
            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">// industry workforces</div>
                <h2 className="font-display font-medium text-2xl tracking-tight">Hire a complete team in one click.</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border" data-testid="industries-grid">
              {industries.map((ind) => (
                <div key={ind.id} className="bg-white p-6 flex flex-col" data-testid={`industry-card-${ind.id}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="size-10 border border-border grid place-items-center"><Building2 className="size-5" strokeWidth={1.5} /></div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{ind.agent_count} agents</span>
                  </div>
                  <div className="font-display font-medium text-lg tracking-tight">{ind.name}</div>
                  <p className="text-sm text-muted-foreground mt-2 flex-1">{ind.tagline}</p>
                  <Button
                    data-testid={`install-industry-${ind.id}`}
                    onClick={() => installIndustry(ind.id)}
                    disabled={installing === `industry-${ind.id}`}
                    className="mt-6 bg-black text-white hover:bg-black/90 rounded-md gap-2"
                  >
                    {installing === `industry-${ind.id}` ? "Hiring…" : (<><Plus className="size-3.5" strokeWidth={2} /> Hire workforce</>)}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category filter */}
        <div className="flex gap-px bg-border border border-border mb-8 overflow-x-auto" data-testid="category-filter">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              data-testid={`cat-${c}`}
              onClick={() => setCat(c)}
              className={`px-5 py-3 text-xs font-mono uppercase tracking-widest shrink-0 transition-all ${cat === c ? "bg-black text-white" : "bg-white text-foreground/70 hover:bg-muted/40"}`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border" data-testid="marketplace-grid">
          {filtered.map((m) => {
            const Icon = ICON[m.icon] || Sparkles;
            return (
              <div key={m.id} className="bg-white p-6 flex flex-col group hover:bg-muted/30 transition-all">
                <div className="flex items-start justify-between mb-6">
                  <div className="size-10 border border-border grid place-items-center group-hover:bg-black group-hover:border-black group-hover:text-white transition-all">
                    <Icon className="size-5" strokeWidth={1.5} />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{m.category}</span>
                </div>
                <div className="font-display font-medium text-lg tracking-tight">{m.name}</div>
                <p className="text-sm text-muted-foreground mt-2 flex-1">{m.description}</p>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-3">{m.tagline}</div>
                <Button
                  data-testid={`install-${m.id}`}
                  onClick={() => install(m.id)}
                  disabled={installing === m.id}
                  className="mt-6 bg-black text-white hover:bg-black/90 rounded-md gap-2"
                >
                  {installing === m.id ? "Hiring…" : (<><Plus className="size-3.5" strokeWidth={2} /> Hire agent</>)}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
