import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";

describe("API - Health Check", () => {
  const baseUrl = "http://localhost:4000";

  it("should return health status", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("status", "ok");
    expect(data).toHaveProperty("service", "quotientiq-api");
    expect(data).toHaveProperty("timestamp");
  });
});

describe("API - Marketplace", () => {
  const baseUrl = "http://localhost:4000";
  const authHeaders = { Authorization: "Bearer temp" };

  it("should list available workflows", async () => {
    const response = await fetch(`${baseUrl}/api/marketplace/workflows`, {
      headers: authHeaders
    });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("workflows");
    expect(Array.isArray(data.workflows)).toBe(true);
    expect(data.workflows.length).toBeGreaterThan(0);
  });

  it("should filter workflows by category", async () => {
    const response = await fetch(`${baseUrl}/api/marketplace/workflows?category=support`, {
      headers: authHeaders
    });
    expect(response.status).toBe(200);

    const data = await response.json();
    const supportWorkflows = data.workflows.filter((w: any) => w.category === "support");
    expect(supportWorkflows.length).toBeGreaterThan(0);
  });

  it("should install a workflow", async () => {
    const response = await fetch(`${baseUrl}/api/marketplace/workflows/wf_support_triage/install`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        templateId: "wf_support_triage",
        name: "Test Workflow",
        config: {}
      })
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("name", "Test Workflow");
    expect(data).toHaveProperty("enabled", true);
  });
});

describe("API - Dashboard", () => {
  const baseUrl = "http://localhost:4000";
  const authHeaders = { Authorization: "Bearer temp" };

  it("should return dashboard stats", async () => {
    const response = await fetch(`${baseUrl}/api/dashboard/stats`, {
      headers: authHeaders
    });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("workflowCount");
    expect(data).toHaveProperty("runCount");
    expect(data).toHaveProperty("memberCount");
    expect(data).toHaveProperty("plan");
  });

  it("should list installed workflows", async () => {
    const response = await fetch(`${baseUrl}/api/dashboard/workflows`, {
      headers: authHeaders
    });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("workflows");
    expect(Array.isArray(data.workflows)).toBe(true);
  });
});

describe("API - Billing", () => {
  const baseUrl = "http://localhost:4000";

  it("should return pricing information", async () => {
    const response = await fetch(`${baseUrl}/api/billing/pricing`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("pricing");
    expect(data.pricing).toHaveProperty("starter");
    expect(data.pricing).toHaveProperty("pro");

    const starter = data.pricing.starter;
    expect(starter).toHaveProperty("price");
    expect(starter).toHaveProperty("features");
    expect(Array.isArray(starter.features)).toBe(true);
  });
});
