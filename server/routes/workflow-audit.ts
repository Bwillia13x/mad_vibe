import { Router } from 'express'
import { optionalAuth, type AuthenticatedRequest } from '../middleware/auth'
import { db } from '../../lib/db'
import { workflowReviewerAssignments, workflowAuditEvents } from '../../lib/db/schema'
import { and, desc, eq, gte, inArray, isNull, isNotNull, lte } from 'drizzle-orm'
import type { InferModel } from 'drizzle-orm'
import { log } from '../../lib/log'

const ASSIGNMENT_STATUSES = ['pending', 'in_review', 'approved', 'rejected', 'cancelled'] as const

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 200

export type ReviewerAssignmentRow = typeof workflowReviewerAssignments.$inferSelect
export type ReviewerAssignmentInsert = typeof workflowReviewerAssignments.$inferInsert
export type AuditEventRow = typeof workflowAuditEvents.$inferSelect
export type AuditEventInsert = typeof workflowAuditEvents.$inferInsert

type DatabaseClient = typeof db

type ReviewerAssignmentResponse = ReturnType<typeof mapAssignmentResponse>
type AuditEventResponse = ReturnType<typeof mapAuditEventResponse>

type WorkflowAuditRouterOptions = {
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

function normaliseStatus(status: unknown): ReviewerAssignmentRow['status'] | null {
  if (typeof status !== 'string') return null
  const trimmed = status.trim().toLowerCase()
  return ASSIGNMENT_STATUSES.includes(trimmed as (typeof ASSIGNMENT_STATUSES)[number])
    ? (trimmed as ReviewerAssignmentRow['status'])
    : null
}

function mapAssignmentResponse(row: ReviewerAssignmentRow) {
  return {
    id: row.id,
    workflowId: row.workflowId,
    stageSlug: row.stageSlug,
    reviewerId: row.reviewerId ?? null,
    reviewerEmail: row.reviewerEmail ?? null,
    reviewerName: row.reviewerName ?? null,
    status: row.status,
    assignedBy: row.assignedBy ?? null,
    assignedByName: row.assignedByName ?? null,
    assignedAt: toIso(row.assignedAt),
    dueAt: toIso(row.dueAt),
    acknowledgedAt: toIso(row.acknowledgedAt),
    acknowledgedBy: row.acknowledgedBy ?? null,
    completedAt: toIso(row.completedAt),
    reminderCount: row.reminderCount ?? 0,
    lastReminderAt: toIso(row.lastReminderAt),
    notes: row.notes ?? null,
    metadata: row.metadata ?? {}
  }
}

function mapAuditEventResponse(row: AuditEventRow) {
  return {
    id: row.id,
    workflowId: row.workflowId,
    stageSlug: row.stageSlug ?? null,
    eventType: row.eventType,
    actorId: row.actorId ?? null,
    actorName: row.actorName ?? null,
    actorRole: row.actorRole ?? null,
    payload: row.payload ?? {},
    reviewerAssignmentId: row.reviewerAssignmentId ?? null,
    createdAt: toIso(row.createdAt),
    acknowledgedAt: toIso(row.acknowledgedAt),
    acknowledgedBy: row.acknowledgedBy ?? null,
    acknowledgementNote: row.acknowledgementNote ?? null,
    metadata: row.metadata ?? {}
  }
}

async function insertAuditEvent(
  database: DatabaseClient,
  input: Partial<AuditEventInsert> & {
    workflowId: number
    eventType: string
  }
) {
  const payload: AuditEventInsert = {
    workflowId: input.workflowId,
    stageSlug: input.stageSlug ?? null,
    eventType: input.eventType,
    actorId: input.actorId ?? null,
    actorName: input.actorName ?? null,
    actorRole: input.actorRole ?? null,
    payload: input.payload ?? {},
    reviewerAssignmentId: input.reviewerAssignmentId ?? null,
    acknowledgedAt: input.acknowledgedAt ?? null,
    acknowledgedBy: input.acknowledgedBy ?? null,
    acknowledgementNote: input.acknowledgementNote ?? null,
    metadata: input.metadata ?? {}
  }

  try {
    await database.insert(workflowAuditEvents).values(payload)
  } catch (error) {
    log('workflow-audit:failed-to-insert-event', {
      workflowId: input.workflowId,
      eventType: input.eventType,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

export function createWorkflowAuditRouter({
  database = db as DatabaseClient | null
}: WorkflowAuditRouterOptions = {}) {
  const router = Router()
  router.use(optionalAuth)

  router.get('/:workflowId/reviewer-assignments', async (req, res) => {
    try {
      if (!database) {
        return res.status(503).json({ error: 'Database unavailable' })
      }

      const workflowId = parseWorkflowId(req.params.workflowId)
      if (!workflowId) {
        return res.status(400).json({ error: 'Invalid workflow id' })
      }

      const stageSlug = typeof req.query.stageSlug === 'string' ? req.query.stageSlug.trim() : null
      const statusesParam = typeof req.query.status === 'string' ? req.query.status : undefined
      const statuses = statusesParam
        ? statusesParam
            .split(',')
            .map((s) => normaliseStatus(s))
            .filter((status): status is ReviewerAssignmentRow['status'] => Boolean(status))
        : undefined
      const reviewerIdParam =
        typeof req.query.reviewerId === 'string' ? req.query.reviewerId : undefined
      const reviewerId = reviewerIdParam ? parseInt(reviewerIdParam, 10) : undefined
      const includeCancelled = req.query.includeCancelled === 'true'
      const dueBefore =
        typeof req.query.dueBefore === 'string' ? new Date(req.query.dueBefore) : undefined
      const dueAfter =
        typeof req.query.dueAfter === 'string' ? new Date(req.query.dueAfter) : undefined

      const limitParam =
        typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : undefined
      const limit = Math.min(Math.max(limitParam ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE)
      const offsetParam = typeof req.query.offset === 'string' ? parseInt(req.query.offset, 10) : 0
      const offset = Math.max(offsetParam, 0)

      const rows = await database.query?.workflowReviewerAssignments?.findMany({
        where: (assignments: typeof workflowReviewerAssignments) => {
          const clauses = [eq(assignments.workflowId, workflowId)]
          if (stageSlug) {
            clauses.push(eq(assignments.stageSlug, stageSlug))
          }
          if (statuses && statuses.length > 0) {
            clauses.push(inArray(assignments.status, statuses))
          } else if (!includeCancelled) {
            clauses.push(
              inArray(
                assignments.status,
                ASSIGNMENT_STATUSES.filter((status) => status !== 'cancelled')
              )
            )
          }
          if (Number.isFinite(reviewerId)) {
            clauses.push(eq(assignments.reviewerId, reviewerId as number))
          }
          if (dueBefore instanceof Date && !Number.isNaN(dueBefore.getTime())) {
            clauses.push(lte(assignments.dueAt, dueBefore))
          }
          if (dueAfter instanceof Date && !Number.isNaN(dueAfter.getTime())) {
            clauses.push(gte(assignments.dueAt, dueAfter))
          }
          return and(...clauses)
        },
        orderBy: (assignments: typeof workflowReviewerAssignments) => [
          desc(assignments.assignedAt ?? assignments.id)
        ],
        limit,
        offset
      })

      const assignments = (rows ?? []).map(mapAssignmentResponse)
      res.json({ assignments, limit, offset })
    } catch (error) {
      console.error('Failed to list reviewer assignments', error)
      res.status(500).json({ error: 'Failed to fetch reviewer assignments' })
    }
  })

  router.post('/:workflowId/reviewer-assignments', async (req: AuthenticatedRequest, res) => {
    try {
      if (!database) {
        return res.status(503).json({ error: 'Database unavailable' })
      }

      const workflowId = parseWorkflowId(req.params.workflowId)
      if (!workflowId) {
        return res.status(400).json({ error: 'Invalid workflow id' })
      }

      const stageSlugRaw = req.body?.stageSlug
      if (typeof stageSlugRaw !== 'string' || stageSlugRaw.trim() === '') {
        return res.status(400).json({ error: 'stageSlug is required' })
      }
      const stageSlug = stageSlugRaw.trim()

      const reviewerName =
        typeof req.body?.reviewerName === 'string' ? req.body.reviewerName.trim() : undefined
      const reviewerEmail =
        typeof req.body?.reviewerEmail === 'string' ? req.body.reviewerEmail.trim() : undefined
      const reviewerId =
        typeof req.body?.reviewerId === 'number' && Number.isFinite(req.body.reviewerId)
          ? req.body.reviewerId
          : undefined
      const status = normaliseStatus(req.body?.status) ?? 'pending'
      const dueAt = typeof req.body?.dueAt === 'string' ? new Date(req.body.dueAt) : undefined
      const assignedBy =
        typeof req.body?.assignedBy === 'number' && Number.isFinite(req.body.assignedBy)
          ? req.body.assignedBy
          : undefined
      const assignedByName =
        typeof req.body?.assignedByName === 'string'
          ? req.body.assignedByName.trim()
          : (req.user?.username ?? null)
      const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : undefined
      const metadata =
        req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : undefined

      const assignmentPayload: ReviewerAssignmentInsert = {
        workflowId,
        stageSlug,
        reviewerId: reviewerId ?? null,
        reviewerEmail: reviewerEmail ?? null,
        reviewerName: reviewerName ?? null,
        status,
        assignedBy: assignedBy ?? null,
        assignedByName: assignedByName ?? null,
        dueAt: dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : null,
        notes: notes ?? null,
        metadata: metadata ?? {}
      }

      const inserted = await database
        .insert(workflowReviewerAssignments)
        .values(assignmentPayload)
        .returning()

      const created = inserted?.[0]
      if (!created) {
        return res.status(500).json({ error: 'Failed to create assignment' })
      }

      await insertAuditEvent(database, {
        workflowId,
        stageSlug,
        eventType: 'assignment_created',
        actorId: assignedBy ?? null,
        actorName: assignedByName ?? null,
        actorRole: 'analyst',
        reviewerAssignmentId: created.id,
        payload: {
          reviewerId: created.reviewerId,
          reviewerEmail: created.reviewerEmail,
          reviewerName: created.reviewerName,
          status: created.status,
          dueAt: toIso(created.dueAt)
        }
      })

      res.status(201).json({ assignment: mapAssignmentResponse(created) })
    } catch (error) {
      console.error('Failed to create reviewer assignment', error)
      res.status(500).json({ error: 'Failed to create reviewer assignment' })
    }
  })

  router.patch(
    '/:workflowId/reviewer-assignments/:assignmentId',
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!database) {
          return res.status(503).json({ error: 'Database unavailable' })
        }

        const workflowId = parseWorkflowId(req.params.workflowId)
        const assignmentId = parseWorkflowId(req.params.assignmentId)
        if (!workflowId || !assignmentId) {
          return res.status(400).json({ error: 'Invalid identifiers' })
        }

        const existing = await database.query?.workflowReviewerAssignments?.findFirst({
          where: (assignments: typeof workflowReviewerAssignments) =>
            and(eq(assignments.workflowId, workflowId), eq(assignments.id, assignmentId))
        })

        if (!existing) {
          return res.status(404).json({ error: 'Assignment not found' })
        }

        const patch: Partial<ReviewerAssignmentInsert> = {}
        const requestedStatus = normaliseStatus(req.body?.status)
        const sendReminder = req.body?.sendReminder === true
        const reviewerName =
          typeof req.body?.reviewerName === 'string' ? req.body.reviewerName.trim() : undefined
        const reviewerEmail =
          typeof req.body?.reviewerEmail === 'string' ? req.body.reviewerEmail.trim() : undefined
        const reviewerId =
          typeof req.body?.reviewerId === 'number' && Number.isFinite(req.body.reviewerId)
            ? req.body.reviewerId
            : undefined
        const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : undefined
        const dueAt = typeof req.body?.dueAt === 'string' ? new Date(req.body.dueAt) : undefined
        const acknowledged = req.body?.acknowledged === true
        const actorName =
          typeof req.body?.actorName === 'string' ? req.body.actorName.trim() : undefined
        const actorId =
          typeof req.body?.actorId === 'number' && Number.isFinite(req.body.actorId)
            ? req.body.actorId
            : undefined
        const metadata =
          req.body?.metadata && typeof req.body.metadata === 'object'
            ? req.body.metadata
            : undefined

        if (requestedStatus && requestedStatus !== existing.status) {
          patch.status = requestedStatus
        }
        if (reviewerName !== undefined) {
          patch.reviewerName = reviewerName || null
        }
        if (reviewerEmail !== undefined) {
          patch.reviewerEmail = reviewerEmail || null
        }
        if (reviewerId !== undefined) {
          patch.reviewerId = reviewerId
        }
        if (notes !== undefined) {
          patch.notes = notes || null
        }
        if (metadata !== undefined) {
          patch.metadata = metadata
        }
        if (dueAt instanceof Date && !Number.isNaN(dueAt.getTime())) {
          patch.dueAt = dueAt
        }
        if (acknowledged) {
          patch.acknowledgedAt = new Date()
          patch.acknowledgedBy = actorId ?? null
        }
        if (requestedStatus === 'approved' || requestedStatus === 'rejected') {
          patch.completedAt = new Date()
        }
        if (sendReminder) {
          patch.reminderCount = (existing.reminderCount ?? 0) + 1
          patch.lastReminderAt = new Date()
        }

        if (Object.keys(patch).length === 0) {
          return res.json({ assignment: mapAssignmentResponse(existing) })
        }

        const updatedRows = await database
          .update(workflowReviewerAssignments)
          .set(patch)
          .where(
            and(
              eq(workflowReviewerAssignments.workflowId, workflowId),
              eq(workflowReviewerAssignments.id, assignmentId)
            )
          )
          .returning()

        const updated = updatedRows?.[0]
        if (!updated) {
          return res.status(500).json({ error: 'Failed to update assignment' })
        }

        if (requestedStatus && requestedStatus !== existing.status) {
          await insertAuditEvent(database, {
            workflowId,
            stageSlug: updated.stageSlug,
            eventType: 'assignment_status_changed',
            actorId: actorId ?? null,
            actorName: actorName ?? req.user?.username ?? null,
            actorRole: 'analyst',
            reviewerAssignmentId: updated.id,
            payload: {
              from: existing.status,
              to: requestedStatus
            }
          })
        }

        if (sendReminder) {
          await insertAuditEvent(database, {
            workflowId,
            stageSlug: updated.stageSlug,
            eventType: 'assignment_reminder',
            actorId: actorId ?? null,
            actorName: actorName ?? req.user?.username ?? null,
            actorRole: 'analyst',
            reviewerAssignmentId: updated.id,
            payload: {
              reminderCount: updated.reminderCount,
              recipient: updated.reviewerEmail ?? updated.reviewerName
            }
          })
        }

        if (acknowledged) {
          await insertAuditEvent(database, {
            workflowId,
            stageSlug: updated.stageSlug,
            eventType: 'assignment_acknowledged',
            actorId: actorId ?? null,
            actorName: actorName ?? req.user?.username ?? null,
            actorRole: 'reviewer',
            reviewerAssignmentId: updated.id,
            payload: {
              acknowledgedAt: toIso(updated.acknowledgedAt)
            }
          })
        }

        res.json({ assignment: mapAssignmentResponse(updated) })
      } catch (error) {
        console.error('Failed to update reviewer assignment', error)
        res.status(500).json({ error: 'Failed to update reviewer assignment' })
      }
    }
  )

  router.get('/:workflowId/audit/events', async (req, res) => {
    try {
      if (!database) {
        return res.status(503).json({ error: 'Database unavailable' })
      }

      const workflowId = parseWorkflowId(req.params.workflowId)
      if (!workflowId) {
        return res.status(400).json({ error: 'Invalid workflow id' })
      }

      const stageSlug = typeof req.query.stageSlug === 'string' ? req.query.stageSlug.trim() : null
      const eventType = typeof req.query.eventType === 'string' ? req.query.eventType.trim() : null
      const assignmentIdParam =
        typeof req.query.reviewerAssignmentId === 'string'
          ? req.query.reviewerAssignmentId
          : undefined
      const reviewerAssignmentId = assignmentIdParam ? parseInt(assignmentIdParam, 10) : undefined
      const acknowledged =
        typeof req.query.acknowledged === 'string' ? req.query.acknowledged === 'true' : undefined
      const createdAfter =
        typeof req.query.createdAfter === 'string' ? new Date(req.query.createdAfter) : undefined
      const createdBefore =
        typeof req.query.createdBefore === 'string' ? new Date(req.query.createdBefore) : undefined
      const exportCsv = req.query.export === 'csv'

      const limitParam =
        typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : undefined
      const limit = Math.min(Math.max(limitParam ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE)
      const offsetParam = typeof req.query.offset === 'string' ? parseInt(req.query.offset, 10) : 0
      const offset = Math.max(offsetParam, 0)

      const rows = await database.query?.workflowAuditEvents?.findMany({
        where: (events: typeof workflowAuditEvents) => {
          const clauses = [eq(events.workflowId, workflowId)]
          if (stageSlug) {
            clauses.push(eq(events.stageSlug, stageSlug))
          }
          if (eventType) {
            clauses.push(eq(events.eventType, eventType))
          }
          if (Number.isFinite(reviewerAssignmentId)) {
            clauses.push(eq(events.reviewerAssignmentId, reviewerAssignmentId as number))
          }
          if (acknowledged === true) {
            clauses.push(isNotNull(events.acknowledgedAt))
          } else if (acknowledged === false) {
            clauses.push(isNull(events.acknowledgedAt))
          }
          if (createdAfter instanceof Date && !Number.isNaN(createdAfter.getTime())) {
            clauses.push(gte(events.createdAt, createdAfter))
          }
          if (createdBefore instanceof Date && !Number.isNaN(createdBefore.getTime())) {
            clauses.push(lte(events.createdAt, createdBefore))
          }
          return and(...clauses)
        },
        orderBy: (events: typeof workflowAuditEvents) => [desc(events.createdAt ?? events.id)],
        limit,
        offset
      })

      const events = (rows ?? []).map(mapAuditEventResponse)

      if (exportCsv) {
        const header = [
          'id',
          'workflowId',
          'stageSlug',
          'eventType',
          'actorName',
          'actorRole',
          'createdAt',
          'acknowledgedAt',
          'acknowledgedBy',
          'reviewerAssignmentId',
          'payload'
        ]
        const csv = [header.join(',')]
        for (const event of events) {
          csv.push(
            [
              event.id,
              event.workflowId,
              event.stageSlug ?? '',
              event.eventType,
              event.actorName ?? '',
              event.actorRole ?? '',
              event.createdAt ?? '',
              event.acknowledgedAt ?? '',
              event.acknowledgedBy ?? '',
              event.reviewerAssignmentId ?? '',
              JSON.stringify(event.payload ?? {})?.replace(/"/g, '""')
            ].join(',')
          )
        }
        res.setHeader('Content-Type', 'text/csv')
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="workflow-${workflowId}-audit.csv"`
        )
        res.send(csv.join('\n'))
        return
      }

      res.json({ events, limit, offset })
    } catch (error) {
      console.error('Failed to fetch audit events', error)
      res.status(500).json({ error: 'Failed to fetch audit events' })
    }
  })

  router.post('/:workflowId/audit/events', async (req: AuthenticatedRequest, res) => {
    try {
      if (!database) {
        return res.status(503).json({ error: 'Database unavailable' })
      }

      const workflowId = parseWorkflowId(req.params.workflowId)
      if (!workflowId) {
        return res.status(400).json({ error: 'Invalid workflow id' })
      }

      const eventType = typeof req.body?.eventType === 'string' ? req.body.eventType.trim() : null
      if (!eventType) {
        return res.status(400).json({ error: 'eventType is required' })
      }

      const stageSlug =
        typeof req.body?.stageSlug === 'string' ? req.body.stageSlug.trim() : undefined
      const actorName =
        typeof req.body?.actorName === 'string' ? req.body.actorName.trim() : req.user?.username
      const actorRole =
        typeof req.body?.actorRole === 'string' ? req.body.actorRole.trim() : undefined
      const actorId =
        typeof req.body?.actorId === 'number' && Number.isFinite(req.body.actorId)
          ? req.body.actorId
          : undefined
      const reviewerAssignmentId =
        typeof req.body?.reviewerAssignmentId === 'number' &&
        Number.isFinite(req.body.reviewerAssignmentId)
          ? req.body.reviewerAssignmentId
          : undefined
      const payload =
        req.body?.payload && typeof req.body.payload === 'object' ? req.body.payload : undefined
      const metadata =
        req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : undefined

      const insertPayload: AuditEventInsert = {
        workflowId,
        stageSlug: stageSlug ?? null,
        eventType,
        actorId: actorId ?? null,
        actorName: actorName ?? null,
        actorRole: actorRole ?? null,
        payload: payload ?? {},
        reviewerAssignmentId: reviewerAssignmentId ?? null,
        metadata: metadata ?? {}
      }

      const inserted = await database.insert(workflowAuditEvents).values(insertPayload).returning()
      const created = inserted?.[0]
      if (!created) {
        return res.status(500).json({ error: 'Failed to create audit event' })
      }

      res.status(201).json({ event: mapAuditEventResponse(created) })
    } catch (error) {
      console.error('Failed to create audit event', error)
      res.status(500).json({ error: 'Failed to create audit event' })
    }
  })

  router.post(
    '/:workflowId/audit/events/:eventId/acknowledge',
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!database) {
          return res.status(503).json({ error: 'Database unavailable' })
        }

        const workflowId = parseWorkflowId(req.params.workflowId)
        const eventId = parseWorkflowId(req.params.eventId)
        if (!workflowId || !eventId) {
          return res.status(400).json({ error: 'Invalid identifiers' })
        }

        const actorId =
          typeof req.body?.actorId === 'number' && Number.isFinite(req.body.actorId)
            ? req.body.actorId
            : undefined
        const actorName =
          typeof req.body?.actorName === 'string' ? req.body.actorName.trim() : undefined
        const acknowledgementNote =
          typeof req.body?.acknowledgementNote === 'string'
            ? req.body.acknowledgementNote.trim()
            : undefined

        const updatedRows = await database
          .update(workflowAuditEvents)
          .set({
            acknowledgedAt: new Date(),
            acknowledgedBy: actorId ?? null,
            acknowledgementNote: acknowledgementNote ?? null
          })
          .where(
            and(eq(workflowAuditEvents.workflowId, workflowId), eq(workflowAuditEvents.id, eventId))
          )
          .returning()

        const updated = updatedRows?.[0]
        if (!updated) {
          return res.status(404).json({ error: 'Audit event not found' })
        }

        await insertAuditEvent(database, {
          workflowId,
          stageSlug: updated.stageSlug ?? undefined,
          eventType: 'audit_event_acknowledged',
          actorId: actorId ?? null,
          actorName: actorName ?? req.user?.username ?? null,
          actorRole: 'reviewer',
          payload: {
            acknowledgedEventId: updated.id,
            note: acknowledgementNote ?? null
          }
        })

        res.json({ event: mapAuditEventResponse(updated) })
      } catch (error) {
        console.error('Failed to acknowledge audit event', error)
        res.status(500).json({ error: 'Failed to acknowledge audit event' })
      }
    }
  )

  return router
}

const workflowAuditRouter = createWorkflowAuditRouter()
export default workflowAuditRouter
