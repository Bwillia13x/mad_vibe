import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../../lib/db'
import {
  workflowMemoStates,
  workflowNormalizationStates,
  workflowValuationStates,
  workflowMonitoringStates
} from '../../lib/db/schema'
import { log } from '../../lib/log'
import { optionalAuth } from '../middleware/auth'

type SessionTable =
  | typeof workflowMemoStates
  | typeof workflowNormalizationStates
  | typeof workflowValuationStates
  | typeof workflowMonitoringStates

type LimitBuilder = {
  limit?: (count: number) => Promise<unknown[]> | unknown[]
}

type WhereBuilder = {
  where?: (predicate: unknown) => LimitBuilder
}

type SelectBuilder = {
  from?: (table: SessionTable) => WhereBuilder
}

type ReturningBuilder = {
  returning?: () => Promise<unknown[]> | unknown[]
}

type ValuesBuilder = ReturningBuilder & {
  onConflictDoUpdate?: (config: Record<string, unknown>) => ReturningBuilder
}

type InsertBuilder = {
  values?: (value: Record<string, unknown>) => ValuesBuilder
}

type QueryAdapter = {
  findFirst?: (config: { where: unknown }) => Promise<unknown>
}

type DatabaseClient = {
  select: (...args: unknown[]) => SelectBuilder
  insert: (table: SessionTable) => InsertBuilder
  query?: {
    workflowMemoStates?: QueryAdapter
    workflowNormalizationStates?: QueryAdapter
    workflowValuationStates?: QueryAdapter
    workflowMonitoringStates?: QueryAdapter
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

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

const buildTimestamp = (value: unknown): Date => {
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

const extractStateRow = (row: unknown) => (isRecord(row) ? row : undefined)

const getQueryAdapter = (database: DatabaseClient, table: SessionTable): QueryAdapter | undefined => {
  if (table === workflowMemoStates) return database.query?.workflowMemoStates
  if (table === workflowNormalizationStates) return database.query?.workflowNormalizationStates
  if (table === workflowValuationStates) return database.query?.workflowValuationStates
  if (table === workflowMonitoringStates) return database.query?.workflowMonitoringStates
  return undefined
}

async function loadSessionState(
  database: DatabaseClient,
  table: SessionTable,
  sessionId: string
): Promise<Record<string, unknown> | undefined> {
  const queryAdapter = getQueryAdapter(database, table)
  if (queryAdapter?.findFirst) {
    const queryResult = await queryAdapter.findFirst({ where: eq(table.sessionId, sessionId) })
    const found = extractStateRow(queryResult)
    if (found) return found
  }

  const selectBuilder = database.select()
  if (!selectBuilder?.from) return undefined

  const fromBuilder = selectBuilder.from(table)
  if (!fromBuilder?.where) return undefined

  const whereBuilder = fromBuilder.where(eq(table.sessionId, sessionId))
  if (!whereBuilder?.limit) return undefined

  const rows = await whereBuilder.limit(1)
  if (Array.isArray(rows) && rows.length > 0) {
    return extractStateRow(rows[0])
  }
  return undefined
}

async function upsertSessionState(
  database: DatabaseClient,
  table: SessionTable,
  sessionId: string,
  state: Record<string, unknown>,
  currentVersion: number
): Promise<Record<string, unknown> | undefined> {
  const nextVersion = currentVersion + 1
  const updatedAt = new Date()

  const insertBuilder = database.insert(table)
  if (!insertBuilder?.values) {
    return await loadSessionState(database, table, sessionId)
  }

  const valuesBuilder = insertBuilder.values({
    sessionId,
    state,
    version: nextVersion,
    updatedAt
  })

  const conflictBuilder = valuesBuilder?.onConflictDoUpdate
    ? valuesBuilder.onConflictDoUpdate({
        target: table.sessionId,
        set: { state, version: nextVersion, updatedAt }
      })
    : undefined

  const returningBuilder = conflictBuilder ?? valuesBuilder
  if (returningBuilder?.returning) {
    const rows = await returningBuilder.returning()
    if (Array.isArray(rows) && rows.length > 0) {
      const row = extractStateRow(rows[0])
      if (row) return row
    }
  }

  return await loadSessionState(database, table, sessionId)
}

type MemoPayload = {
  sections: Record<string, string>
  reviewChecklist: Record<string, boolean>
  attachments: Record<string, unknown>
  commentThreads: Record<string, unknown>
  version: number
}

type NormalizationPayload = {
  reconciledSources: Record<string, boolean>
  appliedAdjustments: Record<string, boolean>
  version: number
}

type ValuationPayload = {
  selectedScenario: string
  assumptionOverrides: Record<string, number>
  version: number
}

type MonitoringPayload = {
  acknowledgedAlerts: Record<string, boolean>
  deltaOverrides: Record<string, string>
  version: number
}

const buildMemoPayload = (row: Record<string, unknown> | undefined) => {
  if (!row) return null
  const state = isRecord(row.state) ? row.state : {}
  return {
    sections: (state.sections as Record<string, string>) ?? {},
    reviewChecklist: (state.reviewChecklist as Record<string, boolean>) ?? {},
    attachments: (state.attachments as Record<string, unknown>) ?? {},
    commentThreads: (state.commentThreads as Record<string, unknown>) ?? {},
    updatedAt: buildTimestamp(row.updatedAt).toISOString(),
    version: (row.version as number | undefined) ?? 0
  }
}

const buildNormalizationPayload = (row: Record<string, unknown> | undefined) => {
  if (!row) return null
  const state = isRecord(row.state) ? row.state : {}
  return {
    reconciledSources: (state.reconciledSources as Record<string, boolean>) ?? {},
    appliedAdjustments: (state.appliedAdjustments as Record<string, boolean>) ?? {},
    updatedAt: buildTimestamp(row.updatedAt).toISOString(),
    version: (row.version as number | undefined) ?? 0
  }
}

const buildValuationPayload = (row: Record<string, unknown> | undefined) => {
  if (!row) return null
  const state = isRecord(row.state) ? row.state : {}
  return {
    selectedScenario: typeof state.selectedScenario === 'string' ? state.selectedScenario : '',
    assumptionOverrides: (state.assumptionOverrides as Record<string, number>) ?? {},
    updatedAt: buildTimestamp(row.updatedAt).toISOString(),
    version: (row.version as number | undefined) ?? 0
  }
}

const buildMonitoringPayload = (row: Record<string, unknown> | undefined) => {
  if (!row) return null
  const state = isRecord(row.state) ? row.state : {}
  return {
    acknowledgedAlerts: (state.acknowledgedAlerts as Record<string, boolean>) ?? {},
    deltaOverrides: (state.deltaOverrides as Record<string, string>) ?? {},
    updatedAt: buildTimestamp(row.updatedAt).toISOString(),
    version: (row.version as number | undefined) ?? 0
  }
}

const validateMemoInput = (payload: unknown): MemoPayload | null => {
  if (!isRecord(payload)) return null
  const { sections, reviewChecklist, attachments, commentThreads, version } = payload
  if (!isRecord(sections) || !isRecord(reviewChecklist) || !isRecord(attachments) || !isRecord(commentThreads)) {
    return null
  }
  if (typeof version !== 'number') return null
  return {
    sections: sections as Record<string, string>,
    reviewChecklist: reviewChecklist as Record<string, boolean>,
    attachments: attachments as Record<string, unknown>,
    commentThreads: commentThreads as Record<string, unknown>,
    version
  }
}

const validateNormalizationInput = (payload: unknown): NormalizationPayload | null => {
  if (!isRecord(payload)) return null
  const { reconciledSources, appliedAdjustments, version } = payload
  if (!isRecord(reconciledSources) || !isRecord(appliedAdjustments) || typeof version !== 'number') {
    return null
  }
  return {
    reconciledSources: reconciledSources as Record<string, boolean>,
    appliedAdjustments: appliedAdjustments as Record<string, boolean>,
    version
  }
}

const validateValuationInput = (payload: unknown): ValuationPayload | null => {
  if (!isRecord(payload)) return null
  const { selectedScenario, assumptionOverrides, version } = payload
  if (typeof selectedScenario !== 'string' || !isRecord(assumptionOverrides) || typeof version !== 'number') {
    return null
  }
  return {
    selectedScenario,
    assumptionOverrides: assumptionOverrides as Record<string, number>,
    version
  }
}

const validateMonitoringInput = (payload: unknown): MonitoringPayload | null => {
  if (!isRecord(payload)) return null
  const { acknowledgedAlerts, deltaOverrides, version } = payload
  if (!isRecord(acknowledgedAlerts) || !isRecord(deltaOverrides) || typeof version !== 'number') {
    return null
  }
  return {
    acknowledgedAlerts: acknowledgedAlerts as Record<string, boolean>,
    deltaOverrides: deltaOverrides as Record<string, string>,
    version
  }
}

type PresenceRecord = {
  actorId: string
  stageSlug: string
  updatedAt: number
}

const PRESENCE_TTL_MS = 60_000
const presenceStore = new Map<string, Map<string, PresenceRecord>>()

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

const prunePresence = (stageSlug: string, now: number) => {
  const stageMap = presenceStore.get(stageSlug)
  if (!stageMap) return
  for (const [sessionKey, record] of stageMap.entries()) {
    if (now - record.updatedAt > PRESENCE_TTL_MS) {
      stageMap.delete(sessionKey)
    }
  }
  if (stageMap.size === 0) {
    presenceStore.delete(stageSlug)
  }
}

export function createWorkflowRouter(dbOverride: DatabaseClient | null = db as unknown as DatabaseClient | null) {
  const router = Router()
  const database = dbOverride

  router.use(optionalAuth)

  if (!database || typeof database.select !== 'function' || typeof database.insert !== 'function') {
    log('Workflow router operating in demo mode without database; returning stub responses')
    router.use((_req, res) => {
      res.status(503).json({
        error: 'Workflow routes unavailable: database not configured',
        hint: 'Set DATABASE_URL to enable workflow persistence.'
      })
    })
    return router
  }

  router.get('/memo-state', async (req, res) => {
    const sessionId = resolveSessionId(req.headers['x-session-key'])
    if (!sessionId) {
      res.status(400).json({ message: 'Session key header required' })
      return
    }
    try {
      const state = await loadSessionState(database, workflowMemoStates, sessionId)
      res.json(buildMemoPayload(state))
    } catch (error) {
      log(`Error fetching memo state: ${error}`)
      res.status(500).json({ message: 'Failed to load memo composer state' })
    }
  })

  router.put('/memo-state', async (req, res) => {
    const sessionId = resolveSessionId(req.headers['x-session-key'])
    if (!sessionId) {
      res.status(400).json({ message: 'Session key header required' })
      return
    }
    try {
      const payload = validateMemoInput(req.body)
      if (!payload) {
        res.status(400).json({ message: 'Invalid memo state payload' })
        return res.end()
      }

      const existing = await loadSessionState(database, workflowMemoStates, sessionId)
      const existingVersion = (existing?.version as number | undefined) ?? 0
      if (existing && payload.version !== existingVersion) {
        return res.status(409).json({ message: 'Memo state version conflict' })
      }

      const result = await upsertSessionState(database, workflowMemoStates, sessionId, {
        sections: payload.sections,
        reviewChecklist: payload.reviewChecklist,
        attachments: payload.attachments,
        commentThreads: payload.commentThreads
      }, existingVersion)

      res.json(buildMemoPayload(result))
    } catch (error) {
      log(`Error persisting memo state: ${error}`)
      res.status(500).json({ message: 'Failed to persist memo composer state' })
    }
  })

  router.get('/normalization-state', async (req, res) => {
    const sessionId = resolveSessionId(req.headers['x-session-key'])
    if (!sessionId) {
      res.status(400).json({ message: 'Session key header required' })
      return
    }
    try {
      const state = await loadSessionState(database, workflowNormalizationStates, sessionId)
      res.json(buildNormalizationPayload(state))
    } catch (error) {
      log(`Error fetching normalization state: ${error}`)
      res.status(500).json({ message: 'Failed to load normalization state' })
    }
  })

  router.put('/normalization-state', async (req, res) => {
    const sessionId = resolveSessionId(req.headers['x-session-key'])
    if (!sessionId) {
      res.status(400).json({ message: 'Session key header required' })
      return
    }
    try {
      const payload = validateNormalizationInput(req.body)
      if (!payload) {
        res.status(400).json({ message: 'Invalid normalization payload' })
        return res.end()
      }

      const existing = await loadSessionState(database, workflowNormalizationStates, sessionId)
      const existingVersion = (existing?.version as number | undefined) ?? 0
      if (existing && payload.version !== existingVersion) {
        return res.status(409).json({ message: 'Normalization state version conflict' })
      }

      const result = await upsertSessionState(database, workflowNormalizationStates, sessionId, {
        reconciledSources: payload.reconciledSources,
        appliedAdjustments: payload.appliedAdjustments
      }, existingVersion)

      res.json(buildNormalizationPayload(result))
    } catch (error) {
      log(`Error persisting normalization state: ${error}`)
      res.status(500).json({ message: 'Failed to persist normalization state' })
    }
  })

  router.get('/valuation-state', async (req, res) => {
    const sessionId = resolveSessionId(req.headers['x-session-key'])
    if (!sessionId) {
      res.status(400).json({ message: 'Session key header required' })
      return
    }
    try {
      const state = await loadSessionState(database, workflowValuationStates, sessionId)
      res.json(buildValuationPayload(state))
    } catch (error) {
      log(`Error fetching valuation state: ${error}`)
      res.status(500).json({ message: 'Failed to load valuation state' })
    }
  })

  router.put('/valuation-state', async (req, res) => {
    const sessionId = resolveSessionId(req.headers['x-session-key'])
    if (!sessionId) {
      res.status(400).json({ message: 'Session key header required' })
      return
    }
    try {
      const payload = validateValuationInput(req.body)
      if (!payload) {
        res.status(400).json({ message: 'Invalid valuation payload' })
        return res.end()
      }

      const existing = await loadSessionState(database, workflowValuationStates, sessionId)
      const existingVersion = (existing?.version as number | undefined) ?? 0
      if (existing && payload.version !== existingVersion) {
        return res.status(409).json({ message: 'Valuation state version conflict' })
      }

      const result = await upsertSessionState(database, workflowValuationStates, sessionId, {
        selectedScenario: payload.selectedScenario,
        assumptionOverrides: payload.assumptionOverrides
      }, existingVersion)

      res.json(buildValuationPayload(result))
    } catch (error) {
      log(`Error persisting valuation state: ${error}`)
      res.status(500).json({ message: 'Failed to persist valuation state' })
    }
  })

  router.get('/monitoring-state', async (req, res) => {
    const sessionId = resolveSessionId(req.headers['x-session-key'])
    if (!sessionId) {
      res.status(400).json({ message: 'Session key header required' })
      return
    }
    try {
      const state = await loadSessionState(database, workflowMonitoringStates, sessionId)
      res.json(buildMonitoringPayload(state))
    } catch (error) {
      log(`Error fetching monitoring state: ${error}`)
      res.status(500).json({ message: 'Failed to load monitoring state' })
    }
  })

  router.put('/monitoring-state', async (req, res) => {
    const sessionId = resolveSessionId(req.headers['x-session-key'])
    if (!sessionId) {
      res.status(400).json({ message: 'Session key header required' })
      return
    }
    try {
      const payload = validateMonitoringInput(req.body)
      if (!payload) {
        res.status(400).json({ message: 'Invalid monitoring payload' })
        return res.end()
      }

      const existing = await loadSessionState(database, workflowMonitoringStates, sessionId)
      const existingVersion = (existing?.version as number | undefined) ?? 0
      if (existing && payload.version !== existingVersion) {
        return res.status(409).json({ message: 'Monitoring state version conflict' })
      }

      const result = await upsertSessionState(database, workflowMonitoringStates, sessionId, {
        acknowledgedAlerts: payload.acknowledgedAlerts,
        deltaOverrides: payload.deltaOverrides
      }, existingVersion)

      res.json(buildMonitoringPayload(result))
    } catch (error) {
      log(`Error persisting monitoring state: ${error}`)
      res.status(500).json({ message: 'Failed to persist monitoring state' })
    }
  })

  router.post('/presence/heartbeat', (req, res) => {
    const sessionId = resolveSessionId(req.headers['x-session-key'])
    if (!sessionId) {
      res.status(400).json({ message: 'Session key header required' })
      return
    }

    const stageSlugRaw = isRecord(req.body) ? (req.body.stageSlug as string | undefined) : undefined
    const stageSlug = typeof stageSlugRaw === 'string' ? stageSlugRaw.trim() : ''
    if (!stageSlug) {
      res.status(400).json({ message: 'Stage slug required' })
      return
    }

    const actorId = resolveActorId(req.headers['x-actor-id'], sessionId)
    const now = Date.now()

    const stageMap = presenceStore.get(stageSlug) ?? new Map<string, PresenceRecord>()
    stageMap.set(sessionId, { actorId, stageSlug, updatedAt: now })
    presenceStore.set(stageSlug, stageMap)
    prunePresence(stageSlug, now)

    const peers = Array.from((presenceStore.get(stageSlug) ?? new Map()).values()).map((record) => ({
      actorId: record.actorId,
      stageSlug: record.stageSlug,
      updatedAt: new Date(record.updatedAt).toISOString()
    }))

    res.json({ actorId, stageSlug, peers })
  })

  router.get('/presence', (req, res) => {
    const stageSlugRaw = typeof req.query.stage === 'string' ? req.query.stage : ''
    const stageSlug = stageSlugRaw.trim()
    if (!stageSlug) {
      res.status(400).json({ message: 'Stage query parameter required' })
      return
    }

    prunePresence(stageSlug, Date.now())
    const peers = Array.from((presenceStore.get(stageSlug) ?? new Map()).values()).map((record) => ({
      actorId: record.actorId,
      stageSlug: record.stageSlug,
      updatedAt: new Date(record.updatedAt).toISOString()
    }))

    res.json(peers)
  })

  return router
}

const router = createWorkflowRouter()

export { router }
export default router
