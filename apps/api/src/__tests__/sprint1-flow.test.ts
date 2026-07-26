import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../app.js";

async function startServer() {
  const app = createApp();
  const server = app.listen(0, "127.0.0.1");

  await new Promise<void>((resolve) => {
    server.once("listening", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to determine test server address");
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;

  return { server, baseUrl };
}

test("signup, create organization, and create an agent in one flow", async () => {
  const { server, baseUrl } = await startServer();

  try {
    const signupResponse = await fetch(`${baseUrl}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "demo@quotientiq.com", name: "Demo User" })
    });

    assert.equal(signupResponse.status, 201);
    const signupBody = await signupResponse.json();
    assert.equal(signupBody.user.email, "demo@quotientiq.com");

    const orgResponse = await fetch(`${baseUrl}/api/organizations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Contoso Labs", ownerId: signupBody.user.id })
    });

    assert.equal(orgResponse.status, 201);
    const orgBody = await orgResponse.json();
    assert.equal(orgBody.name, "Contoso Labs");

    const agentResponse = await fetch(`${baseUrl}/api/agents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: orgBody.id,
        name: "Support Agent",
        role: "Customer Support",
        description: "Handles support requests",
        systemPrompt: "You are a helpful support assistant"
      })
    });

    assert.equal(agentResponse.status, 201);
    const agentBody = await agentResponse.json();
    assert.equal(agentBody.name, "Support Agent");
  } finally {
    server.close();
  }
});
