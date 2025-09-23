# Testing Framework API Reference

## Overview

This document provides a comprehensive API reference for the Andreas Vibe testing framework, including all classes, interfaces, and utility functions available for test development and execution.

## Core Classes

### TestReporter

The main class for collecting and generating test reports.

```typescript
class TestReporter {
  constructor(config: TestConfig)

  // Methods
  addSuiteResult(suiteResult: TestSuiteResult): void
  addPerformanceMetrics(metrics: PerformanceMetric[]): void
  generateReport(): TestReport
  saveReport(report: TestReport): Promise<string[]>
  getStartTime(): string
}
```

#### Usage Example

```typescript
import { TestReporter } from './test/reporting/test-reporter.js'
import { defaultTestConfig } from './test/config/test-config.js'

const reporter = new TestReporter(defaultTestConfig)

// Add test results
reporter.addSuiteResult(suiteResult)

// Generate and save report
const report = reporter.generateReport()
const savedFiles = await reporter.saveReport(report)
```

### TestDashboard

Real-time test execution monitoring and dashboard.

```typescript
class TestDashboard extends EventEmitter {
  constructor(config: TestConfig)

  // Methods
  startMonitoring(totalSuites: number, totalTests: number): void
  updateCurrentSuite(suiteName: string): void
  updateCurrentTest(testName: string): void
  recordTestCompletion(result: TestResult): void
  recordSuiteCompletion(suiteResult: TestSuiteResult): void
  completeMonitoring(finalReport: TestReport): void
  handleFailure(error: Error): void
  getState(): DashboardState
  getTrendData(): TrendData
  acknowledgeAlert(alertId: string): void
  saveDashboardState(outputDir: string): Promise<string>
}
```

#### Events

```typescript
// Dashboard events
dashboard.on('monitoring-started', (state: DashboardState) => {})
dashboard.on('suite-started', ({ suite, state }) => {})
dashboard.on('test-started', ({ test, state }) => {})
dashboard.on('test-completed', ({ result, state }) => {})
dashboard.on('suite-completed', ({ suite, state }) => {})
dashboard.on('monitoring-completed', ({ report, state }) => {})
dashboard.on('monitoring-failed', ({ error, state }) => {})
dashboard.on('alert-added', (alert: DashboardAlert) => {})
dashboard.on('alert-acknowledged', (alert: DashboardAlert) => {})
```

#### Usage Example

```typescript
import { TestDashboard } from './test/monitoring/test-dashboard.js'

const dashboard = new TestDashboard(config)

// Set up event listeners
dashboard.on('test-completed', ({ result, state }) => {
  console.log(`Test ${result.testName}: ${result.status}`)
})

// Start monitoring
dashboard.startMonitoring(5, 50)

// Update progress
dashboard.updateCurrentSuite('smoke-tests')
dashboard.recordTestCompletion(testResult)
```

### CoverageReporter

Test coverage analysis and reporting.

```typescript
class CoverageReporter {
  constructor()

  // Methods
  generateCoverageReport(testReport: TestReport): CoverageReport
  saveCoverageReport(report: CoverageReport, outputDir: string): Promise<string>
  generateCoverageHtml(report: CoverageReport): string
}
```

#### Usage Example

```typescript
import { CoverageReporter } from './test/reporting/coverage-reporter.js'

const coverageReporter = new CoverageReporter()
const coverageReport = coverageReporter.generateCoverageReport(testReport)
const filePath = await coverageReporter.saveCoverageReport(coverageReport, 'test-results')
```

### PerformanceVisualizer

Performance metrics visualization and analysis.

```typescript
class PerformanceVisualizer {
  constructor(thresholds?: any)

  // Methods
  generateVisualization(testReport: TestReport): PerformanceVisualization
  saveVisualization(visualization: PerformanceVisualization, outputDir: string): Promise<string>
}
```

### NotificationSystem

Automated notification system for test alerts.

```typescript
class NotificationSystem extends EventEmitter {
  constructor(config: NotificationConfig)

  // Methods
  processAlert(alert: DashboardAlert): void
  processTestFailure(result: TestResult): void
  processPerformanceBreach(
    metric: string,
    value: number,
    threshold: number,
    testName?: string
  ): void
  processErrorRateBreach(errorRate: number, threshold: number, totalTests: number): void
  processExecutionComplete(report: TestReport): void
  getNotifications(): Notification[]
  getNotificationsByType(type: string): Notification[]
  clearOldNotifications(olderThanHours?: number): void
  exportNotifications(outputDir: string): string
}
```

### TrendAnalyzer

Historical test data analysis and trend identification.

```typescript
class TrendAnalyzer {
  constructor(dataPath?: string, maxHistoryDays?: number)

  // Methods
  addReport(report: TestReport): Promise<void>
  analyzeTrends(period?: 'daily' | 'weekly' | 'monthly'): Promise<TrendAnalysis>
}
```

## Interfaces

### TestConfig

Main configuration interface for the testing framework.

