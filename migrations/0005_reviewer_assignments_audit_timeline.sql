-- Migration: Reviewer Assignments & Audit Timeline
-- Created: 2025-10-04
-- Purpose: Persist reviewer workflow assignments and workspace audit timeline events

CREATE TABLE IF NOT EXISTS workflow_reviewer_assignments (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  stage_slug VARCHAR(50) NOT NULL,
  reviewer_id INTEGER REFERENCES workflow_users(id) ON DELETE SET NULL,
  reviewer_email VARCHAR(255),
  reviewer_name VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  assigned_by INTEGER REFERENCES workflow_users(id) ON DELETE SET NULL,
  assigned_by_name VARCHAR(255),
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  due_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  acknowledged_by INTEGER REFERENCES workflow_users(id) ON DELETE SET NULL,
  completed_at TIMESTAMP,
  reminder_count INTEGER NOT NULL DEFAULT 0,
  last_reminder_at TIMESTAMP,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS workflow_reviewer_assignments_workflow_id_idx
  ON workflow_reviewer_assignments(workflow_id, stage_slug);

CREATE INDEX IF NOT EXISTS workflow_reviewer_assignments_status_idx
  ON workflow_reviewer_assignments(status);

CREATE INDEX IF NOT EXISTS workflow_reviewer_assignments_reviewer_idx
  ON workflow_reviewer_assignments(reviewer_id);

COMMENT ON TABLE workflow_reviewer_assignments IS 'Tracks reviewer assignments, status transitions, and reminder telemetry per workflow stage.';
COMMENT ON COLUMN workflow_reviewer_assignments.metadata IS 'Flexible JSON metadata for clients (e.g., Slack thread IDs, reminder targets).';

CREATE TABLE IF NOT EXISTS workflow_audit_events (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  stage_slug VARCHAR(50),
  event_type VARCHAR(50) NOT NULL,
  actor_id INTEGER REFERENCES workflow_users(id) ON DELETE SET NULL,
  actor_name VARCHAR(255),
  actor_role VARCHAR(100),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewer_assignment_id INTEGER REFERENCES workflow_reviewer_assignments(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMP,
  acknowledged_by INTEGER REFERENCES workflow_users(id) ON DELETE SET NULL,
  acknowledgement_note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS workflow_audit_events_workflow_idx
  ON workflow_audit_events(workflow_id, created_at);

CREATE INDEX IF NOT EXISTS workflow_audit_events_stage_idx
  ON workflow_audit_events(stage_slug);

CREATE INDEX IF NOT EXISTS workflow_audit_events_type_idx
  ON workflow_audit_events(event_type);

COMMENT ON TABLE workflow_audit_events IS 'Immutable timeline of workflow activity, reviewer actions, exports, and reminders.';
COMMENT ON COLUMN workflow_audit_events.payload IS 'Structured context for the event (diffs, reminder payloads, export params, etc).';
COMMENT ON COLUMN workflow_audit_events.metadata IS 'Optional JSON metadata for downstream systems (e.g., notification ids).';
