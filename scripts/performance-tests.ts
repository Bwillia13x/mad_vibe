#!/usr/bin/env tsx
/**
 * Performance Testing CLI Script
 * Executes load testing, response time testing, and memory monitoring
 */

import { loadTestConfig, validateTestConfig } from '../test/config/test-config.js'
import {
  PerformanceTestSuite,
  createDefaultPerformanceConfig
} from '../test/performance/performance-test-suite.js'

interface PerformanceTestOptions {
  concurrency?: number
  duration?: number
  rampUp?: number
  endpoints?: string[]
  memoryThreshold?: number
  verbose?: boolean
  outputDir?: string
}

async function parseArgs(): Promise<PerformanceTestOptions> {
  const args = process.argv.slice(2)
  const options: PerformanceTestOptions = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const nextArg = args[i + 1]

    switch (arg) {
      case '--concurrency':
      case '-c':
        options.concurrency = parseInt(nextArg, 10)
        i++
        break
      case '--duration':
      case '-d':
        options.duration = parseInt(nextArg, 10) * 1000 // Convert to ms
        i++
        break
      case '--ramp-up':
      case '-r':
        options.rampUp = parseInt(nextArg, 10) * 1000 // Convert to ms
        i++
        break
      case '--memory-threshold':
      case '-m':
        options.memoryThreshold = parseInt(nextArg, 10)
        i++
        break
      case '--endpoints':
      case '-e':
        options.endpoints = nextArg.split(',')
        i++
        break
      case '--output':
      case '-o':
        options.outputDir = nextArg
        i++
        break
      case '--verbose':
      case '-v':
        options.verbose = true
        break
      case '--help':
      case '-h':
        printUsage()
        process.exit(0)
        break
      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`)
          printUsage()
          process.exit(1)
        }
    }
  }

  return options
}

function printUsage(): void {
  console.log(`
Performance Testing CLI

Usage: tsx scripts/performance-tests.ts [options]

Options:
  -c, --concurrency <num>      Maximum concurrent users (default: 50)
  -d, --duration <seconds>     Sustained load duration in seconds (default: 60)
  -r, --ramp-up <seconds>      Ramp-up duration in seconds (default: 30)
  -m, --memory-threshold <mb>  Memory increase threshold in MB (default: 100)
  -e, --endpoints <list>       Comma-separated list of endpoints to test
  -o, --output <dir>          Output directory for reports (default: test-results)
  -v, --verbose               Enable verbose logging
  -h, --help                  Show this help message

Examples:
  # Basic performance test
  tsx scripts/performance-tests.ts

  # High concurrency test
  tsx scripts/performance-tests.ts -c 100 -d 120

  # Test specific endpoints
  tsx scripts/performance-tests.ts -e "/api/health,/api/services,/api/staff"

  # Memory-focused test
  tsx scripts/performance-tests.ts -c 20 -d 300 -m 50
`)
}

async function main(): Promise<void> {
  console.log('🚀 Performance Testing Suite')
  console.log('============================\n')

  try {
    const options = await parseArgs()

    // Load and validate test configuration
    const config = loadTestConfig()
    const configErrors = validateTestConfig(config)

    if (configErrors.length > 0) {
      console.error('❌ Configuration errors:')
      configErrors.forEach((error) => console.error(`  • ${error}`))
      process.exit(1)
    }

    // Override configuration with CLI options
    if (options.outputDir) {
      config.reporting.outputDir = options.outputDir
    }

    // Create performance test configuration
    const perfConfig = createDefaultPerformanceConfig()

    if (options.concurrency) {
      perfConfig.loadTest.maxConcurrentUsers = options.concurrency
    }

    if (options.duration) {
      perfConfig.loadTest.sustainedDurationMs = options.duration
    }

    if (options.rampUp) {
      perfConfig.loadTest.rampUpDurationMs = options.rampUp
    }

    if (options.memoryThreshold) {
      perfConfig.memoryTest.memoryThresholdMb = options.memoryThreshold
    }

    if (options.endpoints) {
      perfConfig.responseTimeTest.endpoints = options.endpoints
    }

    // Display test configuration
    console.log('📋 Test Configuration:')
    console.log(`  • Max concurrent users: ${perfConfig.loadTest.maxConcurrentUsers}`)
    console.log(`  • Ramp-up duration: ${perfConfig.loadTest.rampUpDurationMs / 1000}s`)
    console.log(`  • Sustained duration: ${perfConfig.loadTest.sustainedDurationMs / 1000}s`)
    console.log(`  • Memory threshold: ${perfConfig.memoryTest.memoryThresholdMb}MB`)
    console.log(`  • Response time endpoints: ${perfConfig.responseTimeTest.endpoints.length}`)
    console.log(`  • Output directory: ${config.reporting.outputDir}`)
    console.log('')

    // Execute performance tests using the test suite
    const perfTestSuite = new PerformanceTestSuite(config, perfConfig)
    const results = await perfTestSuite.executeTests()

    // Analyze results
    const totalTests = results.length
    const passedTests = results.filter((r) => r.status === 'pass').length
    const failedTests = results.filter((r) => r.status === 'fail').length
    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0

    console.log('\n📊 Performance Test Results:')
    console.log('============================')
    console.log(`Total tests: ${totalTests}`)
    console.log(`Passed: ${passedTests}`)
    console.log(`Failed: ${failedTests}`)
    console.log(`Pass rate: ${passRate.toFixed(1)}%`)

    // Display detailed results for failed tests
    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:')
      results
        .filter((r) => r.status === 'fail')
        .forEach((result) => {
          console.log(`  • ${result.testName}: ${result.errors?.[0]?.message || 'Unknown error'}`)
        })
    }

    // Display performance metrics summary
    console.log('\n📈 Performance Metrics:')
    const loadTestResults = results.filter(
      (r) => r.testName.includes('load-test') && r.status === 'pass'
    )

    if (loadTestResults.length > 0) {
      loadTestResults.forEach((result) => {
        const loadResult =
          result.result?.loadTestResult ||
          result.result?.spikeTestResult ||
          result.result?.sustainedTestResult
        if (loadResult) {
          console.log(`  • ${result.testName}:`)
          console.log(`    - Total requests: ${loadResult.summary.totalRequests}`)
          console.log(
            `    - Average response time: ${loadResult.summary.averageResponseTime.toFixed(0)}ms`
          )
          console.log(`    - 95th percentile: ${loadResult.summary.p95ResponseTime.toFixed(0)}ms`)
          console.log(`    - Error rate: ${loadResult.summary.errorRate.toFixed(1)}%`)
          console.log(`    - Throughput: ${loadResult.summary.throughput.toFixed(1)} RPS`)
        }
      })
    }

    // Display response time results
    const responseTimeResults = results.filter(
      (r) => r.testName.includes('response-time') && r.status === 'pass'
    )
    if (responseTimeResults.length > 0) {
      console.log('\n⏱️  Response Time Results:')
      responseTimeResults.forEach((result) => {
        const rtResult = result.result
        if (rtResult) {
          console.log(
            `  • ${rtResult.endpoint}: avg=${rtResult.avgResponseTime.toFixed(0)}ms, p95=${rtResult.p95ResponseTime.toFixed(0)}ms`
          )
        }
      })
    }

    // Display memory test results
    const memoryResults = results.filter(
      (r) => r.testName.includes('memory') && r.status === 'pass'
    )
    if (memoryResults.length > 0) {
      console.log('\n🧠 Memory Test Results:')
      memoryResults.forEach((result) => {
        const memResult = result.result
        if (memResult) {
          if (memResult.memoryIncrease !== undefined) {
            console.log(
              `  • ${result.testName}: increase=${memResult.memoryIncrease}MB, max=${memResult.maxMemory}MB`
            )
          } else if (memResult.stable !== undefined) {
            console.log(
              `  • ${result.testName}: stable=${memResult.stable}, stddev=${memResult.memoryStdDev?.toFixed(1)}MB`
            )
          }
        }
      })
    }

    // Performance recommendations
    console.log('\n💡 Recommendations:')
    const recommendations: string[] = []

    // Analyze load test results for recommendations
    loadTestResults.forEach((result) => {
      const loadResult =
        result.result?.loadTestResult ||
        result.result?.spikeTestResult ||
        result.result?.sustainedTestResult
      if (loadResult) {
        if (loadResult.summary.averageResponseTime > 100) {
          recommendations.push(
            `Consider optimizing response times (current avg: ${loadResult.summary.averageResponseTime.toFixed(0)}ms)`
          )
        }
        if (loadResult.summary.errorRate > 0.5) {
          recommendations.push(
            `Investigate error causes (current rate: ${loadResult.summary.errorRate.toFixed(1)}%)`
          )
        }
        if (loadResult.summary.throughput < 20) {
          recommendations.push(
            `Consider scaling improvements (current throughput: ${loadResult.summary.throughput.toFixed(1)} RPS)`
          )
        }
      }
    })

    // Memory recommendations
    memoryResults.forEach((result) => {
      const memResult = result.result
      if (memResult?.memoryIncrease > 50) {
        recommendations.push(
          `Monitor for potential memory leaks (increase: ${memResult.memoryIncrease}MB)`
        )
      }
      if (memResult?.stable === false) {
        recommendations.push('Memory usage appears unstable, investigate memory management')
      }
    })

    if (recommendations.length === 0) {
      recommendations.push('Performance looks good! No specific recommendations at this time.')
    }

    recommendations.forEach((rec) => console.log(`  • ${rec}`))

    // Exit with appropriate code
    if (failedTests > 0) {
      console.log('\n❌ Performance tests completed with failures')
      process.exit(1)
    } else {
      console.log('\n✅ All performance tests passed')
      process.exit(0)
    }
  } catch (error) {
    console.error('\n❌ Performance testing failed:', error)
    if (error instanceof Error && error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n🛑 Performance testing interrupted')
  process.exit(130)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Performance testing terminated')
  process.exit(143)
})

// Run the main function
main().catch((error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
