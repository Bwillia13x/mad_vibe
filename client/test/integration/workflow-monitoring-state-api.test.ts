import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express from 'express'
import type { AddressInfo } from 'node:net'
import type { MonitoringStateInput } from '@shared/types'

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

describe('Workflow monitoring state API', () => {
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

  it('returns null when no monitoring state exists', async () => {
    buildSelectChain([])

    const response = await performRequest(app, 'GET', '/api/workflow/monitoring-state', undefined, {
      'x-session-key': 'monitor-session'
    })

    expect(response.status).toBe(200)
    expect(response.body).toBeNull()
  })

  it('returns persisted monitoring state for the session', async () => {
    const updatedAt = new Date('2025-09-14T20:00:00.000Z')

    buildSelectChain([
      {
        state: {
          acknowledgedAlerts: { 'alert-churn': true },
          deltaOverrides: { 'delta-pricing': 'warning' }
        },
        version: 6,
        updatedAt
      }
    ])

    const response = await performRequest(app, 'GET', '/api/workflow/monitoring-state', undefined, {
      'x-session-key': 'monitor-session'
    })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      acknowledgedAlerts: { 'alert-churn': true },
      deltaOverrides: { 'delta-pricing': 'warning' },
      updatedAt: updatedAt.toISOString(),
      version: 6
    })
  })

  it('handles datastore errors while loading monitoring state', async () => {
    const limit = vi.fn().mockRejectedValue(new Error('load failure'))
    const where = vi.fn().mockReturnValue({ limit })
    const from = vi.fn().mockReturnValue({ where })
    selectMock.mockReturnValue({ from })

    const response = await performRequest(app, 'GET', '/api/workflow/monitoring-state')

    expect(response.status).toBe(500)
    expect(response.body).toMatchObject({ message: 'Failed to load monitoring state' })
  })

  it('rejects malformed monitoring payloads', async () => {
    const response = await performRequest(app, 'PUT', '/api/workflow/monitoring-state', {
      acknowledgedAlerts: { 'alert-1': true }
    })

    expect(response.status).toBe(400)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('persists monitoring state via upsert', async () => {
    buildSelectChain([
      {
        version: 0
      }
    ])

    const payload: MonitoringStateInput = {
      acknowledgedAlerts: { 'alert-churn': true },
      deltaOverrides: { 'delta-owner-earnings': 'on-track' },
      version: 0
    }

    const returning = vi.fn().mockResolvedValue([
      {
        state: {
          acknowledgedAlerts: payload.acknowledgedAlerts,
          deltaOverrides: payload.deltaOverrides
        },
        version: 1,
        updatedAt: new Date('2025-09-14T20:15:00.000Z')
      }
    ])

    const onConflictDoUpdate = vi.fn().mockReturnValue({ returning })
    const values = vi.fn().mockImplementation((value) => {
      expect(value.sessionId).toBeDefined()
      expect(value.state).toEqual({
        acknowledgedAlerts: payload.acknowledgedAlerts,
        deltaOverrides: payload.deltaOverrides
      })
      expect(value.version).toBe(1)
      expect(value.updatedAt).toBeInstanceOf(Date)
      return { onConflictDoUpdate }
    })

    insertMock
      .mockReturnValueOnce({ values })
      .mockReturnValueOnce({ values: vi.fn().mockReturnValue({}) })

    const response = await performRequest(app, 'PUT', '/api/workflow/monitoring-state', payload, {
      'x-session-key': 'monitor-session'
    })

    expect(response.status).toBe(200)
    expect(response.body.version).toBe(1)
    expect(response.body.acknowledgedAlerts).toEqual(payload.acknowledgedAlerts)
    expect(values).toHaveBeenCalled()
    expect(onConflictDoUpdate).toHaveBeenCalled()
    expect(returning).toHaveBeenCalled()
  })

  it('returns 409 on monitoring version conflict', async () => {
    buildSelectChain([
      {
        version: 2
      }
    ])

    const response = await performRequest(app, 'PUT', '/api/workflow/monitoring-state', {
      acknowledgedAlerts: {},
      deltaOverrides: {},
      version: 0
    })

    expect(response.status).toBe(409)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('handles datastore errors while persisting monitoring state', async () => {
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

    const response = await performRequest(app, 'PUT', '/api/workflow/monitoring-state', {
      acknowledgedAlerts: {},
      deltaOverrides: {},
      version: 0
    })

    expect(response.status).toBe(500)
    expect(response.body).toMatchObject({ message: 'Failed to persist monitoring state' })
  })
})
