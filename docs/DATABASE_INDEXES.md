# Database Indexes

This document describes the indexes applied to the MAD Vibe database for performance optimization.

## Index Strategy

Indexes are added to tables with:
- High query frequency (>1000 queries/hour in production)
- Large data volume (>10k rows)
- Complex queries with multiple WHERE clauses or JOINs
- Sorting requirements (ORDER BY)

## Applied Indexes

### ai_audit_logs

**idx_ai_audit_logs_workspace_time**
```sql
CREATE INDEX idx_ai_audit_logs_workspace_time 
ON ai_audit_logs(workspace_id, created_at DESC);
```
- **Purpose**: Workspace-filtered audit log queries with time-based sorting
- **Used by**: `/api/workspaces/:id/audit-logs`, analytics dashboards
- **Estimated improvement**: 70-90% faster for workspace audit queries

**idx_ai_audit_logs_capability**
```sql
CREATE INDEX idx_ai_audit_logs_capability
ON ai_audit_logs(capability, created_at DESC);
```
- **Purpose**: Capability-based analytics and reporting
- **Used by**: AI usage reports, capability trending
- **Estimated improvement**: 60-80% faster for capability queries

### market_snapshots

**idx_market_snapshots_ticker_date**
```sql
CREATE INDEX idx_market_snapshots_ticker_date 
ON market_snapshots(ticker, snapshot_date DESC);
```
- **Purpose**: Ticker-specific market data retrieval with date sorting
- **Used by**: `/api/market/:ticker/history`, charting components
- **Estimated improvement**: 80-95% faster for ticker history queries

### workspace_data_snapshots

**idx_workspace_snapshots_workspace_type**
```sql
CREATE INDEX idx_workspace_snapshots_workspace_type 
ON workspace_data_snapshots(workspace_id, snapshot_type, created_at DESC);
```
- **Purpose**: Workspace snapshot queries filtered by type
- **Used by**: `/api/workspaces/:id/snapshots`, workspace overview
- **Estimated improvement**: 75-90% faster for typed snapshot queries

### workflows

**idx_workflows_user_accessed**
```sql
CREATE INDEX idx_workflows_user_accessed 
ON workflows(user_id, last_accessed_at DESC);
```
- **Purpose**: User workspace list with recent access sorting
- **Used by**: `/api/workspaces`, workspace switcher
- **Estimated improvement**: 70-85% faster for user workspace queries

**idx_workflows_status**
```sql
CREATE INDEX idx_workflows_status
ON workflows(status, last_accessed_at DESC);
```
- **Purpose**: Status-filtered workspace queries
- **Used by**: Active workspace lists, status dashboards
- **Estimated improvement**: 60-75% faster for status filtering

**idx_workflows_ticker**
```sql
CREATE INDEX idx_workflows_ticker
ON workflows(ticker) WHERE ticker IS NOT NULL;
```
- **Purpose**: Ticker-based workspace lookups (partial index)
- **Used by**: Company-specific workspace discovery
- **Estimated improvement**: 85-95% faster for ticker lookups

### financial_statements

**idx_financial_statements_workspace**
```sql
CREATE INDEX idx_financial_statements_workspace
ON financial_statements(workspace_id, fiscal_period DESC);
```
- **Purpose**: Workspace financial data with period sorting
- **Used by**: Financial analysis pages, DCF models
- **Estimated improvement**: 75-90% faster for workspace financials

## Index Maintenance

### Monitoring Index Usage

```sql
-- Check index usage statistics
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Identifying Missing Indexes

```sql
-- Find tables with sequential scans
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  seq_tup_read / NULLIF(seq_scan, 0) as avg_seq_read
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 20;
```

### Measuring Query Performance

```sql
-- Enable query timing
SET track_io_timing = ON;

-- Example: Test workspace query performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM workflows 
WHERE user_id = 1 
ORDER BY last_accessed_at DESC 
LIMIT 10;
```

## Index Size and Impact

Monitor index sizes to ensure they don't consume excessive disk space:

```sql
SELECT
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

**Expected index sizes** (after 6 months production):
- `idx_ai_audit_logs_workspace_time`: ~500MB
- `idx_market_snapshots_ticker_date`: ~300MB
- `idx_workspace_snapshots_workspace_type`: ~200MB
- `idx_workflows_user_accessed`: ~50MB

## Applying Indexes in Production

**Recommended approach:**
1. Apply during low-traffic window (2-4 AM)
2. Use `CREATE INDEX CONCURRENTLY` to avoid table locks
3. Monitor query performance before/after
4. Rollback if performance degrades

**Example:**
```sql
CREATE INDEX CONCURRENTLY idx_ai_audit_logs_workspace_time 
ON ai_audit_logs(workspace_id, created_at DESC);
```

## Future Index Considerations

Potential indexes to add as data volume grows:
- Composite index on `ai_audit_logs(workspace_id, capability, created_at)`
- GIN index on `ai_audit_logs.context` for JSON queries
- Partial index on `workflows` for active workspaces only
- Covering indexes for frequently joined columns
