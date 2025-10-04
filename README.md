# MAD Vibe - Value Investment IDE

**Professional multi-workspace IDE for value investors**

A modern, AI-powered platform that transforms investment analysis with automated data fetching, conversation memory, and advanced editing tools.

[![CI](https://github.com/Bwillia13x/AndreasVibe/actions/workflows/ci.yml/badge.svg)](https://github.com/Bwillia13x/AndreasVibe/actions/workflows/ci.yml)

A production-ready Express + Vite React application for collaborative financial analysis and valuation workflows. Integrates AI-powered research assistance with comprehensive workflow tools for data normalization, owner earnings analysis, valuation modeling, memo composition, scenario planning, and monitoring dashboards.

- Requirements: Node.js 18+ (recommended 20+), npm

- Development (hot reload):
  1. `npm install`
  2. `npm run dev` (or `npm run dev:dynamic` to use an ephemeral port)
  3. Open the logged URL (default `http://localhost:5000`)

- Production build:
  1. `npm run build`
  2. `npm start` (uses `PORT`; defaults to `5000`)
     - If the port is taken or blocked, try `npm run start:dynamic` to bind an ephemeral port.

Environment Variables

Copy `.env.example` to `.env` and fill as needed:

- `PORT` – server port (default `5000`).
- `SESSION_SECRET` – required for production-grade session security (min length 32 in production).
- `ADMIN_TOKEN` – required for protected routes. Must be alphanumeric, min 32 chars (production).
- `DATABASE_URL` or `POSTGRES_URL` – PostgreSQL connection. Required in production; if unset, demo features use in-memory state only.
- `SESSION_STORAGE` – `postgres` in production to persist sessions (uses connect-pg-simple).
- `CORS_ORIGIN` – allowed browser origin (e.g., `http://localhost:5173`).
- `AI_MODE` – `demo` (no external calls) or `live` (requires `OPENAI_API_KEY`).
- `OPENAI_API_KEY` – only needed when `AI_MODE=live`.
- `MARKET_DATA_PROVIDER` – `yahoo` (default) or `polygon`.
- `POLYGON_API_KEY` – required when `MARKET_DATA_PROVIDER=polygon`.
- Resource thresholds (optional; tune dev noise):
  - `RM_HEAP_ALERT_THRESHOLD` (percent, default 90)
  - `RM_MEMORY_THRESHOLD_MB` (MB, default 512)

### Local Postgres for Analyst Data

The screener and workflow APIs expect a Postgres database when you want durable storage.

1. Start Postgres (includes Atlas Precision seed data):
   ```bash
   docker compose up -d db
   ```
2. Point the app at that instance and seed the research dataset:
   ```bash
   export DATABASE_URL=postgres://valor_user:valorpass@localhost:5432/valor_vibe
   npm run db:seed
   ```
3. Launch the application (`npm run dev` or `npm run build && npm start`).

Without `DATABASE_URL`, the API falls back to an in-memory dataset so the IDE remains navigable, but data will reset on restart.

What’s Included

- Server: Express with `/api` routes and structured logging.
- Client: Vite + React + Tailwind UI (shadcn based components).
- Data: PostgreSQL for persistent workflow state and research logs; in-memory fallback for development.
- Market data providers: pluggable architecture with in-memory caching (default 60s) and rate limiting (4 req/s).
- Workflow research log entries are pre-seeded in Postgres so the IDE shell renders recent activity on startup.
- AI Assistant: OpenAI integration with streaming (SSE) for research assistance and analysis guidance.
- Financial Analysis Tools: Data normalization, owner earnings bridge, valuation workbench, memo composer (Markdown + styled PDF/HTML export with exhibits and reviewer threads), scenario lab, monitoring dashboard.
- Collaboration features: Live stage presence indicators and per-stage history timelines for memo work.

Core Workflow Pages

- `/` Idea Intake — Research log and initial analysis setup
- `/normalization` Data Normalization — Financial statement adjustments
- `/owner-earnings` Owner Earnings Bridge — Calculate normalized cash flows
- `/valuation` Valuation Workbench — DCF modeling and scenario analysis
- `/memo` Memo Composer — Structured investment memo with exhibits
- `/scenario-lab` Scenario Lab — What-if analysis and sensitivity testing
- `/monitoring` Monitoring Dashboard — Post-investment tracking

Key API Endpoints (demo)

- POS: `GET /api/pos/sales`, `POST /api/pos/sales`, `DELETE /api/pos/sales/:id`
- Marketing: `GET/POST /api/marketing/campaigns`, `PATCH /api/marketing/campaigns/:id`, `GET /api/marketing/performance`
- Loyalty: `GET /api/loyalty/entries[?customerId]`, `POST /api/loyalty/entries`
- Workflow (session-scoped): `GET/PUT /api/workflow/memo-state`, `GET/PUT /api/workflow/normalization-state`, `GET/PUT /api/workflow/valuation-state`, `GET/PUT /api/workflow/monitoring-state`
  - Include the `x-session-key` header on all requests to persist/fetch session state.
- Workflow research log: `GET/POST /api/workflow/research-log`
  - Hydrates the Idea Intake “Research Log” card. Requires `ADMIN_TOKEN`; when `DATABASE_URL` is missing the router falls back to in-memory storage (logged at startup) so activity still loads for demos.

Testing

- Type check: `npm run check`
- Lint: `npm run lint`
- Smoke tests: `npm run smoke`
  - Builds the app, launches the server on an ephemeral port, probes `/api/health`, `/api/services`, `/api/staff`, `/api/appointments`, `/api/analytics`, and `/api/chat` (non-streaming), then shuts down.
  - Also validates streaming chat, CSV export, deterministic reseed (`seed`), time freeze, and demo reset.
  - Exercises POS/Marketing/Loyalty endpoints for demo flows
- Workflow persistence tests: `npm run test:workflow`
  - Runs Vitest integration for session-scoped endpoints: `/api/workflow/memo-state`, `/api/workflow/normalization-state`, `/api/workflow/valuation-state`, `/api/workflow/monitoring-state`.
  - Presence is now handled client-side; server presence/research-log routes are considered legacy and excluded from default workflow tests.

Navigation and smoke helpers

- Dev smoke (dev server + Vite middleware): `npm run dev:smoke`
  - Verifies SPA routes (`/`, `/scheduling`, `/inventory`, `/staff`, `/analytics`), key APIs, CSV export, and chat streaming in demo mode.
- Prod smoke (alt runner): `npm run smoke:prod`
  - Starts the built server and repeats health/route/API checks.
- Navigation E2E: `npm run nav:e2e`
  - Clicks sidebar buttons (Chat, Scheduling, Inventory, Staff, Analytics), asserts active highlight updates, toggles the sidebar, and validates tooltip on hover when collapsed.

Demo Controls & Links

- Open the banner “Controls” or the mobile floating button:
  - Scenario: Default, Busy Day, Low Inventory, Appointment Gaps
  - Seed: numeric value for deterministic demo state (e.g., 123, 999, 2025)
  - Freeze Time: pick a date and time to lock “today” and reseed aligned appointments
  - Share: Copy Demo Link (includes scenario, seed, and freeze in the URL)

- Query params auto-apply on load (via `DemoInit`):
  - `?scenario=low_inventory&seed=123&freeze=2025-09-15T10:00:00.000Z`
  - Useful for sharing exact demo states

Docker

- Build image: `docker build -t andreas-vibe .`
- Run (demo mode): `docker run --rm -p 5000:5000 andreas-vibe`
  - Open `http://localhost:5000`
- Optional AI: pass `-e AI_MODE=live -e OPENAI_API_KEY=...` to enable live AI responses

Docker Compose

- Start app + Postgres: `docker compose up -d --build`
  - App: `http://localhost:5000`
  - DB: `localhost:5432` (user: `valor_user` / pass: `valorpass` / db: `valor_vibe`)
- The compose file sets `SESSION_STORAGE=postgres` and wires `POSTGRES_URL` to the `db` service for session persistence.

Notes

- `npm run check` TypeScript checks will flag Next.js files under `app/` that are not required for this demo. You can ignore that command for the demo or remove the `app/` and top-level `components/` Next-specific files.
- Built assets are emitted to `dist/public`; the server bundles to `dist/index.js`.

Demo Walkthrough

- Script: see `demo/DEMO-SCRIPT.md`
- Video outline: see `demo/VIDEO-OUTLINE.md`
- Generate screenshots for your deck: `npm run demo:screens` (screens saved to `demo/assets/screens`)

Browserslist

You may see a `caniuse-lite` “browsers data is old” warning during build. To refresh locally:

```bash
npm run browserslist:update
```

Common Issues

- Missing OpenAI key: The server will run in demo mode and the assistant will respond with non-AI fallback text.
- Port busy or blocked: Set `PORT=5050` (or another free port) before running `npm start`, or use `npm run start:dynamic` to choose an ephemeral port and watch logs for the actual port.
- Database not configured: Not needed for the demo; the app uses in-memory storage.
- Workflow audit roadmap & collaboration planning lives in `docs/workflow-audit-collaboration.md`.
