"use client";

import { useEffect, useState } from "react";

type DashboardStats = {
  workflowCount: number;
  runCount: number;
  memberCount: number;
  plan: string;
  status: string;
};

type Workflow = {
  id: string;
  name: string;
  title: string;
  category: string;
  enabled: boolean;
  created_at: string;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, workflowsRes] = await Promise.all([
          fetch("/api/dashboard/stats", {
            headers: { Authorization: "Bearer temp" }
          }),
          fetch("/api/dashboard/workflows", {
            headers: { Authorization: "Bearer temp" }
          })
        ]);

        if (statsRes.ok) {
          setStats(await statsRes.json());
        }
        if (workflowsRes.ok) {
          const data = await workflowsRes.json();
          setWorkflows(data.workflows || []);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-textSoft">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text px-6 py-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <p className="mt-2 text-textSoft">
            Manage your workflows and track execution performance
          </p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid gap-4 lg:grid-cols-4 mb-8">
            <StatCard label="Workflows" value={stats.workflowCount} icon="⚙️" />
            <StatCard label="Total Runs" value={stats.runCount} icon="▶️" />
            <StatCard label="Team Members" value={stats.memberCount} icon="👥" />
            <StatCard
              label="Plan"
              value={stats.plan.charAt(0).toUpperCase() + stats.plan.slice(1)}
              icon="💳"
            />
          </div>
        )}

        {/* Workflows Section */}
        <div className="rounded-2xl border border-line bg-panel p-6">
          <h2 className="text-2xl font-semibold mb-4">Your Workflows</h2>

          {workflows.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-textSoft">No workflows installed yet.</p>
              <a href="/marketplace" className="mt-4 inline-block text-accent hover:underline">
                Browse marketplace →
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <WorkflowRow key={workflow.id} workflow={workflow} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div className="rounded-lg border border-line bg-panelSoft p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-textSoft">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

function WorkflowRow({ workflow }: { workflow: Workflow }) {
  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      const res = await fetch(`/api/dashboard/workflows/${workflow.id}/execute`, {
        method: "POST",
        headers: {
          Authorization: "Bearer temp",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: {} })
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Workflow executed! Run ID: ${data.runId}`);
      }
    } catch (error) {
      console.error("Execution failed:", error);
      alert("Failed to execute workflow");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-line/50 bg-panelSoft/50 p-4 hover:bg-panelSoft transition">
      <div className="flex-1">
        <h3 className="font-semibold">{workflow.name}</h3>
        <p className="text-sm text-textSoft">{workflow.title}</p>
        <div className="mt-2 flex gap-2">
          <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">
            {workflow.category}
          </span>
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs ${
              workflow.enabled
                ? "bg-success/10 text-success"
                : "bg-warning/10 text-warning"
            }`}
          >
            {workflow.enabled ? "Active" : "Disabled"}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleExecute}
          disabled={isExecuting || !workflow.enabled}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:bg-accent/90 disabled:opacity-50"
        >
          {isExecuting ? "Running..." : "Execute"}
        </button>
        <a
          href={`/dashboard/workflows/${workflow.id}`}
          className="rounded-lg border border-line bg-transparent px-4 py-2 text-sm font-medium transition hover:bg-panelSoft"
        >
          Details
        </a>
      </div>
    </div>
  );
}
