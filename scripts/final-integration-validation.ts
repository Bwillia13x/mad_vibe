#!/usr/bin/env tsx

/**
 * Final Integration and Validation Suite Runner
 * Executes comprehensive integration tests, production readiness validation, and generates client handoff package
 */

import {
  startTestServer,
  TestHttpClient,
  TestDataManager,
  PerformanceMonitor,
  type TestEnvironment
} from '../test/utils/test-environment.js'
import { ComprehensiveIntegrationTests } from '../test/integration/comprehensive-integration-tests.js'
import { ProductionReadinessValidation } from '../test/production/production-readiness-validation.js'
import { ClientHandoffPackage } from '../test/handoff/client-handoff-package.js'
import { TestReporter } from '../test/reporting/test-reporter.js'
import { loadTestConfig, type TestConfig } from '../test/config/test-config.js'

interface FinalValidationOptions {
  generateHandoffPackage?: boolean
  handoffOutputDir?: string
  clientName?: string
  projectName?: string
  verbose?: boolean
}

/**
 * Main execution function for final integration and validation
 */
async function runFinalIntegrationValidation(options: FinalValidationOptions = {}) {
  console.log('🚀 FINAL INTEGRATION AND VALIDATION SUITE')
  console.log('=========================================')
  console.log(`Started at: ${new Date().toISOString()}`)

  const startTime = Date.now()
  let testEnvironment: TestEnvironment | null = null
  let overallSuccess = true

  try {
    // Initialize test environment
    console.log('\n📡 Initializing Test Environment...')
    const baseConfig = loadTestConfig()
    const config: TestConfig = {
      ...baseConfig,
      environment: 'production',
      server: {
        ...baseConfig.server,
        portFile: baseConfig.server.portFile || '.local/final_validation_port',
        env: {
          ...baseConfig.server.env,
          NODE_ENV: 'production'
        }
      }
    }

    testEnvironment = await startTestServer(config)

    const httpClient = new TestHttpClient(testEnvironment.baseUrl)
    const performanceMonitor = new PerformanceMonitor()
    const dataManager = new TestDataManager(httpClient)
    const reporter = new TestReporter(config)

    // Initialize test suites
    const integrationTests = new ComprehensiveIntegrationTests(
      httpClient,
      performanceMonitor,
      dataManager,
      testEnvironment,
      reporter
    )
    const productionValidation = new ProductionReadinessValidation(
      httpClient,
      performanceMonitor,
      dataManager,
      testEnvironment
    )

    // Phase 1: Comprehensive Integration Testing
    console.log('\n🔗 Phase 1: Comprehensive Integration Testing')
    console.log('============================================')
    const integrationResults = await integrationTests.runAllTests()

    if (!integrationResults.success) {
      overallSuccess = false
      console.log('❌ Integration tests failed - see results above')
    } else {
      console.log('✅ All integration tests passed')
    }

    // Phase 2: Production Readiness Validation
    console.log('\n🚀 Phase 2: Production Readiness Validation')
    console.log('==========================================')
    const productionResults = await productionValidation.runProductionReadinessValidation()

    if (!productionResults.success) {
      overallSuccess = false
      console.log('❌ Production readiness validation failed - see results above')
    } else {
      console.log('✅ Production readiness validation passed')
    }

    // Phase 3: Client Handoff Package Generation (if requested)
    if (options.generateHandoffPackage) {
      console.log('\n📦 Phase 3: Client Handoff Package Generation')
      console.log('============================================')

      const handoffPackage = new ClientHandoffPackage(
        httpClient,
        performanceMonitor,
        dataManager,
        testEnvironment
      )

      const handoffConfig = {
        outputDirectory: options.handoffOutputDir || './client-handoff-package',
        includeTestReports: true,
        includeDeploymentDocs: true,
        includeTroubleshootingGuides: true,
        includePerformanceReports: true,
        includeSecurityReports: true,
        clientName: options.clientName,
        projectName: options.projectName || 'Andreas Vibe Platform'
      }

      const handoffResults = await handoffPackage.generateHandoffPackage(handoffConfig)

      if (!handoffResults.success) {
        console.log('❌ Client handoff package generation failed')
      } else {
        console.log('✅ Client handoff package generated successfully')
        console.log(`📦 Package location: ${handoffResults.packagePath}`)
      }
    }

    // Final Summary
    const totalDuration = Date.now() - startTime
    console.log('\n🏁 FINAL VALIDATION SUMMARY')
    console.log('===========================')
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)} seconds`)
    console.log(`Integration Tests: ${integrationResults.success ? '✅ PASSED' : '❌ FAILED'}`)
    console.log(`Production Readiness: ${productionResults.success ? '✅ PASSED' : '❌ FAILED'}`)
    console.log(`Overall Status: ${overallSuccess ? '🎉 SUCCESS' : '❌ REQUIRES ATTENTION'}`)

    if (overallSuccess) {
      console.log('\n🎉 PLATFORM READY FOR CLIENT HANDOFF!')
      console.log('✅ All integration tests passed')
      console.log('✅ Production readiness validated')
      console.log('✅ System is ready for deployment')
    } else {
      console.log('\n⚠️  PLATFORM REQUIRES ATTENTION')
      console.log('🔧 Review failed tests and address issues')
      console.log('📋 Check detailed reports for specific recommendations')
    }

    // Production Readiness Score
    console.log(`\n📊 Production Readiness Score: ${productionResults.overallReadinessScore}/100`)

    if (productionResults.overallReadinessScore >= 90) {
      console.log('🌟 EXCELLENT - Ready for immediate deployment')
    } else if (productionResults.overallReadinessScore >= 80) {
      console.log('👍 GOOD - Ready for deployment with monitoring')
    } else if (productionResults.overallReadinessScore >= 70) {
      console.log('⚠️  ACCEPTABLE - Minor issues should be addressed')
    } else {
      console.log('🚨 NEEDS WORK - Significant issues must be resolved')
    }

    return {
      success: overallSuccess,
      integrationResults,
      productionResults,
      readinessScore: productionResults.overallReadinessScore,
      duration: totalDuration
    }
  } catch (error) {
    console.error('\n❌ FATAL ERROR during validation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime
    }
  } finally {
    // Cleanup
    if (testEnvironment) {
      console.log('\n🧹 Cleaning up test environment...')
      await testEnvironment.cleanup()
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)

  const options: FinalValidationOptions = {
    generateHandoffPackage: args.includes('--handoff') || args.includes('--package'),
    handoffOutputDir: args.find((arg) => arg.startsWith('--output='))?.split('=')[1],
    clientName: args.find((arg) => arg.startsWith('--client='))?.split('=')[1],
    projectName: args.find((arg) => arg.startsWith('--project='))?.split('=')[1],
    verbose: args.includes('--verbose') || args.includes('-v')
  }

  runFinalIntegrationValidation(options)
    .then((result) => {
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      console.error('Unhandled error:', error)
      process.exit(1)
    })
}

export { runFinalIntegrationValidation }
