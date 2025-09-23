#!/usr/bin/env tsx
/**
 * Error Rate Analysis Tool
 * Analyzes load test failure patterns and identifies root causes
 */

import {
  TestHttpClient,
  startTestServer,
  type TestEnvironment
} from '../test/utils/test-environment.js'
import { loadTestConfig } from '../test/config/test-config.js'
import {
  LoadTestingFramework,
  createDynamicLoadTestConfig,
  type LoadTestResult,
  type LoadTestError
} from '../test/performance/load-testing-framework.js'

interface ErrorAnalysis {
  totalErrors: number
  errorRate: number
  errorsByEndpoint: Map<string, number>
  errorsByType: Map<string, number>
  errorsByTimeWindow: Map<string, number>
  commonErrorPatterns: Array<{
    pattern: string
    count: number
    percentage: number
    examples: LoadTestError[]
  }>
  recommendations: string[]
}

class ErrorRateAnalyzer {
  private testEnvironment: TestEnvironment | null = null

  async analyzeErrorPatterns(): Promise<ErrorAnalysis> {
    console.log('🔍 Starting error rate analysis...')

    try {
      // Start test server
      const config = loadTestConfig()
      this.testEnvironment = await startTestServer(config)
      console.log(`✅ Test server started on ${this.testEnvironment.baseUrl}`)

      // Run focused load test to capture errors
      const loadConfig = await createDynamicLoadTestConfig(this.testEnvironment.baseUrl)
      loadConfig.maxConcurrentUsers = 30 // Moderate load to trigger errors
      loadConfig.rampUpDurationMs = 10000 // 10 seconds
      loadConfig.sustainedDurationMs = 30000 // 30 seconds
      loadConfig.requestsPerUser = 50

      console.log('🚀 Running focused load test to capture error patterns...')
      const framework = new LoadTestingFramework(loadConfig)
      const result = await framework.executeLoadTest()

      console.log(
        `📊 Load test completed: ${result.summary.totalRequests} requests, ${result.summary.errorRate.toFixed(1)}% error rate`
      )

      // Analyze the errors
      return this.analyzeErrors(result)
    } finally {
      if (this.testEnvironment) {
        await this.testEnvironment.cleanup()
      }
    }
  }

  private analyzeErrors(result: LoadTestResult): ErrorAnalysis {
    const errors = result.errors
    const totalRequests = result.summary.totalRequests
    const errorRate = result.summary.errorRate

    console.log(`\n🔍 Analyzing ${errors.length} errors from ${totalRequests} requests...`)

    // Group errors by endpoint
    const errorsByEndpoint = new Map<string, number>()
    errors.forEach((error) => {
      const key = `${error.method} ${error.endpoint}`
      errorsByEndpoint.set(key, (errorsByEndpoint.get(key) || 0) + 1)
    })

    // Group errors by type/status code
    const errorsByType = new Map<string, number>()
    errors.forEach((error) => {
      let errorType = 'Unknown'
      if (error.statusCode) {
        errorType = `HTTP ${error.statusCode}`
      } else if (error.error.includes('ECONNRESET')) {
        errorType = 'Connection Reset'
      } else if (error.error.includes('ECONNREFUSED')) {
        errorType = 'Connection Refused'
      } else if (error.error.includes('timeout')) {
        errorType = 'Timeout'
      } else if (error.error.includes('EMFILE') || error.error.includes('ENFILE')) {
        errorType = 'File Descriptor Limit'
      } else if (error.error.includes('socket hang up')) {
        errorType = 'Socket Hang Up'
      }
      errorsByType.set(errorType, (errorsByType.get(errorType) || 0) + 1)
    })

    // Group errors by time window (5-second windows)
    const errorsByTimeWindow = new Map<string, number>()
    const startTime = Math.min(...errors.map((e) => e.timestamp))
    errors.forEach((error) => {
      const windowStart = Math.floor((error.timestamp - startTime) / 5000) * 5000
      const windowKey = `${windowStart}-${windowStart + 5000}ms`
      errorsByTimeWindow.set(windowKey, (errorsByTimeWindow.get(windowKey) || 0) + 1)
    })

    // Identify common error patterns
    const errorPatterns = new Map<string, LoadTestError[]>()
    errors.forEach((error) => {
      let pattern = error.error

      // Normalize error messages to identify patterns
      if (error.statusCode) {
        pattern = `HTTP ${error.statusCode}`
      } else {
        // Extract key parts of error messages
        if (pattern.includes('ECONNRESET')) pattern = 'ECONNRESET'
        else if (pattern.includes('ECONNREFUSED')) pattern = 'ECONNREFUSED'
        else if (pattern.includes('timeout')) pattern = 'Request Timeout'
        else if (pattern.includes('socket hang up')) pattern = 'Socket Hang Up'
        else if (pattern.includes('EMFILE')) pattern = 'EMFILE - Too Many Open Files'
        else if (pattern.includes('ENFILE')) pattern = 'ENFILE - File Table Overflow'
      }

      if (!errorPatterns.has(pattern)) {
        errorPatterns.set(pattern, [])
      }
      errorPatterns.get(pattern)!.push(error)
    })

    const commonErrorPatterns = Array.from(errorPatterns.entries())
      .map(([pattern, patternErrors]) => ({
        pattern,
        count: patternErrors.length,
        percentage: (patternErrors.length / errors.length) * 100,
        examples: patternErrors.slice(0, 3) // First 3 examples
      }))
      .sort((a, b) => b.count - a.count)

    // Generate recommendations based on error patterns
    const recommendations = this.generateRecommendations(
      errorsByEndpoint,
      errorsByType,
      commonErrorPatterns,
      result
    )

    return {
      totalErrors: errors.length,
      errorRate,
      errorsByEndpoint,
      errorsByType,
      errorsByTimeWindow,
      commonErrorPatterns,
      recommendations
    }
  }

