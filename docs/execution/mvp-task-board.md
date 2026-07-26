# QuotientIQ MVP Task Board

## Usage Notes

- This board is organized by epics.
- Each ticket includes acceptance criteria and definition of done.
- IDs use the format QIQ-<EPIC>-<NUMBER>.

## Epic E1 - Platform Foundation

### QIQ-E1-01 Repository and Monorepo Setup

**Description:** Initialize workspace structure for web app, API, and shared package.

**Acceptance Criteria:**
- Root workspace supports app-level scripts.
- `apps/web`, `apps/api`, and `packages/shared` exist.
- Basic lint and typecheck commands run from root.

**Definition of Done:**
- Structure committed with setup docs.

### QIQ-E1-02 Environment and Config Layer

**Description:** Establish environment variable strategy for local/dev/prod.

**Acceptance Criteria:**
- `.env.example` provided for root, web, and API.
- Config access is typed in backend and frontend.
- Missing critical env vars fail fast at startup.

**Definition of Done:**
- Startup validation tested and documented.

### QIQ-E1-03 CI Pipeline Baseline

**Description:** Add CI checks for install, lint, typecheck, and tests.

**Acceptance Criteria:**
- CI runs on pull requests.
- Build failure blocks merge.
- Pipeline artifacts include test summaries.

**Definition of Done:**
- CI status badge added to README.

## Epic E2 - Auth and Organizations

### QIQ-E2-01 User Auth Integration

**Description:** Implement sign-up/login/session with Clerk or Auth0.

**Acceptance Criteria:**
- Users can sign up, log in, and log out.
- Protected routes redirect unauthenticated users.
- Session metadata includes user and org context.

**Definition of Done:**
- End-to-end auth flow tested in staging.

### QIQ-E2-02 Organization and Membership Model

**Description:** Add organization entities and role-based membership.

**Acceptance Criteria:**
- Organization creation endpoint available.
- Invite flow supports Owner, Operator, Reviewer roles.
- Access checks enforce role permissions.

**Definition of Done:**
- Role matrix verified with tests.

## Epic E3 - Integration Layer

### QIQ-E3-01 Connector Framework

**Description:** Build a reusable connector abstraction with token storage.

**Acceptance Criteria:**
- Connector interface supports connect, refresh, and revoke.
- Secrets stored securely (never plain logs).
- Connector health status visible in API responses.

**Definition of Done:**
- One reference connector passes integration tests.

### QIQ-E3-02 Email Connector (Gmail or Outlook)

**Description:** Implement first email provider integration.

**Acceptance Criteria:**
- OAuth flow completes successfully.
- Read and send scopes validated.
- Connection status shown in settings UI.

**Definition of Done:**
- Manual QA checklist completed.

### QIQ-E3-03 CRM Connector (HubSpot or Salesforce)

**Description:** Implement initial CRM provider for lead workflows.

**Acceptance Criteria:**
- OAuth or token auth flow functional.
- Can fetch contacts and update a limited record set.
- Rate limit handling and retries implemented.

**Definition of Done:**
- Integration smoke tests in CI.

## Epic E4 - Workflow Engine

### QIQ-E4-01 Workflow Template Schema

**Description:** Define schema for triggers, steps, tools, and outputs.

**Acceptance Criteria:**
- JSON schema validates template payloads.
- Versioning supported for template updates.
- Invalid templates produce actionable errors.

**Definition of Done:**
- Schema docs published.

### QIQ-E4-02 Workflow Runtime and Queue

**Description:** Execute installed workflows asynchronously with retries.

**Acceptance Criteria:**
- Queue-backed execution for scheduled and manual runs.
- Retry policy configurable by workflow.
- Failed runs capture structured failure reason.

**Definition of Done:**
- p95 start latency and success metrics instrumented.

### QIQ-E4-03 Run Logs and Audit Trail

**Description:** Persist run events for observability and compliance.

**Acceptance Criteria:**
- Step-level events stored and queryable.
- Logs include correlation IDs.
- Audit trail includes actor, timestamp, and action.

