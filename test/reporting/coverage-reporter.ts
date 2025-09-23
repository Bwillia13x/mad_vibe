/**
 * Test Coverage Reporting Utilities
 * Provides detailed test coverage analysis and reporting
 */

import fs from 'node:fs'
import path from 'node:path'
import type { TestReport, TestSuiteResult } from './test-reporter.js'

export interface CoverageReport {
  timestamp: string
  overallCoverage: CoverageMetrics
  suiteTypeCoverage: SuiteTypeCoverage[]
  endpointCoverage: EndpointCoverage[]
  featureCoverage: FeatureCoverage[]
  recommendations: string[]
}

export interface CoverageMetrics {
  totalTests: number
  executedTests: number
  passedTests: number
  failedTests: number
  skippedTests: number
  executionRate: number // percentage of tests executed
  passRate: number // percentage of executed tests that passed
  overallScore: number // combined metric
}

export interface SuiteTypeCoverage {
  suiteType: string
  metrics: CoverageMetrics
  expectedTests: number
  actualTests: number
  coverageGap: number
}

export interface EndpointCoverage {
  endpoint: string
  method: string
  tested: boolean
  testCount: number
  lastTested?: string
  status: 'covered' | 'partial' | 'missing'
}

export interface FeatureCoverage {
  feature: string
  module: string
  tested: boolean
  testCount: number
  criticalPath: boolean
  status: 'covered' | 'partial' | 'missing'
}

/**
 * Test Coverage Reporter class
 */
export class CoverageReporter {
  private expectedEndpoints: string[] = [
    'GET /api/health',
    'GET /api/profile',
    'GET /api/services',
    'POST /api/services',
    'PUT /api/services/:id',
    'DELETE /api/services/:id',
    'GET /api/staff',
    'POST /api/staff',
    'PUT /api/staff/:id',
    'DELETE /api/staff/:id',
    'GET /api/customers',
    'POST /api/customers',
    'PUT /api/customers/:id',
    'DELETE /api/customers/:id',
    'GET /api/appointments',
    'POST /api/appointments',
    'PUT /api/appointments/:id',
    'DELETE /api/appointments/:id',
    'GET /api/inventory',
    'POST /api/inventory',
    'PUT /api/inventory/:id',
    'DELETE /api/inventory/:id',
    'GET /api/analytics',
    'GET /api/pos/sales',
    'POST /api/pos/sales',
    'GET /api/marketing/campaigns',
    'POST /api/marketing/campaigns',
    'PUT /api/marketing/campaigns/:id',
    'GET /api/loyalty/entries',
    'POST /api/loyalty/entries',
    'POST /api/chat',
    'GET /api/csv-export/:type'
  ]

  private expectedFeatures: FeatureCoverage[] = [
    {
      feature: 'User Authentication',
      module: 'auth',
      tested: false,
      testCount: 0,
      criticalPath: true,
      status: 'missing'
    },
    {
      feature: 'POS Transactions',
      module: 'pos',
      tested: false,
      testCount: 0,
      criticalPath: true,
      status: 'missing'
    },
    {
      feature: 'Inventory Management',
      module: 'inventory',
      tested: false,
      testCount: 0,
      criticalPath: true,
      status: 'missing'
    },
    {
      feature: 'Staff Scheduling',
      module: 'scheduling',
      tested: false,
      testCount: 0,
      criticalPath: true,
      status: 'missing'
    },
    {
      feature: 'Customer Management',
      module: 'customers',
      tested: false,
      testCount: 0,
      criticalPath: true,
      status: 'missing'
    },
    {
      feature: 'Marketing Campaigns',
      module: 'marketing',
      tested: false,
      testCount: 0,
      criticalPath: false,
      status: 'missing'
    },
    {
      feature: 'Loyalty Program',
      module: 'loyalty',
      tested: false,
      testCount: 0,
      criticalPath: false,
      status: 'missing'
    },
    {
      feature: 'Analytics Dashboard',
      module: 'analytics',
      tested: false,
      testCount: 0,
      criticalPath: false,
      status: 'missing'
    },
    {
      feature: 'AI Chat Assistant',
      module: 'chat',
      tested: false,
      testCount: 0,
      criticalPath: false,
      status: 'missing'
    },
    {
      feature: 'Data Export',
      module: 'export',
      tested: false,
      testCount: 0,
      criticalPath: false,
      status: 'missing'
    }
  ]

