/**
 * Test Notification System
 * Handles automated notifications for test failures and alerts
 */

import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import type { DashboardAlert, TestExecutionHistory } from './test-dashboard.js';
import type { TestResult, TestReport } from '../reporting/test-reporter.js';

export interface NotificationConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  rules: NotificationRule[];
  throttling: ThrottlingConfig;
}

export interface NotificationChannel {
  type: 'console' | 'file' | 'webhook' | 'email';
  name: string;
  config: Record<string, any>;
  enabled: boolean;
}

export interface NotificationRule {
  id: string;
  name: string;
  conditions: NotificationCondition[];
  channels: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export interface NotificationCondition {
  type: 'test_failure' | 'suite_failure' | 'threshold_breach' | 'error_rate' | 'performance';
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
  field?: string;
}

export interface ThrottlingConfig {
  enabled: boolean;
  windowMinutes: number;
  maxNotificationsPerWindow: number;
  duplicateSuppressionMinutes: number;
}

export interface Notification {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  details?: any;
  channels: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  sent: boolean;
  attempts: number;
  lastAttempt?: string;
}

/**
 * Notification System class
 */
export class NotificationSystem extends EventEmitter {
  private config: NotificationConfig;
  private notifications: Notification[] = [];
  private notificationCounter: number = 0;
  private throttleTracker: Map<string, number[]> = new Map();

  constructor(config: NotificationConfig) {
    super();
    this.config = config;
  }

  /**
   * Process dashboard alert and send notifications if rules match
   */
  processAlert(alert: DashboardAlert): void {
    if (!this.config.enabled) return;

    const matchingRules = this.findMatchingRules('alert', alert);
    
    for (const rule of matchingRules) {
      if (this.shouldThrottle(rule.id)) continue;

      const notification = this.createNotification(
        alert.level,
        `Test Alert: ${alert.message}`,
        alert.message,
        alert,
        rule.channels,
        rule.priority
      );

      this.sendNotification(notification);
    }
  }

  /**
   * Process test failure and send notifications
   */
  processTestFailure(result: TestResult): void {
    if (!this.config.enabled || result.status !== 'fail') return;

    const matchingRules = this.findMatchingRules('test_failure', result);
    
    for (const rule of matchingRules) {
      if (this.shouldThrottle(rule.id)) continue;

      const notification = this.createNotification(
        'error',
        `Test Failed: ${result.testName}`,
        `Test "${result.testName}" failed in suite "${result.suiteType}"`,
        {
          test: result.testName,
          suite: result.suiteType,
          duration: result.duration,
          errors: result.errors
        },
        rule.channels,
        rule.priority
      );

      this.sendNotification(notification);
    }
  }

  /**
   * Process performance threshold breach
   */
  processPerformanceBreach(metric: string, value: number, threshold: number, testName?: string): void {
    if (!this.config.enabled) return;

    const matchingRules = this.findMatchingRules('performance', { metric, value, threshold, testName });
    
    for (const rule of matchingRules) {
      if (this.shouldThrottle(rule.id)) continue;

      const notification = this.createNotification(
        value > threshold * 2 ? 'critical' : 'warning',
        `Performance Alert: ${metric}`,
        `${metric} exceeded threshold: ${value} > ${threshold}${testName ? ` in test "${testName}"` : ''}`,
        { metric, value, threshold, testName },
        rule.channels,
        rule.priority
      );

      this.sendNotification(notification);
    }
  }

  /**
   * Process error rate breach
   */
  processErrorRateBreach(errorRate: number, threshold: number, totalTests: number): void {
    if (!this.config.enabled) return;

    const matchingRules = this.findMatchingRules('error_rate', { errorRate, threshold, totalTests });
    
    for (const rule of matchingRules) {
      if (this.shouldThrottle(rule.id)) continue;

      const notification = this.createNotification(
        errorRate > threshold * 2 ? 'critical' : 'warning',
        `Error Rate Alert`,
        `Error rate exceeded threshold: ${errorRate.toFixed(1)}% > ${threshold}% (${totalTests} tests)`,
        { errorRate, threshold, totalTests },
        rule.channels,
        rule.priority
      );

      this.sendNotification(notification);
    }
  }

