/**
 * Test Execution Dashboard and Real-time Monitoring
 * Provides real-time monitoring of test execution with dashboard interface
 */

import fs from 'node:fs'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import type { TestResult, TestSuiteResult, TestReport } from '../reporting/test-reporter.js'
import type { TestConfig } from '../config/test-config.js'

export interface DashboardState {
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

export interface ProgressMetrics {
  totalSuites: number
  completedSuites: number
  totalTests: number
  completedTests: number
  passedTests: number
  failedTests: number
  skippedTests: number
  estimatedTimeRemaining: number // milliseconds
}

export interface RealTimeMetrics {
  currentResponseTime: number
  averageResponseTime: number
  currentMemoryUsage: number
  peakMemoryUsage: number
  currentCpuUsage: number
  testsPerSecond: number
  errorRate: number
}

export interface DashboardAlert {
  id: string
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'critical'
  category: 'performance' | 'failure' | 'system' | 'threshold'
  message: string
  details?: string
  acknowledged: boolean
}

export interface TestExecutionHistory {
  timestamp: string
  suite: string
  test: string
  status: 'pass' | 'fail' | 'skip'
  duration: number
  metrics?: {
    responseTime: number
    memoryUsage: number
    cpuUsage: number
  }
}

export interface TrendData {
  timestamps: string[]
  responseTime: number[]
  memoryUsage: number[]
  cpuUsage: number[]
  passRate: number[]
}

/**
 * Test Dashboard class for real-time monitoring
 */
export class TestDashboard extends EventEmitter {
  private state: DashboardState
  private config: TestConfig
  private startTime: number
  private lastUpdateTime: number
  private trendData: TrendData
  private alertCounter: number = 0

  constructor(config: TestConfig) {
    super()
    this.config = config
    this.startTime = Date.now()
    this.lastUpdateTime = this.startTime
    this.state = this.initializeState()
    this.trendData = this.initializeTrendData()
  }

  /**
   * Initialize dashboard state
   */
  private initializeState(): DashboardState {
    return {
      sessionId: this.generateSessionId(),
      startTime: new Date().toISOString(),
      status: 'idle',
      progress: {
        totalSuites: 0,
        completedSuites: 0,
        totalTests: 0,
        completedTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        estimatedTimeRemaining: 0
      },
      realTimeMetrics: {
        currentResponseTime: 0,
        averageResponseTime: 0,
        currentMemoryUsage: 0,
        peakMemoryUsage: 0,
        currentCpuUsage: 0,
        testsPerSecond: 0,
        errorRate: 0
      },
      alerts: [],
      history: []
    }
  }

  /**
   * Initialize trend data tracking
   */
  private initializeTrendData(): TrendData {
    return {
      timestamps: [],
      responseTime: [],
      memoryUsage: [],
      cpuUsage: [],
      passRate: []
    }
  }

  /**
   * Start test execution monitoring
   */
  startMonitoring(totalSuites: number, totalTests: number): void {
    this.state.status = 'running'
    this.state.progress.totalSuites = totalSuites
    this.state.progress.totalTests = totalTests
    this.startTime = Date.now()

    this.addAlert(
      'info',
      'system',
      `Test execution started with ${totalTests} tests across ${totalSuites} suites`
    )
    this.emit('monitoring-started', this.state)
  }

  /**
   * Update current suite being executed
   */
  updateCurrentSuite(suiteName: string): void {
    this.state.currentSuite = suiteName
    this.addAlert('info', 'system', `Starting test suite: ${suiteName}`)
    this.emit('suite-started', { suite: suiteName, state: this.state })
  }

  /**
   * Update current test being executed
   */
  updateCurrentTest(testName: string): void {
    this.state.currentTest = testName
    this.emit('test-started', { test: testName, state: this.state })
  }

  /**
   * Record test completion
   */
  recordTestCompletion(result: TestResult): void {
    this.state.progress.completedTests++

    switch (result.status) {
      case 'pass':
        this.state.progress.passedTests++
        break
      case 'fail':
        this.state.progress.failedTests++
        this.addAlert(
          'error',
          'failure',
          `Test failed: ${result.testName}`,
          result.errors?.[0]?.message
        )
        break
      case 'skip':
        this.state.progress.skippedTests++
        break
    }

    // Update real-time metrics
    if (result.metrics) {
      this.updateRealTimeMetrics(result)
    }

    // Add to history
    this.addToHistory(result)

    // Update trend data
    this.updateTrendData()

    // Check for alerts
    this.checkThresholds(result)

    // Update estimated time remaining
    this.updateTimeEstimate()

    this.emit('test-completed', { result, state: this.state })
  }

