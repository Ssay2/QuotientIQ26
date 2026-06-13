# QuotientIQ — PRD

## Original Problem Statement
QuotientIQ — an Enterprise AI Employee Marketplace ("App Store for AI Employees"). Phase 1 MVP: AI Customer Support Agent. Businesses upload PDFs → AI learns the company → customers ask questions → AI answers automatically → dashboard tracks conversations. Design: minimal, enterprise-grade, OpenAI/Stripe/Vercel-inspired (black & white, lots of whitespace).

## Architecture
- **Frontend**: React (CRA) + TailwindCSS + shadcn/ui + Recharts + react-router-dom
- **Backend**: FastAPI + Motor (MongoDB async) + PyJWT + bcrypt + pypdf
- **LLM**: GPT-5.2 via `emergentintegrations` library with Emergent Universal LLM Key
- **Auth**: Custom JWT, httpOnly cookies + Bearer token in localStorage
- **Streaming**: SSE for chat responses

## User Personas
- **SMB owner** (HVAC / plumbing / auto shop / law firm): wants AI to answer repetitive customer questions
- **Operations lead** (mid-market): wants multi-agent workforce + analytics
- **Enterprise buyer**: SSO, audit logs, custom agents (future phases)

## Core Requirements (Static)
1. Marketing landing page with hero, agents preview, pricing, social proof
2. Email/password auth (register, login, logout, /me)
3. Dashboard showing "My AI Workforce" with metric tiles + agent cards
4. AI chat with streaming responses + knowledge base context
5. PDF knowledge base upload, indexing, deletion
6. Marketplace with 8 agent templates across 7 categories — one-click install
7. Custom agent builder
8. Analytics page with KPIs and time series chart

## What's Been Implemented (2026-06-13)
- ✅ Landing page (Hero, How it works, Agents grid, Stats, Pricing, Final CTA, Footer)
- ✅ Login / Register with form validation + error formatting
- ✅ JWT auth with httpOnly cookies + Bearer fallback
- ✅ Protected routes + AuthContext
- ✅ Dashboard with live metrics + agent cards
- ✅ Marketplace with category filter + install flow
- ✅ Custom agent builder (name, role, category, icon, instructions)
- ✅ Chat page with SSE streaming (GPT-5.2), instructions editor, quick prompts
- ✅ PDF upload to knowledge base (pypdf text extraction, stored in agent doc)
- ✅ Analytics page with 5 KPI tiles + bar chart (Recharts)
- ✅ Per-user agent seeding on registration; admin demo agent on first boot
- ✅ Marketplace `install` endpoint for one-click hiring
- ✅ Backend regression test suite (18/18 pytest passing)

## Test Credentials
- Admin: `admin@quotientiq.com` / `admin123`
- (Plus the test users registered during QA)

## Prioritized Backlog
### P0 — Polish
- Brute-force/lockout on login (mentioned in playbook)
- Partial updates on PATCH /api/agents/{id}
- Validate ObjectId in route handlers (return 400 instead of 500)

### P1 — V2 Features (from user's roadmap)
- **Memory layer** (Company Profile: products, services, pricing, brand voice persisted across agents)
- **AI Organization Chart** — visual department/agent hierarchy (CEO → Sales Dept → SDR/AE agents…)
- **Multi-agent collaboration** — chained workflows (Support → Sales → Calendar → Email)
- **Audit logs** of every AI action
- **DOCX / website ingestion** in addition to PDFs
- **Voice channel** via Twilio + ElevenLabs
- **Internal employee portal** (employees ask the AI about HR/IT/SOPs)

### P2 — Enterprise
- SSO (Google / Microsoft / Okta)
- Team roles (Owner / Admin / Manager / Employee)
- Usage limits + billing (Starter $99 / Pro $299 / Enterprise)
- Integrations: Gmail, Google Calendar, Slack, Teams, HubSpot, Salesforce, QuickBooks
- Admin Center (users, roles, permissions, API keys)

## Next Tasks
1. Pick a V2 feature to ship next (recommend: **Memory / Company Profile** — small, high-impact, makes every agent feel "trained")
2. Or **AI Organization Chart** — the differentiator the user called out
3. Or harden auth (brute-force, partial updates) before scaling
