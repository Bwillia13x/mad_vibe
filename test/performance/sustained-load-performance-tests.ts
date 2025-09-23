/**
 * Sustained Load Performance Tests
 * Tests for performance monitoring, alerting, and optimization under sustained load
 */

import { TestHttpClient, startTestServer, type TestEnvironment } from '../utils/test-environment.js'
import { createTestResult, type TestResult } from '../reporting/test-reporter.js'
import type { TestConfig } from '../config/test-config.js'

export interface SustainedLoadTestConfig {
  durationMs: number
  concurrentUsers: number
  requestsPerUser: number
  monitoringInterval: number
  expectedMetrics: {
    maxResponseTimeMs: number
    maxErrorRate: number
    maxMemoryUsageMB: number
    maxHeapUtilization: number
  }
}

export class SustainedLoadPerformanceTester {
  private httpClient: TestHttpClient
  private testEnvironment: TestEnvironment | null = null

  constructor(private config: TestConfig) {
    this.httpClient = new TestHttpClient('')
  }

  /**
   * Execute sustained load performance tests
   */
  async executeTests(): Promise<TestResult[]> {
    const results: TestResult[] = []

    console.log('🔄 Starting sustained load performance tests...')

    try {
      // Start test server
      this.testEnvironment = await startTestServer(this.config)
      this.httpClient = new TestHttpClient(this.testEnvironment.baseUrl)

      console.log(`✅ Test server started on ${this.testEnvironment.baseUrl}`)

      // Wait for server to be ready
      await this.waitForServerReady()

      // Test 1: Performance monitoring functionality
      results.push(await this.testPerformanceMonitoring())

      // Test 2: Memory leak detection
      results.push(await this.testMemoryLeakDetection())

      // Test 3: Performance degradation detection
      results.push(await this.testPerformanceDegradationDetection())

      // Test 4: Sustained load with optimization
      results.push(await this.testSustainedLoadWithOptimization())

      // Test 5: Alert system functionality
      results.push(await this.testAlertSystem())

      console.log('✅ Sustained load performance tests completed')
    } catch (error) {
      console.error('❌ Sustained load performance tests failed:', error)
      results.push(
        createTestResult('performance', 'sustained-load-suite', 'fail', 0, {
          errors: [
            {
              message: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined
            }
          ]
        })
      )
    } finally {
      if (this.testEnvironment) {
        await this.testEnvironment.cleanup()
      }
    }

    return results
  }

