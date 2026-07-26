import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18"
    })
  : null;

export async function createCheckoutSession(
  orgId: string,
  plan: "starter" | "pro",
  email: string,
  successUrl: string,
  cancelUrl: string
) {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const prices: Record<string, string> = {
    starter: process.env.STRIPE_PRICE_STARTER ?? "",
    pro: process.env.STRIPE_PRICE_PRO ?? ""
  };

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price: prices[plan],
        quantity: 1
      }
    ],
    mode: "subscription",
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    customer_email: email,
    client_reference_id: orgId,
    metadata: {
      orgId,
      plan
    }
  });

  return session;
}

export async function constructWebhookEvent(body: Buffer, signature: string) {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
}

export async function getSubscription(subscriptionId: string) {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function cancelSubscription(subscriptionId: string) {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  return stripe.subscriptions.cancel(subscriptionId);
}

export const stripePricing = {
  starter: {
    name: "Starter",
    price: 49,
    currency: "usd",
    interval: "month",
    features: ["Up to 5 workflows", "100 runs/month", "Email support"]
  },
  pro: {
    name: "Pro",
    price: 299,
    currency: "usd",
    interval: "month",
    features: ["Unlimited workflows", "10k runs/month", "Priority support", "Advanced analytics"]
  }
};
