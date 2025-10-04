import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express from 'express'
import type { AddressInfo } from 'node:net'
import type { MemoComposerStateInput } from '@shared/types'

process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://valor_user:valorpass@localhost:5432/valor_vibe'
process.env.ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'test-admin-token'

vi.mock(new URL('../../../lib/db/index.ts', import.meta.url).pathname, () => ({
  db: {}
}))

vi.mock('../../../lib/db', () => ({
  db: {}
}))

const workflowModule = await import(
  new URL('../../../server/routes/workflow.ts', import.meta.url).pathname
)
const { createWorkflowRouter } = workflowModule

const ADMIN_HEADERS = {
  Authorization: 'Bearer test-admin-token'
}

type SelectChain = {
  from: ReturnType<typeof vi.fn>
  where?: ReturnType<typeof vi.fn>
  limit?: ReturnType<typeof vi.fn>
}

type InsertChain = {
  values: ReturnType<typeof vi.fn>
}

let selectMock: ReturnType<typeof vi.fn>
let insertMock: ReturnType<typeof vi.fn>

const buildSelectChain = (rows: any[]): SelectChain => {
  const limit = vi.fn().mockResolvedValue(rows)
  const where = vi.fn().mockReturnValue({ limit })
  const from = vi.fn().mockReturnValue({ where })
  selectMock.mockReturnValue({ from })
  return { from, where, limit }
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

describe('Workflow memo state API', () => {
  let app: express.Express

  beforeEach(() => {
    selectMock = vi.fn()
    insertMock = vi.fn()

    const mockDb = {
      select: (...args: unknown[]) => selectMock(...args),
      insert: (...args: unknown[]) => insertMock(...args)
    }

    app = express()
    app.use(express.json())
    app.use('/api/workflow', createWorkflowRouter(mockDb as any))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when no memo state is stored', async () => {
    buildSelectChain([])

    const response = await performRequest(app, 'GET', '/api/workflow/memo-state', undefined, {
      'x-session-key': 'memo-test-session'
    })

    expect(response.status).toBe(200)
    expect(response.body).toBeNull()
    expect(selectMock).toHaveBeenCalled()
  })

  it('rejects memo state requests without a session header', async () => {
    buildSelectChain([])

    const getResponse = await performRequest(app, 'GET', '/api/workflow/memo-state')
    expect(getResponse.status).toBe(400)
    expect(getResponse.body).toMatchObject({ message: 'Session key header required' })

    const putResponse = await performRequest(app, 'PUT', '/api/workflow/memo-state', {
      sections: {},
      reviewChecklist: {},
      attachments: {},
      commentThreads: {},
      version: 0
    })
    expect(putResponse.status).toBe(400)
    expect(putResponse.body).toMatchObject({ message: 'Session key header required' })
  })

  it('returns the stored memo state for the session', async () => {
    const updatedAt = new Date('2025-09-14T15:05:00.000Z')
    buildSelectChain([
      {
        state: {
          sections: { 'memo-thesis': 'Conviction in recurring revenue moat' },
          reviewChecklist: { 'review-redteam': true },
          attachments: {
            'exhibit-valuation': { include: true, caption: 'Valuation triangulation' }
          },
          commentThreads: {
            'memo-thesis': [
              {
                id: 'thread-1',
                author: 'Reviewer',
                message: 'Clarify churn trend backing',
                status: 'open',
                createdAt: new Date('2025-09-14T15:00:00.000Z').toISOString()
              }
            ]
          }
        },
        version: 2,
        sessionId: 'memo-test-session',
        updatedAt
      }
    ])

    const response = await performRequest(app, 'GET', '/api/workflow/memo-state', undefined, {
      'x-session-key': 'memo-test-session'
    })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      sections: { 'memo-thesis': 'Conviction in recurring revenue moat' },
      reviewChecklist: { 'review-redteam': true },
      attachments: { 'exhibit-valuation': { include: true, caption: 'Valuation triangulation' } },
      commentThreads: expect.any(Object),
      updatedAt: updatedAt.toISOString(),
      version: 2
    })
  })

  it('handles datastore errors while loading memo state', async () => {
    const limit = vi.fn().mockRejectedValue(new Error('load failure'))
    const where = vi.fn().mockReturnValue({ limit })
    const from = vi.fn().mockReturnValue({ where })
    selectMock.mockReturnValue({ from })

    const response = await performRequest(app, 'GET', '/api/workflow/memo-state', undefined, {
      'x-session-key': 'memo-test-session'
    })

    expect(response.status).toBe(500)
    expect(response.body).toMatchObject({ message: 'Failed to load memo composer state' })
  })

  it('rejects malformed memo payloads', async () => {
    const response = await performRequest(app, 'PUT', '/api/workflow/memo-state', {
      sections: { 'memo-thesis': 'Incomplete payload' }
    })

    expect(response.status).toBe(400)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('persists memo state via upsert operation', async () => {
    buildSelectChain([
      {
        version: 0
      }
    ])

    const payload: MemoComposerStateInput = {
      sections: { 'memo-thesis': 'Updated thesis copy' },
      reviewChecklist: { 'review-redteam': true },
      attachments: {
        'exhibit-monitoring': { include: true, caption: 'Monitoring linkage' }
      },
      commentThreads: {},
      version: 0
    }

    const returning = vi.fn().mockResolvedValue([
      {
        state: {
          sections: payload.sections,
          reviewChecklist: payload.reviewChecklist,
          attachments: payload.attachments,
          commentThreads: payload.commentThreads
        },
        version: 1,
        updatedAt: new Date('2025-09-14T16:00:00.000Z')
      }
    ])

    const onConflictDoUpdate = vi.fn().mockReturnValue({ returning })
    const values = vi.fn().mockImplementation((value) => {
      expect(value.sessionId).toBeDefined()
      expect(value.state).toEqual({
        sections: payload.sections,
        reviewChecklist: payload.reviewChecklist,
        attachments: payload.attachments,
        commentThreads: payload.commentThreads
      })
      expect(value.version).toBe(1)
      expect(value.updatedAt).toBeInstanceOf(Date)
      return { onConflictDoUpdate }
    })

    insertMock
      .mockReturnValueOnce({ values })
      .mockReturnValueOnce({ values: vi.fn().mockReturnValue({}) })

    const response = await performRequest(app, 'PUT', '/api/workflow/memo-state', payload, {
      'x-session-key': 'memo-test-session'
    })

    expect(response.status).toBe(200)
    expect(response.body.version).toBe(1)
    expect(response.body.sections).toEqual(payload.sections)
    expect(values).toHaveBeenCalled()
    expect(onConflictDoUpdate).toHaveBeenCalled()
    expect(returning).toHaveBeenCalled()
  })

  it('returns 409 on memo state version conflict', async () => {
    buildSelectChain([
      {
        version: 2
      }
    ])

    const response = await performRequest(
      app,
      'PUT',
      '/api/workflow/memo-state',
      {
        sections: {},
        reviewChecklist: {},
        attachments: {},
        commentThreads: {},
        version: 0
      },
      {
        'x-session-key': 'memo-test-session'
      }
    )

    expect(response.status).toBe(409)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('handles datastore errors while persisting memo state', async () => {
    buildSelectChain([
      {
        version: 0
      }
    ])

    const onConflictDoUpdate = vi.fn().mockImplementation(() => {
      throw new Error('persist failure')
    })

    const values = vi.fn().mockReturnValue({ onConflictDoUpdate })
    insertMock.mockReturnValue({ values })

    const response = await performRequest(
      app,
      'PUT',
      '/api/workflow/memo-state',
      {
        sections: {},
        reviewChecklist: {},
        attachments: {},
        commentThreads: {},
        version: 0
      },
      {
        'x-session-key': 'memo-test-session'
      }
    )

    expect(response.status).toBe(500)
    expect(response.body).toMatchObject({ message: 'Failed to persist memo composer state' })
  })
})
