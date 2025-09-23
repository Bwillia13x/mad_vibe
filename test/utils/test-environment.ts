/**
 * Test Environment Utilities and Helpers
 * Provides utilities for managing test environments, server lifecycle, and test data
 */

import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import type { TestConfig } from '../config/test-config.js'

export interface TestEnvironment {
  port: number
  baseUrl: string
  serverProcess: ChildProcess
  cleanup: () => Promise<void>
}

/**
 * Utility to wait for a condition with timeout
 */
export async function waitFor<T>(
  condition: () => Promise<T> | T,
  timeoutMs: number = 10000,
  intervalMs: number = 200
): Promise<T> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const result = await condition()
      if (result) return result
    } catch {
      // Continue waiting
    }
    await delay(intervalMs)
  }
  throw new Error(`Condition not met within ${timeoutMs}ms`)
}

/**
 * Simple delay utility
 */
export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Wait for port file to be created and return the port number
 */
export async function waitForPortFile(
  portFile: string,
  timeoutMs: number = 15000
): Promise<number> {
  return waitFor(async () => {
    if (fs.existsSync(portFile)) {
      const content = fs.readFileSync(portFile, 'utf8').trim()
      const port = Number(content)
      if (Number.isFinite(port) && port > 0) {
        return port
      }
    }
    return null
  }, timeoutMs)
}

/**
 * Start test server and return environment details
 */
export async function startTestServer(config: TestConfig): Promise<TestEnvironment> {
  const portFile = path.resolve(config.server.portFile)

  // Ensure port file directory exists
  try {
    fs.mkdirSync(path.dirname(portFile), { recursive: true })
  } catch {}

  // Clean up existing port file
  try {
    if (fs.existsSync(portFile)) {
      fs.unlinkSync(portFile)
    }
  } catch {}

  // Start server process
  const serverScript = path.resolve('dist', 'index.js')
  const serverProcess = spawn(process.execPath, [serverScript], {
    env: {
      ...process.env,
      ...config.server.env,
      ADMIN_TOKEN: process.env.ADMIN_TOKEN || 'test-admin-token-12345-secure', // Ensure test token for auth validation
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://testuser:testpass@localhost:5432/testdb', // Dummy DB for tests
      NODE_ENV: 'test', // Set test env to skip real DB ops if possible
      PORT: '0', // Use ephemeral port
      PORT_FILE: portFile
    },
    stdio: ['ignore', 'pipe', 'pipe']
  })

  // Handle server output - always log for debugging startup issues
  serverProcess.stdout?.on('data', (data) => {
    const output = data.toString()
    console.log(`[Server STDOUT]: ${output.trim()}`)
  })
  serverProcess.stderr?.on('data', (data) => {
    const output = data.toString()
    console.error(`[Server STDERR]: ${output.trim()}`)
  })

  let exitCode: number | null = null
  serverProcess.on('exit', (code) => {
    exitCode = code ?? 0
  })

  try {
    // Wait for server to start and get port
    const port = await waitForPortFile(portFile, config.server.startupTimeoutMs)
    const baseUrl = config.server.baseUrl || `http://127.0.0.1:${port}`

    // Verify server is responding
    await waitFor(async () => {
      try {
        const response = await fetch(`${baseUrl}/api/health`)
        return response.ok
      } catch {
        return false
      }
    }, 10000)

    return {
      port,
      baseUrl,
      serverProcess,
      cleanup: async () => {
        try {
          if (serverProcess && exitCode === null) {
            serverProcess.kill('SIGINT')
            // Wait for graceful shutdown
            await waitFor(() => exitCode !== null, 5000).catch(() => {
              // Force kill if graceful shutdown fails
              serverProcess.kill('SIGKILL')
            })
          }
        } catch (error) {
          console.warn('Error during server cleanup:', error)
        }

        // Clean up port file
        try {
          if (fs.existsSync(portFile)) {
            fs.unlinkSync(portFile)
          }
        } catch {}
      }
    }
  } catch (error) {
    // Clean up on failure
    try {
      if (serverProcess && exitCode === null) {
        serverProcess.kill('SIGKILL')
      }
    } catch {}
    throw error
  }
}

/**
 * HTTP utilities for testing
 */
export class TestHttpClient {
  private authToken?: string

  constructor(
    private baseUrl: string,
    authToken?: string
  ) {
    this.authToken = authToken
  }

  /**
   * Set authentication token for all requests
   */
  setAuthToken(token: string): void {
    this.authToken = token
  }

