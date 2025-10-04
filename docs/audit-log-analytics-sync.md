# AI Audit Log Analytics Sync Plan

## Purpose

Provide a reliable path for replicating `ai_audit_logs` (and related provenance tables) into downstream analytics tooling for dashboards, anomaly detection, and compliance reviews.

## Source Tables

- `ai_audit_logs`: core interaction records.
- `workspace_data_snapshots`: source-of-truth data snapshots linked from audits via `workspaceSnapshotId` (when available).
- `market_snapshots`: reference market context for ingestion-driven audits.

## Target Destinations

- **Primary Warehouse**: Snowflake (preferred) or BigQuery. Landing schemas: `analytics.raw_ai_audit_logs`, `analytics.raw_workspace_snapshots`.
- **Current selection (2025-10-03)**: BigQuery (project `mad-vibe-prod`, dataset `analytics`).
- **Credential handling**: Service account `ai-audit-sync@madvibe-prod.iam.gserviceaccount.com` with `BigQuery Data Editor` on target dataset; JSON key stored in Secrets Manager entry `AI_AUDIT_BQ_CREDENTIALS`.
- **BI Tooling**: Looker/Lightdash built on top of warehouse views.

## Data Movement Options

1. **Managed Connector (Airbyte/Fivetran)**
   - Pros: Minimal maintenance, built-in schema evolution.
   - Cons: Additional cost, limited custom CDC logic.
   - Configuration: Postgres source connector pulling `ai_audit_logs` incrementally via `created_at` column.
2. **Custom Sync (Node scheduler + Drizzle)**
   - Pros: Full control, reuse existing TypeScript models.
   - Cons: Must manage retries, monitoring, and backfills.
   - Implementation outline:

     ```mermaid
     flowchart LR
       subgraph App
         A[Sync Scheduler] -->|cron| B[Extract new rows]
         B --> C[Upsert to warehouse]
         C --> D[Audit checkpoint]
       end
     ```

## Sync Algorithm (Custom Path)

1. Track high-water mark in a dedicated table `analytics_sync_state` with columns `(stream, last_created_at)`.
2. On each run:
   - Read `last_created_at` (default to epoch on first run).
   - Fetch rows `WHERE created_at > last_created_at ORDER BY created_at ASC LIMIT 10,000`.
   - Upsert into warehouse staging table.
   - Update high-water mark to the max `created_at` seen.
3. Handle retries:
   - Wrap upsert + state update in a transaction.
   - On failure, leave state untouched so the batch is replayed.

## Schema Considerations

- Store JSON metadata columns (`request_metadata`, `response_metadata`) as `VARIANT`/`JSON` in warehouse.
- Normalize key paths (e.g., `response_metadata.durationMs`) into derived columns for analytics.
- Ensure timezone consistency: convert `created_at` to UTC.

## Scheduling

- Recommended cadence: every 5 minutes for near-real-time dashboards.
- Use `node-cron` or platform scheduler (e.g., AWS EventBridge, GCP Cloud Scheduler).
- Expose health endpoint `/internal/analytics-sync` returning last successful run and latency metrics.

### BigQuery Scheduler (Reference Implementation)

- **Environment variables**
  - `AI_AUDIT_WAREHOUSE_DESTINATION=bigquery`
  - `AI_AUDIT_BQ_PROJECT=mad-vibe-prod`
  - `AI_AUDIT_BQ_DATASET=analytics`
  - `AI_AUDIT_BQ_AUDIT_TABLE=raw_ai_audit_logs`
  - `AI_AUDIT_BQ_WORKSPACE_TABLE=raw_workspace_snapshots`
  - `AI_AUDIT_BQ_MARKET_TABLE=raw_market_snapshots`
  - `AI_AUDIT_BQ_CREDENTIALS=/secure/path/ai-audit-bigquery.json` _(or inline JSON)_
- **Automation cadence**
  - Hourly delta (`*/30 * * * *`) invoking `npm run sync:ai-audit-logs -- --mode=delta --since=<iso>`
  - Nightly full (`0 9 * * *`) invoking `npm run sync:ai-audit-logs -- --mode=full --lookback=24h`
- **Health tracking**
  - Record `last_synced_at`, `source_max_created_at`, and `rows_synced` in BigQuery table `analytics.ai_audit_sync_state`.
  - Emit metrics to observability stack and surface via dashboard tiles (see `docs/ai-audit-observability.md`).

#### GitHub Actions Enablement Checklist

- Add repository secrets:
  - `DATABASE_URL` — production Postgres connection string.
  - `AI_AUDIT_BQ_CREDENTIALS_JSON` — JSON for service account `ai-audit-sync@madvibe-prod.iam.gserviceaccount.com`.
- Optional overrides (if not using defaults):
  - `AI_AUDIT_BQ_DATASET`, `AI_AUDIT_BQ_AUDIT_TABLE`, `AI_AUDIT_BQ_WORKSPACE_TABLE`, `AI_AUDIT_BQ_MARKET_TABLE`.
- Confirm `.github/workflows/ai-audit-sync.yml` is enabled; trigger via **Run workflow** using `workflow_dispatch` before schedules fire.
- Manual validation command (mirrors hourly delta run):

  ```bash
  AI_AUDIT_WAREHOUSE_DESTINATION=bigquery \
  AI_AUDIT_BQ_PROJECT=mad-vibe-prod \
  AI_AUDIT_BQ_DATASET=analytics \
  AI_AUDIT_BQ_CREDENTIALS=/secure/path/ai-audit-bigquery.json \
  npm run sync:ai-audit-logs -- --mode=delta --since="$(date -u -d '-1 hour' +%FT%TZ)"
  ```

- After first run, verify BigQuery tables have new rows and update `analytics.ai_audit_sync_state` freshness timestamp.

## Monitoring & Alerting

- Emit sync metrics (`rows_synced`, `latency_seconds`, `run_status`) to existing observability stack (Prometheus or CloudWatch).
- Alert when:
  - No successful sync within 15 minutes.
  - Error rate > 3 consecutive failures.
  - Data latency > 1 hour (max `created_at` vs. current time).

## Security

- Use service account credentials scoped to required tables.
- Encrypt sensitive config in secrets manager (AWS Secrets Manager, GCP Secret Manager).
- Audit warehouse access logs for read/write operations on audit tables.

## Next Steps

1. Decide between managed connector vs. custom sync based on budget and flexibility needs.
2. If custom sync:
   - Scaffold a new script under `scripts/` (e.g., `scripts/sync-ai-audit-logs.ts`).
   - Implement the high-water mark workflow using Drizzle for Postgres and warehouse SDK.
   - Add tests (`test/integration/analytics-sync.test.ts`) covering initial load, incremental sync, and retry behavior.
3. Build warehouse models (`dbt` or SQL) and BI dashboards per `docs/ai-audit-observability.md`.
4. Wire alerts into on-call rotation.
