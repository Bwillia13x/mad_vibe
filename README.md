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

- `OPENAI_API_KEY` (optional) – enables live AI responses for the chat assistant. When absent, the app runs in demo mode with safe fallbacks.
- `PORT` (optional) – server port (default `5000`).
- `POSTGRES_URL` / `DATABASE_URL` (optional, not required for the demo) – Postgres connection for the Drizzle DB layer. The demo uses in-memory storage and seeds sample data on startup.

What’s Included

- Server: Express with `/api` routes and structured logging.
- Client: Vite + React + Tailwind UI (shadcn based components).
- Data: In-memory store with seeded demo data (services, staff, customers, appointments, inventory, analytics).
- AI Assistant: Optional OpenAI integration with streaming (SSE). Falls back to informative demo responses when no API key is set.

Testing

- Type check: `npm run check`
- Lint: `npm run lint`
- Smoke tests: `npm run smoke`
  - Builds the app, launches the server on an ephemeral port, probes `/api/health`, `/api/services`, `/api/staff`, `/api/appointments`, `/api/analytics`, and `/api/chat` (non-streaming), then shuts down.
  - Also validates streaming chat, CSV export, deterministic reseed (`seed`), time freeze, and demo reset.

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

Common Issues

- Missing OpenAI key: The server will run in demo mode and the assistant will respond with non-AI fallback text.
- Port busy or blocked: Set `PORT=5050` (or another free port) before running `npm start`, or use `npm run start:dynamic` to choose an ephemeral port and watch logs for the actual port.
- Database not configured: Not needed for the demo; the app uses in-memory storage.
