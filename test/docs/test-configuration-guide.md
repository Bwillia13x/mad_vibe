# Test Configuration Guide

## Overview

This guide explains how to configure and customize the testing framework for the Andreas Vibe platform. The framework supports extensive configuration options for different environments, test types, and execution scenarios.

## Configuration Structure

### Main Configuration File

The primary configuration is located at `test/config/test-config.ts`:

```typescript
export interface TestConfig {
  environment: 'local' | 'staging' | 'docker'
  testSuites: TestSuite[]
  thresholds: PerformanceThresholds
  security: SecurityConfig
  reporting: ReportingConfig
  server: ServerConfig
}
```

### Configuration Hierarchy

1. **Default Configuration**: Built-in defaults in `test-config.ts`
2. **Environment Variables**: Override via environment variables
3. **Custom Config File**: Optional `test-config.json` for project-specific settings
4. **Command Line Arguments**: Runtime overrides via CLI flags

## Environment Configuration

### Local Development

```typescript
const localConfig: TestConfig = {
  environment: 'local',
  server: {
    startupTimeoutMs: 20000,
    portFile: '.local/test_port',
    baseUrl: 'http://localhost:3000',
    env: {
      NODE_ENV: 'production'
    }
  },
  thresholds: {
    maxResponseTime: 200,
    maxMemoryUsage: 512,
    minConcurrentUsers: 50,
    maxErrorRate: 1
  }
}
```

### Staging Environment

```typescript
const stagingConfig: TestConfig = {
  environment: 'staging',
  server: {
    startupTimeoutMs: 30000,
    baseUrl: 'https://staging.example.com',
    env: {
      NODE_ENV: 'production'
    }
  },
  thresholds: {
    maxResponseTime: 300,
    maxMemoryUsage: 1024,
    minConcurrentUsers: 100,
    maxErrorRate: 0.5
  }
}
```

### Docker Environment

```typescript
const dockerConfig: TestConfig = {
  environment: 'docker',
  server: {
    startupTimeoutMs: 45000,
    baseUrl: 'http://localhost:3000',
    env: {
      NODE_ENV: 'production',
      DOCKER_ENV: 'true'
    }
  },
  thresholds: {
    maxResponseTime: 400,
    maxMemoryUsage: 2048,
    minConcurrentUsers: 25,
    maxErrorRate: 2
  }
}
```

## Test Suite Configuration

### Functional Tests

```typescript
{
  name: 'smoke-tests',
  type: 'functional',
  enabled: true,
  config: {
    timeout: 30000,
    retries: 2,
    parallel: false,
    tags: ['smoke', 'critical'],
    endpoints: [
      '/api/health',
      '/api/services',
      '/api/staff',
      '/api/appointments'
    ]
  }
}
```

### Performance Tests

```typescript
{
  name: 'performance-tests',
  type: 'performance',
  enabled: true,
  config: {
    duration: 60000,        // Test duration in ms
    concurrency: 10,        // Initial concurrent users
    maxConcurrentUsers: 50, // Maximum concurrent users
    rampUpDuration: 30000,  // Time to reach max users
    scenarios: [
      {
        name: 'api-load-test',
        weight: 70,
        endpoints: ['/api/services', '/api/staff']
      },
      {
        name: 'ui-interaction-test',
        weight: 30,
        pages: ['/pos', '/inventory']
      }
    ]
  }
}
```

### Security Tests

```typescript
{
  name: 'security-tests',
  type: 'security',
  enabled: false, // Disabled by default
  config: {
    timeout: 30000,
    vulnerabilityScanning: true,
    inputValidationTests: true,
    authenticationTests: true,
    maxRiskLevel: 'medium',
    skipTests: ['sql-injection'], // Skip if not applicable
    customPayloads: [
      '<script>alert("xss")</script>',
      '../../etc/passwd',
      'DROP TABLE users;'
    ]
  }
}
```

### E2E Tests

```typescript
{
  name: 'e2e-tests',
  type: 'functional',
  enabled: true,
  config: {
    timeout: 60000,
    retries: 1,
    headless: true,
    browser: 'chromium', // 'chromium' | 'firefox' | 'webkit'
    viewport: { width: 1280, height: 720 },
    screenshots: {
      mode: 'only-on-failure',
      fullPage: true
    },
    video: {
      enabled: false,
      dir: 'test-results/videos'
    },
    scenarios: [
      'user-registration',
      'pos-transaction',
      'inventory-management',
      'appointment-booking'
    ]
  }
}
```

