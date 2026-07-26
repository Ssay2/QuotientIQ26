import { Router, raw } from "express";
import { z } from "zod";
import { authMiddleware, requireAuth, requireOrgId } from "../middleware/auth.js";
import { createCheckoutSession, constructWebhookEvent, stripePricing } from "../services/stripe.js";
import { createSubscription, getSubscription } from "../db/queries.js";

export const billingRouter = Router();

const checkoutSchema = z.object({
  plan: z.enum(["starter", "pro"]),
  email: z.string().email()
});

// Get pricing info
billingRouter.get("/billing/pricing", (_req, res) => {
  res.json({ pricing: stripePricing });
});

// Create checkout session
billingRouter.post(
  "/billing/checkout",
  authMiddleware,
  requireAuth,
  requireOrgId,
  async (req, res) => {
    try {
      const parsed = checkoutSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid request" });
        return;
      }

      const session = await createCheckoutSession(
        req.auth?.orgId ?? "",
        parsed.data.plan,
        parsed.data.email,
        `${process.env.NEXT_PUBLIC_API_URL}/dashboard?success=true`,
        `${process.env.NEXT_PUBLIC_API_URL}/pricing?cancelled=true`
      );

      res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  }
);

// Get subscription status
billingRouter.get(
  "/billing/subscription",
  authMiddleware,
  requireAuth,
  requireOrgId,
  async (req, res) => {
    try {
      const subscription = await getSubscription(req.auth?.orgId ?? "");
      res.json(subscription || { status: "inactive", plan: "free" });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  }
);

// Stripe webhook (raw body needed for signature verification)
billingRouter.post(
  "/billing/webhook",
  raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const signature = req.headers["stripe-signature"] as string;
      const event = await constructWebhookEvent(req.body, signature);

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;
        const orgId = session.client_reference_id;
        const plan = session.metadata?.plan || "starter";
        const subscriptionId = session.subscription;

        // Store subscription in database
        if (orgId && subscriptionId) {
          await createSubscription(orgId, subscriptionId, plan);
        }
      }

      res.json({ received: true });
    } catch (error) {
      res.status(400).json({ error: "Webhook error" });
    }
  }
);
