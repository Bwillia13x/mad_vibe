#!/usr/bin/env tsx

/**
 * Deployment and Infrastructure Testing Script
 * Runs comprehensive deployment tests including Docker, database, and health monitoring
 */

import { DeploymentTestRunner } from '../test/deployment/deployment-test-suite.js'
import { loadTestConfig } from '../test/config/test-config.js'
import { TestReporter } from '../test/reporting/test-reporter.js'

interface DeploymentTestOptions {
  suite?: 'all' | 'docker' | 'database' | 'health'
  verbose?: boolean
  output?: string
  format?: 'console' | 'json' | 'html'
}

async function main() {
  const args = process.argv.slice(2)
  const options: DeploymentTestOptions = {
    suite: 'all',
    verbose: false,
    format: 'console'
  }

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '--suite':
        const suite = args[++i] as DeploymentTestOptions['suite']
        if (['all', 'docker', 'database', 'health'].includes(suite!)) {
          options.suite = suite
        } else {
          console.error(`Invalid suite: ${suite}. Use: all, docker, database, health`)
          process.exit(1)
        }
        break

      case '--verbose':
        options.verbose = true
        process.env.TEST_VERBOSE = 'true'
        break

      case '--output':
        options.output = args[++i]
        break

      case '--format':
        const format = args[++i] as DeploymentTestOptions['format']
        if (['console', 'json', 'html'].includes(format!)) {
          options.format = format
        } else {
          console.error(`Invalid format: ${format}. Use: console, json, html`)
          process.exit(1)
        }
        break

      case '--help':
      case '-h':
        printHelp()
        process.exit(0)
        break

      default:
        console.error(`Unknown argument: ${arg}`)
        printHelp()
        process.exit(1)
    }
  }

  try {
    console.log('🚀 Starting Deployment and Infrastructure Tests')
    console.log(`Suite: ${options.suite}`)
    console.log(`Format: ${options.format}`)
    if (options.verbose) {
      console.log('Verbose mode enabled')
    }
    console.log('')

    // Load test configuration
    const config = await loadTestConfig()

    // Create test runner
    const runner = new DeploymentTestRunner(config)

    // Run tests based on suite selection
    let results
    const startTime = Date.now()

    switch (options.suite) {
      case 'docker':
        results = {
          docker: await runner.runDockerTests(),
          database: [],
          health: []
        }
        break

      case 'database':
        results = {
          docker: [],
          database: await runner.runDatabaseTests(),
          health: []
        }
        break

      case 'health':
        results = {
          docker: [],
          database: [],
          health: await runner.runHealthTests()
        }
        break

      case 'all':
      default:
        results = await runner.runAllTests()
        break
    }

    const duration = Date.now() - startTime

    // Generate reports
    if (options.output || options.format !== 'console') {
      const reporter = new TestReporter()

      // Convert results to reporter format
      const reportData = {
        summary: {
          total: results.docker.length + results.database.length + results.health.length,
          passed: [...results.docker, ...results.database, ...results.health].filter(
            (t) => t.success
          ).length,
          failed: [...results.docker, ...results.database, ...results.health].filter(
            (t) => !t.success
          ).length,
          duration,
          timestamp: new Date().toISOString()
        },
        suites: [
          {
            name: 'Docker Deployment',
            tests: results.docker.map((t) => ({
              name: t.testName,
              status: t.success ? 'passed' : 'failed',
              duration: t.duration,
              error: t.error,
              details: t.details
            }))
          },
          {
            name: 'Database Connectivity',
            tests: results.database.map((t) => ({
              name: t.testName,
              status: t.success ? 'passed' : 'failed',
              duration: t.duration,
              error: t.error,
              details: t.details
            }))
          },
          {
            name: 'Health Monitoring',
            tests: results.health.map((t) => ({
              name: t.testName,
              status: t.success ? 'passed' : 'failed',
              duration: t.duration,
              error: t.error,
              details: t.details
            }))
          }
        ]
      }

      if (options.format === 'json' || options.output?.endsWith('.json')) {
        const jsonReport = reporter.generateJsonReport(reportData)
        if (options.output) {
          await reporter.saveReport(jsonReport, options.output)
          console.log(`\n📄 JSON report saved to: ${options.output}`)
        } else {
          console.log('\n📄 JSON Report:')
          console.log(jsonReport)
        }
      }

      if (options.format === 'html' || options.output?.endsWith('.html')) {
        const htmlReport = reporter.generateHtmlReport(reportData)
        const outputPath =
          options.output ||
          `test-results/deployment-report-${new Date().toISOString().replace(/[:.]/g, '-')}.html`
        await reporter.saveReport(htmlReport, outputPath)
        console.log(`\n📄 HTML report saved to: ${outputPath}`)
      }
    }

    // Generate readiness report
    const readinessReport = runner.generateReadinessReport(results)

    console.log('\n🎯 DEPLOYMENT READINESS ASSESSMENT')
    console.log('='.repeat(50))
    console.log(`Ready for Production: ${readinessReport.ready ? '✅ YES' : '❌ NO'}`)
    console.log(`Readiness Score: ${readinessReport.score.toFixed(1)}%`)

    if (readinessReport.issues.length > 0) {
      console.log('\n⚠️  Issues Found:')
      readinessReport.issues.forEach((issue) => console.log(`   - ${issue}`))
    }

    if (readinessReport.recommendations.length > 0) {
      console.log('\n💡 Recommendations:')
      readinessReport.recommendations.forEach((rec) => console.log(`   - ${rec}`))
    }

    // Exit with appropriate code
    const summary = runner.getSummary(results)
    if (summary.failed > 0) {
      console.log(`\n❌ ${summary.failed} test(s) failed`)
      process.exit(1)
    } else {
      console.log(`\n✅ All ${summary.total} tests passed`)
      process.exit(0)
    }
  } catch (error) {
    console.error('❌ Deployment tests failed:', error)
    process.exit(1)
  }
}

function printHelp() {
  console.log(`
🚀 Deployment and Infrastructure Testing Script

Usage: npm run test:deployment [options]

Options:
  --suite <type>     Test suite to run (all, docker, database, health) [default: all]
  --verbose          Enable verbose output
  --output <file>    Save report to file
  --format <type>    Report format (console, json, html) [default: console]
  --help, -h         Show this help message

Examples:
  npm run test:deployment                           # Run all deployment tests
  npm run test:deployment -- --suite docker        # Run only Docker tests
  npm run test:deployment -- --verbose             # Run with verbose output
  npm run test:deployment -- --format json         # Output JSON report
  npm run test:deployment -- --output report.html  # Save HTML report

Test Suites:
  all        - Run all deployment and infrastructure tests
  docker     - Test Docker container build, startup, and configuration
  database   - Test database connectivity and data persistence
  health     - Test health monitoring and alerting mechanisms
`)
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
}
