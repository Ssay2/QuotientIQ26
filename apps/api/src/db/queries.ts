import pool from "./client.js";

// Organizations
export async function createOrg(name: string, clerkOrgId: string) {
  const result = await pool.query(
    "INSERT INTO organizations (name, clerk_org_id) VALUES ($1, $2) RETURNING *",
    [name, clerkOrgId]
  );
  return result.rows[0];
}

export async function getOrgById(id: string) {
  const result = await pool.query("SELECT * FROM organizations WHERE id = $1", [id]);
  return result.rows[0];
}

// Memberships
export async function addMember(orgId: string, clerkUserId: string, email: string, role: string) {
  const result = await pool.query(
    `INSERT INTO memberships (org_id, clerk_user_id, email, role) 
     VALUES ($1, $2, $3, $4) 
     ON CONFLICT (org_id, clerk_user_id) DO UPDATE SET role = EXCLUDED.role
     RETURNING *`,
    [orgId, clerkUserId, email, role]
  );
  return result.rows[0];
}

export async function getMembersForOrg(orgId: string) {
  const result = await pool.query(
    "SELECT * FROM memberships WHERE org_id = $1 ORDER BY created_at DESC",
    [orgId]
  );
  return result.rows;
}

// Installed Workflows
export async function createInstalledWorkflow(
  orgId: string,
  templateId: string,
  name: string,
  config: Record<string, unknown>
) {
  const result = await pool.query(
    `INSERT INTO installed_workflows (org_id, template_id, name, config, enabled)
     VALUES ($1, $2, $3, $4, true)
     RETURNING *`,
    [orgId, templateId, name, JSON.stringify(config)]
  );
  return result.rows[0];
}

export async function getInstalledWorkflows(orgId: string) {
  const result = await pool.query(
    `SELECT iw.*, wt.title, wt.category, wt.description
     FROM installed_workflows iw
     JOIN workflow_templates wt ON iw.template_id = wt.id
     WHERE iw.org_id = $1
     ORDER BY iw.created_at DESC`,
    [orgId]
  );
  return result.rows;
}

export async function getInstalledWorkflow(id: string) {
  const result = await pool.query(
    `SELECT iw.*, wt.title, wt.category, wt.description, wt.slug
     FROM installed_workflows iw
     JOIN workflow_templates wt ON iw.template_id = wt.id
     WHERE iw.id = $1`,
    [id]
  );
  return result.rows[0];
}

export async function updateWorkflowConfig(id: string, config: Record<string, unknown>) {
  const result = await pool.query(
    "UPDATE installed_workflows SET config = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [JSON.stringify(config), id]
  );
  return result.rows[0];
}

export async function toggleWorkflow(id: string, enabled: boolean) {
  const result = await pool.query(
    "UPDATE installed_workflows SET enabled = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [enabled, id]
  );
  return result.rows[0];
}

// Workflow Runs
export async function createRun(workflowId: string, status: string = "pending") {
  const result = await pool.query(
    "INSERT INTO workflow_runs (workflow_id, status) VALUES ($1, $2) RETURNING *",
    [workflowId, status]
  );
  return result.rows[0];
}

export async function updateRun(runId: string, data: Record<string, unknown>) {
  const fields = Object.keys(data)
    .map((key, idx) => `${key} = $${idx + 1}`)
    .join(", ");
  const values = Object.values(data);

  const result = await pool.query(
    `UPDATE workflow_runs SET ${fields}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING *`,
    [...values, runId]
  );
  return result.rows[0];
}

export async function getWorkflowRuns(workflowId: string, limit: number = 20) {
  const result = await pool.query(
    `SELECT * FROM workflow_runs 
     WHERE workflow_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [workflowId, limit]
  );
  return result.rows;
}

// Subscriptions
export async function createSubscription(orgId: string, stripeSubId: string, plan: string) {
  const result = await pool.query(
    `INSERT INTO subscriptions (org_id, stripe_subscription_id, plan, status)
     VALUES ($1, $2, $3, 'active')
     ON CONFLICT (org_id) DO UPDATE SET stripe_subscription_id = EXCLUDED.stripe_subscription_id, plan = EXCLUDED.plan
     RETURNING *`,
    [orgId, stripeSubId, plan]
  );
  return result.rows[0];
}

export async function getSubscription(orgId: string) {
  const result = await pool.query("SELECT * FROM subscriptions WHERE org_id = $1", [orgId]);
  return result.rows[0];
}

export async function getOrgStats(orgId: string) {
  const [workflows, runs, members] = await Promise.all([
    pool.query("SELECT COUNT(*) as count FROM installed_workflows WHERE org_id = $1", [orgId]),
    pool.query(
      "SELECT COUNT(*) as count FROM workflow_runs wr JOIN installed_workflows iw ON wr.workflow_id = iw.id WHERE iw.org_id = $1",
      [orgId]
    ),
    pool.query("SELECT COUNT(*) as count FROM memberships WHERE org_id = $1", [orgId])
  ]);

  return {
    workflowCount: parseInt(workflows.rows[0].count),
    runCount: parseInt(runs.rows[0].count),
    memberCount: parseInt(members.rows[0].count)
  };
}
