import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express from 'express'
import type { AddressInfo } from 'node:net'
import { createWorkflowAuditRouter } from '../../../server/routes/workflow-audit'
import { workflowReviewerAssignments, workflowAuditEvents } from '../../../lib/db/schema'
import type { ReviewerAssignmentStatus } from '@shared/types'

process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://valor_user:valorpass@localhost:5432/valor_vibe'
process.env.ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'test-admin-token'

vi.mock(new URL('../../../lib/db/index.ts', import.meta.url).pathname, () => ({
  db: {}
}))

vi.mock('../../../lib/db', () => ({
  db: {}
}))

const ADMIN_HEADERS = {
  Authorization: 'Bearer test-admin-token'
}

type MockInsertReturn<T> = {
  values: (value: T) => {
    returning: () => Promise<T[]>
  }
}

type MockUpdateReturn<T> = {
  set: (value: Partial<T>) => {
    where: () => {
      returning: () => Promise<T[]>
    }
  }
}

const performRequest = async (
  app: express.Express,
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>
) => {
  return await new Promise<{ status: number; body: any }>((resolve, reject) => {
    const server = app.listen(0, async () => {
      const { port } = server.address() as AddressInfo
      try {
        const response = await fetch(`http://127.0.0.1:${port}${path}`, {
          method,
          headers: {
            ...ADMIN_HEADERS,
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(headers ?? {})
          },
          body: body ? JSON.stringify(body) : undefined
        })
        const text = await response.text()
        let data: any = undefined
        if (text) {
          try {
            data = JSON.parse(text)
          } catch {
            data = text
          }
        }
        resolve({ status: response.status, body: data })
      } catch (error) {
        reject(error)
      } finally {
        server.close()
      }
    })
  })
}

