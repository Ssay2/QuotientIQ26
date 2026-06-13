import React, { useState } from "react";
import { Code2, Copy, Power, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function EmbedSection({ agent, onAgentUpdate }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const enabled = agent?.embed_enabled && agent?.embed_token;

  const enable = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/agents/${agent.id}/embed-enable`);
      toast.success("Embed enabled");
      onAgentUpdate({ ...agent, embed_enabled: true, embed_token: data.embed_token });
    } catch (err) {
      toast.error("Failed to enable");
    } finally { setBusy(false); }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await api.post(`/agents/${agent.id}/embed-disable`);
      toast.success("Embed disabled");
      onAgentUpdate({ ...agent, embed_enabled: false, embed_token: undefined });
    } catch (err) {
      toast.error("Failed to disable");
    } finally { setBusy(false); }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const snippet = enabled
    ? `<script src="${origin}/widget.js" data-quotientiq-token="${agent.embed_token}" defer></script>`
    : "";

  const copy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// website embed</div>
      {!enabled ? (
        <Button
          data-testid="embed-enable-btn"
          onClick={enable}
          disabled={busy}
          variant="outline"
          className="w-full border-dashed border-border h-12 gap-2"
        >
          <Code2 className="size-4" strokeWidth={1.5} /> {busy ? "Generating…" : "Enable on my website"}
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="p-3 border border-border bg-foreground text-background rounded-md font-mono text-[10px] break-all leading-relaxed" data-testid="embed-snippet">
            {snippet}
          </div>
          <div className="flex gap-2">
            <Button data-testid="embed-copy" onClick={copy} variant="outline" size="sm" className="flex-1 border-border gap-2">
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Copied" : "Copy snippet"}
            </Button>
            <Button data-testid="embed-rotate" onClick={enable} variant="outline" size="sm" className="border-border gap-2" aria-label="Regenerate token">
              <RefreshCw className="size-3.5" strokeWidth={1.5} />
            </Button>
            <Button data-testid="embed-disable" onClick={disable} variant="outline" size="sm" className="border-border gap-2" aria-label="Disable embed">
              <Power className="size-3.5" strokeWidth={1.5} />
            </Button>
          </div>
          <div className="font-mono text-[10px] text-muted-foreground">
            Paste before <span className="text-foreground">{`</body>`}</span> on any page.
          </div>
        </div>
      )}
    </div>
  );
}
