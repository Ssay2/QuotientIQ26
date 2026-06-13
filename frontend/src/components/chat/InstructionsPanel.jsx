import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function InstructionsPanel({ value, onChange, onSave }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// instructions</div>
      <Textarea
        data-testid="agent-instructions"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className="resize-none border-border rounded-md text-sm font-mono"
        placeholder="System instructions…"
      />
      <Button data-testid="save-agent" onClick={onSave} variant="outline" size="sm" className="mt-3 w-full border-border">
        Save instructions
      </Button>
    </div>
  );
}

const QUICK_PROMPTS = [
  "What can you help me with?",
  "Summarize the uploaded documents.",
  "What's our refund policy?",
];

export function QuickPrompts({ onPick }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// quick prompts</div>
      <div className="space-y-1.5">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q}
            data-testid={`quick-prompt-${q.slice(0, 8)}`}
            onClick={() => onPick(q)}
            className="w-full text-left text-xs px-3 py-2 border border-border bg-white hover:bg-foreground hover:text-background transition-all"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
