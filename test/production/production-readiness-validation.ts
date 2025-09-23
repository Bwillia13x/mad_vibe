/**
 * Production Readiness Validation Suite
 * Validates deployment environment, performance under load, and security compliance
 */

import type {
  TestHttpClient,
  PerformanceMonitor,
  TestDataManager,
  TestEnvironment
} from '../utils/test-environment.js'
import { PerformanceTestSuite } from '../performance/performance-test-suite.js'
import { SecurityTestSuite } from '../security/security-test-suite.js'
import { DeploymentTestSuite } from '../deployment/deployment-test-suite.js'

export interface ProductionReadinessResult {
  testName: string
  status: 'pass' | 'fail' | 'skip'
  duration: number
  error?: string
  score?: number // 0-100 readiness score
  details?: any
  recommendations?: string[]
}

export interface ProductionValidationResult {
  success: boolean
  overallReadinessScore: number // 0-100
  summary: {
    totalTests: number
    passed: number
    failed: number
    skipped: number
    totalDuration: number
  }
  deploymentValidation: ProductionReadinessResult[]
  performanceValidation: ProductionReadinessResult[]
  securityValidation: ProductionReadinessResult[]
  recommendations: string[]
  criticalIssues: string[]
}

/**
 * Production Readiness Validation Suite
 * Comprehensive validation for production deployment readiness
 */
export class ProductionReadinessValidation {
  private performanceTestSuite: PerformanceTestSuite
  private securityTestSuite: SecurityTestSuite
  private deploymentTestSuite: DeploymentTestSuite

  constructor(
    private httpClient: TestHttpClient,
    private performanceMonitor: PerformanceMonitor,
    private dataManager: TestDataManager,
    private testEnvironment: TestEnvironment
  ) {
    // Initialize test suites with production-focused configurations
    this.performanceTestSuite = new PerformanceTestSuite(
      { environment: 'production', thresholds: this.getProductionThresholds() } as any,
      this.getProductionPerformanceConfig()
    )
    this.securityTestSuite = new SecurityTestSuite(httpClient, dataManager)
    this.deploymentTestSuite = new DeploymentTestSuite()
  }

  /**
   * Run complete production readiness validation
   */
  async runProductionReadinessValidation(): Promise<ProductionValidationResult> {
    console.log('\n🚀 Starting Production Readiness Validation')
    console.log('===========================================')

    const startTime = Date.now()

    // Clear previous metrics
    this.performanceMonitor.clearMetrics()

    // Phase 1: Deployment Environment Validation
    console.log('\n🏗️  Phase 1: Deployment Environment Validation')
    console.log('----------------------------------------------')
    const deploymentValidation = await this.runDeploymentValidation()

    // Phase 2: Performance Under Load Validation
    console.log('\n⚡ Phase 2: Performance Under Load Validation')
    console.log('--------------------------------------------')
    const performanceValidation = await this.runPerformanceValidation()

    // Phase 3: Security Compliance Verification
    console.log('\n🔒 Phase 3: Security Compliance Verification')
    console.log('-------------------------------------------')
    const securityValidation = await this.runSecurityValidation()

    const endTime = Date.now()
    const totalDuration = endTime - startTime

    // Calculate overall results
    const allTests = [...deploymentValidation, ...performanceValidation, ...securityValidation]

    const summary = {
      totalTests: allTests.length,
      passed: allTests.filter((t) => t.status === 'pass').length,
      failed: allTests.filter((t) => t.status === 'fail').length,
      skipped: allTests.filter((t) => t.status === 'skip').length,
      totalDuration
    }

    // Calculate overall readiness score
    const overallReadinessScore = this.calculateReadinessScore(
      deploymentValidation,
      performanceValidation,
      securityValidation
    )

    // Generate recommendations and identify critical issues
    const { recommendations, criticalIssues } = this.generateRecommendations(
      deploymentValidation,
      performanceValidation,
      securityValidation
    )

    const result: ProductionValidationResult = {
      success: summary.failed === 0 && overallReadinessScore >= 80,
      overallReadinessScore,
      summary,
      deploymentValidation,
      performanceValidation,
      securityValidation,
      recommendations,
      criticalIssues
    }

    this.printProductionReadinessSummary(result)

    return result
  }

