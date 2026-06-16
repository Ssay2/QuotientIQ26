import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Edit3, Layers } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";

export default function Departments() {
  const [depts, setDepts] = useState([]);
  const [agents, setAgents] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", agent_ids: [], color: "#0A0A0A" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [d, a] = await Promise.all([api.get("/departments"), api.get("/agents")]);
      setDepts(d.data.departments || []);
      setAgents(a.data || []);
    } catch (err) { /* noop */ }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: "", description: "", agent_ids: [], color: "#0A0A0A" }); setOpen(true); };
  const openEdit = (d) => { setEditing(d.id); setForm({ name: d.name || "", description: d.description || "", agent_ids: d.agent_ids || [], color: d.color || "#0A0A0A" }); setOpen(true); };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    try {
      if (editing) {
        await api.put(`/departments/${editing}`, form);
        toast.success("Department updated");
      } else {
        await api.post("/departments", form);
        toast.success("Department created");
      }
      setOpen(false);
      await load();
    } catch (err) { toast.error("Failed"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this department?")) return;
    try {
      await api.delete(`/departments/${id}`);
      await load();
    } catch (err) { toast.error("Failed"); }
  };

  const toggleAgent = (aid) => {
    setForm((f) => ({
      ...f,
      agent_ids: f.agent_ids.includes(aid) ? f.agent_ids.filter((x) => x !== aid) : [...f.agent_ids, aid],
    }));
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 lg:px-12 py-10 lg:py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// org structure</div>
            <h1 className="font-display font-medium text-4xl tracking-tighter">Departments</h1>
            <p className="mt-2 text-muted-foreground">Group your AI workforce by function.</p>
          </div>
          <Button data-testid="new-dept-btn" onClick={openCreate} className="bg-foreground text-background gap-2">
            <Plus className="size-4" /> New department
          </Button>
        </div>

        {loading ? (
          <div className="font-mono text-xs text-muted-foreground">loading…</div>
        ) : depts.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No departments yet"
            description="Group agents by function to make routing easier."
            action={<Button onClick={openCreate} className="bg-foreground text-background gap-2"><Plus className="size-4" /> Create your first department</Button>}
            testid="empty-depts"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="depts-grid">
            {depts.map((d) => (
              <div key={d.id} data-testid={`dept-card-${d.id}`} className="border border-border bg-card rounded-md p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="size-4 rounded-sm mb-2" style={{ background: d.color || "#0A0A0A" }} />
                    <div className="font-display font-medium text-lg">{d.name}</div>
                    {d.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.description}</div>}
                  </div>
                  <div className="flex gap-1">
                    <button data-testid={`edit-${d.id}`} onClick={() => openEdit(d)} className="p-1.5 rounded hover:bg-accent"><Edit3 className="size-3.5" /></button>
                    <button data-testid={`delete-${d.id}`} onClick={() => remove(d.id)} className="p-1.5 rounded hover:bg-accent text-destructive"><Trash2 className="size-3.5" /></button>
                  </div>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground border-t border-border pt-3">
                  {(d.agent_ids || []).length} agents
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit department" : "New department"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input data-testid="dept-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Customer Success" /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea data-testid="dept-description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {["#0A0A0A", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"].map((c) => (
                    <button key={c} onClick={() => setForm({ ...form, color: c })} className={`size-7 rounded ${form.color === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`} style={{ background: c }} aria-label={`color ${c}`} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Agents</Label>
                <div className="max-h-48 overflow-y-auto border border-border rounded-md divide-y divide-border">
                  {agents.length === 0 && <div className="p-3 text-xs text-muted-foreground">No agents yet.</div>}
                  {agents.map((a) => (
                    <label key={a.id} className="flex items-center gap-3 p-2.5 hover:bg-accent cursor-pointer">
                      <Checkbox checked={form.agent_ids.includes(a.id)} onCheckedChange={() => toggleAgent(a.id)} data-testid={`dept-agent-${a.id}`} />
                      <div className="text-sm">{a.name}</div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground ml-auto">{a.category}</div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button data-testid="dept-save" onClick={save} className="bg-foreground text-background">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
