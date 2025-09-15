/**
 * Performance Monitoring and Alerting System
 * Provides real-time performance monitoring, metrics collection, and alerting
 */

import { EventEmitter } from 'events';
import { log, logWarn, logError } from './log';
import { resourceManager } from './resource-manager';

export interface PerformanceMetrics {
  timestamp: number;
  
  // Request metrics
  requests: {
    total: number;
    successful: number;
    failed: number;
    errorRate: number;
    requestsPerSecond: number;
  };
  
  // Response time metrics
  responseTime: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  };
  
  // System metrics
  system: {
    cpuUsage: number;
    memoryUsage: number;
    heapUtilization: number;
    activeConnections: number;
    uptime: number;
  };
  
  // Custom business metrics
  business: {
    activeUsers: number;
    transactionsPerMinute: number;
    averageSessionDuration: number;
  };
}

export interface PerformanceAlert {
  id: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  resolved?: boolean;
  resolvedAt?: number;
}

export interface PerformanceThresholds {
  responseTime: {
    averageMs: number;
    p95Ms: number;
    p99Ms: number;
  };
  errorRate: {
    percentage: number;
  };
  system: {
    cpuPercentage: number;
    memoryPercentage: number;
    heapUtilizationPercentage: number;
  };
  requests: {
    requestsPerSecond: number;
  };
}

export interface MonitoringConfig {
  enabled: boolean;
  metricsInterval: number; // milliseconds
  alertingEnabled: boolean;
  retentionPeriod: number; // milliseconds
  thresholds: PerformanceThresholds;
  notifications: {
    webhook?: string;
    email?: string[];
    slack?: string;
  };
}

interface RequestMetric {
  timestamp: number;
  duration: number;
  status: number;
  path: string;
  method: string;
}