**Definition of Done:**
- Logs visible in dashboard run detail.

## Epic E5 - Marketplace

### QIQ-E5-01 Workflow Catalog API

**Description:** Serve curated workflow templates via marketplace endpoints.

**Acceptance Criteria:**
- List and detail endpoints include category and requirements.
- Supports filter and search by use case.
- Tenant-safe response payloads only.

**Definition of Done:**
- API contract tests green.

### QIQ-E5-02 Marketplace UI

**Description:** Build browse and detail experience in web app.

**Acceptance Criteria:**
- Users can browse workflows by category.
- Detail page shows prerequisites and expected outcomes.
- Install CTA and config handoff works.

**Definition of Done:**
- Usability pass completed for desktop and mobile.

### QIQ-E5-03 Install and Configure Flow

**Description:** Turn template into tenant-scoped installed workflow.

**Acceptance Criteria:**
- Install creates a new `InstalledWorkflow` record.
- Setup wizard captures required parameters.
- Validation prevents incomplete activation.

**Definition of Done:**
- New install can execute a test run successfully.

## Epic E6 - Dashboard and Analytics

### QIQ-E6-01 Operations Dashboard

**Description:** Show workflow health and activity overview.

**Acceptance Criteria:**
- Displays active workflows, run counts, and success rates.
- Displays last run and recent errors.
- Filter by date range and workflow.

**Definition of Done:**
- Dashboard loads under target performance budget.

### QIQ-E6-02 Cost and Usage Tracking

**Description:** Track token usage and estimated cost per workflow.

**Acceptance Criteria:**
- Provider usage normalized into common metric model.
- Cost estimate shown per run and aggregate period.
- Alerts trigger near plan limit.

**Definition of Done:**
- Cost calculations validated against provider invoices.

## Epic E7 - Billing and Monetization

### QIQ-E7-01 Stripe Subscription Checkout

**Description:** Add Starter and Pro plan checkout flow.

**Acceptance Criteria:**
- Checkout session creation and redirect work.
- Webhooks update subscription state reliably.
- Failed payments produce user-visible warnings.

**Definition of Done:**
- Test mode and live mode checklists complete.

### QIQ-E7-02 Plan Gating and Limits

**Description:** Enforce plan-based limits and upgrade prompts.

**Acceptance Criteria:**
- Feature flags tied to active subscription tier.
- Soft limit notifications before hard blocks.
- Upgrade path reachable from all limit errors.

**Definition of Done:**
- Limit enforcement validated through integration tests.

## Epic E8 - Security and Reliability

### QIQ-E8-01 RBAC Enforcement

**Description:** Enforce authorization checks in API and UI.

**Acceptance Criteria:**
- Owner, Operator, Reviewer permissions implemented.
- Unauthorized actions return proper status codes.
- UI hides unavailable actions by role.

**Definition of Done:**
- Authorization test suite passes.

### QIQ-E8-02 Observability and Alerting

**Description:** Add error tracking, logs, and incident alerts.

**Acceptance Criteria:**
- Unhandled exceptions captured with trace IDs.
- Critical alerts routed to on-call channel.
- Health endpoints monitored.

**Definition of Done:**
- Incident simulation run completed.

### QIQ-E8-03 Backup and Recovery

**Description:** Define and verify backup strategy for critical data.

**Acceptance Criteria:**
- Automated backups enabled for primary datastore.
- Restore drill documented and tested.
- RPO/RTO targets defined.

**Definition of Done:**
- Recovery test sign-off completed.

## Prioritization Sequence

1. E1 -> E2 -> E3 -> E4
2. E5 and E6 in parallel after core engine stable
3. E7 after first stable workflow path
4. E8 hardening before public launch

## Sprint Mapping (12 Weeks)

1. Weeks 1-2: E1, E2
2. Weeks 3-4: E3
3. Weeks 5-6: E4
4. Weeks 7-8: E5
5. Weeks 9-10: E6, E7
6. Weeks 11-12: E8, launch readiness
