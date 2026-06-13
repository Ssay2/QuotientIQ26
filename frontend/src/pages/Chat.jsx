import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { api, API } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Upload, FileText, Trash2, Sparkles, Headphones, TrendingUp, Users, Megaphone, BarChart3, Cog, Scale, DollarSign, MessageSquare, Settings } from "lucide-react";
import { toast } from "sonner";

const ICON = { Headphones, TrendingUp, Users, Megaphone, BarChart3, Cog, Scale, DollarSign, Sparkles };

export default function Chat() {
  const { agentId } = useParams();
  const nav = useNavigate();
  const [agent, setAgent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/agents/${agentId}`);
        setAgent(data);
      } catch {
        toast.error("Agent not found");
        nav("/dashboard");
      }
    })();
  }, [agentId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setBusy(true);

    try {
      const token = localStorage.getItem("qiq_token");
      const res = await fetch(`${API}/agents/${agentId}/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ message: text, conversation_id: conversationId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const part of parts) {
          if (part.startsWith("event: done")) {
            const cid = part.split("data: ")[1]?.trim();
            if (cid) setConversationId(cid);
          } else if (part.startsWith("data: ")) {
            const chunk = part.slice(6);
            setMessages((m) => {
              const next = [...m];
              const last = next[next.length - 1];
              if (last && last.role === "assistant") last.content += chunk;
              return next;
            });
          }
        }
      }
    } catch (e) {
      setMessages((m) => {
        const next = [...m];
        const last = next[next.length - 1];
        if (last) last.content = `[Error: ${e.message}]`;
        return next;
      });
      toast.error("Chat failed: " + e.message);
    } finally { setBusy(false); }
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post(`/agents/${agentId}/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`Indexed ${data.filename} (${data.chars} chars)`);
      const refreshed = await api.get(`/agents/${agentId}`);
      setAgent(refreshed.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeFile = async (filename) => {
    try {
      await api.delete(`/agents/${agentId}/files/${encodeURIComponent(filename)}`);
      const refreshed = await api.get(`/agents/${agentId}`);
      setAgent(refreshed.data);
      toast.success("Removed");
    } catch (e) { toast.error("Failed to remove"); }
  };

  const saveAgent = async () => {
    try {
      await api.patch(`/agents/${agentId}`, {
        name: agent.name, role: agent.role, instructions: agent.instructions,
        description: agent.description, category: agent.category, icon: agent.icon,
      });
      toast.success("Saved");
    } catch (e) { toast.error("Save failed"); }
  };

  if (!agent) return <AppShell><div className="p-10 font-mono text-xs">loading…</div></AppShell>;
  const Icon = ICON[agent.icon] || Sparkles;

  return (
    <AppShell>
      <div className="h-screen md:h-[100dvh] flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-white px-6 lg:px-10 h-16 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground" data-testid="chat-back"><ArrowLeft className="size-4" strokeWidth={1.5} /></Link>
            <div className="size-9 border border-border grid place-items-center bg-white"><Icon className="size-4" strokeWidth={1.5} /></div>
            <div className="min-w-0">
              <div className="font-display font-medium tracking-tight truncate" data-testid="chat-agent-name">{agent.name}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{agent.category} · {(agent.knowledge_files || []).length} docs</div>
            </div>
          </div>
          <Button variant="outline" size="sm" data-testid="toggle-settings" onClick={() => setShowSettings((s) => !s)} className="border-border gap-2">
            <Settings className="size-4" strokeWidth={1.5} /> {showSettings ? "Hide" : "Configure"}
          </Button>
        </div>

        <div className="flex-1 min-h-0 grid lg:grid-cols-[1fr_360px]">
          {/* Chat pane */}
          <div className="flex flex-col min-h-0">
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 lg:px-12 py-8 space-y-4" data-testid="chat-messages">
              {messages.length === 0 && (
                <div className="max-w-xl mx-auto text-center py-12">
                  <div className="size-12 border border-border grid place-items-center mx-auto mb-6"><Icon className="size-5" strokeWidth={1.5} /></div>
                  <div className="font-display font-medium text-2xl tracking-tight">Say hi to {agent.name}</div>
                  <p className="mt-3 text-muted-foreground text-sm">Try asking about the contents of your uploaded documents, or anything within {agent.name}'s scope.</p>
                  {(agent.knowledge_files || []).length === 0 && (
                    <div className="mt-6 p-4 border border-dashed border-border text-left text-sm text-muted-foreground" data-testid="no-kb-warning">
                      <strong className="text-foreground">Heads up:</strong> no documents indexed yet. Upload PDFs in the side panel to ground responses in your data.
                    </div>
                  )}
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`max-w-2xl ${m.role === "user" ? "ml-auto" : ""}`}>
                  <div className={`rounded-md p-4 text-sm whitespace-pre-wrap ${m.role === "user" ? "bubble-user" : "bubble-ai"}`} data-testid={`msg-${m.role}-${i}`}>
                    {m.content || (busy && m.role === "assistant" ? <span className="font-mono text-xs">thinking…</span> : null)}
                  </div>
                </div>
              ))}
            </div>

            {/* Composer */}
            <div className="border-t border-border bg-white p-4 lg:p-6">
              <div className="max-w-3xl mx-auto flex gap-2 items-end">
                <Textarea
                  data-testid="chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Ask your AI employee anything…"
                  rows={1}
                  className="resize-none border-border rounded-md min-h-[44px] max-h-40"
                />
                <Button data-testid="chat-send" onClick={send} disabled={busy || !input.trim()} className="bg-black text-white hover:bg-black/90 rounded-md h-11 px-4 shrink-0 gap-2">
                  <Send className="size-4" strokeWidth={2} />
                </Button>
              </div>
              <div className="max-w-3xl mx-auto mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                ⏎ to send · ⇧⏎ for newline · powered by gpt-5.2
              </div>
            </div>
          </div>

          {/* Side panel */}
          <aside className={`border-l border-border bg-muted/20 overflow-y-auto ${showSettings ? "block" : "hidden lg:block"}`}>
            <div className="p-6 space-y-6">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// knowledge base</div>
                <input ref={fileRef} type="file" accept="application/pdf" onChange={onUpload} className="hidden" data-testid="file-input" />
                <Button
                  data-testid="upload-pdf-btn"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  variant="outline"
                  className="w-full border-dashed border-border h-20 flex-col gap-1"
                >
                  <Upload className="size-4" strokeWidth={1.5} />
                  <span className="text-xs">{uploading ? "Indexing…" : "Upload PDF"}</span>
                </Button>
                <div className="mt-3 space-y-1.5" data-testid="kb-files">
                  {(agent.knowledge_files || []).length === 0 && (
                    <div className="text-xs text-muted-foreground font-mono">No documents yet.</div>
                  )}
                  {(agent.knowledge_files || []).map((f) => (
                    <div key={f.name} className="flex items-center justify-between gap-2 p-2 border border-border bg-white text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="size-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                        <span className="truncate" title={f.name}>{f.name}</span>
                      </div>
                      <button data-testid={`delete-file-${f.name}`} onClick={() => removeFile(f.name)} className="text-muted-foreground hover:text-destructive shrink-0">
                        <Trash2 className="size-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// instructions</div>
                <Textarea
                  data-testid="agent-instructions"
                  value={agent.instructions || ""}
                  onChange={(e) => setAgent({ ...agent, instructions: e.target.value })}
                  rows={6}
                  className="resize-none border-border rounded-md text-sm font-mono"
                  placeholder="System instructions…"
                />
                <Button data-testid="save-agent" onClick={saveAgent} variant="outline" size="sm" className="mt-3 w-full border-border">Save instructions</Button>
              </div>

              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// quick prompts</div>
                <div className="space-y-1.5">
                  {[
                    "What can you help me with?",
                    "Summarize the uploaded documents.",
                    "What's our refund policy?",
                  ].map((q) => (
                    <button
                      key={q}
                      data-testid={`quick-prompt-${q.slice(0,8)}`}
                      onClick={() => setInput(q)}
                      className="w-full text-left text-xs px-3 py-2 border border-border bg-white hover:bg-foreground hover:text-background transition-all"
                    >{q}</button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