  private generateRecommendations(
    errorsByEndpoint: Map<string, number>,
    errorsByType: Map<string, number>,
    commonErrorPatterns: Array<{ pattern: string; count: number; percentage: number }>,
    result: LoadTestResult
  ): string[] {
    const recommendations: string[] = []

    // Analyze error types for specific recommendations
    for (const [errorType, count] of errorsByType.entries()) {
      const percentage = (count / result.errors.length) * 100

      if (errorType.includes('ECONNRESET') && percentage > 10) {
        recommendations.push(
          'High connection reset rate suggests server is dropping connections under load - implement connection pooling and keep-alive'
        )
      }

      if (errorType.includes('ECONNREFUSED') && percentage > 5) {
        recommendations.push(
          'Connection refused errors indicate server may be overwhelmed - implement request queuing or rate limiting'
        )
      }

      if (errorType.includes('timeout') && percentage > 10) {
        recommendations.push(
          'High timeout rate suggests slow response times - optimize database queries and add caching'
        )
      }

      if (errorType.includes('Socket Hang Up') && percentage > 10) {
        recommendations.push(
          'Socket hang up errors indicate premature connection closure - review session management and connection handling'
        )
      }

      if (errorType.includes('EMFILE') || errorType.includes('ENFILE')) {
        recommendations.push(
          'File descriptor limit reached - increase system limits and implement connection pooling'
        )
      }

      if (errorType.includes('HTTP 500') && percentage > 5) {
        recommendations.push(
          'Internal server errors detected - review error handling and add proper exception management'
        )
      }

      if (errorType.includes('HTTP 503') && percentage > 5) {
        recommendations.push(
          'Service unavailable errors suggest resource exhaustion - implement circuit breakers and graceful degradation'
        )
      }
    }

    // Analyze endpoint-specific issues
    const sortedEndpoints = Array.from(errorsByEndpoint.entries()).sort((a, b) => b[1] - a[1])

    if (sortedEndpoints.length > 0) {
      const [topErrorEndpoint, topErrorCount] = sortedEndpoints[0]
      const topErrorPercentage = (topErrorCount / result.errors.length) * 100

      if (topErrorPercentage > 30) {
        recommendations.push(
          `Endpoint ${topErrorEndpoint} has ${topErrorPercentage.toFixed(1)}% of all errors - focus optimization efforts here`
        )
      }
    }

    // Analyze response time correlation
    if (result.summary.averageResponseTime > 100) {
      recommendations.push(
        'High average response time correlates with error rate - optimize slow endpoints first'
      )
    }

    // Analyze concurrency issues
    if (result.summary.errorRate > 3 && result.summary.concurrentUsers > 20) {
      recommendations.push(
        'Error rate increases with concurrency - implement proper resource management and connection limits'
      )
    }

    // General recommendations based on error rate
    if (result.summary.errorRate > 5) {
      recommendations.push(
        'Critical error rate detected - implement comprehensive error handling and retry mechanisms'
      )
    } else if (result.summary.errorRate > 2) {
      recommendations.push('Moderate error rate - add circuit breakers and improve error recovery')
    }

    return recommendations
  }

