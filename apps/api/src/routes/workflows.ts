import { Router } from "express";
import { z } from "zod";
import { workflowTemplates } from "../services/mockData.js";

export const workflowsRouter = Router();

const querySchema = z.object({
  category: z.enum(["support", "leadgen", "email", "reporting"]).optional()
});

workflowsRouter.get("/workflows", (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }

  const workflows = parsed.data.category
    ? workflowTemplates.filter((item) => item.category === parsed.data.category)
    : workflowTemplates;

  res.json({ workflows });
});
