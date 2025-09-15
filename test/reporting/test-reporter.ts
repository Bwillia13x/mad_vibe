/**
 * Test Result Aggregation and Reporting System
 * Handles collection, aggregation, and reporting of test results
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { TestConfig } from '../config/test-config.js';
import type { PerformanceMetric } from '../utils/test-environment.js';
import { CoverageReporter } from './coverage-reporter.js';
import { PerformanceVisualizer } from './performance-visualizer.js';

export interface TestResult {
  suiteType: string;
  testName: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  startTime: string;
  endTime: string;
  metrics?: PerformanceMetric;
  errors?: TestError[];
  screenshots?: string[];
  metadata?: Record<string, any>;
}

export interface TestError {
  message: string;
  stack?: string;
  code?: string;
  expected?: any;
  actual?: any;
}

export interface TestSuiteResult {
  suiteName: string;
  suiteType: string;
  startTime: string;
  endTime: string;
  duration: number;
  tests: TestResult[];
  summary: TestSummary;
  config?: Record<string, any>;
}

export interface TestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
  duration: number;
}

export interface TestReport {
  timestamp: string;
  environment: string;
  configuration: Partial<TestConfig>;
  summary: TestSummary;
  suiteResults: TestSuiteResult[];
  performanceMetrics?: PerformanceMetric[];
  recommendations: string[];
  readinessScore: number; // 0-100
  metadata: {
    nodeVersion: string;
    platform: string;
    arch: string;
    totalMemory: number;
  };
}

/**
 * Test Reporter class for collecting and generating reports
 */
