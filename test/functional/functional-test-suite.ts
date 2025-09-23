/**
 * Comprehensive Functional Test Suite
 * Orchestrates API endpoint testing, business logic validation, and UI component tests
 */

import { ApiTestSuite } from './api-test-suite.js'
import { BusinessLogicTestSuite } from './business-logic-tests.js'
import { UIComponentTestSuite } from './ui-component-tests.js'
import type {
  TestHttpClient,
  PerformanceMonitor,
  TestDataManager,
  TestEnvironment
} from '../utils/test-environment.js'

export interface FunctionalTestSuiteResult {
  success: boolean
  summary: {
    totalTests: number
    passed: number
    failed: number
    skipped: number
    averageResponseTime: number
    totalDuration: number
  }
  apiTestResults: any
  businessLogicResults: any[]
  uiTestResults: any[]
  performanceMetrics: any[]
}

/**
 * Comprehensive Functional Test Suite
 */
export class FunctionalTestSuite {
  private apiTestSuite: ApiTestSuite
  private businessLogicSuite: BusinessLogicTestSuite
  private uiTestSuite: UIComponentTestSuite

  constructor(
    private httpClient: TestHttpClient,
    private performanceMonitor: PerformanceMonitor,
    private dataManager: TestDataManager,
    private testEnvironment: TestEnvironment
  ) {
    this.apiTestSuite = new ApiTestSuite(httpClient, performanceMonitor, dataManager)
    this.businessLogicSuite = new BusinessLogicTestSuite(
      httpClient,
      dataManager,
      performanceMonitor
    )
    this.uiTestSuite = new UIComponentTestSuite(testEnvironment)
  }

  /**
   * Run all functional tests
   */
  async runAllTests(
    options: {
      includeApi?: boolean
      includeBusinessLogic?: boolean
      includeUI?: boolean
    } = {}
  ): Promise<FunctionalTestSuiteResult> {
    const { includeApi = true, includeBusinessLogic = true, includeUI = true } = options

    console.log('\n🚀 Starting Comprehensive Functional Test Suite')
    console.log('================================================')

    const startTime = Date.now()

    // Clear previous metrics
    this.performanceMonitor.clearMetrics()

    let apiTestResults: any = null
    let businessLogicResults: any[] = []
    let uiTestResults: any[] = []

    // Run API endpoint tests
    if (includeApi) {
      console.log('\n📡 Phase 1: API Endpoint Testing')
      console.log('--------------------------------')
      try {
        apiTestResults = await this.apiTestSuite.runAllTests()

        // Also run CRUD operations tests
        await this.apiTestSuite.testCrudOperations()
      } catch (error) {
        console.error('❌ API test suite failed:', error)
        apiTestResults = { success: false, error: String(error) }
      }
    }

    // Run business logic tests
    if (includeBusinessLogic) {
      console.log('\n🧮 Phase 2: Business Logic Validation')
      console.log('------------------------------------')
      try {
        businessLogicResults = await this.businessLogicSuite.runAllTests()
      } catch (error) {
        console.error('❌ Business logic test suite failed:', error)
        businessLogicResults = [
          { testName: 'Business Logic Suite', status: 'fail', error: String(error) }
        ]
      }
    }

    // Run UI component tests
    if (includeUI) {
      console.log('\n🖥️  Phase 3: UI Component Integration')
      console.log('-----------------------------------')
      try {
        uiTestResults = await this.uiTestSuite.runAllTests()
      } catch (error) {
        console.error('❌ UI test suite failed:', error)
        uiTestResults = [{ testName: 'UI Test Suite', status: 'fail', error: String(error) }]
      }
    }

    const endTime = Date.now()
    const totalDuration = endTime - startTime

    // Collect performance metrics
    const performanceMetrics = this.performanceMonitor.getMetrics()

    // Calculate overall summary
    const summary = this.calculateSummary(
      apiTestResults,
      businessLogicResults,
      uiTestResults,
      performanceMetrics,
      totalDuration
    )

    const result: FunctionalTestSuiteResult = {
      success: summary.failed === 0,
      summary,
      apiTestResults,
      businessLogicResults,
      uiTestResults,
      performanceMetrics
    }

    // Print final summary
    this.printFinalSummary(result)

    return result
  }

