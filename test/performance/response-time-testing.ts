/**
 * Response Time and Latency Testing Module
 * Provides detailed API endpoint latency measurement, page load time validation,
 * and streaming performance testing for AI chat functionality
 */

import { TestHttpClient, type TestEnvironment } from '../utils/test-environment.js'
import { createTestResult, type TestResult } from '../reporting/test-reporter.js'

export interface ResponseTimeTestConfig {
  endpoints: ResponseTimeEndpoint[]
  iterations: number
  warmupIterations: number
  concurrentRequests: number
  thresholds: ResponseTimeThresholds
  pageLoadTest: PageLoadTestConfig
  streamingTest: StreamingTestConfig
}

export interface ResponseTimeEndpoint {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: any
  headers?: Record<string, string>
  expectedStatus?: number
  description?: string
}

export interface ResponseTimeThresholds {
  maxAverageMs: number
  maxP95Ms: number
  maxP99Ms: number
  maxSingleRequestMs: number
}

export interface PageLoadTestConfig {
  enabled: boolean
  pages: string[]
  maxLoadTimeMs: number
  includeAssets: boolean
}

export interface StreamingTestConfig {
  enabled: boolean
  endpoint: string
  testMessages: string[]
  maxFirstByteMs: number
  minStreamingRateCharsPerSec: number
  maxTotalTimeMs: number
}

export interface ResponseTimeResult {
  endpoint: ResponseTimeEndpoint
  measurements: ResponseTimeMeasurement[]
  statistics: ResponseTimeStatistics
  passed: boolean
  violations: string[]
}

export interface ResponseTimeMeasurement {
  timestamp: number
  responseTime: number
  status: number
  success: boolean
  error?: string
  size?: number
}

export interface ResponseTimeStatistics {
  count: number
  average: number
  median: number
  min: number
  max: number
  p95: number
  p99: number
  standardDeviation: number
  successRate: number
  throughput: number // requests per second
}

export interface PageLoadResult {
  page: string
  loadTime: number
  assetCount?: number
  totalSize?: number
  passed: boolean
  error?: string
}

export interface StreamingResult {
  message: string
  firstByteTime: number
  totalTime: number
  totalChars: number
  streamingRate: number // chars per second
  chunks: StreamingChunk[]
  passed: boolean
  violations: string[]
}

export interface StreamingChunk {
  timestamp: number
  content: string
  size: number
  deltaTime: number
}

/**
 * Response Time Testing Framework
 */
export class ResponseTimeTester {
  private httpClient: TestHttpClient

  constructor(
    private baseUrl: string,
    authToken?: string
  ) {
    this.httpClient = new TestHttpClient(baseUrl)
    if (authToken) {
      this.httpClient.setAuthToken(authToken)
    }
  }

  /**
   * Execute comprehensive response time tests
   */
  async executeTests(config: ResponseTimeTestConfig): Promise<TestResult[]> {
    const results: TestResult[] = []

    console.log('⏱️  Starting response time and latency tests...')

    // API endpoint response time tests
    for (const endpoint of config.endpoints) {
      results.push(await this.testEndpointResponseTime(endpoint, config))
    }

    // Concurrent request latency test
    results.push(await this.testConcurrentLatency(config))

    // Page load time tests
    if (config.pageLoadTest.enabled) {
      results.push(...(await this.testPageLoadTimes(config.pageLoadTest)))
    }

    // Streaming performance tests
    if (config.streamingTest.enabled) {
      results.push(...(await this.testStreamingPerformance(config.streamingTest)))
    }

    console.log('✅ Response time and latency tests completed')
    return results
  }

