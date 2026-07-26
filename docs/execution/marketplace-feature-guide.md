# Marketplace Feature - End-to-End Flow

## Overview

The marketplace is the core user journey: discover → install → monitor.

## User Flow

### 1. Browse Marketplace

**URL:** `/marketplace`

**Access:** Authenticated users only (Clerk required)

**Component:** [apps/web/app/marketplace/page.tsx](../../apps/web/app/marketplace/page.tsx)

User sees:
- List of available workflows
- Category filters (support, leadgen, email, reporting)
- Quick preview of each workflow

### 2. Install Workflow

**Action:** Click "Install" button

**Flow:**
1. Frontend sends POST `/api/marketplace/workflows/:id/install`
2. Backend creates new `InstalledWorkflow` record
3. Returns workflow instance with unique ID
4. Frontend shows success confirmation
5. User can now configure and run workflow

**API Endpoint:** [apps/api/src/routes/marketplace.ts](../../apps/api/src/routes/marketplace.ts#L1)

Example request:
```bash
POST http://localhost:4000/api/marketplace/workflows/wf_support_triage/install
Authorization: Bearer <clerk_token>
Content-Type: application/json

{
  "name": "My Support Triage",
  "config": {
    "autoRespond": true,
    "categories": ["billing", "technical", "general"]
  }
}
```

### 3. View Installation Status

After install, user can:
- See workflow in dashboard
- Configure additional settings
- Enable/disable execution
- Monitor runs and errors

## API Endpoints

### List Workflows

```
GET /api/marketplace/workflows
GET /api/marketplace/workflows?category=support
```

Response:
```json
{
  "workflows": [
    {
      "id": "wf_support_triage",
      "title": "Support Ticket Triage",
      "category": "support",
      "description": "Auto-categorize inbound tickets...",
      "installable": true
    }
  ]
}
```

### Get Workflow Details

```
GET /api/marketplace/workflows/:id
```

Response:
```json
{
  "id": "wf_support_triage",
  "title": "Support Ticket Triage",
  "description": "...",
  "requiredIntegrations": ["email", "ticketing"],
  "installable": true
}
```

### Install Workflow

```
POST /api/marketplace/workflows/:id/install
```

Request:
```json
{
  "name": "My Custom Name",
  "config": {}
}
```

Response:
```json
{
  "id": "installed_workflow_123",
  "templateId": "wf_support_triage",
  "orgId": "org_456",
  "name": "My Custom Name",
  "enabled": true,
  "createdAt": "2026-06-10T..."
}
```

## Data Model

### WorkflowTemplate

Defined in marketplace, never changes per org.

```typescript
type WorkflowTemplate = {
  id: string;
  slug: string;
  title: string;
  category: "support" | "leadgen" | "email" | "reporting";
  description: string;
  requiredIntegrations: string[];
};
```

### InstalledWorkflow

Org's copy of a template, configured by user.

```typescript
type InstalledWorkflow = {
  id: string;
  orgId: string;
  templateId: string;
  name: string;
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
};
```

## Launch Workflows (MVP)

Four curated templates available at launch:

1. **Support Ticket Triage** (wf_support_triage)
   - Category: support
   - Requires: email, ticketing
   - Outcome: Auto-categorized tickets, draft responses

2. **Lead Scoring** (wf_lead_scoring)
   - Category: leadgen
   - Requires: crm
   - Outcome: Scored leads, outreach drafts

3. **Email Follow-up Sequence** (wf_email_sequence)
   - Category: email
   - Requires: email, crm
   - Outcome: Scheduled follow-up campaigns

4. **Weekly KPI Digest** (wf_kpi_digest)
   - Category: reporting
   - Requires: crm
   - Outcome: Weekly summary report

## Implementation Status

✅ API endpoints for list, detail, install
✅ Frontend marketplace page with filtering
✅ Auth middleware on all API routes
✅ Mock workflow templates

⏳ Database persistence for InstallWorkflows
⏳ Integration requirement validation
⏳ Workflow configuration UI
⏳ Execution and monitoring

## Testing

### Without Docker

```bash
# Terminal 1: Start API
npm run dev:api

# Terminal 2: Start web
npm run dev:web
```

Visit http://localhost:3000/marketplace

### With Docker

```bash
docker-compose up
```

Visit http://localhost:3000/marketplace

## Debugging

**Check API is running:**
```bash
curl http://localhost:4000/api/health
```

**Check marketplace endpoint:**
```bash
curl http://localhost:4000/api/marketplace/workflows
```

**Check web app:**
```bash
curl http://localhost:3000
```

## Next Phase

After MVP, add:
- Real database persistence for installed workflows
- Workflow configuration UI (JSON editor or form builder)
- Trigger setup (email, schedule, webhook)
- Execution engine and run history
- Performance analytics
