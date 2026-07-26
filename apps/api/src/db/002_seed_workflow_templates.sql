-- Migration: 002_seed_workflow_templates.sql
-- Created: 2026-06-10
-- Purpose: Insert curated workflow templates for MVP

INSERT INTO workflow_templates (slug, title, category, description, required_integrations) VALUES
('support_triage', 'Support Ticket Triage', 'support', 'Auto-categorize inbound tickets and prepare first-response drafts.', ARRAY['email', 'ticketing']),
('lead_scoring', 'Lead Scoring and Follow-up', 'leadgen', 'Score new leads and draft personalized outreach.', ARRAY['crm']),
('email_sequence', 'Email Follow-up Sequence', 'email', 'Generate and schedule contextual email follow-up steps.', ARRAY['email', 'crm']),
('kpi_digest', 'Weekly KPI Digest', 'reporting', 'Summarize weekly operating metrics and anomalies.', ARRAY['crm']);

ON CONFLICT DO NOTHING;