## Performance Thresholds

### Response Time Thresholds

```typescript
interface PerformanceThresholds {
  maxResponseTime: number // Global max response time (ms)
  endpointThresholds: {
    // Per-endpoint thresholds
    '/api/health': 50
    '/api/chat': 2000 // AI chat may be slower
    '/api/services': 100
    '/api/pos/sales': 150
  }
  percentileThresholds: {
    // Percentile-based thresholds
    p50: 100 // 50th percentile
    p95: 200 // 95th percentile
    p99: 500 // 99th percentile
  }
}
```

### Memory Thresholds

```typescript
interface MemoryThresholds {
  maxMemoryUsage: number // Peak memory usage (MB)
  memoryLeakThreshold: number // Memory increase over time (MB/min)
  gcPressureThreshold: number // GC frequency threshold
  heapUtilization: number // Max heap utilization (%)
}
```

### Concurrency Thresholds

```typescript
interface ConcurrencyThresholds {
  minConcurrentUsers: number // Minimum users to handle
  maxConcurrentUsers: number // Target maximum users
  errorRateThreshold: number // Max acceptable error rate (%)
  throughputThreshold: number // Min requests per second
}
```

## Security Configuration

### Authentication Testing

```typescript
interface SecurityConfig {
  enableVulnerabilityScanning: boolean
  enableInputValidationTests: boolean
  enableAuthenticationTests: boolean
  maxSecurityRiskLevel: 'low' | 'medium' | 'high' | 'critical'

  authentication: {
    testUsers: [
      { username: 'testuser1'; password: 'testpass1'; role: 'admin' },
      { username: 'testuser2'; password: 'testpass2'; role: 'user' }
    ]
    sessionTimeout: 3600000 // 1 hour
    maxLoginAttempts: 5
  }

  inputValidation: {
    testPayloads: string[]
    skipEndpoints: string[]
    customValidators: Record<string, (input: string) => boolean>
  }
}
```

### CORS Configuration

```typescript
interface CorsConfig {
  testOrigins: string[]
  allowedMethods: string[]
  allowedHeaders: string[]
  credentials: boolean
}
```

## Reporting Configuration

### Output Formats

```typescript
interface ReportingConfig {
  outputDir: string
  formats: ('html' | 'json' | 'csv' | 'junit')[]
  includeScreenshots: boolean
  includeMetrics: boolean

  html: {
    template: 'default' | 'detailed' | 'minimal'
    includeCharts: boolean
    includeTrends: boolean
  }

  json: {
    pretty: boolean
    includeRawData: boolean
  }

  notifications: {
    enabled: boolean
    channels: NotificationChannel[]
    rules: NotificationRule[]
  }
}
```

### Coverage Reporting

```typescript
interface CoverageConfig {
  enabled: boolean
  threshold: number // Minimum coverage percentage
  includeUntested: boolean // Include untested endpoints
  excludePatterns: string[] // Patterns to exclude

  endpoints: {
    trackCoverage: boolean
    expectedEndpoints: string[]
  }

  features: {
    trackCoverage: boolean
    criticalFeatures: string[]
  }
}
```

## Environment Variables

### Core Variables

```bash
# Environment selection
NODE_ENV=production
TEST_ENV=local

# Server configuration
PORT=3000
HOST=localhost

# Test execution
TEST_TIMEOUT=30000
TEST_RETRIES=2
TEST_PARALLEL=true
TEST_HEADLESS=true

# Performance testing
PERF_MAX_USERS=50
PERF_DURATION=60000
PERF_RAMP_UP=30000

# Security testing
SECURITY_TESTS_ENABLED=false
MAX_SECURITY_RISK=medium

# Reporting
REPORT_FORMAT=html,json
REPORT_DIR=test-results
INCLUDE_SCREENSHOTS=true
```

### API Configuration

```bash
# OpenAI (for chat functionality)
OPENAI_API_KEY=sk-...

# Database (optional)
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# External services
WEBHOOK_URL=https://hooks.example.com/test-results
NOTIFICATION_EMAIL=team@example.com
```

### CI/CD Variables

