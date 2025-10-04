-- Migration: Agent Result Full-Text Search Support
-- Created: 2025-10-03
-- Adds tsvector columns and indexes for agent task/step search

ALTER TABLE agent_task_results
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

ALTER TABLE agent_step_results
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Populate existing rows
UPDATE agent_task_results
SET search_vector =
  to_tsvector('english', coalesce(task_description, '')) ||
  to_tsvector('english', coalesce(status, '')) ||
  coalesce(jsonb_to_tsvector('english', result_summary, '["string","numeric","boolean"]'::jsonb), '');

UPDATE agent_step_results
SET search_vector =
  to_tsvector('english', coalesce(step_name, '')) ||
  to_tsvector('english', coalesce(step_description, '')) ||
  to_tsvector('english', coalesce(action, '')) ||
  to_tsvector('english', coalesce(status, '')) ||
  to_tsvector('english', coalesce(error, '')) ||
  coalesce(jsonb_to_tsvector('english', result, '["string","numeric","boolean"]'::jsonb), '');

-- Indexes for search performance
CREATE INDEX IF NOT EXISTS idx_agent_task_results_search
  ON agent_task_results USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_agent_step_results_search
  ON agent_step_results USING GIN (search_vector);

-- Helper function to recompute task search vector
CREATE OR REPLACE FUNCTION refresh_agent_task_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english', coalesce(NEW.task_description, '')) ||
    to_tsvector('english', coalesce(NEW.status, '')) ||
    coalesce(jsonb_to_tsvector('english', NEW.result_summary, '["string","numeric","boolean"]'::jsonb), '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_agent_step_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english', coalesce(NEW.step_name, '')) ||
    to_tsvector('english', coalesce(NEW.step_description, '')) ||
    to_tsvector('english', coalesce(NEW.action, '')) ||
    to_tsvector('english', coalesce(NEW.status, '')) ||
    to_tsvector('english', coalesce(NEW.error, '')) ||
    coalesce(jsonb_to_tsvector('english', NEW.result, '["string","numeric","boolean"]'::jsonb), '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agent_task_results_search_vector_trigger ON agent_task_results;
CREATE TRIGGER agent_task_results_search_vector_trigger
  BEFORE INSERT OR UPDATE ON agent_task_results
  FOR EACH ROW
  EXECUTE FUNCTION refresh_agent_task_search_vector();

DROP TRIGGER IF EXISTS agent_step_results_search_vector_trigger ON agent_step_results;
CREATE TRIGGER agent_step_results_search_vector_trigger
  BEFORE INSERT OR UPDATE ON agent_step_results
  FOR EACH ROW
  EXECUTE FUNCTION refresh_agent_step_search_vector();
