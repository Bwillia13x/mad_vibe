# AI Audit Log Observability Playbook

## Objectives

- Establish visibility into `ai_audit_logs` volume, coverage, and failure scenarios.
- Detect anomalous usage patterns (spikes, drops, or new capabilities) quickly.
- Power compliance reviews with drill-down dashboards and traceability.

## Data Model Overview

Key columns used across dashboards:

- `workflow_id`: Links interactions back to analyst workspaces.
- `capability`: High-level copilot feature or workflow invoked.
- `provider`: Upstream LLM integration (e.g., `openai`, `anthropic`, `stub`).
- `created_at`: Timestamp of the interaction.
- `request_metadata`: JSON payload containing prompt context (source documents, snapshot references).
- `response_metadata`: JSON payload with model parameters and completion identifiers.

## Metrics & Dashboards

- **Volume trends**: Daily interaction counts grouped by `capability`, with a secondary view showing unique `workflow_id`s served. Helps spot adoption drops.
- **Anomaly Detection**: Rolling 7-day average vs. current day volume per `capability`; flag when deviation > 2σ.
- **Error Funnel**: Count of interactions with `response_status != 'success'` or explicit error flags inside `response_metadata`.
- **Latency Distribution**: P95 and max latency derived from `response_metadata.durationMs` (populate during copilot execution if missing).
- **Workspace Coverage**: % of active workspaces (`workflows.last_accessed_at` in trailing 14 days) with at least one audit record.

### Warehouse Views

- **`analytics.ai_audit_daily`**
  - Grain: day × capability × provider.
  - Columns: `date`, `capability`, `provider`, `interaction_count`, `workspace_count`, `error_rate`, `p95_latency_ms`.
  - Example query:

    ```sql
    select
      date_trunc('day', created_at) as date,
      coalesce(capability, 'unknown') as capability,
      coalesce(provider, 'unspecified') as provider,
      count(*) as interaction_count,
      count(distinct workflow_id) as workspace_count,
      avg((response_metadata->>'durationMs')::numeric) filter (where response_metadata ? 'durationMs') as avg_latency_ms,
      percentile_disc(0.95) within group (order by (response_metadata->>'durationMs')::numeric) as p95_latency_ms,
      avg(case when response_metadata->>'status' = 'success' then 0 else 1 end)::numeric as error_rate
    from analytics.ai_audit_logs
    group by 1, 2, 3;
    ```

- **`analytics.ai_audit_workspace_stats`**
  - Grain: workspace × day.
  - Derived KPI columns: `last_interaction_at`, `total_interactions`, `error_rate`, `unique_capabilities`.
  - Supports workspace drill-down tables with link-outs to raw records filtered by `workflow_id`.

- **`analytics.ai_audit_capability_anomalies`**
  - Detect deviations by comparing `interaction_count` against a rolling 7-day median.
  - Recommended SQL (materialized view or dbt incremental):

    ```sql
    with daily as (
      select date, capability, interaction_count
      from analytics.ai_audit_daily
    ), stats as (
      select
        d.capability,
        d.date,
        interaction_count,
        percentile_cont(0.5) within group (order by interaction_count)
          over (partition by capability order by date rows between 7 preceding and 1 preceding) as median_7d
      from daily d
    )
    select *,
      case
        when interaction_count > median_7d * 1.75 then 'spike'
        when interaction_count < median_7d * 0.4 then 'drop'
        else 'normal'
      end as deviation_state
    from stats;
    ```

## Alerting Strategy

- **Volume Spike**: Trigger when daily interactions > rolling 14-day median × 1.75. PagerDuty/Slack alert with top contributing capabilities.
- **Volume Drop**: Trigger when interactions < rolling 14-day median × 0.4 or no logs for > 2 hours during business hours (configurable).
- **Error Surge**: Trigger when error rate (non-success responses) exceeds 5% over a 15-minute window.
- **New Capability Detection**: Emit a notification when unseen `capability` value appears (use event-based alert in warehouse or streaming pipeline).

### Alert Configuration Checklist

- **Metrics Source**: Use `analytics.ai_audit_daily` for spike/drop/error thresholds; ensure data latency < 5 minutes.
- **PagerDuty Service**: `ai-audit-observability`. Auto-assign primary on-call, fallback to compliance secondary.
- **Slack Notifications**: Route to `#ai-copilot-ops` with rich attachments summarizing `capability`, `delta`, and dashboard link.
- **Runbooks**: Link each alert to remediation steps in `docs/INGESTION_WORKFLOW.md` (§ Incident Response).
- **Testing**: Execute synthetic load job (`npm run simulate:audit-spike`) to validate alerts before launch.