  async runDetailedEndpointAnalysis(): Promise<void> {
    console.log('\n🔍 Running detailed endpoint analysis...')

    if (!this.testEnvironment) {
      throw new Error('Test environment not initialized')
    }

    const httpClient = new TestHttpClient(this.testEnvironment.baseUrl)
    const endpoints = [
      '/api/health',
      '/api/services',
      '/api/staff',
      '/api/appointments?day=today',
      '/api/customers',
      '/api/inventory',
      '/api/analytics',
      '/api/pos/sales',
      '/api/marketing/campaigns',
      '/api/loyalty/entries'
    ]

    console.log('Testing individual endpoint reliability...')

    for (const endpoint of endpoints) {
      const results = {
        successful: 0,
        failed: 0,
        totalTime: 0,
        errors: [] as string[]
      }

      // Test each endpoint 20 times rapidly
      const promises = Array.from({ length: 20 }, async () => {
        const startTime = Date.now()
        try {
          const response = await httpClient.get(endpoint)
          const responseTime = Date.now() - startTime
          results.totalTime += responseTime

          if (response.ok) {
            results.successful++
          } else {
            results.failed++
            results.errors.push(`HTTP ${response.status}`)
          }
        } catch (error) {
          results.failed++
          results.totalTime += Date.now() - startTime
          results.errors.push(error instanceof Error ? error.message : String(error))
        }
      })

      await Promise.all(promises)

      const successRate = (results.successful / 20) * 100
      const avgResponseTime = results.totalTime / 20

      console.log(`  ${endpoint}:`)
      console.log(`    Success rate: ${successRate.toFixed(1)}%`)
      console.log(`    Avg response time: ${avgResponseTime.toFixed(0)}ms`)

      if (results.failed > 0) {
        console.log(`    Errors: ${results.errors.slice(0, 3).join(', ')}`)
      }
    }
  }
}

async function main(): Promise<void> {
  console.log('🔍 Error Rate Analysis Tool')
  console.log('===========================\n')

  try {
    const analyzer = new ErrorRateAnalyzer()
    const analysis = await analyzer.analyzeErrorPatterns()

    // Display analysis results
    console.log('\n📊 Error Analysis Results:')
    console.log('==========================')
    console.log(`Total errors: ${analysis.totalErrors}`)
    console.log(`Error rate: ${analysis.errorRate.toFixed(1)}%`)

    console.log('\n🎯 Errors by Endpoint:')
    const sortedEndpoints = Array.from(analysis.errorsByEndpoint.entries()).sort(
      (a, b) => b[1] - a[1]
    )
    sortedEndpoints.forEach(([endpoint, count]) => {
      const percentage = (count / analysis.totalErrors) * 100
      console.log(`  ${endpoint}: ${count} errors (${percentage.toFixed(1)}%)`)
    })

    console.log('\n🔍 Errors by Type:')
    const sortedTypes = Array.from(analysis.errorsByType.entries()).sort((a, b) => b[1] - a[1])
    sortedTypes.forEach(([type, count]) => {
      const percentage = (count / analysis.totalErrors) * 100
      console.log(`  ${type}: ${count} errors (${percentage.toFixed(1)}%)`)
    })

    console.log('\n⏰ Errors by Time Window:')
    const sortedWindows = Array.from(analysis.errorsByTimeWindow.entries()).sort(
      (a, b) => b[1] - a[1]
    )
    sortedWindows.slice(0, 5).forEach(([window, count]) => {
      console.log(`  ${window}: ${count} errors`)
    })

    console.log('\n🔄 Common Error Patterns:')
    analysis.commonErrorPatterns.slice(0, 5).forEach((pattern) => {
      console.log(
        `  ${pattern.pattern}: ${pattern.count} occurrences (${pattern.percentage.toFixed(1)}%)`
      )
      if (pattern.examples.length > 0) {
        console.log(`    Example: ${pattern.examples[0].error}`)
      }
    })

    console.log('\n💡 Recommendations:')
    if (analysis.recommendations.length === 0) {
      console.log('  No specific recommendations - error patterns are unclear')
    } else {
      analysis.recommendations.forEach((rec) => {
        console.log(`  • ${rec}`)
      })
    }

    // Run detailed endpoint analysis
    await analyzer.runDetailedEndpointAnalysis()

    console.log('\n✅ Error rate analysis completed')
  } catch (error) {
    console.error('\n❌ Error rate analysis failed:', error)
    if (error instanceof Error && error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n🛑 Analysis interrupted')
  process.exit(130)
})

main().catch((error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
