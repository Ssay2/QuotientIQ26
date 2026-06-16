import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { Headphones, TrendingUp, Megaphone, BarChart3, Cog, Scale, DollarSign, Users, Sparkles, Crown, MessageSquare, Zap, ArrowRight } from "lucide-react";

const ICON = { Headphones, TrendingUp, Megaphone, BarChart3, Cog, Scale, DollarSign, Users, Sparkles, Crown };

function healthColor(h) {
  if (h >= 85) return "bg-emerald-500";
  if (h >= 65) return "bg-amber-500";
  return "bg-rose-500";
}

export default function AIWorkforce() {
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let c = false;
    Promise.all([api.get("/chief"), api.get("/analytics/summary")])
      .then(([d, s]) => { if (!c) { setData(d.data); setStats(s.data); } })
      .catch(() => {});
    return () => { c = true; };
  }, []);

  if (!data) return <AppShell><div className="p-10 font-mono text-xs text-muted-foreground">loading…</div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 lg:px-12 py-10 lg:py-14">
        <div className="mb-8">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// the org</div>
          <h1 className="font-display font-medium text-4xl tracking-tighter">AI Workforce</h1>
          <p className="mt-2 text-muted-foreground">Every agent, every department, every health score in one place.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border mb-10">
          <div className="bg-card p-5"><div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Workforce size</div><div className="font-display text-3xl tracking-tighter mt-1">{data.workforce_size}</div></div>
          <div className="bg-card p-5"><div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Active</div><div className="font-display text-3xl tracking-tighter mt-1">{stats?.active_agents ?? 0}</div></div>
          <div className="bg-card p-5"><div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Tasks completed</div><div className="font-display text-3xl tracking-tighter mt-1">{stats?.tasks_completed ?? 0}</div></div>
          <div className="bg-card p-5"><div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Hours saved</div><div className="font-display text-3xl tracking-tighter mt-1">{stats?.hours_saved ?? 0}</div></div>
        </div>

        {/* Departments tree */}
        <h2 className="font-display font-medium text-2xl tracking-tight mb-4">Departments</h2>
        <div className="space-y-4 mb-12">
          {Object.entries(data.departments || {}).map(([dept, members]) => (
            <div key={dept} data-testid={`workforce-dept-${dept}`} className="border border-border bg-card rounded-md p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-display font-medium">{dept}</div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{members.length} members</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {members.map((m) => {
                  const Icon = ICON[m.icon] || Sparkles;
                  return (
                    <Link key={m.id} to={`/chat/${m.id}`} className="flex items-center gap-3 border border-border rounded-md p-3 hover:bg-accent transition-colors">
                      <div className="size-9 grid place-items-center border border-border rounded-md"><Icon className="size-4" strokeWidth={1.5} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{m.name}</div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">view chat</div>
                      </div>
                      <ArrowRight className="size-3 text-muted-foreground" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Agent health */}
        <h2 className="font-display font-medium text-2xl tracking-tight mb-4">Top performers</h2>
        <div className="border border-border bg-card rounded-md divide-y divide-border" data-testid="agent-health-list">
          {(stats?.agent_health || []).map((a) => {
            const Icon = ICON[a.icon] || Sparkles;
            return (
              <Link key={a.id} to={`/chat/${a.id}`} className="flex items-center gap-3 p-4 hover:bg-accent transition-colors">
                <div className="size-9 grid place-items-center border border-border rounded-md"><Icon className="size-4" strokeWidth={1.5} /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{a.name}</div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{a.category}</div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Zap className="size-3.5" /> {a.replies} replies
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MessageSquare className="size-3.5" /> {a.messages} msgs
                </div>
                <div className="w-32 hidden md:block">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${healthColor(a.health)}`} style={{ width: `${a.health}%` }} />
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">{a.health}%</span>
                  </div>
                </div>
              </Link>
            );
          })}
          {(!stats?.agent_health || stats.agent_health.length === 0) && (
            <div className="p-6 text-center text-xs text-muted-foreground font-mono">No agents to score yet.</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
