/**
 * Auto-Scaling System
 * Provides automatic horizontal scaling based on metrics and policies
 */

import { log } from './log';
import { getEnvVar } from './env-security';

export interface ScalingPolicy {
  name: string;
  metric: 'cpu' | 'memory' | 'connections' | 'response-time' | 'error-rate';
  threshold: number;
  comparison: 'greater-than' | 'less-than';
  action: 'scale-up' | 'scale-down';
  cooldownPeriod: number;
  minInstances: number;
  maxInstances: number;
  scaleAmount: number;
}

export interface ScalingMetrics {
  cpu: number;
  memory: number;
  connections: number;
  responseTime: number;
  errorRate: number;
  requestsPerSecond: number;
  activeInstances: number;
  timestamp: number;
}

export interface ScalingEvent {
  id: string;
  timestamp: number;
  policy: string;
  action: 'scale-up' | 'scale-down';
  reason: string;
  fromInstances: number;
  toInstances: number;
  metrics: ScalingMetrics;
  success: boolean;
  error?: string;
}

export interface AutoScalerConfig {
  enabled: boolean;
  checkInterval: number;
  metricsWindow: number;
  defaultCooldown: number;
  enablePredictive: boolean;
  predictiveWindow: number;
  enableMonitoring: boolean;
  monitoringInterval: number;
}

export class AutoScaler {
  private config: AutoScalerConfig;
  private policies: Map<string, ScalingPolicy> = new Map();
  private metricsHistory: ScalingMetrics[] = [];
  private scalingEvents: ScalingEvent[] = [];
  private lastScaleTime = new Map<string, number>();
  private checkInterval?: NodeJS.Timeout;
  private monitoringInterval?: NodeJS.Timeout;
  private currentInstances = 1;

  constructor(config: Partial<AutoScalerConfig> = {}) {
    this.config = {
      enabled: true,
      checkInterval: 30000,     // 30 seconds
      metricsWindow: 300000,    // 5 minutes
      defaultCooldown: 300000,  // 5 minutes
      enablePredictive: false,
      predictiveWindow: 900000, // 15 minutes
      enableMonitoring: true,
      monitoringInterval: 60000, // 1 minute
      ...config
    };

    this.setupDefaultPolicies();
    this.startScalingChecks();
    this.startMonitoring();
  }

  private setupDefaultPolicies(): void {
    // Default scaling policies
    this.addPolicy({
      name: 'high-cpu-scale-up',
      metric: 'cpu',
      threshold: 80,
      comparison: 'greater-than',
      action: 'scale-up',
      cooldownPeriod: 300000, // 5 minutes
      minInstances: 1,
      maxInstances: 10,
      scaleAmount: 1
    });

    this.addPolicy({
      name: 'low-cpu-scale-down',
      metric: 'cpu',
      threshold: 30,
      comparison: 'less-than',
      action: 'scale-down',
      cooldownPeriod: 600000, // 10 minutes
      minInstances: 1,
      maxInstances: 10,
      scaleAmount: 1
    });

    this.addPolicy({
      name: 'high-memory-scale-up',
      metric: 'memory',
      threshold: 85,
      comparison: 'greater-than',
      action: 'scale-up',
      cooldownPeriod: 300000,
      minInstances: 1,
      maxInstances: 10,
      scaleAmount: 1
    });

    this.addPolicy({
      name: 'high-response-time-scale-up',
      metric: 'response-time',
      threshold: 2000, // 2 seconds
      comparison: 'greater-than',
      action: 'scale-up',
      cooldownPeriod: 180000, // 3 minutes
      minInstances: 1,
      maxInstances: 10,
      scaleAmount: 2 // Scale up faster for response time issues
    });

    this.addPolicy({
      name: 'high-error-rate-scale-up',
      metric: 'error-rate',
      threshold: 5, // 5%
      comparison: 'greater-than',
      action: 'scale-up',
      cooldownPeriod: 120000, // 2 minutes
      minInstances: 1,
      maxInstances: 10,
      scaleAmount: 2 // Scale up quickly for errors
    });
  }

  /**
   * Add a scaling policy
   */
  addPolicy(policy: ScalingPolicy): void {
    this.policies.set(policy.name, policy);
    log('Scaling policy added', {
      name: policy.name,
      metric: policy.metric,
      threshold: policy.threshold,
      action: policy.action
    });
  }

  /**
   * Remove a scaling policy
   */
  removePolicy(policyName: string): boolean {
    const removed = this.policies.delete(policyName);
    if (removed) {
      log('Scaling policy removed', { name: policyName });
    }
    return removed;
  }

