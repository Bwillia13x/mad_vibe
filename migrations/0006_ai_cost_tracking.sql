-- Migration: AI Cost Tracking for OpenAI Usage Analytics
-- Created: 2025-10-04
-- Purpose: Add token usage and cost tracking fields to ai_audit_logs for Phase 12 analytics

ALTER TABLE ai_audit_logs
  ADD COLUMN IF NOT EXISTS model VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tokens_prompt INTEGER,
  ADD COLUMN IF NOT EXISTS tokens_completion INTEGER,
  ADD COLUMN IF NOT EXISTS tokens_total INTEGER,
  ADD COLUMN IF NOT EXISTS estimated_cost_usd INTEGER,
  ADD COLUMN IF NOT EXISTS latency_ms INTEGER;

COMMENT ON COLUMN ai_audit_logs.model IS 'OpenAI model used (gpt-5, gpt-4o, etc.)';
COMMENT ON COLUMN ai_audit_logs.tokens_prompt IS 'Prompt tokens consumed';
COMMENT ON COLUMN ai_audit_logs.tokens_completion IS 'Completion tokens generated';
COMMENT ON COLUMN ai_audit_logs.tokens_total IS 'Total tokens (prompt + completion)';
COMMENT ON COLUMN ai_audit_logs.estimated_cost_usd IS 'Estimated cost in micro-dollars (1/1000000 USD) based on model pricing';
COMMENT ON COLUMN ai_audit_logs.latency_ms IS 'Response latency in milliseconds';