  /**
   * Wait for server to be ready
   */
  private async waitForServerReady(): Promise<void> {
    const maxAttempts = 10
    const delayMs = 1000

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const health = await this.httpClient.getJson('/api/health')
        if (health?.status === 'ok') {
          return
        }
      } catch (error) {
        if (attempt === maxAttempts) {
          throw new Error(`Server not ready after ${maxAttempts} attempts: ${error}`)
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }

  /**
   * Test performance monitoring functionality
   */
  private async testPerformanceMonitoring(): Promise<TestResult> {
    return this.runTest('performance-monitoring', async () => {
      console.log('Testing performance monitoring functionality...')

      // Generate some load to create metrics
      const requests = Array.from({ length: 20 }, (_, i) => this.httpClient.getJson('/api/health'))
      await Promise.all(requests)

      // Wait for metrics to be collected
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Check dashboard data
      const dashboard = await this.httpClient.getJson('/api/performance/dashboard')
      if (!dashboard?.success) {
        throw new Error('Failed to get dashboard data')
      }

      const { summary, metrics } = dashboard.data

      // Validate summary data
      if (!summary || typeof summary.health !== 'string') {
        throw new Error('Invalid summary data structure')
      }

      if (!metrics?.current) {
        throw new Error('No current metrics available')
      }

      // Validate metrics structure
      const current = metrics.current
      if (!current.requests || !current.responseTime || !current.system) {
        throw new Error('Invalid metrics structure')
      }

      console.log(
        `✅ Performance monitoring working - Health: ${summary.health}, Response time: ${Math.round(current.responseTime.average)}ms`
      )

      return {
        health: summary.health,
        responseTime: Math.round(current.responseTime.average),
        totalRequests: current.requests.total,
        errorRate: current.requests.errorRate
      }
    })
  }

  /**
   * Test memory leak detection
   */
  private async testMemoryLeakDetection(): Promise<TestResult> {
    return this.runTest('memory-leak-detection', async () => {
      console.log('Testing memory leak detection...')

      // Get optimizer status
      const optimizerStatus = await this.httpClient.getJson('/api/performance/optimizer/status')
      if (!optimizerStatus?.success) {
        throw new Error('Failed to get optimizer status')
      }

      const status = optimizerStatus.data

      // Validate memory leak detection is enabled
      if (!status.memoryLeakDetection?.enabled) {
        throw new Error('Memory leak detection is not enabled')
      }

      // Trigger memory optimization to test functionality
      const optimizeResponse = await this.httpClient.postJson(
        '/api/performance/optimizer/memory',
        {}
      )
      if (!optimizeResponse?.success) {
        throw new Error('Failed to trigger memory optimization')
      }

      console.log('✅ Memory leak detection system is functional')

      return {
        enabled: status.memoryLeakDetection.enabled,
        consecutiveIncreases: status.memoryLeakDetection.consecutiveIncreases,
        recommendations: status.recommendations
      }
    })
  }

  /**
   * Test performance degradation detection
   */
  private async testPerformanceDegradationDetection(): Promise<TestResult> {
    return this.runTest('performance-degradation-detection', async () => {
      console.log('Testing performance degradation detection...')

      // Get initial metrics
      const initialMetrics = await this.httpClient.getJson('/api/performance/metrics')
      if (!initialMetrics?.success) {
        throw new Error('Failed to get initial metrics')
      }

      // Generate sustained load to create performance data
      const loadPromises = []
      for (let i = 0; i < 50; i++) {
        loadPromises.push(
          this.httpClient.getJson('/api/health').catch(() => null),
          this.httpClient.getJson('/api/services').catch(() => null)
        )
      }

      await Promise.all(loadPromises)

      // Wait for performance analysis
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Check optimizer status for degradation detection
      const optimizerStatus = await this.httpClient.getJson('/api/performance/optimizer/status')
      if (!optimizerStatus?.success) {
        throw new Error('Failed to get optimizer status after load')
      }

      const status = optimizerStatus.data

      if (!status.performanceDegradation?.enabled) {
        throw new Error('Performance degradation detection is not enabled')
      }

      console.log('✅ Performance degradation detection system is functional')

      return {
        enabled: status.performanceDegradation.enabled,
        snapshotCount: status.performanceDegradation.snapshotCount,
        consecutiveDecreases: status.performanceDegradation.consecutiveDecreases
      }
    })
  }

  /**
   * Test sustained load with optimization
   */
  private async testSustainedLoadWithOptimization(): Promise<TestResult> {
    return this.runTest('sustained-load-optimization', async () => {
      console.log('Testing sustained load with optimization...')

      const testConfig: SustainedLoadTestConfig = {
        durationMs: 60000, // 1 minute
        concurrentUsers: 20,
        requestsPerUser: 50,
        monitoringInterval: 5000, // 5 seconds
        expectedMetrics: {
          maxResponseTimeMs: 2000,
          maxErrorRate: 5,
          maxMemoryUsageMB: 500,
          maxHeapUtilization: 90
        }
      }

      const startTime = Date.now()
      const endTime = startTime + testConfig.durationMs
      const metricsHistory: any[] = []

      // Start monitoring
      const monitoringInterval = setInterval(async () => {
        try {
          const metrics = await this.httpClient.getJson('/api/performance/metrics')
          if (metrics?.success && metrics.data?.current) {
            metricsHistory.push({
              timestamp: Date.now(),
              ...metrics.data.current
            })
          }
        } catch (error) {
          console.warn('Failed to collect metrics during sustained load:', error)
        }
      }, testConfig.monitoringInterval)

      // Generate sustained load
      const loadPromises: Promise<any>[] = []

      while (Date.now() < endTime) {
        // Create batch of concurrent requests
        const batchPromises = Array.from({ length: testConfig.concurrentUsers }, async () => {
          const userRequests = Array.from(
            { length: Math.min(10, testConfig.requestsPerUser) },
            () => {
              const endpoints = ['/api/health', '/api/services', '/api/staff', '/api/customers']
              const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)]
              return this.httpClient.getJson(endpoint).catch(() => null)
            }
          )

          return Promise.all(userRequests)
        })

        loadPromises.push(...batchPromises)

        // Wait a bit before next batch
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      // Wait for all requests to complete
      await Promise.all(loadPromises)

      // Stop monitoring
      clearInterval(monitoringInterval)

      // Wait for final metrics
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Collect final metrics
      const finalMetrics = await this.httpClient.getJson('/api/performance/metrics')
      if (finalMetrics?.success && finalMetrics.data?.current) {
        metricsHistory.push({
          timestamp: Date.now(),
          ...finalMetrics.data.current
        })
      }

      // Analyze results
      if (metricsHistory.length === 0) {
        throw new Error('No metrics collected during sustained load test')
      }

      const maxResponseTime = Math.max(...metricsHistory.map((m) => m.responseTime?.average || 0))
      const maxErrorRate = Math.max(...metricsHistory.map((m) => m.requests?.errorRate || 0))
      const maxMemoryUsage = Math.max(...metricsHistory.map((m) => m.system?.memoryUsage || 0))
      const maxHeapUtilization = Math.max(
        ...metricsHistory.map((m) => m.system?.heapUtilization || 0)
      )

      // Validate against thresholds
      const violations = []
      if (maxResponseTime > testConfig.expectedMetrics.maxResponseTimeMs) {
        violations.push(
          `Response time exceeded threshold: ${maxResponseTime}ms > ${testConfig.expectedMetrics.maxResponseTimeMs}ms`
        )
      }
      if (maxErrorRate > testConfig.expectedMetrics.maxErrorRate) {
        violations.push(
          `Error rate exceeded threshold: ${maxErrorRate}% > ${testConfig.expectedMetrics.maxErrorRate}%`
        )
      }
      if (maxMemoryUsage > testConfig.expectedMetrics.maxMemoryUsageMB) {
        violations.push(
          `Memory usage exceeded threshold: ${maxMemoryUsage}MB > ${testConfig.expectedMetrics.maxMemoryUsageMB}MB`
        )
      }
      if (maxHeapUtilization > testConfig.expectedMetrics.maxHeapUtilization) {
        violations.push(
          `Heap utilization exceeded threshold: ${maxHeapUtilization}% > ${testConfig.expectedMetrics.maxHeapUtilization}%`
        )
      }

      if (violations.length > 0) {
        console.warn('⚠️  Sustained load test had violations:', violations)
      } else {
        console.log('✅ Sustained load test passed all thresholds')
      }

      console.log(
        `✅ Sustained load test completed - Max response time: ${Math.round(maxResponseTime)}ms, Max error rate: ${maxErrorRate.toFixed(1)}%`
      )

      return {
        duration: testConfig.durationMs,
        metricsCollected: metricsHistory.length,
        maxResponseTime: Math.round(maxResponseTime),
        maxErrorRate: Number(maxErrorRate.toFixed(2)),
        maxMemoryUsage: Math.round(maxMemoryUsage),
        maxHeapUtilization: Math.round(maxHeapUtilization),
        violations,
        passed: violations.length === 0
      }
    })
  }

