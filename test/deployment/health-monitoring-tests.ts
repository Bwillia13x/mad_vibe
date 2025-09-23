/**
 * Health Monitoring and Alerting Tests
 * Tests health endpoint functionality, monitoring system validation, and alerting mechanisms
 */

import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { waitFor, delay, TestHttpClient } from '../utils/test-environment.js'
import type { TestConfig } from '../config/test-config.js'

export interface HealthTestResult {
  testName: string
  success: boolean
  duration: number
  error?: string
  details?: Record<string, any>
}

export interface HealthMetrics {
  responseTime: number
  status: string
  timestamp: string
  uptime?: number
  memoryUsage?: any
  cpuUsage?: number
}

export interface AlertingRule {
  name: string
  condition: (metrics: HealthMetrics) => boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
}

export class HealthMonitoringTester {
  private testResults: HealthTestResult[] = []
  private activeServers: ChildProcess[] = []
  private healthHistory: HealthMetrics[] = []

  constructor(private config: TestConfig) {}

  /**
   * Run all health monitoring and alerting tests
   */
  async runAllTests(): Promise<HealthTestResult[]> {
    this.testResults = []

    console.log('🏥 Starting health monitoring and alerting tests...')

    try {
      // Test 1: Health endpoint comprehensive testing
      await this.testHealthEndpointComprehensive()

      // Test 2: Health endpoint performance and reliability
      await this.testHealthEndpointPerformance()

      // Test 3: Health monitoring under load
      await this.testHealthMonitoringUnderLoad()

      // Test 4: Health status validation
      await this.testHealthStatusValidation()

      // Test 5: Alerting mechanism testing
      await this.testAlertingMechanisms()

      // Test 6: Health endpoint availability during failures
      await this.testHealthEndpointDuringFailures()

      // Test 7: Monitoring system integration
      await this.testMonitoringSystemIntegration()
    } finally {
      // Ensure all servers are cleaned up
      await this.cleanupAllServers()
    }

    return this.testResults
  }

