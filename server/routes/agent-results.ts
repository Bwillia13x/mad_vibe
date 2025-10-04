import { Router } from 'express'
import { optionalAuth } from '../middleware/auth'
import {
  getAgentTaskResults,
  getAgentStepResults,
  getAgentTaskResultByTaskId
} from '../../lib/agents/result-persistence'
import { getAgentMetrics } from '../../lib/agents/result-metrics'
import { searchAgentResults } from '../../lib/agents/result-search'
import { fetchCostAnalytics } from '../../lib/agents/cost-analytics'

const router = Router()
router.use(optionalAuth)

/**
 * Get historical agent results for a workspace
 */
router.get('/workspaces/:workspaceId/agent-results', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId)
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const offset = parseInt(req.query.offset as string) || 0

    if (isNaN(workspaceId)) {
      return res.status(400).json({ error: 'Invalid workspace ID' })
    }

    const results = await getAgentTaskResults(workspaceId, limit)

    // Apply offset
    const paginatedResults = results.slice(offset, offset + limit)

    res.json({
      results: paginatedResults,
      total: results.length,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error fetching agent results:', error)
    res.status(500).json({ error: 'Failed to fetch agent results' })
  }
})

/**
 * Get aggregated performance metrics for agent results
 * Query: workspaceId (required), periodHours (optional, default 720)
 */
router.get('/agent-results/metrics', async (req, res) => {
  try {
    const workspaceIdRaw = req.query.workspaceId as string
    const periodHoursRaw = req.query.periodHours as string | undefined
    const workspaceId = parseInt(workspaceIdRaw, 10)
    const periodHours = periodHoursRaw ? Math.max(1, parseInt(periodHoursRaw, 10)) : 720

    if (!Number.isFinite(workspaceId) || workspaceId <= 0) {
      return res.status(400).json({ error: 'Invalid or missing workspaceId' })
    }

    const metrics = await getAgentMetrics(workspaceId, periodHours)
    res.json({ workspaceId, periodHours, metrics })
  } catch (error) {
    console.error('Error computing agent metrics:', error)
    res.status(500).json({ error: 'Failed to compute agent metrics' })
  }
})

/**
 * Get AI cost analytics for a workspace
 * Query: workspaceId (required), periodHours (optional, default 720)
 */
router.get('/agent-results/cost-analytics', async (req, res) => {
  try {
    const workspaceIdRaw = req.query.workspaceId as string
    const periodHoursRaw = req.query.periodHours as string | undefined
    const workspaceId = parseInt(workspaceIdRaw, 10)
    const periodHours = periodHoursRaw ? Math.max(1, parseInt(periodHoursRaw, 10)) : 720

    if (!Number.isFinite(workspaceId) || workspaceId <= 0) {
      return res.status(400).json({ error: 'Invalid or missing workspaceId' })
    }

    const costBreakdown = await fetchCostAnalytics(workspaceId, periodHours)
    res.json({ workspaceId, periodHours, costBreakdown })
  } catch (error) {
    console.error('Error fetching cost analytics:', error)
    res.status(500).json({ error: 'Failed to fetch cost analytics' })
  }
})

/**
 * Search agent task and step results
 * Query params: q (required string), workspaceId (optional), limit (optional)
 */
