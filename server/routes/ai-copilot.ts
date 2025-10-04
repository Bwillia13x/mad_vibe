import { Router } from 'express'
import { generateBusinessResponse, type BusinessChatMessage } from '../lib/openai'
import { optionalAuth, type AuthenticatedRequest } from '../middleware/auth'
import { db } from '../../lib/db'
import { aiAuditLogs, workflows, workflowArtifacts } from '../../lib/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { sessionPresenceService, type HeartbeatResult } from '../../lib/agents/session-presence'

type CapabilityRow = {
  capability: string | null
  count: unknown
}

type DailyRow = {
  date: string
  count: unknown
}

type AuditSummary = {
  totalInteractions: number
  uniqueWorkspaces: number
  lastInteractionAt: string | null
  capabilityBreakdown: Record<string, number>
  dailyCounts: Array<{ date: string; count: number }>
}

const resolveSessionId = (rawHeader: unknown): string | null => {
  if (Array.isArray(rawHeader)) {
    return resolveSessionId(rawHeader[0])
  }
  if (typeof rawHeader === 'string') {
    const trimmed = rawHeader.trim()
    if (trimmed.length > 0) {
      return trimmed
    }
  }
  return null
}

const resolveActorId = (headerValue: unknown, fallback: string): string => {
  if (Array.isArray(headerValue)) {
    return resolveActorId(headerValue[0], fallback)
  }
  if (typeof headerValue === 'string') {
    const trimmed = headerValue.trim()
    if (trimmed.length > 0) {
      return trimmed
    }
  }
  return fallback
}

async function aggregateAuditSummary(): Promise<AuditSummary | null> {
  if (!db) return null

  const [totals] = await db
    .select({
      total: sql`COUNT(*)`,
      uniqueWorkspaces: sql`COUNT(DISTINCT ${aiAuditLogs.workflowId})`,
      lastCreatedAt: sql`MAX(${aiAuditLogs.createdAt})`
    })
    .from(aiAuditLogs)

  const capabilityRows = (await db
    .select({ capability: aiAuditLogs.capability, count: sql`COUNT(*)` })
    .from(aiAuditLogs)
    .groupBy(aiAuditLogs.capability)
    .orderBy(desc(sql`COUNT(*)`))) as CapabilityRow[]

  const dailyRows = (await db
    .select({
      date: sql`DATE(${aiAuditLogs.createdAt})`,
      count: sql`COUNT(*)`
    })
    .from(aiAuditLogs)
    .groupBy(sql`DATE(${aiAuditLogs.createdAt})`)
    .orderBy(desc(sql`DATE(${aiAuditLogs.createdAt})`))
    .limit(14)) as DailyRow[]

  return {
    totalInteractions: totals ? Number(totals.total) : 0,
    uniqueWorkspaces: totals ? Number(totals.uniqueWorkspaces) : 0,
    lastInteractionAt: totals?.lastCreatedAt ? String(totals.lastCreatedAt) : null,
    capabilityBreakdown: capabilityRows.reduce<Record<string, number>>((acc, row) => {
      const key = row.capability ?? 'unknown'
      acc[key] = (acc[key] ?? 0) + Number(row.count)
      return acc
    }, {}),
    dailyCounts: dailyRows
      .map((row) => ({ date: String(row.date), count: Number(row.count) }))
      .reverse()
  }
}

const router = Router()

// Apply optional auth
router.use(optionalAuth)

const toObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

async function recordAuditLog(params: {
  workflowId?: number
  capability?: string
  prompt: string
  messages: BusinessChatMessage[]
  context: Record<string, unknown>
  response: unknown
  contextUsed: {
    hasHistory: boolean
    workspaceEnriched: boolean
  }
  latencyMs: number
}) {
  const { workflowId, capability, prompt, messages, context, response, contextUsed, latencyMs } = params

  if (!db || typeof workflowId !== 'number' || Number.isNaN(workflowId)) {
    return
  }

  try {
    await db.insert(aiAuditLogs).values({
      workflowId,
      capability,
      prompt: {
        input: prompt,
        messages,
        context
      },
      response: {
        output: response,
        durationMs: latencyMs
      },
      verification: {
        contextUsed
      }
    })
  } catch (error) {
    console.error('Failed to record AI audit log:', error)
  }
}

/**
 * Enhanced AI Copilot endpoint - supports conversation history, workspace context, code generation
 */
