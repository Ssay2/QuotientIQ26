import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key, Plus, Trash2, Copy, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

function formatTs(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export default function Developer() {
  const [keys, setKeys] = useState(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    const { data } = await api.get("/keys");
    setKeys(data.keys);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { const { data } = await api.get("/keys"); if (!cancelled) setKeys(data.keys); }
      catch (err) { if (!cancelled) console.error("Keys load failed:", err); }
    })();
    return () => { cancelled = true; };
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/keys", { name: name || "Unnamed key" });
      setCreated(data);
      setName("");
      toast.success("Key created");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Create failed");
    } finally { setBusy(false); }
  };

  const revoke = async (id) => {
    if (!window.confirm("Revoke this key? Apps using it will lose access immediately.")) return;
    try {
      await api.delete(`/keys/${id}`);
      toast.success("Revoked");
      load();
    } catch (err) { toast.error("Revoke failed"); }
  };

  const copyKey = async () => {
    await navigator.clipboard.writeText(created.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const baseUrl = process.env.REACT_APP_BACKEND_URL;
  const exampleCurl = `curl ${baseUrl}/api/agents \\\n  -H "Authorization: Bearer YOUR_KEY"`;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 lg:px-12 py-10 lg:py-14">
        <div className="mb-10">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// developer · layer 23</div>
          <h1 className="font-display font-medium text-4xl lg:text-5xl tracking-tighter">API access.</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Build with QuotientIQ. API keys give programmatic access to all <code className="font-mono text-foreground">/api/*</code> endpoints with your account&apos;s permissions.
          </p>
        </div>

        <form onSubmit={create} className="border border-border bg-white p-6 mb-6" data-testid="create-key-form">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-4">// new key</div>
          <div className="flex gap-3">
            <Input
              data-testid="key-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production server"
              className="h-11 border-border rounded-md"
            />
            <Button data-testid="key-create" type="submit" disabled={busy} className="bg-black text-white hover:bg-black/90 rounded-md gap-2 h-11 px-5">
              <Plus className="size-4" strokeWidth={1.5} /> {busy ? "Creating…" : "Create key"}
            </Button>
          </div>
        </form>

        {created && (
          <div className="border border-foreground bg-white p-4 mb-6 space-y-3" data-testid="new-key-display">
            <div className="flex items-start gap-2 text-sm">
              <AlertCircle className="size-4 mt-0.5 shrink-0" strokeWidth={1.5} />
              <span><strong>Copy this now.</strong> You won&apos;t be able to see it again.</span>
            </div>
            <div className="p-3 bg-foreground text-background font-mono text-xs break-all rounded-md" data-testid="new-key-value">{created.key}</div>
            <Button data-testid="copy-new-key" onClick={copyKey} variant="outline" size="sm" className="border-border gap-2">
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        )}

        <div className="mb-8">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// your keys</div>
          {keys === null ? (
            <div className="font-mono text-xs text-muted-foreground" data-testid="keys-loading">loading…</div>
          ) : keys.length === 0 ? (
            <div className="border border-dashed border-border p-12 text-center" data-testid="keys-empty">
              <Key className="size-8 mx-auto mb-4 text-muted-foreground" strokeWidth={1.5} />
              <div className="font-display font-medium text-xl">No keys yet.</div>
            </div>
          ) : (
            <div className="border border-border bg-white divide-y divide-border" data-testid="keys-list">
              {keys.map((k) => (
                <div key={k.id} data-testid={`key-row-${k.id}`} className="p-4 flex items-center gap-4">
                  <div className="size-9 border border-border grid place-items-center shrink-0">
                    <Key className="size-4" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-medium truncate">{k.name}</div>
                    <div className="font-mono text-xs text-muted-foreground mt-0.5">
                      {k.prefix}••• · created {formatTs(k.created_at)} · last used {formatTs(k.last_used_at)}
                    </div>
                  </div>
                  <Button data-testid={`revoke-key-${k.id}`} variant="ghost" size="sm" onClick={() => revoke(k.id)} aria-label="Revoke key">
                    <Trash2 className="size-4" strokeWidth={1.5} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border border-border bg-muted/30 p-6" data-testid="docs-example">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// example request</div>
          <pre className="font-mono text-xs whitespace-pre-wrap overflow-x-auto">{exampleCurl}</pre>
        </div>
      </div>
    </AppShell>
  );
}
