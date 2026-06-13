import { useCallback, useRef, useState } from "react";
import { API } from "@/lib/api";

/**
 * Custom hook that manages an SSE-streaming chat conversation with an agent.
 * Returns messages, the current conversation id, and a sendMessage function.
 *
 * The backend SSE protocol:
 *   - data frames: "data: <token>\n\n"
 *   - terminator:  "event: done\ndata: <conversation_id>\n\n"
 */
export function useChatStream(agentId) {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [busy, setBusy] = useState(false);
  const seqRef = useRef(0);
  const nextId = () => `m_${Date.now()}_${seqRef.current++}`;

  const appendAssistantDelta = useCallback((id, chunk) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content: m.content + chunk } : m))
    );
  }, []);

  const replaceAssistantContent = useCallback((id, content) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content } : m))
    );
  }, []);

  const parseSseBuffer = useCallback(
    (buf, assistantId, setConvId) => {
      const parts = buf.split("\n\n");
      const remainder = parts.pop() || "";
      for (const part of parts) {
        if (part.startsWith("event: done")) {
          const cid = part.split("data: ")[1]?.trim();
          if (cid) setConvId(cid);
        } else if (part.startsWith("data: ")) {
          appendAssistantDelta(assistantId, part.slice(6));
        }
      }
      return remainder;
    },
    [appendAssistantDelta]
  );

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;

      const userId = nextId();
      const assistantId = nextId();
      setMessages((prev) => [
        ...prev,
        { id: userId, role: "user", content: trimmed },
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setBusy(true);

      try {
        const res = await fetch(`${API}/agents/${agentId}/chat`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, conversation_id: conversationId }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          buf = parseSseBuffer(buf, assistantId, setConversationId);
        }
      } catch (err) {
        replaceAssistantContent(assistantId, `[Error: ${err.message}]`);
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [agentId, busy, conversationId, parseSseBuffer, replaceAssistantContent]
  );

  return { messages, busy, sendMessage, conversationId };
}
