import { Router } from 'express'
import { optionalAuth, type AuthenticatedRequest } from '../middleware/auth'
import { db } from '../../lib/db'
import {
  workflowMemoSharedDrafts,
  workflowMemoSuggestions,
  workflowAuditEvents
} from '../../lib/db/schema'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { log } from '../../lib/log'

type DatabaseClient = typeof db

const SUGGESTION_STATUSES = ['pending', 'accepted', 'rejected'] as const

type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number]

type SharedDraftRow = typeof workflowMemoSharedDrafts.$inferSelect

type SharedDraftPayload = {
  sections: Record<string, string>
  reviewChecklist: Record<string, boolean>
  attachments: Record<string, unknown>
  commentThreads: Record<string, unknown>
}

type SuggestionRow = typeof workflowMemoSuggestions.$inferSelect

type MemoSharedRouterOptions = {
  database?: DatabaseClient | null
}

function parseWorkflowId(raw: unknown): number | null {
  if (typeof raw === 'string' || typeof raw === 'number') {
    const parsed = typeof raw === 'number' ? raw : parseInt(raw, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }
  return null
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function emptySharedDraft(): SharedDraftPayload {
  return {
    sections: {},
    reviewChecklist: {},
    attachments: {},
    commentThreads: {}
  }
}

function sanitiseSharedDraft(input: unknown): SharedDraftPayload {
  const base = emptySharedDraft()
  if (typeof input !== 'object' || input === null) {
    return base
  }
  const record = input as Record<string, unknown>
  const sections = record.sections
  const reviewChecklist = record.reviewChecklist
  const attachments = record.attachments
  const commentThreads = record.commentThreads
  return {
    sections:
      sections && typeof sections === 'object'
        ? Object.fromEntries(
            Object.entries(sections as Record<string, unknown>).map(([key, value]) => [
              key,
              typeof value === 'string' ? value : ''
            ])
          )
        : {},
    reviewChecklist:
      reviewChecklist && typeof reviewChecklist === 'object'
        ? Object.fromEntries(
            Object.entries(reviewChecklist as Record<string, unknown>).map(([key, value]) => [
              key,
              Boolean(value)
            ])
          )
        : {},
    attachments:
      attachments && typeof attachments === 'object'
        ? (attachments as Record<string, unknown>)
        : {},
    commentThreads:
      commentThreads && typeof commentThreads === 'object'
        ? (commentThreads as Record<string, unknown>)
        : {}
  }
}

function mapSharedDraftResponse(row: SharedDraftRow | null, workflowId: number) {
  const empty = emptySharedDraft()
  if (!row) {
    return {
      workflowId,
      sections: empty.sections,
      reviewChecklist: empty.reviewChecklist,
      attachments: empty.attachments,
      commentThreads: empty.commentThreads,
      version: 0,
      updatedAt: null,
      updatedBy: null,
      lockSessionId: null,
      lockExpiresAt: null,
      metadata: {}
    }
  }

  const state = (row.state as SharedDraftPayload) ?? empty

  return {
    workflowId: row.workflowId,
    sections: state.sections ?? empty.sections,
    reviewChecklist: state.reviewChecklist ?? empty.reviewChecklist,
    attachments: state.attachments ?? empty.attachments,
    commentThreads: state.commentThreads ?? empty.commentThreads,
    version: row.version ?? 0,
    updatedAt: toIso(row.updatedAt),
    updatedBy: row.updatedBy ?? null,
    lockSessionId: row.lockSessionId ?? null,
    lockExpiresAt: toIso(row.lockExpiresAt),
    metadata: (row.metadata as Record<string, unknown>) ?? {}
  }
}

function normaliseSuggestionStatus(status: unknown): SuggestionStatus | null {
  if (typeof status !== 'string') return null
  const trimmed = status.trim().toLowerCase()
  return SUGGESTION_STATUSES.includes(trimmed as SuggestionStatus)
    ? (trimmed as SuggestionStatus)
    : null
}

function mapSuggestionResponse(row: SuggestionRow) {
  return {
    id: row.id,
    workflowId: row.workflowId,
    sectionId: row.sectionId,
    authorId: row.authorId ?? null,
    authorName: row.authorName ?? null,
    summary: row.summary ?? null,
    beforeText: row.beforeText ?? null,
    afterText: row.afterText ?? null,
    status: row.status as SuggestionStatus,
    createdAt: toIso(row.createdAt),
    resolvedAt: toIso(row.resolvedAt),
    resolvedBy: row.resolvedBy ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {}
  }
}

async function recordAuditEvent(options: {
  database: DatabaseClient
  workflowId: number
  eventType: string
  actorId?: number | null
  actorName?: string | null
  payload?: Record<string, unknown>
}) {
  try {
    await options.database.insert(workflowAuditEvents).values({
      workflowId: options.workflowId,
      stageSlug: 'memo',
      eventType: options.eventType,
      actorId: options.actorId ?? null,
      actorName: options.actorName ?? null,
      actorRole: 'analyst',
      payload: options.payload ?? {},
      visibleToRoles: ['analyst', 'reviewer']
    })
  } catch (error) {
    log('memo-shared:audit-failed', {
      workflowId: options.workflowId,
      eventType: options.eventType,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

export function createMemoSharedRouter({
  database = db as DatabaseClient | null
}: MemoSharedRouterOptions = {}) {
  const router = Router()
  router.use(optionalAuth)

  router.get('/:workflowId/shared-draft', async (req, res) => {
    try {
      if (!database) {
        return res.status(503).json({ error: 'Database unavailable' })
      }
      const workflowId = parseWorkflowId(req.params.workflowId)
      if (!workflowId) {
        return res.status(400).json({ error: 'Invalid workflow id' })
      }

      const row = await database.query?.workflowMemoSharedDrafts?.findFirst({
        where: (drafts: typeof workflowMemoSharedDrafts) => eq(drafts.workflowId, workflowId)
      })

      res.json({ draft: mapSharedDraftResponse(row ?? null, workflowId) })
    } catch (error) {
      console.error('Failed to fetch shared memo draft', error)
      res.status(500).json({ error: 'Failed to fetch shared memo draft' })
    }
  })

  router.put('/:workflowId/shared-draft', async (req: AuthenticatedRequest, res) => {
    try {
      if (!database) {
        return res.status(503).json({ error: 'Database unavailable' })
      }

      const workflowId = parseWorkflowId(req.params.workflowId)
      if (!workflowId) {
        return res.status(400).json({ error: 'Invalid workflow id' })
      }

      const payload = sanitiseSharedDraft(req.body)
      const version = typeof req.body?.version === 'number' ? req.body.version : 0
      const updatedBy =
        typeof req.body?.updatedBy === 'number' && Number.isFinite(req.body.updatedBy)
          ? req.body.updatedBy
          : undefined
      const lockSessionId =
        typeof req.body?.lockSessionId === 'string' && req.body.lockSessionId.trim().length > 0
          ? req.body.lockSessionId.trim()
          : undefined
      const lockExpiresAt =
        typeof req.body?.lockExpiresAt === 'string' ? new Date(req.body.lockExpiresAt) : undefined
      const metadata =
        req.body?.metadata && typeof req.body.metadata === 'object'
          ? (req.body.metadata as Record<string, unknown>)
          : undefined

      const existing = await database.query?.workflowMemoSharedDrafts?.findFirst({
        where: (drafts: typeof workflowMemoSharedDrafts) => eq(drafts.workflowId, workflowId)
      })

      const now = new Date()

      if (existing) {
        if (version !== existing.version) {
          return res
            .status(409)
            .json({
              error: 'Version conflict',
              draft: mapSharedDraftResponse(existing, workflowId)
            })
        }

        const nextVersion = existing.version + 1
        const updatedRows = await database
          .update(workflowMemoSharedDrafts)
          .set({
            state: payload,
            version: nextVersion,
            updatedAt: now,
            updatedBy: updatedBy ?? null,
            lockSessionId: lockSessionId ?? existing.lockSessionId ?? null,
            lockExpiresAt:
              lockExpiresAt instanceof Date && !Number.isNaN(lockExpiresAt.getTime())
                ? lockExpiresAt
                : (existing.lockExpiresAt ?? null),
            metadata: metadata ?? (existing.metadata as Record<string, unknown>) ?? {}
          })
          .where(eq(workflowMemoSharedDrafts.workflowId, workflowId))
          .returning()

        const updated = updatedRows?.[0]
        if (!updated) {
          return res.status(500).json({ error: 'Failed to update shared memo draft' })
        }

        return res.json({ draft: mapSharedDraftResponse(updated, workflowId) })
      }

      const insertedRows = await database
        .insert(workflowMemoSharedDrafts)
        .values({
          workflowId,
          state: payload,
          version: 1,
          updatedAt: now,
          updatedBy: updatedBy ?? null,
          lockSessionId: lockSessionId ?? null,
          lockExpiresAt:
            lockExpiresAt instanceof Date && !Number.isNaN(lockExpiresAt.getTime())
              ? lockExpiresAt
              : null,
          metadata: metadata ?? {}
        })
        .returning()

      const created = insertedRows?.[0]
      if (!created) {
        return res.status(500).json({ error: 'Failed to persist shared memo draft' })
      }

      res.status(201).json({ draft: mapSharedDraftResponse(created, workflowId) })
    } catch (error) {
      console.error('Failed to persist shared memo draft', error)
      res.status(500).json({ error: 'Failed to persist shared memo draft' })
    }
  })

  router.get('/:workflowId/suggestions', async (req, res) => {
    try {
      if (!database) {
        return res.status(503).json({ error: 'Database unavailable' })
      }

      const workflowId = parseWorkflowId(req.params.workflowId)
      if (!workflowId) {
        return res.status(400).json({ error: 'Invalid workflow id' })
      }

      const statusFilter = normaliseSuggestionStatus(req.query.status)
      const rows = await database.query?.workflowMemoSuggestions?.findMany({
        where: (suggestions: typeof workflowMemoSuggestions) =>
          statusFilter
            ? and(eq(suggestions.workflowId, workflowId), eq(suggestions.status, statusFilter))
            : eq(suggestions.workflowId, workflowId),
        orderBy: (suggestions: typeof workflowMemoSuggestions) => [desc(suggestions.createdAt)]
      })

      const suggestions = (rows ?? []).map(mapSuggestionResponse)
      res.json({ suggestions })
    } catch (error) {
      console.error('Failed to fetch memo suggestions', error)
      res.status(500).json({ error: 'Failed to fetch memo suggestions' })
    }
  })

  router.post('/:workflowId/suggestions', async (req: AuthenticatedRequest, res) => {
    try {
      if (!database) {
        return res.status(503).json({ error: 'Database unavailable' })
      }

      const workflowId = parseWorkflowId(req.params.workflowId)
      if (!workflowId) {
        return res.status(400).json({ error: 'Invalid workflow id' })
      }

      const sectionId = typeof req.body?.sectionId === 'string' ? req.body.sectionId.trim() : ''
      if (!sectionId) {
        return res.status(400).json({ error: 'sectionId is required' })
      }

      const status = normaliseSuggestionStatus(req.body?.status) ?? 'pending'
      const authorId =
        typeof req.body?.authorId === 'number' && Number.isFinite(req.body.authorId)
          ? req.body.authorId
          : undefined
      const authorName =
        typeof req.body?.authorName === 'string' ? req.body.authorName.trim() : req.user?.username
      const summary = typeof req.body?.summary === 'string' ? req.body.summary.trim() : undefined
      const beforeText = typeof req.body?.beforeText === 'string' ? req.body.beforeText : undefined
      const afterText = typeof req.body?.afterText === 'string' ? req.body.afterText : undefined
      const metadata =
        req.body?.metadata && typeof req.body.metadata === 'object'
          ? (req.body.metadata as Record<string, unknown>)
          : {}

      const inserted = await database
        .insert(workflowMemoSuggestions)
        .values({
          workflowId,
          sectionId,
          authorId: authorId ?? null,
          authorName: authorName ?? null,
          summary: summary ?? null,
          beforeText: beforeText ?? null,
          afterText: afterText ?? null,
          status,
          metadata
        })
        .returning()

      const created = inserted?.[0]
      if (!created) {
        return res.status(500).json({ error: 'Failed to create memo suggestion' })
      }

      const suggestion = mapSuggestionResponse(created)

      await recordAuditEvent({
        database,
        workflowId,
        eventType: 'memo_suggestion_created',
        actorId: authorId ?? null,
        actorName: authorName ?? null,
        payload: {
          suggestionId: suggestion.id,
          sectionId: suggestion.sectionId,
          status: suggestion.status
        }
      })

      res.status(201).json({ suggestion })
    } catch (error) {
      console.error('Failed to create memo suggestion', error)
      res.status(500).json({ error: 'Failed to create memo suggestion' })
    }
  })

  router.patch('/:workflowId/suggestions/:suggestionId', async (req: AuthenticatedRequest, res) => {
    try {
      if (!database) {
        return res.status(503).json({ error: 'Database unavailable' })
      }

      const workflowId = parseWorkflowId(req.params.workflowId)
      const suggestionId = parseWorkflowId(req.params.suggestionId)
      if (!workflowId || !suggestionId) {
        return res.status(400).json({ error: 'Invalid identifiers' })
      }

      const status = normaliseSuggestionStatus(req.body?.status)
      const metadata =
        req.body?.metadata && typeof req.body.metadata === 'object'
          ? (req.body.metadata as Record<string, unknown>)
          : undefined
      const actorId =
        typeof req.body?.actorId === 'number' && Number.isFinite(req.body.actorId)
          ? req.body.actorId
          : undefined
      const actorName =
        typeof req.body?.actorName === 'string' ? req.body.actorName.trim() : req.user?.username

      if (!status && metadata === undefined) {
        return res.status(400).json({ error: 'No updates provided' })
      }

      const existing = await database.query?.workflowMemoSuggestions?.findFirst({
        where: (suggestions: typeof workflowMemoSuggestions) =>
          and(eq(suggestions.workflowId, workflowId), eq(suggestions.id, suggestionId))
      })

      if (!existing) {
        return res.status(404).json({ error: 'Suggestion not found' })
      }

      const patch: Partial<typeof workflowMemoSuggestions.$inferInsert> = {}
      if (status) {
        patch.status = status
        if (status === 'accepted' || status === 'rejected') {
          patch.resolvedAt = new Date()
          patch.resolvedBy = actorId ?? null
        } else {
          patch.resolvedAt = null
          patch.resolvedBy = null
        }
      }
      if (metadata) {
        patch.metadata = metadata
      }

      const updatedRows = await database
        .update(workflowMemoSuggestions)
        .set(patch)
        .where(
          and(
            eq(workflowMemoSuggestions.workflowId, workflowId),
            eq(workflowMemoSuggestions.id, suggestionId)
          )
        )
        .returning()

      const updated = updatedRows?.[0]
      if (!updated) {
        return res.status(500).json({ error: 'Failed to update memo suggestion' })
      }

      const suggestion = mapSuggestionResponse(updated)

      if (status) {
        await recordAuditEvent({
          database,
          workflowId,
          eventType: 'memo_suggestion_updated',
          actorId: actorId ?? null,
          actorName: actorName ?? null,
          payload: {
            suggestionId: suggestion.id,
            status: suggestion.status
          }
        })
      }

      res.json({ suggestion })
    } catch (error) {
      console.error('Failed to update memo suggestion', error)
      res.status(500).json({ error: 'Failed to update memo suggestion' })
    }
  })

  router.delete('/:workflowId/suggestions', async (req: AuthenticatedRequest, res) => {
    try {
      if (!database) {
        return res.status(503).json({ error: 'Database unavailable' })
      }

      const workflowId = parseWorkflowId(req.params.workflowId)
      if (!workflowId) {
        return res.status(400).json({ error: 'Invalid workflow id' })
      }

      const idsRaw = req.body?.ids
      if (!Array.isArray(idsRaw) || idsRaw.length === 0) {
        return res.status(400).json({ error: 'ids array required' })
      }

      const ids = idsRaw
        .map((value: unknown) =>
          typeof value === 'number' && Number.isFinite(value)
            ? Math.floor(value)
            : typeof value === 'string'
              ? parseInt(value, 10)
              : NaN
        )
        .filter((value: number) => Number.isFinite(value) && value > 0)

      if (ids.length === 0) {
        return res.status(400).json({ error: 'No valid suggestion ids provided' })
      }

      await database
        .delete(workflowMemoSuggestions)
        .where(
          and(
            eq(workflowMemoSuggestions.workflowId, workflowId),
            inArray(workflowMemoSuggestions.id, ids)
          )
        )

      res.status(204).end()
    } catch (error) {
      console.error('Failed to delete memo suggestions', error)
      res.status(500).json({ error: 'Failed to delete memo suggestions' })
    }
  })

  return router
}

const memoSharedRouter = createMemoSharedRouter()
export default memoSharedRouter
