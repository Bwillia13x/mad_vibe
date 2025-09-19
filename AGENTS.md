# Repository Guidelines

## Project Structure & Module Organization
Server logic lives in `server/` for Express routes, middleware, and persistence helpers; shared server utilities stay in `lib/`. The Vite React app sits in `client/src/` with components in `client/src/components/` and routed pages in `client/src/pages/`. Cross-app types belong to `shared/`. Place runner scripts in `scripts/`, long-lived fixtures in `test/`, and suite outputs in `test-results/`. Generated artifacts such as `dist/` should never be edited. Global layout primitives (navigation shell, page containers, glass cards) live under `client/src/components/layout/`; prefer these when adding new UI surfaces.

## Build, Test, and Development Commands
`npm run dev` starts the API and UI together. Ship-ready bundles come from `npm run build`, and `npm start` serves that build. Run `npm test` for the fast suite and `npm run test:comprehensive` before releases. Guard quality with `npm run lint`, `npm run format:check`, and `npm run check`. When Drizzle models change under `lib/db`, finalize with `npm run db:push`.

## Coding Style & Naming Conventions
TypeScript runs in strict mode with 2-space indentation and a 100-character line limit. Prettier uses `semi: false`, `singleQuote: true`, and no trailing commas—invoke `npm run format` if layout drifts. React modules use PascalCase (`HeroBanner.tsx`); server and lib files use kebab-case (`session-store.ts`). Prefer aliases like `@/lib/env-security` and `@shared/types`, and prefix unused parameters with `_` to satisfy ESLint. New UI should follow the Value Venture Lab theme: slate backgrounds, violet accents, and glassmorphism cards via the shared layout helpers.

## Testing Guidelines
Author specs in `test/` and orchestration scripts in `scripts/` (see `scripts/functional-tests.ts` for shape). Match filenames to the feature under test and mirror the folder hierarchy it touches. Persist deterministic assets nearby, and route generated output to `test-results/`. Run `npm test` before every push; schedule `npm run test:comprehensive` on PRs that modify critical flows.

## Commit & Pull Request Guidelines
Use Conventional Commits such as `feat:`, `fix:`, or `chore:` with optional scopes (`server:`, `client:`). Pull requests should restate purpose, list verification commands, link related issues, and add screenshots for UI changes. Flag schema or env updates so reviewers can update their setup quickly.

## Security & Configuration Tips
Copy `.env.example` to `.env`, populate `PORT`, `SESSION_SECRET`, and the Drizzle database URL, then load values through `lib/env-security.ts`. After adjusting tables or enums in `lib/db`, run `npm run db:push` and verify the migration locally.
