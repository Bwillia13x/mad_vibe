# Repository Guidelines

## Project Structure & Module Organization
Keep server logic in `server/` (Express API, middleware, storage). The Vite React front end lives in `client/src/` with components in `components/` and pages in `pages/`. Share types and utilities through `shared/`. Server-only helpers, env guards, logging, and database glue belong to `lib/`. Test runners and utilities sit in `scripts/`, while suite outputs land in `test-results/`. Treat `dist/` as build artifacts only—never edit directly.

## Build, Test, and Development Commands
Use `npm run dev` for the combined API + Vite dev pipeline. Build production assets with `npm run build`, then serve them via `npm start`. For fast validation run `npm test`; for full parity suites use `npm run test:comprehensive`. Run `npm run lint`, `npm run format:check`, and `npm run check` before PRs to keep linting, formatting, and types clean.

## Coding Style & Naming Conventions
TypeScript is in strict mode with 2-space indentation and max 100-character lines. Prettier is configured with `semi: false`, `singleQuote: true`, and no trailing commas. React files use PascalCase names (`DemoBanner.tsx`), while server/lib modules use kebab-case (`env-security.ts`). Prefer path aliases from `tsconfig.json` such as `@/lib/*` and `@shared/*`. Prefix unused variables with `_` to satisfy ESLint.

## Testing Guidelines
Tests and fixtures live under `test/`; orchestrators reside in `scripts/` (e.g., `scripts/functional-tests.ts`). Default to `npm test` for quick checks, and escalate to `npm run test:comprehensive` before releases. Commit new scenario tests as TS runners in `scripts/` and capture long-lived assets in `test/`. Store generated reports in `test-results/`.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix:`, `chore:`) with optional scopes like `server:` or `client:`. PRs should outline purpose, scope, key changes, and test commands, plus screenshots for UI updates. Link related issues and call out breaking changes or required env/config updates.

## Security & Configuration Tips
Duplicate `.env.example` into `.env` and populate `PORT`, `SESSION_SECRET`, and your Drizzle database URL. Always reach for the helpers in `lib/env-security.ts` instead of direct `process.env` reads in business code. After modifying schemas in `lib/db`, run `npm run db:push` to apply migrations.
