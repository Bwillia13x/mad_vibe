# Test Execution Guide

## Overview

This guide provides comprehensive instructions for executing tests in the Andreas Vibe business management platform. The testing framework supports multiple test types including functional, performance, security, deployment, and user acceptance testing.

## Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git for version control
- Docker (optional, for deployment testing)

### Basic Test Execution

```bash
# Run all tests
npm run test

# Run specific test suite
npm run test:smoke
npm run test:e2e
npm run test:performance
npm run test:security

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Test Suite Types

### 1. Smoke Tests

**Purpose**: Quick validation of core functionality
**Duration**: 30-60 seconds
**Frequency**: Every commit/PR

```bash
# Run smoke tests
npm run test:smoke

# Run smoke tests with performance metrics
npm run test:smoke -- --metrics

# Run smoke tests against specific environment
npm run test:smoke -- --env=staging
```

**What it tests**:
- API endpoint availability
- Basic functionality of all modules
- Database connectivity
- Authentication flow
- Error handling

### 2. Functional Tests

**Purpose**: Comprehensive feature validation
**Duration**: 5-15 minutes
**Frequency**: Daily builds

```bash
# Run all functional tests
npm run test:functional

# Run specific functional test categories
npm run test:functional:api
npm run test:functional:ui
npm run test:functional:business-logic
```

**What it tests**:
- API endpoint functionality
- Business logic calculations
- UI component behavior
- Data validation
- Integration between modules

### 3. Performance Tests

**Purpose**: Validate system performance under load
**Duration**: 10-30 minutes
**Frequency**: Weekly or before releases

```bash
# Run performance tests
npm run test:performance

# Run with custom load parameters
npm run test:performance -- --users=50 --duration=300

# Run specific performance test types
npm run test:performance:load
npm run test:performance:stress
npm run test:performance:memory
```

**What it tests**:
- Response time under load
- Memory usage patterns
- CPU utilization
- Concurrent user handling
- Database query performance

### 4. Security Tests

**Purpose**: Validate security measures and identify vulnerabilities
**Duration**: 5-20 minutes
**Frequency**: Weekly or before releases

```bash
# Run security tests
npm run test:security

# Run specific security test categories
npm run test:security:auth
npm run test:security:input-validation
npm run test:security:api-security
```

**What it tests**:
- Authentication and authorization
- Input validation and sanitization
- API security measures
- Session management
- CORS configuration

### 5. End-to-End (E2E) Tests

**Purpose**: Validate complete user workflows
**Duration**: 10-30 minutes
**Frequency**: Before releases

```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests with browser UI (non-headless)
npm run test:e2e -- --headed

# Run specific E2E test scenarios
npm run test:e2e:user-workflows
npm run test:e2e:accessibility
npm run test:e2e:browser-compatibility
```

**What it tests**:
- Complete user journeys
- Cross-browser compatibility
- Accessibility compliance
- Mobile responsiveness
- Integration workflows

## Configuration

### Test Configuration File

The main test configuration is located at `test/config/test-config.ts`:

```typescript
export const testConfig: TestConfig = {
  environment: 'local', // 'local' | 'staging' | 'docker'
  testSuites: [
    {
      name: 'smoke-tests',
      type: 'functional',
      enabled: true,
      config: {
        timeout: 30000,
        retries: 2
      }
    }
    // ... more suites
  ],
  thresholds: {
    maxResponseTime: 200, // milliseconds
    maxMemoryUsage: 512, // MB
    minConcurrentUsers: 50,
    maxErrorRate: 1 // percentage
  },
  reporting: {
    outputDir: 'test-results',
    formats: ['html', 'json'],
    includeScreenshots: true,
    includeMetrics: true
  }
};
```

### Environment Variables

```bash
# Server configuration
NODE_ENV=production
PORT=3000

# OpenAI configuration (for chat functionality)
OPENAI_API_KEY=your_api_key_here

# Database configuration (optional)
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Test-specific variables
TEST_TIMEOUT=30000
TEST_RETRIES=2
TEST_HEADLESS=true
```

### Custom Configuration

Create a custom configuration file:

```bash
# Copy example configuration
cp test/config/test-config.example.json test/config/test-config.json

# Edit configuration
nano test/config/test-config.json
```

## Test Execution Modes

### Local Development

```bash
# Start development server
npm run dev

# Run tests against local server
npm run test:local
```

### Staging Environment

```bash
# Configure staging environment
export TEST_BASE_URL=https://staging.example.com

# Run tests against staging
npm run test:staging
```

### Docker Environment

```bash
# Build and test in Docker
npm run test:docker

