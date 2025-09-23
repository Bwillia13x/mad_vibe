import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express from 'express'
import type { AddressInfo } from 'node:net'
import type { DataNormalizationStateInput } from '@shared/types'

process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://valor_user:valorpass@localhost:5432/valor_vibe'

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
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...headers
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

describe('Workflow normalization state API', () => {
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

  it('returns null when no normalization state is stored', async () => {
    buildSelectChain([])

    const response = await performRequest(
      app,
      'GET',
      '/api/workflow/normalization-state',
      undefined,
      {
        'x-session-key': 'norm-session'
      }
    )

    expect(response.status).toBe(200)
    expect(response.body).toBeNull()
  })

  it('returns persisted normalization state for the session', async () => {
    const updatedAt = new Date('2025-09-14T18:00:00.000Z')

    buildSelectChain([
      {
        state: {
          reconciledSources: { 'source-1': true, 'source-2': false },
          appliedAdjustments: { 'adj-lease': true }
        },
        version: 3,
        updatedAt
      }
    ])

    const response = await performRequest(
      app,
      'GET',
      '/api/workflow/normalization-state',
      undefined,
      {
        'x-session-key': 'norm-session'
      }
    )

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      reconciledSources: { 'source-1': true, 'source-2': false },
      appliedAdjustments: { 'adj-lease': true },
      updatedAt: updatedAt.toISOString(),
      version: 3
    })
  })

  it('handles datastore errors while loading normalization state', async () => {
    const limit = vi.fn().mockRejectedValue(new Error('load failure'))
    const where = vi.fn().mockReturnValue({ limit })
    const from = vi.fn().mockReturnValue({ where })
    selectMock.mockReturnValue({ from })

    const response = await performRequest(app, 'GET', '/api/workflow/normalization-state')

    expect(response.status).toBe(500)
    expect(response.body).toMatchObject({ message: 'Failed to load normalization state' })
  })

  it('rejects malformed normalization payloads', async () => {
    const response = await performRequest(app, 'PUT', '/api/workflow/normalization-state', {
      reconciledSources: { 'source-1': true }
    })

    expect(response.status).toBe(400)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('persists normalization state via upsert', async () => {
    buildSelectChain([
      {
        version: 0
      }
    ])

    const payload: DataNormalizationStateInput = {
      reconciledSources: { 'source-1': true },
      appliedAdjustments: { 'adj-sbc': true },
      version: 0
    }

    const returning = vi.fn().mockResolvedValue([
      {
        state: {
          reconciledSources: payload.reconciledSources,
          appliedAdjustments: payload.appliedAdjustments
        },
        version: 1,
        updatedAt: new Date('2025-09-14T18:30:00.000Z')
      }
    ])

    const onConflictDoUpdate = vi.fn().mockReturnValue({ returning })
    const values = vi.fn().mockImplementation((value) => {
      expect(value.sessionId).toBeDefined()
      expect(value.state).toEqual({
        reconciledSources: payload.reconciledSources,
        appliedAdjustments: payload.appliedAdjustments
      })
      expect(value.version).toBe(1)
      expect(value.updatedAt).toBeInstanceOf(Date)
      return { onConflictDoUpdate }
    })

    insertMock
      .mockReturnValueOnce({ values })
      .mockReturnValueOnce({ values: vi.fn().mockReturnValue({}) })

    const response = await performRequest(
      app,
      'PUT',
      '/api/workflow/normalization-state',
      payload,
      {
        'x-session-key': 'norm-session'
      }
    )

    expect(response.status).toBe(200)
    expect(response.body.version).toBe(1)
    expect(response.body.reconciledSources).toEqual(payload.reconciledSources)
    expect(values).toHaveBeenCalled()
    expect(onConflictDoUpdate).toHaveBeenCalled()
    expect(returning).toHaveBeenCalled()
  })

  it('returns 409 on normalization version conflict', async () => {
    buildSelectChain([
      {
        version: 5
      }
    ])

    const response = await performRequest(app, 'PUT', '/api/workflow/normalization-state', {
      reconciledSources: {},
      appliedAdjustments: {},
      version: 0
    })

    expect(response.status).toBe(409)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('handles datastore errors while persisting normalization state', async () => {
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

    const response = await performRequest(app, 'PUT', '/api/workflow/normalization-state', {
      reconciledSources: {},
      appliedAdjustments: {},
      version: 0
    })

    expect(response.status).toBe(500)
    expect(response.body).toMatchObject({ message: 'Failed to persist normalization state' })
  })
})
