import { TestReporter } from '../reporting/test-reporter'

export interface TestEnvironment {
  baseUrl: string
  makeRequest: (path: string, options?: RequestInit) => Promise<Response>
}
import {
  AuthenticationSecurityTests,
  AuthenticationTestResult
} from './authentication-security-tests'
import { InputValidationTests, InputValidationTestResult } from './input-validation-tests'
import { APISecurityTests, APISecurityTestResult } from './api-security-tests'
import {
  EnvironmentSecurityTests,
  EnvironmentSecurityTestResult
} from './environment-security-tests'

export interface SecurityTestSuiteResult {
  suiteName: string
  startTime: string
  endTime: string
  duration: number
  totalTests: number
  passed: number
  failed: number
  skipped: number
  authenticationResults: AuthenticationTestResult[]
  inputValidationResults: InputValidationTestResult[]
  apiSecurityResults: APISecurityTestResult[]
  environmentSecurityResults: EnvironmentSecurityTestResult[]
  summary: {
    criticalIssues: number
    warnings: number
    recommendations: string[]
  }
}

export class SecurityTestSuite {
  private testEnv: TestEnvironment
  private reporter: TestReporter

  constructor(testEnv: TestEnvironment, reporter: TestReporter) {
    this.testEnv = testEnv
    this.reporter = reporter
  }

