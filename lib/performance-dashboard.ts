/**
 * Performance Dashboard and Reporting System
 * Provides web-based dashboard and reporting capabilities for performance monitoring
 */

import { performanceMonitor, type PerformanceMetrics, type PerformanceAlert } from './performance-monitor';
import { log } from './log';

export interface DashboardData {
  summary: {
    health: 'healthy' | 'warning' | 'critical';
    uptime: number;
    activeAlerts: number;
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
  };
  
  metrics: {
    current: PerformanceMetrics | null;
    history: PerformanceMetrics[];
  };
  
  alerts: {
    active: PerformanceAlert[];
    recent: PerformanceAlert[];
  };
  
  charts: {
    responseTime: ChartData;
    errorRate: ChartData;
    throughput: ChartData;
    systemMetrics: ChartData;
  };
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

export interface PerformanceReport {
  id: string;
  generatedAt: number;
  period: {
    start: number;
    end: number;
  };
  summary: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
    peakThroughput: number;
    alertsTriggered: number;
  };
  trends: {
    responseTime: 'improving' | 'stable' | 'degrading';
    errorRate: 'improving' | 'stable' | 'degrading';
    throughput: 'increasing' | 'stable' | 'decreasing';
  };
  recommendations: string[];
  charts: {
    responseTime: ChartData;
    errorRate: ChartData;
    throughput: ChartData;
  };
}

export class PerformanceDashboard {
  private reports: PerformanceReport[] = [];