describe('Workflow audit & reviewer assignment API', () => {
  let app: express.Express
  let insertMock: ReturnType<typeof vi.fn>
  let updateMock: ReturnType<typeof vi.fn>
  let assignmentFindMany: ReturnType<typeof vi.fn>
  let assignmentFindFirst: ReturnType<typeof vi.fn>
  let eventsFindMany: ReturnType<typeof vi.fn>

  beforeEach(() => {
    insertMock = vi.fn()
    updateMock = vi.fn()
    assignmentFindMany = vi.fn()
    assignmentFindFirst = vi.fn()
    eventsFindMany = vi.fn()

    const mockDb = {
      insert: (table: unknown): MockInsertReturn<any> => {
        return insertMock(table)
      },
      update: (table: unknown): MockUpdateReturn<any> => {
        return updateMock(table)
      },
      query: {
        workflowReviewerAssignments: {
          findMany: assignmentFindMany,
          findFirst: assignmentFindFirst
        },
        workflowAuditEvents: {
          findMany: eventsFindMany
        }
      }
    }

    app = express()
    app.use(express.json())
    app.use('/api/workflow', createWorkflowAuditRouter({ database: mockDb as any }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns reviewer assignments with filters', async () => {
    assignmentFindMany.mockResolvedValue([
      {
        id: 1,
        workflowId: 7,
        stageSlug: 'memo',
        reviewerId: 2,
        reviewerEmail: 'reviewer@example.com',
        reviewerName: 'Taylor Reviewer',
        status: 'pending',
        assignedBy: 1,
        assignedByName: 'Analyst',
        assignedAt: new Date('2025-10-04T10:00:00Z'),
        dueAt: new Date('2025-10-06T10:00:00Z'),
        acknowledgedAt: null,
        acknowledgedBy: null,
        completedAt: null,
        reminderCount: 0,
        lastReminderAt: null,
        notes: 'Initial review',
        metadata: {}
      }
    ])

    const response = await performRequest(
      app,
      'GET',
      '/api/workflow/7/reviewer-assignments?stageSlug=memo'
    )

    expect(response.status).toBe(200)
    expect(response.body.assignments).toHaveLength(1)
    expect(response.body.assignments[0]).toMatchObject({
      reviewerEmail: 'reviewer@example.com',
      status: 'pending'
    })
  })

  it('creates a reviewer assignment and records an audit event', async () => {
    const createdRow = {
      id: 11,
      workflowId: 3,
      stageSlug: 'memo',
      reviewerId: null,
      reviewerEmail: 'review@example.com',
      reviewerName: 'Taylor',
      status: 'pending',
      assignedBy: null,
      assignedByName: null,
      assignedAt: new Date('2025-10-04T12:00:00Z'),
      dueAt: null,
      acknowledgedAt: null,
      acknowledgedBy: null,
      completedAt: null,
      reminderCount: 0,
      lastReminderAt: null,
      notes: null,
      metadata: {}
    }

    insertMock.mockImplementation((table) => {
      if (
        (table as typeof workflowReviewerAssignments).tableName ===
        workflowReviewerAssignments.tableName
      ) {
        return {
          values: () => ({
            returning: async () => [createdRow]
          })
        }
      }
      if ((table as typeof workflowAuditEvents).tableName === workflowAuditEvents.tableName) {
        return {
          values: () => ({ returning: async () => [] })
        }
      }
      throw new Error('Unexpected table insert')
    })

    const response = await performRequest(app, 'POST', '/api/workflow/3/reviewer-assignments', {
      stageSlug: 'memo',
      reviewerEmail: 'review@example.com'
    })

    expect(response.status).toBe(201)
    expect(response.body.assignment).toMatchObject({
      id: 11,
      reviewerEmail: 'review@example.com',
      status: 'pending'
    })
    expect(insertMock).toHaveBeenCalled()
  })

  it('updates assignment status and writes audit trail', async () => {
    const existingRow = {
      id: 15,
      workflowId: 5,
      stageSlug: 'memo',
      reviewerId: null,
      reviewerEmail: 'person@example.com',
      reviewerName: 'Person',
      status: 'pending' as ReviewerAssignmentStatus,
      assignedBy: null,
      assignedByName: null,
      assignedAt: new Date('2025-10-01T10:00:00Z'),
      dueAt: null,
      acknowledgedAt: null,
      acknowledgedBy: null,
      completedAt: null,
      reminderCount: 0,
      lastReminderAt: null,
      notes: null,
      metadata: {}
    }

    const updatedRow = { ...existingRow, status: 'in_review' as ReviewerAssignmentStatus }

    assignmentFindFirst.mockResolvedValue(existingRow)

    updateMock.mockImplementation((table) => {
      if (
        (table as typeof workflowReviewerAssignments).tableName ===
        workflowReviewerAssignments.tableName
      ) {
        return {
          set: () => ({
            where: () => ({ returning: async () => [updatedRow] })
          })
        }
      }
      if ((table as typeof workflowAuditEvents).tableName === workflowAuditEvents.tableName) {
        return {
          set: () => ({ where: () => ({ returning: async () => [] }) })
        }
      }
      throw new Error('Unexpected table update')
    })

    insertMock.mockImplementation((table) => {
      if ((table as typeof workflowAuditEvents).tableName === workflowAuditEvents.tableName) {
        return {
          values: () => ({ returning: async () => [] })
        }
      }
      return {
        values: () => ({ returning: async () => [] })
      }
    })

    const response = await performRequest(app, 'PATCH', '/api/workflow/5/reviewer-assignments/15', {
      status: 'in_review'
    })

    expect(response.status).toBe(200)
    expect(response.body.assignment.status).toBe('in_review')
  })

  it('fetches audit events and supports CSV export', async () => {
    eventsFindMany.mockResolvedValue([
      {
        id: 21,
        workflowId: 8,
        stageSlug: 'memo',
        eventType: 'assignment_created',
        actorId: null,
        actorName: 'Analyst',
        actorRole: 'analyst',
        payload: { assignmentId: 1 },
        reviewerAssignmentId: 1,
        createdAt: new Date('2025-10-02T12:00:00Z'),
        acknowledgedAt: null,
        acknowledgedBy: null,
        acknowledgementNote: null,
        metadata: {}
      }
    ])

    const jsonResponse = await performRequest(app, 'GET', '/api/workflow/8/audit/events')
    expect(jsonResponse.status).toBe(200)
    expect(jsonResponse.body.events).toHaveLength(1)

    const csvResponse = await performRequest(app, 'GET', '/api/workflow/8/audit/events?export=csv')
    expect(csvResponse.status).toBe(200)
    expect(typeof csvResponse.body).toBe('string')
  })

  it('creates and acknowledges audit events', async () => {
    insertMock.mockImplementation((table) => {
      if ((table as typeof workflowAuditEvents).tableName === workflowAuditEvents.tableName) {
        return {
          values: () => ({
            returning: async () => [
              {
                id: 99,
                workflowId: 4,
                stageSlug: 'memo',
                eventType: 'custom_event',
                actorId: null,
                actorName: 'Analyst',
                actorRole: 'analyst',
                payload: {},
                reviewerAssignmentId: null,
                createdAt: new Date('2025-10-04T13:00:00Z'),
                acknowledgedAt: null,
                acknowledgedBy: null,
                acknowledgementNote: null,
                metadata: {}
              }
            ]
          })
        }
      }
      return {
        values: () => ({ returning: async () => [] })
      }
    })

    const createResponse = await performRequest(app, 'POST', '/api/workflow/4/audit/events', {
      eventType: 'custom_event',
      payload: { foo: 'bar' }
    })

    expect(createResponse.status).toBe(201)
    expect(createResponse.body.event.eventType).toBe('custom_event')

    updateMock.mockImplementation((table) => {
      if ((table as typeof workflowAuditEvents).tableName === workflowAuditEvents.tableName) {
        return {
          set: () => ({
            where: () => ({
              returning: async () => [
                {
                  id: 99,
                  workflowId: 4,
                  stageSlug: 'memo',
                  eventType: 'custom_event',
                  actorId: null,
                  actorName: 'Analyst',
                  actorRole: 'analyst',
                  payload: {},
                  reviewerAssignmentId: null,
                  createdAt: new Date('2025-10-04T13:00:00Z'),
                  acknowledgedAt: new Date('2025-10-04T14:00:00Z'),
                  acknowledgedBy: null,
                  acknowledgementNote: null,
                  metadata: {}
                }
              ]
            })
          })
        }
      }
      return {
        set: () => ({ where: () => ({ returning: async () => [] }) })
      }
    })

    const ackResponse = await performRequest(
      app,
      'POST',
      '/api/workflow/4/audit/events/99/acknowledge',
      { acknowledgementNote: 'done' }
    )

    expect(ackResponse.status).toBe(200)
    expect(ackResponse.body.event.acknowledgedAt).toBeTruthy()
  })
})
