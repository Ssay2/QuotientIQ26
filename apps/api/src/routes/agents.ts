import { Router } from "express";

export const agentsRouter = Router();

const agents: Array<{
  id: string;
  organizationId: string;
  name: string;
  role: string;
  description: string;
  systemPrompt: string;
}> = [];

agentsRouter.get("/agents", (_req, res) => {
  res.json({ agents });
});

agentsRouter.post("/agents", (req, res) => {
  const { organizationId, name, role, description, systemPrompt } = req.body ?? {};

  if (!organizationId || typeof organizationId !== "string") {
    res.status(400).json({ error: "organizationId is required" });
    return;
  }

  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const agent = {
    id: `agent_${Date.now()}`,
    organizationId,
    name,
    role: typeof role === "string" ? role : "Assistant",
    description: typeof description === "string" ? description : "",
    systemPrompt: typeof systemPrompt === "string" ? systemPrompt : "You are a helpful assistant"
  };

  agents.push(agent);
  res.status(201).json(agent);
});

agentsRouter.get("/agents/:id", (req, res) => {
  const agent = agents.find((entry) => entry.id === req.params.id);
  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }

  res.json(agent);
});
