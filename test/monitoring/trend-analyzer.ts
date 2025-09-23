/**
 * Test Result Trending and Analysis System
 * Analyzes test results over time to identify trends and patterns
 */

import fs from 'node:fs'
import path from 'node:path'
import type { TestReport, TestSuiteResult } from '../reporting/test-reporter.js'

export interface TrendAnalysis {
  timestamp: string
  period: 'daily' | 'weekly' | 'monthly'
  metrics: TrendMetrics
  patterns: TrendPattern[]
  insights: TrendInsight[]
  recommendations: string[]
}

export interface TrendMetrics {
  passRate: MetricTrend
  responseTime: MetricTrend
  memoryUsage: MetricTrend
  testCount: MetricTrend
  failureRate: MetricTrend
  readinessScore: MetricTrend
}

export interface MetricTrend {
  current: number
  previous: number
  change: number
  changePercent: number
  direction: 'improving' | 'stable' | 'degrading'
  confidence: 'low' | 'medium' | 'high'
  dataPoints: TrendDataPoint[]
}

export interface TrendDataPoint {
  timestamp: string
  value: number
  metadata?: Record<string, any>
}

export interface TrendPattern {
  type: 'seasonal' | 'cyclical' | 'linear' | 'exponential' | 'anomaly'
  metric: string
  description: string
  confidence: number
  impact: 'low' | 'medium' | 'high'
  startDate: string
  endDate?: string
}

export interface TrendInsight {
  category: 'performance' | 'reliability' | 'coverage' | 'quality'
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string
  evidence: string[]
  actionable: boolean
}

export interface HistoricalData {
  reports: HistoricalReport[]
  lastUpdated: string
}

export interface HistoricalReport {
  timestamp: string
  summary: {
    totalTests: number
    passRate: number
    avgResponseTime: number
    peakMemoryUsage: number
    readinessScore: number
  }
  suiteResults: {
    [suiteType: string]: {
      testCount: number
      passRate: number
      avgDuration: number
    }
  }
}

/**
 * Trend Analyzer class
 */
export class TrendAnalyzer {
  private historicalDataPath: string
  private maxHistoryDays: number

  constructor(dataPath: string = 'test-results/historical-data.json', maxHistoryDays: number = 90) {
    this.historicalDataPath = dataPath
    this.maxHistoryDays = maxHistoryDays
  }

  /**
   * Add new test report to historical data
   */
  async addReport(report: TestReport): Promise<void> {
    const historicalData = await this.loadHistoricalData()

    const historicalReport: HistoricalReport = {
      timestamp: report.timestamp,
      summary: {
        totalTests: report.summary.totalTests,
        passRate: report.summary.passRate,
        avgResponseTime: this.calculateAverageResponseTime(report),
        peakMemoryUsage: this.calculatePeakMemoryUsage(report),
        readinessScore: report.readinessScore
      },
      suiteResults: this.extractSuiteMetrics(report.suiteResults)
    }

    historicalData.reports.push(historicalReport)
    historicalData.lastUpdated = new Date().toISOString()

    // Clean old data
    this.cleanOldData(historicalData)

    await this.saveHistoricalData(historicalData)
  }

  /**
   * Analyze trends for a specific period
   */
  async analyzeTrends(period: 'daily' | 'weekly' | 'monthly' = 'weekly'): Promise<TrendAnalysis> {
    const historicalData = await this.loadHistoricalData()

    if (historicalData.reports.length < 2) {
      return this.createEmptyAnalysis(period)
    }

    const metrics = this.calculateTrendMetrics(historicalData, period)
    const patterns = this.identifyPatterns(historicalData, period)
    const insights = this.generateInsights(metrics, patterns)
    const recommendations = this.generateRecommendations(insights, metrics)

    return {
      timestamp: new Date().toISOString(),
      period,
      metrics,
      patterns,
      insights,
      recommendations
    }
  }

  /**
   * Calculate trend metrics
   */
  private calculateTrendMetrics(
    data: HistoricalData,
    period: 'daily' | 'weekly' | 'monthly'
  ): TrendMetrics {
    const reports = this.filterReportsByPeriod(data.reports, period)

    return {
      passRate: this.calculateMetricTrend(reports, 'passRate'),
      responseTime: this.calculateMetricTrend(reports, 'avgResponseTime'),
      memoryUsage: this.calculateMetricTrend(reports, 'peakMemoryUsage'),
      testCount: this.calculateMetricTrend(reports, 'totalTests'),
      failureRate: this.calculateFailureRateTrend(reports),
      readinessScore: this.calculateMetricTrend(reports, 'readinessScore')
    }
  }

