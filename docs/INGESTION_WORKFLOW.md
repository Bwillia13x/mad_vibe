# Market Ingestion & Workspace Snapshot Workflow

## Overview

The market ingestion pipeline enriches analyst workspaces with fresh market data and maintains provenance through linked snapshots and AI audit logs. It is composed of:

- External data fetches via `@/lib/data-sources/market-data`.
- Persistence in `lib/db/schema.ts` tables (`market_snapshots`, `workspace_data_snapshots`, `ai_audit_logs`).
- Express routes under `server/routes/data-ingest.ts` and `server/routes/ai-copilot.ts` registered in `server/routes.ts`.
- Integration tests in `test/integration/market-ingestion.test.ts` that validate the ingestion + audit flow with mocked providers.

## Environment Requirements

Set the following environment variables (copy from `.env.example` if needed):

- `MARKET_DATA_PROVIDER`: Defaults to `yahoo`. Set to `polygon` when using the Polygon provider.
- `POLYGON_API_KEY`: Required when `MARKET_DATA_PROVIDER=polygon`.
- `AI_MODE`: Use `demo` for offline smoke tests; `production` enables live OpenAI calls.
- `OPENAI_API_KEY`: Required for non-demo `AI_MODE` to avoid fallback behavior.
- `SMOKE_MODE`: Set to `true` to bypass strict env validation during local smoke testing.

After modifying schema assets in `lib/db/schema.ts`, run `npm run db:push` and ensure migrations include the new artifacts (`migrations/0001_phase1_snapshots.sql`).

## API Surface

### `POST /api/data-ingest/market/refresh`

Request:

```json
{
  "ticker": "AAPL",
  "workspaceId": 42
}
```

Behavior:

- Fetches quote, profile, metrics, and 1-year history via `market-data` provider.
- Inserts a row into `market_snapshots` with normalized metrics.
- Optionally attaches a `workspace_data_snapshots` record when `workspaceId` is valid.
- Response includes the stored `snapshot` and optional `workspaceSnapshot`.

### `GET /api/data-ingest/workspaces/:id/snapshots`

- Returns the 50 most recent `workspace_data_snapshots` for the workspace, ordered by `createdAt` desc.
- Response shape: `{ snapshots: SnapshotRecord[], count: number }`.

### `POST /api/copilot`

- Supports enhanced prompts and context enrichment.
- When `workspaceId` is present, `recordAuditLog()` persists an entry in `ai_audit_logs` capturing prompt, response, and context metadata.

## Database Artifacts

- **`market_snapshots`**: Canonical store of fetched market data with normalized metrics and provider metadata.
- **`workspace_data_snapshots`**: Links snapshots back to workspaces, enabling provenance and rollback.
- **`ai_audit_logs`**: Records interactions between analysts and AI Copilot for compliance and monitoring.

Refer to `migrations/0001_phase1_snapshots.sql` for the DDL applied during Phase 1.2.

## Testing

- Unit/integration validation lives in `test/integration/market-ingestion.test.ts`.
- Run targeted tests with:

  ```bash
  npx vitest run test/integration/market-ingestion.test.ts
  ```

- The suite mocks the market-data provider and OpenAI, and uses an in-memory Drizzle stub (`vi.mock('../../lib/db')`).

## Operational Notes

- For manual smoke verification, hit `POST /api/data-ingest/market/refresh` with a known ticker and inspect the DB or `/api/data-ingest/workspaces/:id/snapshots`.
- Audit log visibility can be achieved via direct SQL (`SELECT * FROM ai_audit_logs ORDER BY created_at DESC LIMIT 20;`).
- Consider extending observability by surfacing `ai_audit_logs` metrics in dashboards or alerting pipelines.

## Observability Recommendations

- **Metrics**: Track daily counts of AI copilot interactions (`COUNT(*)` grouped by `workflow_id`, `capability`, and `DATE(created_at)`), error rates (non-200 responses correlated via application logs), and workspace coverage (percentage of workspaces with recent audit entries).
- **Dashboards**: Build a time-series chart for audit volume and an accompanying table highlighting top workspaces/capabilities. Include filters for `capability` and `provider` to spot anomalous usage.
- **Alerts**: Trigger notifications when audit volume spikes beyond a rolling baseline, when a workflow logs no AI interactions over a target interval, or when a capability suddenly appears more than a configurable threshold (possible abuse/feature regression).
- **Retention**: Review storage policies for `ai_audit_logs` and ensure downstream pipelines (e.g., warehouse syncs) honor compliance retention windows.

## Manual Smoke Verification Playbook

1. **Provision environment**
   - Start the Postgres instance used by Drizzle (`postgres://` connection must be reachable).
   - Copy `.env.example` to `.env` and populate `MARKET_DATA_PROVIDER`, `POLYGON_API_KEY` (if applicable), `OPENAI_API_KEY`, and `SESSION_SECRET`.
   - Ensure `npm run db:push` and any seeding scripts have been executed so `workflows`, `market_snapshots`, and `workspace_data_snapshots` exist.

2. **Launch the stack**

   ```bash
   npm run dev
   ```

   Wait for both API and Vite client servers to report readiness.

3. **Issue a market refresh**

   Using a valid workflow ID (`WORKSPACE_ID`) and ticker (`AAPL` in this example):

   ```bash
   curl \
     -X POST http://localhost:5000/api/data-ingest/market/refresh \
     -H 'Content-Type: application/json' \
     -d '{"ticker":"AAPL","workspaceId":WORKSPACE_ID}' | jq
   ```

   Expected response (`201`) includes `snapshot` and, when the workspace exists, a `workspaceSnapshot` referencing the new `marketSnapshotId`.

4. **Validate provenance**
   - `GET http://localhost:5000/api/data-ingest/workspaces/WORKSPACE_ID/snapshots` should return the new record with `snapshotType: "market-refresh"`.
   - `GET http://localhost:5000/api/workspaces/WORKSPACE_ID/snapshots` (workspace routes) mirrors the payload.

5. **Confirm AI audit log persistence**

   After invoking `/api/copilot` with `workspaceId`, inspect the audit log entries:

   ```sql
   SELECT id, workflow_id, capability, created_at
   FROM ai_audit_logs
   ORDER BY created_at DESC
   LIMIT 10;
   ```

   Each row should reference the refreshed workspace and capture prompt metadata.

> **Note**
>
> Local development currently defaults to an in-memory fallback when Postgres credentials are missing. In that mode `db` resolves to `null`, and the ingestion routes short-circuit. Always supply a Postgres URL (or start the dockerized database) before running the smoke playbook.
