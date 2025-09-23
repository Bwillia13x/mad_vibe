/**
 * API Test Suite - Comprehensive API endpoint testing
 * Orchestrates all API tests including endpoint validation and error scenarios
 */

import { ApiTestingFramework } from './api-testing-framework.js'
import {
  createApiEndpointTests,
  createIndividualResourceTests,
  createErrorScenarioTests
} from './api-endpoint-tests.js'
import type {
  TestHttpClient,
  PerformanceMonitor,
  TestDataManager
} from '../utils/test-environment.js'

export interface ApiTestSuiteResult {
  success: boolean
  summary: {
    totalTests: number
    passed: number
    failed: number
    skipped: number
    averageResponseTime: number
  }
  endpointTests: any[]
  individualResourceTests: any[]
  errorScenarioTests: any[]
  performanceMetrics: any[]
}

/**
 * API Test Suite - Main class for running comprehensive API tests
 */
export class ApiTestSuite {
  private framework: ApiTestingFramework

  constructor(
    private httpClient: TestHttpClient,
    private performanceMonitor: PerformanceMonitor,
    private dataManager: TestDataManager
  ) {
    this.framework = new ApiTestingFramework(httpClient, performanceMonitor)
  }

  /**
   * Run all API tests
   */
  async runAllTests(): Promise<ApiTestSuiteResult> {
    console.log('\n=== API Endpoint Testing Suite ===')

    // Clear previous results
    this.framework.clearResults()
    this.performanceMonitor.clearMetrics()

    // Ensure clean test environment
    await this.dataManager.resetDemoData()

    // Run endpoint tests
    console.log('\n--- Basic Endpoint Tests ---')
    const endpointTests = createApiEndpointTests(this.dataManager)
    const endpointResults = await this.framework.executeTests(endpointTests)

    // Run individual resource tests (requires existing data)
    console.log('\n--- Individual Resource Tests ---')
    const individualTests = createIndividualResourceTests()

    // Update individual tests with actual HTTP client reference for setup
    individualTests.forEach((test) => {
      if (test.setup) {
        const originalSetup = test.setup
        test.setup = async function () {
          // Bind httpClient to test context
          ;(this as any).httpClient = httpClient
          await originalSetup.call(this)
        }.bind({ httpClient: this.httpClient })
      }
    })

    const individualResults = await this.framework.executeTests(individualTests)

    // Run error scenario tests
    console.log('\n--- Error Scenario Tests ---')
    const errorScenarios = createErrorScenarioTests()
    const errorResults = await this.framework.executeErrorScenarios(errorScenarios)

    // Generate summary
    const summary = this.framework.generateSummary()
    const performanceMetrics = this.performanceMonitor.getMetrics()

    // Validate CSV exports
    console.log('\n--- CSV Export Validation ---')
    await this.validateCsvExports()

    // Validate streaming functionality
    console.log('\n--- Streaming Functionality ---')
    await this.validateStreamingChat()

    const result: ApiTestSuiteResult = {
      success: summary.failed === 0,
      summary,
      endpointTests: endpointResults,
      individualResourceTests: individualResults,
      errorScenarioTests: errorResults,
      performanceMetrics
    }

    // Print final summary
    this.printSummary(result)

    return result
  }

  /**
   * Validate CSV export functionality
   */
  private async validateCsvExports(): Promise<void> {
    const csvEndpoints = [
      {
        path: '/api/analytics/export',
        name: 'Analytics CSV',
        expectedHeaders: ['date', 'totalRevenue']
      },
      {
        path: '/api/pos/sales/export',
        name: 'POS Sales CSV',
        expectedHeaders: ['id', 'createdAt']
      },
      {
        path: '/api/loyalty/entries/export',
        name: 'Loyalty CSV',
        expectedHeaders: ['id', 'customerId']
      }
    ]

    for (const endpoint of csvEndpoints) {
      try {
        const response = await this.httpClient.get(endpoint.path)

        if (!response.ok) {
          console.error(`❌ ${endpoint.name}: HTTP ${response.status}`)
          continue
        }

        const contentType = response.headers.get('content-type') || ''
        if (!contentType.includes('text/csv')) {
          console.error(`❌ ${endpoint.name}: Wrong content-type: ${contentType}`)
          continue
        }

        const csvText = await response.text()
        const hasExpectedHeaders = endpoint.expectedHeaders.every((header) =>
          csvText.toLowerCase().includes(header.toLowerCase())
        )

        if (!hasExpectedHeaders) {
          console.error(`❌ ${endpoint.name}: Missing expected headers`)
          continue
        }

        console.log(`✅ ${endpoint.name}: Valid CSV export`)
      } catch (error) {
        console.error(`❌ ${endpoint.name}: ${error}`)
      }
    }
  }

  /**
   * Validate streaming chat functionality
   */
  private async validateStreamingChat(): Promise<void> {
    try {
      console.log('Testing streaming chat...')

      const streamedContent = await this.httpClient.streamSSE('/api/chat', {
        messages: [{ role: 'user', content: 'Give me a brief status update.' }],
        stream: true
      })

      if (!streamedContent || streamedContent.length < 10) {
        console.error('❌ Streaming chat: Content too short or empty')
        return
      }

      console.log(`✅ Streaming chat: Received ${streamedContent.length} characters`)
    } catch (error) {
      console.error(`❌ Streaming chat: ${error}`)
    }
  }

