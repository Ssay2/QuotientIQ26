# Database Schema and Migrations

## Overview

QuotientIQ uses PostgreSQL for core data storage with the following entity model:

- **organizations** - company workspaces
- **memberships** - org access control with roles
- **integrations** - external tool credentials (email, CRM, etc)
- **workflow_templates** - curated workflow definitions from marketplace
- **installed_workflows** - user-configured instances of templates
- **workflow_runs** - execution history and results
- **subscriptions** - Stripe subscription state

## Running Migrations

### Local Development (Docker)

Migrations will run automatically on container startup (in future versions with Flyway or similar).

For now, connect to the database and run SQL manually:

```bash
# Get container ID
docker ps | grep quotientiq-db

# Connect to psql
docker exec -it <container_id> psql -U quotientiq -d quotientiq_dev

# Copy and paste contents of migration files
```

### Schema Files

- [001_initial_schema.sql](../../apps/api/src/db/001_initial_schema.sql) - core tables and indexes
- [002_seed_workflow_templates.sql](../../apps/api/src/db/002_seed_workflow_templates.sql) - launch workflows

## Entity Model

### organizations
Workspace container for users and workflows.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| name | VARCHAR(255) | Company name |
| clerk_org_id | VARCHAR(255) | Clerk org reference |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### memberships
Role-based access control.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| org_id | UUID | Foreign key to organizations |
| clerk_user_id | VARCHAR(255) | Clerk user ID |
| email | VARCHAR(255) | User email |
| role | VARCHAR(50) | owner, operator, or reviewer |

### workflow_templates
Curated marketplace offerings.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| slug | VARCHAR(100) | URL-friendly identifier |
| title | VARCHAR(255) | Display name |
| category | VARCHAR(100) | support, leadgen, email, reporting |
| description | TEXT | User-facing description |
| required_integrations | TEXT[] | ["email", "crm"] |

### installed_workflows
Tenant-scoped workflow instances.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| org_id | UUID | Foreign key |
| template_id | UUID | Which marketplace workflow |
| name | VARCHAR(255) | Custom name in org |
| config | JSONB | Workflow-specific settings |
| enabled | BOOLEAN | Active status |

### workflow_runs
Execution history.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| workflow_id | UUID | Foreign key to installed_workflows |
| status | VARCHAR(50) | pending, running, success, failed |
| started_at | TIMESTAMP | Execution start |
| completed_at | TIMESTAMP | Execution end |
| output | JSONB | Run result data |
| error_message | TEXT | Failure reason if failed |

## Indexing Strategy

Queries are indexed for common access patterns:
- `memberships(org_id)` - list team members
- `memberships(clerk_user_id)` - user login
- `installed_workflows(org_id)` - list org's workflows
- `workflow_runs(workflow_id)` - run history

## Future Migrations

Planned schema additions for phases 2+:
- `audit_logs` - compliance and traceability
- `api_keys` - developer authentication
- `workflow_runs_details` - step-level execution trace
- `usage_metrics` - billing and analytics
