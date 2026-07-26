import { Router } from "express";

export const orgsRouter = Router();

const organizations: Array<{ id: string; name: string; ownerId: string }> = [];

orgsRouter.get("/organizations", (_req, res) => {
  res.json({ organizations });
});

orgsRouter.post("/organizations", (req, res) => {
  const { name, ownerId } = req.body ?? {};

  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "Organization name is required" });
    return;
  }

  if (!ownerId || typeof ownerId !== "string") {
    res.status(400).json({ error: "ownerId is required" });
    return;
  }

  const organization = {
    id: `org_${Date.now()}`,
    name,
    ownerId
  };

  organizations.push(organization);
  res.status(201).json(organization);
});

orgsRouter.get("/organizations/:id", (req, res) => {
  const organization = organizations.find((entry) => entry.id === req.params.id);
  if (!organization) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }

  res.json(organization);
});

orgsRouter.post("/orgs", (req, res) => {
  void req;
  res.status(400).json({ error: "Use /api/organizations instead" });
});