  /**
   * Calculate trend for a specific metric
   */
  private calculateMetricTrend(
    reports: HistoricalReport[],
    metricKey: keyof HistoricalReport['summary']
  ): MetricTrend {
    if (reports.length < 2) {
      return this.createEmptyMetricTrend()
    }

    const dataPoints: TrendDataPoint[] = reports.map((report) => ({
      timestamp: report.timestamp,
      value: report.summary[metricKey] as number
    }))

    const current = dataPoints[dataPoints.length - 1].value
    const previous = dataPoints[dataPoints.length - 2].value
    const change = current - previous
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0

    // Determine direction based on metric type
    let direction: 'improving' | 'stable' | 'degrading'
    const absChangePercent = Math.abs(changePercent)

    if (absChangePercent < 5) {
      direction = 'stable'
    } else {
      // For most metrics, higher is better (pass rate, readiness score)
      // For response time and memory usage, lower is better
      const isLowerBetter = metricKey === 'avgResponseTime' || metricKey === 'peakMemoryUsage'

      if (isLowerBetter) {
        direction = change < 0 ? 'improving' : 'degrading'
      } else {
        direction = change > 0 ? 'improving' : 'degrading'
      }
    }

    const confidence = this.calculateConfidence(dataPoints)

    return {
      current,
      previous,
      change,
      changePercent,
      direction,
      confidence,
      dataPoints
    }
  }

  /**
   * Calculate failure rate trend
   */
  private calculateFailureRateTrend(reports: HistoricalReport[]): MetricTrend {
    const failureRateReports = reports.map((report) => ({
      ...report,
      summary: {
        ...report.summary,
        failureRate: 100 - report.summary.passRate
      }
    }))

    return this.calculateMetricTrend(failureRateReports, 'failureRate' as any)
  }

  /**
   * Calculate confidence level based on data consistency
   */
  private calculateConfidence(dataPoints: TrendDataPoint[]): 'low' | 'medium' | 'high' {
    if (dataPoints.length < 3) return 'low'
    if (dataPoints.length < 7) return 'medium'

    // Calculate variance to determine confidence
    const values = dataPoints.map((dp) => dp.value)
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    const coefficientOfVariation = Math.sqrt(variance) / mean

    if (coefficientOfVariation < 0.1) return 'high'
    if (coefficientOfVariation < 0.3) return 'medium'
    return 'low'
  }

  /**
   * Identify patterns in the data
   */
  private identifyPatterns(
    data: HistoricalData,
    period: 'daily' | 'weekly' | 'monthly'
  ): TrendPattern[] {
    const patterns: TrendPattern[] = []
    const reports = this.filterReportsByPeriod(data.reports, period)

    if (reports.length < 5) return patterns

    // Identify linear trends
    patterns.push(...this.identifyLinearTrends(reports))

    // Identify anomalies
    patterns.push(...this.identifyAnomalies(reports))

    // Identify cyclical patterns (if enough data)
    if (reports.length >= 14) {
      patterns.push(...this.identifyCyclicalPatterns(reports))
    }

    return patterns
  }

  /**
   * Identify linear trends
   */
  private identifyLinearTrends(reports: HistoricalReport[]): TrendPattern[] {
    const patterns: TrendPattern[] = []
    const metrics = ['passRate', 'avgResponseTime', 'peakMemoryUsage', 'readinessScore'] as const

    for (const metric of metrics) {
      const values = reports.map((r) => r.summary[metric])
      const trend = this.calculateLinearTrend(values)

      if (Math.abs(trend.slope) > 0.1) {
        // Significant trend
        patterns.push({
          type: 'linear',
          metric,
          description: `${metric} shows a ${trend.slope > 0 ? 'positive' : 'negative'} linear trend`,
          confidence: trend.rSquared,
          impact:
            Math.abs(trend.slope) > 1 ? 'high' : Math.abs(trend.slope) > 0.5 ? 'medium' : 'low',
          startDate: reports[0].timestamp,
          endDate: reports[reports.length - 1].timestamp
        })
      }
    }

    return patterns
  }

  /**
   * Calculate linear trend using least squares regression
   */
  private calculateLinearTrend(values: number[]): {
    slope: number
    intercept: number
    rSquared: number
  } {
    const n = values.length
    const x = Array.from({ length: n }, (_, i) => i)

    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = values.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * values[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)
    const sumYY = values.reduce((sum, val) => sum + val * val, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    // Calculate R-squared
    const meanY = sumY / n
    const ssRes = values.reduce((sum, val, i) => {
      const predicted = slope * x[i] + intercept
      return sum + Math.pow(val - predicted, 2)
    }, 0)
    const ssTot = values.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0)
    const rSquared = 1 - ssRes / ssTot

    return { slope, intercept, rSquared }
  }

