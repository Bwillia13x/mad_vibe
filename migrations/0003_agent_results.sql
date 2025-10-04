-- Migration: Agent Task Results Storage
-- Created: 2025-10-03
-- Purpose: Store agent task execution results for historical analysis and auditability

-- Agent task results table
CREATE TABLE IF NOT EXISTS agent_task_results (
  id SERIAL PRIMARY KEY,
  task_id VARCHAR(255) NOT NULL UNIQUE,
  workspace_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  task_type VARCHAR(50) NOT NULL,
  task_description TEXT,
  status VARCHAR(20) NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  error TEXT,
  result_summary JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Agent step results table
CREATE TABLE IF NOT EXISTS agent_step_results (
  id SERIAL PRIMARY KEY,
  task_result_id INTEGER NOT NULL REFERENCES agent_task_results(id) ON DELETE CASCADE,
  step_id VARCHAR(50) NOT NULL,
  step_name VARCHAR(255) NOT NULL,
  step_description TEXT,
  action VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,
  result JSONB,
  error TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_agent_task_results_workspace 
ON agent_task_results(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_task_results_type 
ON agent_task_results(task_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_task_results_status
ON agent_task_results(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_step_results_task 
ON agent_step_results(task_result_id, step_id);

CREATE INDEX IF NOT EXISTS idx_agent_step_results_action
ON agent_step_results(action, status);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_agent_task_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_task_results_updated_at
  BEFORE UPDATE ON agent_task_results
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_task_results_updated_at();

-- Comments for documentation
COMMENT ON TABLE agent_task_results IS 'Stores results of autonomous agent task executions';
COMMENT ON TABLE agent_step_results IS 'Stores individual step results within agent tasks';
COMMENT ON COLUMN agent_task_results.result_summary IS 'JSON summary of task outputs for quick access';
COMMENT ON COLUMN agent_step_results.result IS 'Full JSON result from step execution';
