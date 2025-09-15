#!/usr/bin/env tsx
/**
 * Functional Tests Runner
 * Comprehensive functional testing suite for the Andreas Vibe platform
 */

import { FunctionalTestSuite } from '../test/functional/functional-test-suite.js';
import { 
  startTestServer, 
  TestHttpClient, 
  TestDataManager, 
  PerformanceMonitor 
} from '../test/utils/test-environment.js';
import { defaultTestConfig } from '../test/config/test-config.js';

async function main() {
  const args = process.argv.slice(2);
  const options = {
    apiOnly: args.includes('--api-only'),
    businessLogicOnly: args.includes('--business-logic-only'),
    uiOnly: args.includes('--ui-only'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    help: args.includes('--help') || args.includes('-h')
  };

  if (options.help) {
    console.log(`
Functional Tests Runner - Comprehensive testing for Andreas Vibe platform

Usage: npm run test:functional [options]

Options:
  --api-only              Run only API endpoint tests
  --business-logic-only   Run only business logic tests  
  --ui-only              Run only UI component tests
  -v, --verbose          Enable verbose output
  -h, --help             Show this help message

Examples:
  npm run test:functional                    # Run all functional tests
  npm run test:functional -- --api-only     # Run only API tests
  npm run test:functional -- --verbose      # Run with verbose output
`);
    return;
  }

  console.log('🚀 Starting Functional Test Suite');
  console.log('=================================');

  let testEnvironment;
  
  try {
    // Start test server
    console.log('📡 Starting test server...');
    testEnvironment = await startTestServer(defaultTestConfig);
    console.log(`✅ Test server running on port ${testEnvironment.port}`);

    // Initialize test utilities
    const httpClient = new TestHttpClient(testEnvironment.baseUrl);
    // Ensure protected endpoints work in tests by setting an auth token
    const adminToken = process.env.ADMIN_TOKEN || defaultTestConfig.server.env.ADMIN_TOKEN || (process.env.SMOKE_MODE ? 'smoke-test' : undefined);
    if (adminToken) {
      httpClient.setAuthToken(adminToken);
    }
    const performanceMonitor = new PerformanceMonitor();
    const dataManager = new TestDataManager(httpClient);

    // Create functional test suite
    const functionalSuite = new FunctionalTestSuite(
      httpClient,
      performanceMonitor,
      dataManager,
      testEnvironment
    );

    // Run tests based on options
    let result;
    
    if (options.apiOnly) {
      console.log('🎯 Running API tests only...');
      result = await functionalSuite.runApiTestsOnly();
    } else if (options.businessLogicOnly) {
      console.log('🎯 Running business logic tests only...');
      result = await functionalSuite.runBusinessLogicTestsOnly();
    } else if (options.uiOnly) {
      console.log('🎯 Running UI tests only...');
      result = await functionalSuite.runUITestsOnly();
    } else {
      console.log('🎯 Running all functional tests...');
      result = await functionalSuite.runAllTests();
    }

    // Generate detailed report if verbose
    if (options.verbose) {
      console.log('\n📋 Detailed Test Report:');
      console.log('========================');
      const detailedReport = functionalSuite.generateDetailedReport();
      console.log(JSON.stringify(detailedReport, null, 2));
    }

    // Exit with appropriate code
    if (result.success) {
      console.log('\n🎉 All functional tests completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Some functional tests failed.');
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Functional test execution failed:', error);
    process.exit(1);
  } finally {
    // Clean up test server
    if (testEnvironment) {
      console.log('🧹 Cleaning up test server...');
      await testEnvironment.cleanup();
    }
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Script execution failed:', error);
    process.exit(1);
  });
}

export { main };
