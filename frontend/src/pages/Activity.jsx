import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { Activity as ActivityIcon, Bell, Shield, FileText, CreditCard, MessageSquare, Users, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

const ICON_FOR = {
  "agent.create": Sparkles,
  "agent.task": Sparkles,
  "team.invite": Users,
  "team.remove": Users,
  "knowledge.upload": FileText,
  "industry.install": Sparkles,
  "billing": CreditCard,
  "password.change": Shield,
  "profile.update": Shield,
  "api_key.create": Shield,
  "api_key.revoke": Shield,
  "conversation.new": MessageSquare,
};

function rel(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function Activity() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let c = false;
    api.get("/activity", { params: { limit: 100 } })
      .then(({ data }) => { if (!c) setItems(data.items || []); })
      .catch(() => {})
      .finally(() => { if (!c) setLoading(false); });
    return () => { c = true; };
  }, []);

  const filtered = items.filter((i) => filter === "all" ? true : i.kind === filter);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 lg:px-12 py-10 lg:py-14">
        <div className="mb-6">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// activity</div>
          <h1 className="font-display font-medium text-4xl tracking-tighter">Activity Feed</h1>
          <p className="mt-2 text-muted-foreground">Everything that's happened in your workspace.</p>
        </div>

        <div className="flex gap-2 mb-6">
          {[
            { k: "all", label: "All" },
            { k: "notification", label: "Notifications" },
            { k: "audit", label: "Audit events" },
          ].map((f) => (
            <button key={f.k} data-testid={`filter-${f.k}`} onClick={() => setFilter(f.k)}
              className={`text-xs font-mono uppercase tracking-widest px-3 py-1.5 rounded-md border ${filter === f.k ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/40"}`}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="font-mono text-xs text-muted-foreground">loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={ActivityIcon} title="No activity yet" description="Once your team starts using the platform, events will show up here." testid="empty-activity" />
        ) : (
          <div className="border border-border bg-card rounded-md divide-y divide-border" data-testid="activity-list">
            {filtered.map((it) => {
              const Icon = ICON_FOR[it.action || it.type] || (it.kind === "notification" ? Bell : ActivityIcon);
              return (
                <div key={it.id} data-testid={`activity-${it.id}`} className="flex items-start gap-3 p-4 hover:bg-accent/40">
                  <div className="size-8 grid place-items-center border border-border rounded-md shrink-0"><Icon className="size-4" strokeWidth={1.5} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium truncate">{it.title}</div>
                      <div className="text-[10px] font-mono text-muted-foreground shrink-0">{rel(it.ts)}</div>
                    </div>
                    {it.body && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{it.body}</div>}
                    {it.metadata && Object.keys(it.metadata).length > 0 && (
                      <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {Object.entries(it.metadata).slice(0, 3).map(([k, v]) => `${k}: ${String(v).slice(0, 60)}`).join(" • ")}
                      </div>
                    )}
                    {it.link && (
                      <Link to={it.link} className="text-[11px] underline mt-1 inline-block">Open</Link>
                    )}
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground shrink-0">{it.kind}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
