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

test("supabase ping and config endpoints respond", async () => {
  const { server, baseUrl } = await startServer();

  try {
    const pingRes = await fetch(`${baseUrl}/api/supabase/ping`);
    assert.equal(pingRes.status, 200);
    const pingBody = await pingRes.json();
    // Should include configured flags
    assert.ok(typeof pingBody.configured === "boolean");
    assert.ok(typeof pingBody.hasSecret === "boolean");
    assert.ok(typeof pingBody.clientAvailable === "boolean");

    const cfgRes = await fetch(`${baseUrl}/api/supabase/config`);
    assert.equal(cfgRes.status, 200);
    const cfgBody = await cfgRes.json();
    assert.ok(cfgBody.config);
    assert.ok(typeof cfgBody.clientPresent === "boolean");
  } finally {
    server.close();
  }
});
