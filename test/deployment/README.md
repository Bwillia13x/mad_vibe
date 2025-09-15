# Deployment and Infrastructure Testing Framework

This directory contains comprehensive testing frameworks for deployment and infrastructure validation of the Andreas Vibe business management platform.

## Overview

The deployment testing framework ensures that the platform is ready for production deployment by validating:

- **Docker Deployment**: Container build, startup, environment configuration, and networking
- **Database Connectivity**: In-memory storage, PostgreSQL connectivity, and data persistence
- **Health Monitoring**: Health endpoint functionality, monitoring systems, and alerting mechanisms

## Test Suites

### 1. Docker Deployment Tests (`docker-deployment-tests.ts`)

Tests Docker containerization and deployment scenarios:

- **Container Build Validation**: Verifies Docker image builds successfully
- **Container Startup**: Tests container startup with various configurations
- **Environment Configuration**: Validates environment variable handling
- **Port Binding and Networking**: Tests port allocation and network connectivity
- **Resource Limits**: Validates memory and CPU constraints
- **Container Cleanup**: Tests graceful shutdown and cleanup procedures

### 2. Database Connectivity Tests (`database-connectivity-tests.ts`)

Tests database connectivity and data operations:

- **In-Memory Storage**: Validates default in-memory storage functionality
- **PostgreSQL Connectivity**: Tests PostgreSQL database connections (if available)
- **Data Persistence**: Validates CRUD operations and data integrity
- **Migration and Schema**: Tests database schema and migration procedures
- **Connection Pooling**: Tests concurrent database access
- **Backup and Restore**: Validates data backup and restore procedures
- **Error Handling**: Tests database error scenarios and recovery

### 3. Health Monitoring Tests (`health-monitoring-tests.ts`)

Tests health monitoring and alerting systems:

- **Health Endpoint Comprehensive**: Validates health endpoint functionality
- **Performance Testing**: Tests health endpoint response times and reliability
- **Load Testing**: Validates health monitoring under system load
- **Status Validation**: Tests health status in different scenarios
- **Alerting Mechanisms**: Tests monitoring alerts and notifications
- **Failure Scenarios**: Tests health endpoint during system failures
- **Monitoring Integration**: Tests integration with external monitoring systems

## Usage

### Running All Deployment Tests

```bash
npm run test:deployment
```

### Running Specific Test Suites

```bash
# Docker tests only
npm run test:deployment -- --suite docker

# Database tests only
npm run test:deployment -- --suite database

# Health monitoring tests only
npm run test:deployment -- --suite health
```

### Advanced Options

```bash
# Verbose output
npm run test:deployment -- --verbose

# Generate JSON report
npm run test:deployment -- --format json

# Save HTML report
npm run test:deployment -- --output deployment-report.html

# Combine options
npm run test:deployment -- --suite docker --verbose --output docker-report.html
```

## Test Configuration

Tests use the configuration from `test/config/test-config.ts`. Key configuration options:

```typescript
{
  server: {
    startupTimeoutMs: 30000,
    portFile: '.local/test_port',
    env: {
      NODE_ENV: 'test'
    }
  },
  deployment: {
    docker: {
      imageName: 'andreas-vibe-test',
      buildTimeout: 300000
    },
    database: {
      testConnectionString: process.env.TEST_DATABASE_URL
    }
  }
}
```

## Environment Variables

The following environment variables affect deployment testing:

- `DATABASE_URL` or `TEST_DATABASE_URL`: PostgreSQL connection string for database tests
- `TEST_VERBOSE`: Enable verbose test output
- `DOCKER_HOST`: Docker daemon connection (for Docker tests)

## Prerequisites

### For Docker Tests

- Docker installed and running
- Sufficient disk space for image builds
- Network access for container operations

### For Database Tests

- PostgreSQL database (optional, tests will skip if not available)
- Valid connection string in environment variables
- Database permissions for test operations

### For Health Monitoring Tests

- Built application (`npm run build`)
- Available ports for test servers
- Network access for health checks

## Test Results and Reporting

### Console Output

Tests provide real-time console output with:
- Test progress indicators
- Individual test results (✅/❌)
- Performance metrics
- Error details for failed tests
- Summary statistics

### JSON Reports

Generate machine-readable test results:

```bash
npm run test:deployment -- --format json --output results.json
```

### HTML Reports

Generate detailed HTML reports with:
- Test execution timeline
- Performance charts
- Error details and stack traces
- Deployment readiness assessment

```bash
npm run test:deployment -- --format html --output report.html
```

## Deployment Readiness Assessment

The framework generates a deployment readiness report that includes:

- **Readiness Score**: Percentage of tests passed (90%+ required for production)
- **Critical Issues**: Failed tests that block deployment
- **Recommendations**: Specific actions to address issues
- **Performance Metrics**: Response times and resource usage

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Deployment Tests
on: [push, pull_request]

jobs:
  deployment-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run deployment tests
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/test
        run: npm run test:deployment -- --format json --output deployment-results.json
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: deployment-test-results
          path: deployment-results.json
```

## Troubleshooting

### Common Issues

1. **Docker Tests Failing**
   - Ensure Docker is running: `docker info`
   - Check disk space: `docker system df`
   - Verify image build: `docker build -t andreas-vibe-test .`

2. **Database Tests Failing**
   - Verify connection string: `psql $DATABASE_URL -c "SELECT 1"`
   - Check database permissions
   - Ensure database is accessible from test environment

3. **Health Tests Failing**
   - Verify application builds: `npm run build`
   - Check port availability: `netstat -tulpn | grep :5000`
   - Review server logs for startup errors

4. **Performance Issues**
   - Increase timeout values in test configuration
   - Check system resources during test execution
   - Consider running tests on more powerful hardware

### Debug Mode

Enable verbose logging for detailed troubleshooting:

```bash
TEST_VERBOSE=true npm run test:deployment -- --verbose
```

## Contributing

When adding new deployment tests:

1. Follow the existing test structure and naming conventions
2. Include comprehensive error handling and cleanup
3. Add appropriate timeout values for async operations
4. Document test purpose and expected behavior
5. Update this README with new test descriptions

## Security Considerations

- Tests may create temporary containers and processes
- Database tests may create temporary data
- Ensure test environments are isolated from production
- Review test logs for sensitive information before sharing
- Use test-specific credentials and connection strings