  /**
   * Test CRUD operations for entities that support them
   */
  async testCrudOperations(): Promise<void> {
    console.log('\n--- CRUD Operations Tests ---')

    // Test POS Sale CRUD
    await this.testPosSaleCrud()

    // Test Marketing Campaign CRUD
    await this.testMarketingCampaignCrud()

    // Test Loyalty Entry CRUD
    await this.testLoyaltyEntryCrud()
  }

  /**
   * Test POS Sale CRUD operations
   */
  private async testPosSaleCrud(): Promise<void> {
    try {
      // Create sale
      const newSale = await this.httpClient.postJson('/api/pos/sales', {
        items: [{ kind: 'service', name: 'Test Service', quantity: 1, unitPrice: 50 }],
        discountPct: 10,
        taxPct: 8.5
      })

      if (!newSale?.id) {
        console.error('❌ POS Sale CRUD: Failed to create sale')
        return
      }

      // Delete sale
      const deleteResponse = await this.httpClient.delete(`/api/pos/sales/${newSale.id}`)
      if (!deleteResponse.ok) {
        console.error('❌ POS Sale CRUD: Failed to delete sale')
        return
      }

      console.log('✅ POS Sale CRUD: Create and delete operations successful')
    } catch (error) {
      console.error(`❌ POS Sale CRUD: ${error}`)
    }
  }

  /**
   * Test Marketing Campaign CRUD operations
   */
  private async testMarketingCampaignCrud(): Promise<void> {
    try {
      // Create campaign
      const newCampaign = await this.httpClient.postJson('/api/marketing/campaigns', {
        name: 'Test CRUD Campaign',
        description: 'Test Description',
        channel: 'email',
        status: 'draft'
      })

      if (!newCampaign?.id) {
        console.error('❌ Marketing Campaign CRUD: Failed to create campaign')
        return
      }

      // Update campaign
      const updateResponse = await this.httpClient.patch(
        `/api/marketing/campaigns/${newCampaign.id}`,
        {
          status: 'active',
          description: 'Updated Description'
        }
      )

      if (!updateResponse.ok) {
        console.error('❌ Marketing Campaign CRUD: Failed to update campaign')
        return
      }

      const updatedCampaign = await updateResponse.json()
      if (updatedCampaign.status !== 'active') {
        console.error('❌ Marketing Campaign CRUD: Update did not persist')
        return
      }

      console.log('✅ Marketing Campaign CRUD: Create and update operations successful')
    } catch (error) {
      console.error(`❌ Marketing Campaign CRUD: ${error}`)
    }
  }

  /**
   * Test Loyalty Entry CRUD operations
   */
  private async testLoyaltyEntryCrud(): Promise<void> {
    try {
      // Get a customer to use for loyalty entry
      const customers = await this.httpClient.getJson('/api/customers')
      if (!Array.isArray(customers) || customers.length === 0) {
        console.log('⏭️  Loyalty Entry CRUD: No customers available, skipping')
        return
      }

      // Create loyalty entry
      const newEntry = await this.httpClient.postJson('/api/loyalty/entries', {
        customerId: customers[0].id,
        type: 'earned',
        points: 100,
        note: 'Test CRUD loyalty points'
      })

      if (!newEntry?.id) {
        console.error('❌ Loyalty Entry CRUD: Failed to create entry')
        return
      }

      // Verify entry appears in customer's loyalty entries
      const customerEntries = await this.httpClient.getJson(
        `/api/loyalty/entries?customerId=${customers[0].id}`
      )
      const foundEntry =
        Array.isArray(customerEntries) && customerEntries.some((entry) => entry.id === newEntry.id)

      if (!foundEntry) {
        console.error('❌ Loyalty Entry CRUD: Entry not found in customer filter')
        return
      }

      console.log('✅ Loyalty Entry CRUD: Create and filter operations successful')
    } catch (error) {
      console.error(`❌ Loyalty Entry CRUD: ${error}`)
    }
  }

  /**
   * Print comprehensive test summary
   */
  private printSummary(result: ApiTestSuiteResult): void {
    console.log('\n=== API Test Suite Summary ===')
    console.log(`Total Tests: ${result.summary.totalTests}`)
    console.log(`✅ Passed: ${result.summary.passed}`)
    console.log(`❌ Failed: ${result.summary.failed}`)
    console.log(`⏭️  Skipped: ${result.summary.skipped}`)
    console.log(`⏱️  Average Response Time: ${result.summary.averageResponseTime.toFixed(2)}ms`)

    if (result.summary.failed > 0) {
      console.log('\n❌ Failed Tests:')
      const allResults = [
        ...result.endpointTests,
        ...result.individualResourceTests,
        ...result.errorScenarioTests
      ]

      allResults
        .filter((test) => test.status === 'fail')
        .forEach((test) => {
          console.log(`   • ${test.endpoint} (${test.method}): ${test.error}`)
          if (test.validationErrors) {
            test.validationErrors.forEach((err: string) => console.log(`     - ${err}`))
          }
        })
    }

    // Performance warnings
    if (result.summary.averageResponseTime > 200) {
      console.log(
        `\n⚠️  Average response time (${result.summary.averageResponseTime.toFixed(2)}ms) exceeds 200ms threshold`
      )
    }

    const slowTests = result.performanceMetrics.filter((m: any) => m.duration > 500)
    if (slowTests.length > 0) {
      console.log(`\n⚠️  ${slowTests.length} requests exceeded 500ms:`)
      slowTests.forEach((test: any) => {
        console.log(`   • ${test.name}: ${test.duration}ms`)
      })
    }

    console.log(
      `\n${result.success ? '✅' : '❌'} API Test Suite ${result.success ? 'PASSED' : 'FAILED'}`
    )
  }
}