```typescript
interface TestConfig {
  environment: 'local' | 'staging' | 'docker'
  testSuites: TestSuite[]
  thresholds: PerformanceThresholds
  security: SecurityConfig
  reporting: ReportingConfig
  server: ServerConfig
}
```

### TestResult

Represents the result of a single test execution.

```typescript
interface TestResult {
  suiteType: string
  testName: string
  status: 'pass' | 'fail' | 'skip'
  duration: number
  startTime: string
  endTime: string
  metrics?: PerformanceMetric
  errors?: TestError[]
  screenshots?: string[]
  metadata?: Record<string, any>
}
```

### TestSuiteResult

Represents the result of a test suite execution.

```typescript
interface TestSuiteResult {
  suiteName: string
  suiteType: string
  startTime: string
  endTime: string
  duration: number
  tests: TestResult[]
  summary: TestSummary
  config?: Record<string, any>
}
```

### TestReport

Comprehensive test execution report.

```typescript
interface TestReport {
  timestamp: string
  environment: string
  configuration: Partial<TestConfig>
  summary: TestSummary
  suiteResults: TestSuiteResult[]
  performanceMetrics?: PerformanceMetric[]
  recommendations: string[]
  readinessScore: number
  metadata: {
    nodeVersion: string
    platform: string
    arch: string
    totalMemory: number
  }
}
```

### PerformanceMetric

Performance measurement data.

```typescript
interface PerformanceMetric {
  timestamp: string
  duration: number
  memoryUsage: {
    heapUsed: number
    heapTotal: number
    external: number
    rss: number
  }
  cpuUsage: number
  metadata?: Record<string, any>
}
```

### DashboardState

Real-time dashboard state information.

```typescript
interface DashboardState {
  sessionId: string
  startTime: string
  status: 'idle' | 'running' | 'completed' | 'failed'
  currentSuite?: string
  currentTest?: string
  progress: ProgressMetrics
  realTimeMetrics: RealTimeMetrics
  alerts: DashboardAlert[]
  history: TestExecutionHistory[]
}
```

### CoverageReport

Test coverage analysis results.

```typescript
interface CoverageReport {
  timestamp: string
  overallCoverage: CoverageMetrics
  suiteTypeCoverage: SuiteTypeCoverage[]
  endpointCoverage: EndpointCoverage[]
  featureCoverage: FeatureCoverage[]
  recommendations: string[]
}
```

## Utility Functions

### Test Result Creation

```typescript
function createTestResult(
  suiteType: string,
  testName: string,
  status: 'pass' | 'fail' | 'skip',
  duration: number,
  options?: {
    startTime?: string
    endTime?: string
    metrics?: PerformanceMetric
    errors?: TestError[]
    screenshots?: string[]
    metadata?: Record<string, any>
  }
): TestResult
```

### Test Suite Result Creation

```typescript
function createTestSuiteResult(
  suiteName: string,
  suiteType: string,
  tests: TestResult[],
  options?: {
    startTime?: string
    endTime?: string
    config?: Record<string, any>
  }
): TestSuiteResult
```

### Configuration Loading

```typescript
function loadTestConfig(configPath?: string): TestConfig
function validateTestConfig(config: TestConfig): string[]
```

## Test Environment Utilities

### Environment Setup

```typescript
class TestEnvironment {
  static async setup(config: TestConfig): Promise<TestEnvironmentInfo>
  static async teardown(info: TestEnvironmentInfo): Promise<void>
  static async waitForServer(url: string, timeout: number): Promise<void>
  static async checkHealth(url: string): Promise<HealthStatus>
  static getAvailablePort(): Promise<number>
  static createTempDirectory(): string
  static cleanupTempFiles(): void
}
```

### Performance Monitoring

```typescript
class PerformanceMonitor {
  static startMonitoring(): PerformanceMonitor
  stopMonitoring(): PerformanceMetric
  getCurrentMetrics(): PerformanceMetric
  getAverageMetrics(): PerformanceMetric
}
```

## Test Orchestration

### Test Orchestrator

```typescript
class TestOrchestrator {
  constructor(config: TestConfig)

  // Methods
  async runTestSuite(suiteType: string): Promise<TestSuiteResult>
  async runAllSuites(): Promise<TestReport>
  async runSpecificTests(testNames: string[]): Promise<TestSuiteResult>
  getAvailableSuites(): TestSuite[]
  validateConfiguration(): string[]
}
```

### Test Runner

```typescript
class TestRunner {
  constructor(config: TestConfig)

  // Methods
  async runTest(testName: string, testFunction: () => Promise<void>): Promise<TestResult>
  async runTestWithRetries(
    testName: string,
    testFunction: () => Promise<void>,
    retries: number
  ): Promise<TestResult>
  setTimeout(timeout: number): void
  setRetries(retries: number): void
}
```

## Error Handling

### Test Errors

