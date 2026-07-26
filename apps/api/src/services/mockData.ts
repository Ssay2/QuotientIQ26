export type WorkflowTemplate = {
  id: string;
  title: string;
  category: "support" | "leadgen" | "email" | "reporting";
  description: string;
};

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "wf_support_triage",
    title: "Support Ticket Triage",
    category: "support",
    description: "Auto-categorize inbound tickets and prepare first-response drafts."
  },
  {
    id: "wf_lead_score",
    title: "Lead Scoring and Follow-up",
    category: "leadgen",
    description: "Score new leads and draft personalized outreach."
  },
  {
    id: "wf_email_sequence",
    title: "Email Follow-up Sequence",
    category: "email",
    description: "Generate and schedule contextual email follow-up steps."
  },
  {
    id: "wf_kpi_digest",
    title: "Weekly KPI Digest",
    category: "reporting",
    description: "Summarize weekly operating metrics and anomalies."
  }
];