## Implementation Steps

### Step 1 — Ingestion

- Stream `ai_audit_logs` into the analytics warehouse (see `docs/audit-log-analytics-sync.md`).
- Ensure timestamps are stored in UTC and partition tables by `created_at`.
- **Current state**: `.cache/ai-audit-sync-state.json` missing locally; run `AI_AUDIT_WAREHOUSE_DESTINATION=stdout npm run sync:ai-audit-logs` to seed baseline data before dashboard QA.

#### Warehouse Latency Expectations

- Target freshness: < 5 minutes end-to-end (database -> sync job -> warehouse).
- Current sync cadence (`scripts/sync-ai-audit-logs.ts`): on-demand; schedule nightly + hourly delta runs.
- Action item: analytics engineering to confirm Airflow DAG lag and backfill coverage prior to launch.

### Step 2 — Modeling

- Create dbt models/views normalizing nested metadata fields (extract `response_metadata.durationMs`, `response_metadata.status`).
- Derive auxiliary tables: `ai_audit_capability_stats` (daily aggregates) and `ai_audit_workspace_stats` (workspace-day aggregates).

### Step 3 — Dashboards

- Use your BI tool to build the Overview, Workspace, and Capability tabs described above.
- Validate KPI tile formulas against warehouse queries (e.g., totals vs. `analytics.ai_audit_daily`).
- Capture screenshots and embed in this document for future reference.

#### Overview Tab (Adoption & Health)

- **KPI tiles**
  - `Total Interactions (24h)`: `sum(interaction_count)` filtered to `current_date`.
  - `Active Workspaces (7d)`: `sum(workspace_count)` filtered to trailing 7 days.
  - `Error Rate (24h)`: `sum(error_count)::numeric / nullif(sum(interaction_count), 0)`.
  - `P95 Latency (24h)`: weighted average of `p95_latency_ms` across capabilities.

##### Overview Example SQL

```sql
select
  sum(interaction_count) filter (where date = current_date) as interactions_24h,
  sum(workspace_count) filter (where date >= current_date - interval '6 days') as active_workspaces_7d,
  sum(error_count) filter (where date = current_date)::numeric
    / nullif(sum(interaction_count) filter (where date = current_date), 0) as error_rate_24h,
  sum(p95_latency_ms * interaction_count) filter (where date = current_date)
    / nullif(sum(interaction_count) filter (where date = current_date), 0) as weighted_p95_latency_ms
from analytics.ai_audit_daily;
```

- **Charts**
  - Stacked area chart for interactions by `capability` (`analytics.ai_audit_daily`).
  - Line chart overlaying error rate vs. 5% target threshold.
  - Donut chart showing provider mix (`provider` dimension).
- **Drill-down behavior**
  - Clicking a capability within the area chart opens the Capability tab filtered to that capability.
  - KPI “Active Workspaces (7d)” links to the Workspace tab with date range filter `{current_date - 6 days, current_date}`.

#### Workspace Tab (Coverage)

- **Primary table**
  - Source: `analytics.ai_audit_workspace_stats`.
  - Columns: `workspace_id`, `last_interaction_at`, `total_interactions`, `error_rate`, `unique_capabilities`.
  - Include link column to `client/src/pages/workspace-overview.tsx` route (`/workspaces/{workspace_id}`).

##### Example SQL

```sql
select
  workspace_id,
  last_interaction_at,
  total_interactions,
  error_rate,
  unique_capabilities
from analytics.ai_audit_workspace_stats
where date >= current_date - interval '13 days'
order by last_interaction_at desc;
```

- **Visualizations**
  - Heatmap: `date` (x-axis) × `workspace_id` (y-axis) colored by interaction_count.
  - Conditional formatting to flag `error_rate > 0.05`.
- **Filters**
  - Team/Owner dimension by joining `workflows` table.
  - Activity SLA toggle (e.g., “inactive 7d”).

#### Capability Tab (Anomalies)

- **KPI tiles**
  - `New Capabilities (7d)`: count of capabilities not seen prior to trailing 7-day window.
  - `Spike Alerts (24h)`: count of `deviation_state = 'spike'` in last day.
  - `Drop Alerts (24h)`: count of `deviation_state = 'drop'` in last day.