```bash
# CI environment detection
CI=true
GITHUB_ACTIONS=true

# Build information
BUILD_NUMBER=123
COMMIT_SHA=abc123
BRANCH_NAME=main

# Deployment
DEPLOY_ENV=staging
DEPLOY_URL=https://staging.example.com
```

## Custom Configuration Files

### JSON Configuration

Create `test/config/test-config.json`:

```json
{
  "environment": "local",
  "testSuites": [
    {
      "name": "custom-smoke-tests",
      "type": "functional",
      "enabled": true,
      "config": {
        "timeout": 45000,
        "retries": 3,
        "customEndpoints": ["/api/custom-endpoint"]
      }
    }
  ],
  "thresholds": {
    "maxResponseTime": 300,
    "maxMemoryUsage": 1024
  },
  "reporting": {
    "formats": ["html", "json", "junit"],
    "includeMetrics": true
  }
}
```

### Environment-Specific Configs

Create environment-specific configuration files:

```bash
# Development
test/config/test-config.development.json

# Staging
test/config/test-config.staging.json

# Production
test/config/test-config.production.json
```

## Dynamic Configuration

### Runtime Configuration

```typescript
// Load configuration at runtime
const config = loadTestConfig({
  environment: process.env.TEST_ENV || 'local',
  overrides: {
    thresholds: {
      maxResponseTime: parseInt(process.env.MAX_RESPONSE_TIME) || 200
    }
  }
})
```

### Command Line Overrides

```bash
# Override specific settings
npm run test -- --max-response-time=500 --max-memory=1024

# Override environment
npm run test -- --env=staging

# Override test suites
npm run test -- --suites=smoke,api --disable-security

# Override reporting
npm run test -- --format=json --no-screenshots
```

## Configuration Validation

### Schema Validation

```typescript
import Joi from 'joi'

const configSchema = Joi.object({
  environment: Joi.string().valid('local', 'staging', 'docker').required(),
  testSuites: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        type: Joi.string()
          .valid('functional', 'performance', 'security', 'deployment', 'uat')
          .required(),
        enabled: Joi.boolean().required(),
        config: Joi.object().required()
      })
    )
    .required(),
  thresholds: Joi.object({
    maxResponseTime: Joi.number().positive().required(),
    maxMemoryUsage: Joi.number().positive().required(),
    minConcurrentUsers: Joi.number().positive().required(),
    maxErrorRate: Joi.number().min(0).max(100).required()
  }).required()
})

// Validate configuration
const { error, value } = configSchema.validate(config)
if (error) {
  throw new Error(`Configuration validation failed: ${error.message}`)
}
```

### Configuration Testing

```bash
# Validate configuration
npm run test:config:validate

# Test configuration loading
npm run test:config:load

# Dry run with configuration
npm run test -- --dry-run --config=test-config.staging.json
```

## Best Practices

### Configuration Management

1. **Use environment variables** for sensitive data
2. **Version control configurations** but exclude secrets
3. **Document configuration changes** and their impact
4. **Test configurations** before deploying
5. **Use validation** to catch configuration errors early

### Environment Separation

1. **Separate configs** for each environment
2. **Use appropriate thresholds** for each environment
3. **Test environment parity** to ensure consistency
4. **Secure staging/production** configurations

### Performance Tuning

1. **Adjust thresholds** based on environment capabilities
2. **Monitor actual performance** and update thresholds accordingly
3. **Use realistic test data** that matches production patterns
4. **Consider network latency** in distributed environments

### Security Configuration

1. **Enable security tests** in staging/production pipelines
2. **Regularly update** security test payloads
3. **Configure appropriate risk levels** for different environments
4. **Test authentication flows** thoroughly

## Troubleshooting Configuration

### Common Issues

1. **Invalid JSON syntax** in configuration files
2. **Missing required fields** in configuration
3. **Incorrect data types** for configuration values
4. **Environment variable conflicts**

### Debugging Configuration

```bash
# Print effective configuration
npm run test:config:print

# Validate configuration syntax
npm run test:config:validate

# Test configuration loading
node -e "console.log(JSON.stringify(require('./test/config/test-config.ts').defaultTestConfig, null, 2))"
```

### Configuration Backup

```bash
# Backup current configuration
cp test/config/test-config.ts test/config/test-config.backup.ts

# Export environment-specific config
npm run test:config:export -- --env=staging > staging-config.json
```
