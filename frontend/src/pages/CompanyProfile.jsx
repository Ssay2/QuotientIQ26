import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Brain } from "lucide-react";

const FIELDS = [
  { k: "company_name", label: "Company name", hint: "Official business name.", multiline: false },
  { k: "audience", label: "Target audience", hint: "Who you serve. E.g. residential HVAC customers in Austin, TX.", multiline: true },
  { k: "products", label: "Products", hint: "What you sell — list with one item per line.", multiline: true },
  { k: "services", label: "Services", hint: "Services you offer — installation, maintenance, consulting…", multiline: true },
  { k: "pricing", label: "Pricing", hint: "Public pricing or pricing rules. Used by every agent.", multiline: true },
  { k: "policies", label: "Policies", hint: "Refund, warranty, escalation, business hours…", multiline: true },
  { k: "brand_voice", label: "Brand voice", hint: "Tone of voice. E.g. friendly, no-jargon, slightly formal.", multiline: true },
];

export default function CompanyProfile() {
  const [profile, setProfile] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get("/company-profile")
      .then(({ data }) => { if (!cancelled) setProfile(data); })
      .catch((err) => { if (!cancelled) console.error("Profile load failed:", err); });
    return () => { cancelled = true; };
  }, []);

  const upd = (k) => (e) => setProfile((p) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    try {
      await api.put("/company-profile", profile);
      toast.success("Memory saved. All agents will use this context.");
    } catch (err) {
      console.error("Save profile failed:", err);
      toast.error("Failed to save");
    } finally { setBusy(false); }
  };

  if (!profile) return <AppShell><div className="p-10 font-mono text-xs">loading…</div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 lg:px-12 py-10 lg:py-14">
        <div className="mb-10">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// memory · layer 9</div>
          <h1 className="font-display font-medium text-4xl lg:text-5xl tracking-tighter">Company memory.</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            One source of truth that every AI employee reads automatically. Fill this once and every agent &mdash; support, sales, recruiting &mdash; speaks your business fluently.
          </p>
        </div>

        <div className="border border-border bg-white p-6 lg:p-8 mb-6" data-testid="profile-form">
          <div className="flex items-start gap-3 mb-6 pb-6 border-b border-border">
            <div className="size-10 border border-border grid place-items-center"><Brain className="size-5" strokeWidth={1.5} /></div>
            <div>
              <div className="font-display font-medium text-lg">Brand DNA</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">read by every agent</div>
            </div>
          </div>

          <div className="space-y-6">
            {FIELDS.map((f) => (
              <div key={f.k} className="space-y-2">
                <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{f.label}</Label>
                {f.multiline ? (
                  <Textarea
                    data-testid={`profile-${f.k}`}
                    rows={4}
                    value={profile[f.k] || ""}
                    onChange={upd(f.k)}
                    placeholder={f.hint}
                    className="resize-none border-border rounded-md text-sm"
                  />
                ) : (
                  <Input
                    data-testid={`profile-${f.k}`}
                    value={profile[f.k] || ""}
                    onChange={upd(f.k)}
                    placeholder={f.hint}
                    className="h-11 border-border rounded-md"
                  />
                )}
                <div className="text-xs text-muted-foreground">{f.hint}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-border flex items-center justify-end">
            <Button data-testid="profile-save" onClick={save} disabled={busy} className="bg-black text-white hover:bg-black/90 rounded-md gap-2">
              <Save className="size-4" strokeWidth={1.5} /> {busy ? "Saving…" : "Save memory"}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
