#!/usr/bin/env tsx

import { startTestServer, TestHttpClient, TestDataManager } from '../test/utils/test-environment';
import { TestReporter } from '../test/reporting/test-reporter';
import { SecurityTestSuite } from '../test/security/security-test-suite';
import { loadTestConfig } from '../test/config/test-config';
import fs from 'fs';
import path from 'path';

async function runSecurityTests() {
  console.log('🔒 Starting Security Test Suite...\n');

  const config = loadTestConfig();
  const reporter = new TestReporter(config);
  
  let testEnv: any = null;

  try {
    // Initialize test environment
    testEnv = await startTestServer(config);
    console.log('✅ Test environment initialized');
    
    // Create test environment wrapper
    const testEnvWrapper = {
      baseUrl: testEnv.baseUrl,
      httpClient: new TestHttpClient(testEnv.baseUrl),
      dataManager: new TestDataManager(new TestHttpClient(testEnv.baseUrl)),
      makeRequest: (path: string, options?: RequestInit) => {
        return fetch(`${testEnv.baseUrl}${path}`, options);
      }
    };
    
    const securitySuite = new SecurityTestSuite(testEnvWrapper, reporter);

    // Run security tests
    const results = await securitySuite.runAllSecurityTests();

    // Generate and save report
    const report = await securitySuite.generateSecurityReport();
    
    // Ensure test-results directory exists
    const resultsDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(resultsDir, `security-report-${timestamp}.md`);
    fs.writeFileSync(reportPath, report);

    // Save JSON results
    const jsonPath = path.join(resultsDir, `security-results-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

    console.log(`\n📊 Security report saved to: ${reportPath}`);
    console.log(`📊 JSON results saved to: ${jsonPath}`);

    // Print summary
    console.log('\n🔒 Security Test Summary:');
    console.log(`   Total Tests: ${results.totalTests}`);
    console.log(`   Passed: ${results.passed}`);
    console.log(`   Failed: ${results.failed}`);
    console.log(`   Skipped: ${results.skipped}`);
    console.log(`   Critical Issues: ${results.summary.criticalIssues}`);
    console.log(`   Warnings: ${results.summary.warnings}`);

    if (results.summary.criticalIssues > 0) {
      console.log('\n🚨 Critical security issues detected!');
      console.log('   Review the security report for details.');
      process.exit(1);
    } else if (results.failed > 0) {
      console.log('\n⚠️  Some security tests failed.');
      console.log('   Review the security report for details.');
      process.exit(1);
    } else {
      console.log('\n✅ All security tests passed!');
      if (results.summary.warnings > 0) {
        console.log(`   Note: ${results.summary.warnings} warnings found - see report for recommendations.`);
      }
    }

  } catch (error) {
    console.error('❌ Security testing failed:', error);
    process.exit(1);
  } finally {
    // Cleanup test environment
    if (testEnv) {
      await testEnv.cleanup();
      console.log('🧹 Test environment cleaned up');
    }
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');

if (showHelp) {
  console.log(`
🔒 Security Test Suite

Usage: npm run test:security [options]

Options:
  --help, -h     Show this help message

This script runs comprehensive security tests including:
  - Authentication and session security testing
  - Input validation and injection prevention testing  
  - API security validation
  - Environment variable security testing
  - HTTP method security testing

The script will:
  1. Start a test server instance
  2. Run all security test categories
  3. Generate detailed reports in test-results/
  4. Exit with code 1 if critical issues are found

Reports are saved as both Markdown and JSON formats.
`);
  process.exit(0);
}

// Run the tests
runSecurityTests().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});