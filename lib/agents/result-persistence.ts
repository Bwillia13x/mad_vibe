/**
 * Agent Result Persistence
 * Stores agent task execution results in database for historical analysis
 */

import type { AgentTask, AgentStep } from './orchestrator'
import { log } from '../log'

export interface StoredTaskResult {
  id: number
  taskId: string
  workspaceId: number
  taskType: string
  taskDescription: string
  status: string
  startedAt: Date
  completedAt: Date | null
  durationMs: number | null
  error: string | null
  resultSummary: Record<string, unknown> | null
}

/**
 * Retrieve a single agent task result by taskId
 */
export async function getAgentTaskResultByTaskId(
  taskId: string
): Promise<StoredTaskResult | null> {
  try {
    const { connectionPool } = await import('../db/connection-pool')

    if (!connectionPool) return null

    const result = await connectionPool.query(
      `SELECT * FROM agent_task_results WHERE task_id = $1 LIMIT 1`,
      [taskId]
    )

    if (result.rows.length === 0) return null

    const row = result.rows[0] as Record<string, unknown>
    return {
      id: row.id as number,
      taskId: row.task_id as string,
      workspaceId: row.workspace_id as number,
      taskType: row.task_type as string,
      taskDescription: row.task_description as string,
      status: row.status as string,
      startedAt: row.started_at as Date,
      completedAt: (row.completed_at as Date) ?? null,
      durationMs: (row.duration_ms as number) ?? null,
      error: (row.error as string) ?? null,
      resultSummary: (row.result_summary as Record<string, unknown>) ?? null
    }
  } catch (error) {
    log('Error retrieving single agent task result', {
      taskId,
      error: error instanceof Error ? error.message : String(error)
    })
    return null
  }
}

export interface StoredStepResult {
  id: number
  taskResultId: number
  stepId: string
  stepName: string
  stepDescription: string
  action: string
  status: string
  result: unknown
  error: string | null
  startedAt: Date | null
  completedAt: Date | null
  durationMs: number | null
  retryCount: number
}

/**
 * Save agent task result to database
 */
