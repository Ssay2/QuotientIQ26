import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Wrench, Sparkles } from "lucide-react";

const CATEGORIES = ["Customer Service", "Sales", "Marketing", "HR", "Finance", "Operations", "Legal"];
const ICONS = ["Headphones", "TrendingUp", "Users", "Megaphone", "BarChart3", "Cog", "Scale", "DollarSign", "Sparkles"];

export default function Builder() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: "", role: "", category: "Customer Service",
    icon: "Sparkles", description: "", instructions: "",
  });
  const [busy, setBusy] = useState(false);

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target?.value ?? e }));

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/agents", form);
      toast.success("Agent created");
      nav(`/chat/${data.id}`);
    } catch (err) {
      toast.error("Failed to create");
    } finally { setBusy(false); }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 lg:px-12 py-10 lg:py-14">
        <div className="mb-10">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// agent builder</div>
          <h1 className="font-display font-medium text-4xl lg:text-5xl tracking-tighter">Design a custom employee.</h1>
          <p className="mt-3 text-muted-foreground">Set the name, role, and behavior. You&apos;ll upload knowledge after creating.</p>
        </div>

        <form onSubmit={create} className="border border-border bg-white p-8 space-y-6" data-testid="builder-form">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Agent name</Label>
              <Input data-testid="b-name" required value={form.name} onChange={upd("name")} placeholder="HVAC Concierge" className="h-11 border-border rounded-md" />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Role / Title</Label>
              <Input data-testid="b-role" required value={form.role} onChange={upd("role")} placeholder="Senior Customer Concierge" className="h-11 border-border rounded-md" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Department</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger data-testid="b-category" className="h-11 border-border rounded-md"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Icon</Label>
              <Select value={form.icon} onValueChange={(v) => setForm((f) => ({ ...f, icon: v }))}>
                <SelectTrigger data-testid="b-icon" className="h-11 border-border rounded-md"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ICONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Description</Label>
            <Input data-testid="b-desc" value={form.description} onChange={upd("description")} placeholder="One-line summary" className="h-11 border-border rounded-md" />
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">System instructions</Label>
            <Textarea data-testid="b-instructions" value={form.instructions} onChange={upd("instructions")} rows={8} placeholder="You are a friendly customer support agent for…" className="resize-none border-border rounded-md font-mono text-sm" />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" data-testid="b-cancel" onClick={() => nav("/dashboard")} className="border-border">Cancel</Button>
            <Button type="submit" disabled={busy} data-testid="b-create" className="bg-black text-white hover:bg-black/90 rounded-md gap-2">
              <Wrench className="size-4" strokeWidth={1.5} /> {busy ? "Creating…" : "Create agent"}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
