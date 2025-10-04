// dynamic import of connectionPool happens inside the function

export interface AgentPerformanceMetrics {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  successRate: number

  averageDurationMs: number
  p50DurationMs: number
  p95DurationMs: number
  p99DurationMs: number

  stepSuccessRates: Record<string, { success: number; total: number; rate: number }>
  slowestSteps: Array<{ action: string; avgDurationMs: number }>
  errorsByType: Record<string, number>
  mostFailedSteps: Array<{ action: string; failureCount: number }>

  tasksLast24h: number
  tasksLast7d: number
  tasksLast30d: number
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)))
  return sorted[idx]
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
}

export async function getAgentMetrics(
  workspaceId: number,
  periodHours: number = 720
): Promise<AgentPerformanceMetrics> {
  const { connectionPool } = await import('../db/connection-pool')
  if (!connectionPool) {
    // database not available (demo/test mode)
    return {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      successRate: 0,
      averageDurationMs: 0,
      p50DurationMs: 0,
      p95DurationMs: 0,
      p99DurationMs: 0,
      stepSuccessRates: {},
      slowestSteps: [],
      errorsByType: {},
      mostFailedSteps: [],
      tasksLast24h: 0,
      tasksLast7d: 0,
      tasksLast30d: 0
    }
  }
  const since = new Date(Date.now() - periodHours * 60 * 60 * 1000)

  // Fetch tasks in period
  const taskRes = await connectionPool.query(
    `SELECT status, duration_ms, created_at
     FROM agent_task_results
     WHERE workspace_id = $1 AND created_at >= $2`,
    [workspaceId, since]
  )

  // Fetch steps in period
  const stepRes = await connectionPool.query(
    `SELECT asr.action, asr.status, asr.duration_ms, asr.error
     FROM agent_step_results asr
     JOIN agent_task_results atr ON asr.task_result_id = atr.id
     WHERE atr.workspace_id = $1 AND atr.created_at >= $2`,
    [workspaceId, since]
  )

  const tasks = taskRes.rows as Array<{
    status: string
    duration_ms: number | null
    created_at: string
  }>
  const steps = stepRes.rows as Array<{
    action: string
    status: string
    duration_ms: number | null
    error: string | null
  }>

  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === 'completed').length
  const failedTasks = tasks.filter((t) => t.status === 'failed').length
  const successRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  const durations = tasks.map((t) => t.duration_ms ?? 0).filter((n) => n > 0)
  const averageDurationMs = average(durations)
  const p50DurationMs = percentile(durations, 50)
  const p95DurationMs = percentile(durations, 95)
  const p99DurationMs = percentile(durations, 99)

  // Step success rates and slowest steps
  const stepTotals = new Map<
    string,
    { total: number; success: number; sumMs: number; countMs: number }
  >()
  for (const s of steps) {
    const key = s.action || 'unknown'
    const prev = stepTotals.get(key) ?? { total: 0, success: 0, sumMs: 0, countMs: 0 }
    prev.total += 1
    if (s.status === 'completed') prev.success += 1
    if (s.duration_ms && s.duration_ms > 0) {
      prev.sumMs += s.duration_ms
      prev.countMs += 1
    }
    stepTotals.set(key, prev)
  }

  const stepSuccessRates: Record<string, { success: number; total: number; rate: number }> = {}
  const slowestSteps: Array<{ action: string; avgDurationMs: number }> = []

  for (const [action, v] of stepTotals.entries()) {
    const rate = v.total > 0 ? (v.success / v.total) * 100 : 0
    stepSuccessRates[action] = { success: v.success, total: v.total, rate }
    const avg = v.countMs > 0 ? Math.round(v.sumMs / v.countMs) : 0
    slowestSteps.push({ action, avgDurationMs: avg })
  }
  slowestSteps.sort((a, b) => b.avgDurationMs - a.avgDurationMs)

  // Errors by type and most failed steps
  const errorsByType: Record<string, number> = {}
  const failedByAction = new Map<string, number>()
  for (const s of steps) {
    if (s.status === 'failed') {
      const action = s.action || 'unknown'
      failedByAction.set(action, (failedByAction.get(action) ?? 0) + 1)
      const key = s.error && s.error.trim() ? s.error.split(':')[0].slice(0, 120) : 'Unknown'
      errorsByType[key] = (errorsByType[key] ?? 0) + 1
    }
  }
  const mostFailedSteps = Array.from(failedByAction.entries())
    .map(([action, failureCount]) => ({ action, failureCount }))
    .sort((a, b) => b.failureCount - a.failureCount)

  // Task counts recent windows
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const tasksLast24h = tasks.filter((t) => new Date(t.created_at).getTime() >= now - dayMs).length
  const tasksLast7d = tasks.filter(
    (t) => new Date(t.created_at).getTime() >= now - 7 * dayMs
  ).length
  const tasksLast30d = tasks.filter(
    (t) => new Date(t.created_at).getTime() >= now - 30 * dayMs
  ).length

  return {
    totalTasks,
    completedTasks,
    failedTasks,
    successRate,
    averageDurationMs,
    p50DurationMs,
    p95DurationMs,
    p99DurationMs,
    stepSuccessRates,
    slowestSteps: slowestSteps.slice(0, 8),
    errorsByType,
    mostFailedSteps: mostFailedSteps.slice(0, 8),
    tasksLast24h,
    tasksLast7d,
    tasksLast30d
  }
}
