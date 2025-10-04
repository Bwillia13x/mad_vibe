import { describe, it, expect, beforeAll, afterAll } from 'vitest'

describe('Agent task load testing', () => {
  let baseUrl: string

  beforeAll(() => {
    baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5000'
  })

  it('handles 50 concurrent task creations', async () => {
    const startTime = Date.now()
    const tasks = Array.from({ length: 50 }, (_, i) =>
      fetch(`${baseUrl}/api/agents/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: 1,
          type: 'thesis-validation',
          params: {}
        })
      }).then((res) => ({
        ok: res.ok,
        status: res.status,
        taskId: i
      }))
    )

    const results = await Promise.allSettled(tasks)
    const duration = Date.now() - startTime
    const failures = results.filter((r) => r.status === 'rejected')
    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.ok)

    console.log(`Created ${successful.length} tasks in ${duration}ms`)
    console.log(`Average time per task: ${Math.round(duration / 50)}ms`)
    console.log(`Failures: ${failures.length}`)

    expect(failures.length).toBeLessThan(5) // Allow up to 10% failure rate
    expect(successful.length).toBeGreaterThanOrEqual(45)
    expect(duration).toBeLessThan(30000) // 50 tasks in <30s = <600ms avg
  }, 35000)

  it('handles concurrent workspace fetches', async () => {
    const startTime = Date.now()
    const requests = Array.from({ length: 100 }, () =>
      fetch(`${baseUrl}/api/workspaces/1`, {
        headers: { 'Content-Type': 'application/json' }
      }).then((res) => ({
        ok: res.ok,
        status: res.status,
        time: Date.now() - startTime
      }))
    )

    const results = await Promise.allSettled(requests)
    const duration = Date.now() - startTime
    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.ok)
    const failed = results.filter((r) => r.status === 'rejected')

    // Calculate response time percentiles
    const times = successful.map((r) => (r as any).value.time)
    times.sort((a, b) => a - b)
    const p50 = times[Math.floor(times.length * 0.5)]
    const p95 = times[Math.floor(times.length * 0.95)]
    const p99 = times[Math.floor(times.length * 0.99)]

    console.log(`Workspace fetches: ${successful.length} successful in ${duration}ms`)
    console.log(`Response times - p50: ${p50}ms, p95: ${p95}ms, p99: ${p99}ms`)
    console.log(`Failed requests: ${failed.length}`)

    expect(successful.length).toBeGreaterThanOrEqual(90)
    expect(p95).toBeLessThan(1000) // p95 under 1 second
  }, 20000)

  it('sustains SSE connections without memory leaks', async () => {
    const connections: Response[] = []
    const startMemory = process.memoryUsage().heapUsed

    try {
      // Open 20 SSE connections
      for (let i = 0; i < 20; i++) {
        const response = await fetch(`${baseUrl}/api/agents/tasks/test-${i}/stream`, {
          headers: { Accept: 'text/event-stream' }
        })
        if (response.ok) {
          connections.push(response)
        }
      }

      // Wait 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000))

      const endMemory = process.memoryUsage().heapUsed
      const memoryIncrease = (endMemory - startMemory) / 1024 / 1024

      console.log(`Opened ${connections.length} SSE connections`)
      console.log(`Memory increase: ${memoryIncrease.toFixed(2)}MB`)

      expect(connections.length).toBeGreaterThanOrEqual(15)
      expect(memoryIncrease).toBeLessThan(100) // Less than 100MB increase
    } finally {
      // Close all connections
      connections.forEach((conn) => {
        try {
          conn.body?.cancel()
        } catch {}
      })
    }
  }, 10000)

  it('handles concurrent telemetry requests', async () => {
    // Create a task first
    const createResponse = await fetch(`${baseUrl}/api/agents/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 1,
        type: 'thesis-validation',
        params: {}
      })
    })

    if (!createResponse.ok) {
      console.warn('Could not create task for telemetry test')
      return
    }

    const task = await createResponse.json()

    // Hammer telemetry endpoint
    const startTime = Date.now()
    const requests = Array.from({ length: 50 }, () =>
      fetch(`${baseUrl}/api/agents/tasks/${task.id}/telemetry`).then((res) => ({
        ok: res.ok,
        status: res.status
      }))
    )

    const results = await Promise.allSettled(requests)
    const duration = Date.now() - startTime
    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.ok)

    console.log(`Telemetry requests: ${successful.length} in ${duration}ms`)
    console.log(`Average: ${Math.round(duration / 50)}ms per request`)

    expect(successful.length).toBeGreaterThanOrEqual(45)
    expect(duration / 50).toBeLessThan(200) // <200ms avg per request
  }, 15000)
})

describe('Database connection pool stress test', () => {
  let baseUrl: string

  beforeAll(() => {
    baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5000'
  })

  it('does not exhaust connection pool under load', async () => {
    const startTime = Date.now()

    // Create 100 concurrent requests that hit the database
    const requests = Array.from({ length: 100 }, (_, i) =>
      fetch(`${baseUrl}/api/workspaces`, {
        method: i % 10 === 0 ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body:
          i % 10 === 0
            ? JSON.stringify({
                name: `Load Test Workspace ${i}`,
                ticker: 'TEST'
              })
            : undefined
      }).then((res) => ({ ok: res.ok, status: res.status }))
    )

    const results = await Promise.allSettled(requests)
    const duration = Date.now() - startTime
    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.ok)
    const poolExhausted = results.some((r) => r.status === 'fulfilled' && r.value.status === 503)

    console.log(`Database stress test: ${successful.length}/100 successful in ${duration}ms`)
    console.log(`Pool exhausted: ${poolExhausted}`)

    expect(poolExhausted).toBe(false)
    expect(successful.length).toBeGreaterThanOrEqual(90)
  }, 30000)
})
