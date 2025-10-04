# AI Audit Observability Dashboards

## Purpose

Provide visual specifications for the BigQuery-backed observability suite covering Overview, Workspace, and Capability insights. These layouts map directly to Looker (preferred) or Metabase dashboards consuming the `mad-vibe-prod.analytics` dataset.

## Data Sources

- `analytics.ai_audit_daily`
- `analytics.ai_audit_workspace_stats`
- `analytics.ai_audit_capability_anomalies`
- `analytics.ai_audit_latency_distribution`
- `analytics.ai_audit_sync_state`
- `analytics.ai_audit_incident_log` _(optional, populated by alerting pipeline)_

## Dashboard Structure

### Overview Tab

| Tile               | Visualization     | Dataset                         | Dimensions           | Measures                               | Notes                           |
| ------------------ | ----------------- | ------------------------------- | -------------------- | -------------------------------------- | ------------------------------- |
| Interaction Volume | Line chart        | `ai_audit_daily`                | `date`               | `total_interactions`                   | 30-day rolling average overlay  |
| Provider Latency   | Box/violin        | `ai_audit_latency_distribution` | `provider`           | `latency_ms` percentiles (P50/P90/P99) | Highlight SLA breach at >1500ms |
| Error Trend        | Area chart        | `ai_audit_daily`                | `date`               | `error_rate`                           | Reference band 0-5%             |
| Capability Mix     | 100% stacked area | `ai_audit_daily`                | `date`, `capability` | `interaction_count`                    | Normalize to proportions        |
| Sync Freshness     | Gauge             | `ai_audit_sync_state`           | `stream`             | `latency_minutes`                      | Turns red when >5 minutes       |

### Workspace Tab

| Tile                | Visualization  | Dataset                    | Dimensions                                    | Measures                                        | Notes                             |
| ------------------- | -------------- | -------------------------- | --------------------------------------------- | ----------------------------------------------- | --------------------------------- |
| Top Workspaces      | Horizontal bar | `ai_audit_workspace_stats` | `workspace_name`                              | `total_interactions`, `successful_interactions` | Sort desc by `total_interactions` |
| Freshness Grid      | Heatmap        | `ai_audit_workspace_stats` | `workspace_name`, `date`                      | `latency_minutes`                               | Conditional format >5 minutes     |
| Incident Log        | Table          | `ai_audit_incident_log`    | `incident_time`, `workspace_name`, `severity` | `status`, `acknowledged_by`                     | Link to PagerDuty incident        |
| Capability Coverage | Sunburst       | `ai_audit_workspace_stats` | `workspace_name`, `capability`                | `interaction_count`                             | Shows capability diversity        |
| SLA Checklist       | KPI tiles      | `ai_audit_workspace_stats` | `workspace_name`                              | `meets_latency_sla`, `meets_error_sla`          | Boolean indicators                |

### Capability Tab

| Tile                      | Visualization | Dataset                         | Dimensions           | Measures                                         | Notes                                                   |
| ------------------------- | ------------- | ------------------------------- | -------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| Response Time Bands       | Line + area   | `ai_audit_latency_distribution` | `date`, `capability` | P50/P90/P99 `latency_ms`                         | Facet by capability                                     |
| Success vs Failure        | Grouped bar   | `ai_audit_daily`                | `capability`         | `successful_interactions`, `failed_interactions` | Filterable by provider                                  |
| Prompt Length vs Duration | Scatter       | `ai_audit_daily`                | `capability`         | `avg_prompt_chars`, `avg_latency_ms`             | Tooltip shows sample prompts                            |
| Anomaly Timeline          | Column chart  | `ai_audit_capability_anomalies` | `date`, `capability` | `deviation_state` count                          | Color spikes vs drops                                   |
| New Capability Detector   | KPI tile      | `ai_audit_capability_anomalies` | `capability`         | `is_new_capability`                              | Mirrors example SQL in `docs/ai-audit-observability.md` |

## Filters & Controls

- Global: Date range (default last 14 days), Provider, Capability, Workspace.
- Drill-through: Clicking any tile opens an explore pre-filtered by selected dimension.
- Alert badge: Display incident count in navigation breadcrumb from PagerDuty API.

## Implementation Checklist

1. Connect Looker/Metabase to BigQuery project `mad-vibe-prod` dataset `analytics`.
2. Model views or use SQL queries matching the datasets above.
3. Build tabs following the tables in this document.
4. Export dashboard definition JSON/YAML to `observability/dashboards/ai-audit/`.
5. Capture PNG screenshots (Overview, Workspace, Capability) and store in `docs/assets/ai-audit-observability/`.
6. Update `docs/ai-audit-observability.md` appendix with image embeds and incident links.

## Synthetic Validation

- Run `npm run simulate:audit-spike` to ensure spike alerts surface in Anomaly Timeline and PagerDuty.
- Run `npm run simulate:audit-drop` to confirm drop detection.
- Verify `sync Freshness` gauge changes when pausing `sync:ai-audit-logs` job for >5 minutes.