  /**
   * Process test execution completion
   */
  processExecutionComplete(report: TestReport): void {
    if (!this.config.enabled) return;

    const passRate = report.summary.passRate;
    let type: 'info' | 'warning' | 'error' | 'critical';
    let title: string;

    if (passRate >= 95) {
      type = 'info';
      title = 'Test Execution Completed Successfully';
    } else if (passRate >= 80) {
      type = 'warning';
      title = 'Test Execution Completed with Warnings';
    } else if (passRate >= 50) {
      type = 'error';
      title = 'Test Execution Completed with Failures';
    } else {
      type = 'critical';
      title = 'Test Execution Failed Critically';
    }

    const matchingRules = this.findMatchingRules('suite_failure', report);
    
    for (const rule of matchingRules) {
      const notification = this.createNotification(
        type,
        title,
        `Test execution completed: ${report.summary.passed}/${report.summary.totalTests} tests passed (${passRate.toFixed(1)}%)`,
        {
          summary: report.summary,
          readinessScore: report.readinessScore,
          recommendations: report.recommendations
        },
        rule.channels,
        rule.priority
      );

      this.sendNotification(notification);
    }
  }

  /**
   * Find notification rules that match the given event
   */
  private findMatchingRules(eventType: string, data: any): NotificationRule[] {
    return this.config.rules.filter(rule => {
      if (!rule.enabled) return false;

      return rule.conditions.some(condition => {
        if (condition.type !== eventType && eventType !== 'alert') return false;

        switch (condition.type) {
          case 'test_failure':
            return data.status === 'fail';
          
          case 'suite_failure':
            return data.summary && data.summary.passRate < condition.value;
          
          case 'threshold_breach':
          case 'performance':
            return this.evaluateCondition(condition, data);
          
          case 'error_rate':
            return data.errorRate > condition.value;
          
          default:
            return false;
        }
      });
    });
  }

