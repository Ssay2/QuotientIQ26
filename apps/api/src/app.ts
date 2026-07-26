import cors from "cors";
import express from "express";
import { healthRouter } from "./routes/health.js";
import { workflowsRouter } from "./routes/workflows.js";
import { marketplaceRouter } from "./routes/marketplace.js";
import { orgsRouter } from "./routes/organizations.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { billingRouter } from "./routes/billing.js";
import { authRouter } from "./routes/auth.js";
import { agentsRouter } from "./routes/agents.js";
import { errorHandler } from "./middleware/errors.js";
import { rateLimit } from "./middleware/rateLimit.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Rate limiting: 100 requests per 15 minutes
  app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 100 }));

  app.use("/api", healthRouter);
  app.use("/api", authRouter);
  app.use("/api", orgsRouter);
  app.use("/api", agentsRouter);
  app.use("/api", workflowsRouter);
  app.use("/api", marketplaceRouter);
  app.use("/api", dashboardRouter);
  app.use("/api", billingRouter);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
