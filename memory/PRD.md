# QuotientIQ — PRD

## Original Problem Statement
QuotientIQ — an Enterprise AI Employee Marketplace ("App Store for AI Employees"). Long-term vision: a 40-layer operating system for AI employees that businesses log into to manage an entire digital workforce that collaborates, learns, and automates across departments. The product should feel like an **AI Operating System**, not a chatbot.

## Architecture
- **Frontend**: React (CRA) + TailwindCSS + shadcn/ui + Recharts + react-router-dom + next-themes (dark mode)
- **Backend**: FastAPI + Motor (MongoDB async) + PyJWT + bcrypt + pypdf + python-docx + beautifulsoup4
- **LLM**: GPT-5.2 via `emergentintegrations` library with Emergent Universal LLM Key
- **Auth**: Custom JWT, httpOnly cookies (no localStorage tokens) + Bearer fallback for API keys
- **Streaming**: SSE for chat responses
- **Theme**: next-themes (`.dark` class on `<html>`, persisted in `qiq-theme` localStorage key)

## What's Been Implemented

### V6 (Operating-System tier) — shipped 2026-06-16
- **Settings page** (6 tabs): Profile, Password (rejects wrong current_password), Theme (light/dark via next-themes), Notification preferences (8 toggles), Sessions (current device), Danger Zone (DELETE confirmation cascade-deletes account)
- **Forgot/Reset password** flow: `POST /api/auth/forgot-password` (no email enumeration), `POST /api/auth/reset-password` (1-hour TTL token). Dev mode (`DEV_MODE=1`) returns the token inline for testing.
- **6-step Onboarding wizard** (`/onboarding`): Company profile → Industry → Create agent → Upload knowledge → First chat → Complete. New registrations now auto-redirect to /onboarding (was: /dashboard). Skip button hits `/api/onboarding/skip`.
- **AI Chief of Staff (Layer 34)** (`/chief`): Master coordinator agent auto-created on first visit. UI textarea → `POST /api/chief/route` → LLM identifies the right teammate → emits `[DELEGATE: ...]` → backend runs delegations and stitches a single executive-tone reply. Workforce summary (size, departments, conversations).
- **AI Workforce overview** (`/workforce`): Full org view — stats + departments grouped by category + agent health leaderboard with progress bars.
- **Industries page** (`/industries`): UI for the 5 prebuilt workforces (HVAC, Plumbing, Auto, Law, Real Estate). One-click install with idempotency + force-duplicate option.
- **Department Builder** (`/departments`): Full CRUD with multi-agent picker, color swatches, descriptions. Backed by `db.departments`.
- **Notifications system** + Bell dropdown: 6 types (`agent.task`, `conversation.new`, `team.invite`, `knowledge.upload`, `billing`, `system`). User can mark read/all-read/delete. Per-type opt-in/out via Settings → Notifications. Auto-fired on agent.create, team.invite, knowledge.upload, billing webhook.
- **Global Search (Cmd+K)** (`<GlobalSearch>`): `/api/search?q=&types=` covers agents, conversations, knowledge (file names + KB text), team. 200ms debounce, arrow-key + Enter navigation, accessible (sr-only DialogTitle/DialogDescription).
- **Activity Feed** (`/activity`): Unified audit + notifications timeline with filter chips (All / Notifications / Audit events).
- **Help Center** (`/help`): 6 sections (Getting Started / Agents / Knowledge Base / Teams / Billing / FAQs) with expandable accordion items.
- **Error pages**: `<NotFound>` (404), `<Forbidden>` (403), `<ServerError>` (500), `<Maintenance>` (503).
- **Dark Mode** end-to-end: ThemeProvider via `next-themes`, theme-aware CSS variables (`.dark` overrides), theme-aware chat bubbles, sun/moon toggle in the top bar.
- **Enhanced Dashboard**: 5 stat tiles (Cost Savings, Hours Saved, Active Agents, Tasks Completed, Performance) + Recent Conversations card + Agent Health card with progress bars + Quick-link tiles (Workforce / Industries / Activity / Help).
- **AppShell rebuilt**: Reorganized sidebar with 3 sections (Main / Operations / Workspace), top bar with NotificationBell + ThemeToggle + Cmd+K search trigger, mobile drawer.
- **Session management**: `GET /api/auth/sessions`, `DELETE /api/auth/sessions/{sid}` (logout-equivalent for current).
- **Integrations registry**: `GET /api/integrations` lists OpenAI / Stripe / Resend / Twilio / ElevenLabs / Google SSO with `configured` booleans — surface for future plug-in.
- **Agent performance metrics**: `GET /api/agents/{id}/metrics` (replies, msgs, health_score, hours_saved, cost_saved).
- **Empty/Loading states**: Reusable `<EmptyState>` + `<LoadingState>` + `<SkeletonRow>` components.
- **Responsive mobile**: hamburger drawer with full nav, mobile-friendly top bar.
- **Bug fix**: PublicOnly mount-snapshot pattern fixes the Register → /dashboard race that previously prevented the onboarding wizard from showing.
- **Code review fixes**: `is True/False` → `== True/False` everywhere; explicit pre-init for `text`, `title`, `session`, `status`, `ev` to silence Pyright "possibly unbound" warnings; sessionStorage usage in Embed.jsx documented as non-PII.
- **Tests**: 91 backend tests pass (66 V1-V5 + 25 V6). 1 conditional skip for DEV_MODE-only path.