export async function saveAgentTaskResult(task: AgentTask): Promise<number | null> {
  try {
    const { connectionPool } = await import('../db/connection-pool')
    
    if (!connectionPool) {
      log('Database not available, skipping agent result persistence')
      return null
    }

    // Check if result already exists
    const existing = await connectionPool.query(
      'SELECT id FROM agent_task_results WHERE task_id = $1',
      [task.id]
    )

    let taskResultId: number

    if (existing.rows.length > 0) {
      // Update existing result
      taskResultId = existing.rows[0].id

      await connectionPool.query(
        `UPDATE agent_task_results 
         SET status = $1, completed_at = $2, duration_ms = $3, error = $4, 
             result_summary = $5, updated_at = NOW()
         WHERE id = $6`,
        [
          task.status,
          task.completedAt,
          calculateDuration(task.startedAt, task.completedAt),
          task.error,
          JSON.stringify(generateResultSummary(task)),
          taskResultId
        ]
      )
    } else {
      // Insert new result
      const result = await connectionPool.query(
        `INSERT INTO agent_task_results 
         (task_id, workspace_id, task_type, task_description, status, started_at, 
          completed_at, duration_ms, error, result_summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          task.id,
          task.workspaceId,
          task.type,
          task.description,
          task.status,
          task.startedAt,
          task.completedAt,
          calculateDuration(task.startedAt, task.completedAt),
          task.error,
          JSON.stringify(generateResultSummary(task))
        ]
      )

      taskResultId = result.rows[0].id
    }

    // Save step results
    await saveAgentStepResults(taskResultId, task.steps)

    log('Agent task result saved', { taskId: task.id, taskResultId })
    return taskResultId
  } catch (error) {
    log('Error saving agent task result', {
      taskId: task.id,
      error: error instanceof Error ? error.message : String(error)
    })
    return null
  }
}

/**
 * Save agent step results to database
 */
async function saveAgentStepResults(
  taskResultId: number,
  steps: AgentStep[]
): Promise<void> {
  try {
    const { connectionPool } = await import('../db/connection-pool')
    
    if (!connectionPool) return

    for (const step of steps) {
      // Check if step result already exists
      const existing = await connectionPool.query(
        'SELECT id FROM agent_step_results WHERE task_result_id = $1 AND step_id = $2',
        [taskResultId, step.id]
      )

      if (existing.rows.length > 0) {
        // Update existing step result
        await connectionPool.query(
          `UPDATE agent_step_results
           SET status = $1, result = $2, error = $3, completed_at = $4, 
               duration_ms = $5, retry_count = $6
           WHERE id = $7`,
          [
            step.status,
            JSON.stringify(step.result),
            step.error,
            step.completedAt,
            step.durationMs,
            step.retryCount,
            existing.rows[0].id
          ]
        )
      } else {
        // Insert new step result
        await connectionPool.query(
          `INSERT INTO agent_step_results
           (task_result_id, step_id, step_name, step_description, action, status,
            result, error, started_at, completed_at, duration_ms, retry_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            taskResultId,
            step.id,
            step.name,
            step.description,
            step.action,
            step.status,
            JSON.stringify(step.result),
            step.error,
            step.startedAt,
            step.completedAt,
            step.durationMs,
            step.retryCount
          ]
        )
      }
    }
  } catch (error) {
    log('Error saving agent step results', {
      taskResultId,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

/**
 * Generate summary of task results for quick access
 */
function generateResultSummary(task: AgentTask): Record<string, unknown> {
  const completedSteps = task.steps.filter(s => s.status === 'completed')
  const failedSteps = task.steps.filter(s => s.status === 'failed')

  const summary: Record<string, unknown> = {
    totalSteps: task.steps.length,
    completedSteps: completedSteps.length,
    failedSteps: failedSteps.length,
    completionRate: (completedSteps.length / task.steps.length) * 100
  }

  // Extract key results from completed steps
  for (const step of completedSteps) {
    if (step.result) {
      summary[step.action] = step.result
    }
  }

  return summary
}

/**
 * Calculate duration in milliseconds
 */
function calculateDuration(
  startedAt: Date | null,
  completedAt: Date | null
): number | null {
  if (!startedAt) return null
  const end = completedAt || new Date()
  return end.getTime() - new Date(startedAt).getTime()
}

/**
 * Retrieve agent task results from database
 */
export async function getAgentTaskResults(
  workspaceId: number,
  limit: number = 10
): Promise<StoredTaskResult[]> {
  try {
    const { connectionPool } = await import('../db/connection-pool')
    
    if (!connectionPool) return []

    const result = await connectionPool.query(
      `SELECT * FROM agent_task_results 
       WHERE workspace_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [workspaceId, limit]
    )

    return result.rows.map((row: Record<string, unknown>) => ({
      id: row.id as number,
      taskId: row.task_id as string,
      workspaceId: row.workspace_id as number,
      taskType: row.task_type as string,
      taskDescription: row.task_description as string,
      status: row.status as string,
      startedAt: row.started_at as Date,
      completedAt: row.completed_at as Date | null,
      durationMs: row.duration_ms as number | null,
      error: row.error as string | null,
      resultSummary: row.result_summary as Record<string, unknown> | null
    }))
  } catch (error) {
    log('Error retrieving agent task results', {
      workspaceId,
      error: error instanceof Error ? error.message : String(error)
    })
    return []
  }
}

/**
 * Retrieve agent step results for a task
 */
export async function getAgentStepResults(taskId: string): Promise<StoredStepResult[]> {
  try {
    const { connectionPool } = await import('../db/connection-pool')
    
    if (!connectionPool) return []

    const result = await connectionPool.query(
      `SELECT asr.* 
       FROM agent_step_results asr
       JOIN agent_task_results atr ON asr.task_result_id = atr.id
       WHERE atr.task_id = $1
       ORDER BY asr.id ASC`,
      [taskId]
    )

    return result.rows.map((row: Record<string, unknown>) => ({
      id: row.id as number,
      taskResultId: row.task_result_id as number,
      stepId: row.step_id as string,
      stepName: row.step_name as string,
      stepDescription: row.step_description as string,
      action: row.action as string,
      status: row.status as string,
      result: row.result,
      error: row.error as string | null,
      startedAt: row.started_at as Date | null,
      completedAt: row.completed_at as Date | null,
      durationMs: row.duration_ms as number | null,
      retryCount: row.retry_count as number
    }))
  } catch (error) {
    log('Error retrieving agent step results', {
      taskId,
      error: error instanceof Error ? error.message : String(error)
    })
    return []
  }
}
