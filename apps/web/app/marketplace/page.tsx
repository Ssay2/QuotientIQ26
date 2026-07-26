"use client";

import { useEffect, useState } from "react";

type Workflow = {
  id: string;
  title: string;
  category: string;
  description: string;
};

export default function MarketplacePage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const params = selectedCategory ? `?category=${selectedCategory}` : "";
        const res = await fetch(`/api/marketplace/workflows${params}`);
        const data = await res.json();
        setWorkflows(data.workflows || []);
      } catch (error) {
        console.error("Failed to fetch workflows:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflows();
  }, [selectedCategory]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-4xl font-bold">AI Workflow Marketplace</h1>
        <p className="mt-2 text-textSoft">
          Discover and install curated AI workflows for your team.
        </p>
      </header>

      <div className="mb-6 flex gap-2">
        {["support", "leadgen", "email", "reporting"].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(selectedCategory === cat ? undefined : cat)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              selectedCategory === cat
                ? "bg-accent text-bg"
                : "border border-line bg-panelSoft text-text hover:border-accent"
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-textSoft">Loading workflows...</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {workflows.map((workflow) => (
            <WorkflowCard key={workflow.id} workflow={workflow} />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkflowCard({ workflow }: { workflow: Workflow }) {
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const res = await fetch(`/api/marketplace/workflows/${workflow.id}/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workflow.title,
          config: {}
        })
      });

      if (res.ok) {
        alert(`${workflow.title} installed successfully!`);
      } else {
        alert("Failed to install workflow");
      }
    } catch (error) {
      console.error("Install failed:", error);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-line bg-panel p-6">
      <div>
        <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          {workflow.category}
        </span>
        <h3 className="mt-3 text-xl font-semibold">{workflow.title}</h3>
        <p className="mt-2 text-sm text-textSoft">{workflow.description}</p>
      </div>
      <button
        onClick={handleInstall}
        disabled={installing}
        className="mt-4 rounded-lg bg-accent px-4 py-2 font-medium text-bg transition hover:bg-accent/90 disabled:opacity-50"
      >
        {installing ? "Installing..." : "Install"}
      </button>
    </div>
  );
}