  /**
   * Run only API tests (for faster feedback)
   */
  async runApiTestsOnly(): Promise<FunctionalTestSuiteResult> {
    return this.runAllTests({
      includeApi: true,
      includeBusinessLogic: false,
      includeUI: false
    })
  }

  /**
   * Run only business logic tests
   */
  async runBusinessLogicTestsOnly(): Promise<FunctionalTestSuiteResult> {
    return this.runAllTests({
      includeApi: false,
      includeBusinessLogic: true,
      includeUI: false
    })
  }

  /**
   * Run only UI tests
   */
  async runUITestsOnly(): Promise<FunctionalTestSuiteResult> {
    return this.runAllTests({
      includeApi: false,
      includeBusinessLogic: false,
      includeUI: true
    })
  }

  /**
   * Calculate overall test summary
   */
  private calculateSummary(
    apiResults: any,
    businessLogicResults: any[],
    uiResults: any[],
    performanceMetrics: any[],
    totalDuration: number
  ) {
    let totalTests = 0
    let passed = 0
    let failed = 0
    let skipped = 0

    // Count API test results
    if (apiResults && apiResults.summary) {
      totalTests += apiResults.summary.totalTests
      passed += apiResults.summary.passed
      failed += apiResults.summary.failed
      skipped += apiResults.summary.skipped
    }

    // Count business logic test results
    if (Array.isArray(businessLogicResults)) {
      totalTests += businessLogicResults.length
      passed += businessLogicResults.filter((r) => r.status === 'pass').length
      failed += businessLogicResults.filter((r) => r.status === 'fail').length
      skipped += businessLogicResults.filter((r) => r.status === 'skip').length
    }

    // Count UI test results
    if (Array.isArray(uiResults)) {
      totalTests += uiResults.length
      passed += uiResults.filter((r) => r.status === 'pass').length
      failed += uiResults.filter((r) => r.status === 'fail').length
      skipped += uiResults.filter((r) => r.status === 'skip').length
    }

    // Calculate average response time from performance metrics
    const averageResponseTime =
      performanceMetrics.length > 0
        ? performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / performanceMetrics.length
        : 0

    return {
      totalTests,
      passed,
      failed,
      skipped,
      averageResponseTime,
      totalDuration
    }
  }

  /**
   * Print comprehensive final summary
   */
  private printFinalSummary(result: FunctionalTestSuiteResult): void {
    console.log('\n')
    console.log('🏁 COMPREHENSIVE FUNCTIONAL TEST SUITE RESULTS')
    console.log('==============================================')

    // Overall summary
    console.log('\n📊 Overall Summary:')
    console.log(`   Total Tests: ${result.summary.totalTests}`)
    console.log(`   ✅ Passed: ${result.summary.passed}`)
    console.log(`   ❌ Failed: ${result.summary.failed}`)
    console.log(`   ⏭️  Skipped: ${result.summary.skipped}`)
    console.log(`   ⏱️  Total Duration: ${(result.summary.totalDuration / 1000).toFixed(2)}s`)
    console.log(`   📈 Avg Response Time: ${result.summary.averageResponseTime.toFixed(2)}ms`)

    // Detailed breakdown
    if (result.apiTestResults) {
      console.log('\n📡 API Test Results:')
      if (result.apiTestResults.summary) {
        console.log(`   Tests: ${result.apiTestResults.summary.totalTests}`)
        console.log(`   Passed: ${result.apiTestResults.summary.passed}`)
        console.log(`   Failed: ${result.apiTestResults.summary.failed}`)
        console.log(
          `   Avg Response: ${result.apiTestResults.summary.averageResponseTime.toFixed(2)}ms`
        )
      } else {
        console.log(`   ❌ API tests failed: ${result.apiTestResults.error}`)
      }
    }

    if (result.businessLogicResults.length > 0) {
      console.log('\n🧮 Business Logic Test Results:')
      const blPassed = result.businessLogicResults.filter((r) => r.status === 'pass').length
      const blFailed = result.businessLogicResults.filter((r) => r.status === 'fail').length
      console.log(`   Tests: ${result.businessLogicResults.length}`)
      console.log(`   Passed: ${blPassed}`)
      console.log(`   Failed: ${blFailed}`)
    }

    if (result.uiTestResults.length > 0) {
      console.log('\n🖥️  UI Component Test Results:')
      const uiPassed = result.uiTestResults.filter((r) => r.status === 'pass').length
      const uiFailed = result.uiTestResults.filter((r) => r.status === 'fail').length
      console.log(`   Tests: ${result.uiTestResults.length}`)
      console.log(`   Passed: ${uiPassed}`)
      console.log(`   Failed: ${uiFailed}`)
    }

    // Performance insights
    if (result.performanceMetrics.length > 0) {
      console.log('\n📈 Performance Insights:')
      const slowRequests = result.performanceMetrics.filter((m) => m.duration > 500)
      const fastRequests = result.performanceMetrics.filter((m) => m.duration < 100)

      console.log(`   Total Requests: ${result.performanceMetrics.length}`)
      console.log(`   Fast Requests (<100ms): ${fastRequests.length}`)
      console.log(`   Slow Requests (>500ms): ${slowRequests.length}`)

      if (slowRequests.length > 0) {
        console.log('   Slowest Requests:')
        slowRequests
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 3)
          .forEach((req) => {
            console.log(`     • ${req.name}: ${req.duration}ms`)
          })
      }
    }

