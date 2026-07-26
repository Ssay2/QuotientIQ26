export type WorkflowCategory = "support" | "leadgen" | "email" | "reporting";

export type WorkflowTemplate = {
  id: string;
  title: string;
  category: WorkflowCategory;
  description: string;
};

export type HealthStatus = {
  status: "ok";
  service: string;
  timestamp: string;
};