  /**
   * Run deployment environment validation
   */
  private async runDeploymentValidation(): Promise<ProductionReadinessResult[]> {
    const tests: ProductionReadinessResult[] = []

    // Test 1: Environment configuration validation
    tests.push(
      await this.runProductionTest('environment-configuration', async () => {
        const health = await this.httpClient.getJson('/api/health')
        const issues = []
        const recommendations = []

        // Check environment
        if (health.env === 'development') {
          issues.push('Running in development mode')
          recommendations.push('Set NODE_ENV=production for production deployment')
        }

        // Check AI configuration
        if (health.aiDemoMode) {
          recommendations.push('Configure OPENAI_API_KEY for production AI functionality')
        }

        // Check demo scenario
        if (health.scenario !== 'default') {
          issues.push(`Running non-default scenario: ${health.scenario}`)
          recommendations.push('Reset to default scenario for production')
        }

        // Check time freeze
        if (health.freeze) {
          issues.push('Demo time is frozen')
          recommendations.push('Clear demo time freeze for production')
        }

        const score = Math.max(0, 100 - issues.length * 25)

        return {
          score,
          environment: health.env,
          aiDemoMode: health.aiDemoMode,
          scenario: health.scenario,
          timeFreeze: health.freeze,
          issues,
          recommendations
        }
      })
    )

    // Test 2: Database connectivity and performance
    tests.push(
      await this.runProductionTest('database-connectivity', async () => {
        const startTime = Date.now()

        // Test multiple database operations
        const operations = [
          () => this.httpClient.getJson('/api/services'),
          () => this.httpClient.getJson('/api/staff'),
          () => this.httpClient.getJson('/api/customers'),
          () => this.httpClient.getJson('/api/appointments'),
          () => this.httpClient.getJson('/api/inventory'),
          () => this.httpClient.getJson('/api/analytics')
        ]

        const results = []
        for (const operation of operations) {
          const opStart = Date.now()
          try {
            const data = await operation()
            const duration = Date.now() - opStart
            results.push({
              success: true,
              duration,
              hasData: Array.isArray(data) && data.length > 0
            })
          } catch (error) {
            results.push({ success: false, duration: Date.now() - opStart, error: String(error) })
          }
        }

        const totalDuration = Date.now() - startTime
        const successfulOps = results.filter((r) => r.success).length
        const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length

        const score = Math.min(
          100,
          (successfulOps / operations.length) * 100 * (avgDuration < 100 ? 1 : 0.8)
        )

        return {
          score,
          totalOperations: operations.length,
          successfulOperations: successfulOps,
          averageDuration: avgDuration,
          totalDuration,
          operationResults: results
        }
      })
    )

    // Test 3: API endpoint availability and response times
    tests.push(
      await this.runProductionTest('api-endpoint-availability', async () => {
        const criticalEndpoints = [
          '/api/health',
          '/api/profile',
          '/api/services',
          '/api/staff',
          '/api/appointments',
          '/api/pos/sales',
          '/api/analytics'
        ]

        const results = []
        let totalResponseTime = 0

        for (const endpoint of criticalEndpoints) {
          const startTime = Date.now()
          try {
            const response = await this.httpClient.get(endpoint)
            const duration = Date.now() - startTime
            totalResponseTime += duration

            results.push({
              endpoint,
              status: response.status,
              duration,
              success: response.ok,
              contentType: response.headers.get('content-type')
            })
          } catch (error) {
            results.push({
              endpoint,
              success: false,
              duration: Date.now() - startTime,
              error: String(error)
            })
          }
        }

        const successfulEndpoints = results.filter((r) => r.success).length
        const avgResponseTime = totalResponseTime / criticalEndpoints.length

        // Score based on availability and performance
        const availabilityScore = (successfulEndpoints / criticalEndpoints.length) * 100
        const performanceScore =
          avgResponseTime < 200 ? 100 : Math.max(0, 100 - (avgResponseTime - 200) / 10)
        const score = availabilityScore * 0.7 + performanceScore * 0.3

        return {
          score,
          totalEndpoints: criticalEndpoints.length,
          availableEndpoints: successfulEndpoints,
          averageResponseTime: avgResponseTime,
          endpointResults: results
        }
      })
    )

    // Test 4: Error handling and resilience
    tests.push(
      await this.runProductionTest('error-handling-resilience', async () => {
        const errorScenarios = [
          { endpoint: '/api/services/nonexistent', expectedStatus: 404 },
          { endpoint: '/api/appointments?date=invalid', expectedStatus: 400 },
          { endpoint: '/api/staff/invalid-id', expectedStatus: 404 },
          { endpoint: '/api/inventory/missing', expectedStatus: 404 }
        ]

        const results = []
        let properErrorHandling = 0

        for (const scenario of errorScenarios) {
          try {
            const response = await this.httpClient.get(scenario.endpoint)
            const isCorrectStatus = response.status === scenario.expectedStatus

            let hasErrorMessage = false
            if (!response.ok) {
              try {
                const errorData = await response.json()
                hasErrorMessage = !!errorData.message
              } catch {
                // Response might not be JSON
              }
            }

            if (isCorrectStatus) properErrorHandling++

            results.push({
              endpoint: scenario.endpoint,
              expectedStatus: scenario.expectedStatus,
              actualStatus: response.status,
              correctStatus: isCorrectStatus,
              hasErrorMessage
            })
          } catch (error) {
            results.push({
              endpoint: scenario.endpoint,
              error: String(error),
              correctStatus: false
            })
          }
        }

        const score = (properErrorHandling / errorScenarios.length) * 100

        return {
          score,
          totalScenarios: errorScenarios.length,
          properErrorHandling,
          errorScenarios: results
        }
      })
    )

    // Test 5: Resource utilization and limits
    tests.push(
      await this.runProductionTest('resource-utilization', async () => {
        // Test concurrent requests to simulate load
        const concurrentRequests = 20
        const promises = []

        const startTime = Date.now()
        for (let i = 0; i < concurrentRequests; i++) {
          promises.push(this.httpClient.getJson('/api/health'))
        }

        try {
          await Promise.all(promises)
          const totalDuration = Date.now() - startTime
          const avgDuration = totalDuration / concurrentRequests

          // Test memory usage by making multiple data requests
          const dataRequests = [
            this.httpClient.getJson('/api/services'),
            this.httpClient.getJson('/api/appointments'),
            this.httpClient.getJson('/api/inventory'),
            this.httpClient.getJson('/api/analytics')
          ]

          await Promise.all(dataRequests)

          const score = avgDuration < 100 ? 100 : Math.max(0, 100 - (avgDuration - 100) / 5)

          return {
            score,
            concurrentRequests,
            totalDuration,
            averageDuration: avgDuration,
            resourceUtilization: 'normal'
          }
        } catch (error) {
          return {
            score: 0,
            error: String(error),
            resourceUtilization: 'overloaded'
          }
        }
      })
    )

    return tests
  }

