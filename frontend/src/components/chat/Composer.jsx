import React from "react";
import { Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function Composer({ value, onChange, onSend, disabled }) {
  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="border-t border-border bg-white p-4 lg:p-6">
      <div className="max-w-3xl mx-auto flex gap-2 items-end">
        <Textarea
          data-testid="chat-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask your AI employee anything…"
          rows={1}
          className="resize-none border-border rounded-md min-h-[44px] max-h-40"
        />
        <Button
          data-testid="chat-send"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className="bg-black text-white hover:bg-black/90 rounded-md h-11 px-4 shrink-0 gap-2"
          aria-label="Send message"
        >
          <Send className="size-4" strokeWidth={2} />
        </Button>
      </div>
      <div className="max-w-3xl mx-auto mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        ⏎ to send · ⇧⏎ for newline · powered by gpt-5.2
      </div>
    </div>
  );
}
