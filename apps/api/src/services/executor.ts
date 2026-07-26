import { createRun, updateRun, getInstalledWorkflow } from "../db/queries.js";

type ExecutionContext = {
  workflowId: string;
  orgId: string;
  inputs: Record<string, unknown>;
};

export async function executeWorkflow(context: ExecutionContext) {
  const workflow = await getInstalledWorkflow(context.workflowId);

  if (!workflow) {
    throw new Error("Workflow not found");
  }

  if (!workflow.enabled) {
    throw new Error("Workflow is disabled");
  }

  // Create a run record
  const run = await createRun(context.workflowId, "running");

  try {
    let output: Record<string, unknown>;

    // Route to appropriate executor based on workflow slug
    switch (workflow.slug) {
      case "support_triage":
        output = await executeSupportTriage(context, workflow);
        break;
      case "lead_scoring":
        output = await executeLeadScoring(context, workflow);
        break;
      case "email_sequence":
        output = await executeEmailSequence(context, workflow);
        break;
      case "kpi_digest":
        output = await executeKpiDigest(context, workflow);
        break;
      default:
        throw new Error(`Unknown workflow: ${workflow.slug}`);
    }

    // Mark run as successful
    await updateRun(run.id, {
      status: "success",
      completed_at: new Date(),
      output: JSON.stringify(output)
    });

    return { success: true, runId: run.id, output };
  } catch (error) {
    // Mark run as failed
    await updateRun(run.id, {
      status: "failed",
      completed_at: new Date(),
      error_message: error instanceof Error ? error.message : "Unknown error"
    });

    throw error;
  }
}

async function executeSupportTriage(
  context: ExecutionContext,
  workflow: any
) {
  // Placeholder: In production, this would:
  // 1. Fetch incoming support tickets
  // 2. Call OpenAI API to categorize and draft responses
  // 3. Store results in external system via integrations
  // 4. Return categorized tickets

  const mockTickets = [
    {
      id: "ticket_1",
      subject: "Cannot login to my account",
      body: "I've been trying to reset my password but the email never arrives.",
      category: "technical",
      priority: "high",
      suggestedResponse:
        "Thank you for reaching out. We'll help you reset your password. Please check your spam folder first..."
    },
    {
      id: "ticket_2",
      subject: "Billing question about renewal",
      body: "Can I change my plan before renewal?",
      category: "billing",
      priority: "medium",
      suggestedResponse:
        "Yes, you can change your plan anytime. You'll be charged the prorated difference..."
    }
  ];

  return {
    ticketsProcessed: mockTickets.length,
    tickets: mockTickets,
    summary: {
      highPriority: 1,
      mediumPriority: 1,
      categories: { technical: 1, billing: 1 }
    }
  };
}

async function executeLeadScoring(context: ExecutionContext, workflow: any) {
  // Placeholder: Score leads from CRM
  const mockLeads = [
    {
      id: "lead_1",
      name: "Acme Corp",
      email: "contact@acme.com",
      score: 85,
      scoreReason: "Enterprise company, high engagement, active trial",
      nextAction: "Schedule demo call"
    },
    {
      id: "lead_2",
      name: "StartupXYZ",
      email: "founder@startupxyz.com",
      score: 65,
      scoreReason: "Mid-market potential, moderate engagement",
      nextAction: "Send case study"
    }
  ];

  return {
    leadsScored: mockLeads.length,
    leads: mockLeads,
    topProspects: mockLeads.filter((l) => l.score >= 80)
  };
}

async function executeEmailSequence(context: ExecutionContext, workflow: any) {
  // Placeholder: Generate and schedule email sequences
  return {
    emailsSent: 3,
    sequence: [
      { day: 0, subject: "Welcome to QuotientIQ", stage: "sent" },
      { day: 2, subject: "Quick tip: Automating your support", stage: "scheduled" },
      { day: 5, subject: "See how others are saving time", stage: "scheduled" }
    ],
    recipientCount: 45
  };
}

async function executeKpiDigest(context: ExecutionContext, workflow: any) {
  // Placeholder: Generate weekly KPI summary
  return {
    period: "this week",
    metrics: {
      newLeads: 23,
      conversions: 5,
      avgResponseTime: "2.3 hours",
      customerSatisfaction: 92,
      workflowRuns: 157
    },
    highlights: [
      "15% increase in new leads",
      "Support response time down 20%",
      "Workflow automation saved ~40 hours"
    ]
  };
}

export async function testWorkflow(slug: string, inputs: Record<string, unknown>) {
  // Run a workflow without creating a persistent run record
  // Used for testing configurations before saving
  switch (slug) {
    case "support_triage":
      return await executeSupportTriage({}, { slug });
    case "lead_scoring":
      return await executeLeadScoring({}, { slug });
    case "email_sequence":
      return await executeEmailSequence({}, { slug });
    case "kpi_digest":
      return await executeKpiDigest({}, { slug });
    default:
      throw new Error(`Unknown workflow: ${slug}`);
  }
}