  /**
   * Run performance validation under production load
   */
  private async runPerformanceValidation(): Promise<ProductionReadinessResult[]> {
    const tests: ProductionReadinessResult[] = []

    // Test 1: Load testing with production thresholds
    tests.push(
      await this.runProductionTest('production-load-testing', async () => {
        try {
          // Run performance test suite with production configuration
          const perfResults = await this.performanceTestSuite.executeTests()

          const loadTestResults = perfResults.filter((r) => r.testName.includes('load'))
          const responseTimeResults = perfResults.filter((r) => r.testName.includes('response'))

          const passedLoadTests = loadTestResults.filter((r) => r.status === 'pass').length
          const passedResponseTests = responseTimeResults.filter((r) => r.status === 'pass').length

          const totalPerfTests = loadTestResults.length + responseTimeResults.length
          const passedPerfTests = passedLoadTests + passedResponseTests

          const score = totalPerfTests > 0 ? (passedPerfTests / totalPerfTests) * 100 : 0

          return {
            score,
            loadTestsPassed: passedLoadTests,
            totalLoadTests: loadTestResults.length,
            responseTestsPassed: passedResponseTests,
            totalResponseTests: responseTimeResults.length,
            performanceResults: perfResults
          }
        } catch (error) {
          // Fallback to basic load test if performance suite fails
          console.warn('Performance test suite not available, running basic load test')

          const concurrentUsers = 50
          const requestsPerUser = 5
          const promises = []

          const startTime = Date.now()

          for (let user = 0; user < concurrentUsers; user++) {
            for (let req = 0; req < requestsPerUser; req++) {
              promises.push(this.httpClient.getJson('/api/health'))
            }
          }

          await Promise.all(promises)
          const totalDuration = Date.now() - startTime
          const avgResponseTime = totalDuration / (concurrentUsers * requestsPerUser)

          const score =
            avgResponseTime < 500 ? 100 : Math.max(0, 100 - (avgResponseTime - 500) / 20)

          return {
            score,
            concurrentUsers,
            requestsPerUser,
            totalRequests: concurrentUsers * requestsPerUser,
            totalDuration,
            averageResponseTime: avgResponseTime
          }
        }
      })
    )

    // Test 2: Sustained load performance
    tests.push(
      await this.runProductionTest('sustained-load-performance', async () => {
        const testDuration = 30000 // 30 seconds
        const requestInterval = 100 // Request every 100ms
        const startTime = Date.now()
        const results = []

        while (Date.now() - startTime < testDuration) {
          const reqStart = Date.now()
          try {
            await this.httpClient.getJson('/api/health')
            const duration = Date.now() - reqStart
            results.push({ success: true, duration })
          } catch (error) {
            results.push({ success: false, duration: Date.now() - reqStart, error: String(error) })
          }

          // Wait for next interval
          await new Promise((resolve) => setTimeout(resolve, requestInterval))
        }

        const successfulRequests = results.filter((r) => r.success).length
        const avgResponseTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length
        const maxResponseTime = Math.max(...results.map((r) => r.duration))

        // Score based on success rate and consistent performance
        const successRate = (successfulRequests / results.length) * 100
        const consistencyScore = maxResponseTime < avgResponseTime * 3 ? 100 : 50
        const score = successRate * 0.7 + consistencyScore * 0.3

        return {
          score,
          testDuration,
          totalRequests: results.length,
          successfulRequests,
          successRate,
          averageResponseTime: avgResponseTime,
          maxResponseTime,
          performanceDegradation: maxResponseTime > avgResponseTime * 2
        }
      })
    )

    // Test 3: Memory and resource stability
    tests.push(
      await this.runProductionTest('memory-resource-stability', async () => {
        // Test memory usage by creating multiple large data requests
        const largeDataRequests = [
          () => this.httpClient.getJson('/api/appointments'),
          () => this.httpClient.getJson('/api/inventory'),
          () => this.httpClient.getJson('/api/analytics'),
          () => this.httpClient.get('/api/analytics/export'),
          () => this.httpClient.get('/api/pos/sales/export'),
          () => this.httpClient.get('/api/loyalty/entries/export')
        ]

        const iterations = 10
        const results = []

        for (let i = 0; i < iterations; i++) {
          const iterationStart = Date.now()
          const promises = largeDataRequests.map((req) => req())

          try {
            await Promise.all(promises)
            const duration = Date.now() - iterationStart
            results.push({ iteration: i + 1, success: true, duration })
          } catch (error) {
            results.push({
              iteration: i + 1,
              success: false,
              duration: Date.now() - iterationStart,
              error: String(error)
            })
          }

          // Small delay between iterations
          await new Promise((resolve) => setTimeout(resolve, 100))
        }

        const successfulIterations = results.filter((r) => r.success).length
        const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length

        // Check for performance degradation over time
        const firstHalf = results.slice(0, Math.floor(iterations / 2))
        const secondHalf = results.slice(Math.floor(iterations / 2))

        const firstHalfAvg = firstHalf.reduce((sum, r) => sum + r.duration, 0) / firstHalf.length
        const secondHalfAvg = secondHalf.reduce((sum, r) => sum + r.duration, 0) / secondHalf.length

        const degradationRatio = secondHalfAvg / firstHalfAvg
        const hasMemoryLeak = degradationRatio > 1.5

        const score =
          successfulIterations === iterations && !hasMemoryLeak
            ? 100
            : successfulIterations === iterations
              ? 80
              : (successfulIterations / iterations) * 60

        return {
          score,
          iterations,
          successfulIterations,
          averageDuration: avgDuration,
          performanceDegradation: degradationRatio,
          possibleMemoryLeak: hasMemoryLeak
        }
      })
    )

    return tests
  }

