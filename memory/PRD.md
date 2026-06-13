# QuotientIQ — PRD

## Original Problem Statement
QuotientIQ — an Enterprise AI Employee Marketplace ("App Store for AI Employees"). Long-term vision: a 40-layer operating system for AI employees that businesses log into to manage an entire digital workforce that collaborates, learns, and automates across departments.

## Architecture
- **Frontend**: React (CRA) + TailwindCSS + shadcn/ui + Recharts + react-router-dom
- **Backend**: FastAPI + Motor (MongoDB async) + PyJWT + bcrypt + pypdf + python-docx + beautifulsoup4
- **LLM**: GPT-5.2 via `emergentintegrations` library with Emergent Universal LLM Key
- **Auth**: Custom JWT, httpOnly cookies only (no localStorage tokens)
- **Streaming**: SSE for chat responses (clean per-token, no duplication)

## What's Been Implemented

### V1 (MVP) — shipped 2026-06-13
- Landing page (hero, agents preview, pricing, social proof, footer)
- Email/password auth (register, login, logout, /me) — JWT in httpOnly cookies
- Dashboard with "My AI Workforce" cards and KPI tiles
- AI chat with SSE streaming (GPT-5.2)
- PDF knowledge base upload + indexing
- Marketplace with 8 agent templates across 7 categories
- Custom agent builder
- Analytics page with KPIs + Recharts bar chart
- Per-user seeded support agent on registration
- Backend regression test suite (18 tests)

### V4 — shipped 2026-06-13
- **Conversations explorer**: `/conversations` page lists all threads (internal + embedded) with agent name, customer/visitor, last message preview, msg count, timestamp, EMBED badge for embed-sourced threads. Filters: by agent, by source (internal/embed). Client-side search. Per-row Export (JSON download) + Delete actions. Backend: `GET /api/conversations` (with agent_id/source filters, joins agent metadata, computes message_count via aggregate), `GET /api/conversations/{id}/export`, `DELETE /api/conversations/{id}`.
- **Markdown rendering** in chat: assistant messages now render `react-markdown + remark-gfm` (tables, lists, code blocks, bold/italic, links, headings, blockquotes, hr). Active in both authenticated `/chat` and public `/embed/:token`. User messages stay plain text.
- **Embed rate-limiting**: per-token (200/hour) and per-visitor (40/hour) sliding-window enforcement on `POST /api/embed/{token}/chat`. Backed by `embed_hits` collection with a TTL index (`expireAfterSeconds=3600`) for self-cleanup.
- Backend tests expanded to 47 (100% passing).

### V3 — shipped 2026-06-13
- **Stripe Billing (Layer 20)**: `/billing` page with 3 tiers (Starter $99 / Pro $299 highlighted / Enterprise contact-sales). `/api/billing/checkout`, `/api/billing/status/{sid}`, `/api/billing/me`, `/api/webhook/stripe`. Uses Emergent's `sk_test_emergent` Stripe test key. `payment_transactions` collection logs every session; user.plan flips to paid tier on success.
- **Multi-agent delegation (Layer 10 full)**: Team-aware system prompt instructs the LLM to emit `[DELEGATE: <agent> | <question>]` markers. Backend parses (max 2/turn), runs `_run_delegation` to call the target agent's chat with the same memory/team context, and stitches `— **Asked <agent>**: ...` blocks into the streamed reply. Works in both SSE `/chat` and JSON `/chat-sync`.
- **Brute-force lockout (P0 hardening)**: 5 failed logins per email within 15-min window → HTTP 429. Uses `login_attempts` collection with TTL index for self-cleanup. Email-only identifier (ingress-IP agnostic).
- **Website Embed Widget (Layer 25)**: `/api/agents/{id}/embed-enable|disable` mint a public token; public `/api/embed/{token}/agent` + `/api/embed/{token}/chat` endpoints (no auth). Customer-facing `/embed/:token` page is a self-contained chat UI. Drop-in `/widget.js` injects a floating button that opens the chat in an iframe — `<script src=".../widget.js" data-quotientiq-token="..." defer></script>`. Per-visitor conversation persistence.
- Backend tests expanded to 42 (100% passing).

### V2 — shipped 2026-06-13
- **Memory / Company Profile (Layer 9)**: `/profile` page; 7 structured fields (company_name, audience, products, services, pricing, brand_voice, policies); auto-injected into every agent's system prompt
- **AI Org Chart (Layer 11)**: `/org` page with hierarchical tree; `parent_agent_id` on agents; reparent via dropdown; **cycle detection** on the server (multi-hop loops blocked)
- **Team awareness (Layer 10 lite)**: every chat's system prompt now lists all sibling agents with their roles — agents can suggest the right teammate when out of scope
- **Multi-format ingestion (Layer 7 expansion)**: PDF + DOCX + TXT + MD + CSV uploads; paste raw text; **URL crawl** (BeautifulSoup, runs in worker thread so it doesn't block the event loop)
- 3-tab KnowledgePanel in chat (File / Paste / URL)
- Sidebar nav extended with `Memory` + `Org Chart`
- Test suite expanded to 31 tests (100% passing)

### Code Quality Fixes — shipped 2026-06-13
- Removed JWT from localStorage entirely (httpOnly cookies only)
- Refactored Chat.jsx (256 → ~120 lines) — extracted `useChatStream`, `useAgent` hooks; `KnowledgePanel`, `InstructionsPanel`, `MessageList`, `Composer`, `ChatHeader` components
- Refactored `chat_with_agent` backend handler (73 → 18 lines) — extracted 7 helpers
- ObjectId validation everywhere (400 instead of 500 on malformed IDs)
- True partial PATCH on agents (`exclude_unset=True`)
- Index-as-key bugs fixed in Landing + Chat
- All `useEffect` mount-fetches use cancelled-guard pattern (no stale closures)
- React `set-state-in-effect` lint-clean

## Test Credentials
- Admin: `admin@quotientiq.com` / `admin123`

## Prioritized Backlog

### P0 — Production hardening
- Brute-force lockout on `/api/auth/login` (5-attempt rule from playbook)
- Tighten CORS to `FRONTEND_URL` only for production
- Bound per-field length on `CompanyProfileIn` (e.g. 5k chars/field) to cap token usage

### P1 — V3 features
- **Stripe billing**: 3 tiers ($99 / $299 / Custom), trial paywall, customer portal — requires Stripe test key (already in pod env per platform docs)
- **Multi-agent collaboration (full)**: agent-to-agent delegation tool — when agent A determines a question belongs to agent B, A invokes B and returns a stitched answer
- **Voice channel (Layer 18)**: Twilio inbound + ElevenLabs TTS — needs user-supplied Twilio + ElevenLabs keys
- **Website embed widget (Layer 25)**: `<script>` snippet that drops the chat into any site
- **Conversations explorer**: list/filter/export past conversations per agent
- **Markdown / code-block rendering** in chat bubbles (currently plaintext)

### P2 — Enterprise
- SSO (Google / Microsoft / Okta) — Layer 22
- Team roles (Owner / Admin / Manager / Employee)
- Audit logs of every AI action
- API keys + developer SDK + webhooks (Layers 23–24)
- Industry templates (HVAC / plumbing / auto / law / real estate)
- i18n (English / French / Spanish / Arabic)

## Next Tasks (recommended)
1. Add brute-force lockout to login
2. Wire **Stripe** on the 3 pricing tiers (next iteration)
3. Ship full multi-agent delegation (true Layer 10) — the differentiator