  /**
   * Get default headers including authentication if available
   */
  private getHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { ...additionalHeaders }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }

    return headers
  }

  async get(path: string, headers?: Record<string, string>): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.getHeaders(headers)
    })
  }

  async getJson<T = any>(path: string, headers?: Record<string, string>): Promise<T> {
    const response = await this.get(path, headers)
    if (!response.ok) {
      throw new Error(`GET ${path} -> ${response.status}`)
    }
    return response.json()
  }

  async post(path: string, body?: any, headers?: Record<string, string>): Promise<Response> {
    const requestHeaders = this.getHeaders(headers)
    // Always set Content-Type for POST to satisfy strict content-type validation
    requestHeaders['Content-Type'] = 'application/json'
  
    // TEMP LOG for debugging auth issues in load tests
    if (requestHeaders['Authorization']) {
      const tokenPrefix = requestHeaders['Authorization'].substring(0, 20) + '...'
      console.log(`[TestHttpClient] Sending POST to ${path} with Authorization: ${tokenPrefix}`)
    } else {
      console.log(`[TestHttpClient] Sending POST to ${path} WITHOUT Authorization header`)
    }
  
    return fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined
    })
  }

  async postJson<T = any>(path: string, body?: any, headers?: Record<string, string>): Promise<T> {
    const response = await this.post(path, body, headers)
    if (!response.ok) {
      let details = ''
      try {
        details = await response.text()
      } catch {}
      const snippet = details ? `: ${details.substring(0, 200)}` : ''
      throw new Error(`POST ${path} -> ${response.status}${snippet}`)
    }
    return response.json()
  }

  async patch(path: string, body?: any, headers?: Record<string, string>): Promise<Response> {
    const requestHeaders = this.getHeaders(headers)
    requestHeaders['Content-Type'] = 'application/json'

    return fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined
    })
  }

  async put(path: string, body?: any, headers?: Record<string, string>): Promise<Response> {
    const requestHeaders = this.getHeaders(headers)
    requestHeaders['Content-Type'] = 'application/json'

    return fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined
    })
  }

  async delete(path: string, headers?: Record<string, string>): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(headers)
    })
  }

  /**
   * Test Server-Sent Events streaming
   */
  async streamSSE(path: string, body: any, timeoutMs: number = 10000): Promise<string> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`SSE ${path} -> ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body for SSE')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      let gotContent = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          const data = line.slice(6)
          if (data === '[DONE]') {
            return accumulated
          }

          try {
            const parsed = JSON.parse(data)
            if (parsed?.content) {
              accumulated += parsed.content
              gotContent = true
            }
          } catch {
            // Ignore incomplete JSON lines
          }
        }

        // Return early if we have enough content to verify streaming works
        if (gotContent && accumulated.length > 50) {
          return accumulated
        }
      }

      if (!gotContent) {
        throw new Error('No SSE content received')
      }

      return accumulated
    } finally {
      clearTimeout(timeout)
      try {
        controller.abort()
      } catch {}
    }
  }
}

/**
 * Test data management utilities
 */
export class TestDataManager {
  constructor(private httpClient: TestHttpClient) {}

  /**
   * Reset demo data to a known state
   */
  async resetDemoData(scenario: string = 'default', seed?: number): Promise<void> {
    await this.httpClient.postJson('/api/demo/reset')
    if (scenario !== 'default' || seed !== undefined) {
      await this.httpClient.postJson(`/api/demo/seed?scenario=${scenario}&seed=${seed || ''}`)
    }
  }

  /**
   * Set demo time for testing time-dependent functionality
   */
  async setDemoTime(date: string): Promise<void> {
    await this.httpClient.postJson(`/api/demo/time?date=${encodeURIComponent(date)}`)
  }

  /**
   * Clear demo time freeze
   */
  async clearDemoTime(): Promise<void> {
    await this.httpClient.postJson('/api/demo/time?clear=1')
  }

  /**
   * Verify server health and get status
   */
  async getHealthStatus(): Promise<any> {
    return this.httpClient.getJson('/api/health')
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []

  async measureRequest<T>(
    name: string,
    request: () => Promise<T>
  ): Promise<{ result: T; metrics: PerformanceMetric }> {
    const startTime = Date.now()
    const startMemory = process.memoryUsage()

    try {
      const result = await request()
      const endTime = Date.now()
      const endMemory = process.memoryUsage()

      const metrics: PerformanceMetric = {
        name,
        duration: endTime - startTime,
        memoryUsage: {
          rss: endMemory.rss - startMemory.rss,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal
        },
        timestamp: new Date().toISOString(),
        success: true
      }

      this.metrics.push(metrics)
      return { result, metrics }
    } catch (error) {
      const endTime = Date.now()
      const metrics: PerformanceMetric = {
        name,
        duration: endTime - startTime,
        memoryUsage: { rss: 0, heapUsed: 0, heapTotal: 0 },
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }

      this.metrics.push(metrics)
      throw error
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  clearMetrics(): void {
    this.metrics = []
  }

  getAverageResponseTime(name?: string): number {
    const filtered = name ? this.metrics.filter((m) => m.name === name) : this.metrics
    if (filtered.length === 0) return 0
    return filtered.reduce((sum, m) => sum + m.duration, 0) / filtered.length
  }
}

export interface PerformanceMetric {
  name: string
  duration: number
  memoryUsage: {
    rss: number
    heapUsed: number
    heapTotal: number
  }
  timestamp: string
  success: boolean
  error?: string
}