  /**
   * Identify anomalies in the data
   */
  private identifyAnomalies(reports: HistoricalReport[]): TrendPattern[] {
    const patterns: TrendPattern[] = []
    const metrics = ['passRate', 'avgResponseTime', 'peakMemoryUsage', 'readinessScore'] as const

    for (const metric of metrics) {
      const values = reports.map((r) => r.summary[metric])
      const anomalies = this.detectAnomalies(values, reports)

      patterns.push(
        ...anomalies.map((anomaly) => ({
          type: 'anomaly' as const,
          metric,
          description: `Anomalous ${metric} value detected: ${anomaly.value}`,
          confidence: anomaly.confidence,
          impact: anomaly.severity,
          startDate: anomaly.timestamp
        }))
      )
    }

    return patterns
  }

  /**
   * Detect anomalies using statistical methods
   */
  private detectAnomalies(
    values: number[],
    reports: HistoricalReport[]
  ): Array<{
    value: number
    timestamp: string
    confidence: number
    severity: 'low' | 'medium' | 'high'
  }> {
    const anomalies: Array<{
      value: number
      timestamp: string
      confidence: number
      severity: 'low' | 'medium' | 'high'
    }> = []

    if (values.length < 5) return anomalies

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    )

    values.forEach((value, index) => {
      const zScore = Math.abs((value - mean) / stdDev)

      if (zScore > 2) {
        // Anomaly threshold
        let severity: 'low' | 'medium' | 'high'
        if (zScore > 3) severity = 'high'
        else if (zScore > 2.5) severity = 'medium'
        else severity = 'low'

        anomalies.push({
          value,
          timestamp: reports[index].timestamp,
          confidence: Math.min(1, zScore / 3),
          severity
        })
      }
    })