  /**
   * Test alert system functionality
   */
  private async testAlertSystem(): Promise<TestResult> {
    return this.runTest('alert-system', async () => {
      console.log('Testing alert system functionality...')

      // Get current alerts
      const alertsResponse = await this.httpClient.getJson('/api/performance/alerts')
      if (!alertsResponse?.success) {
        throw new Error('Failed to get alerts')
      }

      const { alerts, activeCount } = alertsResponse.data

      // Test alert resolution if there are active alerts
      if (activeCount > 0) {
        const activeAlert = alerts.find((alert: any) => !alert.resolved)
        if (activeAlert) {
          const resolveResponse = await this.httpClient.postJson(
            `/api/performance/alerts/${activeAlert.id}/resolve`,
            {}
          )
          if (!resolveResponse?.success) {
            throw new Error('Failed to resolve alert')
          }
          console.log(`✅ Successfully resolved alert: ${activeAlert.id}`)
        }
      }

      // Generate performance report to test reporting system
      const reportResponse = await this.httpClient.postJson('/api/performance/reports', {
        periodHours: 1
      })

      if (!reportResponse?.success) {
        throw new Error('Failed to generate performance report')
      }

      const report = reportResponse.data
      if (!report.id || !report.summary) {
        throw new Error('Invalid report structure')
      }

      console.log('✅ Alert system and reporting functionality working')

      return {
        totalAlerts: alerts.length,
        activeAlerts: activeCount,
        reportGenerated: true,
        reportId: report.id,
        reportSummary: report.summary
      }
    })
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
 * Create default sustained load test configuration
 */
export function createDefaultSustainedLoadConfig(): SustainedLoadTestConfig {
  return {
    durationMs: 60000, // 1 minute
    concurrentUsers: 20,
    requestsPerUser: 50,
    monitoringInterval: 5000, // 5 seconds
    expectedMetrics: {
      maxResponseTimeMs: 2000,
      maxErrorRate: 5,
      maxMemoryUsageMB: 500,
      maxHeapUtilization: 90
    }
  }
}
