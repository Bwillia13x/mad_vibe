import { Router } from 'express'
import { optionalAuth, type AuthenticatedRequest } from '../middleware/auth'
import { agentOrchestrator, type AgentTaskType } from '../../lib/agents/orchestrator'

const router = Router()
router.use(optionalAuth)

/**
 * Log structured telemetry events
 */
function logTelemetry(event: string, data: Record<string, unknown>) {
  console.log(
    JSON.stringify({ event: `agent:${event}`, ...data, timestamp: new Date().toISOString() })
  )
}

/**
 * Create new agent task
 */
router.post('/agents/tasks', async (req, res) => {
  try {
    const { workspaceId, type, params } = req.body

    if (!workspaceId || !type) {
      return res.status(400).json({
        error: 'workspaceId and type are required'
      })
    }

    const task = await agentOrchestrator.createTask(
      workspaceId,
      type as AgentTaskType,
      params || {}
    )

    logTelemetry('task_created', { taskId: task.id, workspaceId, type })

    res.status(201).json(task)
  } catch (error) {
    console.error('Failed to create agent task:', error)
    res.status(500).json({ error: 'Failed to create task' })
  }
})

/**
 * Get task by ID
 */
router.get('/agents/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params
    const task = agentOrchestrator.getTask(taskId)

    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    res.json(task)
  } catch (error) {
    console.error('Failed to get task:', error)
    res.status(500).json({ error: 'Failed to get task' })
  }
})

/**
 * Get all tasks for workspace
 */
router.get('/agents/workspaces/:workspaceId/tasks', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10)
    const tasks = agentOrchestrator.getWorkspaceTasks(workspaceId)

    res.json({ tasks, count: tasks.length })
  } catch (error) {
    console.error('Failed to get workspace tasks:', error)
    res.status(500).json({ error: 'Failed to get tasks' })
  }
})

/**
 * Start task execution
 */
router.post('/agents/tasks/:taskId/start', async (req: AuthenticatedRequest, res) => {
  try {
    const { taskId } = req.params

    logTelemetry('task_start_requested', { taskId, actor: req.user?.id || 'anonymous' })

    // Start task in background
    agentOrchestrator.startTask(taskId).catch((error) => {
      console.error(`Task ${taskId} failed:`, error)
      logTelemetry('task_failed', { taskId, error: error.message })
    })

    res.json({ message: 'Task started', taskId })
  } catch (error) {
    console.error('Failed to start task:', error)
    res.status(500).json({ error: 'Failed to start task' })
  }
})

/**
 * Pause task execution
 */
router.post('/agents/tasks/:taskId/pause', async (req: AuthenticatedRequest, res) => {
  try {
    const { taskId } = req.params
    agentOrchestrator.pauseTask(taskId)

    logTelemetry('task_paused', { taskId, actor: req.user?.id || 'anonymous', reason: 'manual' })

    res.json({ message: 'Task paused', taskId })
  } catch (error) {
    console.error('Failed to pause task:', error)
    res.status(500).json({ error: 'Failed to pause task' })
  }
})

/**
 * Cancel task
 */
router.post('/agents/tasks/:taskId/cancel', async (req, res) => {
  try {
    const { taskId } = req.params
    agentOrchestrator.cancelTask(taskId)

    res.json({ message: 'Task cancelled', taskId })
  } catch (error) {
    console.error('Failed to cancel task:', error)
    res.status(500).json({ error: 'Failed to cancel task' })
  }
})

/**
 * Get task telemetry
 */
router.get('/agents/tasks/:taskId/telemetry', async (req, res) => {
  try {
    const { taskId } = req.params
    const task = agentOrchestrator.getTask(taskId)

    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    // Build telemetry summary
    const telemetry = {
      taskId: task.id,
      status: task.status,
      taskDurationMs: task.telemetry.taskDurationMs,
      lastHeartbeat: task.telemetry.lastHeartbeat,
      errorTags: task.telemetry.errorTags,
      stepMetrics: task.steps.map((step) => ({
        stepId: step.id,
        name: step.name,
        status: step.status,
        durationMs: step.durationMs,
        retryCount: step.retryCount,
        errorMessage: step.error
      })),
      totalRetries: Object.values(task.telemetry.stepRetries).reduce(
        (sum, count) => sum + count,
        0
      ),
      failedSteps: task.steps.filter((s) => s.status === 'failed').length
    }

    res.json(telemetry)
  } catch (error) {
    console.error('Failed to get telemetry:', error)
    res.status(500).json({ error: 'Failed to get telemetry' })
  }
})

/**
 * WebSocket-style updates endpoint (Server-Sent Events)
 */
router.get('/agents/tasks/:taskId/stream', async (req, res) => {
  const { taskId } = req.params

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  // Send initial task state
  const task = agentOrchestrator.getTask(taskId)
  if (task) {
    res.write(`data: ${JSON.stringify({ type: 'task:state', task })}\n\n`)
  }

  // Listen for task updates
  type TaskEvent = { id: string; [key: string]: unknown }
  type StepEvent = { task: TaskEvent; step: Record<string, unknown> }

  const handlers = {
    'task:started': (t: TaskEvent) => {
      if (t.id === taskId) {
        res.write(`data: ${JSON.stringify({ type: 'task:started', task: t })}\n\n`)
      }
    },
    'step:started': ({ task: t, step }: StepEvent) => {
      if (t.id === taskId) {
        res.write(`data: ${JSON.stringify({ type: 'step:started', step })}\n\n`)
      }
    },
    'step:completed': ({ task: t, step }: StepEvent) => {
      if (t.id === taskId) {
        res.write(`data: ${JSON.stringify({ type: 'step:completed', step })}\n\n`)
      }
    },
    'task:completed': (t: TaskEvent) => {
      if (t.id === taskId) {
        res.write(`data: ${JSON.stringify({ type: 'task:completed', task: t })}\n\n`)
        res.end()
      }
    },
    'task:failed': (t: TaskEvent) => {
      if (t.id === taskId) {
        res.write(`data: ${JSON.stringify({ type: 'task:failed', task: t })}\n\n`)
        res.end()
      }
    },
    'task:paused': (t: TaskEvent) => {
      if (t.id === taskId) {
        res.write(
          `data: ${JSON.stringify({ type: 'task:paused', task: t, audit: { timestamp: new Date().toISOString(), action: 'pause' } })}\n\n`
        )
      }
    }
  }

  // Register listeners
  Object.entries(handlers).forEach(([event, handler]) => {
    agentOrchestrator.on(event, handler)
  })

  // Cleanup on client disconnect
  req.on('close', () => {
    Object.entries(handlers).forEach(([event, handler]) => {
      agentOrchestrator.off(event, handler)
    })
  })
})

export default router
