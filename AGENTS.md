# Repository Guidelines

## Project Structure & Module Organization
- `server/`: Express API (`index.ts`, routes, middleware, storage, Vite/dev server glue).
- `client/src/`: React app (Vite). Components in `components/`, pages in `pages/`.
- `shared/`: Cross‑shared types and utilities.
- `lib/`: Server utilities (env security, performance, db, logging).
- `scripts/`: TS runners for smoke, e2e, performance, security, deployment tests.
- `test/`: Test suites, configs, and assets. Reports in `test-results/`.
- `dist/`: Build output (server bundle + client assets). Do not edit.
- `docs/`: Reference docs and handoff material.

## Build, Test, and Development Commands
- `npm run dev` — Start API + Vite dev pipeline.
- `npm run build` — Build client (Vite) and bundle server (esbuild) to `dist/`.
- `npm start` — Run production server from `dist/`.
- `npm test` — Fast smoke validation.
- `npm run test:comprehensive` — Full suite (functional, e2e, perf, security).
- `npm run lint` / `npm run format[:check]` — ESLint/Prettier.
- `npm run check` — TypeScript type check only.
- `npm run db:push` — Apply Drizzle schema changes.

## Coding Style & Naming Conventions
- TypeScript strict mode; 2‑space indent; max line width 100.
- Prettier: `semi: false`, `singleQuote: true`, `trailingComma: none`.
- ESLint: TS recommended rules; no unused vars (prefix `_` to ignore).
- React components: `PascalCase` files (e.g., `DemoBanner.tsx`).
- Server/lib files: `kebab-case.ts` (e.g., `env-security.ts`).
- Paths: prefer TS aliases from `tsconfig.json` (e.g., `@/lib/*`, `@shared/*`).

## Testing Guidelines
- Primary runners live in `scripts/` (tsx‑executed). Place new scenario tests here.
- Long‑lived fixtures, configs, and assets go under `test/`.
- Quick checks: `npm test`. Full CI parity: `npm run test:comprehensive`.
- Suite examples: `functional-tests.ts`, `e2e.ts`, `performance-tests.ts`, `security-tests.ts`.
- Reports output to `test-results/` (HTML/JSON/CSV as configured).

## Commit & Pull Request Guidelines
- Prefer Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`.
- Scope examples: `server:`, `client:`, `scripts:`, `lib:`.
- PRs must include: purpose, scope, key changes, test plan (commands), and screenshots for UI.
- Link related issues; note breaking changes and required env/config updates.

## Security & Configuration Tips
- Copy `.env.example` → `.env`; never commit secrets. Required: `PORT`, `SESSION_SECRET`, DB URL for Drizzle.
- Use `getEnvVar` helpers from `lib/env-security.ts`; avoid inlining `process.env` in business logic.
- After schema changes in `lib/db`, run `npm run db:push`.
