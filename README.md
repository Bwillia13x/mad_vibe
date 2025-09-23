[![CI](https://github.com/Bwillia13x/AndreasVibe/actions/workflows/ci.yml/badge.svg)](https://github.com/Bwillia13x/AndreasVibe/actions/workflows/ci.yml)

Andreas Vibe – Business Management Platform

A demo-ready Express + Vite React application with seeded in-memory data for scheduling, inventory, staff, and analytics. Optional AI assistant integrates with OpenAI when an API key is configured; otherwise, it gracefully falls back to demo responses.

Quick Start

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

- `DATABASE_URL` – PostgreSQL connection used for persisting workflow research log entries (e.g., `postgres://valor_user:valorpass@localhost:5432/valor_vibe`). If unset the workflow UI will fall back to local-memory logging only for the current session.
- `SESSION_SECRET` – required for production-grade session security.
- `PORT` (optional) – server port (default `5000`).
- `OPENAI_API_KEY` (optional) – enables live AI responses; without it the assistant stays in demo mode.

What’s Included

- Server: Express with `/api` routes and structured logging.
- Client: Vite + React + Tailwind UI (shadcn based components).
- Data: In-memory store with seeded demo data (services, staff, customers, appointments, inventory, analytics).
- Workflow research log entries are pre-seeded in Postgres so the new IDE shell renders recent activity on startup.
- AI Assistant: Optional OpenAI integration with streaming (SSE). Falls back to informative demo responses when no API key is set.
- Business Tools: Chat, Scheduling, Inventory, Staff, Analytics plus custom POS, Marketing, Loyalty pages.
- Workflow IDE: Data normalization, owner earnings bridge, valuation workbench, memo composer (Markdown + styled PDF/HTML export with exhibits and reviewer threads), scenario lab, monitoring dashboard.
- Collaboration niceties: live stage presence indicators and per-stage history timelines for memo work.

Demo Pages

- `/` Chat (AI business assistant)
- `/pos` POS — checkout with cart, discount/tax presets, printable receipt
- `/marketing` Campaigns — create/activate/pause, performance charts and metrics
- `/loyalty` Rewards — add rewards/points, entries, top customers
- `/scheduling`, `/inventory`, `/staff`, `/analytics`

Key API Endpoints (demo)

- POS: `GET /api/pos/sales`, `POST /api/pos/sales`, `DELETE /api/pos/sales/:id`
- Marketing: `GET/POST /api/marketing/campaigns`, `PATCH /api/marketing/campaigns/:id`, `GET /api/marketing/performance`
- Loyalty: `GET /api/loyalty/entries[?customerId]`, `POST /api/loyalty/entries`
- Workflow: `GET/PUT /api/workflow/memo-state`, `GET/PUT /api/workflow/normalization-state`, `GET/PUT /api/workflow/valuation-state`, `GET/PUT /api/workflow/monitoring-state`, `GET/POST /api/workflow/research-log`

Testing

- Type check: `npm run check`
- Lint: `npm run lint`
- Smoke tests: `npm run smoke`
  - Builds the app, launches the server on an ephemeral port, probes `/api/health`, `/api/services`, `/api/staff`, `/api/appointments`, `/api/analytics`, and `/api/chat` (non-streaming), then shuts down.
  - Also validates streaming chat, CSV export, deterministic reseed (`seed`), time freeze, and demo reset.
  - Exercises POS/Marketing/Loyalty endpoints for demo flows
- Workflow persistence tests: `npm run test:workflow`
  - Runs Vitest integration coverage for `/api/workflow/research-log`, `/api/workflow/memo-state`, `/api/workflow/normalization-state`, `/api/workflow/valuation-state`, `/api/workflow/monitoring-state`, and the demo seeding hook.

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
- Optional AI: pass `-e OPENAI_API_KEY=...` to enable live AI responses

Notes

- `npm run check` TypeScript checks will flag Next.js files under `app/` that are not required for this demo. You can ignore that command for the demo or remove the `app/` and top-level `components/` Next-specific files.
- Built assets are emitted to `dist/public`; the server bundles to `dist/index.js`.

Demo Walkthrough

- Script: see `demo/DEMO-SCRIPT.md`
- Video outline: see `demo/VIDEO-OUTLINE.md`
- Generate screenshots for your deck: `npm run demo:screens` (screens saved to `demo/assets/screens`)

Browserslist

You may see a `caniuse-lite` “browsers data is old” warning during build. To refresh locally:

```
npm run browserslist:update
```

Common Issues

- Missing OpenAI key: The server will run in demo mode and the assistant will respond with non-AI fallback text.
- Port busy or blocked: Set `PORT=5050` (or another free port) before running `npm start`, or use `npm run start:dynamic` to choose an ephemeral port and watch logs for the actual port.
- Database not configured: Not needed for the demo; the app uses in-memory storage.
- Workflow audit roadmap & collaboration planning lives in `docs/workflow-audit-collaboration.md`.