  async runAllSecurityTests(): Promise<SecurityTestSuiteResult> {
    const startTime = new Date()

    console.log('Starting comprehensive security test suite...')

    // Initialize test components
    const authTests = new AuthenticationSecurityTests(this.testEnv, this.reporter)
    const inputTests = new InputValidationTests(this.testEnv, this.reporter)
    const apiTests = new APISecurityTests(this.testEnv, this.reporter)
    const envTests = new EnvironmentSecurityTests(this.reporter)

    // Run all security test categories
    console.log('Running authentication and session security tests...')
    const authenticationResults = await authTests.runAllTests()

    console.log('Running input validation and injection tests...')
    const inputValidationResults = await inputTests.runAllTests()

    console.log('Running API security validation tests...')
    const apiSecurityResults = await apiTests.runAllTests()

    console.log('Running environment variable security tests...')
    const environmentSecurityResults = await envTests.runAllTests()

    const endTime = new Date()
    const duration = endTime.getTime() - startTime.getTime()

    // Aggregate results
    const allResults = [
      ...authenticationResults,
      ...inputValidationResults,
      ...apiSecurityResults,
      ...environmentSecurityResults
    ]

    const totalTests = allResults.length
    const passed = allResults.filter((r) => r.status === 'pass').length
    const failed = allResults.filter((r) => r.status === 'fail').length
    const skipped = allResults.filter((r) => r.status === 'skip').length

    // Analyze security issues
    const summary = this.analyzeSecurity(
      authenticationResults,
      inputValidationResults,
      apiSecurityResults,
      environmentSecurityResults
    )

    const result: SecurityTestSuiteResult = {
      suiteName: 'Security Test Suite',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      totalTests,
      passed,
      failed,
      skipped,
      authenticationResults,
      inputValidationResults,
      apiSecurityResults,
      environmentSecurityResults,
      summary
    }

    // Log summary
    console.log(`Security testing completed in ${duration}ms`)
    console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped`)

    if (summary.criticalIssues > 0) {
      console.error(`Critical security issues found: ${summary.criticalIssues}`)
    }

    if (summary.warnings > 0) {
      console.warn(`Security warnings: ${summary.warnings}`)
    }

    // Log recommendations
    if (summary.recommendations.length > 0) {
      console.log('Security recommendations:')
      summary.recommendations.forEach((rec) => console.log(`  - ${rec}`))
    }

    return result
  }

  private analyzeSecurity(
    authResults: AuthenticationTestResult[],
    inputResults: InputValidationTestResult[],
    apiResults: APISecurityTestResult[],
    envResults: EnvironmentSecurityTestResult[]
  ): SecurityTestSuiteResult['summary'] {
    let criticalIssues = 0
    let warnings = 0
    const recommendations: string[] = []

    // Analyze authentication security
    const authFailures = authResults.filter((r) => r.status === 'fail')
    if (authFailures.length > 0) {
      criticalIssues += authFailures.length
      recommendations.push('Fix authentication security failures before production deployment')
    }

    // Check for session security issues
    const sessionTest = authResults.find((r) => r.testName === 'Session Security Validation')
    if (sessionTest?.details?.securityHeaders) {
      const headers = sessionTest.details.securityHeaders
      if (!headers['x-content-type-options']) {
        warnings++
        recommendations.push('Add X-Content-Type-Options: nosniff header')
      }
      if (!headers['x-frame-options']) {
        warnings++
        recommendations.push('Add X-Frame-Options header to prevent clickjacking')
      }
      if (!headers['strict-transport-security']) {
        warnings++
        recommendations.push('Add Strict-Transport-Security header for HTTPS enforcement')
      }
    }

    // Analyze input validation
    const inputFailures = inputResults.filter((r) => r.status === 'fail')
    if (inputFailures.length > 0) {
      criticalIssues += inputFailures.length
      recommendations.push('Address input validation failures to prevent injection attacks')
    }

    // Check for XSS vulnerabilities
    const xssTest = inputResults.find((r) => r.testName === 'XSS Prevention Testing')
    if (xssTest?.details?.serverErrors && xssTest.details.serverErrors > 0) {
      criticalIssues++
      recommendations.push('Fix XSS vulnerabilities that cause server errors')
    }

    // Check for SQL injection vulnerabilities
    const sqlTest = inputResults.find((r) => r.testName === 'SQL Injection Prevention Testing')
    if (sqlTest?.details?.unsafeResponses && sqlTest.details.unsafeResponses > 0) {
      criticalIssues++
      recommendations.push('Address SQL injection vulnerabilities')
    }

    // Analyze API security
    const apiFailures = apiResults.filter((r) => r.status === 'fail')
    if (apiFailures.length > 0) {
      criticalIssues += apiFailures.length
      recommendations.push('Fix API security issues before production')
    }

    // Check for rate limiting
    const rateLimitTest = apiResults.find((r) => r.testName === 'Rate Limiting Validation')
    if (rateLimitTest?.details && !rateLimitTest.details.rateLimitedRequests) {
      warnings++
      recommendations.push('Implement rate limiting to prevent abuse')
    }

    // Check for environment variable exposure
    const envTest = apiResults.find((r) => r.testName === 'Environment Variable Security')
    if (envTest?.details?.unsafeTests && envTest.details.unsafeTests > 0) {
      criticalIssues++
      recommendations.push('Prevent environment variable exposure in API responses')
    }

    // Analyze environment security
    const envFailures = envResults.filter((r) => r.status === 'fail')
    if (envFailures.length > 0) {
      criticalIssues += envFailures.length
      recommendations.push('Fix environment variable security issues')
    }

    // Check for weak environment configurations
    const configTest = envResults.find((r) => r.testName === 'Configuration Security Audit')
    if (configTest?.details?.formatIssues && configTest.details.formatIssues > 0) {
      warnings++
      recommendations.push('Strengthen environment variable configurations')
    }

    // Check for security headers on API endpoints
    const endpointTest = apiResults.find((r) => r.testName === 'API Endpoint Security Validation')
    if (endpointTest?.details?.testResults) {
      const endpointsWithoutSecurityHeaders = endpointTest.details.testResults.filter(
        (r: any) => !r.hasSecurityHeaders
      )
      if (endpointsWithoutSecurityHeaders.length > 0) {
        warnings++
        recommendations.push('Add security headers to all API endpoints')
      }
    }

    // General recommendations based on platform analysis
    recommendations.push('Consider implementing Content Security Policy (CSP) headers')
    recommendations.push('Add request logging and monitoring for security events')
    recommendations.push('Implement proper error handling to prevent information disclosure')
    recommendations.push('Consider adding API authentication for sensitive endpoints')
    recommendations.push('Implement CORS policy appropriate for production environment')

    return {
      criticalIssues,
      warnings,
      recommendations: [...new Set(recommendations)] // Remove duplicates
    }
  }

  async generateSecurityReport(): Promise<string> {
    const results = await this.runAllSecurityTests()

    const report = `
# Security Test Report

**Generated:** ${results.endTime}
**Duration:** ${results.duration}ms
**Total Tests:** ${results.totalTests}

## Summary

- ✅ **Passed:** ${results.passed}
- ❌ **Failed:** ${results.failed}
- ⏭️ **Skipped:** ${results.skipped}
- 🚨 **Critical Issues:** ${results.summary.criticalIssues}
- ⚠️ **Warnings:** ${results.summary.warnings}

## Test Results

### Authentication & Session Security
${results.authenticationResults
  .map(
    (r) =>
      `- ${r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⏭️'} ${r.testName} (${r.duration}ms)`
  )
  .join('\n')}

### Input Validation & Injection Prevention
${results.inputValidationResults
  .map(
    (r) =>
      `- ${r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⏭️'} ${r.testName} (${r.duration}ms)`
  )
  .join('\n')}

### API Security Validation
${results.apiSecurityResults
  .map(
    (r) =>
      `- ${r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⏭️'} ${r.testName} (${r.duration}ms)`
  )
  .join('\n')}

### Environment Variable Security
${results.environmentSecurityResults
  .map(
    (r) =>
      `- ${r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⏭️'} ${r.testName} (${r.duration}ms)`
  )
  .join('\n')}

## Security Recommendations

${results.summary.recommendations.map((rec) => `- ${rec}`).join('\n')}

## Failed Tests Details

${[
  ...results.authenticationResults,
  ...results.inputValidationResults,
  ...results.apiSecurityResults,
  ...results.environmentSecurityResults
]
  .filter((r) => r.status === 'fail')
  .map((r) => `### ${r.testName}\n**Error:** ${r.error}\n`)
  .join('\n')}

---
*This report was generated by the Andreas Vibe Platform Security Test Suite*
`

    return report
  }
}