  /**
   * Test health endpoint comprehensive functionality
   */
  private async testHealthEndpointComprehensive(): Promise<void> {
    const startTime = Date.now()

    try {
      console.log('  🔍 Testing health endpoint comprehensive functionality...')

      const environment = await this.startTestServer()

      try {
        const client = new TestHttpClient(environment.baseUrl)

        // Wait for server to be ready
        await waitFor(async () => {
          try {
            const response = await client.get('/api/health')
            return response.ok
          } catch {
            return false
          }
        }, 30000)

        // Test basic health response
        const healthResponse = await client.getJson('/api/health')

        // Validate health response structure
        const requiredFields = ['status', 'timestamp', 'env']
        const missingFields = requiredFields.filter((field) => !(field in healthResponse))

        if (missingFields.length > 0) {
          throw new Error(`Health response missing required fields: ${missingFields.join(', ')}`)
        }

        // Validate status value
        if (healthResponse.status !== 'ok') {
          throw new Error(`Invalid health status: ${healthResponse.status}`)
        }

        // Validate timestamp format
        const timestamp = new Date(healthResponse.timestamp)
        if (isNaN(timestamp.getTime())) {
          throw new Error(`Invalid timestamp format: ${healthResponse.timestamp}`)
        }

        // Test health response consistency
        const responses = []
        for (let i = 0; i < 5; i++) {
          const response = await client.getJson('/api/health')
          responses.push(response)
          await delay(100)
        }

        // Verify all responses have consistent structure
        const firstKeys = Object.keys(responses[0]).sort()
        const inconsistentResponses = responses.filter(
          (r) => JSON.stringify(Object.keys(r).sort()) !== JSON.stringify(firstKeys)
        )

        if (inconsistentResponses.length > 0) {
          throw new Error('Health endpoint responses are inconsistent')
        }

        this.addTestResult({
          testName: 'Health Endpoint Comprehensive',
          success: true,
          duration: Date.now() - startTime,
          details: {
            healthResponse,
            responseConsistency: {
              totalResponses: responses.length,
              inconsistentCount: inconsistentResponses.length
            },
            requiredFields: requiredFields,
            additionalFields: Object.keys(healthResponse).filter((k) => !requiredFields.includes(k))
          }
        })
      } finally {
        await environment.cleanup()
      }
    } catch (error) {
      this.addTestResult({
        testName: 'Health Endpoint Comprehensive',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Test health endpoint performance and reliability
   */
  private async testHealthEndpointPerformance(): Promise<void> {
    const startTime = Date.now()

    try {
      console.log('  ⚡ Testing health endpoint performance...')

      const environment = await this.startTestServer()

      try {
        const client = new TestHttpClient(environment.baseUrl)

        // Wait for server to be ready
        await waitFor(async () => {
          try {
            const response = await client.get('/api/health')
            return response.ok
          } catch {
            return false
          }
        }, 30000)

        // Performance test: measure response times
        const performanceTests = []
        const testCount = 50

        for (let i = 0; i < testCount; i++) {
          const testStart = Date.now()
          try {
            const response = await client.get('/api/health')
            const duration = Date.now() - testStart

            performanceTests.push({
              success: response.ok,
              duration,
              status: response.status
            })
          } catch (error) {
            performanceTests.push({
              success: false,
              duration: Date.now() - testStart,
              error: String(error)
            })
          }
        }

        // Analyze performance metrics
        const successfulTests = performanceTests.filter((t) => t.success)
        const failedTests = performanceTests.filter((t) => !t.success)

        if (successfulTests.length === 0) {
          throw new Error('All health endpoint performance tests failed')
        }

        const durations = successfulTests.map((t) => t.duration)
        const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length
        const maxDuration = Math.max(...durations)
        const minDuration = Math.min(...durations)
        const p95Duration = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)]

        // Performance thresholds
        const maxAcceptableAvg = 100 // 100ms average
        const maxAcceptableP95 = 200 // 200ms 95th percentile
        const minSuccessRate = 0.95 // 95% success rate

        const successRate = successfulTests.length / testCount

        if (avgDuration > maxAcceptableAvg) {
          console.warn(
            `Average response time (${avgDuration}ms) exceeds threshold (${maxAcceptableAvg}ms)`
          )
        }

        if (p95Duration > maxAcceptableP95) {
          console.warn(
            `95th percentile response time (${p95Duration}ms) exceeds threshold (${maxAcceptableP95}ms)`
          )
        }

        if (successRate < minSuccessRate) {
          throw new Error(`Success rate (${successRate}) below threshold (${minSuccessRate})`)
        }

        this.addTestResult({
          testName: 'Health Endpoint Performance',
          success: true,
          duration: Date.now() - startTime,
          details: {
            testCount,
            successfulTests: successfulTests.length,
            failedTests: failedTests.length,
            successRate,
            performance: {
              avgDuration,
              minDuration,
              maxDuration,
              p95Duration
            },
            thresholds: {
              maxAcceptableAvg,
              maxAcceptableP95,
              minSuccessRate
            }
          }
        })
      } finally {
        await environment.cleanup()
      }
    } catch (error) {
      this.addTestResult({
        testName: 'Health Endpoint Performance',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Test health monitoring under load
   */
  private async testHealthMonitoringUnderLoad(): Promise<void> {
    const startTime = Date.now()

    try {
      console.log('  📊 Testing health monitoring under load...')

      const environment = await this.startTestServer()

      try {
        const client = new TestHttpClient(environment.baseUrl)

        // Wait for server to be ready
        await waitFor(async () => {
          try {
            const response = await client.get('/api/health')
            return response.ok
          } catch {
            return false
          }
        }, 30000)

        // Create load on the server
        const loadPromises = []
        const concurrentRequests = 20
        const requestsPerClient = 10

        // Start background load
        for (let i = 0; i < concurrentRequests; i++) {
          loadPromises.push(this.generateLoad(client, requestsPerClient))
        }

        // Monitor health during load
        const healthChecks = []
        const monitoringDuration = 5000 // 5 seconds
        const checkInterval = 200 // 200ms
        const monitoringStart = Date.now()

        while (Date.now() - monitoringStart < monitoringDuration) {
          const checkStart = Date.now()
          try {
            const response = await client.get('/api/health')
            const checkDuration = Date.now() - checkStart

            healthChecks.push({
              success: response.ok,
              duration: checkDuration,
              timestamp: Date.now(),
              status: response.status
            })
          } catch (error) {
            healthChecks.push({
              success: false,
              duration: Date.now() - checkStart,
              timestamp: Date.now(),
              error: String(error)
            })
          }

          await delay(checkInterval)
        }

        // Wait for load to complete
        await Promise.allSettled(loadPromises)

        // Analyze health monitoring results
        const successfulChecks = healthChecks.filter((c) => c.success)
        const failedChecks = healthChecks.filter((c) => !c.success)

        if (successfulChecks.length === 0) {
          throw new Error('Health endpoint failed completely under load')
        }

        const healthSuccessRate = successfulChecks.length / healthChecks.length
        const avgHealthDuration =
          successfulChecks.reduce((sum, c) => sum + c.duration, 0) / successfulChecks.length

        // Health monitoring should remain reliable under load
        const minHealthSuccessRate = 0.9 // 90% success rate for health checks
        const maxHealthDuration = 500 // 500ms max for health checks under load

        if (healthSuccessRate < minHealthSuccessRate) {
          throw new Error(
            `Health monitoring success rate (${healthSuccessRate}) below threshold under load`
          )
        }

        if (avgHealthDuration > maxHealthDuration) {
          console.warn(`Health check duration (${avgHealthDuration}ms) high under load`)
        }

        this.addTestResult({
          testName: 'Health Monitoring Under Load',
          success: true,
          duration: Date.now() - startTime,
          details: {
            loadGeneration: {
              concurrentRequests,
              requestsPerClient,
              totalLoadRequests: concurrentRequests * requestsPerClient
            },
            healthMonitoring: {
              totalChecks: healthChecks.length,
              successfulChecks: successfulChecks.length,
              failedChecks: failedChecks.length,
              successRate: healthSuccessRate,
              avgDuration: avgHealthDuration
            },
            thresholds: {
              minHealthSuccessRate,
              maxHealthDuration
            }
          }
        })
      } finally {
        await environment.cleanup()
      }
    } catch (error) {
      this.addTestResult({
        testName: 'Health Monitoring Under Load',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Test health status validation
   */
  private async testHealthStatusValidation(): Promise<void> {
    const startTime = Date.now()

    try {
      console.log('  ✅ Testing health status validation...')

      const environment = await this.startTestServer()

      try {
        const client = new TestHttpClient(environment.baseUrl)

        // Wait for server to be ready
        await waitFor(async () => {
          try {
            const response = await client.get('/api/health')
            return response.ok
          } catch {
            return false
          }
        }, 30000)

        // Test health status in different scenarios
        const scenarios = [
          {
            name: 'Default Scenario',
            setup: () => client.postJson('/api/demo/seed?scenario=default')
          },
          {
            name: 'Busy Day Scenario',
            setup: () => client.postJson('/api/demo/seed?scenario=busy_day')
          },
          {
            name: 'Low Inventory Scenario',
            setup: () => client.postJson('/api/demo/seed?scenario=low_inventory')
          }
        ]

        const scenarioResults = []

        for (const scenario of scenarios) {
          try {
            // Setup scenario
            await scenario.setup()

            // Check health
            const healthResponse = await client.getJson('/api/health')

            // Validate health response
            if (healthResponse.status !== 'ok') {
              throw new Error(`Health status not ok in ${scenario.name}: ${healthResponse.status}`)
            }

            // Check if scenario is reflected in health response
            const scenarioInHealth = healthResponse.scenario || 'default'

            scenarioResults.push({
              name: scenario.name,
              success: true,
              healthStatus: healthResponse.status,
              scenario: scenarioInHealth,
              timestamp: healthResponse.timestamp
            })
          } catch (error) {
            scenarioResults.push({
              name: scenario.name,
              success: false,
              error: String(error)
            })
          }
        }

        // Test health with different environment configurations
        const envTests = [
          {
            name: 'AI Demo Mode Check',
            validate: (health: any) => typeof health.aiDemoMode === 'boolean'
          },
          {
            name: 'Environment Check',
            validate: (health: any) => typeof health.env === 'string'
          },
          {
            name: 'Timestamp Format',
            validate: (health: any) => !isNaN(new Date(health.timestamp).getTime())
          }
        ]

        const healthResponse = await client.getJson('/api/health')
        const envTestResults = envTests.map((test) => ({
          name: test.name,
          success: test.validate(healthResponse)
        }))

        const failedEnvTests = envTestResults.filter((t) => !t.success)
        if (failedEnvTests.length > 0) {
          throw new Error(
            `Environment validation failed: ${failedEnvTests.map((t) => t.name).join(', ')}`
          )
        }

        this.addTestResult({
          testName: 'Health Status Validation',
          success: true,
          duration: Date.now() - startTime,
          details: {
            scenarioTests: scenarioResults,
            environmentTests: envTestResults,
            finalHealthResponse: healthResponse
          }
        })
      } finally {
        await environment.cleanup()
      }
    } catch (error) {
      this.addTestResult({
        testName: 'Health Status Validation',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Test alerting mechanisms
   */
  private async testAlertingMechanisms(): Promise<void> {
    const startTime = Date.now()

    try {
      console.log('  🚨 Testing alerting mechanisms...')

      const environment = await this.startTestServer()

      try {
        const client = new TestHttpClient(environment.baseUrl)

        // Wait for server to be ready
        await waitFor(async () => {
          try {
            const response = await client.get('/api/health')
            return response.ok
          } catch {
            return false
          }
        }, 30000)

        // Define alerting rules
        const alertingRules: AlertingRule[] = [
          {
            name: 'High Response Time',
            condition: (metrics) => metrics.responseTime > 1000,
            severity: 'medium',
            message: 'Health endpoint response time is high'
          },
          {
            name: 'Service Unavailable',
            condition: (metrics) => metrics.status !== 'ok',
            severity: 'critical',
            message: 'Service is not healthy'
          },
          {
            name: 'Stale Timestamp',
            condition: (metrics) => {
              const age = Date.now() - new Date(metrics.timestamp).getTime()
              return age > 60000 // 1 minute
            },
            severity: 'high',
            message: 'Health timestamp is stale'
          }
        ]

        // Collect health metrics over time
        const monitoringPeriod = 10000 // 10 seconds
        const checkInterval = 500 // 500ms
        const alerts: Array<{ rule: AlertingRule; metrics: HealthMetrics; timestamp: number }> = []

        const monitoringStart = Date.now()
        while (Date.now() - monitoringStart < monitoringPeriod) {
          const checkStart = Date.now()

          try {
            const response = await client.get('/api/health')
            const responseTime = Date.now() - checkStart
            const healthData = await response.json()

            const metrics: HealthMetrics = {
              responseTime,
              status: healthData.status || 'unknown',
              timestamp: healthData.timestamp || new Date().toISOString()
            }

            this.healthHistory.push(metrics)

            // Check alerting rules
            for (const rule of alertingRules) {
              if (rule.condition(metrics)) {
                alerts.push({
                  rule,
                  metrics,
                  timestamp: Date.now()
                })
              }
            }
          } catch (error) {
            // Simulate service unavailable alert
            const metrics: HealthMetrics = {
              responseTime: Date.now() - checkStart,
              status: 'error',
              timestamp: new Date().toISOString()
            }

            for (const rule of alertingRules) {
              if (rule.condition(metrics)) {
                alerts.push({
                  rule,
                  metrics,
                  timestamp: Date.now()
                })
              }
            }
          }

          await delay(checkInterval)
        }

        // Analyze alerting results
        const alertsByRule = alertingRules.map((rule) => ({
          rule: rule.name,
          severity: rule.severity,
          alertCount: alerts.filter((a) => a.rule.name === rule.name).length
        }))

        // Test alert deduplication (same alert within short time window)
        const alertGroups = new Map<string, number>()
        const deduplicationWindow = 2000 // 2 seconds

        for (const alert of alerts) {
          const key = alert.rule.name
          const lastAlert = alertGroups.get(key) || 0

          if (alert.timestamp - lastAlert > deduplicationWindow) {
            alertGroups.set(key, alert.timestamp)
          }
        }

        this.addTestResult({
          testName: 'Alerting Mechanisms',
          success: true,
          duration: Date.now() - startTime,
          details: {
            monitoringPeriod,
            totalHealthChecks: this.healthHistory.length,
            alertingRules: alertingRules.length,
            totalAlerts: alerts.length,
            alertsByRule,
            deduplicatedAlerts: alertGroups.size,
            healthMetricsSample: this.healthHistory.slice(-5) // Last 5 metrics
          }
        })
      } finally {
        await environment.cleanup()
      }
    } catch (error) {
      this.addTestResult({
        testName: 'Alerting Mechanisms',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Test health endpoint availability during failures
   */
  private async testHealthEndpointDuringFailures(): Promise<void> {
    const startTime = Date.now()

    try {
      console.log('  💥 Testing health endpoint during failures...')

      const environment = await this.startTestServer()

      try {
        const client = new TestHttpClient(environment.baseUrl)

        // Wait for server to be ready
        await waitFor(async () => {
          try {
            const response = await client.get('/api/health')
            return response.ok
          } catch {
            return false
          }
        }, 30000)

        // Test health endpoint during various failure scenarios
        const failureScenarios = [
          {
            name: 'High Load Stress',
            test: async () => {
              // Generate high load
              const loadPromises = Array.from({ length: 50 }, () => this.generateLoad(client, 5))

              // Check health during load
              const healthCheck = await client.get('/api/health')

              // Wait for load to complete
              await Promise.allSettled(loadPromises)

              return healthCheck.ok
            }
          },
          {
            name: 'Invalid API Requests',
            test: async () => {
              // Generate invalid requests
              const invalidRequests = [
                client.post('/api/invalid-endpoint', {}),
                client.get('/api/services/invalid-id'),
                fetch(`${environment.baseUrl}/api/services`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: 'invalid json'
                })
              ]

              // Check health during invalid requests
              const healthPromise = client.get('/api/health')

              // Wait for all requests
              await Promise.allSettled([...invalidRequests, healthPromise])

              const healthResponse = await healthPromise
              return healthResponse.ok
            }
          },
          {
            name: 'Memory Pressure Simulation',
            test: async () => {
              // Simulate memory pressure by creating large objects
              const largeData = Array.from({ length: 1000 }, (_, i) => ({
                id: i,
                data: 'x'.repeat(1000)
              }))

              // Check health
              const healthResponse = await client.get('/api/health')

              // Clean up
              largeData.length = 0

              return healthResponse.ok
            }
          }
        ]

        const failureResults = []

        for (const scenario of failureScenarios) {
          const scenarioStart = Date.now()

          try {
            const success = await scenario.test()

            failureResults.push({
              name: scenario.name,
              success,
              duration: Date.now() - scenarioStart
            })
          } catch (error) {
            failureResults.push({
              name: scenario.name,
              success: false,
              duration: Date.now() - scenarioStart,
              error: String(error)
            })
          }
        }

        // Verify health endpoint is still responsive after all tests
        const finalHealthCheck = await client.getJson('/api/health')
        if (finalHealthCheck.status !== 'ok') {
          throw new Error('Health endpoint not responsive after failure tests')
        }

        const successfulScenarios = failureResults.filter((r) => r.success).length
        const totalScenarios = failureResults.length

        this.addTestResult({
          testName: 'Health Endpoint During Failures',
          success: true,
          duration: Date.now() - startTime,
          details: {
            failureScenarios: failureResults,
            successfulScenarios,
            totalScenarios,
            successRate: successfulScenarios / totalScenarios,
            finalHealthStatus: finalHealthCheck.status
          }
        })
      } finally {
        await environment.cleanup()
      }
    } catch (error) {
      this.addTestResult({
        testName: 'Health Endpoint During Failures',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Test monitoring system integration
   */
  private async testMonitoringSystemIntegration(): Promise<void> {
    const startTime = Date.now()

    try {
      console.log('  🔗 Testing monitoring system integration...')

      const environment = await this.startTestServer()

      try {
        const client = new TestHttpClient(environment.baseUrl)

        // Wait for server to be ready
        await waitFor(async () => {
          try {
            const response = await client.get('/api/health')
            return response.ok
          } catch {
            return false
          }
        }, 30000)

        // Test integration with external monitoring systems
        const integrationTests = [
          {
            name: 'Prometheus Metrics Format',
            test: async () => {
              // Check if health endpoint can be scraped by Prometheus
              const health = await client.getJson('/api/health')

              // Convert health data to Prometheus format
              const prometheusMetrics = this.convertToPrometheusFormat(health)

              return prometheusMetrics.length > 0
            }
          },
          {
            name: 'JSON Monitoring Format',
            test: async () => {
              // Test structured logging format for monitoring
              const health = await client.getJson('/api/health')

              // Validate JSON structure for monitoring tools
              const requiredFields = ['status', 'timestamp']
              return requiredFields.every((field) => field in health)
            }
          },
          {
            name: 'HTTP Status Codes',
            test: async () => {
              // Test that health endpoint returns appropriate HTTP status codes
              const response = await client.get('/api/health')

              // Should return 200 for healthy service
              return response.status === 200
            }
          },
          {
            name: 'Response Headers',
            test: async () => {
              // Test monitoring-friendly response headers
              const response = await client.get('/api/health')

              const contentType = response.headers.get('content-type')
              return contentType?.includes('application/json') || false
            }
          }
        ]

        const integrationResults = []

        for (const test of integrationTests) {
          try {
            const success = await test.test()
            integrationResults.push({
              name: test.name,
              success
            })
          } catch (error) {
            integrationResults.push({
              name: test.name,
              success: false,
              error: String(error)
            })
          }
        }

        // Test monitoring dashboard data
        const dashboardData = await this.generateMonitoringDashboardData(client)

        const successfulIntegrations = integrationResults.filter((r) => r.success).length
        const totalIntegrations = integrationResults.length

        this.addTestResult({
          testName: 'Monitoring System Integration',
          success: true,
          duration: Date.now() - startTime,
          details: {
            integrationTests: integrationResults,
            successfulIntegrations,
            totalIntegrations,
            successRate: successfulIntegrations / totalIntegrations,
            dashboardData
          }
        })
      } finally {
        await environment.cleanup()
      }
    } catch (error) {
      this.addTestResult({
        testName: 'Monitoring System Integration',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Start test server
   */
  private async startTestServer(): Promise<{
    baseUrl: string
    cleanup: () => Promise<void>
  }> {
    const portFile = path.resolve('.local', 'health_test_port')

    // Ensure directory exists
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
        PORT: '0', // Use ephemeral port
        PORT_FILE: portFile
      },
      stdio: ['ignore', 'pipe', 'pipe']
    })

    this.activeServers.push(serverProcess)

    // Handle server output
    if (process.env.TEST_VERBOSE) {
      serverProcess.stdout?.on('data', (data) => process.stdout.write(data))
      serverProcess.stderr?.on('data', (data) => process.stderr.write(data))
    }

    let exitCode: number | null = null
    serverProcess.on('exit', (code) => {
      exitCode = code ?? 0
    })

    try {
      // Wait for server to start and get port
      const port = await waitFor(async () => {
        if (fs.existsSync(portFile)) {
          const content = fs.readFileSync(portFile, 'utf8').trim()
          const portNum = Number(content)
          if (Number.isFinite(portNum) && portNum > 0) {
            return portNum
          }
        }
        return null
      }, 30000)

      const baseUrl = `http://127.0.0.1:${port}`

      return {
        baseUrl,
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

          // Remove from active servers
          const index = this.activeServers.indexOf(serverProcess)
          if (index > -1) {
            this.activeServers.splice(index, 1)
          }
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
   * Generate load on the server
   */
  private async generateLoad(client: TestHttpClient, requestCount: number): Promise<void> {
    const requests = []

    for (let i = 0; i < requestCount; i++) {
      requests.push(
        client.get('/api/services').catch(() => {}),
        client.get('/api/staff').catch(() => {}),
        client.get('/api/customers').catch(() => {})
      )
    }

    await Promise.allSettled(requests)
  }

  /**
   * Convert health data to Prometheus format
   */
  private convertToPrometheusFormat(healthData: any): string[] {
    const metrics = []

    if (healthData.status) {
      const statusValue = healthData.status === 'ok' ? 1 : 0
      metrics.push(`health_status ${statusValue}`)
    }

    if (healthData.timestamp) {
      const timestamp = new Date(healthData.timestamp).getTime()
      metrics.push(`health_timestamp ${timestamp}`)
    }

    return metrics
  }

  /**
   * Generate monitoring dashboard data
   */
  private async generateMonitoringDashboardData(client: TestHttpClient): Promise<any> {
    try {
      const health = await client.getJson('/api/health')

      return {
        uptime: Date.now() - new Date(health.timestamp).getTime(),
        status: health.status,
        environment: health.env,
        aiDemoMode: health.aiDemoMode,
        scenario: health.scenario
      }
    } catch (error) {
      return {
        error: String(error)
      }
    }
  }

  /**
   * Clean up all active servers
   */
  private async cleanupAllServers(): Promise<void> {
    for (const server of this.activeServers) {
      try {
        if (!server.killed) {
          server.kill('SIGINT')
          // Wait briefly for graceful shutdown
          await delay(1000)
          if (!server.killed) {
            server.kill('SIGKILL')
          }
        }
      } catch (error) {
        console.warn('Error cleaning up server:', error)
      }
    }
    this.activeServers = []
  }

  /**
   * Add test result to collection
   */
  private addTestResult(result: HealthTestResult): void {
    this.testResults.push(result)
    const status = result.success ? '✅' : '❌'
    console.log(`    ${status} ${result.testName} (${result.duration}ms)`)
    if (result.error) {
      console.log(`      Error: ${result.error}`)
    }
  }

  /**
   * Get test results summary
   */
  getResults(): HealthTestResult[] {
    return [...this.testResults]
  }

  /**
   * Get test summary statistics
   */
  getSummary(): {
    total: number
    passed: number
    failed: number
    duration: number
  } {
    const total = this.testResults.length
    const passed = this.testResults.filter((r) => r.success).length
    const failed = total - passed
    const duration = this.testResults.reduce((sum, r) => sum + r.duration, 0)

    return { total, passed, failed, duration }
  }
}