- **Example SQL**

  ```sql
  with anomalies as (
    select *
    from analytics.ai_audit_capability_anomalies
    where date >= current_date - interval '13 days'
  )
  select
    count(distinct capability) filter (
      where date >= current_date - interval '6 days'
        and capability not in (
          select distinct capability
          from analytics.ai_audit_capability_anomalies
          where date < current_date - interval '6 days'
        )
    ) as new_capabilities_7d,
    count(*) filter (where date = current_date and deviation_state = 'spike') as spike_alerts_24h,
    count(*) filter (where date = current_date and deviation_state = 'drop') as drop_alerts_24h
  from anomalies;
  ```

- **Visualizations**
  - Bar chart of anomalies by capability and severity using `analytics.ai_audit_capability_anomalies`.
  - Box/violin plot of latency distribution per capability using `analytics.ai_audit_daily` (`p95_latency_ms`).
  - Table with columns `date`, `capability`, `interaction_count`, `median_7d`, `deviation_state` and links to incident runbook sections.
- **Drill-down behavior**
  - Row action opens raw log query filtered by `capability` + `date`.
  - Provide quick link to create PagerDuty incident draft.

### Step 4 — Alerting

- Implement SQL-triggered alerts (dbt exposures, Metabase pulses) or streaming monitors (e.g., Materialize + Alertmanager).
- Route alerts to compliance Slack channel and on-call rotation.
- Store alert definitions in source control (`observability/alerts/ai-audit/`).

#### Dashboard Build Checklist (BigQuery)

- **Overview tab**
  - Visualizations:
    - Daily interaction volume (line chart from `analytics.ai_audit_daily`)
    - Provider latency distribution (box/violin)
    - Error rate (%) trend with target band (0-5%)
    - Capability mix (stacked area)
  - Filters: Date range (default 7d), Provider, Capability.
- **Workspace tab**
  - Visualizations:
    - Workspace leaderboard (bar chart on `ai_audit_workspace_stats.total_interactions`)
    - Freshness gauge comparing `last_synced_at` vs now
    - Recent incidents table (join `ai_audit_logs` with alerts)
- **Capability tab**
  - Visualizations:
    - Response time percentile bands (P50/P90/P99)
    - Success vs failure counts per capability
    - Prompt length vs duration scatter plot
- **Implementation notes**
  - Use Looker (preferred) or Metabase with BigQuery connection `mad-vibe-prod.analytics`.
  - Save dashboard under `AI Copilot / Observability` space.
  - Export dashboard YAML/JSON definitions to `observability/dashboards/ai-audit/`.

#### Artifact Capture

- Capture PNG screenshots of each dashboard tab after data backfill.
- Store images under `docs/assets/ai-audit-observability/` (Overview.png, Workspace.png, Capability.png).
- Update `docs/ai-audit-observability.md` appendix with image embeds and short description.
- Record PagerDuty service link and Slack channel permalink in this doc once operational.
- Keep dashboard layout specs in sync with `docs/ai-audit-dashboards.md`; export BI definitions (JSON/YAML) to `observability/dashboards/ai-audit/` after each revision.

#### PagerDuty Configuration (`ai-audit-observability`)

- **Service setup**
  - Primary escalation: Data Platform on-call.
  - Secondary escalation: Compliance lead.
- **Alert rules**
  - **Volume spike**: `interaction_count > rolling_median_14d * 1.75` grouped by `capability`.
  - **Volume drop**: `interaction_count < rolling_median_14d * 0.4` or zero records during 08:00–19:00 PT.
  - **Error surge**: `error_rate > 0.05` over 15-minute window.
  - **New capability**: detect unseen `capability` values and raise informational incident.
- **Testing**
  - Run `npm run simulate:audit-spike` and `npm run simulate:audit-drop` (to be implemented) before enabling auto-escalation.
  - Document results and remediation links in PagerDuty runbook notes.

#### Slack Routing (`#ai-copilot-ops`)

- Integrate PagerDuty Slack extension for automatic postings.
- Custom webhook payload example:

  ```json
  {
    "channel": "#ai-copilot-ops",
    "attachments": [
      {
        "color": "#7C3AED",
        "title": "AI Copilot Audit Spike",
        "text": "Capability: {{capability}}\nDelta: {{delta_percent}}%\nWindow: {{window_start}}–{{window_end}}",
        "actions": [
          {
            "type": "button",
            "text": "Open Dashboard",
            "url": "https://bi.madvibe.ai/dashboards/audit-overview?capability={{capability}}"
          }
        ]
      }
    ]
  }
  ```