  /**
   * Record suite completion
   */
  recordSuiteCompletion(suiteResult: TestSuiteResult): void {
    this.state.progress.completedSuites++

    const passRate =
      suiteResult.summary.totalTests > 0
        ? (suiteResult.summary.passed / suiteResult.summary.totalTests) * 100
        : 100

    if (passRate < 90) {
      this.addAlert(
        'warning',
        'failure',
        `Suite ${suiteResult.suiteName} has low pass rate: ${passRate.toFixed(1)}%`
      )
    }

    this.emit('suite-completed', { suite: suiteResult, state: this.state })
  }

  /**
   * Complete monitoring session
   */
  completeMonitoring(finalReport: TestReport): void {
    this.state.status = 'completed'
    this.state.currentSuite = undefined
    this.state.currentTest = undefined

    const duration = Date.now() - this.startTime
    const passRate = finalReport.summary.passRate

    if (passRate >= 95) {
      this.addAlert(
        'info',
        'system',
        `Test execution completed successfully in ${(duration / 1000).toFixed(1)}s`
      )
    } else if (passRate >= 80) {
      this.addAlert(
        'warning',
        'system',
        `Test execution completed with warnings in ${(duration / 1000).toFixed(1)}s`
      )
    } else {
      this.addAlert(
        'error',
        'system',
        `Test execution completed with failures in ${(duration / 1000).toFixed(1)}s`
      )
    }

    this.emit('monitoring-completed', { report: finalReport, state: this.state })
  }

  /**
   * Handle monitoring failure
   */
  handleFailure(error: Error): void {
    this.state.status = 'failed'
    this.addAlert('critical', 'system', `Test execution failed: ${error.message}`, error.stack)
    this.emit('monitoring-failed', { error, state: this.state })
  }

  /**
   * Update real-time metrics from test result
   */
  private updateRealTimeMetrics(result: TestResult): void {
    if (!result.metrics) return

    const metrics = this.state.realTimeMetrics

    // Update response time
    metrics.currentResponseTime = result.duration
    const totalTests = this.state.progress.completedTests
    metrics.averageResponseTime =
      (metrics.averageResponseTime * (totalTests - 1) + result.duration) / totalTests

    // Update memory usage
    metrics.currentMemoryUsage = result.metrics.memoryUsage.heapUsed / (1024 * 1024) // MB
    metrics.peakMemoryUsage = Math.max(metrics.peakMemoryUsage, metrics.currentMemoryUsage)

    // Update CPU usage
    metrics.currentCpuUsage = result.metrics.cpuUsage

    // Calculate tests per second
    const elapsedSeconds = (Date.now() - this.startTime) / 1000
    metrics.testsPerSecond = totalTests / elapsedSeconds

    // Calculate error rate
    metrics.errorRate = (this.state.progress.failedTests / totalTests) * 100
  }

  /**
   * Add test result to execution history
   */
  private addToHistory(result: TestResult): void {
    const historyEntry: TestExecutionHistory = {
      timestamp: new Date().toISOString(),
      suite: this.state.currentSuite || 'unknown',
      test: result.testName,
      status: result.status,
      duration: result.duration,
      metrics: result.metrics
        ? {
            responseTime: result.duration,
            memoryUsage: result.metrics.memoryUsage.heapUsed / (1024 * 1024),
            cpuUsage: result.metrics.cpuUsage
          }
        : undefined
    }

    this.state.history.push(historyEntry)

    // Keep only last 100 entries for performance
    if (this.state.history.length > 100) {
      this.state.history = this.state.history.slice(-100)
    }
  }

