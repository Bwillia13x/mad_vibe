import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express from 'express'
import type { AddressInfo } from 'node:net'

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

describe('Workflow presence API', () => {
  let app: express.Express

  beforeEach(() => {
    const mockDb = {
      select: vi.fn(),
      insert: vi.fn()
    }

    app = express()
    app.use(express.json())
    app.use('/api/workflow', createWorkflowRouter(mockDb as any))
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('registers a heartbeat and lists active peers for the stage', async () => {
    const stageSlug = `presence-stage-${Date.now()}`

    const heartbeat = await performRequest(
      app,
      'POST',
      '/api/workflow/presence/heartbeat',
      { stageSlug },
      {
        'x-session-key': 'presence-session-1',
        'x-actor-id': 'analyst-1'
      }
    )

    expect(heartbeat.status).toBe(200)
    expect(heartbeat.body).toMatchObject({
      actorId: 'analyst-1',
      stageSlug,
      peers: [
        {
          actorId: 'analyst-1',
          stageSlug
        }
      ]
    })

    const fetchPresence = await performRequest(
      app,
      'GET',
      `/api/workflow/presence?stage=${encodeURIComponent(stageSlug)}`
    )

    expect(fetchPresence.status).toBe(200)
    expect(fetchPresence.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ actorId: 'analyst-1', stageSlug })])
    )

    const secondHeartbeat = await performRequest(
      app,
      'POST',
      '/api/workflow/presence/heartbeat',
      { stageSlug },
      {
        'x-session-key': 'presence-session-2',
        'x-actor-id': 'analyst-2'
      }
    )

    expect(secondHeartbeat.status).toBe(200)
    expect(secondHeartbeat.body.peers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ actorId: 'analyst-1' }),
        expect.objectContaining({ actorId: 'analyst-2' })
      ])
    )

    const updatedPeers = await performRequest(
      app,
      'GET',
      `/api/workflow/presence?stage=${encodeURIComponent(stageSlug)}`
    )

    const peerIds = (updatedPeers.body as Array<{ actorId: string }>).map((peer) => peer.actorId)
    expect(peerIds).toEqual(expect.arrayContaining(['analyst-1', 'analyst-2']))
  })

  it('treats missing or blank stage slugs as invalid', async () => {
    const missingStage = await performRequest(app, 'POST', '/api/workflow/presence/heartbeat', {})
    expect(missingStage.status).toBe(400)

    const blankStage = await performRequest(app, 'POST', '/api/workflow/presence/heartbeat', {
      stageSlug: '   '
    })
    expect(blankStage.status).toBe(400)

    const missingQuery = await performRequest(app, 'GET', '/api/workflow/presence')
    expect(missingQuery.status).toBe(400)

    const blankQuery = await performRequest(app, 'GET', '/api/workflow/presence?stage=   ')
    expect(blankQuery.status).toBe(400)
  })

  it('falls back to session identity when actor headers are not provided', async () => {
    const stageSlug = `presence-fallback-${Date.now()}`

    const heartbeat = await performRequest(
      app,
      'POST',
      '/api/workflow/presence/heartbeat',
      { stageSlug },
      {
        'x-session-key': 'session-actor-fallback'
      }
    )

    expect(heartbeat.status).toBe(200)
    expect(heartbeat.body.actorId).toBe('session-actor-fallback')
  })

  it('prunes stale presence entries after the max age window', async () => {
    vi.useFakeTimers()
    const baseTime = new Date('2025-01-01T12:00:00.000Z')
    vi.setSystemTime(baseTime)

    const stageSlug = `presence-prune-${Date.now()}`

    const heartbeat = await performRequest(
      app,
      'POST',
      '/api/workflow/presence/heartbeat',
      { stageSlug },
      {
        'x-session-key': 'presence-stale-1',
        'x-actor-id': 'analyst-stale'
      }
    )

    expect(heartbeat.status).toBe(200)

    vi.setSystemTime(new Date(baseTime.getTime() + 60_000))

    const peers = await performRequest(
      app,
      'GET',
      `/api/workflow/presence?stage=${encodeURIComponent(stageSlug)}`
    )

    expect(peers.status).toBe(200)
    expect(peers.body).toEqual([])
  })
})
