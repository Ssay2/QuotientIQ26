import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { DollarSign, Clock, Zap, MessageSquare, TrendingUp } from "lucide-react";

export default function Analytics() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get("/analytics/summary")
      .then(({ data }) => { if (!cancelled) setStats(data); })
      .catch((err) => { if (!cancelled) console.error("Analytics load failed:", err); });
    return () => { cancelled = true; };
  }, []);

  const tiles = [
    { k: "Tasks completed", v: stats?.tasks_completed ?? 0, icon: Zap, sub: "AI replies served" },
    { k: "Hours saved", v: stats?.hours_saved ?? 0, icon: Clock, sub: "vs human-only" },
    { k: "Cost saved", v: `$${stats?.cost_saved ?? 0}`, icon: DollarSign, sub: "this period" },
    { k: "Conversations", v: stats?.conversations ?? 0, icon: MessageSquare, sub: "total threads" },
    { k: "Performance", v: `${stats?.performance_score ?? 0}%`, icon: TrendingUp, sub: "resolution score" },
  ];

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 lg:px-12 py-10 lg:py-14">
        <div className="mb-12">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// analytics</div>
          <h1 className="font-display font-medium text-4xl lg:text-5xl tracking-tighter">Workforce performance.</h1>
          <p className="mt-3 text-muted-foreground">A live readout of your AI workforce&apos;s impact.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border border border-border mb-10" data-testid="analytics-tiles">
          {tiles.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.k} className="bg-white p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{s.k}</div>
                  <Icon className="size-4 text-foreground/40" strokeWidth={1.5} />
                </div>
                <div className="font-display font-medium text-3xl tracking-tighter">{s.v}</div>
                <div className="mt-2 text-xs text-muted-foreground">{s.sub}</div>
              </div>
            );
          })}
        </div>

        <div className="border border-border bg-white p-6 lg:p-8" data-testid="chart-container">
          <div className="mb-6">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">// daily activity</div>
            <h2 className="font-display font-medium text-2xl tracking-tight">AI replies over time</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.series || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
                <XAxis dataKey="date" stroke="#737373" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#737373" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid #0A0A0A", color: "#fff", fontSize: 12 }} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="count" fill="#0A0A0A" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {(!stats?.series || stats.series.length === 0) && (
            <div className="text-center py-12 text-sm text-muted-foreground" data-testid="empty-chart">
              No activity yet. Start chatting with your agent to populate this chart.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
