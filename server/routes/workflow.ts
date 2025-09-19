import { Router } from "express"
import type { Request } from "express"
import type {
  ResearchLogEntry,
  ResearchLogInput,
  MemoComposerStateInput,
  DataNormalizationStateInput,
  ValuationStateInput,
  MonitoringStateInput
} from "@shared/types"
import { db } from "../../lib/db"
import {
  dataNormalizationStateEvents,
  dataNormalizationStates,
  memoComposerStateEvents,
  memoComposerStates,
  monitoringStateEvents,
  monitoringStates,
  researchLogEntries,
  valuationStateEvents,
  valuationStates
} from "@shared/schema"
import { desc, eq } from "drizzle-orm"

type Database = typeof db
type ResearchLogRow = typeof researchLogEntries.$inferSelect

type GenericStateRow<TState> = {
  state: TState
  version: number
  updatedAt: Date
}

type ConflictError = Error & { status: number; expectedVersion: number }

const PRESENCE_MAX_AGE = 45_000

export function createWorkflowRouter(database: Database = db) {
  const workflowRouter = Router()

  // Check if database is available (not null)
  const hasDatabase = database !== null

  const presenceRegistry = new Map<string, Map<string, { actorId: string; updatedAt: number }>>()

  const prunePresence = (stageSlug: string) => {
    const stageMap = presenceRegistry.get(stageSlug)
    if (!stageMap) return
    const now = Date.now()
    for (const [actorId, entry] of stageMap.entries()) {
      if (now - entry.updatedAt > PRESENCE_MAX_AGE) {
        stageMap.delete(actorId)
      }
    }
    if (stageMap.size === 0) {
      presenceRegistry.delete(stageSlug)
    }
  }

  const getSessionKey = (
    req: Request & { sessionID?: string; session?: { id?: string; userId?: string } }
  ): string => {
    if (req.sessionID) return req.sessionID
    if (req.session?.id) return req.session.id
    if (req.headers?.["x-session-key"]) return String(req.headers["x-session-key"])
    return req.ip ?? "anonymous"
  }

  const getActorId = (
    req: Request & { session?: { userId?: string } },
    fallback: string
  ): string => {
    if (req.session?.userId) return req.session.userId
    if (req.headers?.["x-actor-id"]) return String(req.headers["x-actor-id"])
    return fallback
  }

  const loadCurrentState = async <TState>(
    table: any,
    sessionKey: string
  ): Promise<GenericStateRow<TState> | undefined> => {
    if (!hasDatabase) {
      return undefined
    }

    const rows = (await database!
      .select()
      .from(table)
      .where(eq(table.sessionId, sessionKey))
      .limit(1)) as Array<GenericStateRow<TState>>
    return rows[0]
  }

  const upsertState = async <TPayload extends { version: number }, TState>(
    table: any,
    eventsTable: any,
    sessionKey: string,
    actorId: string,
    payload: TPayload,
    sanitize: (payload: TPayload) => TState,
    conflictMessage: string
  ) => {
    if (!hasDatabase) {
      throw new Error("Database not available for state persistence")
    }

    const existing = await loadCurrentState<TState>(table, sessionKey)
    const currentVersion = existing?.version ?? 0

    if (payload.version !== currentVersion) {
      const conflict: ConflictError = Object.assign(new Error(conflictMessage), {
        status: 409,
        expectedVersion: currentVersion
      })
      throw conflict
    }

    const now = new Date()
    const nextVersion = currentVersion + 1
    const stateData = sanitize(payload)

    const [row] = (await database!
      .insert(table)
      .values({
        sessionId: sessionKey,
        state: stateData,
        version: nextVersion,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: table.sessionId,
        set: {
          state: stateData,
          version: nextVersion,
          updatedAt: now
        }
      })
      .returning()) as Array<GenericStateRow<TState>>

    await database!.insert(eventsTable).values({
      sessionId: sessionKey,
      actorId,
      version: nextVersion,
      state: stateData,
      createdAt: now
    })

    return row ?? { state: stateData, version: nextVersion, updatedAt: now }
  }

  const respondWithState = <TState>(
    res: any,
    row?: GenericStateRow<TState>
  ) => {
    if (!row) {
      res.json(null)
      return
    }
    res.json({
      ...(row.state as Record<string, unknown>),
      version: row.version,
      updatedAt: row.updatedAt.toISOString()
    })
  }

  // Research log routes
  workflowRouter.get("/research-log", async (_req, res) => {
    if (!hasDatabase) {
      return res.json([])
    }

    try {
      const rows = (await database!
        .select()
        .from(researchLogEntries)
        .orderBy(desc(researchLogEntries.timestamp))
        .limit(100)) as ResearchLogRow[]

      const entries: ResearchLogEntry[] = rows.map((row) => ({
        id: row.id,
        stageSlug: row.stageSlug,
        stageTitle: row.stageTitle,
        action: row.action,
        details: row.details ?? undefined,
        timestamp: row.timestamp.toISOString()
      }))

      res.json(entries)
    } catch (_error) {
      res.status(500).json({ message: "Failed to load research log" })
    }
  })

  workflowRouter.post("/research-log", async (req, res) => {
    if (!hasDatabase) {
      return res.status(503).json({ message: "Database not available" })
    }

    const payload = req.body as ResearchLogInput
    if (!payload?.stageSlug || !payload?.stageTitle || !payload?.action) {
      return res.status(400).json({ message: "Missing required fields" })
    }

    try {
      const [inserted] = await database!
        .insert(researchLogEntries)
        .values({
          stageSlug: payload.stageSlug,
          stageTitle: payload.stageTitle,
          action: payload.action,
          details: payload.details ?? null,
          timestamp: payload.timestamp ? new Date(payload.timestamp) : undefined
        })
        .returning()

      const entry: ResearchLogEntry = {
        id: inserted.id,
        stageSlug: inserted.stageSlug,
        stageTitle: inserted.stageTitle,
        action: inserted.action,
        details: inserted.details ?? undefined,
        timestamp: inserted.timestamp.toISOString()
      }

      res.status(201).json(entry)
    } catch (_error) {
      res.status(500).json({ message: "Failed to persist research log entry" })
    }
  })

  // Normalization state
  workflowRouter.get("/normalization-state", async (req, res) => {
    const sessionKey = getSessionKey(req)
    try {
      const row = await loadCurrentState<Omit<DataNormalizationStateInput, "version">>(
        dataNormalizationStates,
        sessionKey
      )
      respondWithState(res, row)
    } catch (_error) {
      res.status(500).json({ message: "Failed to load normalization state" })
    }
  })

  workflowRouter.put("/normalization-state", async (req, res) => {
    const sessionKey = getSessionKey(req)
    const payload = req.body as DataNormalizationStateInput

    if (
      !payload ||
      typeof payload !== "object" ||
      !payload.reconciledSources ||
      !payload.appliedAdjustments ||
      typeof payload.version !== "number"
    ) {
      return res.status(400).json({ message: "Invalid normalization payload" })
    }

    try {
      const stored = await upsertState(
        dataNormalizationStates,
        dataNormalizationStateEvents,
        sessionKey,
        getActorId(req, sessionKey),
        payload,
        (input) => ({
          reconciledSources: input.reconciledSources,
          appliedAdjustments: input.appliedAdjustments
        }),
        "Normalization state version conflict"
      )

      respondWithState(res, stored)
    } catch (error) {
      if ((error as ConflictError).status === 409) {
        return res.status(409).json({
          message: (error as ConflictError).message,
          expectedVersion: (error as ConflictError).expectedVersion
        })
      }
      res.status(500).json({ message: "Failed to persist normalization state" })
    }
  })

  // Valuation state
  workflowRouter.get("/valuation-state", async (req, res) => {
    const sessionKey = getSessionKey(req)
    try {
      const row = await loadCurrentState<Omit<ValuationStateInput, "version">>(
        valuationStates,
        sessionKey
      )
      respondWithState(res, row)
    } catch (_error) {
      res.status(500).json({ message: "Failed to load valuation state" })
    }
  })

  workflowRouter.put("/valuation-state", async (req, res) => {
    const sessionKey = getSessionKey(req)
    const payload = req.body as ValuationStateInput

    if (
      !payload ||
      typeof payload !== "object" ||
      !payload.selectedScenario ||
      !payload.assumptionOverrides ||
      typeof payload.version !== "number"
    ) {
      return res.status(400).json({ message: "Invalid valuation payload" })
    }

    try {
      const stored = await upsertState(
        valuationStates,
        valuationStateEvents,
        sessionKey,
        getActorId(req, sessionKey),
        payload,
        (input) => ({
          selectedScenario: input.selectedScenario,
          assumptionOverrides: input.assumptionOverrides
        }),
        "Valuation state version conflict"
      )

      respondWithState(res, stored)
    } catch (error) {
      if ((error as ConflictError).status === 409) {
        return res.status(409).json({
          message: (error as ConflictError).message,
          expectedVersion: (error as ConflictError).expectedVersion
        })
      }
      res.status(500).json({ message: "Failed to persist valuation state" })
    }
  })

  // Monitoring state
  workflowRouter.get("/monitoring-state", async (req, res) => {
    const sessionKey = getSessionKey(req)
    try {
      const row = await loadCurrentState<Omit<MonitoringStateInput, "version">>(
        monitoringStates,
        sessionKey
      )
      respondWithState(res, row)
    } catch (_error) {
      res.status(500).json({ message: "Failed to load monitoring state" })
    }
  })

  workflowRouter.put("/monitoring-state", async (req, res) => {
    const sessionKey = getSessionKey(req)
    const payload = req.body as MonitoringStateInput

    if (
      !payload ||
      typeof payload !== "object" ||
      !payload.acknowledgedAlerts ||
      !payload.deltaOverrides ||
      typeof payload.version !== "number"
    ) {
      return res.status(400).json({ message: "Invalid monitoring payload" })
    }

    try {
      const stored = await upsertState(
        monitoringStates,
        monitoringStateEvents,
        sessionKey,
        getActorId(req, sessionKey),
        payload,
        (input) => ({
          acknowledgedAlerts: input.acknowledgedAlerts,
          deltaOverrides: input.deltaOverrides
        }),
        "Monitoring state version conflict"
      )

      respondWithState(res, stored)
    } catch (error) {
      if ((error as ConflictError).status === 409) {
        return res.status(409).json({
          message: (error as ConflictError).message,
          expectedVersion: (error as ConflictError).expectedVersion
        })
      }
      res.status(500).json({ message: "Failed to persist monitoring state" })
    }
  })

  // Memo state
  workflowRouter.get("/memo-state", async (req, res) => {
    const sessionKey = getSessionKey(req)
    try {
      const row = await loadCurrentState<Omit<MemoComposerStateInput, "version">>(
        memoComposerStates,
        sessionKey
      )
      respondWithState(res, row)
    } catch (_error) {
      res.status(500).json({ message: "Failed to load memo composer state" })
    }
  })

  workflowRouter.put("/memo-state", async (req, res) => {
    const sessionKey = getSessionKey(req)
    const payload = req.body as MemoComposerStateInput

    if (
      !payload ||
      typeof payload !== "object" ||
      !payload.sections ||
      !payload.reviewChecklist ||
      !payload.attachments ||
      !payload.commentThreads ||
      typeof payload.version !== "number"
    ) {
      return res.status(400).json({ message: "Invalid memo composer payload" })
    }

    try {
      const stored = await upsertState(
        memoComposerStates,
        memoComposerStateEvents,
        sessionKey,
        getActorId(req, sessionKey),
        payload,
        (input) => ({
          sections: input.sections,
          reviewChecklist: input.reviewChecklist,
          attachments: input.attachments,
          commentThreads: input.commentThreads
        }),
        "Memo state version conflict"
      )

      respondWithState(res, stored)
    } catch (error) {
      if ((error as ConflictError).status === 409) {
        return res.status(409).json({
          message: (error as ConflictError).message,
          expectedVersion: (error as ConflictError).expectedVersion
        })
      }
      res.status(500).json({ message: "Failed to persist memo composer state" })
    }
  })

  // History endpoint
  workflowRouter.get("/history/:context", async (req, res) => {
    const sessionKey = getSessionKey(req)
    const context = String(req.params.context ?? "")
    const limitParam = Number(req.query.limit ?? 20)
    const limit = Number.isNaN(limitParam) ? 20 : Math.min(Math.max(limitParam, 1), 100)

    const mapping = {
      memo: memoComposerStateEvents,
      normalization: dataNormalizationStateEvents,
      valuation: valuationStateEvents,
      monitoring: monitoringStateEvents
    } as const

    const table = mapping[context as keyof typeof mapping]
    if (!table) {
      return res.status(400).json({ message: "Unknown history context" })
    }

    try {
      if (!hasDatabase) {
        return res.json([])
      }

      const rows = await database!
        .select()
        .from(table)
        .where(eq(table.sessionId, sessionKey))
        .orderBy(desc(table.createdAt))
        .limit(limit)

      res.json(
        rows.map((row: any) => ({
          id: row.id,
          actorId: row.actorId,
          version: row.version,
          state: row.state,
          createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt
        }))
      )
    } catch (_error) {
      res.status(500).json({ message: "Failed to load workflow history" })
    }
  })

  // Presence endpoints
  workflowRouter.post('/presence/heartbeat', (req, res) => {
    const sessionKey = getSessionKey(req)
    const actorId = getActorId(req, sessionKey)
    const stageSlugRaw = (req.body as { stageSlug?: string })?.stageSlug
    const stageSlug = typeof stageSlugRaw === 'string' ? stageSlugRaw.trim() : ''
    if (!stageSlug) {
      return res.status(400).json({ message: 'Missing stageSlug' })
    }

    prunePresence(stageSlug)
    const now = Date.now()
    const stageMap = presenceRegistry.get(stageSlug) ?? new Map<string, { actorId: string; updatedAt: number }>()
    stageMap.set(actorId, { actorId, updatedAt: now })
    presenceRegistry.set(stageSlug, stageMap)

    const peers = Array.from(stageMap.values()).map((entry) => ({
      actorId: entry.actorId,
      stageSlug,
      updatedAt: new Date(entry.updatedAt).toISOString()
    }))

    res.json({
      actorId,
      stageSlug,
      updatedAt: new Date(now).toISOString(),
      peers
    })
  })

  workflowRouter.get('/presence', (req, res) => {
    const stageParam = req.query.stage
    const stageSlug = typeof stageParam === 'string' ? stageParam.trim() : ''
    if (!stageSlug) {
      return res.status(400).json({ message: 'Missing stage query parameter' })
    }
    prunePresence(stageSlug)
    const stageMap = presenceRegistry.get(stageSlug)
    const peers = stageMap
      ? Array.from(stageMap.values()).map((entry) => ({
          actorId: entry.actorId,
          stageSlug,
          updatedAt: new Date(entry.updatedAt).toISOString()
        }))
      : []
    res.json(peers)
  })

  return workflowRouter
}

export default createWorkflowRouter