router.post('/copilot', async (req: AuthenticatedRequest, res) => {
  try {
    const { prompt, context, capability, conversationHistory, workspaceId } = req.body

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: 'Prompt is required',
        code: 'INVALID_PROMPT'
      })
    }

    const baseContext = toObject(context)
    const rawBody = toObject(req.body)

    const sessionId = resolveSessionId(req.headers['x-session-key'])
    const actorId = sessionId ? resolveActorId(req.headers['x-actor-id'], sessionId) : null
    const contextStageSlug = baseContext['stageSlug']
    const bodyStageSlug = rawBody['stageSlug']
    const stageSlugFromContext =
      typeof contextStageSlug === 'string' ? contextStageSlug.trim() : undefined
    const stageSlugFromBody =
      typeof bodyStageSlug === 'string' ? bodyStageSlug.trim() : undefined
    const stageSlug = stageSlugFromContext ?? stageSlugFromBody
    const contextVersion = baseContext['version']
    const revisionFromContext =
      typeof contextVersion === 'number' && Number.isFinite(contextVersion)
        ? (contextVersion as number)
        : undefined
    const lockStageContext = baseContext['lockStage']
    const lockRequestContext = baseContext['lockRequest']
    const lockRequestFlag = Boolean(
      rawBody['lockStage'] === true ||
        rawBody['lockRequest'] === true ||
        lockStageContext === true ||
        lockRequestContext === true
    )

    let presenceState: HeartbeatResult | null = null
    if (sessionId && stageSlug) {
      presenceState = sessionPresenceService.heartbeat({
        stageSlug,
        sessionId,
        actorId: actorId ?? sessionId,
        revision: revisionFromContext,
        lockRequest: lockRequestFlag
      })

      if (presenceState.conflict && presenceState.conflict.type === 'lock_denied') {
        return res.status(409).json({
          error: 'Stage currently locked by another collaborator',
          code: 'STAGE_LOCKED',
          conflict: presenceState.conflict,
          lockOwner: presenceState.lockOwner,
          lockExpiresAt: presenceState.lockExpiresAt
        })
      }
    }

    // Load additional workspace context if workspaceId provided
    let enrichedContext = baseContext
    if (typeof workspaceId === 'number' && !Number.isNaN(workspaceId)) {
      enrichedContext = await enrichWorkspaceContext(workspaceId, baseContext)
    }

    // Build enhanced system message
    const systemContext = buildEnhancedSystemContext(enrichedContext, capability)

    // Build message array with conversation history
    const messages: BusinessChatMessage[] = []

    // Add recent conversation history (last 10 messages for context)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-10)
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content
          })
        }
      }
    }

    // Add current prompt
    messages.push({
      role: 'user',
      content: prompt
    })

    const start = Date.now()

    const response = await generateBusinessResponse(messages, undefined, {
      systemPromptOverride: systemContext
    })

    const latencyMs = Date.now() - start

    await recordAuditLog({
      workflowId:
        typeof workspaceId === 'number' && !Number.isNaN(workspaceId) ? workspaceId : undefined,
      capability: typeof capability === 'string' ? capability : undefined,
      prompt,
      messages,
      context: enrichedContext,
      response,
      contextUsed: {
        hasHistory: messages.length > 1,
        workspaceEnriched: typeof workspaceId === 'number' && !Number.isNaN(workspaceId)
      },
      latencyMs
    })

    res.json({
      response,
      capability,
      timestamp: new Date().toISOString(),
      contextUsed: {
        hasHistory: messages.length > 1,
        workspaceEnriched: !!workspaceId
      },
      presence:
        presenceState
          ? {
              peers: presenceState.peers.map((peer) => ({
                actorId: peer.actorId,
                stageSlug: peer.stageSlug,
                updatedAt: peer.updatedAt,
                revision: peer.revision,
                locked: peer.locked,
                sessionId: peer.sessionId
              })),
              lockOwner: presenceState.lockOwner,
              lockExpiresAt: presenceState.lockExpiresAt,
              conflict: presenceState.conflict
            }
          : undefined
    })
  } catch (error) {
    console.error('AI Copilot error:', error)
    res.status(500).json({
      error: 'Failed to process AI request',
      code: 'AI_COPILOT_ERROR'
    })
  }
})

router.get('/copilot/audit/summary', async (_req, res) => {
  try {
    const summary = await aggregateAuditSummary()
    if (!summary) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    res.json(summary)
  } catch (error) {
    console.error('Failed to compute AI audit summary:', error)
    res.status(500).json({ error: 'Failed to compute audit summary' })
  }
})

/**
 * Enrich context with workspace data
 */
async function enrichWorkspaceContext(
  workspaceId: number,
  baseContext: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    // Get workspace details
    const [workspace] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workspaceId))
      .limit(1)

    if (!workspace) return baseContext

    // Get recent artifacts
    const artifacts = await db
      .select()
      .from(workflowArtifacts)
      .where(eq(workflowArtifacts.workflowId, workspaceId))
      .orderBy(desc(workflowArtifacts.updatedAt))
      .limit(5)

    return {
      ...baseContext,
      workspace: {
        name: workspace.name,
        ticker: workspace.ticker,
        companyName: workspace.companyName,
        description: workspace.description,
        stageCompletions: workspace.stageCompletions,
        lastActiveStage: workspace.lastActiveStage
      },
      artifacts: artifacts.map((a: { type: string; name: string; stageSlug: string }) => ({
        type: a.type,
        name: a.name,
        stage: a.stageSlug
      }))
    }
  } catch (err) {
    console.error('Failed to enrich workspace context:', err)
    return baseContext
  }
}

/**
 * Build enhanced context-aware system message with workspace intelligence
 */
