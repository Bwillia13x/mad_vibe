-- Migration: Performance Indexes
-- Created: 2025-10-03
-- Purpose: Add indexes for high-traffic queries to improve performance at scale

-- ai_audit_logs: frequently queried by workspace + timestamp
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_workspace_time 
ON ai_audit_logs(workspace_id, created_at DESC);

-- ai_audit_logs: queried by capability for analytics
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_capability
ON ai_audit_logs(capability, created_at DESC);

-- market_snapshots: queried by ticker + date
CREATE INDEX IF NOT EXISTS idx_market_snapshots_ticker_date 
ON market_snapshots(ticker, snapshot_date DESC);

-- workspace_data_snapshots: queried by workspace + type
CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_workspace_type 
ON workspace_data_snapshots(workspace_id, snapshot_type, created_at DESC);

-- workflows: queried by userId + lastAccessedAt for sorting
CREATE INDEX IF NOT EXISTS idx_workflows_user_accessed 
ON workflows(user_id, last_accessed_at DESC);

-- workflows: queried by status for filtering
CREATE INDEX IF NOT EXISTS idx_workflows_status
ON workflows(status, last_accessed_at DESC);

-- Add index on ticker for joins and lookups
CREATE INDEX IF NOT EXISTS idx_workflows_ticker
ON workflows(ticker) WHERE ticker IS NOT NULL;

-- financial_statements: queried by workspace for analysis
CREATE INDEX IF NOT EXISTS idx_financial_statements_workspace
ON financial_statements(workspace_id, fiscal_period DESC);
