import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express from 'express'
import type { AddressInfo } from 'node:net'
import type { ResearchLogEntry } from '@shared/types'

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://valor_user:valorpass@localhost:5432/valor_vibe'

vi.mock(new URL('../../../lib/db/index.ts', import.meta.url).pathname, () => ({
  db: {}
}))

vi.mock('../../../lib/db', () => ({
  db: {}
}))

const workflowModule = await import(new URL('../../../server/routes/workflow.ts', import.meta.url).pathname)
const { createWorkflowRouter } = workflowModule

let selectMock: ReturnType<typeof vi.fn>
let insertMock: ReturnType<typeof vi.fn>

const buildSelectChain = (rows: any[]) => {
  const limit = vi.fn().mockResolvedValue(rows)
  const orderBy = vi.fn().mockReturnValue({ limit })
  const from = vi.fn().mockReturnValue({ orderBy })
  selectMock.mockReturnValue({ from })
  return { limit, orderBy, from }
}

const performRequest = async (app: express.Express, method: string, path: string, body?: unknown) => {
  return await new Promise<{ status: number; body: any }>((resolve, reject) => {
    const server = app.listen(0, async () => {
      const { port } = server.address() as AddressInfo
      try {
        const response = await fetch(`http://127.0.0.1:${port}${path}`, {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
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

describe('Workflow research log API', () => {
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

  it('returns research log entries ordered by timestamp', async () => {
    const sampleRow = {
      id: 'row-1',
      stageSlug: 'home',
      stageTitle: 'Home / Daily Brief',
      action: 'Stage opened',
      details: null,
      timestamp: new Date('2025-09-18T10:00:00.000Z')
    }

    buildSelectChain([sampleRow])

    const response = await performRequest(app, 'GET', '/api/workflow/research-log')

    expect(response.status).toBe(200)
    expect(response.body).toHaveLength(1)
    expect(response.body[0]).toMatchObject({
      id: 'row-1',
      stageSlug: 'home',
      stageTitle: 'Home / Daily Brief',
      action: 'Stage opened',
      timestamp: '2025-09-18T10:00:00.000Z'
    })
    expect(selectMock).toHaveBeenCalled()
  })

  it('handles datastore errors on fetch', async () => {
    const limit = vi.fn().mockRejectedValue(new Error('boom'))
    const orderBy = vi.fn().mockReturnValue({ limit })
    const from = vi.fn().mockReturnValue({ orderBy })
    selectMock.mockReturnValue({ from })

    const response = await performRequest(app, 'GET', '/api/workflow/research-log')

    expect(response.status).toBe(500)
    expect(response.body).toMatchObject({ message: 'Failed to load research log' })
  })

  it('rejects malformed payloads when creating entries', async () => {
    const response = await performRequest(app, 'POST', '/api/workflow/research-log', {
      stageTitle: 'Missing fields'
    })

    expect(response.status).toBe(400)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('persists research log entries via insert chain', async () => {
    const returningRow: ResearchLogEntry = {
      id: 'row-2',
      stageSlug: 'intake',
      stageTitle: 'Idea Intake (Triage)',
      action: 'Stage marked ready',
      details: 'Checklist confirmed',
      timestamp: new Date('2025-09-18T10:35:00.000Z').toISOString()
    }

    const returning = vi.fn().mockResolvedValue([
      {
        ...returningRow,
        details: returningRow.details,
        timestamp: new Date(returningRow.timestamp)
      }
    ])

    const values = vi.fn().mockImplementation((vals) => {
      expect(vals.stageSlug).toBe('intake')
      expect(vals.stageTitle).toBe('Idea Intake (Triage)')
      expect(vals.action).toBe('Stage marked ready')
      expect(vals.timestamp).toBeInstanceOf(Date)
      return { returning }
    })

    insertMock.mockReturnValue({ values })

    const response = await performRequest(app, 'POST', '/api/workflow/research-log', {
      stageSlug: 'intake',
      stageTitle: 'Idea Intake (Triage)',
      action: 'Stage marked ready',
      details: 'Checklist confirmed',
      timestamp: returningRow.timestamp
    })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      id: 'row-2',
      stageSlug: 'intake',
      action: 'Stage marked ready',
      timestamp: returningRow.timestamp,
      details: 'Checklist confirmed'
    })
    expect(insertMock).toHaveBeenCalled()
    expect(values).toHaveBeenCalled()
    expect(returning).toHaveBeenCalled()
  })
})
