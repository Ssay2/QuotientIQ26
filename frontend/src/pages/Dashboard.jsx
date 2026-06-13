import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Headphones, TrendingUp, Users, Megaphone, BarChart3, Cog, Scale, DollarSign, Plus, MessageSquare, Clock, Sparkles, Zap, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";

const ICON = { Headphones, TrendingUp, Users, Megaphone, BarChart3, Cog, Scale, DollarSign, Sparkles };

export default function Dashboard() {
  const { user } = useAuth();
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [a, s] = await Promise.all([
          api.get("/agents"),
          api.get("/analytics/summary"),
        ]);
        setAgents(a.data);
        setStats(s.data);
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 lg:px-12 py-10 lg:py-14">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// my workforce</div>
            <h1 className="font-display font-medium text-4xl lg:text-5xl tracking-tighter">Welcome, {user?.name?.split(" ")[0] || "there"}.</h1>
            <p className="mt-3 text-muted-foreground">Your AI workforce, working while you sleep.</p>
          </div>
          <Link to="/marketplace">
            <Button data-testid="hire-agent-btn" className="bg-black text-white hover:bg-black/90 rounded-md h-11 px-5 gap-2">
              <Plus className="size-4" strokeWidth={2} /> Hire an AI Employee
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border mb-12" data-testid="dashboard-stats">
          {[
            { k: "Tasks completed", v: stats?.tasks_completed ?? 0, icon: Zap, sub: "AI replies served" },
            { k: "Hours saved", v: stats?.hours_saved ?? 0, icon: Clock, sub: "vs. human-only" },
            { k: "Performance", v: `${stats?.performance_score ?? 0}%`, icon: TrendingUp, sub: "resolution score" },
            { k: "Cost savings", v: `$${stats?.cost_saved ?? 0}`, icon: DollarSign, sub: "this period" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.k} className="bg-white p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{s.k}</div>
                  <Icon className="size-4 text-foreground/40" strokeWidth={1.5} />
                </div>
                <div className="font-display font-medium text-3xl lg:text-4xl tracking-tighter">{s.v}</div>
                <div className="mt-2 text-xs text-muted-foreground">{s.sub}</div>
              </div>
            );
          })}
        </div>

        {/* Agents */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-display font-medium text-2xl tracking-tight">Your AI employees</h2>
            <p className="text-sm text-muted-foreground mt-1">Click any agent to chat or manage knowledge.</p>
          </div>
        </div>

        {loading ? (
          <div className="font-mono text-xs text-muted-foreground" data-testid="agents-loading">loading…</div>
        ) : agents.length === 0 ? (
          <div className="border border-dashed border-border p-12 text-center" data-testid="empty-agents">
            <div className="font-display font-medium text-xl mb-2">No employees yet.</div>
            <p className="text-sm text-muted-foreground mb-6">Browse the marketplace to hire your first AI employee.</p>
            <Link to="/marketplace"><Button className="bg-black text-white hover:bg-black/90">Go to marketplace</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border" data-testid="agents-grid">
            {agents.map((a) => {
              const Icon = ICON[a.icon] || Sparkles;
              return (
                <Link key={a.id} to={`/chat/${a.id}`} data-testid={`agent-card-${a.id}`} className="bg-white p-6 hover:bg-muted/30 transition-all duration-200 group">
                  <div className="flex items-start justify-between mb-6">
                    <div className="size-10 border border-border grid place-items-center group-hover:bg-black group-hover:border-black group-hover:text-white transition-all">
                      <Icon className="size-5" strokeWidth={1.5} />
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-emerald-500" /> Active
                    </span>
                  </div>
                  <div className="font-display font-medium text-lg tracking-tight">{a.name}</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{a.category}</div>
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{a.description}</p>
                  <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono">{(a.knowledge_files || []).length} docs</span>
                    <span className="inline-flex items-center gap-1 text-foreground font-medium">Chat <ArrowRight className="size-3" strokeWidth={2} /></span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
