import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Headphones, TrendingUp, Users, Megaphone, BarChart3, Cog, Scale, DollarSign,
  Plus, MessageSquare, Clock, Sparkles, Zap, ArrowRight, Crown, Activity as ActivityIcon, Briefcase,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/EmptyState";

const ICON = { Headphones, TrendingUp, Users, Megaphone, BarChart3, Cog, Scale, DollarSign, Sparkles, Crown };

function healthColor(h) {
  if (h >= 85) return "bg-emerald-500";
  if (h >= 65) return "bg-amber-500";
  return "bg-rose-500";
}

function StatTile({ k, v, sub, icon: Icon }) {
  return (
    <div className="bg-card p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
        <Icon className="size-4 text-foreground/40" strokeWidth={1.5} />
      </div>
      <div className="font-display font-medium text-3xl lg:text-4xl tracking-tighter">{v}</div>
      <div className="mt-2 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, s] = await Promise.all([api.get("/agents"), api.get("/analytics/summary")]);
        if (cancelled) return;
        setAgents(a.data);
        setStats(s.data);
      } catch (err) {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10 lg:py-14">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// my workforce</div>
            <h1 className="font-display font-medium text-4xl lg:text-5xl tracking-tighter">Welcome, {user?.name?.split(" ")[0] || "there"}.</h1>
            <p className="mt-3 text-muted-foreground">Your AI workforce, working while you sleep.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/chief"><Button variant="outline" data-testid="chief-shortcut" className="rounded-md h-11 px-5 gap-2"><Crown className="size-4" strokeWidth={1.5} /> Chief of Staff</Button></Link>
            <Link to="/marketplace"><Button data-testid="hire-agent-btn" className="bg-foreground text-background hover:bg-foreground/90 rounded-md h-11 px-5 gap-2"><Plus className="size-4" strokeWidth={2} /> Hire AI Employee</Button></Link>
          </div>
        </div>

        {/* Stats — Cost savings, Hours saved, Active agents, Tasks */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-border border border-border mb-12" data-testid="dashboard-stats">
          <StatTile k="Cost savings" v={`$${stats?.cost_saved ?? 0}`} sub="vs. human-only" icon={DollarSign} />
          <StatTile k="Hours saved" v={stats?.hours_saved ?? 0} sub="this period" icon={Clock} />
          <StatTile k="Active agents" v={stats?.active_agents ?? 0} sub={`of ${stats?.agents ?? 0} total`} icon={Sparkles} />
          <StatTile k="Tasks completed" v={stats?.tasks_completed ?? 0} sub="AI replies served" icon={Zap} />
          <StatTile k="Performance" v={`${stats?.performance_score ?? 0}%`} sub="resolution score" icon={TrendingUp} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* Recent conversations */}
          <div className="lg:col-span-2 border border-border bg-card rounded-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">// recent activity</div>
                <h2 className="font-display font-medium text-lg tracking-tight mt-1">Recent conversations</h2>
              </div>
              <Link to="/conversations" className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                View all <ArrowRight className="size-3" />
              </Link>
            </div>
            <div className="divide-y divide-border" data-testid="recent-conversations">
              {(stats?.recent_conversations || []).length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground font-mono">No conversations yet.</div>
              ) : (
                stats.recent_conversations.map((c) => (
                  <Link key={c.id} to={`/conversations`} className="flex items-start gap-3 p-4 hover:bg-accent/40">
                    <div className="size-8 grid place-items-center border border-border rounded-md shrink-0"><MessageSquare className="size-4" strokeWidth={1.5} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-sm font-medium truncate">{c.agent_name} <span className="text-muted-foreground">· {c.customer}</span></div>
                        <div className="text-[10px] font-mono text-muted-foreground shrink-0">{(c.updated_at || "").slice(11, 16)}</div>
                      </div>
                      {c.preview && <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{c.preview}</div>}
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{c.msg_count} msgs</div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Agent health */}
          <div className="border border-border bg-card rounded-md">
            <div className="p-5 border-b border-border">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">// performance</div>
              <h2 className="font-display font-medium text-lg tracking-tight mt-1">Agent health</h2>
            </div>
            <div className="divide-y divide-border" data-testid="agent-health">
              {(stats?.agent_health || []).length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground font-mono">No data yet.</div>
              ) : (
                stats.agent_health.slice(0, 6).map((a) => {
                  const Icon = ICON[a.icon] || Sparkles;
                  return (
                    <Link key={a.id} to={`/chat/${a.id}`} className="block p-4 hover:bg-accent/40">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
                        <div className="text-sm font-medium truncate flex-1">{a.name}</div>
                        <span className="font-mono text-[10px] text-muted-foreground">{a.health}%</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${healthColor(a.health)}`} style={{ width: `${a.health}%` }} />
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
          {[
            { to: "/workforce", label: "AI Workforce", icon: Users },
            { to: "/industries", label: "Industries", icon: Briefcase },
            { to: "/activity", label: "Activity feed", icon: ActivityIcon },
            { to: "/help", label: "Help center", icon: Sparkles },
          ].map((l) => (
            <Link key={l.to} to={l.to} data-testid={`quick-${l.to.slice(1)}`} className="border border-border bg-card rounded-md p-4 hover:bg-accent transition-colors flex items-center gap-3">
              <div className="size-8 grid place-items-center border border-border rounded-md"><l.icon className="size-4" strokeWidth={1.5} /></div>
              <div className="text-sm font-medium">{l.label}</div>
              <ArrowRight className="size-3 ml-auto text-muted-foreground" />
            </Link>
          ))}
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
          <EmptyState
            icon={Sparkles}
            title="No employees yet."
            description="Browse the marketplace to hire your first AI employee."
            action={<Link to="/marketplace"><Button className="bg-foreground text-background">Go to marketplace</Button></Link>}
            testid="empty-agents"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border" data-testid="agents-grid">
            {agents.map((a) => {
              const Icon = ICON[a.icon] || Sparkles;
              return (
                <Link key={a.id} to={`/chat/${a.id}`} data-testid={`agent-card-${a.id}`} className="bg-card p-6 hover:bg-accent transition-all duration-200 group">
                  <div className="flex items-start justify-between mb-6">
                    <div className="size-10 border border-border grid place-items-center group-hover:bg-foreground group-hover:text-background transition-all">
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