  /**
   * Update trend data for visualization
   */
  private updateTrendData(): void {
    const now = new Date().toISOString()
    const metrics = this.state.realTimeMetrics
    const progress = this.state.progress

    this.trendData.timestamps.push(now)
    this.trendData.responseTime.push(metrics.currentResponseTime)
    this.trendData.memoryUsage.push(metrics.currentMemoryUsage)
    this.trendData.cpuUsage.push(metrics.currentCpuUsage)

    const currentPassRate =
      progress.completedTests > 0 ? (progress.passedTests / progress.completedTests) * 100 : 100
    this.trendData.passRate.push(currentPassRate)

    // Keep only last 50 data points
    const maxPoints = 50
    if (this.trendData.timestamps.length > maxPoints) {
      this.trendData.timestamps = this.trendData.timestamps.slice(-maxPoints)
      this.trendData.responseTime = this.trendData.responseTime.slice(-maxPoints)
      this.trendData.memoryUsage = this.trendData.memoryUsage.slice(-maxPoints)
      this.trendData.cpuUsage = this.trendData.cpuUsage.slice(-maxPoints)
      this.trendData.passRate = this.trendData.passRate.slice(-maxPoints)
    }
  }

  /**
   * Check performance thresholds and generate alerts
   */
  private checkThresholds(result: TestResult): void {
    if (!result.metrics) return

    const thresholds = this.config.thresholds

    // Response time threshold
    if (result.duration > thresholds.maxResponseTime * 2) {
      this.addAlert(
        'critical',
        'performance',
        `Test ${result.testName} exceeded critical response time: ${result.duration}ms`
      )
    } else if (result.duration > thresholds.maxResponseTime) {
      this.addAlert(
        'warning',
        'performance',
        `Test ${result.testName} exceeded response time threshold: ${result.duration}ms`
      )
    }

    // Memory usage threshold
    const memoryMB = result.metrics.memoryUsage.heapUsed / (1024 * 1024)
    if (memoryMB > thresholds.maxMemoryUsage * 1.5) {
      this.addAlert(
        'critical',
        'performance',
        `Test ${result.testName} exceeded critical memory usage: ${memoryMB.toFixed(1)}MB`
      )
    } else if (memoryMB > thresholds.maxMemoryUsage) {
      this.addAlert(
        'warning',
        'performance',
        `Test ${result.testName} exceeded memory threshold: ${memoryMB.toFixed(1)}MB`
      )
    }

    // Error rate threshold
    const errorRate = this.state.realTimeMetrics.errorRate
    if (errorRate > thresholds.maxErrorRate * 2) {
      this.addAlert(
        'critical',
        'threshold',
        `Error rate exceeded critical threshold: ${errorRate.toFixed(1)}%`
      )
    } else if (errorRate > thresholds.maxErrorRate) {
      this.addAlert(
        'warning',
        'threshold',
        `Error rate exceeded threshold: ${errorRate.toFixed(1)}%`
      )
    }
  }

  /**
   * Update estimated time remaining
   */
  private updateTimeEstimate(): void {
    const completed = this.state.progress.completedTests
    const total = this.state.progress.totalTests

    if (completed === 0) {
      this.state.progress.estimatedTimeRemaining = 0
      return
    }

    const elapsed = Date.now() - this.startTime
    const averageTimePerTest = elapsed / completed
    const remaining = total - completed

    this.state.progress.estimatedTimeRemaining = remaining * averageTimePerTest
  }

  /**
   * Add alert to dashboard
   */
  private addAlert(
    level: 'info' | 'warning' | 'error' | 'critical',
    category: 'performance' | 'failure' | 'system' | 'threshold',
    message: string,
    details?: string
  ): void {
    const alert: DashboardAlert = {
      id: `alert-${++this.alertCounter}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details,
      acknowledged: false
    }

    this.state.alerts.unshift(alert)

    // Keep only last 50 alerts
    if (this.state.alerts.length > 50) {
      this.state.alerts = this.state.alerts.slice(0, 50)
    }

    this.emit('alert-added', alert)
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.state.alerts.find((a) => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
      this.emit('alert-acknowledged', alert)
    }
  }

  /**
   * Get current dashboard state
   */
  getState(): DashboardState {
    return { ...this.state }
  }

  /**
   * Get trend data for visualization
   */
  getTrendData(): TrendData {
    return { ...this.trendData }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Export dashboard data for persistence
   */
  exportData(): {
    state: DashboardState
    trendData: TrendData
    config: TestConfig
  } {
    return {
      state: this.getState(),
      trendData: this.getTrendData(),
      config: this.config
    }
  }

  /**
   * Save dashboard state to file
   */
  async saveDashboardState(outputDir: string): Promise<string> {
    fs.mkdirSync(outputDir, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filePath = path.join(outputDir, `dashboard-state-${timestamp}.json`)

    const data = this.exportData()
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))

    return filePath
  }
}
