"use client";

import { useState, useEffect } from "react";

type PricingPlan = {
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
};

type PricingData = {
  pricing: {
    starter: PricingPlan;
    pro: PricingPlan;
  };
};

export default function PricingPage() {
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing/pricing")
      .then((res) => res.json())
      .then(setPricing)
      .finally(() => setLoading(false));
  }, []);

  const handleCheckout = async (plan: "starter" | "pro") => {
    setCheckingOut(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          Authorization: "Bearer temp",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          plan,
          email: "user@example.com" // In production, get from Clerk
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Redirect to Stripe checkout
        if (data.url) {
          window.location.href = data.url;
        }
      }
    } catch (error) {
      console.error("Checkout failed:", error);
      alert("Checkout failed. Please try again.");
    } finally {
      setCheckingOut(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-textSoft">Loading pricing...</div>
      </div>
    );
  }

  if (!pricing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-400">Failed to load pricing</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text px-6 py-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-textSoft max-w-2xl mx-auto">
            Choose the plan that works for your business. Always pay for what you use.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 lg:grid-cols-2 max-w-4xl mx-auto">
          <PricingCard
            plan="starter"
            data={pricing.pricing.starter}
            isPopular={false}
            onCheckout={handleCheckout}
            isLoading={checkingOut === "starter"}
          />
          <PricingCard
            plan="pro"
            data={pricing.pricing.pro}
            isPopular={true}
            onCheckout={handleCheckout}
            isLoading={checkingOut === "pro"}
          />
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <FAQItem
              question="Can I change plans anytime?"
              answer="Yes, you can upgrade or downgrade your plan at any time. Changes take effect at your next billing cycle."
            />
            <FAQItem
              question="What happens if I exceed my run limit?"
              answer="We'll notify you when you're approaching your limit. You can upgrade to increase your quota."
            />
            <FAQItem
              question="Do you offer annual billing?"
              answer="Contact our sales team at sales@quotientiq.com for custom pricing and annual plans."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingCard({
  plan,
  data,
  isPopular,
  onCheckout,
  isLoading
}: {
  plan: "starter" | "pro";
  data: PricingPlan;
  isPopular: boolean;
  onCheckout: (plan: "starter" | "pro") => void;
  isLoading: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border-2 p-8 transition ${
        isPopular
          ? "border-accent bg-panel shadow-lg shadow-accent/20"
          : "border-line bg-panelSoft"
      }`}
    >
      {isPopular && (
        <div className="mb-4 inline-block rounded-full bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">
          Most Popular
        </div>
      )}

      <h3 className="text-2xl font-bold mb-2">{data.name}</h3>
      <div className="mb-6">
        <span className="text-4xl font-bold">${data.price}</span>
        <span className="text-textSoft">/{data.interval}</span>
      </div>

      <button
        onClick={() => onCheckout(plan)}
        disabled={isLoading}
        className={`w-full rounded-lg px-6 py-3 font-semibold transition mb-6 ${
          isPopular
            ? "bg-accent text-bg hover:bg-accent/90"
            : "border border-line text-text hover:bg-panelSoft"
        } disabled:opacity-50`}
      >
        {isLoading ? "Processing..." : "Get Started"}
      </button>

      <div className="space-y-3">
        {data.features.map((feature) => (
          <div key={feature} className="flex items-center gap-2">
            <span className="text-success">✓</span>
            <span className="text-sm">{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-line bg-panelSoft p-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left font-semibold flex items-center justify-between hover:text-accent transition"
      >
        {question}
        <span className={`transition ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      {open && <p className="mt-4 text-textSoft text-sm">{answer}</p>}
    </div>
  );
}