router.get('/agent-results/search', async (req, res) => {
  try {
    const query = (req.query.q as string) ?? ''
    const trimmed = query.trim()
    if (!trimmed) {
      return res.status(400).json({ error: 'Query parameter q is required' })
    }

    const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string, 10) || 20, 50) : 20
    const workspaceParam = req.query.workspaceId as string | undefined
    const workspaceId = workspaceParam ? parseInt(workspaceParam, 10) : undefined
    const status = (req.query.status as string | undefined)?.trim() || undefined
    const startedAfterRaw = req.query.startedAfter as string | undefined
    const startedBeforeRaw = req.query.startedBefore as string | undefined
    const minDurationRaw = req.query.minDurationMs as string | undefined

    if (workspaceId !== undefined && (!Number.isFinite(workspaceId) || workspaceId <= 0)) {
      return res.status(400).json({ error: 'Invalid workspaceId' })
    }

    const startedAfter = startedAfterRaw ? new Date(startedAfterRaw) : undefined
    const startedBefore = startedBeforeRaw ? new Date(startedBeforeRaw) : undefined
    const minDurationMs = minDurationRaw ? parseInt(minDurationRaw, 10) : undefined

    if (startedAfter && Number.isNaN(startedAfter.getTime())) {
      return res.status(400).json({ error: 'Invalid startedAfter timestamp' })
    }
    if (startedBefore && Number.isNaN(startedBefore.getTime())) {
      return res.status(400).json({ error: 'Invalid startedBefore timestamp' })
    }
    if (minDurationMs !== undefined && (!Number.isFinite(minDurationMs) || minDurationMs < 0)) {
      return res.status(400).json({ error: 'Invalid minDurationMs' })
    }

    const results = await searchAgentResults({
      query: trimmed,
      workspaceId,
      limit,
      stepLimit: 3,
      status,
      startedAfter,
      startedBefore,
      minDurationMs
    })

    res.json({ results, count: results.length })
  } catch (error) {
    console.error('Error searching agent results:', error)
    res.status(500).json({ error: 'Failed to search agent results' })
  }
})

/**
 * Get specific task result with full details
 */
router.get('/agent-results/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params

    const steps = await getAgentStepResults(taskId)

    if (steps.length === 0) {
      return res.status(404).json({ error: 'Task result not found' })
    }

    // Get task result from first step's reference
    // (In production, query agent_task_results directly)
    res.json({
      taskId,
      steps,
      stepCount: steps.length
    })
  } catch (error) {
    console.error('Error fetching task result:', error)
    res.status(500).json({ error: 'Failed to fetch task result' })
  }
})

/**
 * Get step-by-step execution details
 */
router.get('/agent-results/:taskId/steps', async (req, res) => {
  try {
    const { taskId } = req.params
    const steps = await getAgentStepResults(taskId)

    res.json({ steps })
  } catch (error) {
    console.error('Error fetching step results:', error)
    res.status(500).json({ error: 'Failed to fetch step results' })
  }
})

/**
 * Export task result (JSON or PDF)
 */
router.get('/agent-results/:taskId/export', async (req, res) => {
  try {
    const { taskId } = req.params
    const format = (req.query.format as string) || 'json'

    const steps = await getAgentStepResults(taskId)

    if (steps.length === 0) {
      return res.status(404).json({ error: 'Task result not found' })
    }

    if (format === 'json') {
      res.json({
        taskId,
        exportedAt: new Date().toISOString(),
        steps
      })
    } else if (format === 'pdf') {
      const task = await getAgentTaskResultByTaskId(taskId)
      if (!task) {
        return res.status(404).json({ error: 'Task summary not found for PDF export' })
      }
      const { generateTaskPDF } = await import('../../lib/reports/pdf-generator')
      const pdfBuffer = await generateTaskPDF(task, steps)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="agent-result-${taskId}.pdf"`)
      return res.send(pdfBuffer)
    } else {
      res.status(400).json({ error: 'Invalid format. Use json or pdf' })
    }
  } catch (error) {
    console.error('Error exporting result:', error)
    res.status(500).json({ error: 'Failed to export result' })
  }
})

/**
 * Delete old result
 */
router.delete('/agent-results/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params

    const { connectionPool } = await import('../../lib/db/connection-pool')

    if (!connectionPool) {
      return res.status(503).json({ error: 'Database not available' })
    }

    // Delete task result (cascade will delete steps)
    await connectionPool.query('DELETE FROM agent_task_results WHERE task_id = $1', [taskId])

    res.json({ message: 'Result deleted', taskId })
  } catch (error) {
    console.error('Error deleting result:', error)
    res.status(500).json({ error: 'Failed to delete result' })
  }
})

export default router
