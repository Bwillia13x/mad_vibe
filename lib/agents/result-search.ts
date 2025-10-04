export interface AgentSearchParams {
  query: string
  workspaceId?: number
  limit?: number
  stepLimit?: number
  status?: string
  startedAfter?: Date
  startedBefore?: Date
  minDurationMs?: number
}

export interface AgentSearchStepHit {
  stepId: string
  action: string
  status: string
  rank: number
  snippet: string
}

export interface AgentSearchResult {
  taskId: string
  workspaceId: number
  taskType: string
  taskDescription: string | null
  status: string
  startedAt: Date
  completedAt: Date | null
  rank: number
  snippet: string
  steps: AgentSearchStepHit[]
}

export async function searchAgentResults(params: AgentSearchParams): Promise<AgentSearchResult[]> {
  const {
    query,
    workspaceId,
    limit = 20,
    stepLimit = 3,
    status,
    startedAfter,
    startedBefore,
    minDurationMs
  } = params
  const trimmed = query.trim()
  if (!trimmed) return []

  const { connectionPool } = await import('../db/connection-pool')
  if (!connectionPool) return []

  const taskRows = await connectionPool.query<{
    task_id: string
    workspace_id: number
    task_type: string
    task_description: string | null
    status: string
    started_at: Date
    completed_at: Date | null
    rank: number
    snippet: string
  }>(
    `WITH
      q AS (SELECT plainto_tsquery('english', $1) AS query)
     SELECT
       atr.task_id,
       atr.workspace_id,
       atr.task_type,
       atr.task_description,
       atr.status,
       atr.started_at,
       atr.completed_at,
       ts_rank(atr.search_vector, q.query) AS rank,
       ts_headline('english', coalesce(atr.task_description, ''), q.query,
         'StartSel=<mark> StopSel=</mark>') AS snippet
     FROM agent_task_results atr, q
     WHERE atr.search_vector @@ q.query
       AND ($2::int IS NULL OR atr.workspace_id = $2::int)
       AND ($4::text IS NULL OR atr.status = $4::text)
       AND ($5::timestamptz IS NULL OR atr.started_at >= $5::timestamptz)
       AND ($6::timestamptz IS NULL OR atr.started_at <= $6::timestamptz)
       AND ($7::int IS NULL OR atr.duration_ms >= $7::int)
     ORDER BY rank DESC, atr.created_at DESC
     LIMIT $3`,
    [
      trimmed,
      workspaceId ?? null,
      limit,
      status ?? null,
      startedAfter ?? null,
      startedBefore ?? null,
      minDurationMs ?? null
    ]
  )

  if (taskRows.rowCount === 0) {
    return []
  }

  const taskIds = taskRows.rows.map((row) => row.task_id)

  const stepRows = await connectionPool.query<{
    task_id: string
    step_id: string
    action: string
    status: string
    rank: number
    snippet: string
  }>(
    `WITH q AS (SELECT plainto_tsquery('english', $1) AS query),
    ranked AS (
      SELECT
        atr.task_id,
        asr.step_id,
        asr.action,
        asr.status,
        ts_rank(asr.search_vector, q.query) AS rank,
        ts_headline('english', coalesce(asr.step_description, ''), q.query,
          'StartSel=<mark> StopSel=</mark>') AS snippet,
        ROW_NUMBER() OVER (PARTITION BY atr.task_id ORDER BY ts_rank(asr.search_vector, q.query) DESC, asr.id ASC) AS rn
      FROM agent_step_results asr
      JOIN agent_task_results atr ON atr.id = asr.task_result_id
      , q
      WHERE atr.task_id = ANY($2::text[])
        AND asr.search_vector @@ q.query
        AND ($4::text IS NULL OR atr.status = $4::text)
        AND ($5::timestamptz IS NULL OR atr.started_at >= $5::timestamptz)
        AND ($6::timestamptz IS NULL OR atr.started_at <= $6::timestamptz)
        AND ($7::int IS NULL OR atr.duration_ms >= $7::int)
    )
    SELECT task_id, step_id, action, status, rank, snippet
    FROM ranked
    WHERE rn <= $3`,
    [
      trimmed,
      taskIds,
      stepLimit,
      status ?? null,
      startedAfter ?? null,
      startedBefore ?? null,
      minDurationMs ?? null
    ]
  )

  const stepsByTask = new Map<string, AgentSearchStepHit[]>()
  for (const row of stepRows.rows) {
    const arr = stepsByTask.get(row.task_id) ?? []
    arr.push({
      stepId: row.step_id,
      action: row.action,
      status: row.status,
      rank: row.rank,
      snippet: row.snippet
    })
    stepsByTask.set(row.task_id, arr)
  }

  return taskRows.rows.map((row) => ({
    taskId: row.task_id,
    workspaceId: row.workspace_id,
    taskType: row.task_type,
    taskDescription: row.task_description,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    rank: row.rank,
    snippet: row.snippet,
    steps: stepsByTask.get(row.task_id) ?? []
  }))
}
