import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export function useAgent(agentId, { onNotFound } = {}) {
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Explicit refresh function (callable from event handlers, e.g. after upload).
  const refresh = useCallback(async () => {
    const { data } = await api.get(`/agents/${agentId}`);
    setAgent(data);
    return data;
  }, [agentId]);

  // Initial load — separate effect, does not depend on the callback above.
  useEffect(() => {
    let cancelled = false;
    api.get(`/agents/${agentId}`)
      .then(({ data }) => { if (!cancelled) setAgent(data); })
      .catch((err) => {
        if (err?.response?.status === 404 && onNotFound) onNotFound();
        else console.error("Failed to load agent:", err);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  return { agent, setAgent, loading, refresh };
}
