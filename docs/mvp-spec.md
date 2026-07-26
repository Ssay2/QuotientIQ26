# QuotientIQ MVP Spec

## 1. MVP Objective

Deliver a focused AI Workflow Marketplace for SMBs that proves customers will pay for deployable AI workflows with measurable operational ROI.

## 2. Scope and Boundaries

### In Scope

- User authentication and organization workspace creation
- Marketplace listing and install flow for curated AI workflows
- Workflow execution engine for 4 launch categories
- Basic integrations (email + one CRM + one ticketing/helpdesk channel)
- Usage, run history, and cost visibility dashboard
- Subscription billing and plan limits

### Out of Scope (MVP)

- Full public developer platform
- Deep enterprise compliance certifications
- Multi-region deployments
- Advanced autonomous multi-agent coordination
- Custom model hosting

## 3. Target Customer and Primary Use Cases

### Ideal Initial Customer

SMB operators with 10 to 200 employees in service-heavy or sales-heavy businesses.

### Launch Use Cases

1. Customer support automation
2. Lead generation and enrichment workflows
3. Email automation and follow-up sequencing
4. Weekly reporting and KPI summaries

## 4. User Roles

- Owner/Admin: configures billing, integrations, access
- Operator: installs workflows, monitors runs, adjusts settings
- Reviewer: read-only access to outcomes and metrics

## 5. Core User Stories

### Onboarding and Setup

1. As an admin, I can create an account and organization workspace.
2. As an admin, I can connect company tools (email, CRM, ticketing).
3. As an admin, I can invite team members with role-based permissions.

### Marketplace and Installation

1. As an operator, I can browse workflow templates by business function.
2. As an operator, I can view workflow details, required integrations, and expected outputs.
3. As an operator, I can install and configure a workflow in under 10 minutes.

### Workflow Operations

1. As an operator, I can trigger workflows manually or on schedule.
2. As an operator, I can see run status, execution logs, and outputs.
3. As an operator, I can pause, edit, or disable a workflow.

### Reporting and Value Measurement

1. As an admin, I can view usage volume and estimated time saved.
2. As an admin, I can view AI spend by workflow and date range.
3. As a reviewer, I can export summary reports for leadership.

### Billing

1. As an admin, I can subscribe to a paid plan with Stripe checkout.
2. As an admin, I can see plan limits and upgrade prompts.
3. As an admin, I can access invoices and billing history.

## 6. Functional Requirements

### FR-1 Authentication and Workspace

- Support sign-up/login, password reset, session management.
- One user can belong to one or more organizations.
- Organization-level separation for data and workflow state.

### FR-2 Integrations

- OAuth or API key connection flows.
- Minimum connectors for MVP:
  - Gmail or Outlook
  - HubSpot or Salesforce (choose one first)
  - Helpdesk input channel (email inbox or ticket webhook)

### FR-3 Workflow Engine

- Workflow schema includes trigger, steps, tools, and output actions.
- Each run captures deterministic metadata for auditing.
- Retry and failure handling with user-visible status.

### FR-4 Marketplace

- Curated internal catalog of workflows (not open submissions yet).
- Listing includes category, summary, integration requirements, and pricing tier availability.
- Install flow creates a tenant-scoped workflow instance.

### FR-5 Dashboard and Analytics

- Show runs, success rate, last run time, and errors.
- Show model usage and estimated cost per workflow.
- Show basic adoption metrics (active workflows, active users).

### FR-6 Billing and Plans

- Stripe subscription for Starter and Pro plans.
- Usage caps and soft enforcement alerts.
- Plan-aware feature gating.

### FR-7 Security Baseline

- Encryption in transit and at rest.
- Role-based access control.
- Audit log for integration actions and workflow changes.

## 7. Non-Functional Requirements

- Uptime target: 99.5% during MVP
- p95 workflow start latency under 5 seconds for standard jobs
- Core page load under 2.5 seconds on average broadband
- All customer data isolated by organization ID
- Error tracking and alerting enabled for production

## 8. Suggested Technical Design

### Frontend

- Next.js (App Router)
- TypeScript
- Tailwind CSS

### Backend

- Node.js + Express API
- Optional GraphQL gateway if needed after MVP
- Background worker queue for workflow execution

### Data

- PostgreSQL for relational data
- Redis for queues and caching
- Object storage for workflow artifacts/log blobs

### AI Layer

- OpenAI and Anthropic providers
- Provider abstraction for fallback and cost routing
- Prompt templates versioned by workflow

### Auth and Billing

- Clerk (or Auth0)
- Stripe subscriptions + webhook processing

### Hosting

- Vercel for web app
- Managed container/runtime for worker services
- Managed PostgreSQL and Redis

## 9. API Surface (Initial)

### Auth and Org

- POST /api/auth/signup
- POST /api/auth/login
- POST /api/orgs
- POST /api/orgs/:orgId/invite

### Integrations

- POST /api/integrations/:provider/connect
- GET /api/integrations
- DELETE /api/integrations/:id

### Marketplace

- GET /api/marketplace/workflows
- GET /api/marketplace/workflows/:id
- POST /api/marketplace/workflows/:id/install

### Workflow Execution

- GET /api/workflows
- POST /api/workflows/:id/run
- PATCH /api/workflows/:id
- GET /api/workflows/:id/runs

### Analytics and Billing

- GET /api/analytics/overview
- GET /api/billing/summary
- POST /api/billing/checkout

## 10. Data Model (Core Entities)

- User
- Organization
- Membership
- IntegrationConnection
- WorkflowTemplate
- InstalledWorkflow
- WorkflowRun
- RunEvent
- UsageMetric
- Subscription
- Invoice

## 11. MVP Success Metrics

### Product Metrics

- Time to first workflow install under 15 minutes
- Weekly active organizations
- Workflow run success rate above 90%

### Business Metrics

- First 10 paying customers
- Gross churn under 8% monthly in early cohort
- Positive customer-reported ROI within first 30 days

### Operational Metrics

- Cost per workflow run within target margin
- Support response under 24 hours
- Critical incident mean time to recovery under 2 hours

## 12. Delivery Plan (12 Weeks)

### Sprint 1-2: Foundation

- Auth, org model, project setup, CI/CD baseline

### Sprint 3-4: Integrations

- Connector framework plus first two integrations

### Sprint 5-6: Workflow Engine

- Runtime execution, retries, logs, status model

### Sprint 7-8: Marketplace and Install UX

- Catalog UI, detail pages, install configuration flow

### Sprint 9-10: Dashboard and Billing

- Analytics baseline, Stripe subscriptions, plan gating

### Sprint 11-12: Hardening and Launch

- Reliability pass, security baseline, docs, launch checklist

## 13. Risks and Mitigations

1. AI output quality variance
- Mitigation: constrained prompts, validation layers, human-review option for critical actions

2. Integration fragility
- Mitigation: connector abstraction, retry policies, provider health checks

3. Unit economics pressure
- Mitigation: model routing, token budgets, workflow-level usage guardrails

4. Slow activation
- Mitigation: prebuilt templates, guided setup, success playbooks

## 14. Launch Checklist

- Production monitoring and alerting live
- Billing tested end-to-end with webhooks
- Data backup and restore plan verified
- Incident runbook documented
- Security baseline review completed
- Onboarding docs and in-app guidance published

## 15. Post-MVP Expansion Triggers

Expand only after:

- Repeatable acquisition of paying customers
- Retention and usage goals met for 2 consecutive months
- Stable gross margin on core workflows

Then prioritize:

1. Public developer publishing
2. Additional workflow categories
3. Enterprise governance package
4. Advanced multi-agent orchestration