# Or manually
docker build -t andreas-vibe .
docker run -p 3000:3000 andreas-vibe
npm run test -- --baseUrl=http://localhost:3000
```

## Continuous Integration

### GitHub Actions

The project includes GitHub Actions workflows for automated testing:

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
```

### Local CI Simulation

```bash
# Run the same tests as CI
npm run test:ci

# Run tests with coverage reporting
npm run test:ci:coverage
```

## Test Data Management

### Demo Data

The platform includes preset demo scenarios:

- **Default**: Standard business operations
- **Busy Day**: High volume of transactions and appointments
- **Low Inventory**: Inventory shortage scenarios
- **Appointment Gaps**: Scheduling optimization scenarios

```bash
# Reset to default demo data
npm run demo:reset

# Load specific scenario
npm run demo:load -- --scenario=busy-day
```

### Test Data Cleanup

```bash
# Clean test artifacts
npm run test:clean

# Reset database to clean state
npm run db:reset

# Clear test results
rm -rf test-results/*
```

## Debugging Tests

### Debug Mode

```bash
# Run tests in debug mode
npm run test:debug

# Debug specific test
npm run test:debug -- --grep "specific test name"

# Debug with browser DevTools (E2E tests)
npm run test:e2e -- --headed --devtools
```

### Verbose Output

```bash
# Run with verbose logging
npm run test -- --verbose

# Run with trace logging
npm run test -- --trace
```

### Screenshots and Videos

E2E tests automatically capture screenshots on failure:

```bash
# Enable video recording
npm run test:e2e -- --video

# Custom screenshot directory
npm run test:e2e -- --screenshot-dir=./debug-screenshots
```

## Performance Optimization

### Parallel Execution

```bash
# Run tests in parallel
npm run test -- --parallel

# Specify number of workers
npm run test -- --workers=4
```

### Test Filtering

```bash
# Run only fast tests
npm run test -- --grep="@fast"

# Skip slow tests
npm run test -- --grep="@slow" --invert

# Run tests by tag
npm run test -- --grep="@smoke|@critical"
```

### Resource Management

```bash
# Limit memory usage
node --max-old-space-size=4096 npm run test

# Monitor resource usage
npm run test:monitor
```

## Best Practices

### Test Organization

1. **Group related tests** in the same file
2. **Use descriptive test names** that explain the expected behavior
3. **Keep tests independent** - each test should be able to run in isolation
4. **Use appropriate test types** - unit tests for logic, integration tests for APIs, E2E tests for workflows

### Test Data

1. **Use factories** for creating test data
2. **Clean up after tests** to prevent side effects
3. **Use realistic data** that represents actual usage
4. **Avoid hardcoded values** - use configuration or generators

### Performance

1. **Run fast tests first** in CI pipelines
2. **Use test parallelization** for large test suites
3. **Mock external dependencies** when appropriate
4. **Profile test execution** to identify bottlenecks

### Maintenance

1. **Review test results regularly** and address flaky tests
2. **Update tests when features change**
3. **Monitor test coverage** and add tests for uncovered code
4. **Document test scenarios** and expected outcomes

## Troubleshooting

See [Test Troubleshooting Guide](./test-troubleshooting-guide.md) for common issues and solutions.

## Reporting

Test results are automatically generated in multiple formats:

- **HTML Report**: `test-results/test-report-{timestamp}.html`
- **JSON Report**: `test-results/test-report-{timestamp}.json`
- **Coverage Report**: `test-results/coverage-report-{timestamp}.html`
- **Performance Report**: `test-results/performance-visualization-{timestamp}.json`

## Integration with Development Workflow

### Pre-commit Hooks

```bash
# Install pre-commit hooks
npm run prepare

# Run pre-commit checks manually
npm run pre-commit
```

### Code Quality Gates

The testing framework enforces quality gates:

- **Minimum test coverage**: 80%
- **Maximum test failure rate**: 5%
- **Performance thresholds**: Response time < 200ms
- **Security compliance**: No high/critical vulnerabilities

### Release Readiness

Before releasing to production:

1. All test suites must pass
2. Performance benchmarks must be met
3. Security tests must show no critical issues
4. E2E tests must validate all user workflows
5. Production readiness score must be ≥ 90%

## Support and Resources

- **Documentation**: `/test/docs/`
- **Configuration Examples**: `/test/config/`
- **Troubleshooting**: `/test/docs/test-troubleshooting-guide.md`
- **API Reference**: `/test/docs/api-reference.md`
- **Contributing**: `/test/docs/contributing-to-tests.md`