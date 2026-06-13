import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Settings, Sparkles, Headphones, TrendingUp, Users, Megaphone, BarChart3, Cog, Scale, DollarSign } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useChatStream } from "@/hooks/useChatStream";
import { useAgent } from "@/hooks/useAgent";
import { KnowledgePanel } from "@/components/chat/KnowledgePanel";
import { InstructionsPanel, QuickPrompts } from "@/components/chat/InstructionsPanel";
import { MessageList } from "@/components/chat/MessageList";
import { Composer } from "@/components/chat/Composer";

const ICON = { Headphones, TrendingUp, Users, Megaphone, BarChart3, Cog, Scale, DollarSign, Sparkles };

export default function Chat() {
  const { agentId } = useParams();
  const nav = useNavigate();
  const { agent, setAgent, refresh } = useAgent(agentId, {
    onNotFound: () => {
      toast.error("Agent not found");
      nav("/dashboard");
    },
  });
  const { messages, busy, sendMessage } = useChatStream(agentId);
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  const handleSend = useCallback(async () => {
    const text = input;
    setInput("");
    try {
      await sendMessage(text);
    } catch (err) {
      toast.error("Chat failed: " + err.message);
    }
  }, [input, sendMessage]);

  const handleUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post(`/agents/${agentId}/upload`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`Indexed ${data.filename} (${data.chars} chars)`);
      await refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [agentId, refresh]);

  const handleRemoveFile = useCallback(async (filename) => {
    try {
      await api.delete(`/agents/${agentId}/files/${encodeURIComponent(filename)}`);
      await refresh();
      toast.success("Removed");
    } catch (err) {
      console.error("Remove file failed:", err);
      toast.error("Failed to remove");
    }
  }, [agentId, refresh]);

  const handleSaveAgent = useCallback(async () => {
    if (!agent) return;
    try {
      await api.patch(`/agents/${agentId}`, {
        name: agent.name,
        role: agent.role,
        instructions: agent.instructions,
        description: agent.description,
        category: agent.category,
        icon: agent.icon,
      });
      toast.success("Saved");
    } catch (err) {
      console.error("Save agent failed:", err);
      toast.error("Save failed");
    }
  }, [agent, agentId]);

  if (!agent) {
    return <AppShell><div className="p-10 font-mono text-xs">loading…</div></AppShell>;
  }

  const Icon = ICON[agent.icon] || Sparkles;
  const files = agent.knowledge_files || [];

  return (
    <AppShell>
      <div className="h-screen md:h-[100dvh] flex flex-col">
        <ChatHeader agent={agent} Icon={Icon} files={files} showSettings={showSettings} onToggleSettings={() => setShowSettings((s) => !s)} />

        <div className="flex-1 min-h-0 grid lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col min-h-0">
            <MessageList messages={messages} busy={busy} agentName={agent.name} agentIcon={Icon} hasKb={files.length > 0} scrollRef={scrollRef} />
            <Composer value={input} onChange={setInput} onSend={handleSend} disabled={busy} />
          </div>

          <aside className={`border-l border-border bg-muted/20 overflow-y-auto ${showSettings ? "block" : "hidden lg:block"}`}>
            <div className="p-6 space-y-6">
              <KnowledgePanel
                agentId={agentId}
                files={files}
                uploading={uploading}
                fileInputRef={fileRef}
                onPickFile={() => fileRef.current?.click()}
                onFileChange={handleUpload}
                onRemoveFile={handleRemoveFile}
                onRefresh={refresh}
              />
              <InstructionsPanel
                value={agent.instructions || ""}
                onChange={(value) => setAgent({ ...agent, instructions: value })}
                onSave={handleSaveAgent}
              />
              <QuickPrompts onPick={setInput} />
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function ChatHeader({ agent, Icon, files, showSettings, onToggleSettings }) {
  return (
    <div className="border-b border-border bg-white px-6 lg:px-10 h-16 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <Link to="/dashboard" className="text-muted-foreground hover:text-foreground" data-testid="chat-back" aria-label="Back to dashboard">
          <ArrowLeft className="size-4" strokeWidth={1.5} />
        </Link>
        <div className="size-9 border border-border grid place-items-center bg-white">
          <Icon className="size-4" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <div className="font-display font-medium tracking-tight truncate" data-testid="chat-agent-name">{agent.name}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {agent.category} · {files.length} docs
          </div>
        </div>
      </div>
      <Button variant="outline" size="sm" data-testid="toggle-settings" onClick={onToggleSettings} className="border-border gap-2">
        <Settings className="size-4" strokeWidth={1.5} /> {showSettings ? "Hide" : "Configure"}
      </Button>
    </div>
  );
}
