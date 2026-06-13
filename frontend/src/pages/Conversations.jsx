import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, MessageSquare, Trash2, Globe, Sparkles, Headphones, TrendingUp, Users, Megaphone, BarChart3, Cog, Scale, DollarSign } from "lucide-react";
import { toast } from "sonner";

const ICON = { Headphones, TrendingUp, Users, Megaphone, BarChart3, Cog, Scale, DollarSign, Sparkles };

function formatTs(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch { return iso; }
}

export default function Conversations() {
  const [items, setItems] = useState(null);
  const [agents, setAgents] = useState([]);
  const [agentFilter, setAgentFilter] = useState("__all__");
  const [sourceFilter, setSourceFilter] = useState("__all__");
  const [search, setSearch] = useState("");
  const nav = useNavigate();

  const load = async () => {
    const params = {};
    if (agentFilter !== "__all__") params.agent_id = agentFilter;
    if (sourceFilter !== "__all__") params.source = sourceFilter;
    const [{ data }, { data: agentList }] = await Promise.all([
      api.get("/conversations", { params }),
      api.get("/agents"),
    ]);
    setItems(data.conversations);
    setAgents(agentList);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = {};
        if (agentFilter !== "__all__") params.agent_id = agentFilter;
        if (sourceFilter !== "__all__") params.source = sourceFilter;
        const [{ data }, { data: agentList }] = await Promise.all([
          api.get("/conversations", { params }),
          api.get("/agents"),
        ]);
        if (cancelled) return;
        setItems(data.conversations);
        setAgents(agentList);
      } catch (err) {
        if (!cancelled) console.error("Conversations load failed:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [agentFilter, sourceFilter]);

  const exportOne = async (convId) => {
    try {
      const { data } = await api.get(`/conversations/${convId}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conversation-${convId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported");
    } catch (err) { toast.error("Export failed"); }
  };

  const deleteOne = async (convId) => {
    if (!window.confirm("Delete this conversation? This cannot be undone.")) return;
    try {
      await api.delete(`/conversations/${convId}`);
      toast.success("Deleted");
      load();
    } catch (err) { toast.error("Delete failed"); }
  };

  const filtered = (items || []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.last_preview || "").toLowerCase().includes(q) ||
      (c.customer_name || "").toLowerCase().includes(q) ||
      (c.agent?.name || "").toLowerCase().includes(q)
    );
  });

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 lg:px-12 py-10 lg:py-14">
        <div className="mb-10">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// conversations</div>
          <h1 className="font-display font-medium text-4xl lg:text-5xl tracking-tighter">Conversation history.</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Every chat across every agent &mdash; internal and embedded. Filter, search, and export.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <Input
            data-testid="conv-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages, customers, agents…"
            className="h-10 border-border rounded-md md:max-w-sm"
          />
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger data-testid="conv-agent-filter" className="h-10 w-full md:w-56 border-border rounded-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All agents</SelectItem>
              {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger data-testid="conv-source-filter" className="h-10 w-full md:w-40 border-border rounded-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All channels</SelectItem>
              <SelectItem value="internal">Internal</SelectItem>
              <SelectItem value="embed">Embed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {items === null ? (
          <div className="font-mono text-xs text-muted-foreground" data-testid="conv-loading">loading…</div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-border p-12 text-center" data-testid="conv-empty">
            <MessageSquare className="size-8 mx-auto mb-4 text-muted-foreground" strokeWidth={1.5} />
            <div className="font-display font-medium text-xl mb-2">No conversations yet.</div>
            <p className="text-sm text-muted-foreground">Start a chat or enable an embed to see threads here.</p>
          </div>
        ) : (
          <div className="border border-border bg-white divide-y divide-border" data-testid="conv-list">
            {filtered.map((c) => {
              const Icon = ICON[c.agent?.icon] || Sparkles;
              return (
                <div key={c.id} data-testid={`conv-row-${c.id}`} className="p-4 lg:p-5 hover:bg-muted/30 transition-colors flex items-start gap-4">
                  <div className="size-9 border border-border grid place-items-center shrink-0">
                    <Icon className="size-4" strokeWidth={1.5} />
                  </div>
                  <button
                    onClick={() => nav(`/chat/${c.agent_id}`)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-display font-medium tracking-tight truncate">{c.agent?.name || "Agent"}</span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground truncate">{c.customer_name}</span>
                      {c.source === "embed" && (
                        <span className="font-mono text-[10px] uppercase tracking-widest text-foreground border border-border px-1.5 py-0.5 inline-flex items-center gap-1">
                          <Globe className="size-2.5" strokeWidth={1.5} /> embed
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-1">{c.last_preview || "(empty)"}</div>
                    <div className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80 flex items-center gap-3">
                      <span>{c.message_count || 0} msgs</span>
                      <span>{formatTs(c.updated_at)}</span>
                    </div>
                  </button>
                  <div className="flex gap-1 shrink-0">
                    <Button data-testid={`conv-export-${c.id}`} variant="ghost" size="sm" onClick={() => exportOne(c.id)} aria-label="Export">
                      <Download className="size-4" strokeWidth={1.5} />
                    </Button>
                    <Button data-testid={`conv-delete-${c.id}`} variant="ghost" size="sm" onClick={() => deleteOne(c.id)} aria-label="Delete">
                      <Trash2 className="size-4" strokeWidth={1.5} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