  /**
   * Test individual endpoint response time
   */
  private async testEndpointResponseTime(
    endpoint: ResponseTimeEndpoint,
    config: ResponseTimeTestConfig
  ): Promise<TestResult> {
    const testName = `response-time-${endpoint.path.replace(/[^a-zA-Z0-9]/g, '-')}`

    return this.runTest(testName, async () => {
      console.log(`  Testing ${endpoint.method} ${endpoint.path}...`)

      // Warmup requests
      for (let i = 0; i < config.warmupIterations; i++) {
        try {
          await this.makeRequest(endpoint)
        } catch (error) {
          // Ignore warmup errors
        }
      }

      // Actual measurements
      const measurements: ResponseTimeMeasurement[] = []

      for (let i = 0; i < config.iterations; i++) {
        const measurement = await this.measureRequest(endpoint)
        measurements.push(measurement)

        // Small delay between requests to avoid overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 50))
      }

      // Calculate statistics
      const statistics = this.calculateStatistics(measurements)

      // Validate against thresholds
      const violations: string[] = []

      if (statistics.average > config.thresholds.maxAverageMs) {
        violations.push(
          `Average response time (${statistics.average.toFixed(1)}ms) exceeds threshold (${config.thresholds.maxAverageMs}ms)`
        )
      }

      if (statistics.p95 > config.thresholds.maxP95Ms) {
        violations.push(
          `95th percentile (${statistics.p95.toFixed(1)}ms) exceeds threshold (${config.thresholds.maxP95Ms}ms)`
        )
      }

      if (statistics.p99 > config.thresholds.maxP99Ms) {
        violations.push(
          `99th percentile (${statistics.p99.toFixed(1)}ms) exceeds threshold (${config.thresholds.maxP99Ms}ms)`
        )
      }

      if (statistics.max > config.thresholds.maxSingleRequestMs) {
        violations.push(
          `Maximum response time (${statistics.max}ms) exceeds threshold (${config.thresholds.maxSingleRequestMs}ms)`
        )
      }

      const result: ResponseTimeResult = {
        endpoint,
        measurements,
        statistics,
        passed: violations.length === 0,
        violations
      }

      if (!result.passed) {
        throw new Error(`Response time test failed: ${violations.join(', ')}`)
      }

      console.log(
        `    ✅ avg=${statistics.average.toFixed(1)}ms, p95=${statistics.p95.toFixed(1)}ms, p99=${statistics.p99.toFixed(1)}ms`
      )

      return result
    })
  }

  /**
   * Test concurrent request latency
   */
  private async testConcurrentLatency(config: ResponseTimeTestConfig): Promise<TestResult> {
    return this.runTest('concurrent-latency', async () => {
      console.log(`  Testing concurrent latency with ${config.concurrentRequests} requests...`)

      // Use the first endpoint for concurrent testing
      const endpoint = config.endpoints[0]
      if (!endpoint) {
        throw new Error('No endpoints configured for concurrent testing')
      }

      const promises: Promise<ResponseTimeMeasurement>[] = []
      const startTime = Date.now()

      // Launch all requests simultaneously
      for (let i = 0; i < config.concurrentRequests; i++) {
        promises.push(this.measureRequest(endpoint))
      }

      // Wait for all requests to complete
      const measurements = await Promise.all(promises)
      const totalTime = Date.now() - startTime

      // Calculate statistics
      const statistics = this.calculateStatistics(measurements)

      // Validate concurrent performance
      const violations: string[] = []
      const expectedMaxTime = config.thresholds.maxAverageMs * 2 // Allow 2x normal time for concurrent requests

      if (statistics.average > expectedMaxTime) {
        violations.push(
          `Concurrent average response time (${statistics.average.toFixed(1)}ms) exceeds threshold (${expectedMaxTime}ms)`
        )
      }

      const throughput = (config.concurrentRequests / totalTime) * 1000 // requests per second
      const minThroughput = 10 // Minimum 10 RPS

      if (throughput < minThroughput) {
        violations.push(
          `Concurrent throughput (${throughput.toFixed(1)} RPS) below threshold (${minThroughput} RPS)`
        )
      }

      if (violations.length > 0) {
        throw new Error(`Concurrent latency test failed: ${violations.join(', ')}`)
      }

      console.log(
        `    ✅ ${config.concurrentRequests} concurrent requests: avg=${statistics.average.toFixed(1)}ms, throughput=${throughput.toFixed(1)} RPS`
      )

      return {
        concurrentRequests: config.concurrentRequests,
        totalTime,
        throughput,
        statistics,
        measurements
      }
    })
  }

  /**
   * Test page load times
   */
  private async testPageLoadTimes(config: PageLoadTestConfig): Promise<TestResult[]> {
    const results: TestResult[] = []

    console.log('  Testing page load times...')

    for (const page of config.pages) {
      results.push(
        await this.runTest(`page-load-${page.replace(/[^a-zA-Z0-9]/g, '-')}`, async () => {
          const startTime = Date.now()

          try {
            const response = await this.httpClient.get(page)

            if (!response.ok) {
              throw new Error(`Page load failed: HTTP ${response.status}`)
            }

            // Read the full response to measure complete load time
            const content = await response.text()
            const loadTime = Date.now() - startTime

            // Count assets if HTML content
            let assetCount = 0
            if (response.headers.get('content-type')?.includes('text/html')) {
              const assetMatches = content.match(/<(?:img|script|link|style)[^>]*>/gi)
              assetCount = assetMatches ? assetMatches.length : 0
            }

            const result: PageLoadResult = {
              page,
              loadTime,
              assetCount: config.includeAssets ? assetCount : undefined,
              totalSize: content.length,
              passed: loadTime <= config.maxLoadTimeMs,
              error: undefined
            }

            if (!result.passed) {
              throw new Error(
                `Page load time (${loadTime}ms) exceeds threshold (${config.maxLoadTimeMs}ms)`
              )
            }

            console.log(
              `    ✅ ${page}: ${loadTime}ms (${assetCount} assets, ${(content.length / 1024).toFixed(1)}KB)`
            )

            return result
          } catch (error) {
            const loadTime = Date.now() - startTime
            throw new Error(`Page load failed after ${loadTime}ms: ${error}`)
          }
        })
      )
    }

    return results
  }