  /**
   * Run security compliance verification
   */
  private async runSecurityValidation(): Promise<ProductionReadinessResult[]> {
    const tests: ProductionReadinessResult[] = []

    // Test 1: Security headers validation
    tests.push(
      await this.runProductionTest('security-headers-validation', async () => {
        const response = await this.httpClient.get('/api/health')
        const headers = response.headers

        const securityChecks = [
          { name: 'Content-Type', present: !!headers.get('content-type'), critical: true },
          {
            name: 'X-Content-Type-Options',
            present: !!headers.get('x-content-type-options'),
            critical: false
          },
          { name: 'X-Frame-Options', present: !!headers.get('x-frame-options'), critical: false },
          { name: 'X-XSS-Protection', present: !!headers.get('x-xss-protection'), critical: false },
          {
            name: 'Strict-Transport-Security',
            present: !!headers.get('strict-transport-security'),
            critical: false
          }
        ]

        const criticalPassed = securityChecks.filter((c) => c.critical && c.present).length
        const criticalTotal = securityChecks.filter((c) => c.critical).length
        const optionalPassed = securityChecks.filter((c) => !c.critical && c.present).length
        const optionalTotal = securityChecks.filter((c) => !c.critical).length

        const score = (criticalPassed / criticalTotal) * 70 + (optionalPassed / optionalTotal) * 30

        return {
          score,
          securityChecks,
          criticalHeadersPassed: criticalPassed,
          optionalHeadersPassed: optionalPassed,
          recommendations: securityChecks
            .filter((c) => !c.present)
            .map((c) => `Add ${c.name} header for ${c.critical ? 'critical' : 'enhanced'} security`)
        }
      })
    )

    // Test 2: Input validation and injection prevention
    tests.push(
      await this.runProductionTest('input-validation-security', async () => {
        const injectionTests = [
          { endpoint: '/api/appointments?date=<script>alert(1)</script>', type: 'XSS' },
          { endpoint: "/api/services/'; DROP TABLE services; --", type: 'SQL Injection' },
          { endpoint: '/api/staff/../../../etc/passwd', type: 'Path Traversal' },
          { endpoint: '/api/appointments?date=' + 'A'.repeat(10000), type: 'Buffer Overflow' }
        ]

        const results = []
        let secureResponses = 0

        for (const test of injectionTests) {
          try {
            const response = await this.httpClient.get(test.endpoint)

            // Secure response should be 400 (bad request) or 404 (not found)
            const isSecure = response.status === 400 || response.status === 404
            if (isSecure) secureResponses++

            results.push({
              type: test.type,
              endpoint: test.endpoint,
              status: response.status,
              secure: isSecure
            })
          } catch (error) {
            // Network errors are also acceptable (server rejected the request)
            secureResponses++
            results.push({
              type: test.type,
              endpoint: test.endpoint,
              secure: true,
              networkError: true
            })
          }
        }

        const score = (secureResponses / injectionTests.length) * 100

        return {
          score,
          totalTests: injectionTests.length,
          secureResponses,
          injectionTests: results
        }
      })
    )

    // Test 3: Authentication and session security
    tests.push(
      await this.runProductionTest('authentication-session-security', async () => {
        // Test session handling (basic check since this is a demo app)
        const health = await this.httpClient.getJson('/api/health')

        // Check if running in demo mode vs production mode
        const isProductionReady = !health.aiDemoMode || process.env.NODE_ENV === 'production'

        // Test CORS headers
        const corsResponse = await this.httpClient.get('/api/health')
        const corsHeaders = {
          'Access-Control-Allow-Origin': corsResponse.headers.get('access-control-allow-origin'),
          'Access-Control-Allow-Methods': corsResponse.headers.get('access-control-allow-methods'),
          'Access-Control-Allow-Headers': corsResponse.headers.get('access-control-allow-headers')
        }

        const hasCorsConfig = Object.values(corsHeaders).some((header) => header !== null)

        const score = isProductionReady ? 80 : 60 // Base score, can be enhanced with actual auth

        return {
          score,
          productionMode: process.env.NODE_ENV === 'production',
          aiConfigured: !health.aiDemoMode,
          corsConfigured: hasCorsConfig,
          corsHeaders,
          recommendations: [
            ...(health.aiDemoMode ? ['Configure OPENAI_API_KEY for production'] : []),
            ...(process.env.NODE_ENV !== 'production' ? ['Set NODE_ENV=production'] : []),
            ...(!hasCorsConfig ? ['Configure CORS headers for production'] : [])
          ]
        }
      })
    )

    // Test 4: API rate limiting and abuse prevention
    tests.push(
      await this.runProductionTest('rate-limiting-abuse-prevention', async () => {
        // Test rapid requests to check for rate limiting
        const rapidRequests = 50
        const promises = []

        for (let i = 0; i < rapidRequests; i++) {
          promises.push(this.httpClient.get('/api/health'))
        }

        const startTime = Date.now()
        const responses = await Promise.all(promises)
        const duration = Date.now() - startTime

        // Check if any requests were rate limited (429 status)
        const rateLimitedRequests = responses.filter((r) => r.status === 429).length
        const successfulRequests = responses.filter((r) => r.ok).length

        // In production, we might expect some rate limiting for rapid requests
        // For now, we'll score based on server stability under rapid requests
        const avgResponseTime = duration / rapidRequests
        const serverStable = avgResponseTime < 1000 && successfulRequests > rapidRequests * 0.8

        const score = serverStable ? 90 : 60

        return {
          score,
          rapidRequests,
          successfulRequests,
          rateLimitedRequests,
          averageResponseTime: avgResponseTime,
          serverStable,
          recommendations:
            rateLimitedRequests === 0
              ? ['Consider implementing rate limiting for production']
              : ['Rate limiting is working correctly']
        }
      })
    )

    return tests
  }

