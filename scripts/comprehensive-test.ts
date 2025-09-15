/**
 * Comprehensive Test Runner Script
 * Entry point for running the comprehensive testing infrastructure
 */

import { main } from '../test/cli/test-runner.js';

// Run the test CLI
main().catch(error => {
  console.error('Comprehensive test execution failed:', error);
  process.exit(1);
});