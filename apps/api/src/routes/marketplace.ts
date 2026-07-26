import { Router } from "express";
import { authMiddleware, requireAuth, requireOrgId } from "../middleware/auth.js";
import { workflowTemplates } from "../services/mockData.js";
import { z } from "zod";

export const marketplaceRouter = Router();

const listQuerySchema = z.object({
  category: z.enum(["support", "leadgen", "email", "reporting"]).optional()
});

const installSchema = z.object({
  templateId: z.string(),
  name: z.string().min(1),
  config: z.record(z.unknown()).optional()
});

// List available workflows
marketplaceRouter.get(
  "/marketplace/workflows",
  authMiddleware,
  requireAuth,
  (req, res) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters" });
      return;
    }

    const workflows = parsed.data.category
      ? workflowTemplates.filter((item) => item.category === parsed.data.category)
      : workflowTemplates;

    res.json({
      workflows: workflows.map((w) => ({
        ...w,
        installable: true
      }))
    });
  }
);

// Get single workflow details
marketplaceRouter.get(
  "/marketplace/workflows/:id",
  authMiddleware,
  requireAuth,
  (req, res) => {
    const workflow = workflowTemplates.find((w) => w.id === req.params.id);

    if (!workflow) {
      res.status(404).json({ error: "Workflow not found" });
      return;
    }

    res.json({
      ...workflow,
      installable: true,
      requiredIntegrations: ["email", "crm"]
    });
  }
);

// Install a workflow
marketplaceRouter.post(
  "/marketplace/workflows/:id/install",
  authMiddleware,
  requireAuth,
  requireOrgId,
  (req, res) => {
    const parsed = installSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const workflow = workflowTemplates.find((w) => w.id === req.params.id);
    if (!workflow) {
      res.status(404).json({ error: "Workflow not found" });
      return;
    }

    // In production, create InstalledWorkflow in database
    res.status(201).json({
      id: `installed_${Date.now()}`,
      templateId: workflow.id,
      orgId: req.auth?.orgId ?? "unknown_org",
      name: parsed.data.name,
      config: parsed.data.config || {},
      enabled: true,
      createdAt: new Date().toISOString()
    });
  }
);
