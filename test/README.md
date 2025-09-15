# Comprehensive Testing Infrastructure

This directory contains the comprehensive testing infrastructure for the Andreas Vibe business management platform. The testing system provides automated validation of functionality, performance, security, and deployment readiness.

## Overview

The testing infrastructure consists of several key components:

- **Test Orchestrator**: Central coordination of all testing activities
- **Test Configuration**: Centralized configuration management for all test suites
- **Test Environment**: Utilities for managing test environments and server lifecycle
- **Test Reporting**: Comprehensive result aggregation and reporting system
- **CLI Interface**: Command-line interface for running tests

## Quick Start

### Run All Tests
```bash
npm run test:comprehensive
```

### Run Specific Test Suites
```bash
npm run test:comprehensive -- --suites smoke-tests,api-tests
```

### Run with Verbose Output
```bash
npm run test:comprehensive -- --verbose
```

### List Available Test Suites
```bash
npm run test:comprehensive -- --list
```

## Test Suites

### Functional Tests

#### Smoke Tests (`smoke-tests`)
- Basic functionality and health checks
- Core API endpoint validation
- Demo scenario functionality
- Error handling verification
- **Status**: Always enabled
- **Duration**: ~30 seconds

#### API Tests (`api-tests`)
- Comprehensive API endpoint testing
- Request/response validation
- Error scenario testing
- **Status**: Enabled by default
- **Duration**: ~2-3 minutes

#### E2E Tests (`e2e-tests`)
- End-to-end user workflow testing
- UI component integration
- Navigation and routing tests
- **Status**: Enabled by default
- **Duration**: ~5-10 minutes

### Performance Tests (`performance-tests`)
- Load testing and concurrent user simulation
- Response time and latency measurement
- Memory usage monitoring
- **Status**: Disabled by default (enable for pre-deployment validation)
- **Duration**: ~5-15 minutes

### Security Tests (`security-tests`)
- Authentication and session security
- Input validation and injection testing
- API security validation
- **Status**: Disabled by default (enable for security audits)
- **Duration**: ~3-5 minutes

## Configuration

### Default Configuration
The system uses sensible defaults defined in `test/config/test-config.ts`. No configuration file is required for basic usage.

### Custom Configuration
Create a custom configuration file based on `test/config/test-config.example.json`:

```bash
cp test/config/test-config.example.json test/config/my-config.json
# Edit my-config.json as needed
npm run test:comprehensive -- --config test/config/my-config.json
```

### Configuration Options

#### Performance Thresholds
- `maxResponseTime`: Maximum acceptable response time (default: 200ms)
- `maxMemoryUsage`: Maximum memory usage threshold (default: 512MB)
- `minConcurrentUsers`: Minimum concurrent users for load testing (default: 50)
- `maxErrorRate`: Maximum acceptable error rate percentage (default: 1%)

#### Reporting Options
- `outputDir`: Directory for test reports (default: "test-results")
- `formats`: Report formats - html, json, csv (default: ["html", "json"])
- `includeScreenshots`: Include screenshots in reports (default: true)
- `includeMetrics`: Include performance metrics (default: true)

## Reports

Test reports are generated in multiple formats:

### HTML Report
- Comprehensive visual report with charts and metrics
- Production readiness score
- Detailed test results and recommendations
- Performance metrics visualization

### JSON Report
- Machine-readable format for CI/CD integration
- Complete test data and metrics
- Suitable for further processing or analysis

### CSV Summary
- Tabular summary of test suite results
- Easy import into spreadsheet applications
- Quick overview of pass/fail rates

## CLI Options

```
Usage: npm run test:comprehensive [options]

Options:
  -c, --config <path>     Path to test configuration file
  -s, --suites <names>    Comma-separated list of test suites to run
  -v, --verbose           Enable verbose output
  -b, --bail              Stop on first test failure
  -p, --parallel          Run test suites in parallel (when safe)
  -l, --list              List available test suites
  -h, --help              Show help message
```

## Production Readiness Score

The system calculates a production readiness score (0-100) based on:

- **Test Pass Rate** (40% weight): Percentage of tests passing
- **Performance Metrics** (30% weight): Response times and resource usage
- **Critical Failures** (20% weight): Security and critical functionality failures
- **Test Coverage** (10% weight): Completeness of test suite execution

### Score Interpretation
- **90-100**: Ready for production deployment
- **70-89**: Suitable for staging, some issues to address
- **50-69**: Significant issues, not ready for deployment
- **0-49**: Major problems, requires immediate attention

## Integration with Existing Tests

The comprehensive testing infrastructure builds upon and enhances the existing test suite:

- **Smoke Tests**: Enhanced version of `scripts/smoke.ts` with additional coverage
- **E2E Tests**: Integrates with existing Puppeteer-based tests in `scripts/e2e.ts`
- **Navigation Tests**: Incorporates existing navigation testing from `scripts/nav-e2e.ts`

## Environment Variables

- `TEST_VERBOSE`: Enable verbose output for debugging
- `NODE_ENV`: Set to "production" for production-like testing
- `PORT`: Server port (set to 0 for ephemeral ports)
- `PORT_FILE`: File to write the server port to

## Troubleshooting

### Common Issues

#### Server Startup Timeout
If tests fail with server startup timeout:
- Increase `server.startupTimeoutMs` in configuration
- Check for port conflicts
- Verify the build completed successfully

#### Memory Issues
If tests fail with memory errors:
- Increase `thresholds.maxMemoryUsage` in configuration
- Run tests with more available system memory
- Check for memory leaks in application code

#### Performance Threshold Failures
If performance tests fail:
- Review `thresholds.maxResponseTime` setting
- Check system load during test execution
- Optimize slow API endpoints identified in reports

### Debug Mode
Run tests with verbose output for debugging:
```bash
TEST_VERBOSE=1 npm run test:comprehensive -- --verbose
```

## Contributing

When adding new test suites:

1. Create test functions in the appropriate orchestrator methods
2. Add suite configuration to `defaultTestConfig`
3. Update CLI help text and documentation
4. Add examples to this README

## Architecture

```
test/
├── cli/                    # Command-line interface
│   └── test-runner.ts     # Main CLI entry point
├── config/                # Configuration management
│   ├── test-config.ts     # Configuration types and defaults
│   └── test-config.example.json
├── orchestrator/          # Test execution coordination
│   └── test-orchestrator.ts
├── reporting/             # Result aggregation and reporting
│   └── test-reporter.ts
├── utils/                 # Test utilities and helpers
│   └── test-environment.ts
└── README.md             # This file
```

The system is designed to be modular and extensible, allowing for easy addition of new test suites and reporting formats.