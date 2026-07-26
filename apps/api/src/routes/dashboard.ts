import { Router } from "express";
import { authMiddleware, requireAuth, requireOrgId } from "../middleware/auth.js";
import {
  getOrgStats,
  getInstalledWorkflows,
  getInstalledWorkflow,
  getWorkflowRuns,
  toggleWorkflow,
  updateWorkflowConfig,
  createInstalledWorkflow,
  getSubscription
} from "../db/queries.js";
import { executeWorkflow, testWorkflow } from "../services/executor.js";

export const dashboardRouter = Router();

// Get org dashboard stats
dashboardRouter.get(
  "/dashboard/stats",
  authMiddleware,
  requireAuth,
  requireOrgId,
  async (req, res) => {
    try {
      const stats = await getOrgStats(req.auth?.orgId ?? "");
      const subscription = await getSubscription(req.auth?.orgId ?? "");

      res.json({
        ...stats,
        plan: subscription?.plan ?? "free",
        status: subscription?.status ?? "inactive"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  }
);

// Get installed workflows for org
dashboardRouter.get(
  "/dashboard/workflows",
  authMiddleware,
  requireAuth,
  requireOrgId,
  async (req, res) => {
    try {
      const workflows = await getInstalledWorkflows(req.auth?.orgId ?? "");
      res.json({ workflows });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workflows" });
    }
  }
);

// Get single workflow details
dashboardRouter.get(
  "/dashboard/workflows/:id",
  authMiddleware,
  requireAuth,
  requireOrgId,
  async (req, res) => {
    try {
      const workflow = await getInstalledWorkflow(req.params.id);

      if (!workflow) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }

      const runs = await getWorkflowRuns(workflow.id, 10);
      res.json({ workflow, recentRuns: runs });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workflow" });
    }
  }
);

// Update workflow config
dashboardRouter.patch(
  "/dashboard/workflows/:id/config",
  authMiddleware,
  requireAuth,
  requireOrgId,
  async (req, res) => {
    try {
      const workflow = await updateWorkflowConfig(req.params.id, req.body.config || {});
      res.json({ workflow });
    } catch (error) {
      res.status(500).json({ error: "Failed to update workflow" });
    }
  }
);

// Toggle workflow enabled/disabled
dashboardRouter.patch(
  "/dashboard/workflows/:id/toggle",
  authMiddleware,
  requireAuth,
  requireOrgId,
  async (req, res) => {
    try {
      const workflow = await toggleWorkflow(req.params.id, req.body.enabled ?? true);
      res.json({ workflow });
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle workflow" });
    }
  }
);

// Test workflow (dry run)
dashboardRouter.post(
  "/dashboard/workflows/:slug/test",
  authMiddleware,
  requireAuth,
  requireOrgId,
  async (req, res) => {
    try {
      const output = await testWorkflow(req.params.slug, req.body.inputs || {});
      res.json({ success: true, output });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Test failed" });
    }
  }
);

// Execute workflow (creates run record)
dashboardRouter.post(
  "/dashboard/workflows/:id/execute",
  authMiddleware,
  requireAuth,
  requireOrgId,
  async (req, res) => {
    try {
      const result = await executeWorkflow({
        workflowId: req.params.id,
        orgId: req.auth?.orgId ?? "",
        inputs: req.body.inputs || {}
      });

      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Execution failed" });
    }
  }
);

// Get run history
dashboardRouter.get(
  "/dashboard/workflows/:id/runs",
  authMiddleware,
  requireAuth,
  requireOrgId,
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const runs = await getWorkflowRuns(req.params.id, limit);
      res.json({ runs });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch runs" });
    }
  }
);