  /**
   * Generate comprehensive coverage report from test results
   */
  generateCoverageReport(testReport: TestReport): CoverageReport {
    const overallCoverage = this.calculateOverallCoverage(testReport)
    const suiteTypeCoverage = this.calculateSuiteTypeCoverage(testReport)
    const endpointCoverage = this.calculateEndpointCoverage(testReport)
    const featureCoverage = this.calculateFeatureCoverage(testReport)
    const recommendations = this.generateCoverageRecommendations(
      overallCoverage,
      suiteTypeCoverage,
      endpointCoverage,
      featureCoverage
    )

    return {
      timestamp: new Date().toISOString(),
      overallCoverage,
      suiteTypeCoverage,
      endpointCoverage,
      featureCoverage,
      recommendations
    }
  }

  /**
   * Calculate overall coverage metrics
   */
  private calculateOverallCoverage(testReport: TestReport): CoverageMetrics {
    const totalTests = testReport.summary.totalTests
    const executedTests = testReport.summary.totalTests // All reported tests were executed
    const passedTests = testReport.summary.passed
    const failedTests = testReport.summary.failed
    const skippedTests = testReport.summary.skipped

    const executionRate = totalTests > 0 ? (executedTests / totalTests) * 100 : 0
    const passRate = executedTests > 0 ? (passedTests / executedTests) * 100 : 0
    const overallScore = executionRate * 0.3 + passRate * 0.7 // Weighted score

    return {
      totalTests,
      executedTests,
      passedTests,
      failedTests,
      skippedTests,
      executionRate,
      passRate,
      overallScore
    }
  }

  /**
   * Calculate coverage by test suite type
   */
  private calculateSuiteTypeCoverage(testReport: TestReport): SuiteTypeCoverage[] {
    const expectedSuiteTypes = [
      { type: 'functional', expectedTests: 50 },
      { type: 'performance', expectedTests: 20 },
      { type: 'security', expectedTests: 15 },
      { type: 'deployment', expectedTests: 10 },
      { type: 'uat', expectedTests: 25 }
    ]

    return expectedSuiteTypes.map((expected) => {
      const suites = testReport.suiteResults.filter((s) => s.suiteType === expected.type)
      const totalTests = suites.reduce((sum, s) => sum + s.summary.totalTests, 0)
      const passedTests = suites.reduce((sum, s) => sum + s.summary.passed, 0)
      const failedTests = suites.reduce((sum, s) => sum + s.summary.failed, 0)
      const skippedTests = suites.reduce((sum, s) => sum + s.summary.skipped, 0)

      const executionRate =
        expected.expectedTests > 0 ? (totalTests / expected.expectedTests) * 100 : 0
      const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0
      const overallScore = Math.min(100, executionRate * 0.4 + passRate * 0.6)

      return {
        suiteType: expected.type,
        metrics: {
          totalTests,
          executedTests: totalTests,
          passedTests,
          failedTests,
          skippedTests,
          executionRate,
          passRate,
          overallScore
        },
        expectedTests: expected.expectedTests,
        actualTests: totalTests,
        coverageGap: Math.max(0, expected.expectedTests - totalTests)
      }
    })
  }

  /**
   * Calculate API endpoint coverage
   */
  private calculateEndpointCoverage(testReport: TestReport): EndpointCoverage[] {
    // Extract tested endpoints from test names
    const testedEndpoints = new Set<string>()

    testReport.suiteResults.forEach((suite) => {
      suite.tests.forEach((test) => {
        // Parse endpoint information from test names
        if (test.testName.includes('endpoint') || test.testName.includes('api-')) {
          const endpointMatch = test.testName.match(/api-([a-z-]+)/)
          if (endpointMatch) {
            testedEndpoints.add(`GET /api/${endpointMatch[1].replace('-', '/')}`)
          }
        }

        // Check for specific endpoint patterns
        if (test.testName.includes('health')) testedEndpoints.add('GET /api/health')
        if (test.testName.includes('services')) testedEndpoints.add('GET /api/services')
        if (test.testName.includes('staff')) testedEndpoints.add('GET /api/staff')
        if (test.testName.includes('appointments')) testedEndpoints.add('GET /api/appointments')
        if (test.testName.includes('inventory')) testedEndpoints.add('GET /api/inventory')
        if (test.testName.includes('analytics')) testedEndpoints.add('GET /api/analytics')
        if (test.testName.includes('pos')) testedEndpoints.add('GET /api/pos/sales')
        if (test.testName.includes('marketing')) testedEndpoints.add('GET /api/marketing/campaigns')
        if (test.testName.includes('loyalty')) testedEndpoints.add('GET /api/loyalty/entries')
        if (test.testName.includes('chat')) testedEndpoints.add('POST /api/chat')
        if (test.testName.includes('csv-export')) testedEndpoints.add('GET /api/csv-export/:type')
      })
    })

    return this.expectedEndpoints.map((endpoint) => {
      const [method, path] = endpoint.split(' ')
      const tested = testedEndpoints.has(endpoint)
      const testCount = tested ? 1 : 0 // Simplified - could be more sophisticated

      let status: 'covered' | 'partial' | 'missing'
      if (tested) {
        status = 'covered'
      } else if (
        endpoint.includes('POST') ||
        endpoint.includes('PUT') ||
        endpoint.includes('DELETE')
      ) {
        // Write operations might be partially covered by read operations
        const readEndpoint = endpoint.replace(/POST|PUT|DELETE/, 'GET').replace('/:id', '')
        status = testedEndpoints.has(readEndpoint) ? 'partial' : 'missing'
      } else {
        status = 'missing'
      }

      return {
        endpoint: path,
        method,
        tested,
        testCount,
        lastTested: tested ? testReport.timestamp : undefined,
        status
      }
    })
  }

