#!/usr/bin/env node
/**
 * Test Runner CLI - Command-line interface for the test orchestrator
 * Provides a unified entry point for running all test suites
 */

import { TestOrchestrator } from '../orchestrator/test-orchestrator.js'
import { loadTestConfig, validateTestConfig, defaultTestConfig } from '../config/test-config.js'
import type { TestExecutionOptions } from '../orchestrator/test-orchestrator.js'

interface CliOptions {
  config?: string
  suites?: string[]
  verbose?: boolean
  bail?: boolean
  parallel?: boolean
  help?: boolean
  list?: boolean
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '--config':
      case '-c':
        options.config = args[++i]
        break
      case '--suites':
      case '-s':
        options.suites = args[++i]?.split(',').map((s) => s.trim())
        break
      case '--verbose':
      case '-v':
        options.verbose = true
        break
      case '--bail':
      case '-b':
        options.bail = true
        break
      case '--parallel':
      case '-p':
        options.parallel = true
        break
      case '--help':
      case '-h':
        options.help = true
        break
      case '--list':
      case '-l':
        options.list = true
        break
    }
  }

  return options
}

/**
 * Display help information
 */
function showHelp(): void {
  console.log(`
Test Runner - Comprehensive testing infrastructure for Andreas Vibe platform

Usage: npm run test:comprehensive [options]

Options:
  -c, --config <path>     Path to test configuration file
  -s, --suites <names>    Comma-separated list of test suites to run
  -v, --verbose           Enable verbose output
  -b, --bail              Stop on first test failure
  -p, --parallel          Run test suites in parallel (when safe)
  -l, --list              List available test suites
  -h, --help              Show this help message

Available Test Suites:
  smoke-tests             Basic functionality and health checks
  api-tests               Comprehensive API endpoint testing
  e2e-tests               End-to-end user workflow testing
  performance-tests       Load and response time testing
  security-tests          Security vulnerability testing

Examples:
  npm run test:comprehensive                           # Run all enabled suites
  npm run test:comprehensive -- --suites smoke-tests  # Run only smoke tests
  npm run test:comprehensive -- --verbose --bail      # Verbose output, stop on failure
  npm run test:comprehensive -- --list                # List available suites
`)
}

/**
 * List available test suites
 */
function listSuites(): void {
  const config = loadTestConfig()

  console.log('\nAvailable Test Suites:')
  console.log('======================')

  config.testSuites.forEach((suite) => {
    const status = suite.enabled ? '✅ enabled' : '❌ disabled'
    console.log(`${suite.name.padEnd(20)} ${suite.type.padEnd(12)} ${status}`)
  })

  console.log('\nConfiguration:')
  console.log(`Environment: ${config.environment}`)
  console.log(`Output Directory: ${config.reporting.outputDir}`)
  console.log(`Report Formats: ${config.reporting.formats.join(', ')}`)
  console.log(`Max Response Time: ${config.thresholds.maxResponseTime}ms`)
  console.log(`Max Memory Usage: ${config.thresholds.maxMemoryUsage}MB`)
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const options = parseArgs(args)

  if (options.help) {
    showHelp()
    return
  }

  if (options.list) {
    listSuites()
    return
  }

  try {
    // Load and validate configuration
    const config = loadTestConfig(options.config)
    const configErrors = validateTestConfig(config)

    if (configErrors.length > 0) {
      console.error('❌ Configuration validation failed:')
      configErrors.forEach((error) => console.error(`   • ${error}`))
      process.exit(1)
    }

    // Set up execution options
    const executionOptions: TestExecutionOptions = {
      suites: options.suites,
      verbose: options.verbose,
      bail: options.bail,
      parallel: options.parallel
    }

    // Create and run test orchestrator
    const orchestrator = new TestOrchestrator(config)
    const result = await orchestrator.executeTests(executionOptions)

    // Exit with appropriate code
    if (result.success) {
      console.log('\n✅ All tests completed successfully!')

      if (result.report.readinessScore >= 90) {
        console.log('🚀 Platform is ready for production deployment!')
      } else if (result.report.readinessScore >= 70) {
        console.log('⚠️  Platform has some issues but may be suitable for staging deployment.')
      } else {
        console.log('❌ Platform has significant issues and is not ready for deployment.')
      }

      process.exit(0)
    } else {
      console.log('\n❌ Some tests failed. Check the report for details.')
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Test execution failed:', error)
    process.exit(1)
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

// Run the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('CLI execution failed:', error)
    process.exit(1)
  })
}

export { main, parseArgs, showHelp, listSuites }
