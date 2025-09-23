/**
 * Connection and Resource Management Tests
 * Tests for enhanced database connection pooling, request throttling, and resource management
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { performance } from 'perf_hooks'

interface TestConfig {
  baseUrl: string
  concurrentUsers: number
  testDuration: number
  requestsPerUser: number
}

interface ConnectionTestResult {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  maxResponseTime: number
  minResponseTime: number
  requestsPerSecond: number
  errorRate: number
  connectionErrors: number
  timeoutErrors: number
  throttlingErrors: number
}

interface ResourceTestResult {
  initialMemory: number
  peakMemory: number
  finalMemory: number
  memoryGrowth: number
  gcCollections: number
  activeConnections: number
  poolUtilization: number
  resourceLeaks: boolean
}

export class ConnectionResourceTester {
  private config: TestConfig
  private results: {
    connection: ConnectionTestResult
    resource: ResourceTestResult
  }

  constructor(config: Partial<TestConfig> = {}) {
    this.config = {
      baseUrl: process.env.TEST_URL || 'http://localhost:5000',
      concurrentUsers: 50,
      testDuration: 60000, // 1 minute
      requestsPerUser: 100,
      ...config
    }

    this.results = {
      connection: this.initializeConnectionResult(),
      resource: this.initializeResourceResult()
    }
  }

  private initializeConnectionResult(): ConnectionTestResult {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      requestsPerSecond: 0,
      errorRate: 0,
      connectionErrors: 0,
      timeoutErrors: 0,
      throttlingErrors: 0
    }
  }

  private initializeResourceResult(): ResourceTestResult {
    return {
      initialMemory: 0,
      peakMemory: 0,
      finalMemory: 0,
      memoryGrowth: 0,
      gcCollections: 0,
      activeConnections: 0,
      poolUtilization: 0,
      resourceLeaks: false
    }
  }

  /**
   * Test database connection pooling under concurrent load
   */
  async testConnectionPooling(): Promise<ConnectionTestResult> {
    console.log(
      `Testing connection pooling with ${this.config.concurrentUsers} concurrent users...`
    )

    const startTime = performance.now()
    const responseTimes: number[] = []
    const promises: Promise<void>[] = []

    // Create concurrent users
    for (let i = 0; i < this.config.concurrentUsers; i++) {
      promises.push(this.simulateUser(i, responseTimes))
    }

    // Wait for all users to complete
    await Promise.allSettled(promises)

    const endTime = performance.now()
    const totalDuration = endTime - startTime

    // Calculate results
    this.results.connection.totalRequests = responseTimes.length
    this.results.connection.successfulRequests = responseTimes.filter((t) => t > 0).length
    this.results.connection.failedRequests =
      this.results.connection.totalRequests - this.results.connection.successfulRequests
    this.results.connection.averageResponseTime =
      responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0
    this.results.connection.maxResponseTime = Math.max(...responseTimes, 0)
    this.results.connection.minResponseTime = Math.min(...responseTimes.filter((t) => t > 0), 0)
    this.results.connection.requestsPerSecond =
      (this.results.connection.totalRequests / totalDuration) * 1000
    this.results.connection.errorRate =
      (this.results.connection.failedRequests / this.results.connection.totalRequests) * 100

    console.log('Connection pooling test completed:', this.results.connection)
    return this.results.connection
  }

  /**
   * Simulate a single user making requests
   */
  private async simulateUser(userId: number, responseTimes: number[]): Promise<void> {
    const endpoints = [
      '/api/health',
      '/api/services',
      '/api/staff',
      '/api/customers',
      '/api/appointments',
      '/api/inventory',
      '/api/analytics'
    ]

    for (let i = 0; i < this.config.requestsPerUser; i++) {
      try {
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)]
        const startTime = performance.now()

        const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': `LoadTest-User-${userId}`
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        })

        const endTime = performance.now()
        const responseTime = endTime - startTime

        if (response.ok) {
          responseTimes.push(responseTime)
        } else {
          responseTimes.push(-1) // Mark as failed

          if (response.status === 429) {
            this.results.connection.throttlingErrors++
          } else if (response.status >= 500) {
            this.results.connection.connectionErrors++
          }
        }

        // Small delay between requests to simulate real usage
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 100))
      } catch (error) {
        responseTimes.push(-1) // Mark as failed

        if (error instanceof Error) {
          if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
            this.results.connection.timeoutErrors++
          } else {
            this.results.connection.connectionErrors++
          }
        }
      }
    }
  }

  /**
   * Test resource management and memory usage
   */
  async testResourceManagement(): Promise<ResourceTestResult> {
    console.log('Testing resource management...')

    // Get initial memory usage
    const initialHealth = await this.getHealthMetrics()
    this.results.resource.initialMemory = initialHealth.system?.memory?.used || 0

    let peakMemory = this.results.resource.initialMemory
    const memoryReadings: number[] = []

    // Monitor memory during load test
    const monitoringInterval = setInterval(async () => {
      try {
        const health = await this.getHealthMetrics()
        const currentMemory = health.system?.memory?.used || 0
        memoryReadings.push(currentMemory)

        if (currentMemory > peakMemory) {
          peakMemory = currentMemory
        }
      } catch (error) {
        // Ignore monitoring errors
      }
    }, 1000)

    // Run connection pooling test to generate load
    await this.testConnectionPooling()

    // Stop monitoring
    clearInterval(monitoringInterval)

    // Get final metrics
    const finalHealth = await this.getHealthMetrics()
    this.results.resource.finalMemory = finalHealth.system?.memory?.used || 0
    this.results.resource.peakMemory = peakMemory
    this.results.resource.memoryGrowth =
      this.results.resource.finalMemory - this.results.resource.initialMemory
    this.results.resource.activeConnections = finalHealth.system?.database?.activeConnections || 0
    this.results.resource.poolUtilization = finalHealth.system?.database?.poolUtilization || 0

    // Check for resource leaks
    this.results.resource.resourceLeaks = this.results.resource.memoryGrowth > 100 // More than 100MB growth

    console.log('Resource management test completed:', this.results.resource)
    return this.results.resource
  }

  /**
   * Get health metrics from the server
   */
  private async getHealthMetrics(): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/health`)
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.warn('Failed to get health metrics:', error)
      return {}
    }
  }

  /**
   * Test request throttling behavior
   */
  async testRequestThrottling(): Promise<{
    throttlingTriggered: boolean
    maxConcurrentHandled: number
    queueingWorking: boolean
  }> {
    console.log('Testing request throttling...')

    const results = {
      throttlingTriggered: false,
      maxConcurrentHandled: 0,
      queueingWorking: false
    }

    // Send burst of requests to trigger throttling
    const burstSize = 100
    const promises: Promise<Response>[] = []

    for (let i = 0; i < burstSize; i++) {
      promises.push(
        fetch(`${this.config.baseUrl}/api/health`, {
          method: 'GET',
          headers: { 'User-Agent': `ThrottleTest-${i}` }
        })
      )
    }

    const responses = await Promise.allSettled(promises)

    let successCount = 0
    let throttledCount = 0
    let queuedCount = 0

    for (const result of responses) {
      if (result.status === 'fulfilled') {
        const response = result.value
        if (response.status === 200) {
          successCount++
        } else if (response.status === 429) {
          throttledCount++
          results.throttlingTriggered = true
        } else if (response.status === 503) {
          queuedCount++
          results.queueingWorking = true
        }
      }
    }

    results.maxConcurrentHandled = successCount

    console.log('Request throttling test completed:', {
      ...results,
      successCount,
      throttledCount,
      queuedCount
    })

    return results
  }

  /**
   * Run comprehensive connection and resource tests
   */
  async runComprehensiveTest(): Promise<{
    connection: ConnectionTestResult
    resource: ResourceTestResult
    throttling: any
    passed: boolean
    issues: string[]
  }> {
    console.log('Running comprehensive connection and resource management tests...')

    const issues: string[] = []

    try {
      // Test connection pooling
      const connectionResult = await this.testConnectionPooling()

      // Test resource management
      const resourceResult = await this.testResourceManagement()

      // Test request throttling
      const throttlingResult = await this.testRequestThrottling()

      // Validate results
      if (connectionResult.errorRate > 1) {
        issues.push(`High error rate: ${connectionResult.errorRate.toFixed(2)}%`)
      }

      if (connectionResult.averageResponseTime > 2000) {
        issues.push(
          `High average response time: ${connectionResult.averageResponseTime.toFixed(0)}ms`
        )
      }

      if (resourceResult.memoryGrowth > 200) {
        issues.push(`Excessive memory growth: ${resourceResult.memoryGrowth}MB`)
      }

      if (resourceResult.poolUtilization > 90) {
        issues.push(`High pool utilization: ${resourceResult.poolUtilization.toFixed(1)}%`)
      }

      if (!throttlingResult.throttlingTriggered) {
        issues.push('Request throttling not working properly')
      }

      const passed = issues.length === 0

      console.log(`Comprehensive test ${passed ? 'PASSED' : 'FAILED'}`)
      if (issues.length > 0) {
        console.log('Issues found:', issues)
      }

      return {
        connection: connectionResult,
        resource: resourceResult,
        throttling: throttlingResult,
        passed,
        issues
      }
    } catch (error) {
      console.error('Comprehensive test failed:', error)
      issues.push(
        `Test execution failed: ${error instanceof Error ? error.message : String(error)}`
      )

      return {
        connection: this.results.connection,
        resource: this.results.resource,
        throttling: {},
        passed: false,
        issues
      }
    }
  }
}

// Test suite
describe('Connection and Resource Management', () => {
  let tester: ConnectionResourceTester

  beforeAll(() => {
    tester = new ConnectionResourceTester({
      concurrentUsers: 25, // Reduced for CI environment
      requestsPerUser: 20,
      testDuration: 30000 // 30 seconds
    })
  })

  it('should handle concurrent database connections efficiently', async () => {
    const result = await tester.testConnectionPooling()

    expect(result.errorRate).toBeLessThan(1) // Less than 1% error rate
    expect(result.averageResponseTime).toBeLessThan(2000) // Less than 2 seconds
    expect(result.requestsPerSecond).toBeGreaterThan(10) // At least 10 RPS
  }, 60000)

  it('should manage memory and resources properly', async () => {
    const result = await tester.testResourceManagement()

    expect(result.memoryGrowth).toBeLessThan(200) // Less than 200MB growth
    expect(result.resourceLeaks).toBe(false)
    expect(result.poolUtilization).toBeLessThan(90) // Less than 90% utilization
  }, 90000)

  it('should throttle requests under high load', async () => {
    const result = await tester.testRequestThrottling()

    expect(result.throttlingTriggered).toBe(true)
    expect(result.maxConcurrentHandled).toBeGreaterThan(0)
  }, 30000)

  it('should pass comprehensive performance validation', async () => {
    const result = await tester.runComprehensiveTest()

    expect(result.passed).toBe(true)
    expect(result.issues).toHaveLength(0)
  }, 120000)
})

// Export for standalone usage
export { ConnectionResourceTester }