export class TestReporter {
  private suiteResults: TestSuiteResult[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private startTime: string;
  private coverageReporter: CoverageReporter;
  private performanceVisualizer: PerformanceVisualizer;

  constructor(private config: TestConfig) {
    this.startTime = new Date().toISOString();
    this.coverageReporter = new CoverageReporter();
    const thresholds = this.getThresholds();
    this.performanceVisualizer = new PerformanceVisualizer(thresholds);
  }

  private getThresholds() {
    return this.config.thresholds ?? {
      maxResponseTime: 200,
      maxMemoryUsage: 512,
      minConcurrentUsers: 50,
      maxErrorRate: 1
    };
  }

  /**
   * Get the test session start time
   */
  getStartTime(): string {
    return this.startTime;
  }

  /**
   * Add a test suite result
   */
  addSuiteResult(suiteResult: TestSuiteResult): void {
    this.suiteResults.push(suiteResult);
  }

  /**
   * Add performance metrics
   */
  addPerformanceMetrics(metrics: PerformanceMetric[]): void {
    this.performanceMetrics.push(...metrics);
  }

  /**
   * Calculate summary statistics across all test suites
   */
  private calculateOverallSummary(): TestSummary {
    const totals = this.suiteResults.reduce(
      (acc, suite) => ({
        totalTests: acc.totalTests + suite.summary.totalTests,
        passed: acc.passed + suite.summary.passed,
        failed: acc.failed + suite.summary.failed,
        skipped: acc.skipped + suite.summary.skipped,
        duration: acc.duration + suite.summary.duration
      }),
      { totalTests: 0, passed: 0, failed: 0, skipped: 0, duration: 0 }
    );

    return {
      ...totals,
      passRate: totals.totalTests > 0 ? (totals.passed / totals.totalTests) * 100 : 0
    };
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const summary = this.calculateOverallSummary();

    // Pass rate recommendations
    if (summary.passRate < 90) {
      recommendations.push(`Test pass rate is ${summary.passRate.toFixed(1)}%. Consider investigating failing tests before deployment.`);
    }

    // Performance recommendations
    const avgResponseTime = this.performanceMetrics.length > 0 
      ? this.performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / this.performanceMetrics.length
      : 0;

    const thresholds = this.getThresholds();
    if (avgResponseTime > thresholds.maxResponseTime) {
      recommendations.push(`Average response time (${avgResponseTime.toFixed(0)}ms) exceeds threshold (${thresholds.maxResponseTime}ms).`);
    }

    // Memory usage recommendations
    const maxMemoryUsed = Math.max(...this.performanceMetrics.map(m => m.memoryUsage.heapUsed));
    const maxMemoryMB = maxMemoryUsed / (1024 * 1024);
    
    if (maxMemoryMB > thresholds.maxMemoryUsage) {
      recommendations.push(`Peak memory usage (${maxMemoryMB.toFixed(0)}MB) exceeds threshold (${thresholds.maxMemoryUsage}MB).`);
    }

    // Failed test recommendations
    const failedTests = this.suiteResults.flatMap(suite => 
      suite.tests.filter(test => test.status === 'fail')
    );

    if (failedTests.length > 0) {
      const criticalFailures = failedTests.filter(test => 
        test.suiteType === 'security' || test.testName.includes('critical')
      );
      
      if (criticalFailures.length > 0) {
        recommendations.push(`${criticalFailures.length} critical test(s) failed. These must be resolved before deployment.`);
      }
    }

    // Coverage recommendations
    const functionalSuites = this.suiteResults.filter(s => s.suiteType === 'functional');
    if (functionalSuites.length === 0) {
      recommendations.push('No functional tests were executed. Consider running functional test suites.');
    }

    return recommendations;
  }

  /**
   * Calculate production readiness score (0-100)
   */
  private calculateReadinessScore(): number {
    let score = 100;
    const summary = this.calculateOverallSummary();

    // Deduct points for failed tests
    const failureRate = summary.totalTests > 0 ? (summary.failed / summary.totalTests) * 100 : 0;
    score -= failureRate * 2; // 2 points per % failure rate

    // Deduct points for performance issues
    const avgResponseTime = this.performanceMetrics.length > 0 
      ? this.performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / this.performanceMetrics.length
      : 0;

    const thresholds2 = this.getThresholds();
    if (avgResponseTime > thresholds2.maxResponseTime) {
      const overageRatio = avgResponseTime / thresholds2.maxResponseTime;
      score -= Math.min(20, (overageRatio - 1) * 10); // Up to 20 points for performance
    }

    // Deduct points for critical failures
    const criticalFailures = this.suiteResults.flatMap(suite => 
      suite.tests.filter(test => test.status === 'fail' && 
        (test.suiteType === 'security' || test.testName.includes('critical'))
      )
    );

    score -= criticalFailures.length * 10; // 10 points per critical failure

    // Deduct points for missing test coverage
    const suiteTypes = new Set(this.suiteResults.map(s => s.suiteType));
    const expectedSuites = ['functional'];
    const missingSuites = expectedSuites.filter(type => !suiteTypes.has(type));
    score -= missingSuites.length * 5; // 5 points per missing suite type

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate comprehensive test report
   */
  generateReport(): TestReport {
    const summary = this.calculateOverallSummary();
    const recommendations = this.generateRecommendations();
    const readinessScore = this.calculateReadinessScore();

    return {
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      configuration: {
        thresholds: this.getThresholds(),
        testSuites: (this.config.testSuites || []).filter(s => s.enabled)
      },
      summary,
      suiteResults: this.suiteResults,
      performanceMetrics: this.performanceMetrics,
      recommendations,
      readinessScore,
      metadata: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        totalMemory: Math.round(os.totalmem() / (1024 * 1024)) // MB
      }
    };
  }

  /**
   * Save report to files in configured formats with enhanced coverage and performance data
   */
  async saveReport(report: TestReport): Promise<string[]> {
    const outputDir = this.config.reporting.outputDir;
    
    // Ensure output directory exists
    fs.mkdirSync(outputDir, { recursive: true });

    const savedFiles: string[] = [];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Save JSON report
    if (this.config.reporting.formats.includes('json')) {
      const jsonPath = path.join(outputDir, `test-report-${timestamp}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
      savedFiles.push(jsonPath);
    }

    // Save HTML report
    if (this.config.reporting.formats.includes('html')) {
      const htmlPath = path.join(outputDir, `test-report-${timestamp}.html`);
      const htmlContent = this.generateHtmlReport(report);
      fs.writeFileSync(htmlPath, htmlContent);
      savedFiles.push(htmlPath);
    }

    // Save CSV summary
    if (this.config.reporting.formats.includes('csv')) {
      const csvPath = path.join(outputDir, `test-summary-${timestamp}.csv`);
      const csvContent = this.generateCsvSummary(report);
      fs.writeFileSync(csvPath, csvContent);
      savedFiles.push(csvPath);
    }

    // Generate and save coverage report
    if (this.config.reporting.includeMetrics) {
      const coverageReport = this.coverageReporter.generateCoverageReport(report);
      const coveragePath = await this.coverageReporter.saveCoverageReport(coverageReport, outputDir);
      savedFiles.push(coveragePath);

      // Save coverage HTML report
      const coverageHtmlPath = path.join(outputDir, `coverage-report-${timestamp}.html`);
      const coverageHtml = this.coverageReporter.generateCoverageHtml(coverageReport);
      fs.writeFileSync(coverageHtmlPath, coverageHtml);
      savedFiles.push(coverageHtmlPath);
    }

    // Generate and save performance visualization
    if (this.config.reporting.includeMetrics && report.performanceMetrics && report.performanceMetrics.length > 0) {
      const performanceViz = this.performanceVisualizer.generateVisualization(report);
      const performancePath = await this.performanceVisualizer.saveVisualization(performanceViz, outputDir);
      savedFiles.push(performancePath);
    }

    return savedFiles;
  }

  /**
   * Generate HTML report with enhanced performance metrics visualization
   */
  private generateHtmlReport(report: TestReport): string {
    const statusColor = (status: string) => {
      switch (status) {
        case 'pass': return '#22c55e';
        case 'fail': return '#ef4444';
        case 'skip': return '#f59e0b';
        default: return '#6b7280';
      }
    };

    const readinessColor = report.readinessScore >= 90 ? '#22c55e' : 
                          report.readinessScore >= 70 ? '#f59e0b' : '#ef4444';

    // Generate performance metrics charts data
    const performanceChartData = this.generatePerformanceChartData(report);
    const coverageData = this.generateCoverageData(report);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report - ${report.timestamp}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #6b7280; font-size: 0.9em; }
        .readiness-score { font-size: 3em; color: ${readinessColor}; }
        .suite-results { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .test-item { padding: 10px; border-left: 4px solid #e5e7eb; margin: 5px 0; background: #f9fafb; }
        .test-pass { border-left-color: #22c55e; }
        .test-fail { border-left-color: #ef4444; }
        .test-skip { border-left-color: #f59e0b; }
        .recommendations { background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .error-details { background: #fee2e2; border: 1px solid #ef4444; padding: 10px; border-radius: 4px; margin: 10px 0; font-family: monospace; font-size: 0.9em; }
        .charts-section { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .chart-container { width: 100%; height: 400px; margin: 20px 0; }
        .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .coverage-bar { background: #e5e7eb; height: 20px; border-radius: 10px; overflow: hidden; margin: 10px 0; }
        .coverage-fill { background: linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #22c55e 100%); height: 100%; transition: width 0.3s ease; }
        .coverage-text { margin-top: 5px; font-size: 0.9em; color: #6b7280; }
        .performance-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .performance-table th, .performance-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .performance-table th { background: #f9fafb; font-weight: 600; }
        .threshold-indicator { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
        .threshold-good { background: #22c55e; }
        .threshold-warning { background: #f59e0b; }
        .threshold-critical { background: #ef4444; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Test Report</h1>
            <p><strong>Generated:</strong> ${report.timestamp}</p>
            <p><strong>Environment:</strong> ${report.environment}</p>
            <p><strong>Platform:</strong> ${report.metadata.platform} ${report.metadata.arch} (Node ${report.metadata.nodeVersion})</p>
        </div>

        <div class="summary-grid">
            <div class="metric-card">
                <div class="metric-value readiness-score">${report.readinessScore}%</div>
                <div class="metric-label">Production Readiness</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" style="color: #22c55e">${report.summary.passed}</div>
                <div class="metric-label">Tests Passed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" style="color: #ef4444">${report.summary.failed}</div>
                <div class="metric-label">Tests Failed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.summary.passRate.toFixed(1)}%</div>
                <div class="metric-label">Pass Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${(report.summary.duration / 1000).toFixed(1)}s</div>
                <div class="metric-label">Total Duration</div>
            </div>
        </div>

        ${report.performanceMetrics && report.performanceMetrics.length > 0 ? `
        <div class="charts-section">
            <h2>Performance Metrics</h2>
            <div class="chart-grid">
                <div>
                    <h3>Response Time Distribution</h3>
                    <canvas id="responseTimeChart" class="chart-container"></canvas>
                </div>
                <div>
                    <h3>Memory Usage Over Time</h3>
                    <canvas id="memoryChart" class="chart-container"></canvas>
                </div>
            </div>
            
            <h3>Performance Summary</h3>
            <table class="performance-table">
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Value</th>
                        <th>Threshold</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${performanceChartData.summaryRows}
                </tbody>
            </table>
        </div>
        ` : ''}

        <div class="charts-section">
            <h2>Test Coverage Analysis</h2>
            ${coverageData.coverageHtml}
        </div>

        ${report.recommendations.length > 0 ? `
        <div class="recommendations">
            <h3>Recommendations</h3>
            <ul>
                ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        ${report.suiteResults.map(suite => `
        <div class="suite-results">
            <h2>${suite.suiteName} (${suite.suiteType})</h2>
            <p><strong>Duration:</strong> ${(suite.duration / 1000).toFixed(1)}s | 
               <strong>Tests:</strong> ${suite.summary.totalTests} | 
               <strong>Pass Rate:</strong> ${suite.summary.passRate.toFixed(1)}%</p>
            
            ${suite.tests.map(test => `
            <div class="test-item test-${test.status}">
                <strong>${test.testName}</strong> 
                <span style="color: ${statusColor(test.status)}">${test.status.toUpperCase()}</span>
                <span style="float: right">${test.duration}ms</span>
                ${test.metrics ? `
                <div style="margin-top: 8px; font-size: 0.9em; color: #6b7280;">
                    Memory: ${(test.metrics.memoryUsage.heapUsed / (1024 * 1024)).toFixed(1)}MB | 
                    CPU: ${test.metrics.cpuUsage.toFixed(1)}%
                </div>
                ` : ''}
                ${test.errors && test.errors.length > 0 ? `
                <div class="error-details">
                    ${test.errors.map(err => `<div>${err.message}</div>`).join('')}
                </div>
                ` : ''}
            </div>
            `).join('')}
        </div>
        `).join('')}
    </div>

    <script>
        // Performance Charts
        ${performanceChartData.chartScript}
    </script>
</body>
</html>`;
  }

  /**
   * Generate performance chart data and scripts
   */
  private generatePerformanceChartData(report: TestReport): { chartScript: string; summaryRows: string } {
    if (!report.performanceMetrics || report.performanceMetrics.length === 0) {
      return { chartScript: '', summaryRows: '' };
    }

    const metrics = report.performanceMetrics;
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
    const maxMemory = Math.max(...metrics.map(m => m.memoryUsage.heapUsed)) / (1024 * 1024);
    const avgCpu = metrics.reduce((sum, m) => sum + m.cpuUsage, 0) / metrics.length;

    const thresholds = this.getThresholds();
    const responseTimeStatus = avgResponseTime <= thresholds.maxResponseTime ? 'good' : 
                              avgResponseTime <= thresholds.maxResponseTime * 1.5 ? 'warning' : 'critical';
    
    const memoryStatus = maxMemory <= thresholds.maxMemoryUsage ? 'good' : 
                        maxMemory <= thresholds.maxMemoryUsage * 1.2 ? 'warning' : 'critical';

    const summaryRows = `
      <tr>
        <td>Average Response Time</td>
        <td>${avgResponseTime.toFixed(0)}ms</td>
        <td>${thresholds.maxResponseTime}ms</td>
        <td><span class="threshold-indicator threshold-${responseTimeStatus}"></span>${responseTimeStatus.toUpperCase()}</td>
      </tr>
      <tr>
        <td>Peak Memory Usage</td>
        <td>${maxMemory.toFixed(1)}MB</td>
        <td>${thresholds.maxMemoryUsage}MB</td>
        <td><span class="threshold-indicator threshold-${memoryStatus}"></span>${memoryStatus.toUpperCase()}</td>
      </tr>
      <tr>
        <td>Average CPU Usage</td>
        <td>${avgCpu.toFixed(1)}%</td>
        <td>N/A</td>
        <td><span class="threshold-indicator threshold-good"></span>INFO</td>
      </tr>
    `;

    const chartScript = `
      // Response Time Chart
      const responseTimeCtx = document.getElementById('responseTimeChart');
      if (responseTimeCtx) {
        new Chart(responseTimeCtx, {
          type: 'line',
          data: {
            labels: ${JSON.stringify(metrics.map((_, i) => `Test ${i + 1}`))},
            datasets: [{
              label: 'Response Time (ms)',
              data: ${JSON.stringify(metrics.map(m => m.duration))},
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.1
            }, {
              label: 'Threshold',
              data: Array(${metrics.length}).fill(${this.config.thresholds.maxResponseTime}),
              borderColor: '#ef4444',
              borderDash: [5, 5],
              pointRadius: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                title: { display: true, text: 'Response Time (ms)' }
              }
            }
          }
        });
      }

      // Memory Usage Chart
      const memoryCtx = document.getElementById('memoryChart');
      if (memoryCtx) {
        new Chart(memoryCtx, {
          type: 'line',
          data: {
            labels: ${JSON.stringify(metrics.map((_, i) => `Test ${i + 1}`))},
            datasets: [{
              label: 'Heap Used (MB)',
              data: ${JSON.stringify(metrics.map(m => (m.memoryUsage.heapUsed / (1024 * 1024)).toFixed(1)))},
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.1
            }, {
              label: 'Threshold',
              data: Array(${metrics.length}).fill(${this.config.thresholds.maxMemoryUsage}),
              borderColor: '#ef4444',
              borderDash: [5, 5],
              pointRadius: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                title: { display: true, text: 'Memory Usage (MB)' }
              }
            }
          }
        });
      }
    `;

    return { chartScript, summaryRows };
  }

  /**
   * Generate test coverage data and visualization
   */
  private generateCoverageData(report: TestReport): { coverageHtml: string } {
    const suiteTypes = ['functional', 'performance', 'security', 'deployment', 'uat'];
    const actualSuites = new Set(report.suiteResults.map(s => s.suiteType));
    
    const coverageByType = suiteTypes.map(type => {
      const suites = report.suiteResults.filter(s => s.suiteType === type);
      const totalTests = suites.reduce((sum, s) => sum + s.summary.totalTests, 0);
      const passedTests = suites.reduce((sum, s) => sum + s.summary.passed, 0);
      const coverage = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
      const exists = actualSuites.has(type);
      
      return { type, totalTests, passedTests, coverage, exists };
    });

    const overallCoverage = report.summary.totalTests > 0 ? 
      (report.summary.passed / report.summary.totalTests) * 100 : 0;

    const coverageHtml = `
      <div class="coverage-section">
        <h3>Overall Test Coverage: ${overallCoverage.toFixed(1)}%</h3>
        <div class="coverage-bar">
          <div class="coverage-fill" style="width: ${overallCoverage}%"></div>
        </div>
        <div class="coverage-text">${report.summary.passed} of ${report.summary.totalTests} tests passed</div>
        
        <h4>Coverage by Test Type</h4>
        ${coverageByType.map(item => `
          <div style="margin: 15px 0;">
            <strong>${item.type.charAt(0).toUpperCase() + item.type.slice(1)} Tests</strong>
            ${item.exists ? `
              <div class="coverage-bar">
                <div class="coverage-fill" style="width: ${item.coverage}%"></div>
              </div>
              <div class="coverage-text">${item.passedTests} of ${item.totalTests} tests passed (${item.coverage.toFixed(1)}%)</div>
            ` : `
              <div class="coverage-text" style="color: #ef4444;">No tests executed</div>
            `}
          </div>
        `).join('')}
      </div>
    `;

    return { coverageHtml };
  }

  /**
   * Generate CSV summary
   */
  private generateCsvSummary(report: TestReport): string {
    const header = ['Suite Name', 'Suite Type', 'Total Tests', 'Passed', 'Failed', 'Skipped', 'Pass Rate %', 'Duration (ms)'];
    const rows = report.suiteResults.map(suite => [
      suite.suiteName,
      suite.suiteType,
      suite.summary.totalTests,
      suite.summary.passed,
      suite.summary.failed,
      suite.summary.skipped,
      suite.summary.passRate.toFixed(1),
      suite.summary.duration
    ]);

    return [header.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

/**
 * Utility function to create a test result
 */
export function createTestResult(
  suiteType: string,
  testName: string,
  status: 'pass' | 'fail' | 'skip',
  duration: number,
  options: {
    startTime?: string;
    endTime?: string;
    metrics?: PerformanceMetric;
    errors?: TestError[];
    screenshots?: string[];
    metadata?: Record<string, any>;
  } = {}
): TestResult {
  const now = new Date().toISOString();
  return {
    suiteType,
    testName,
    status,
    duration,
    startTime: options.startTime || now,
    endTime: options.endTime || now,
    metrics: options.metrics,
    errors: options.errors,
    screenshots: options.screenshots,
    metadata: options.metadata
  };
}

/**
 * Utility function to create a test suite result
 */
export function createTestSuiteResult(
  suiteName: string,
  suiteType: string,
  tests: TestResult[],
  options: {
    startTime?: string;
    endTime?: string;
    config?: Record<string, any>;
  } = {}
): TestSuiteResult {
  const now = new Date().toISOString();
  const startTime = options.startTime || now;
  const endTime = options.endTime || now;
  const duration = new Date(endTime).getTime() - new Date(startTime).getTime();

  const summary: TestSummary = {
    totalTests: tests.length,
    passed: tests.filter(t => t.status === 'pass').length,
    failed: tests.filter(t => t.status === 'fail').length,
    skipped: tests.filter(t => t.status === 'skip').length,
    passRate: tests.length > 0 ? (tests.filter(t => t.status === 'pass').length / tests.length) * 100 : 0,
    duration: tests.reduce((sum, t) => sum + t.duration, 0)
  };

  return {
    suiteName,
    suiteType,
    startTime,
    endTime,
    duration,
    tests,
    summary,
    config: options.config
  };
}
