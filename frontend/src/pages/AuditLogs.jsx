import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { History, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function formatTs(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

const ACTION_LABELS = {
  "agent.create": "Created agent",
  "team.invite": "Invited teammate",
  "team.remove": "Removed teammate",
  "industry.install": "Installed industry workforce",
  "api_key.create": "Created API key",
  "api_key.revoke": "Revoked API key",
};

export default function AuditLogs() {
  const [logs, setLogs] = useState(null);
  const [actionFilter, setActionFilter] = useState("__all__");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = actionFilter === "__all__" ? {} : { action: actionFilter };
      try {
        const { data } = await api.get("/audit-logs", { params });
        if (!cancelled) setLogs(data.logs);
      } catch (err) {
        if (!cancelled) console.error("Audit load failed:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [actionFilter]);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 lg:px-12 py-10 lg:py-14">
        <div className="mb-10">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// audit log · layer 22</div>
          <h1 className="font-display font-medium text-4xl lg:text-5xl tracking-tighter">Audit trail.</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Every administrative action across your workspace. Immutable, searchable, exportable.
          </p>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <Filter className="size-4 text-muted-foreground" strokeWidth={1.5} />
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger data-testid="audit-filter" className="h-10 w-64 border-border rounded-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All actions</SelectItem>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {logs === null ? (
          <div className="font-mono text-xs text-muted-foreground" data-testid="audit-loading">loading…</div>
        ) : logs.length === 0 ? (
          <div className="border border-dashed border-border p-12 text-center" data-testid="audit-empty">
            <History className="size-8 mx-auto mb-4 text-muted-foreground" strokeWidth={1.5} />
            <div className="font-display font-medium text-xl mb-2">No audit entries yet.</div>
            <p className="text-sm text-muted-foreground">Actions will appear here as your team uses the workspace.</p>
          </div>
        ) : (
          <div className="border border-border bg-white" data-testid="audit-list">
            <div className="grid grid-cols-[1fr_2fr_auto] px-4 py-3 border-b border-border font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>Action</span><span>Target</span><span>When</span>
            </div>
            {logs.map((l) => (
              <div key={l.id} data-testid={`audit-row-${l.id}`} className="grid grid-cols-[1fr_2fr_auto] px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors text-sm">
                <span className="font-medium">{ACTION_LABELS[l.action] || l.action}</span>
                <span className="font-mono text-xs text-muted-foreground truncate">
                  {l.target_type && l.target_id ? `${l.target_type}:${l.target_id}` : "—"}
                  {l.metadata?.name && ` · ${l.metadata.name}`}
                  {l.metadata?.email && ` · ${l.metadata.email}`}
                  {l.metadata?.agents_created != null && ` · ${l.metadata.agents_created} agents`}
                </span>
                <span className="font-mono text-xs text-muted-foreground shrink-0">{formatTs(l.ts)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