  /**
   * Record current metrics
   */
  recordMetrics(metrics: Omit<ScalingMetrics, 'timestamp'>): void {
    const timestampedMetrics: ScalingMetrics = {
      ...metrics,
      timestamp: Date.now()
    };

    this.metricsHistory.push(timestampedMetrics);

    // Keep only recent metrics within the window
    const cutoff = Date.now() - this.config.metricsWindow;
    this.metricsHistory = this.metricsHistory.filter(m => m.timestamp > cutoff);

    // Update current instance count
    this.currentInstances = metrics.activeInstances;
  }

  /**
   * Get average metrics over the specified window
   */
  private getAverageMetrics(windowMs: number = this.config.metricsWindow): ScalingMetrics | null {
    const cutoff = Date.now() - windowMs;
    const recentMetrics = this.metricsHistory.filter(m => m.timestamp > cutoff);

    if (recentMetrics.length === 0) {
      return null;
    }

    const sum = recentMetrics.reduce((acc, metrics) => ({
      cpu: acc.cpu + metrics.cpu,
      memory: acc.memory + metrics.memory,
      connections: acc.connections + metrics.connections,
      responseTime: acc.responseTime + metrics.responseTime,
      errorRate: acc.errorRate + metrics.errorRate,
      requestsPerSecond: acc.requestsPerSecond + metrics.requestsPerSecond,
      activeInstances: acc.activeInstances + metrics.activeInstances,
      timestamp: acc.timestamp
    }), {
      cpu: 0, memory: 0, connections: 0, responseTime: 0,
      errorRate: 0, requestsPerSecond: 0, activeInstances: 0, timestamp: Date.now()
    });

    const count = recentMetrics.length;
    return {
      cpu: sum.cpu / count,
      memory: sum.memory / count,
      connections: sum.connections / count,
      responseTime: sum.responseTime / count,
      errorRate: sum.errorRate / count,
      requestsPerSecond: sum.requestsPerSecond / count,
      activeInstances: Math.round(sum.activeInstances / count),
      timestamp: Date.now()
    };
  }

  private startScalingChecks(): void {
    if (!this.config.enabled) return;

    this.checkInterval = setInterval(() => {
      this.checkScalingPolicies();
    }, this.config.checkInterval);
  }