  /**
   * Test streaming performance for AI chat
   */
  private async testStreamingPerformance(config: StreamingTestConfig): Promise<TestResult[]> {
    const results: TestResult[] = []

    console.log('  Testing streaming performance...')

    for (const message of config.testMessages) {
      results.push(
        await this.runTest(
          `streaming-${message.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '-')}`,
          async () => {
            const streamingResult = await this.measureStreamingResponse(
              config.endpoint,
              message,
              config
            )

            if (!streamingResult.passed) {
              throw new Error(`Streaming test failed: ${streamingResult.violations.join(', ')}`)
            }

            console.log(
              `    ✅ "${message.substring(0, 30)}...": first byte=${streamingResult.firstByteTime}ms, rate=${streamingResult.streamingRate.toFixed(1)} chars/s`
            )

            return streamingResult
          }
        )
      )
    }

    return results
  }

  /**
   * Make a request to an endpoint
   */
  private async makeRequest(endpoint: ResponseTimeEndpoint): Promise<Response> {
    switch (endpoint.method) {
      case 'GET':
        return this.httpClient.get(endpoint.path, endpoint.headers)
      case 'POST':
        return this.httpClient.post(endpoint.path, endpoint.body || {}, endpoint.headers)
      case 'PUT':
        return this.httpClient.put(endpoint.path, endpoint.body || {}, endpoint.headers)
      case 'DELETE':
        return this.httpClient.delete(endpoint.path, endpoint.headers)
      case 'PATCH':
        return this.httpClient.patch(endpoint.path, endpoint.body || {}, endpoint.headers)
      default:
        throw new Error(`Unsupported method: ${endpoint.method}`)
    }
  }