    return anomalies
  }

  /**
   * Identify cyclical patterns
   */
  private identifyCyclicalPatterns(reports: HistoricalReport[]): TrendPattern[] {
    // Simplified cyclical pattern detection
    // In a real implementation, this would use more sophisticated signal processing
    return []
  }

  /**
   * Generate insights from metrics and patterns
   */
  private generateInsights(metrics: TrendMetrics, patterns: TrendPattern[]): TrendInsight[] {
    const insights: TrendInsight[] = []

    // Performance insights
    if (
      metrics.responseTime.direction === 'degrading' &&
      metrics.responseTime.confidence === 'high'
    ) {
      insights.push({
        category: 'performance',
        severity: metrics.responseTime.changePercent > 50 ? 'critical' : 'warning',
        title: 'Response Time Degradation',
        description: `Response time has increased by ${metrics.responseTime.changePercent.toFixed(1)}% over the analysis period`,
        evidence: [
          `Current: ${metrics.responseTime.current.toFixed(0)}ms`,
          `Previous: ${metrics.responseTime.previous.toFixed(0)}ms`
        ],
        actionable: true
      })
    }

    // Reliability insights
    if (metrics.passRate.direction === 'degrading') {
      insights.push({
        category: 'reliability',
        severity: metrics.passRate.changePercent < -10 ? 'critical' : 'warning',
        title: 'Test Pass Rate Decline',
        description: `Test pass rate has decreased by ${Math.abs(metrics.passRate.changePercent).toFixed(1)}%`,
        evidence: [
          `Current: ${metrics.passRate.current.toFixed(1)}%`,
          `Previous: ${metrics.passRate.previous.toFixed(1)}%`
        ],
        actionable: true
      })
    }

    // Memory usage insights
    if (metrics.memoryUsage.direction === 'degrading' && metrics.memoryUsage.changePercent > 20) {
      insights.push({
        category: 'performance',
        severity: 'warning',
        title: 'Memory Usage Increase',
        description: `Peak memory usage has increased by ${metrics.memoryUsage.changePercent.toFixed(1)}%`,
        evidence: [
          `Current: ${metrics.memoryUsage.current.toFixed(0)}MB`,
          `Previous: ${metrics.memoryUsage.previous.toFixed(0)}MB`
        ],
        actionable: true
      })
    }

    // Pattern-based insights
    const criticalPatterns = patterns.filter((p) => p.impact === 'high')
    if (criticalPatterns.length > 0) {
      insights.push({
        category: 'quality',
        severity: 'warning',
        title: 'Critical Patterns Detected',
        description: `${criticalPatterns.length} high-impact pattern(s) identified in test results`,
        evidence: criticalPatterns.map((p) => p.description),
        actionable: true
      })
    }

    return insights
  }

  /**
   * Generate recommendations based on insights
   */
  private generateRecommendations(insights: TrendInsight[], metrics: TrendMetrics): string[] {
    const recommendations: string[] = []

    // Performance recommendations
    if (insights.some((i) => i.category === 'performance' && i.severity === 'critical')) {
      recommendations.push(
        'Immediate performance investigation required - response times or memory usage have degraded significantly'
      )
    }

    // Reliability recommendations
    if (metrics.passRate.current < 90) {
      recommendations.push(
        'Test pass rate is below 90% - investigate failing tests and improve test stability'
      )
    }

    // Trend-based recommendations
    if (metrics.readinessScore.direction === 'degrading') {
      recommendations.push(
        'Production readiness score is declining - review and address failing test categories'
      )
    }

    // Memory recommendations
    if (metrics.memoryUsage.direction === 'degrading') {
      recommendations.push('Monitor for memory leaks - memory usage trend is increasing over time')
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push(
        'Test metrics are stable - continue monitoring for any changes in trends'
      )
    }

    return recommendations
  }

  /**
   * Filter reports by time period
   */
  private filterReportsByPeriod(
    reports: HistoricalReport[],
    period: 'daily' | 'weekly' | 'monthly'
  ): HistoricalReport[] {
    const now = new Date()
    let cutoffDate: Date

    switch (period) {
      case 'daily':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        break
      case 'weekly':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        break
      case 'monthly':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
        break
    }

    return reports.filter((report) => new Date(report.timestamp) >= cutoffDate)
  }

  /**
   * Extract suite metrics from test results
   */
  private extractSuiteMetrics(suiteResults: TestSuiteResult[]): {
    [suiteType: string]: { testCount: number; passRate: number; avgDuration: number }
  } {
    const metrics: {
      [suiteType: string]: { testCount: number; passRate: number; avgDuration: number }
    } = {}

    for (const suite of suiteResults) {
      metrics[suite.suiteType] = {
        testCount: suite.summary.totalTests,
        passRate: suite.summary.passRate,
        avgDuration:
          suite.summary.totalTests > 0 ? suite.summary.duration / suite.summary.totalTests : 0
      }
    }

    return metrics
  }

  /**
   * Calculate average response time from report
   */
  private calculateAverageResponseTime(report: TestReport): number {
    if (!report.performanceMetrics || report.performanceMetrics.length === 0) {
      return 0
    }

    const totalTime = report.performanceMetrics.reduce((sum, metric) => sum + metric.duration, 0)
    return totalTime / report.performanceMetrics.length
  }

  /**
   * Calculate peak memory usage from report
   */
  private calculatePeakMemoryUsage(report: TestReport): number {
    if (!report.performanceMetrics || report.performanceMetrics.length === 0) {
      return 0
    }

    const peakHeapUsed = Math.max(...report.performanceMetrics.map((m) => m.memoryUsage.heapUsed))
    return peakHeapUsed / (1024 * 1024) // Convert to MB
  }

  /**
   * Load historical data from file
   */
  private async loadHistoricalData(): Promise<HistoricalData> {
    try {
      if (fs.existsSync(this.historicalDataPath)) {
        const data = fs.readFileSync(this.historicalDataPath, 'utf-8')
        return JSON.parse(data)
      }
    } catch (error) {
      console.warn('Failed to load historical data, starting fresh:', error)
    }

    return {
      reports: [],
      lastUpdated: new Date().toISOString()
    }
  }

  /**
   * Save historical data to file
   */
  private async saveHistoricalData(data: HistoricalData): Promise<void> {
    const dir = path.dirname(this.historicalDataPath)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(this.historicalDataPath, JSON.stringify(data, null, 2))
  }

  /**
   * Clean old data beyond retention period
   */
  private cleanOldData(data: HistoricalData): void {
    const cutoffDate = new Date(Date.now() - this.maxHistoryDays * 24 * 60 * 60 * 1000)
    data.reports = data.reports.filter((report) => new Date(report.timestamp) >= cutoffDate)
  }

  /**
   * Create empty metric trend
   */
  private createEmptyMetricTrend(): MetricTrend {
    return {
      current: 0,
      previous: 0,
      change: 0,
      changePercent: 0,
      direction: 'stable',
      confidence: 'low',
      dataPoints: []
    }
  }

  /**
   * Create empty analysis
   */
  private createEmptyAnalysis(period: 'daily' | 'weekly' | 'monthly'): TrendAnalysis {
    return {
      timestamp: new Date().toISOString(),
      period,
      metrics: {
        passRate: this.createEmptyMetricTrend(),
        responseTime: this.createEmptyMetricTrend(),
        memoryUsage: this.createEmptyMetricTrend(),
        testCount: this.createEmptyMetricTrend(),
        failureRate: this.createEmptyMetricTrend(),
        readinessScore: this.createEmptyMetricTrend()
      },
      patterns: [],
      insights: [],
      recommendations: [
        'Insufficient historical data for trend analysis. Run more tests to build trend history.'
      ]
    }
  }
}
