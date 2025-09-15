/**
 * Performance Metrics Visualization Utilities
 * Generates charts and visualizations for performance data
 */

import fs from 'node:fs';
import path from 'node:path';
import type { PerformanceMetric } from '../utils/test-environment.js';
import type { TestReport } from './test-reporter.js';

export interface PerformanceVisualization {
  timestamp: string;
  charts: PerformanceChart[];
  summary: PerformanceSummary;
  trends: PerformanceTrend[];
  alerts: PerformanceAlert[];
}

export interface PerformanceChart {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'scatter' | 'histogram';
  data: ChartData;
  thresholds?: ChartThreshold[];
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  color: string;
  backgroundColor?: string;
  borderDash?: number[];
}

export interface ChartThreshold {
  value: number;
  label: string;
  color: string;
  type: 'line' | 'area';
}

export interface PerformanceSummary {
  responseTime: MetricSummary;
  memoryUsage: MetricSummary;
  cpuUsage: MetricSummary;
  throughput: MetricSummary;
}

export interface MetricSummary {
  min: number;
  max: number;
  avg: number;
  median: number;
  p95: number;
  p99: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
}

export interface PerformanceTrend {
  metric: string;
  direction: 'improving' | 'stable' | 'degrading';
  change: number;
  significance: 'low' | 'medium' | 'high';
}

export interface PerformanceAlert {
  level: 'info' | 'warning' | 'critical';
  metric: string;
  message: string;
  threshold: number;
  actual: number;
  recommendation: string;
}

/**
 * Performance Visualizer class
 */
export class PerformanceVisualizer {
  private thresholds: {
    responseTime: { warning: number; critical: number };
    memoryUsage: { warning: number; critical: number };
    cpuUsage: { warning: number; critical: number };
  };

  constructor(thresholds?: any) {
    this.thresholds = {
      responseTime: { warning: 200, critical: 500 },
      memoryUsage: { warning: 512, critical: 1024 },
      cpuUsage: { warning: 70, critical: 90 },
      ...thresholds
    };
  }

  /**
   * Generate performance visualization from test report
   */
  generateVisualization(testReport: TestReport): PerformanceVisualization {
    if (!testReport.performanceMetrics || testReport.performanceMetrics.length === 0) {
      return this.createEmptyVisualization();
    }

    const metrics = testReport.performanceMetrics;
    const charts = this.generateCharts(metrics);
    const summary = this.generateSummary(metrics);
    const trends = this.analyzeTrends(metrics);
    const alerts = this.generateAlerts(summary);

    return {
      timestamp: new Date().toISOString(),
      charts,
      summary,
      trends,
      alerts
    };
  }

  /**
   * Generate performance charts
   */
  private generateCharts(metrics: PerformanceMetric[]): PerformanceChart[] {
    const charts: PerformanceChart[] = [];

    // Response Time Chart
    charts.push({
      id: 'responseTime',
      title: 'Response Time Over Time',
      type: 'line',
      data: {
        labels: metrics.map((_, i) => `Test ${i + 1}`),
        datasets: [
          {
            label: 'Response Time (ms)',
            data: metrics.map(m => m.duration),
            color: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)'
          }
        ]
      },
      thresholds: [
        {
          value: this.thresholds.responseTime.warning,
          label: 'Warning Threshold',
          color: '#f59e0b',
          type: 'line'
        },
        {
          value: this.thresholds.responseTime.critical,
          label: 'Critical Threshold',
          color: '#ef4444',
          type: 'line'
        }
      ]
    });