  /**
   * Measure a single request
   */
  private async measureRequest(endpoint: ResponseTimeEndpoint): Promise<ResponseTimeMeasurement> {
    const startTime = Date.now()
    const timestamp = startTime

    try {
      const response = await this.makeRequest(endpoint)
      const responseTime = Date.now() - startTime

      // Read response to ensure complete measurement
      const content = await response.text()

      return {
        timestamp,
        responseTime,
        status: response.status,
        success: response.ok,
        size: content.length
      }
    } catch (error) {
      const responseTime = Date.now() - startTime

      return {
        timestamp,
        responseTime,
        status: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Measure streaming response performance
   */
  private async measureStreamingResponse(
    endpoint: string,
    message: string,
    config: StreamingTestConfig
  ): Promise<StreamingResult> {
    const startTime = Date.now()
    let firstByteTime = 0
    let totalChars = 0
    const chunks: StreamingChunk[] = []
    const violations: string[] = []

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message }],
          stream: true
        })
      })

      if (!response.ok) {
        throw new Error(`Streaming request failed: HTTP ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body for streaming')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        const now = Date.now()

        // Record first byte time
        if (firstByteTime === 0) {
          firstByteTime = now - startTime
        }

        const chunk = decoder.decode(value)
        buffer += chunk

        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          const data = line.slice(6)
          if (data === '[DONE]') {
            const totalTime = now - startTime
            const streamingRate = totalTime > 0 ? (totalChars / totalTime) * 1000 : 0

            // Validate streaming performance
            if (firstByteTime > config.maxFirstByteMs) {
              violations.push(
                `First byte time (${firstByteTime}ms) exceeds threshold (${config.maxFirstByteMs}ms)`
              )
            }

            if (streamingRate < config.minStreamingRateCharsPerSec) {
              violations.push(
                `Streaming rate (${streamingRate.toFixed(1)} chars/s) below threshold (${config.minStreamingRateCharsPerSec} chars/s)`
              )
            }

            if (totalTime > config.maxTotalTimeMs) {
              violations.push(
                `Total streaming time (${totalTime}ms) exceeds threshold (${config.maxTotalTimeMs}ms)`
              )
            }

            return {
              message,
              firstByteTime,
              totalTime,
              totalChars,
              streamingRate,
              chunks,
              passed: violations.length === 0,
              violations
            }
          }

          try {
            const parsed = JSON.parse(data)
            if (parsed?.content) {
              const content = parsed.content
              totalChars += content.length

              chunks.push({
                timestamp: now,
                content,
                size: content.length,
                deltaTime: now - startTime
              })
            }
          } catch {
            // Ignore malformed JSON chunks
          }
        }

        // Check for timeout
        if (Date.now() - startTime > config.maxTotalTimeMs * 2) {
          throw new Error('Streaming response timeout')
        }
      }

      throw new Error('Streaming ended without [DONE] marker')
    } catch (error) {
      const totalTime = Date.now() - startTime
      const streamingRate = totalTime > 0 ? (totalChars / totalTime) * 1000 : 0

      violations.push(`Streaming failed: ${error instanceof Error ? error.message : String(error)}`)

      return {
        message,
        firstByteTime,
        totalTime,
        totalChars,
        streamingRate,
        chunks,
        passed: false,
        violations
      }
    }
  }

  /**
   * Calculate response time statistics
   */
  private calculateStatistics(measurements: ResponseTimeMeasurement[]): ResponseTimeStatistics {
    const responseTimes = measurements.map((m) => m.responseTime)
    const successfulRequests = measurements.filter((m) => m.success)

    responseTimes.sort((a, b) => a - b)

    const count = measurements.length
    const sum = responseTimes.reduce((acc, rt) => acc + rt, 0)
    const average = count > 0 ? sum / count : 0

    const median = count > 0 ? responseTimes[Math.floor(count / 2)] : 0
    const min = count > 0 ? Math.min(...responseTimes) : 0
    const max = count > 0 ? Math.max(...responseTimes) : 0

    const p95Index = Math.floor(count * 0.95)
    const p99Index = Math.floor(count * 0.99)
    const p95 = count > 0 ? responseTimes[p95Index] || max : 0
    const p99 = count > 0 ? responseTimes[p99Index] || max : 0

    // Calculate standard deviation
    const variance =
      count > 0 ? responseTimes.reduce((acc, rt) => acc + Math.pow(rt - average, 2), 0) / count : 0
    const standardDeviation = Math.sqrt(variance)

    const successRate = count > 0 ? (successfulRequests.length / count) * 100 : 0

    // Calculate throughput (this would need timing data for accurate calculation)
    const throughput = 0 // Placeholder - would need test duration

    return {
      count,
      average,
      median,
      min,
      max,
      p95,
      p99,
      standardDeviation,
      successRate,
      throughput
    }
  }

  /**
   * Helper method to run a single test with error handling
   */
  private async runTest(testName: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now()
    const startTimeIso = new Date().toISOString()

    try {
      const result = await testFn()
      const duration = Date.now() - startTime

      return createTestResult('performance', testName, 'pass', duration, {
        startTime: startTimeIso,
        endTime: new Date().toISOString(),
        result
      })
    } catch (error) {
      const duration = Date.now() - startTime

      return createTestResult('performance', testName, 'fail', duration, {
        startTime: startTimeIso,
        endTime: new Date().toISOString(),
        errors: [
          {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          }
        ]
      })
    }
  }
}

/**
 * Create default response time test configuration
 */
export function createDefaultResponseTimeConfig(baseUrl: string): ResponseTimeTestConfig {
  return {
    endpoints: [
      { path: '/api/health', method: 'GET', description: 'Health check endpoint' },
      { path: '/api/services', method: 'GET', description: 'Services list' },
      { path: '/api/staff', method: 'GET', description: 'Staff list' },
      { path: '/api/appointments?day=today', method: 'GET', description: "Today's appointments" },
      { path: '/api/customers', method: 'GET', description: 'Customer list' },
      { path: '/api/inventory', method: 'GET', description: 'Inventory list' },
      { path: '/api/analytics', method: 'GET', description: 'Analytics data' },
      { path: '/api/pos/sales', method: 'GET', description: 'POS sales' },
      { path: '/api/marketing/campaigns', method: 'GET', description: 'Marketing campaigns' },
      { path: '/api/loyalty/entries', method: 'GET', description: 'Loyalty entries' },
      {
        path: '/api/pos/sales',
        method: 'POST',
        description: 'Create POS sale',
        body: {
          items: [{ kind: 'service', id: 'service-1', name: 'Test Service', quantity: 1 }],
          discountPct: 0,
          taxPct: 8.5
        }
      }
    ],
    iterations: 20,
    warmupIterations: 3,
    concurrentRequests: 10,
    thresholds: {
      maxAverageMs: 200,
      maxP95Ms: 500,
      maxP99Ms: 1000,
      maxSingleRequestMs: 2000
    },
    pageLoadTest: {
      enabled: true,
      pages: [
        '/',
        '/pos',
        '/analytics',
        '/inventory',
        '/marketing',
        '/loyalty',
        '/scheduling',
        '/staff'
      ],
      maxLoadTimeMs: 2000,
      includeAssets: true
    },
    streamingTest: {
      enabled: true,
      endpoint: '/api/chat',
      testMessages: [
        'What is our schedule today?',
        'Give me a quick summary of our inventory status.',
        'How are our marketing campaigns performing?'
      ],
      maxFirstByteMs: 1000,
      minStreamingRateCharsPerSec: 50,
      maxTotalTimeMs: 10000
    }
  }
}