  /**
   * Evaluate a notification condition
   */
  private evaluateCondition(condition: NotificationCondition, data: any): boolean {
    let fieldValue = data;
    
    if (condition.field) {
      fieldValue = this.getNestedValue(data, condition.field);
    }

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'greater_than':
        return fieldValue > condition.value;
      case 'less_than':
        return fieldValue < condition.value;
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      default:
        return false;
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Check if notification should be throttled
   */
  private shouldThrottle(ruleId: string): boolean {
    if (!this.config.throttling.enabled) return false;

    const now = Date.now();
    const windowMs = this.config.throttling.windowMinutes * 60 * 1000;
    const windowStart = now - windowMs;

    // Get notifications for this rule in the current window
    const ruleNotifications = this.throttleTracker.get(ruleId) || [];
    const recentNotifications = ruleNotifications.filter(timestamp => timestamp > windowStart);

    // Update tracker
    this.throttleTracker.set(ruleId, recentNotifications);

    // Check if we've exceeded the limit
    return recentNotifications.length >= this.config.throttling.maxNotificationsPerWindow;
  }

  /**
   * Create a notification object
   */
  private createNotification(
    type: 'info' | 'warning' | 'error' | 'critical',
    title: string,
    message: string,
    details: any,
    channels: string[],
    priority: 'low' | 'medium' | 'high' | 'critical'
  ): Notification {
    return {
      id: `notification-${++this.notificationCounter}`,
      timestamp: new Date().toISOString(),
      type,
      title,
      message,
      details,
      channels,
      priority,
      sent: false,
      attempts: 0
    };
  }

  /**
   * Send notification through configured channels
   */
  private async sendNotification(notification: Notification): Promise<void> {
    this.notifications.push(notification);
    notification.attempts++;
    notification.lastAttempt = new Date().toISOString();

    const enabledChannels = this.config.channels.filter(
      channel => channel.enabled && notification.channels.includes(channel.name)
    );

    let allSuccessful = true;

    for (const channel of enabledChannels) {
      try {
        await this.sendToChannel(notification, channel);
        this.emit('notification-sent', { notification, channel: channel.name });
      } catch (error) {
        allSuccessful = false;
        this.emit('notification-failed', { notification, channel: channel.name, error });
      }
    }

    notification.sent = allSuccessful;

    // Track for throttling
    if (notification.sent) {
      const ruleNotifications = this.throttleTracker.get('global') || [];
      ruleNotifications.push(Date.now());
      this.throttleTracker.set('global', ruleNotifications);
    }
  }

  /**
   * Send notification to specific channel
   */
  private async sendToChannel(notification: Notification, channel: NotificationChannel): Promise<void> {
    switch (channel.type) {
      case 'console':
        this.sendToConsole(notification);
        break;
      
      case 'file':
        await this.sendToFile(notification, channel.config);
        break;
      
      case 'webhook':
        await this.sendToWebhook(notification, channel.config);
        break;
      
      case 'email':
        await this.sendToEmail(notification, channel.config);
        break;
      
      default:
        throw new Error(`Unsupported channel type: ${channel.type}`);
    }
  }

  /**
   * Send notification to console
   */
  private sendToConsole(notification: Notification): void {
    const timestamp = new Date(notification.timestamp).toLocaleString();
    const icon = this.getTypeIcon(notification.type);
    
    console.log(`\n${icon} [${timestamp}] ${notification.title}`);
    console.log(`   ${notification.message}`);
    
    if (notification.details && typeof notification.details === 'object') {
      console.log(`   Details: ${JSON.stringify(notification.details, null, 2)}`);
    }
  }

  /**
   * Send notification to file
   */
  private async sendToFile(notification: Notification, config: any): Promise<void> {
    const logDir = config.directory || 'test-results';
    const logFile = config.filename || 'notifications.log';
    const logPath = path.join(logDir, logFile);

    fs.mkdirSync(logDir, { recursive: true });

    const logEntry = {
      timestamp: notification.timestamp,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      details: notification.details,
      priority: notification.priority
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(logPath, logLine);
  }

  /**
   * Send notification to webhook
   */
  private async sendToWebhook(notification: Notification, config: any): Promise<void> {
    const payload = {
      timestamp: notification.timestamp,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      details: notification.details,
      priority: notification.priority
    };

    // In a real implementation, this would make an HTTP request
    // For now, we'll just log the webhook call
    console.log(`[WEBHOOK] ${config.url}:`, JSON.stringify(payload, null, 2));
  }

  /**
   * Send notification via email
   */
  private async sendToEmail(notification: Notification, config: any): Promise<void> {
    // In a real implementation, this would send an actual email
    // For now, we'll just log the email details
    console.log(`[EMAIL] To: ${config.recipients.join(', ')}`);
    console.log(`[EMAIL] Subject: ${notification.title}`);
    console.log(`[EMAIL] Body: ${notification.message}`);
  }

  /**
   * Get icon for notification type
   */
  private getTypeIcon(type: string): string {
    switch (type) {
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'critical': return '🚨';
      default: return '📢';
    }
  }

  /**
   * Get all notifications
   */
  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  /**
   * Get notifications by type
   */
  getNotificationsByType(type: string): Notification[] {
    return this.notifications.filter(n => n.type === type);
  }

  /**
   * Clear old notifications
   */
  clearOldNotifications(olderThanHours: number = 24): void {
    const cutoff = Date.now() - (olderThanHours * 60 * 60 * 1000);
    this.notifications = this.notifications.filter(
      n => new Date(n.timestamp).getTime() > cutoff
    );
  }

  /**
   * Export notification history
   */
  exportNotifications(outputDir: string): string {
    fs.mkdirSync(outputDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(outputDir, `notifications-${timestamp}.json`);
    
    fs.writeFileSync(filePath, JSON.stringify(this.notifications, null, 2));
    return filePath;
  }
}

/**
 * Default notification configuration
 */
export const defaultNotificationConfig: NotificationConfig = {
  enabled: true,
  channels: [
    {
      type: 'console',
      name: 'console',
      config: {},
      enabled: true
    },
    {
      type: 'file',
      name: 'file-log',
      config: {
        directory: 'test-results',
        filename: 'notifications.log'
      },
      enabled: true
    }
  ],
  rules: [
    {
      id: 'critical-failures',
      name: 'Critical Test Failures',
      conditions: [
        { type: 'test_failure', operator: 'equals', value: 'fail' }
      ],
      channels: ['console', 'file-log'],
      priority: 'high',
      enabled: true
    },
    {
      id: 'performance-critical',
      name: 'Critical Performance Issues',
      conditions: [
        { type: 'performance', operator: 'greater_than', value: 1000, field: 'value' }
      ],
      channels: ['console', 'file-log'],
      priority: 'critical',
      enabled: true
    },
    {
      id: 'high-error-rate',
      name: 'High Error Rate',
      conditions: [
        { type: 'error_rate', operator: 'greater_than', value: 10 }
      ],
      channels: ['console', 'file-log'],
      priority: 'critical',
      enabled: true
    }
  ],
  throttling: {
    enabled: true,
    windowMinutes: 15,
    maxNotificationsPerWindow: 10,
    duplicateSuppressionMinutes: 5
  }
};