  /**
   * Calculate feature coverage
   */
  private calculateFeatureCoverage(testReport: TestReport): FeatureCoverage[] {
    return this.expectedFeatures.map((feature) => {
      let testCount = 0
      let tested = false

      // Count tests related to each feature
      testReport.suiteResults.forEach((suite) => {
        suite.tests.forEach((test) => {
          const testName = test.testName.toLowerCase()
          const featureName = feature.feature.toLowerCase()
          const moduleName = feature.module.toLowerCase()

          if (
            testName.includes(moduleName) ||
            testName.includes(featureName.replace(' ', '-')) ||
            testName.includes(featureName.replace(' ', '_'))
          ) {
            testCount++
            tested = true
          }
        })
      })

      let status: 'covered' | 'partial' | 'missing'
      if (testCount >= 3) {
        status = 'covered'
      } else if (testCount > 0) {
        status = 'partial'
      } else {
        status = 'missing'
      }

      return {
        ...feature,
        tested,
        testCount,
        status
      }
    })
  }

  /**
   * Generate coverage recommendations
   */
  private generateCoverageRecommendations(
    overall: CoverageMetrics,
    suiteTypes: SuiteTypeCoverage[],
    endpoints: EndpointCoverage[],
    features: FeatureCoverage[]
  ): string[] {
    const recommendations: string[] = []

    // Overall coverage recommendations
    if (overall.overallScore < 80) {
      recommendations.push(
        `Overall test coverage score is ${overall.overallScore.toFixed(1)}%. Aim for 80%+ before production deployment.`
      )
    }

    if (overall.passRate < 95) {
      recommendations.push(
        `Test pass rate is ${overall.passRate.toFixed(1)}%. Investigate and fix failing tests to achieve 95%+ pass rate.`
      )
    }

    // Suite type recommendations
    const missingSuites = suiteTypes.filter((s) => s.actualTests === 0)
    if (missingSuites.length > 0) {
      recommendations.push(
        `Missing test suites: ${missingSuites.map((s) => s.suiteType).join(', ')}. Consider implementing these test types.`
      )
    }

    const lowCoverageSuites = suiteTypes.filter(
      (s) => s.metrics.overallScore < 60 && s.actualTests > 0
    )
    if (lowCoverageSuites.length > 0) {
      recommendations.push(
        `Low coverage in: ${lowCoverageSuites.map((s) => s.suiteType).join(', ')}. Add more tests to improve coverage.`
      )
    }

    // Endpoint coverage recommendations
    const missingEndpoints = endpoints.filter((e) => e.status === 'missing')
    if (missingEndpoints.length > 0) {
      const criticalMissing = missingEndpoints.filter((e) => e.method === 'GET').slice(0, 5)
      if (criticalMissing.length > 0) {
        recommendations.push(
          `Missing API endpoint tests: ${criticalMissing.map((e) => `${e.method} ${e.endpoint}`).join(', ')}.`
        )
      }
    }

    // Feature coverage recommendations
    const criticalMissingFeatures = features.filter((f) => f.criticalPath && f.status === 'missing')
    if (criticalMissingFeatures.length > 0) {
      recommendations.push(
        `Critical features without tests: ${criticalMissingFeatures.map((f) => f.feature).join(', ')}. These are essential for production readiness.`
      )
    }

    const partialFeatures = features.filter((f) => f.status === 'partial')
    if (partialFeatures.length > 0) {
      recommendations.push(
        `Features with partial test coverage: ${partialFeatures.map((f) => f.feature).join(', ')}. Consider adding more comprehensive tests.`
      )
    }

    return recommendations
  }