function buildEnhancedSystemContext(
  context: Record<string, unknown> | undefined,
  capability: string | undefined
): string {
  const baseContext =
    'You are an advanced AI copilot embedded in MAD Vibe, a professional value-investing IDE. ' +
    'You have deep expertise in:\n' +
    '- Financial statement analysis and owner earnings calculation\n' +
    '- DCF modeling, EPV analysis, and comparable company valuation\n' +
    '- Investment memo writing and thesis articulation\n' +
    '- Risk analysis and scenario planning\n' +
    '- Excel formula generation and financial modeling\n\n' +
    'Your responses should be:\n' +
    '- Concise and actionable\n' +
    '- Grounded in fundamental analysis and downside protection\n' +
    "- Specific to the analyst's current context\n" +
    '- Include code/formulas when relevant\n' +
    '- Professional but collaborative'

  if (!context) return baseContext

  const {
    stageSlug,
    stageTitle,
    activeTab,
    currentData,
    workspace,
    artifacts,
    workspaceName,
    ticker
  } = context as {
    stageSlug?: string
    stageTitle?: string
    activeTab?: string
    currentData?: Record<string, unknown>
    workspace?: Record<string, unknown>
    artifacts?: Array<{ type: string; name: string; stage: string }>
    workspaceName?: string
    ticker?: string
  }

  let fullContext = baseContext

  // Add workspace context
  if (workspace || workspaceName) {
    const wsName =
      ((workspace as Record<string, unknown>)?.name as string) ||
      workspaceName ||
      'Current Investment'
    const wsTicker = ((workspace as Record<string, unknown>)?.ticker as string) || ticker
    fullContext += `\n\n**Current Investment Idea**: ${wsName}`
    if (wsTicker) {
      fullContext += ` (${wsTicker})`
    }
    const wsDescription = (workspace as Record<string, unknown>)?.description as string
    if (wsDescription) {
      fullContext += `\n**Thesis**: ${wsDescription}`
    }
  }

  // Add artifacts context
  if (artifacts && artifacts.length > 0) {
    fullContext += `\n\n**Available Artifacts**: ${artifacts.length} items created:\n`
    artifacts.slice(0, 5).forEach((a: { type: string; name: string; stage: string }) => {
      fullContext += `- ${a.name} (${a.type})\n`
    })
  }

  const contextualInstructions: Record<string, string> = {
    screener: `The analyst is screening companies. You can:
- Suggest screening criteria and filters
- Generate SQL-like queries for screeners
- Explain why companies pass/fail filters
- Recommend comparative analysis approaches`,

    financials: `The analyst is analyzing financials. You can:
- Generate Excel formulas for owner earnings bridges
- Identify normalization adjustments needed
- Calculate financial metrics (ROIC, FCF yield)
- Flag accounting red flags`,

    valuation: `The analyst is building valuation models. You can:
- Generate DCF model formulas
- Suggest WACC components and calculation
- Provide comparable company multiples
- Calculate terminal values
- Example: =NPV(WACC, FCF1:FCF10) + TerminalValue/(1+WACC)^10`,

    scenarios: `The analyst is doing scenario analysis. You can:
- Generate Monte Carlo simulation logic
- Suggest sensitivity drivers to test
- Calculate scenario probabilities
- Identify tail risks`,

    memo: `The analyst is writing an investment memo. You can:
- Generate memo section outlines
- Draft thesis statements
- Suggest supporting evidence
- Improve narrative structure`,

    'red-team': `The analyst is red-teaming. You should:
- Challenge every assumption aggressively
- Identify confirmation bias
- Propose contrarian scenarios
- Find weaknesses in the thesis`
  }

  const stageInstructions = stageSlug ? contextualInstructions[stageSlug] : ''

  if (stageInstructions) {
    fullContext += `\n\n**Current Stage**: ${stageTitle || stageSlug}\n${stageInstructions}`
  }

  if (activeTab) {
    fullContext += `\n\n**Active Tab**: ${activeTab}`
  }

  if (capability) {
    const capabilityInstructions: Record<string, string> = {
      summarize: 'Provide a clear, structured summary.',
      analyze: 'Conduct thorough analysis with specific observations.',
      validate: 'Check for accuracy, completeness, and reasonableness.',
      suggest: 'Offer concrete, actionable recommendations.',
      explain: 'Break down complex concepts clearly.',
      compare: 'Highlight similarities, differences, and relative strengths.',
      forecast: 'Project outcomes with clear assumptions.',
      critique: 'Challenge assumptions and identify weaknesses.',
      generate: 'Generate working code, formulas, or templates. Be specific and complete.',
      calculate: 'Perform calculations and show your work step-by-step.'
    }

    const capInstruction = capabilityInstructions[capability]
    if (capInstruction) {
      fullContext += `\n\n**Task Type**: ${capability}\n${capInstruction}`
    }
  }

  if (currentData && Object.keys(currentData).length > 0) {
    fullContext += `\n\n**Available Data**: ${JSON.stringify(currentData, null, 2).substring(0, 500)}`
  }

  return fullContext
}

export default router
