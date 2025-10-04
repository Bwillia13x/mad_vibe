import { db } from '../db'
import { aiAuditLogs } from '../db/schema'
import { and, eq, gte } from 'drizzle-orm'

export interface CostBreakdown {
  totalCostMicroUsd: number
  totalTokens: number
  totalRequests: number
  byModel: Record<
    string,
    {
      requests: number
      tokens: number
      costMicroUsd: number
      avgLatencyMs: number
    }
  >
  last24h: {
    costMicroUsd: number
    requests: number
  }
  last7d: {
    costMicroUsd: number
    requests: number
  }
  last30d: {
    costMicroUsd: number
    requests: number
  }
}

/**
 * Fetch AI cost analytics for a workspace
 */
export async function fetchCostAnalytics(
  workspaceId: number,
  periodHours = 720
): Promise<CostBreakdown> {
  const cutoff = new Date(Date.now() - periodHours * 60 * 60 * 1000)

  const rows = await db
    .select({
      model: aiAuditLogs.model,
      tokensTotal: aiAuditLogs.tokensTotal,
      estimatedCostUsd: aiAuditLogs.estimatedCostUsd,
      latencyMs: aiAuditLogs.latencyMs,
      createdAt: aiAuditLogs.createdAt
    })
    .from(aiAuditLogs)
    .where(and(eq(aiAuditLogs.workflowId, workspaceId), gte(aiAuditLogs.createdAt, cutoff)))

  const byModel: Record<
    string,
    { requests: number; tokens: number; costMicroUsd: number; avgLatencyMs: number }
  > = {}
  let totalCostMicroUsd = 0
  let totalTokens = 0
  const totalRequests = rows.length

  const now = Date.now()
  const last24hCutoff = now - 24 * 60 * 60 * 1000
  const last7dCutoff = now - 7 * 24 * 60 * 60 * 1000
  const last30dCutoff = now - 30 * 24 * 60 * 60 * 1000

  let cost24h = 0
  let count24h = 0
  let cost7d = 0
  let count7d = 0
  let cost30d = 0
  let count30d = 0

  for (const row of rows) {
    const model = row.model || 'unknown'
    const tokens = row.tokensTotal || 0
    const cost = row.estimatedCostUsd || 0
    const latency = row.latencyMs || 0
    const timestamp = new Date(row.createdAt).getTime()

    totalCostMicroUsd += cost
    totalTokens += tokens

    if (!byModel[model]) {
      byModel[model] = { requests: 0, tokens: 0, costMicroUsd: 0, avgLatencyMs: 0 }
    }
    byModel[model].requests += 1
    byModel[model].tokens += tokens
    byModel[model].costMicroUsd += cost
    byModel[model].avgLatencyMs += latency

    if (timestamp >= last24hCutoff) {
      cost24h += cost
      count24h += 1
    }
    if (timestamp >= last7dCutoff) {
      cost7d += cost
      count7d += 1
    }
    if (timestamp >= last30dCutoff) {
      cost30d += cost
      count30d += 1
    }
  }

  // Calculate average latency per model
  for (const model of Object.keys(byModel)) {
    if (byModel[model].requests > 0) {
      byModel[model].avgLatencyMs = Math.round(
        byModel[model].avgLatencyMs / byModel[model].requests
      )
    }
  }

  return {
    totalCostMicroUsd,
    totalTokens,
    totalRequests,
    byModel,
    last24h: { costMicroUsd: cost24h, requests: count24h },
    last7d: { costMicroUsd: cost7d, requests: count7d },
    last30d: { costMicroUsd: cost30d, requests: count30d }
  }
}
