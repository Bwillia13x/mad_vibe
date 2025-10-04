import { Router } from 'express'
import { desc, eq } from 'drizzle-orm'
import { db } from '../../lib/db'
import {
  workflowMemoStates,
  workflowNormalizationStates,
  workflowValuationStates,
  workflowMonitoringStates
} from '../../lib/db/schema'
import { log } from '../../lib/log'
import { sessionPresenceService } from '../../lib/agents/session-presence'
import { optionalAuth } from '../middleware/auth'
import { researchLogEntries } from '@shared/schema'
import type { ResearchLogEntry } from '@shared/types'
import { randomUUID } from 'crypto'

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

type ResearchLogRow = {
  id: string
  stageSlug: string
  stageTitle: string
  action: string
  details?: string | null
  timestamp: Date | string
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

const getQueryAdapter = (
  database: DatabaseClient,
  table: SessionTable
): QueryAdapter | undefined => {
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
  if (
    !isRecord(sections) ||
    !isRecord(reviewChecklist) ||
    !isRecord(attachments) ||
    !isRecord(commentThreads)
  ) {
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
  if (
    !isRecord(reconciledSources) ||
    !isRecord(appliedAdjustments) ||
    typeof version !== 'number'
  ) {
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
  if (
    typeof selectedScenario !== 'string' ||
    !isRecord(assumptionOverrides) ||
    typeof version !== 'number'
  ) {
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

const STAGE_SLUGS = {
  memo: 'memo',
  normalization: 'data',
  valuation: 'valuation',
  monitoring: 'monitoring'
} as const

const MAX_RESEARCH_LOG_ENTRIES = 100
let workflowPersistenceMode: 'database' | 'memory' = 'memory'

const toIsoTimestamp = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString()
  }
  return date.toISOString()
}

const toResearchLogEntry = (row: ResearchLogRow): ResearchLogEntry => ({
  id: row.id,
  stageSlug: row.stageSlug,
  stageTitle: row.stageTitle,
  action: row.action,
  details: typeof row.details === 'string' ? row.details : undefined,
  timestamp: toIsoTimestamp(row.timestamp)
})

const sortResearchLogRows = (rows: ResearchLogRow[]): ResearchLogRow[] =>
  [...rows].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

const seedInMemoryResearchLog = (): ResearchLogRow[] => {
  const now = Date.now()
  const minutesAgo = (mins: number) => new Date(now - mins * 60 * 1000)
  return [
    {
      id: randomUUID(),
      stageSlug: 'home',
      stageTitle: 'Home / Daily Brief',
      action: 'Stage opened',
      details: 'Reviewed overnight alerts and resumed latest session',
      timestamp: minutesAgo(45)
    },
    {
      id: randomUUID(),
      stageSlug: 'intake',
      stageTitle: 'Idea Intake (Triage)',
      action: 'Stage marked ready',
      details: 'Thesis stub documented and disqualifier logged',
      timestamp: minutesAgo(35)
    },
    {
      id: randomUUID(),
      stageSlug: 'one-pager',
      stageTitle: 'One-Pager (Quick Look)',
      action: 'Stage opened',
      details: 'Running forensic checks before promoting to Dossier',
      timestamp: minutesAgo(20)
    },
    {
      id: randomUUID(),
      stageSlug: 'dossier',
      stageTitle: 'Company Dossier (Business Map)',
      action: 'Stage opened',
      details: 'Mapping segments and attaching first citations',
      timestamp: minutesAgo(10)
    }
  ]
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const validateResearchLogInput = (
  payload: unknown
): {
  stageSlug: string
  stageTitle: string
  action: string
  details?: string
  timestamp: Date
} | null => {
  if (!isRecord(payload)) return null
  const stageSlugRaw = payload.stageSlug
  const stageTitleRaw = payload.stageTitle
  const actionRaw = payload.action
  const detailsRaw = payload.details
  const timestampRaw = payload.timestamp

  if (
    !isNonEmptyString(stageSlugRaw) ||
    !isNonEmptyString(stageTitleRaw) ||
    !isNonEmptyString(actionRaw)
  ) {
    return null
  }

  const details =
    typeof detailsRaw === 'string' && detailsRaw.trim().length > 0 ? detailsRaw.trim() : undefined
  let timestamp: Date
  if (timestampRaw instanceof Date) {
    timestamp = new Date(timestampRaw.getTime())
  } else if (typeof timestampRaw === 'string' || typeof timestampRaw === 'number') {
    timestamp = new Date(timestampRaw)
  } else if (timestampRaw === undefined || timestampRaw === null) {
    timestamp = new Date()
  } else {
    return null
  }

  if (Number.isNaN(timestamp.getTime())) {
    return null
  }

  return {
    stageSlug: stageSlugRaw.trim(),
    stageTitle: stageTitleRaw.trim(),
    action: actionRaw.trim(),
    details,
    timestamp
  }
}

export function createWorkflowRouter(
  dbOverride: DatabaseClient | null = db as unknown as DatabaseClient | null
) {
  const router = Router()
  const database = dbOverride
  const databaseAvailable =
    !!database && typeof database.select === 'function' && typeof database.insert === 'function'

  workflowPersistenceMode = databaseAvailable ? 'database' : 'memory'

  type WorkflowStoreKey = 'memo' | 'normalization' | 'valuation' | 'monitoring'

  const tableMap: Record<WorkflowStoreKey, SessionTable> = {
    memo: workflowMemoStates,
    normalization: workflowNormalizationStates,
    valuation: workflowValuationStates,
    monitoring: workflowMonitoringStates
  }

  type MemoryRow = {
    state: Record<string, unknown>
    version: number
    updatedAt: Date
  }

  const memoryStores: Record<WorkflowStoreKey, Map<string, MemoryRow>> | null = databaseAvailable
    ? null
    : {
        memo: new Map<string, MemoryRow>(),
        normalization: new Map<string, MemoryRow>(),
        valuation: new Map<string, MemoryRow>(),
        monitoring: new Map<string, MemoryRow>()
      }

  let memoryResearchLog = databaseAvailable ? null : sortResearchLogRows(seedInMemoryResearchLog())

  const loadState = async (
    key: WorkflowStoreKey,
    sessionId: string
  ): Promise<Record<string, unknown> | undefined> => {
    if (databaseAvailable) {
      return await loadSessionState(database as DatabaseClient, tableMap[key], sessionId)
    }

    const store = memoryStores![key]
    const state = store.get(sessionId)
    if (!state) return undefined
    return {
      sessionId,
      state: state.state,
      version: state.version,
      updatedAt: state.updatedAt
    }
  }

  const upsertState = async (
    key: WorkflowStoreKey,
    sessionId: string,
    state: Record<string, unknown>,
    currentVersion: number
  ): Promise<Record<string, unknown> | undefined> => {
    if (databaseAvailable) {
      return await upsertSessionState(
        database as DatabaseClient,
        tableMap[key],
        sessionId,
        state,
        currentVersion
      )
    }

    const store = memoryStores![key]
    const nextVersion = currentVersion + 1
    const updatedRow: MemoryRow = {
      state,
      version: nextVersion,
      updatedAt: new Date()
    }
    store.set(sessionId, updatedRow)
    return {
      sessionId,
      state: updatedRow.state,
      version: updatedRow.version,
      updatedAt: updatedRow.updatedAt
    }
  }

  const loadResearchLogEntries = async (): Promise<ResearchLogEntry[]> => {
    if (databaseAvailable) {
      try {
        const rows = await (
          database as unknown as {
            select: () => {
              from: (table: typeof researchLogEntries) => {
                orderBy: (order: unknown) => {
                  limit: (count: number) => Promise<ResearchLogRow[]>
                }
              }
            }
          }
        )
          .select()
          .from(researchLogEntries)
          .orderBy(desc(researchLogEntries.timestamp))
          .limit(MAX_RESEARCH_LOG_ENTRIES)

        return sortResearchLogRows(rows as ResearchLogRow[]).map(toResearchLogEntry)
      } catch (error) {
        log(`Error loading research log entries: ${String(error)}`)
        return []
      }
    }

    if (!memoryResearchLog) return []
    return sortResearchLogRows(memoryResearchLog).map(toResearchLogEntry)
  }

  const appendResearchLogEntry = async (entry: {
    stageSlug: string
    stageTitle: string
    action: string
    details?: string
    timestamp: string
  }): Promise<ResearchLogEntry | null> => {
    if (databaseAvailable) {
      try {
        const rows = await (
          database as unknown as {
            insert: (table: typeof researchLogEntries) => {
              values: (value: Record<string, unknown>) => {
                returning: () => Promise<ResearchLogRow[]>
              }
            }
          }
        )
          .insert(researchLogEntries)
          .values({
            stageSlug: entry.stageSlug,
            stageTitle: entry.stageTitle,
            action: entry.action,
            details: entry.details,
            timestamp: new Date(entry.timestamp)
          })
          .returning()

        if (Array.isArray(rows) && rows.length > 0) {
          return toResearchLogEntry(rows[0] as ResearchLogRow)
        }
      } catch (error) {
        log(`Error persisting research log entry: ${String(error)}`)
        return null
      }
    } else if (memoryResearchLog) {
      const row: ResearchLogRow = {
        id: randomUUID(),
        stageSlug: entry.stageSlug,
        stageTitle: entry.stageTitle,
        action: entry.action,
        details: entry.details,
        timestamp: new Date(entry.timestamp)
      }
      memoryResearchLog = sortResearchLogRows([row, ...memoryResearchLog]).slice(
        0,
        MAX_RESEARCH_LOG_ENTRIES
      )
      return toResearchLogEntry(row)
    }

    return null
  }

  router.use(optionalAuth)
  if (!databaseAvailable) {
    log('Workflow router using in-memory persistence; configure DATABASE_URL for durable storage')
  }

  router.get('/research-log', async (_req, res) => {
    try {
      const entries = await loadResearchLogEntries()
      res.json(entries)
    } catch (error) {
      log(`Error fetching research log entries: ${String(error)}`)
      res.status(500).json({ message: 'Failed to load research log' })
    }
  })

  router.post('/research-log', async (req, res) => {
    const payload = validateResearchLogInput(req.body)
    if (!payload) {
      res.status(400).json({ message: 'Invalid research log payload' })
      return
    }

    const entry = await appendResearchLogEntry({
      stageSlug: payload.stageSlug,
      stageTitle: payload.stageTitle,
      action: payload.action,
      details: payload.details,
      timestamp: payload.timestamp.toISOString()
    })

    if (!entry) {
      res.status(500).json({ message: 'Failed to persist research log entry' })
      return
    }

    res.status(201).json(entry)
  })

  router.get('/memo-state', async (req, res) => {
    const sessionId = resolveSessionId(req.headers['x-session-key'])
    if (!sessionId) {
      res.status(400).json({ message: 'Session key header required' })
      return
    }
    try {
      const state = await loadState('memo', sessionId)
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
    const actorId = resolveActorId(req.headers['x-actor-id'], sessionId)
    try {
      const payload = validateMemoInput(req.body)
      if (!payload) {
        res.status(400).json({ message: 'Invalid memo state payload' })
        return res.end()
      }

      const existing = await loadState('memo', sessionId)
      const existingVersion = (existing?.version as number | undefined) ?? 0
      if (existing && payload.version !== existingVersion) {
        const snapshot = sessionPresenceService.getStageSnapshot(STAGE_SLUGS.memo)
        const blockingActorId = snapshot?.lockOwner
          ? (snapshot.peers.find((peer) => peer.sessionId === snapshot.lockOwner)?.actorId ?? null)
          : null
        sessionPresenceService.registerConflict({
          stageSlug: STAGE_SLUGS.memo,
          sessionId,
          actorId,
          type: 'stale_revision',
          message: 'Memo state version conflict',
          latestRevision: snapshot?.latestRevision ?? existingVersion,
          blockingSessionId: snapshot?.lockOwner ?? undefined,
          blockingActorId
        })
        return res.status(409).json({ message: 'Memo state version conflict' })
      }

      const result = await upsertState(
        'memo',
        sessionId,
        {
          sections: payload.sections,
          reviewChecklist: payload.reviewChecklist,
          attachments: payload.attachments,
          commentThreads: payload.commentThreads
        },
        existingVersion
      )

      const persisted = buildMemoPayload(result)
      res.json(persisted)
      if (persisted) {
        sessionPresenceService.registerRevision(STAGE_SLUGS.memo, persisted.version, sessionId)
      }
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
      const state = await loadState('normalization', sessionId)
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
    const actorId = resolveActorId(req.headers['x-actor-id'], sessionId)
    try {
      const payload = validateNormalizationInput(req.body)
      if (!payload) {
        res.status(400).json({ message: 'Invalid normalization payload' })
        return res.end()
      }

      const existing = await loadState('normalization', sessionId)
      const existingVersion = (existing?.version as number | undefined) ?? 0
      if (existing && payload.version !== existingVersion) {
        const snapshot = sessionPresenceService.getStageSnapshot(STAGE_SLUGS.normalization)
        const blockingActorId = snapshot?.lockOwner
          ? (snapshot.peers.find((peer) => peer.sessionId === snapshot.lockOwner)?.actorId ?? null)
          : null
        sessionPresenceService.registerConflict({
          stageSlug: STAGE_SLUGS.normalization,
          sessionId,
          actorId,
          type: 'stale_revision',
          message: 'Normalization state version conflict',
          latestRevision: snapshot?.latestRevision ?? existingVersion,
          blockingSessionId: snapshot?.lockOwner ?? undefined,
          blockingActorId
        })
        return res.status(409).json({ message: 'Normalization state version conflict' })
      }

      const result = await upsertState(
        'normalization',
        sessionId,
        {
          reconciledSources: payload.reconciledSources,
          appliedAdjustments: payload.appliedAdjustments
        },
        existingVersion
      )

      const persisted = buildNormalizationPayload(result)
      res.json(persisted)
      if (persisted) {
        sessionPresenceService.registerRevision(
          STAGE_SLUGS.normalization,
          persisted.version,
          sessionId
        )
      }
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
      const state = await loadState('valuation', sessionId)
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
    const actorId = resolveActorId(req.headers['x-actor-id'], sessionId)
    try {
      const payload = validateValuationInput(req.body)
      if (!payload) {
        res.status(400).json({ message: 'Invalid valuation payload' })
        return res.end()
      }

      const existing = await loadState('valuation', sessionId)
      const existingVersion = (existing?.version as number | undefined) ?? 0
      if (existing && payload.version !== existingVersion) {
        const snapshot = sessionPresenceService.getStageSnapshot(STAGE_SLUGS.valuation)
        const blockingActorId = snapshot?.lockOwner
          ? (snapshot.peers.find((peer) => peer.sessionId === snapshot.lockOwner)?.actorId ?? null)
          : null
        sessionPresenceService.registerConflict({
          stageSlug: STAGE_SLUGS.valuation,
          sessionId,
          actorId,
          type: 'stale_revision',
          message: 'Valuation state version conflict',
          latestRevision: snapshot?.latestRevision ?? existingVersion,
          blockingSessionId: snapshot?.lockOwner ?? undefined,
          blockingActorId
        })
        return res.status(409).json({ message: 'Valuation state version conflict' })
      }

      const result = await upsertState(
        'valuation',
        sessionId,
        {
          selectedScenario: payload.selectedScenario,
          assumptionOverrides: payload.assumptionOverrides
        },
        existingVersion
      )

      const persisted = buildValuationPayload(result)
      res.json(persisted)
      if (persisted) {
        sessionPresenceService.registerRevision(STAGE_SLUGS.valuation, persisted.version, sessionId)
      }
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
      const state = await loadState('monitoring', sessionId)
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
    const actorId = resolveActorId(req.headers['x-actor-id'], sessionId)
    try {
      const payload = validateMonitoringInput(req.body)
      if (!payload) {
        res.status(400).json({ message: 'Invalid monitoring payload' })
        return res.end()
      }

      const existing = await loadState('monitoring', sessionId)
      const existingVersion = (existing?.version as number | undefined) ?? 0
      if (existing && payload.version !== existingVersion) {
        const snapshot = sessionPresenceService.getStageSnapshot(STAGE_SLUGS.monitoring)
        const blockingActorId = snapshot?.lockOwner
          ? (snapshot.peers.find((peer) => peer.sessionId === snapshot.lockOwner)?.actorId ?? null)
          : null
        sessionPresenceService.registerConflict({
          stageSlug: STAGE_SLUGS.monitoring,
          sessionId,
          actorId,
          type: 'stale_revision',
          message: 'Monitoring state version conflict',
          latestRevision: snapshot?.latestRevision ?? existingVersion,
          blockingSessionId: snapshot?.lockOwner ?? undefined,
          blockingActorId
        })
        return res.status(409).json({ message: 'Monitoring state version conflict' })
      }

      const result = await upsertState(
        'monitoring',
        sessionId,
        {
          acknowledgedAlerts: payload.acknowledgedAlerts,
          deltaOverrides: payload.deltaOverrides
        },
        existingVersion
      )

      const persisted = buildMonitoringPayload(result)
      res.json(persisted)
      if (persisted) {
        sessionPresenceService.registerRevision(
          STAGE_SLUGS.monitoring,
          persisted.version,
          sessionId
        )
      }
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
    const revisionValue = isRecord(req.body) ? (req.body.revision as number | undefined) : undefined
    const revision = typeof revisionValue === 'number' ? revisionValue : undefined
    const lockRequestRaw = isRecord(req.body) ? (req.body.lockRequest ?? req.body.lock) : undefined
    const lockRequest = lockRequestRaw === true

    const result = sessionPresenceService.heartbeat({
      stageSlug,
      sessionId,
      actorId,
      revision,
      lockRequest
    })

    res.json({
      actorId: result.actorId,
      sessionId: result.sessionId,
      stageSlug: result.stageSlug,
      revision: result.revision,
      peers: result.peers.map((peer) => ({
        actorId: peer.actorId,
        stageSlug: peer.stageSlug,
        updatedAt: peer.updatedAt,
        revision: peer.revision,
        locked: peer.locked,
        sessionId: peer.sessionId
      })),
      lockOwner: result.lockOwner,
      lockExpiresAt: result.lockExpiresAt,
      conflict: result.conflict
    })
  })

  router.get('/presence', (req, res) => {
    const stageSlugRaw = typeof req.query.stage === 'string' ? req.query.stage : ''
    const stageSlug = stageSlugRaw.trim()
    if (!stageSlug) {
      res.status(400).json({ message: 'Stage query parameter required' })
      return
    }

    const peers = sessionPresenceService.getPeers(stageSlug)
    res.json(
      peers.map((peer) => ({
        actorId: peer.actorId,
        stageSlug: peer.stageSlug,
        updatedAt: peer.updatedAt,
        revision: peer.revision,
        locked: peer.locked,
        sessionId: peer.sessionId
      }))
    )
  })

  router.post('/presence/telemetry', (req, res) => {
    const sessionId = resolveSessionId(req.headers['x-session-key'])
    if (!sessionId) {
      res.status(400).json({ message: 'Session key header required' })
      return
    }

    if (!isRecord(req.body)) {
      res.status(400).json({ message: 'Invalid telemetry payload' })
      return
    }

    const { stageSlug, event, latencyMs, failureCount, actorId } = req.body

    if (typeof stageSlug !== 'string' || stageSlug.trim() === '') {
      res.status(400).json({ message: 'Telemetry stageSlug required' })
      return
    }

    if (event !== 'heartbeat' && event !== 'failure') {
      res.status(400).json({ message: 'Telemetry event type invalid' })
      return
    }

    const normalizedStageSlug = stageSlug.trim()
    const resolvedActorId =
      typeof actorId === 'string' && actorId.trim().length > 0 ? actorId : sessionId

    sessionPresenceService.heartbeat({
      stageSlug: normalizedStageSlug,
      sessionId,
      actorId: resolvedActorId,
      revision:
        typeof req.body.revision === 'number' && Number.isFinite(req.body.revision)
          ? req.body.revision
          : undefined
    })

    if (typeof latencyMs === 'number' || typeof failureCount === 'number') {
      log(`presence-telemetry:${normalizedStageSlug}`, {
        sessionId,
        actorId: resolvedActorId,
        event,
        latencyMs: typeof latencyMs === 'number' ? latencyMs : undefined,
        failureCount: typeof failureCount === 'number' ? failureCount : undefined
      })
    }

    res.json({ success: true })
  })

  return router
}

const router = createWorkflowRouter()

export { router }
export default router

export const getWorkflowPersistenceMode = () => workflowPersistenceMode