#### Alert Runbooks

- Link Slack + PagerDuty events to `docs/INGESTION_WORKFLOW.md#ai-audit-incidents`.
- Include triage checklist: validate warehouse freshness, confirm sync job status, inspect recent releases.
- Capture postmortem notes in `docs/audit-log-analytics-sync.md`.

### Step 5 — Sync Scheduling & Freshness

- **Hourly delta job**: `npm run sync:ai-audit-logs -- --mode=delta --since=<ISO timestamp>`;
  deploy via GitHub Actions or Airflow.
- **Nightly repair job (02:00 local)**: `npm run sync:ai-audit-logs -- --mode=full --lookback=24h`.
- **Metrics**: emit `sync_duration_ms`, `records_synced`, `last_synced_at`, `source_max_created_at` to `analytics.ai_audit_sync_state`.
- **Freshness SLO**: alert when `now() - last_synced_at > interval '5 minutes'` during business hours.

#### Automation Snippets

- **GitHub Actions cron (UTC)**

  ```yaml
  name: Audit Sync Schedule

  on:
    schedule:
      - cron: '*/30 * * * *'   # hourly delta every 30 minutes for redundancy
      - cron: '0 9 * * *'      # 02:00 PT nightly full repair

  jobs:
    run-sync:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: '20'
        - run: npm ci
        - name: Hourly delta
          if: github.event.schedule == '*/30 * * * *'
          run: |
            env $(grep -v '^#' .env.production.example | xargs) \
              npm run sync:ai-audit-logs -- --mode=delta --since="$(date -u -d '-1 hour' +%FT%TZ)"
        - name: Nightly full
          if: github.event.schedule == '0 9 * * *'
          run: |
            env $(grep -v '^#' .env.production.example | xargs) \
              npm run sync:ai-audit-logs -- --mode=full --lookback=24h
  ```

- **Airflow DAG sketch**

  ```python
  with DAG(
      dag_id='ai_audit_sync',
      schedule_interval='@hourly',
      start_date=datetime(2025, 10, 3),
      catchup=False,
      max_active_runs=1
  ) as dag:

      hourly_delta = BashOperator(
          task_id='hourly_delta',
          bash_command='env $(grep -v '^#' /opt/config/.env | xargs) npm run sync:ai-audit-logs -- --mode=delta --since="{{ macros.ds_add(ts_nodash, -1/24) }}Z"'
      )

      nightly_full = BashOperator(
          task_id='nightly_full',
          bash_command='env $(grep -v '^#' /opt/config/.env | xargs) npm run sync:ai-audit-logs -- --mode=full --lookback=24h',
          trigger_rule=TriggerRule.ALL_DONE
      )

      hourly_delta >> nightly_full
  ```

### Step 6 — Data Platform Handoff Checklist

- **Dashboards**
  - Build Overview, Workspace, Capability tabs using specs above.
  - Share with compliance, SRE, and product analytics groups.
- **Warehouse models**
  - Materialize `analytics.ai_audit_daily`, `analytics.ai_audit_workspace_stats`, `analytics.ai_audit_capability_anomalies` via dbt.
  - Add dbt tests (not null, accepted values for `deviation_state`).
- **Alerting**
  - Configure PagerDuty + Slack integrations, run synthetic alert tests.
  - Store alert definitions and IaC in `observability/alerts/ai-audit/`.
- **Sync automation**
  - Deploy hourly and nightly jobs, log metrics to observability stack.
  - Monitor `.cache/ai-audit-sync-state.json` rotation strategy.
- **Documentation**
  - Update this playbook with dashboard screenshots and alert test outcomes.
  - Record runbook links inside `docs/INGESTION_WORKFLOW.md`.

## Access Controls

- Grant read-only access to compliance, product analytics, and SRE groups.
- Mask prompt/response content by default; expose decrypted fields only in controlled views with row-level policies.

## Future Enhancements

- Correlate audit logs with `workspace_data_snapshots` to show the precise market snapshot used during an interaction.
- Feed anomaly detection into automated remediation (e.g., temporarily disable runaway capability).
- Integrate with incident management tooling (e.g., create JIRA tickets automatically when alerts fire).
