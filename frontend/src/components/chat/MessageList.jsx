import React from "react";
import { MarkdownMessage } from "@/components/chat/MarkdownMessage";

function EmptyState({ Icon, agentName, hasKb }) {
  return (
    <div className="max-w-xl mx-auto text-center py-12">
      <div className="size-12 border border-border grid place-items-center mx-auto mb-6">
        <Icon className="size-5" strokeWidth={1.5} />
      </div>
      <div className="font-display font-medium text-2xl tracking-tight">Say hi to {agentName}</div>
      <p className="mt-3 text-muted-foreground text-sm">
        Try asking about the contents of your uploaded documents, or anything within {agentName}&apos;s scope.
      </p>
      {!hasKb && (
        <div className="mt-6 p-4 border border-dashed border-border text-left text-sm text-muted-foreground" data-testid="no-kb-warning">
          <strong className="text-foreground">Heads up:</strong> no documents indexed yet. Upload PDFs in the side panel to ground responses in your data.
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message, busy, index }) {
  const isUser = message.role === "user";
  const showThinking = busy && !isUser && !message.content;
  return (
    <div className={`max-w-2xl ${isUser ? "ml-auto" : ""}`}>
      <div
        className={`rounded-md p-4 text-sm ${isUser ? "bubble-user whitespace-pre-wrap" : "bubble-ai"}`}
        data-testid={`msg-${message.role}-${index}`}
      >
        {showThinking ? (
          <span className="font-mono text-xs">thinking…</span>
        ) : isUser ? (
          message.content
        ) : (
          <MarkdownMessage content={message.content || ""} />
        )}
      </div>
    </div>
  );
}

export function MessageList({ messages, busy, agentName, agentIcon: Icon, hasKb, scrollRef }) {
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 lg:px-12 py-8 space-y-4" data-testid="chat-messages">
      {messages.length === 0 && <EmptyState Icon={Icon} agentName={agentName} hasKb={hasKb} />}
      {messages.map((m, i) => (
        <MessageBubble key={m.id} message={m} busy={busy} index={i} />
      ))}
    </div>
  );
}