    // Memory Usage Chart
    charts.push({
      id: 'memoryUsage',
      title: 'Memory Usage Over Time',
      type: 'line',
      data: {
        labels: metrics.map((_, i) => `Test ${i + 1}`),
        datasets: [
          {
            label: 'Heap Used (MB)',
            data: metrics.map(m => m.memoryUsage.heapUsed / (1024 * 1024)),
            color: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)'
          },
          {
            label: 'Heap Total (MB)',
            data: metrics.map(m => m.memoryUsage.heapTotal / (1024 * 1024)),
            color: '#6b7280',
            backgroundColor: 'rgba(107, 114, 128, 0.1)'
          }
        ]
      },
      thresholds: [
        {
          value: this.thresholds.memoryUsage.warning,
          label: 'Memory Warning',
          color: '#f59e0b',
          type: 'line'
        }
      ]
    });

    // CPU Usage Chart
    charts.push({
      id: 'cpuUsage',
      title: 'CPU Usage Distribution',
      type: 'bar',
      data: {
        labels: metrics.map((_, i) => `Test ${i + 1}`),
        datasets: [
          {
            label: 'CPU Usage (%)',
            data: metrics.map(m => m.cpuUsage),
            color: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.6)'
          }
        ]
      },
      thresholds: [
        {
          value: this.thresholds.cpuUsage.warning,
          label: 'CPU Warning',
          color: '#f59e0b',
          type: 'line'
        }
      ]
    });

    // Response Time Distribution Histogram
    const responseTimeHistogram = this.createHistogram(
      metrics.map(m => m.duration),
      'Response Time Distribution',
      'Response Time (ms)',
      'Frequency'
    );
    charts.push(responseTimeHistogram);

    return charts;
  }

  /**
   * Generate performance summary statistics
   */
  private generateSummary(metrics: PerformanceMetric[]): PerformanceSummary {
    const responseTimes = metrics.map(m => m.duration);
    const memoryUsages = metrics.map(m => m.memoryUsage.heapUsed / (1024 * 1024));
    const cpuUsages = metrics.map(m => m.cpuUsage);

    return {
      responseTime: this.calculateMetricSummary(
        responseTimes,
        'ms',
        this.thresholds.responseTime.warning,
        this.thresholds.responseTime.critical
      ),
      memoryUsage: this.calculateMetricSummary(
        memoryUsages,
        'MB',
        this.thresholds.memoryUsage.warning,
        this.thresholds.memoryUsage.critical
      ),
      cpuUsage: this.calculateMetricSummary(
        cpuUsages,
        '%',
        this.thresholds.cpuUsage.warning,
        this.thresholds.cpuUsage.critical
      ),
      throughput: {
        min: 0,
        max: 0,
        avg: 0,
        median: 0,
        p95: 0,
        p99: 0,
        unit: 'req/s',
        status: 'good'
      }
    };
  }

  /**
   * Calculate summary statistics for a metric
   */
  private calculateMetricSummary(
    values: number[],
    unit: string,
    warningThreshold: number,
    criticalThreshold: number
  ): MetricSummary {
    if (values.length === 0) {
      return {
        min: 0, max: 0, avg: 0, median: 0, p95: 0, p99: 0,
        unit, status: 'good'
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const median = this.percentile(sorted, 50);
    const p95 = this.percentile(sorted, 95);
    const p99 = this.percentile(sorted, 99);

    let status: 'good' | 'warning' | 'critical';
    if (p95 >= criticalThreshold) {
      status = 'critical';
    } else if (p95 >= warningThreshold) {
      status = 'warning';
    } else {
      status = 'good';
    }

    return { min, max, avg, median, p95, p99, unit, status };
  }

  /**
   * Calculate percentile value
   */
  private percentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedValues[lower];
    }
    
    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  /**
   * Analyze performance trends
   */
  private analyzeTrends(metrics: PerformanceMetric[]): PerformanceTrend[] {
    if (metrics.length < 5) {
      return []; // Need sufficient data for trend analysis
    }

    const trends: PerformanceTrend[] = [];
    const midpoint = Math.floor(metrics.length / 2);
    
    // Response time trend
    const earlyResponseTimes = metrics.slice(0, midpoint).map(m => m.duration);
    const lateResponseTimes = metrics.slice(midpoint).map(m => m.duration);
    const responseTimeTrend = this.calculateTrend(earlyResponseTimes, lateResponseTimes);
    
    trends.push({
      metric: 'Response Time',
      direction: responseTimeTrend.direction,
      change: responseTimeTrend.change,
      significance: responseTimeTrend.significance
    });

    // Memory usage trend
    const earlyMemory = metrics.slice(0, midpoint).map(m => m.memoryUsage.heapUsed);
    const lateMemory = metrics.slice(midpoint).map(m => m.memoryUsage.heapUsed);
    const memoryTrend = this.calculateTrend(earlyMemory, lateMemory);
    
    trends.push({
      metric: 'Memory Usage',
      direction: memoryTrend.direction,
      change: memoryTrend.change,
      significance: memoryTrend.significance
    });

    return trends;
  }

  /**
   * Calculate trend between two data sets
   */
  private calculateTrend(early: number[], late: number[]): {
    direction: 'improving' | 'stable' | 'degrading';
    change: number;
    significance: 'low' | 'medium' | 'high';
  } {
    const earlyAvg = early.reduce((sum, v) => sum + v, 0) / early.length;
    const lateAvg = late.reduce((sum, v) => sum + v, 0) / late.length;
    
    const change = ((lateAvg - earlyAvg) / earlyAvg) * 100;
    const absChange = Math.abs(change);
    
    let direction: 'improving' | 'stable' | 'degrading';
    if (absChange < 5) {
      direction = 'stable';
    } else if (change < 0) {
      direction = 'improving'; // Lower values are better for most metrics
    } else {
      direction = 'degrading';
    }
    
    let significance: 'low' | 'medium' | 'high';
    if (absChange < 10) {
      significance = 'low';
    } else if (absChange < 25) {
      significance = 'medium';
    } else {
      significance = 'high';
    }
    
    return { direction, change: absChange, significance };
  }

  /**
   * Generate performance alerts
   */
  private generateAlerts(summary: PerformanceSummary): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    // Response time alerts
    if (summary.responseTime.status === 'critical') {
      alerts.push({
        level: 'critical',
        metric: 'Response Time',
        message: `95th percentile response time (${summary.responseTime.p95.toFixed(0)}ms) exceeds critical threshold`,
        threshold: this.thresholds.responseTime.critical,
        actual: summary.responseTime.p95,
        recommendation: 'Investigate performance bottlenecks and optimize slow endpoints'
      });
    } else if (summary.responseTime.status === 'warning') {
      alerts.push({
        level: 'warning',
        metric: 'Response Time',
        message: `95th percentile response time (${summary.responseTime.p95.toFixed(0)}ms) exceeds warning threshold`,
        threshold: this.thresholds.responseTime.warning,
        actual: summary.responseTime.p95,
        recommendation: 'Monitor performance closely and consider optimization'
      });
    }

    // Memory usage alerts
    if (summary.memoryUsage.status === 'critical') {
      alerts.push({
        level: 'critical',
        metric: 'Memory Usage',
        message: `Peak memory usage (${summary.memoryUsage.max.toFixed(0)}MB) exceeds critical threshold`,
        threshold: this.thresholds.memoryUsage.critical,
        actual: summary.memoryUsage.max,
        recommendation: 'Check for memory leaks and optimize memory usage'
      });
    } else if (summary.memoryUsage.status === 'warning') {
      alerts.push({
        level: 'warning',
        metric: 'Memory Usage',
        message: `Peak memory usage (${summary.memoryUsage.max.toFixed(0)}MB) exceeds warning threshold`,
        threshold: this.thresholds.memoryUsage.warning,
        actual: summary.memoryUsage.max,
        recommendation: 'Monitor memory usage and consider optimization'
      });
    }

    // CPU usage alerts
    if (summary.cpuUsage.status === 'critical') {
      alerts.push({
        level: 'critical',
        metric: 'CPU Usage',
        message: `Peak CPU usage (${summary.cpuUsage.max.toFixed(1)}%) exceeds critical threshold`,
        threshold: this.thresholds.cpuUsage.critical,
        actual: summary.cpuUsage.max,
        recommendation: 'Investigate CPU-intensive operations and optimize algorithms'
      });
    }

    return alerts;
  }

  /**
   * Create histogram chart
   */
  private createHistogram(
    values: number[],
    title: string,
    xLabel: string,
    yLabel: string
  ): PerformanceChart {
    const bins = 10;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binSize = (max - min) / bins;
    
    const histogram = new Array(bins).fill(0);
    const labels = [];
    
    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binSize;
      const binEnd = min + (i + 1) * binSize;
      labels.push(`${binStart.toFixed(0)}-${binEnd.toFixed(0)}`);
      
      histogram[i] = values.filter(v => v >= binStart && v < binEnd).length;
    }

    return {
      id: 'histogram',
      title,
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: yLabel,
            data: histogram,
            color: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.6)'
          }
        ]
      }
    };
  }

  /**
   * Create empty visualization for when no performance data is available
   */
  private createEmptyVisualization(): PerformanceVisualization {
    return {
      timestamp: new Date().toISOString(),
      charts: [],
      summary: {
        responseTime: { min: 0, max: 0, avg: 0, median: 0, p95: 0, p99: 0, unit: 'ms', status: 'good' },
        memoryUsage: { min: 0, max: 0, avg: 0, median: 0, p95: 0, p99: 0, unit: 'MB', status: 'good' },
        cpuUsage: { min: 0, max: 0, avg: 0, median: 0, p95: 0, p99: 0, unit: '%', status: 'good' },
        throughput: { min: 0, max: 0, avg: 0, median: 0, p95: 0, p99: 0, unit: 'req/s', status: 'good' }
      },
      trends: [],
      alerts: []
    };
  }

  /**
   * Save performance visualization to file
   */
  async saveVisualization(visualization: PerformanceVisualization, outputDir: string): Promise<string> {
    fs.mkdirSync(outputDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(outputDir, `performance-visualization-${timestamp}.json`);
    
    fs.writeFileSync(filePath, JSON.stringify(visualization, null, 2));
    return filePath;
  }
}