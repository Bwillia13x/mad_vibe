# Lint Overrides

We currently downgrade `@typescript-eslint/no-explicit-any` to a warning for `server/` and `scripts/` TypeScript files. These areas include operational tooling and middleware where fully typing downstream dependencies would require non-trivial refactors. Treat the warnings as backlog items: prefer replacing `any` with safe interfaces when touching those modules.

Revisit this override once the server utilities and runner scripts are migrated to stricter typings.