  private async checkScalingPolicies(): Promise<void> {
    const averageMetrics = this.getAverageMetrics();
    if (!averageMetrics) {
      return; // Not enough metrics data
    }

    for (const [policyName, policy] of this.policies.entries()) {
      try {
        await this.evaluatePolicy(policy, averageMetrics);
      } catch (error) {
        log('Error evaluating scaling policy', {
          policy: policyName,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  private async evaluatePolicy(policy: ScalingPolicy, metrics: ScalingMetrics): Promise<void> {
    // Check cooldown period
    const lastScaleTime = this.lastScaleTime.get(policy.name) || 0;
    const timeSinceLastScale = Date.now() - lastScaleTime;
    
    if (timeSinceLastScale < policy.cooldownPeriod) {
      return; // Still in cooldown
    }

    // Get metric value
    const metricValue = this.getMetricValue(policy.metric, metrics);
    
    // Check if policy condition is met
    const conditionMet = policy.comparison === 'greater-than' 
      ? metricValue > policy.threshold
      : metricValue < policy.threshold;

    if (!conditionMet) {
      return; // Condition not met
    }

    // Check instance limits
    const targetInstances = policy.action === 'scale-up'
      ? Math.min(this.currentInstances + policy.scaleAmount, policy.maxInstances)
      : Math.max(this.currentInstances - policy.scaleAmount, policy.minInstances);

    if (targetInstances === this.currentInstances) {
      return; // Already at limit
    }

    // Execute scaling action
    await this.executeScaling(policy, metrics, targetInstances);
  }

  private getMetricValue(metric: ScalingPolicy['metric'], metrics: ScalingMetrics): number {
    switch (metric) {
      case 'cpu': return metrics.cpu;
      case 'memory': return metrics.memory;
      case 'connections': return metrics.connections;
      case 'response-time': return metrics.responseTime;
      case 'error-rate': return metrics.errorRate;
      default: return 0;
    }
  }

  private async executeScaling(policy: ScalingPolicy, metrics: ScalingMetrics, targetInstances: number): Promise<void> {
    const eventId = this.generateEventId();
    const scalingEvent: ScalingEvent = {
      id: eventId,
      timestamp: Date.now(),
      policy: policy.name,
      action: policy.action,
      reason: `${policy.metric} ${policy.comparison} ${policy.threshold}`,
      fromInstances: this.currentInstances,
      toInstances: targetInstances,
      metrics: { ...metrics },
      success: false
    };

    try {
      log('Executing scaling action', {
        eventId,
        policy: policy.name,
        action: policy.action,
        fromInstances: this.currentInstances,
        toInstances: targetInstances,
        reason: scalingEvent.reason
      });

      // Execute the actual scaling (this would integrate with orchestration systems)
      await this.performScaling(policy.action, targetInstances);

      scalingEvent.success = true;
      this.currentInstances = targetInstances;
      this.lastScaleTime.set(policy.name, Date.now());

      log('Scaling action completed successfully', {
        eventId,
        newInstanceCount: targetInstances
      });

    } catch (error) {
      scalingEvent.success = false;
      scalingEvent.error = error instanceof Error ? error.message : String(error);

      log('Scaling action failed', {
        eventId,
        error: scalingEvent.error
      });
    }

    this.scalingEvents.push(scalingEvent);

    // Keep only recent events (last 100)
    if (this.scalingEvents.length > 100) {
      this.scalingEvents = this.scalingEvents.slice(-100);
    }
  }

  private async performScaling(action: 'scale-up' | 'scale-down', targetInstances: number): Promise<void> {
    // This is where you would integrate with actual orchestration systems
    // Examples:
    
    // Kubernetes:
    // await this.kubernetesClient.patchNamespacedDeployment(...)
    
    // Docker Swarm:
    // await this.dockerClient.updateService(...)
    
    // AWS Auto Scaling:
    // await this.autoScalingClient.setDesiredCapacity(...)
    
    // For now, we simulate the scaling action
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Emit scaling webhook if configured
    const webhookUrl = getEnvVar('SCALING_WEBHOOK_URL');
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            targetInstances,
            timestamp: Date.now()
          })
        });
      } catch (error) {
        log('Failed to call scaling webhook', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  private generateEventId(): string {
    return `scale_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private startMonitoring(): void {
    if (!this.config.enableMonitoring) return;

    this.monitoringInterval = setInterval(() => {
      this.logScalingStatus();
    }, this.config.monitoringInterval);
  }

  private logScalingStatus(): void {
    const recentEvents = this.scalingEvents.filter(
      event => Date.now() - event.timestamp < 3600000 // Last hour
    );

    const scaleUpEvents = recentEvents.filter(e => e.action === 'scale-up').length;
    const scaleDownEvents = recentEvents.filter(e => e.action === 'scale-down').length;
    const failedEvents = recentEvents.filter(e => !e.success).length;

    log('Auto-scaler status', {
      currentInstances: this.currentInstances,
      activePolicies: this.policies.size,
      recentScaleUps: scaleUpEvents,
      recentScaleDowns: scaleDownEvents,
      failedEvents,
      metricsDataPoints: this.metricsHistory.length
    });
  }

  /**
   * Get scaling policies
   */
  getPolicies(): ScalingPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get scaling events
   */
  getEvents(limit: number = 50): ScalingEvent[] {
    return this.scalingEvents.slice(-limit);
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): ScalingMetrics | null {
    return this.getAverageMetrics(60000); // Last minute average
  }

  /**
   * Get auto-scaler status
   */
  getStatus(): {
    enabled: boolean;
    currentInstances: number;
    activePolicies: number;
    recentEvents: number;
    metricsDataPoints: number;
    lastScaleTime: number;
  } {
    const recentEvents = this.scalingEvents.filter(
      event => Date.now() - event.timestamp < 3600000
    ).length;

    const lastScaleTime = Math.max(...Array.from(this.lastScaleTime.values()), 0);

    return {
      enabled: this.config.enabled,
      currentInstances: this.currentInstances,
      activePolicies: this.policies.size,
      recentEvents,
      metricsDataPoints: this.metricsHistory.length,
      lastScaleTime
    };
  }

  /**
   * Enable or disable auto-scaling
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    
    if (enabled && !this.checkInterval) {
      this.startScalingChecks();
    } else if (!enabled && this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }

    log('Auto-scaler enabled state changed', { enabled });
  }

  /**
   * Shutdown the auto-scaler
   */
  shutdown(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    log('Auto-scaler shutdown complete', {
      finalInstanceCount: this.currentInstances,
      totalEvents: this.scalingEvents.length
    });
  }
}

// Create and export auto-scaler instance
export const autoScaler = new AutoScaler({
  enabled: getEnvVar('AUTO_SCALING_ENABLED') !== 'false',
  checkInterval: parseInt(getEnvVar('SCALING_CHECK_INTERVAL') || '30000'),
  defaultCooldown: parseInt(getEnvVar('SCALING_COOLDOWN') || '300000')
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  autoScaler.shutdown();
});

process.on('SIGINT', () => {
  autoScaler.shutdown();
});