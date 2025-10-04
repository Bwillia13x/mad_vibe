-- Migration: Phase 13 Collaboration & Reviewer Automation
-- Created: 2025-12-05
-- Purpose: Support reviewer SLA automation, audit export schedules, and memo shared drafts

ALTER TABLE workflow_reviewer_assignments
  ADD COLUMN IF NOT EXISTS sla_status VARCHAR(30) NOT NULL DEFAULT 'on_track',
  ADD COLUMN IF NOT EXISTS escalation_level INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS escalated_to INTEGER REFERENCES workflow_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS escalation_notes TEXT,
  ADD COLUMN IF NOT EXISTS batch_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS workflow_reviewer_assignments_sla_idx
  ON workflow_reviewer_assignments(sla_status);

CREATE INDEX IF NOT EXISTS workflow_reviewer_assignments_escalation_idx
  ON workflow_reviewer_assignments(escalation_level);

ALTER TABLE workflow_audit_events
  ADD COLUMN IF NOT EXISTS visible_to_roles JSONB;

CREATE INDEX IF NOT EXISTS workflow_audit_events_visible_roles_gin_idx
  ON workflow_audit_events
  USING GIN(visible_to_roles);

CREATE TABLE IF NOT EXISTS workflow_audit_export_schedules (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  frequency VARCHAR(30) NOT NULL DEFAULT 'daily',
  interval_minutes INTEGER,
  cron_expression VARCHAR(120),
  format VARCHAR(20) NOT NULL DEFAULT 'csv',
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  next_run_at TIMESTAMP,
  last_run_at TIMESTAMP,
  last_status VARCHAR(20),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS workflow_audit_export_schedules_workflow_idx
  ON workflow_audit_export_schedules(workflow_id);

CREATE INDEX IF NOT EXISTS workflow_audit_export_schedules_active_idx
  ON workflow_audit_export_schedules(active, next_run_at);

COMMENT ON TABLE workflow_audit_export_schedules IS 'Persisted schedules for automated audit timeline exports.';

CREATE TABLE IF NOT EXISTS workflow_memo_shared_drafts (
  workflow_id INTEGER PRIMARY KEY REFERENCES workflows(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by INTEGER REFERENCES workflow_users(id) ON DELETE SET NULL,
  lock_session_id VARCHAR(255),
  lock_expires_at TIMESTAMP,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS workflow_memo_suggestions (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  section_id VARCHAR(50) NOT NULL,
  author_id INTEGER REFERENCES workflow_users(id) ON DELETE SET NULL,
  author_name VARCHAR(255),
  summary TEXT,
  before_text TEXT,
  after_text TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolved_by INTEGER REFERENCES workflow_users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS workflow_memo_suggestions_workflow_idx
  ON workflow_memo_suggestions(workflow_id, status);

CREATE INDEX IF NOT EXISTS workflow_memo_suggestions_section_idx
  ON workflow_memo_suggestions(section_id);

COMMENT ON TABLE workflow_memo_suggestions IS 'Tracks collaborative memo suggestions for shared draft mode.';