export class PerformanceMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private requestMetrics: RequestMetric[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private startTime: number;
  private activeConnections = 0;
  private activeSessions = new Set<string>();
  private sessionStartTimes = new Map<string, number>();

  constructor(config: Partial<MonitoringConfig> = {}) {
    super();
    
    this.config = {
      enabled: true,
      metricsInterval: 15000, // 15 seconds
      alertingEnabled: true,
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      thresholds: {
        responseTime: {
          averageMs: 500,
          p95Ms: 1000,
          p99Ms: 2000
        },
        errorRate: {
          percentage: 5
        },
        system: {
          cpuPercentage: 80,
          memoryPercentage: 85,
          heapUtilizationPercentage: 85
        },
        requests: {
          requestsPerSecond: 100
        }
      },
      notifications: {},
      ...config
    };

    this.startTime = Date.now();
    
    if (this.config.enabled) {
      this.startMonitoring();
    }
  }

  /**
   * Start performance monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkThresholds();
      this.cleanupOldData();
    }, this.config.metricsInterval);

    log('Performance monitoring started', {
      interval: this.config.metricsInterval,
      alerting: this.config.alertingEnabled
    });
  }

  /**
   * Record a request for metrics collection
   */
  recordRequest(req: any, res: any, duration: number): void {
    if (!this.config.enabled) return;

    const metric: RequestMetric = {
      timestamp: Date.now(),
      duration,
      status: res.statusCode,
      path: req.path,
      method: req.method
    };

    this.requestMetrics.push(metric);

    // Track session activity
    const sessionId = req.session?.id;
    if (sessionId) {
      if (!this.activeSessions.has(sessionId)) {
        this.sessionStartTimes.set(sessionId, Date.now());
      }
      this.activeSessions.add(sessionId);
    }

    // Emit real-time event for immediate processing
    this.emit('request', metric);
  }

  /**
   * Track connection events
   */
  onConnectionOpen(): void {
    this.activeConnections++;
  }

  onConnectionClose(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  /**
   * Track session events
   */
  onSessionEnd(sessionId: string): void {
    this.activeSessions.delete(sessionId);
    this.sessionStartTimes.delete(sessionId);
  }

  /**
   * Collect current performance metrics
   */
  private collectMetrics(): void {
    const now = Date.now();
    const timeWindow = 60000; // 1 minute window for calculations
    const recentRequests = this.requestMetrics.filter(
      req => now - req.timestamp <= timeWindow
    );

    // Calculate request metrics
    const totalRequests = recentRequests.length;
    const successfulRequests = recentRequests.filter(req => req.status < 400).length;
    const failedRequests = totalRequests - successfulRequests;
    const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;
    const requestsPerSecond = totalRequests / (timeWindow / 1000);

    // Calculate response time metrics
    const responseTimes = recentRequests.map(req => req.duration).sort((a, b) => a - b);
    const responseTimeMetrics = this.calculatePercentiles(responseTimes);

    // Get system metrics
    const resourceMetrics = resourceManager.getMetrics();
    const systemMetrics = {
      cpuUsage: this.calculateCpuUsage(resourceMetrics.cpuUsage),
      memoryUsage: resourceMetrics.memory.heapUsed,
      heapUtilization: resourceMetrics.memory.heapUtilization,
      activeConnections: this.activeConnections,
      uptime: now - this.startTime
    };

    // Calculate business metrics
    const businessMetrics = {
      activeUsers: this.activeSessions.size,
      transactionsPerMinute: recentRequests.filter(req => 
        req.path.includes('/api/pos/') || req.path.includes('/api/payment/')
      ).length,
      averageSessionDuration: this.calculateAverageSessionDuration()
    };

    const metrics: PerformanceMetrics = {
      timestamp: now,
      requests: {
        total: totalRequests,
        successful: successfulRequests,
        failed: failedRequests,
        errorRate,
        requestsPerSecond
      },
      responseTime: responseTimeMetrics,
      system: systemMetrics,
      business: businessMetrics
    };

    this.metrics.push(metrics);
    this.emit('metrics', metrics);

    // Log metrics periodically
    if (this.metrics.length % 4 === 0) { // Every 4 intervals (1 minute if interval is 15s)
      log('Performance metrics collected', {
        requests: metrics.requests,
        responseTime: {
          average: Math.round(metrics.responseTime.average),
          p95: Math.round(metrics.responseTime.p95)
        },
        system: {
          memory: Math.round(metrics.system.memoryUsage),
          heap: Math.round(metrics.system.heapUtilization)
        }
      });
    }
  }

  /**
   * Calculate percentiles for response times
   */
  private calculatePercentiles(values: number[]): PerformanceMetrics['responseTime'] {
    if (values.length === 0) {
      return { average: 0, p50: 0, p95: 0, p99: 0, min: 0, max: 0 };
    }

    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / values.length;

    return {
      average,
      p50: this.percentile(values, 0.5),
      p95: this.percentile(values, 0.95),
      p99: this.percentile(values, 0.99),
      min: values[0],
      max: values[values.length - 1]
    };
  }

  private percentile(values: number[], p: number): number {
    const index = Math.ceil(values.length * p) - 1;
    return values[Math.max(0, index)] || 0;
  }

  /**
   * Calculate CPU usage percentage from Node.js CPU usage object
   */
  private calculateCpuUsage(cpuUsage: NodeJS.CpuUsage): number {
    // This is a simplified calculation - in production you might want more sophisticated CPU monitoring
    const totalUsage = cpuUsage.user + cpuUsage.system;
    // Convert microseconds to percentage (rough approximation)
    return Math.min(100, (totalUsage / 1000000) * 100);
  }

  /**
   * Calculate average session duration
   */
  private calculateAverageSessionDuration(): number {
    if (this.sessionStartTimes.size === 0) return 0;

    const now = Date.now();
    const durations = Array.from(this.sessionStartTimes.values())
      .map(startTime => now - startTime);
    
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }

  /**
   * Check performance thresholds and generate alerts
   */
  private checkThresholds(): void {
    if (!this.config.alertingEnabled || this.metrics.length === 0) return;

    const latestMetrics = this.metrics[this.metrics.length - 1];
    const thresholds = this.config.thresholds;

    // Check response time thresholds
    if (latestMetrics.responseTime.average > thresholds.responseTime.averageMs) {
      this.createAlert('high', 'response_time_average', 
        latestMetrics.responseTime.average, thresholds.responseTime.averageMs,
        `Average response time (${Math.round(latestMetrics.responseTime.average)}ms) exceeds threshold`);
    }

    if (latestMetrics.responseTime.p95 > thresholds.responseTime.p95Ms) {
      this.createAlert('high', 'response_time_p95',
        latestMetrics.responseTime.p95, thresholds.responseTime.p95Ms,
        `95th percentile response time (${Math.round(latestMetrics.responseTime.p95)}ms) exceeds threshold`);
    }

    // Check error rate threshold
    if (latestMetrics.requests.errorRate > thresholds.errorRate.percentage) {
      this.createAlert('critical', 'error_rate',
        latestMetrics.requests.errorRate, thresholds.errorRate.percentage,
        `Error rate (${latestMetrics.requests.errorRate.toFixed(1)}%) exceeds threshold`);
    }

    // Check system thresholds
    if (latestMetrics.system.heapUtilization > thresholds.system.heapUtilizationPercentage) {
      this.createAlert('high', 'heap_utilization',
        latestMetrics.system.heapUtilization, thresholds.system.heapUtilizationPercentage,
        `Heap utilization (${Math.round(latestMetrics.system.heapUtilization)}%) exceeds threshold`);
    }

    if (latestMetrics.system.memoryUsage > thresholds.system.memoryPercentage * 10) { // Convert to MB
      this.createAlert('medium', 'memory_usage',
        latestMetrics.system.memoryUsage, thresholds.system.memoryPercentage * 10,
        `Memory usage (${Math.round(latestMetrics.system.memoryUsage)}MB) exceeds threshold`);
    }
  }

  /**
   * Create a performance alert
   */
  private createAlert(severity: PerformanceAlert['severity'], metric: string, 
                     value: number, threshold: number, message: string): void {
    // Check if similar alert already exists and is not resolved
    const existingAlert = this.alerts.find(alert => 
      alert.metric === metric && !alert.resolved
    );

    if (existingAlert) {
      // Update existing alert
      existingAlert.value = value;
      existingAlert.timestamp = Date.now();
      return;
    }

    const alert: PerformanceAlert = {
      id: `${metric}_${Date.now()}`,
      timestamp: Date.now(),
      severity,
      metric,
      value,
      threshold,
      message
    };

    this.alerts.push(alert);
    this.emit('alert', alert);

    // Log alert
    if (severity === 'critical') {
      logError(`Performance alert: ${message}`, new Error(`${metric} (${value}) exceeds threshold (${threshold})`), {
        severity,
        metric,
        value,
        threshold
      });
    } else if (severity === 'high') {
      logWarn(`Performance alert: ${message}`, {
        severity,
        metric,
        value,
        threshold
      });
    } else {
      log(`Performance alert: ${message}`, {
        severity,
        metric,
        value,
        threshold
      });
    }

    // Send notifications if configured
    this.sendNotification(alert);
  }

  /**
   * Send alert notifications
   */
  private async sendNotification(alert: PerformanceAlert): Promise<void> {
    try {
      // Webhook notification
      if (this.config.notifications.webhook) {
        await this.sendWebhookNotification(alert);
      }

      // Email notification (placeholder - would integrate with email service)
      if (this.config.notifications.email?.length) {
        log('Email notification would be sent', {
          alert: alert.message,
          recipients: this.config.notifications.email
        });
      }

      // Slack notification (placeholder - would integrate with Slack API)
      if (this.config.notifications.slack) {
        log('Slack notification would be sent', {
          alert: alert.message,
          channel: this.config.notifications.slack
        });
      }
    } catch (error) {
      logError('Failed to send alert notification', error as Error, { alert });
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(alert: PerformanceAlert): Promise<void> {
    if (!this.config.notifications.webhook) return;

    try {
      const response = await fetch(this.config.notifications.webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'performance_alert',
          alert,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      logError('Webhook notification failed', error as Error);
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      this.emit('alertResolved', alert);
      
      log('Performance alert resolved', {
        alertId,
        metric: alert.metric,
        duration: alert.resolvedAt - alert.timestamp
      });
    }
  }

  /**
   * Clean up old data to prevent memory leaks
   */
  private cleanupOldData(): void {
    const now = Date.now();
    const cutoff = now - this.config.retentionPeriod;

    // Clean up old metrics
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoff);
    
    // Clean up old request metrics
    this.requestMetrics = this.requestMetrics.filter(req => req.timestamp > cutoff);
    
    // Clean up resolved alerts older than retention period
    this.alerts = this.alerts.filter(alert => 
      !alert.resolved || (alert.resolvedAt && alert.resolvedAt > cutoff)
    );
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(since?: number): PerformanceMetrics[] {
    if (!since) return [...this.metrics];
    return this.metrics.filter(metric => metric.timestamp >= since);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    current: PerformanceMetrics | null;
    activeAlerts: number;
    totalAlerts: number;
    uptime: number;
    health: 'healthy' | 'warning' | 'critical';
  } {
    const current = this.getCurrentMetrics();
    const activeAlerts = this.getActiveAlerts();
    
    let health: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (activeAlerts.some(alert => alert.severity === 'critical')) {
      health = 'critical';
    } else if (activeAlerts.length > 0) {
      health = 'warning';
    }

    return {
      current,
      activeAlerts: activeAlerts.length,
      totalAlerts: this.alerts.length,
      uptime: Date.now() - this.startTime,
      health
    };
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart monitoring if interval changed
    if (newConfig.metricsInterval && this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.startMonitoring();
    }

    log('Performance monitoring configuration updated', newConfig);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    log('Performance monitoring stopped');
  }
}

// Create and export the performance monitor
export const performanceMonitor = new PerformanceMonitor({
  enabled: true,
  metricsInterval: 15000, // 15 seconds
  alertingEnabled: true,
  thresholds: {
    responseTime: {
      averageMs: 500,
      p95Ms: 1000,
      p99Ms: 2000
    },
    errorRate: {
      percentage: 1 // 1% error rate threshold (requirement: <1%)
    },
    system: {
      cpuPercentage: 80,
      memoryPercentage: 85,
      heapUtilizationPercentage: 85
    },
    requests: {
      requestsPerSecond: 100
    }
  }
});