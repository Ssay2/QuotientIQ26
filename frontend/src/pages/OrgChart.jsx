import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Network, Sparkles, Headphones, TrendingUp, Users, Megaphone, BarChart3, Cog, Scale, DollarSign } from "lucide-react";
import { toast } from "sonner";

const ICON = { Headphones, TrendingUp, Users, Megaphone, BarChart3, Cog, Scale, DollarSign, Sparkles };

// Flatten the tree into a depth-tagged list so we don't need self-recursive components.
function flattenTree(roots, depth = 0, out = []) {
  for (const node of roots) {
    out.push({ node, depth });
    if (node.children && node.children.length) {
      flattenTree(node.children, depth + 1, out);
    }
  }
  return out;
}

function AgentRow({ node, depth, allAgents, onReparent }) {
  const Icon = ICON[node.icon] || Sparkles;
  return (
    <div className="flex items-center gap-3 border border-border bg-white p-4 hover:shadow-sm transition-all" style={{ marginLeft: depth * 24 }} data-testid={`org-node-${node.id}`}>
      {depth > 0 && <div className="w-4 h-px bg-border shrink-0" />}
      <div className="size-10 border border-border grid place-items-center shrink-0">
        <Icon className="size-5" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <Link to={`/chat/${node.id}`} className="font-display font-medium tracking-tight truncate block u-link">{node.name}</Link>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
          {node.role || node.category}
        </div>
      </div>
      <div className="shrink-0">
        <Select
          value={node.parent_agent_id || "__root__"}
          onValueChange={(v) => onReparent(node.id, v === "__root__" ? null : v)}
        >
          <SelectTrigger data-testid={`reparent-${node.id}`} className="h-9 w-40 border-border rounded-md text-xs">
            <SelectValue placeholder="Reports to…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__root__">— Top level —</SelectItem>
            {allAgents.filter((a) => a.id !== node.id).map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default function OrgChart() {
  const [tree, setTree] = useState(null);
  const [agents, setAgents] = useState([]);

  const fetchAll = async () => {
    const [{ data: treeData }, { data: agentList }] = await Promise.all([
      api.get("/org/tree"),
      api.get("/agents"),
    ]);
    return { treeData, agentList };
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { treeData, agentList } = await fetchAll();
        if (cancelled) return;
        setTree(treeData);
        setAgents(agentList);
      } catch (err) {
        if (!cancelled) console.error("Org load failed:", err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const reparent = async (agentId, parentId) => {
    try {
      await api.patch(`/agents/${agentId}`, { parent_agent_id: parentId });
      toast.success("Org updated");
      const { treeData, agentList } = await fetchAll();
      setTree(treeData);
      setAgents(agentList);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Reparent failed");
    }
  };

  if (!tree) return <AppShell><div className="p-10 font-mono text-xs">loading…</div></AppShell>;

  const rows = tree.count === 0 ? [] : flattenTree(tree.roots);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 lg:px-12 py-10 lg:py-14">
        <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// org chart · layer 11</div>
            <h1 className="font-display font-medium text-4xl lg:text-5xl tracking-tighter">AI organization chart.</h1>
            <p className="mt-3 text-muted-foreground max-w-2xl">
              Structure your AI workforce. Each agent can report to another &mdash; team awareness is automatically passed into every conversation.
            </p>
          </div>
          <Link to="/marketplace">
            <Button data-testid="org-add-agent" variant="outline" className="border-border gap-2">
              <Sparkles className="size-4" strokeWidth={1.5} /> Hire more
            </Button>
          </Link>
        </div>

        {tree.count === 0 ? (
          <div className="border border-dashed border-border p-12 text-center" data-testid="org-empty">
            <Network className="size-8 mx-auto mb-4 text-muted-foreground" strokeWidth={1.5} />
            <div className="font-display font-medium text-xl mb-2">No agents yet.</div>
            <p className="text-sm text-muted-foreground mb-6">Hire your first AI employee from the marketplace.</p>
            <Link to="/marketplace"><Button className="bg-black text-white hover:bg-black/90">Marketplace</Button></Link>
          </div>
        ) : (
          <div className="space-y-3" data-testid="org-tree">
            {rows.map(({ node, depth }) => (
              <AgentRow key={node.id} node={node} depth={depth} allAgents={agents} onReparent={reparent} />
            ))}
          </div>
        )}

        <div className="mt-10 p-5 border border-border bg-muted/30 font-mono text-xs text-muted-foreground" data-testid="org-help">
          <div className="font-medium text-foreground mb-2">// how this works</div>
          When an agent chats with a customer, it knows about every teammate in your workforce. If a question is outside its scope, it can refer the user to the right agent by name &mdash; without you wiring anything.
        </div>
      </div>
    </AppShell>
  );
}