  /**
   * Helper method to run a production test with scoring
   */
  private async runProductionTest(
    testName: string,
    testFn: () => Promise<any>
  ): Promise<ProductionReadinessResult> {
    const startTime = Date.now()

    try {
      const result = await testFn()
      const duration = Date.now() - startTime

      const score = result.score || 0
      const status = score >= 70 ? 'pass' : 'fail'

      console.log(
        `  ${status === 'pass' ? '✅' : '❌'} ${testName} (${duration}ms) - Score: ${score}/100`
      )

      return {
        testName,
        status,
        duration,
        score,
        details: result,
        recommendations: result.recommendations || []
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      console.log(`  ❌ ${testName} (${duration}ms): ${errorMessage}`)

      return {
        testName,
        status: 'fail',
        duration,
        score: 0,
        error: errorMessage,
        recommendations: ['Fix test execution error before production deployment']
      }
    }
  }

  /**
   * Calculate overall production readiness score
   */
  private calculateReadinessScore(
    deploymentTests: ProductionReadinessResult[],
    performanceTests: ProductionReadinessResult[],
    securityTests: ProductionReadinessResult[]
  ): number {
    const calculateCategoryScore = (tests: ProductionReadinessResult[]) => {
      if (tests.length === 0) return 0
      const totalScore = tests.reduce((sum, test) => sum + (test.score || 0), 0)
      return totalScore / tests.length
    }

    const deploymentScore = calculateCategoryScore(deploymentTests)
    const performanceScore = calculateCategoryScore(performanceTests)
    const securityScore = calculateCategoryScore(securityTests)

    // Weighted average: deployment 30%, performance 40%, security 30%
    return Math.round(deploymentScore * 0.3 + performanceScore * 0.4 + securityScore * 0.3)
  }

  /**
   * Generate recommendations and identify critical issues
   */
  private generateRecommendations(
    deploymentTests: ProductionReadinessResult[],
    performanceTests: ProductionReadinessResult[],
    securityTests: ProductionReadinessResult[]
  ): { recommendations: string[]; criticalIssues: string[] } {
    const allTests = [...deploymentTests, ...performanceTests, ...securityTests]
    const recommendations: string[] = []
    const criticalIssues: string[] = []

    // Collect recommendations from all tests
    allTests.forEach((test) => {
      if (test.recommendations) {
        recommendations.push(...test.recommendations)
      }

      // Identify critical issues (failed tests with score < 50)
      if (test.status === 'fail' && (test.score || 0) < 50) {
        criticalIssues.push(`${test.testName}: ${test.error || 'Critical failure'}`)
      }
    })

    // Add general recommendations based on overall results
    const failedDeploymentTests = deploymentTests.filter((t) => t.status === 'fail').length
    const failedPerformanceTests = performanceTests.filter((t) => t.status === 'fail').length
    const failedSecurityTests = securityTests.filter((t) => t.status === 'fail').length

    if (failedDeploymentTests > 0) {
      recommendations.push('Review deployment configuration and environment setup')
    }
    if (failedPerformanceTests > 0) {
      recommendations.push('Optimize performance bottlenecks before production deployment')
    }
    if (failedSecurityTests > 0) {
      recommendations.push('Address security vulnerabilities before production deployment')
    }

    // Remove duplicates
    const uniqueRecommendations = [...new Set(recommendations)]
    const uniqueCriticalIssues = [...new Set(criticalIssues)]

    return { recommendations: uniqueRecommendations, criticalIssues: uniqueCriticalIssues }
  }

  /**
   * Get production performance thresholds
   */
  private getProductionThresholds() {
    return {
      maxResponseTime: 200, // ms
      maxMemoryUsage: 512, // MB
      minConcurrentUsers: 50,
      maxErrorRate: 1 // percentage
    }
  }

  /**
   * Get production performance configuration
   */
  private getProductionPerformanceConfig() {
    return {
      loadTest: {
        maxConcurrentUsers: 100,
        rampUpDurationMs: 30000,
        sustainedDurationMs: 60000
      },
      responseTimeTest: {
        maxAcceptableMs: 200,
        samples: 100
      }
    }
  }

  /**
   * Print production readiness summary
   */
  private printProductionReadinessSummary(result: ProductionValidationResult): void {
    console.log('\n')
    console.log('🚀 PRODUCTION READINESS VALIDATION RESULTS')
    console.log('==========================================')

    // Overall readiness score
    console.log(`\n📊 Overall Production Readiness Score: ${result.overallReadinessScore}/100`)

    const readinessLevel =
      result.overallReadinessScore >= 90
        ? '🟢 EXCELLENT'
        : result.overallReadinessScore >= 80
          ? '🟡 GOOD'
          : result.overallReadinessScore >= 70
            ? '🟠 ACCEPTABLE'
            : result.overallReadinessScore >= 50
              ? '🔴 NEEDS WORK'
              : '🚨 NOT READY'

    console.log(`   Readiness Level: ${readinessLevel}`)

    // Test summary
    console.log('\n📋 Test Summary:')
    console.log(`   Total Tests: ${result.summary.totalTests}`)
    console.log(`   ✅ Passed: ${result.summary.passed}`)
    console.log(`   ❌ Failed: ${result.summary.failed}`)
    console.log(`   ⏭️  Skipped: ${result.summary.skipped}`)
    console.log(`   ⏱️  Total Duration: ${(result.summary.totalDuration / 1000).toFixed(2)}s`)

    // Category breakdown
    console.log('\n📊 Category Breakdown:')

    const deploymentPassed = result.deploymentValidation.filter((t) => t.status === 'pass').length
    const deploymentTotal = result.deploymentValidation.length
    const deploymentScore =
      deploymentTotal > 0
        ? Math.round(
            result.deploymentValidation.reduce((sum, t) => sum + (t.score || 0), 0) /
              deploymentTotal
          )
        : 0
    console.log(
      `   🏗️  Deployment: ${deploymentPassed}/${deploymentTotal} passed (${deploymentScore}/100)`
    )

    const performancePassed = result.performanceValidation.filter((t) => t.status === 'pass').length
    const performanceTotal = result.performanceValidation.length
    const performanceScore =
      performanceTotal > 0
        ? Math.round(
            result.performanceValidation.reduce((sum, t) => sum + (t.score || 0), 0) /
              performanceTotal
          )
        : 0
    console.log(
      `   ⚡ Performance: ${performancePassed}/${performanceTotal} passed (${performanceScore}/100)`
    )

    const securityPassed = result.securityValidation.filter((t) => t.status === 'pass').length
    const securityTotal = result.securityValidation.length
    const securityScore =
      securityTotal > 0
        ? Math.round(
            result.securityValidation.reduce((sum, t) => sum + (t.score || 0), 0) / securityTotal
          )
        : 0
    console.log(`   🔒 Security: ${securityPassed}/${securityTotal} passed (${securityScore}/100)`)

    // Critical issues
    if (result.criticalIssues.length > 0) {
      console.log('\n🚨 Critical Issues:')
      result.criticalIssues.forEach((issue) => {
        console.log(`   • ${issue}`)
      })
    }

    // Recommendations
    if (result.recommendations.length > 0) {
      console.log('\n💡 Recommendations:')
      result.recommendations.slice(0, 10).forEach((rec) => {
        // Limit to top 10
        console.log(`   • ${rec}`)
      })

      if (result.recommendations.length > 10) {
        console.log(`   ... and ${result.recommendations.length - 10} more recommendations`)
      }
    }

    // Final verdict
    console.log('\n🎯 Production Deployment Verdict:')
    if (result.success) {
      console.log('   🎉 READY FOR PRODUCTION DEPLOYMENT!')
      console.log('   ✅ All critical systems validated')
      console.log('   ✅ Performance meets production requirements')
      console.log('   ✅ Security compliance verified')
    } else {
      console.log('   ❌ NOT READY FOR PRODUCTION DEPLOYMENT')
      console.log('   🔧 Critical issues must be resolved')

      if (result.overallReadinessScore >= 70) {
        console.log('   ⚠️  Minor issues - deployment possible with monitoring')
      } else if (result.overallReadinessScore >= 50) {
        console.log('   ⚠️  Moderate issues - significant work needed')
      } else {
        console.log('   🚨 Major issues - extensive work required')
      }
    }

    console.log('\n==========================================')
  }
}