  /**
   * Get current dashboard data
   */
  getDashboardData(): DashboardData {
    const summary = performanceMonitor.getPerformanceSummary();
    const metricsHistory = performanceMonitor.getMetricsHistory();
    const activeAlerts = performanceMonitor.getActiveAlerts();
    const allAlerts = performanceMonitor.getAllAlerts();

    // Calculate summary statistics
    const recentMetrics = metricsHistory.slice(-10); // Last 10 data points
    const totalRequests = recentMetrics.reduce((sum, m) => sum + m.requests.total, 0);
    const avgErrorRate = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.requests.errorRate, 0) / recentMetrics.length 
      : 0;
    const avgResponseTime = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.responseTime.average, 0) / recentMetrics.length
      : 0;

    return {
      summary: {
        health: summary.health,
        uptime: summary.uptime,
        activeAlerts: summary.activeAlerts,
        totalRequests,
        errorRate: avgErrorRate,
        averageResponseTime: avgResponseTime
      },
      
      metrics: {
        current: summary.current,
        history: metricsHistory.slice(-50) // Last 50 data points
      },
      
      alerts: {
        active: activeAlerts,
        recent: allAlerts.slice(-20) // Last 20 alerts
      },
      
      charts: {
        responseTime: this.generateResponseTimeChart(metricsHistory.slice(-30)),
        errorRate: this.generateErrorRateChart(metricsHistory.slice(-30)),
        throughput: this.generateThroughputChart(metricsHistory.slice(-30)),
        systemMetrics: this.generateSystemMetricsChart(metricsHistory.slice(-30))
      }
    };
  }

  /**
   * Generate response time chart data
   */
  private generateResponseTimeChart(metrics: PerformanceMetrics[]): ChartData {
    const labels = metrics.map(m => new Date(m.timestamp).toLocaleTimeString());
    
    return {
      labels,
      datasets: [
        {
          label: 'Average Response Time',
          data: metrics.map(m => Math.round(m.responseTime.average)),
          color: '#3b82f6'
        },
        {
          label: '95th Percentile',
          data: metrics.map(m => Math.round(m.responseTime.p95)),
          color: '#f59e0b'
        },
        {
          label: '99th Percentile',
          data: metrics.map(m => Math.round(m.responseTime.p99)),
          color: '#ef4444'
        }
      ]
    };
  }

  /**
   * Generate error rate chart data
   */
  private generateErrorRateChart(metrics: PerformanceMetrics[]): ChartData {
    const labels = metrics.map(m => new Date(m.timestamp).toLocaleTimeString());
    
    return {
      labels,
      datasets: [
        {
          label: 'Error Rate (%)',
          data: metrics.map(m => Number(m.requests.errorRate.toFixed(2))),
          color: '#ef4444'
        }
      ]
    };
  }

  /**
   * Generate throughput chart data
   */
  private generateThroughputChart(metrics: PerformanceMetrics[]): ChartData {
    const labels = metrics.map(m => new Date(m.timestamp).toLocaleTimeString());
    
    return {
      labels,
      datasets: [
        {
          label: 'Requests/Second',
          data: metrics.map(m => Number(m.requests.requestsPerSecond.toFixed(1))),
          color: '#10b981'
        },
        {
          label: 'Active Users',
          data: metrics.map(m => m.business.activeUsers),
          color: '#8b5cf6'
        }
      ]
    };
  }

  /**
   * Generate system metrics chart data
   */
  private generateSystemMetricsChart(metrics: PerformanceMetrics[]): ChartData {
    const labels = metrics.map(m => new Date(m.timestamp).toLocaleTimeString());
    
    return {
      labels,
      datasets: [
        {
          label: 'Memory Usage (MB)',
          data: metrics.map(m => Math.round(m.system.memoryUsage)),
          color: '#3b82f6'
        },
        {
          label: 'Heap Utilization (%)',
          data: metrics.map(m => Math.round(m.system.heapUtilization)),
          color: '#f59e0b'
        },
        {
          label: 'Active Connections',
          data: metrics.map(m => m.system.activeConnections),
          color: '#10b981'
        }
      ]
    };
  }

  /**
   * Generate performance report
   */
  generateReport(periodHours: number = 24): PerformanceReport {
    const now = Date.now();
    const start = now - (periodHours * 60 * 60 * 1000);
    
    const metrics = performanceMonitor.getMetricsHistory(start);
    const alerts = performanceMonitor.getAllAlerts().filter(
      alert => alert.timestamp >= start
    );

    if (metrics.length === 0) {
      throw new Error('No metrics available for the specified period');
    }

    // Calculate summary statistics
    const totalRequests = metrics.reduce((sum, m) => sum + m.requests.total, 0);
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime.average, 0) / metrics.length;
    const avgErrorRate = metrics.reduce((sum, m) => sum + m.requests.errorRate, 0) / metrics.length;
    const peakThroughput = Math.max(...metrics.map(m => m.requests.requestsPerSecond));
    const uptime = now - start;

    // Calculate trends
    const firstHalf = metrics.slice(0, Math.floor(metrics.length / 2));
    const secondHalf = metrics.slice(Math.floor(metrics.length / 2));
    
    const trends = {
      responseTime: this.calculateTrend(
        firstHalf.reduce((sum, m) => sum + m.responseTime.average, 0) / firstHalf.length,
        secondHalf.reduce((sum, m) => sum + m.responseTime.average, 0) / secondHalf.length,
        'lower'
      ),
      errorRate: this.calculateTrend(
        firstHalf.reduce((sum, m) => sum + m.requests.errorRate, 0) / firstHalf.length,
        secondHalf.reduce((sum, m) => sum + m.requests.errorRate, 0) / secondHalf.length,
        'lower'
      ),
      throughput: this.calculateThroughputTrend(
        firstHalf.reduce((sum, m) => sum + m.requests.requestsPerSecond, 0) / firstHalf.length,
        secondHalf.reduce((sum, m) => sum + m.requests.requestsPerSecond, 0) / secondHalf.length
      )
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics, alerts, trends);

    const report: PerformanceReport = {
      id: `report_${now}`,
      generatedAt: now,
      period: { start, end: now },
      summary: {
        totalRequests,
        averageResponseTime: Math.round(avgResponseTime),
        errorRate: Number(avgErrorRate.toFixed(2)),
        uptime,
        peakThroughput: Number(peakThroughput.toFixed(1)),
        alertsTriggered: alerts.length
      },
      trends,
      recommendations,
      charts: {
        responseTime: this.generateResponseTimeChart(metrics),
        errorRate: this.generateErrorRateChart(metrics),
        throughput: this.generateThroughputChart(metrics)
      }
    };

    this.reports.push(report);
    
    // Keep only last 10 reports
    if (this.reports.length > 10) {
      this.reports = this.reports.slice(-10);
    }

    log('Performance report generated', {
      reportId: report.id,
      period: `${periodHours}h`,
      totalRequests,
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: Number(avgErrorRate.toFixed(2))
    });

    return report;
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(
    firstValue: number, 
    secondValue: number, 
    betterDirection: 'higher' | 'lower'
  ): 'improving' | 'stable' | 'degrading' {
    const changePercent = ((secondValue - firstValue) / firstValue) * 100;
    
    if (Math.abs(changePercent) < 5) {
      return 'stable';
    }
    
    if (betterDirection === 'lower') {
      return changePercent < 0 ? 'improving' : 'degrading';
    } else {
      return changePercent > 0 ? 'improving' : 'degrading';
    }
  }

  /**
   * Calculate throughput trend direction
   */
  private calculateThroughputTrend(
    firstValue: number, 
    secondValue: number
  ): 'increasing' | 'stable' | 'decreasing' {
    const changePercent = ((secondValue - firstValue) / firstValue) * 100;
    
    if (Math.abs(changePercent) < 5) {
      return 'stable';
    }
    
    return changePercent > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    metrics: PerformanceMetrics[], 
    alerts: PerformanceAlert[], 
    trends: PerformanceReport['trends']
  ): string[] {
    const recommendations: string[] = [];

    // Response time recommendations
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime.average, 0) / metrics.length;
    if (avgResponseTime > 500) {
      recommendations.push('Consider optimizing slow endpoints or adding caching to improve response times');
    }
    if (trends.responseTime === 'degrading') {
      recommendations.push('Response times are trending upward - investigate recent changes or increased load');
    }

    // Error rate recommendations
    const avgErrorRate = metrics.reduce((sum, m) => sum + m.requests.errorRate, 0) / metrics.length;
    if (avgErrorRate > 1) {
      recommendations.push('Error rate exceeds 1% threshold - review error logs and implement fixes');
    }
    if (trends.errorRate === 'degrading') {
      recommendations.push('Error rate is increasing - monitor for new issues or failing dependencies');
    }

    // Memory recommendations
    const avgMemoryUsage = metrics.reduce((sum, m) => sum + m.system.memoryUsage, 0) / metrics.length;
    const avgHeapUtilization = metrics.reduce((sum, m) => sum + m.system.heapUtilization, 0) / metrics.length;
    if (avgHeapUtilization > 80) {
      recommendations.push('High heap utilization detected - consider memory optimization or increasing heap size');
    }
    if (avgMemoryUsage > 400) {
      recommendations.push('Memory usage is high - review for memory leaks and optimize resource usage');
    }

    // Throughput recommendations
    if (trends.throughput === 'decreasing') {
      recommendations.push('Throughput is declining - investigate performance bottlenecks or scaling needs');
    }

    // Alert-based recommendations
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    if (criticalAlerts > 0) {
      recommendations.push(`${criticalAlerts} critical alerts triggered - immediate attention required`);
    }

    const highAlerts = alerts.filter(a => a.severity === 'high').length;
    if (highAlerts > 5) {
      recommendations.push('Multiple high-severity alerts - review system stability and thresholds');
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('System performance is within acceptable parameters');
    }

    return recommendations;
  }

  /**
   * Get available reports
   */
  getReports(): PerformanceReport[] {
    return [...this.reports];
  }

  /**
   * Get specific report by ID
   */
  getReport(reportId: string): PerformanceReport | null {
    return this.reports.find(r => r.id === reportId) || null;
  }

  /**
   * Export dashboard data as JSON
   */
  exportData(): string {
    const data = {
      dashboard: this.getDashboardData(),
      reports: this.reports,
      exportedAt: new Date().toISOString()
    };
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * Get health status for external monitoring
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    checks: {
      name: string;
      status: 'pass' | 'warn' | 'fail';
      value?: number;
      threshold?: number;
      message?: string;
    }[];
  } {
    const summary = performanceMonitor.getPerformanceSummary();
    const current = summary.current;
    
    const checks: {
      name: string;
      status: 'pass' | 'warn' | 'fail';
      value?: number;
      threshold?: number;
      message?: string;
    }[] = [];
    
    if (current) {
      // Response time check
      checks.push({
        name: 'response_time',
        status: current.responseTime.average <= 500 ? 'pass' : 
                current.responseTime.average <= 1000 ? 'warn' : 'fail',
        value: Math.round(current.responseTime.average),
        threshold: 500,
        message: `Average response time: ${Math.round(current.responseTime.average)}ms`
      });

      // Error rate check
      checks.push({
        name: 'error_rate',
        status: current.requests.errorRate <= 1 ? 'pass' :
                current.requests.errorRate <= 5 ? 'warn' : 'fail',
        value: Number(current.requests.errorRate.toFixed(2)),
        threshold: 1,
        message: `Error rate: ${current.requests.errorRate.toFixed(2)}%`
      });

      // Memory check
      checks.push({
        name: 'memory_usage',
        status: current.system.heapUtilization <= 80 ? 'pass' :
                current.system.heapUtilization <= 90 ? 'warn' : 'fail',
        value: Math.round(current.system.heapUtilization),
        threshold: 80,
        message: `Heap utilization: ${Math.round(current.system.heapUtilization)}%`
      });
    }

    // Alert check
    checks.push({
      name: 'active_alerts',
      status: summary.activeAlerts === 0 ? 'pass' :
              summary.activeAlerts <= 3 ? 'warn' : 'fail',
      value: summary.activeAlerts,
      message: `Active alerts: ${summary.activeAlerts}`
    });

    return {
      status: summary.health,
      checks
    };
  }
}

// Create and export the dashboard
export const performanceDashboard = new PerformanceDashboard();