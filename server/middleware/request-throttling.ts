/**
 * Request Queuing and Throttling Middleware
 * Provides request rate limiting, queuing, and load management
 */

import { Request, Response, NextFunction } from 'express';
import { log } from '../../lib/log';

export interface ThrottlingConfig {
  // Rate limiting configuration
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxConcurrentRequests: number;
  
  // Queue configuration
  maxQueueSize: number;
  queueTimeoutMs: number;
  
  // Burst handling
  burstSize: number;
  burstWindowMs: number;
  
  // Priority configuration
  enablePriority: boolean;
  priorityRoutes: string[];
  
  // Monitoring
  enableMonitoring: boolean;
  monitoringInterval: number;
}

export interface RequestMetrics {
  totalRequests: number;
  activeRequests: number;
  queuedRequests: number;
  rejectedRequests: number;
  averageResponseTime: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  queueWaitTime: number;
  [key: string]: unknown;
}

interface QueuedRequest {
  req: Request;
  res: Response;
  next: NextFunction;
  timestamp: number;
  priority: number;
  timeoutId: NodeJS.Timeout;
}

interface RateLimitWindow {
  count: number;
  resetTime: number;
}

export class RequestThrottler {
  private config: ThrottlingConfig;
  private metrics: RequestMetrics;
  private requestQueue: QueuedRequest[] = [];
  private activeRequests = new Set<string>();
  private rateLimitWindows = new Map<string, RateLimitWindow>();
  private responseTimes: number[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private startTime: number;

  constructor(config: Partial<ThrottlingConfig> = {}) {
    this.config = {
      maxRequestsPerMinute: 300,
      maxRequestsPerHour: 5000,
      maxConcurrentRequests: 50,
      maxQueueSize: 100,
      queueTimeoutMs: 30000, // 30 seconds
      burstSize: 20,
      burstWindowMs: 1000, // 1 second
      enablePriority: true,
      priorityRoutes: ['/api/health', '/api/auth'],
      enableMonitoring: true,
      monitoringInterval: 10000, // 10 seconds
      ...config
    };

    this.startTime = Date.now();
    this.metrics = this.initializeMetrics();

    if (this.config.enableMonitoring) {
      this.startMonitoring();
    }
  }

  private initializeMetrics(): RequestMetrics {
    return {
      totalRequests: 0,
      activeRequests: 0,
      queuedRequests: 0,
      rejectedRequests: 0,
      averageResponseTime: 0,
      requestsPerMinute: 0,
      requestsPerHour: 0,
      queueWaitTime: 0
    };
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
      
      // Log metrics periodically
      if (this.metrics.totalRequests % 100 === 0 && this.metrics.totalRequests > 0) {
        log('Request throttling metrics', this.metrics);
      }

      // Check for potential issues
      this.checkThrottlingHealth();
    }, this.config.monitoringInterval);
  }

  private updateMetrics(): void {
    this.metrics.activeRequests = this.activeRequests.size;
    this.metrics.queuedRequests = this.requestQueue.length;

    // Calculate average response time
    if (this.responseTimes.length > 0) {
      const sum = this.responseTimes.reduce((a, b) => a + b, 0);
      this.metrics.averageResponseTime = sum / this.responseTimes.length;
      
      // Keep only recent response times
      if (this.responseTimes.length > 100) {
        this.responseTimes = this.responseTimes.slice(-100);
      }
    }

    // Calculate requests per minute/hour
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    // Clean up old rate limit windows
    for (const [key, window] of this.rateLimitWindows.entries()) {
      if (window.resetTime < now) {
        this.rateLimitWindows.delete(key);
      }
    }
  }

  private checkThrottlingHealth(): void {
    const { activeRequests, queuedRequests, rejectedRequests, totalRequests } = this.metrics;

    // Warn if queue is getting full
    if (queuedRequests > this.config.maxQueueSize * 0.8) {
      log('Request queue approaching capacity', {
        queuedRequests,
        maxQueueSize: this.config.maxQueueSize,
        activeRequests
      });
    }

    // Warn if rejection rate is high
    if (totalRequests > 100) {
      const rejectionRate = (rejectedRequests / totalRequests) * 100;
      if (rejectionRate > 5) {
        log('High request rejection rate detected', {
          rejectionRate: rejectionRate.toFixed(2),
          rejectedRequests,
          totalRequests
        });
      }
    }

    // Warn if response time is high
    if (this.metrics.averageResponseTime > 5000) {
      log('High average response time detected', {
        averageResponseTime: this.metrics.averageResponseTime,
        activeRequests,
        queuedRequests
      });
    }
  }

  private getClientId(req: Request): string {
    // Use IP address as client identifier
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  private getRateLimitKey(clientId: string, window: 'minute' | 'hour'): string {
    const now = Date.now();
    const windowSize = window === 'minute' ? 60000 : 3600000;
    const windowStart = Math.floor(now / windowSize) * windowSize;
    return `${clientId}:${window}:${windowStart}`;
  }

  private checkRateLimit(clientId: string): boolean {
    const now = Date.now();

    // Check minute rate limit
    const minuteKey = this.getRateLimitKey(clientId, 'minute');
    const minuteWindow = this.rateLimitWindows.get(minuteKey) || {
      count: 0,
      resetTime: now + 60000
    };

    if (minuteWindow.count >= this.config.maxRequestsPerMinute) {
      return false;
    }

    // Check hour rate limit
    const hourKey = this.getRateLimitKey(clientId, 'hour');
    const hourWindow = this.rateLimitWindows.get(hourKey) || {
      count: 0,
      resetTime: now + 3600000
    };

    if (hourWindow.count >= this.config.maxRequestsPerHour) {
      return false;
    }

    // Update counters
    minuteWindow.count++;
    hourWindow.count++;
    this.rateLimitWindows.set(minuteKey, minuteWindow);
    this.rateLimitWindows.set(hourKey, hourWindow);

    return true;
  }

  private getRequestPriority(req: Request): number {
    if (!this.config.enablePriority) return 0;

    // Higher priority for health checks and auth
    for (const route of this.config.priorityRoutes) {
      if (req.path.startsWith(route)) {
        return 10;
      }
    }

    // Medium priority for API routes
    if (req.path.startsWith('/api')) {
      return 5;
    }

    // Lower priority for static assets
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
      return 1;
    }

    return 0;
  }

  private processQueue(): void {
    while (this.requestQueue.length > 0 && 
           this.activeRequests.size < this.config.maxConcurrentRequests) {
      
      // Sort queue by priority (higher priority first)
      this.requestQueue.sort((a, b) => b.priority - a.priority);
      
      const queuedRequest = this.requestQueue.shift();
      if (!queuedRequest) break;

      // Clear timeout
      clearTimeout(queuedRequest.timeoutId);

      // Process the request
      this.processRequest(queuedRequest.req, queuedRequest.res, queuedRequest.next);
    }
  }

  private processRequest(req: Request, res: Response, next: NextFunction): void {
    const requestId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const startTime = Date.now();

    this.activeRequests.add(requestId);
    this.metrics.totalRequests++;

    // Track response completion
    const originalSend = res.send;
    const originalJson = res.json;

    const completeRequest = () => {
      this.activeRequests.delete(requestId);
      const responseTime = Date.now() - startTime;
      this.responseTimes.push(responseTime);

      // Process next request in queue
      this.processQueue();
    };

    res.send = function(body) {
      completeRequest();
      return originalSend.call(this, body);
    };

    res.json = function(body) {
      completeRequest();
      return originalJson.call(this, body);
    };

    res.on('close', completeRequest);
    res.on('finish', completeRequest);

    next();
  }

  /**
   * Main throttling middleware
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientId = this.getClientId(req);
      const priority = this.getRequestPriority(req);

      // Check rate limits
      if (!this.checkRateLimit(clientId)) {
        this.metrics.rejectedRequests++;
        log('Request rate limit exceeded', {
          clientId,
          path: req.path,
          method: req.method
        });

        return res.status(429).json({
          message: 'Too many requests',
          error: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 60
        });
      }

      // Check concurrent request limit
      if (this.activeRequests.size >= this.config.maxConcurrentRequests) {
        // Check if queue has space
        if (this.requestQueue.length >= this.config.maxQueueSize) {
          this.metrics.rejectedRequests++;
          log('Request queue full', {
            queueSize: this.requestQueue.length,
            maxQueueSize: this.config.maxQueueSize,
            activeRequests: this.activeRequests.size
          });

          return res.status(503).json({
            message: 'Service temporarily unavailable',
            error: 'QUEUE_FULL',
            retryAfter: 30
          });
        }

        // Add to queue
        const timeoutId = setTimeout(() => {
          // Remove from queue if timeout
          const index = this.requestQueue.findIndex(qr => qr.req === req);
          if (index !== -1) {
            this.requestQueue.splice(index, 1);
            this.metrics.rejectedRequests++;
            
            if (!res.headersSent) {
              res.status(408).json({
                message: 'Request timeout in queue',
                error: 'QUEUE_TIMEOUT'
              });
            }
          }
        }, this.config.queueTimeoutMs);

        this.requestQueue.push({
          req,
          res,
          next,
          timestamp: Date.now(),
          priority,
          timeoutId
        });

        log('Request queued', {
          queueSize: this.requestQueue.length,
          priority,
          path: req.path
        });

        return; // Don't call next() - request is queued
      }

      // Process request immediately
      this.processRequest(req, res, next);
    };
  }

  /**
   * Get current throttling metrics
   */
  getMetrics(): RequestMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get throttling status for health checks
   */
  getStatus(): {
    healthy: boolean;
    activeRequests: number;
    queuedRequests: number;
    queueUtilization: number;
    concurrentUtilization: number;
  } {
    const metrics = this.getMetrics();
    const queueUtilization = (metrics.queuedRequests / this.config.maxQueueSize) * 100;
    const concurrentUtilization = (metrics.activeRequests / this.config.maxConcurrentRequests) * 100;

    return {
      healthy: queueUtilization < 80 && concurrentUtilization < 90,
      activeRequests: metrics.activeRequests,
      queuedRequests: metrics.queuedRequests,
      queueUtilization,
      concurrentUtilization
    };
  }

  /**
   * Shutdown the throttler
   */
  shutdown(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Clear all queued request timeouts
    for (const queuedRequest of this.requestQueue) {
      clearTimeout(queuedRequest.timeoutId);
    }

    this.requestQueue = [];
    this.activeRequests.clear();
    this.rateLimitWindows.clear();

    log('Request throttler shutdown complete');
  }
}

// Create and export the request throttler
export const requestThrottler = new RequestThrottler({
  maxRequestsPerMinute: 300,
  maxRequestsPerHour: 5000,
  maxConcurrentRequests: 50,
  maxQueueSize: 100,
  queueTimeoutMs: 30000,
  enablePriority: true,
  priorityRoutes: ['/api/health', '/api/auth'],
  enableMonitoring: true
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  requestThrottler.shutdown();
});

process.on('SIGINT', () => {
  requestThrottler.shutdown();
});