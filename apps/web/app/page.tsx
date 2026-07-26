import { SectionCard } from "@/components/section-card";
import { getHealth } from "@/lib/api";

const launchCategories = [
  "AI Customer Support Automation",
  "AI Lead Generation",
  "AI Email Automation",
  "AI Reporting Assistant"
];

const coreMilestones = [
  "First 10 paying customers",
  "Sub-15 minute first workflow install",
  "Workflow success rate > 90%",
  "Marketplace launch with curated templates"
];

export default async function HomePage() {
  const health = await getHealth();

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-12 lg:px-10">
      <header className="rounded-3xl border border-line bg-panel px-8 py-10">
        <p className="inline-flex rounded-full border border-accent/50 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
          QuotientIQ MVP Command Center
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight lg:text-5xl">
          Enterprise AI Workflow Marketplace
        </h1>
        <p className="mt-4 max-w-2xl text-base text-textSoft">
          Starter dashboard for validating the SMB wedge: launch curated AI workflows, track
          execution reliability, and measure ROI in one place.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full border border-line bg-panelSoft px-3 py-1">Web: Next.js</span>
          <span className="rounded-full border border-line bg-panelSoft px-3 py-1">API: Express</span>
          <span className="rounded-full border border-line bg-panelSoft px-3 py-1">Data: PostgreSQL</span>
          <span className="rounded-full border border-line bg-panelSoft px-3 py-1">Billing: Stripe</span>
        </div>
        <p className="mt-5 text-sm text-textSoft">
          API health: {health ? `${health.status} (${health.timestamp})` : "offline"}
        </p>
      </header>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Launch Workflow Categories"
          description="Curated catalog for early validation."
          items={launchCategories}
        />
        <SectionCard
          title="Execution Milestones"
          description="Metrics that define successful MVP traction."
          items={coreMilestones}
        />
      </section>
    </main>
  );
}