### V5 — shipped 2026-06-13
Industry templates (HVAC/Plumbing/Auto/Law/Real Estate), Trial paywall hardening, Team roles & invites, Audit logs, API keys, sidebar reorg.

### V4 — shipped 2026-06-13
Conversations explorer, Markdown rendering, embed rate-limiting.

### V3 — shipped 2026-06-13
Stripe billing (3 tiers), multi-agent delegation, brute-force lockout, website embed widget.

### V2 — shipped 2026-06-13
Memory / Company Profile, AI Org Chart, multi-format ingestion (PDF/DOCX/TXT/URL).

### V1 (MVP) — shipped 2026-06-13
Landing page, auth, dashboard, AI chat (SSE streaming GPT-5.2), PDF KB upload, marketplace, builder, analytics.

## Test Credentials
- Admin: `admin@quotientiq.com` / `admin123`

## Prioritized Backlog

### P1 — Next up
- **Vector embeddings + true semantic search** (Layer 7) — replace prompt-stuffed KB with vector DB-backed RAG
- **Resend email integration** (`RESEND_API_KEY` required from user) — wire `forgot_password` to actually deliver
- **Google SSO via Emergent Auth** (Layer 22)
- **Conversation.new notification side-effect** — currently only chief/agent.create/team/upload/billing fire notifications
- **Fire 'conversation.new' notification** on conversation insert (chat + embed)

### P2 — Polish
- Modularize `server.py` (2230 lines → routers: auth/agents/billing/embed/chief/notifications/search/onboarding/departments)
- PATCH support on `/api/departments/{id}` (allow partial updates)
- Soft-delete API keys instead of hard delete (preserve audit trail)
- More verticals: SaaS / E-commerce / Agencies / Healthcare / Finance industry templates
- Annual billing pricing on `/billing`
- Webhooks for developers (Layer 24)
- i18n (English / French / Spanish / Arabic)

### P3 — Blocked on user-provided keys
- **Twilio + ElevenLabs voice channel** (Layer 18)
- **Resend transactional emails** (welcome / invite / reset / weekly digest)

## Next Tasks (recommended)
1. Wire Resend when user provides `RESEND_API_KEY` (3 emails: welcome, invite, reset)
2. Ship vector embeddings RAG (huge UX uplift)
3. Modularize `server.py`