  /**
   * Save coverage report to file
   */
  async saveCoverageReport(report: CoverageReport, outputDir: string): Promise<string> {
    fs.mkdirSync(outputDir, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filePath = path.join(outputDir, `coverage-report-${timestamp}.json`)

    fs.writeFileSync(filePath, JSON.stringify(report, null, 2))
    return filePath
  }

  /**
   * Generate coverage HTML report
   */
  generateCoverageHtml(report: CoverageReport): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Coverage Report - ${report.timestamp}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .section { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f9fafb; padding: 15px; border-radius: 6px; border-left: 4px solid #e5e7eb; }
        .metric-value { font-size: 1.5em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #6b7280; font-size: 0.9em; }
        .coverage-bar { background: #e5e7eb; height: 20px; border-radius: 10px; overflow: hidden; margin: 10px 0; }
        .coverage-fill { height: 100%; transition: width 0.3s ease; }
        .coverage-good { background: #22c55e; }
        .coverage-warning { background: #f59e0b; }
        .coverage-critical { background: #ef4444; }
        .status-covered { color: #22c55e; font-weight: bold; }
        .status-partial { color: #f59e0b; font-weight: bold; }
        .status-missing { color: #ef4444; font-weight: bold; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .table th { background: #f9fafb; font-weight: 600; }
        .recommendations { background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Test Coverage Report</h1>
            <p><strong>Generated:</strong> ${report.timestamp}</p>
            <p><strong>Overall Score:</strong> ${report.overallCoverage.overallScore.toFixed(1)}%</p>
        </div>

        <div class="section">
            <h2>Overall Coverage Metrics</h2>
            <div class="metric-grid">
                <div class="metric-card">
                    <div class="metric-value">${report.overallCoverage.executionRate.toFixed(1)}%</div>
                    <div class="metric-label">Test Execution Rate</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.overallCoverage.passRate.toFixed(1)}%</div>
                    <div class="metric-label">Test Pass Rate</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.overallCoverage.totalTests}</div>
                    <div class="metric-label">Total Tests</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.overallCoverage.passedTests}</div>
                    <div class="metric-label">Passed Tests</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Coverage by Test Suite Type</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>Suite Type</th>
                        <th>Tests</th>
                        <th>Expected</th>
                        <th>Coverage</th>
                        <th>Pass Rate</th>
                        <th>Score</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.suiteTypeCoverage
                      .map(
                        (suite) => `
                    <tr>
                        <td>${suite.suiteType}</td>
                        <td>${suite.actualTests}</td>
                        <td>${suite.expectedTests}</td>
                        <td>
                            <div class="coverage-bar">
                                <div class="coverage-fill ${suite.metrics.executionRate >= 80 ? 'coverage-good' : suite.metrics.executionRate >= 50 ? 'coverage-warning' : 'coverage-critical'}" 
                                     style="width: ${suite.metrics.executionRate}%"></div>
                            </div>
                            ${suite.metrics.executionRate.toFixed(1)}%
                        </td>
                        <td>${suite.metrics.passRate.toFixed(1)}%</td>
                        <td>${suite.metrics.overallScore.toFixed(1)}%</td>
                    </tr>
                    `
                      )
                      .join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>API Endpoint Coverage</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>Method</th>
                        <th>Endpoint</th>
                        <th>Status</th>
                        <th>Test Count</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.endpointCoverage
                      .map(
                        (endpoint) => `
                    <tr>
                        <td>${endpoint.method}</td>
                        <td>${endpoint.endpoint}</td>
                        <td class="status-${endpoint.status}">${endpoint.status.toUpperCase()}</td>
                        <td>${endpoint.testCount}</td>
                    </tr>
                    `
                      )
                      .join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>Feature Coverage</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>Feature</th>
                        <th>Module</th>
                        <th>Critical</th>
                        <th>Status</th>
                        <th>Test Count</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.featureCoverage
                      .map(
                        (feature) => `
                    <tr>
                        <td>${feature.feature}</td>
                        <td>${feature.module}</td>
                        <td>${feature.criticalPath ? 'Yes' : 'No'}</td>
                        <td class="status-${feature.status}">${feature.status.toUpperCase()}</td>
                        <td>${feature.testCount}</td>
                    </tr>
                    `
                      )
                      .join('')}
                </tbody>
            </table>
        </div>

        ${
          report.recommendations.length > 0
            ? `
        <div class="recommendations">
            <h3>Coverage Recommendations</h3>
            <ul>
                ${report.recommendations.map((rec) => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
        `
            : ''
        }
    </div>
</body>
</html>`
  }
}