    // Failure details
    if (result.summary.failed > 0) {
      console.log('\n❌ Failed Tests Summary:')

      // API failures
      if (
        result.apiTestResults &&
        result.apiTestResults.summary &&
        result.apiTestResults.summary.failed > 0
      ) {
        console.log('   API Test Failures:')
        const allApiResults = [
          ...(result.apiTestResults.endpointTests || []),
          ...(result.apiTestResults.individualResourceTests || []),
          ...(result.apiTestResults.errorScenarioTests || [])
        ]
        allApiResults
          .filter((r) => r.status === 'fail')
          .forEach((r) => console.log(`     • ${r.endpoint} (${r.method}): ${r.error}`))
      }

      // Business logic failures
      const blFailures = result.businessLogicResults.filter((r) => r.status === 'fail')
      if (blFailures.length > 0) {
        console.log('   Business Logic Failures:')
        blFailures.forEach((r) => console.log(`     • ${r.testName}: ${r.error}`))
      }

      // UI failures
      const uiFailures = result.uiTestResults.filter((r) => r.status === 'fail')
      if (uiFailures.length > 0) {
        console.log('   UI Test Failures:')
        uiFailures.forEach((r) => console.log(`     • ${r.testName}: ${r.error}`))
      }
    }

    // Final verdict
    console.log('\n🎯 Final Verdict:')
    if (result.success) {
      console.log('   🎉 ALL FUNCTIONAL TESTS PASSED!')
      console.log('   ✅ Platform is ready for comprehensive testing')

      // Quality indicators
      const passRate = (result.summary.passed / result.summary.totalTests) * 100
      const avgResponseTime = result.summary.averageResponseTime

      if (passRate === 100 && avgResponseTime < 200) {
        console.log('   🌟 EXCELLENT: Perfect pass rate with fast response times')
      } else if (passRate === 100) {
        console.log('   👍 GOOD: All tests passed')
      }
    } else {
      console.log('   ❌ FUNCTIONAL TESTS FAILED')
      console.log('   🔧 Platform requires fixes before deployment')

      const passRate = (result.summary.passed / result.summary.totalTests) * 100
      if (passRate >= 90) {
        console.log('   ⚠️  Minor issues detected - mostly ready')
      } else if (passRate >= 75) {
        console.log('   ⚠️  Moderate issues detected - needs attention')
      } else {
        console.log('   🚨 Major issues detected - significant work needed')
      }
    }

    console.log('\n==============================================')
  }

  /**
   * Generate detailed test report
   */
  generateDetailedReport(): any {
    return {
      timestamp: new Date().toISOString(),
      testSuite: 'Comprehensive Functional Tests',
      environment: {
        baseUrl: this.testEnvironment.baseUrl,
        port: this.testEnvironment.port
      },
      results: {
        api: this.apiTestSuite.getResults(),
        businessLogic: this.businessLogicSuite.getResults(),
        ui: this.uiTestSuite.getResults()
      },
      performance: this.performanceMonitor.getMetrics()
    }
  }
}