```typescript
interface TestError {
  message: string;
  stack?: string;
  code?: string;
  expected?: any;
  actual?: any;
}

class TestExecutionError extends Error {
  constructor(message: string, public testName: string, public suiteType: string)
}

class TestTimeoutError extends Error {
  constructor(message: string, public timeout: number)
}

class TestConfigurationError extends Error {
  constructor(message: string, public configPath?: string)
}
```

## Constants and Enums

### Test Status

```typescript
enum TestStatus {
  PASS = 'pass',
  FAIL = 'fail',
  SKIP = 'skip'
}
```

### Suite Types

```typescript
enum SuiteType {
  FUNCTIONAL = 'functional',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  DEPLOYMENT = 'deployment',
  UAT = 'uat'
}
```

### Alert Levels

```typescript
enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}
```

## Usage Examples

### Basic Test Execution

```typescript
import { TestOrchestrator, defaultTestConfig } from './test/'

async function runTests() {
  const orchestrator = new TestOrchestrator(defaultTestConfig)

  try {
    const report = await orchestrator.runAllSuites()
    console.log(`Tests completed: ${report.summary.passed}/${report.summary.totalTests} passed`)
    console.log(`Production readiness: ${report.readinessScore}%`)
  } catch (error) {
    console.error('Test execution failed:', error)
  }
}
```

### Custom Test Suite

```typescript
import { TestRunner, createTestResult } from './test/'

async function customTestSuite() {
  const runner = new TestRunner(config)
  const results: TestResult[] = []

  // Run individual tests
  const result1 = await runner.runTest('api-health-check', async () => {
    const response = await fetch('/api/health')
    if (!response.ok) throw new Error('Health check failed')
  })
  results.push(result1)

  // Create suite result
  const suiteResult = createTestSuiteResult('custom-suite', 'functional', results)
  return suiteResult
}
```

### Performance Monitoring

```typescript
import { PerformanceMonitor } from './test/utils/'

async function monitoredTest() {
  const monitor = PerformanceMonitor.startMonitoring()

  try {
    // Run test logic
    await performTestOperations()

    const metrics = monitor.stopMonitoring()
    console.log(`Test completed in ${metrics.duration}ms`)
    console.log(`Memory used: ${metrics.memoryUsage.heapUsed / 1024 / 1024}MB`)

    return createTestResult('performance', 'monitored-test', 'pass', metrics.duration, {
      metrics
    })
  } catch (error) {
    monitor.stopMonitoring()
    throw error
  }
}
```

### Real-time Dashboard

```typescript
import { TestDashboard } from './test/monitoring/'

async function runWithDashboard() {
  const dashboard = new TestDashboard(config)

  // Set up real-time monitoring
  dashboard.on('test-completed', ({ result }) => {
    console.log(`✓ ${result.testName} (${result.duration}ms)`)
  })

  dashboard.on('alert-added', (alert) => {
    if (alert.level === 'critical') {
      console.error(`🚨 ${alert.message}`)
    }
  })

  dashboard.startMonitoring(5, 50)

  // Run tests with dashboard monitoring
  const orchestrator = new TestOrchestrator(config)
  const report = await orchestrator.runAllSuites()

  dashboard.completeMonitoring(report)

  // Save dashboard state
  await dashboard.saveDashboardState('test-results')
}
```

### Coverage Analysis

```typescript
import { CoverageReporter } from './test/reporting/'

async function analyzeCoverage(testReport: TestReport) {
  const coverageReporter = new CoverageReporter()
  const coverageReport = coverageReporter.generateCoverageReport(testReport)

  console.log(`Overall coverage: ${coverageReport.overallCoverage.overallScore.toFixed(1)}%`)

  // Check for missing critical features
  const missingCritical = coverageReport.featureCoverage.filter(
    (f) => f.criticalPath && f.status === 'missing'
  )

  if (missingCritical.length > 0) {
    console.warn(
      'Missing critical feature tests:',
      missingCritical.map((f) => f.feature)
    )
  }

  // Save coverage report
  await coverageReporter.saveCoverageReport(coverageReport, 'test-results')
}
```

## Type Definitions

All TypeScript type definitions are available in the respective module files:

- `test/reporting/test-reporter.ts` - Core reporting types
- `test/config/test-config.ts` - Configuration types
- `test/monitoring/test-dashboard.ts` - Dashboard and monitoring types
- `test/utils/test-environment.ts` - Environment and utility types

## Migration Guide

### From v1.x to v2.x

```typescript
// Old API (v1.x)
const reporter = new TestReporter()
reporter.addResult(result)

// New API (v2.x)
const reporter = new TestReporter(config)
reporter.addSuiteResult(suiteResult)
```

### Configuration Changes

```typescript
// Old configuration format
const config = {
  timeout: 30000,
  retries: 2
}

// New configuration format
const config: TestConfig = {
  environment: 'local',
  testSuites: [
    {
      name: 'test-suite',
      type: 'functional',
      enabled: true,
      config: {
        timeout: 30000,
        retries: 2
      }
    }
  ]
  // ... other required fields
}
```
