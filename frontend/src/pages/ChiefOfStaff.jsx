import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, Send, Loader2, ArrowRight, Headphones, TrendingUp, Megaphone, BarChart3, Cog, Scale, DollarSign, Users } from "lucide-react";
import { MarkdownMessage } from "@/components/chat/MarkdownMessage";

const ICON = { Headphones, TrendingUp, Megaphone, BarChart3, Cog, Scale, DollarSign, Users, Sparkles, Crown };

export default function ChiefOfStaff() {
  const [data, setData] = useState(null);
  const [task, setTask] = useState("");
  const [reply, setReply] = useState("");
  const [delegations, setDelegations] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let c = false;
    api.get("/chief").then(({ data }) => { if (!c) setData(data); }).catch(() => {});
    return () => { c = true; };
  }, []);

  const route = async () => {
    if (!task.trim() || busy) return;
    setBusy(true); setReply(""); setDelegations([]);
    try {
      const { data } = await api.post("/chief/route", { task });
      setReply(data.reply || "");
      setDelegations(data.delegations || []);
    } catch (err) {
      setReply("(Routing failed — try again.)");
    } finally { setBusy(false); }
  };

  if (!data) return <AppShell><div className="p-10 font-mono text-xs text-muted-foreground">loading…</div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 lg:px-12 py-10 lg:py-14">
        <div className="flex items-center gap-3 mb-8">
          <div className="size-12 bg-foreground text-background grid place-items-center"><Crown className="size-6" strokeWidth={1.5} /></div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">// command center</div>
            <h1 className="font-display font-medium text-3xl tracking-tighter">{data.chief.name}</h1>
            <p className="text-sm text-muted-foreground">{data.chief.description}</p>
          </div>
        </div>

        {/* Workforce overview */}
        <div className="grid grid-cols-3 gap-px bg-border border border-border mb-10">
          <div className="bg-card p-5"><div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Workforce size</div><div className="font-display text-3xl tracking-tighter mt-1">{data.workforce_size}</div></div>
          <div className="bg-card p-5"><div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Departments</div><div className="font-display text-3xl tracking-tighter mt-1">{Object.keys(data.departments || {}).length}</div></div>
          <div className="bg-card p-5"><div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Conversations</div><div className="font-display text-3xl tracking-tighter mt-1">{data.conversations}</div></div>
        </div>

        {/* Task router */}
        <div className="border border-border bg-card rounded-md p-6 mb-10">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// route a task</div>
          <div className="flex gap-2">
            <textarea
              data-testid="chief-task"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Give me a task… e.g. 'Draft a Q4 sales campaign for HVAC homeowners'"
              rows={2}
              className="flex-1 px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-foreground bg-background"
            />
            <Button data-testid="chief-route-btn" onClick={route} disabled={busy || !task.trim()} className="bg-foreground text-background gap-2 self-start">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" strokeWidth={1.5} />} Route
            </Button>
          </div>
          {reply && (
            <div className="mt-5 border-t border-border pt-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">// chief's plan</div>
              <div className="prose prose-sm max-w-none" data-testid="chief-reply">
                <MarkdownMessage content={reply} />
              </div>
              {delegations.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {delegations.map((d, i) => (
                    <span key={i} className="text-[10px] font-mono uppercase tracking-widest border border-border px-2 py-1 rounded">
                      → {d.agent}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Departments */}
        <div className="mb-6">
          <h2 className="font-display font-medium text-2xl tracking-tight">Departments</h2>
          <p className="text-sm text-muted-foreground mt-1">Specialists grouped by function.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(data.departments || {}).map(([dept, members]) => (
            <div key={dept} data-testid={`dept-${dept}`} className="border border-border bg-card rounded-md p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-display font-medium">{dept}</div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{members.length}</span>
              </div>
              <div className="space-y-2">
                {members.map((m) => {
                  const Icon = ICON[m.icon] || Sparkles;
                  return (
                    <Link key={m.id} to={`/chat/${m.id}`} className="flex items-center gap-2 text-sm hover:underline">
                      <Icon className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
                      <span className="truncate">{m.name}</span>
                      <ArrowRight className="size-3 ml-auto text-muted-foreground" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
