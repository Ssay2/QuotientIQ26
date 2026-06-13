import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Send, Sparkles, Loader2, X } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Public embed page — works WITHOUT auth.
 * Mounted at /embed/:token. Designed to be loaded in an iframe
 * via the QuotientIQ widget script.
 */
export default function Embed() {
  const { token } = useParams();
  const [agent, setAgent] = useState(null);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([{ role: "assistant", content: "Hi! How can I help?" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const visitorRef = useRef(localStorage.getItem(`qiq_visitor_${token}`) || null);
  const scrollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    axios.get(`${API}/embed/${token}/agent`)
      .then(({ data }) => { if (!cancelled) setAgent(data); })
      .catch(() => { if (!cancelled) setError("This chat is unavailable."); });
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/embed/${token}/chat`, {
        message: text,
        visitor_id: visitorRef.current,
      });
      if (data.visitor_id) {
        visitorRef.current = data.visitor_id;
        localStorage.setItem(`qiq_visitor_${token}`, data.visitor_id);
      }
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, something went wrong." }]);
    } finally { setBusy(false); }
  };

  if (error) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground font-mono">{error}</div>;
  if (!agent) return <div className="min-h-screen grid place-items-center"><Loader2 className="size-4 animate-spin" /></div>;

  return (
    <div className="h-[100dvh] flex flex-col bg-white" data-testid="embed-root">
      <div className="px-4 h-14 border-b border-border flex items-center gap-3 shrink-0">
        <div className="size-8 bg-black grid place-items-center">
          <Sparkles className="size-4 text-white" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display font-medium tracking-tight truncate text-sm" data-testid="embed-agent-name">{agent.name}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">powered by QuotientIQ</div>
        </div>
        <button
          onClick={() => window.parent?.postMessage({ type: "qiq:close" }, "*")}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close chat"
          data-testid="embed-close"
        >
          <X className="size-4" strokeWidth={1.5} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="embed-messages">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] ${m.role === "user" ? "ml-auto" : ""}`}>
            <div className={`rounded-md p-3 text-sm whitespace-pre-wrap ${m.role === "user" ? "bubble-user" : "bubble-ai"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">thinking…</div>}
      </div>

      <div className="border-t border-border p-3 flex gap-2 shrink-0">
        <input
          data-testid="embed-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
          placeholder="Type a message…"
          className="flex-1 px-3 h-10 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
        />
        <button
          data-testid="embed-send"
          onClick={send}
          disabled={busy || !input.trim()}
          className="bg-black text-white px-3 rounded-md disabled:opacity-50"
          aria-label="Send"
        >
          <Send className="size-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
