/**
 * Load Balancing and Horizontal Scaling Support
 * Provides load balancing configuration, session management, and auto-scaling capabilities
 */

import { log } from './log'
import { getEnvVar } from './env-security'

export interface LoadBalancerConfig {
  // Load balancing strategy
  strategy: 'round-robin' | 'least-connections' | 'weighted' | 'ip-hash'

  // Health checking
  healthCheckInterval: number
  healthCheckTimeout: number
  healthCheckPath: string

  // Session management
  sessionAffinity: boolean
  sessionTimeout: number

  // Auto-scaling
  enableAutoScaling: boolean
  minInstances: number
  maxInstances: number
  scaleUpThreshold: number
  scaleDownThreshold: number
  scaleUpCooldown: number
  scaleDownCooldown: number

  // Monitoring
  enableMonitoring: boolean
  monitoringInterval: number
}

export interface ServerInstance {
  id: string
  host: string
  port: number
  weight: number
  healthy: boolean
  connections: number
  lastHealthCheck: number
  responseTime: number
  errorCount: number
  totalRequests: number
}

export interface LoadBalancerMetrics {
  totalInstances: number
  healthyInstances: number
  totalConnections: number
  totalRequests: number
  averageResponseTime: number
  errorRate: number
  currentLoad: number
  scalingEvents: number
  [key: string]: unknown
}

export class LoadBalancer {
  private config: LoadBalancerConfig
  private instances: Map<string, ServerInstance> = new Map()
  private sessionMap: Map<string, string> = new Map() // sessionId -> instanceId
  private currentIndex = 0 // For round-robin
  private metrics: LoadBalancerMetrics
  private healthCheckInterval?: NodeJS.Timeout
  private monitoringInterval?: NodeJS.Timeout
  private lastScaleEvent = 0

  constructor(config: Partial<LoadBalancerConfig> = {}) {
    this.config = {
      strategy: 'round-robin',
      healthCheckInterval: 30000, // 30 seconds
      healthCheckTimeout: 5000, // 5 seconds
      healthCheckPath: '/api/health',
      sessionAffinity: true,
      sessionTimeout: 3600000, // 1 hour
      enableAutoScaling: true,
      minInstances: 2,
      maxInstances: 10,
      scaleUpThreshold: 80, // 80% load
      scaleDownThreshold: 30, // 30% load
      scaleUpCooldown: 300000, // 5 minutes
      scaleDownCooldown: 600000, // 10 minutes
      enableMonitoring: true,
      monitoringInterval: 60000, // 1 minute
      ...config
    }

    this.metrics = this.initializeMetrics()
    this.startHealthChecks()
    this.startMonitoring()
  }

  private initializeMetrics(): LoadBalancerMetrics {
    return {
      totalInstances: 0,
      healthyInstances: 0,
      totalConnections: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      currentLoad: 0,
      scalingEvents: 0
    }
  }

  /**
   * Add a server instance to the load balancer
   */
  addInstance(
    instance: Omit<
      ServerInstance,
      | 'healthy'
      | 'connections'
      | 'lastHealthCheck'
      | 'responseTime'
      | 'errorCount'
      | 'totalRequests'
    >
  ): void {
    const serverInstance: ServerInstance = {
      ...instance,
      healthy: true,
      connections: 0,
      lastHealthCheck: Date.now(),
      responseTime: 0,
      errorCount: 0,
      totalRequests: 0
    }

    this.instances.set(instance.id, serverInstance)
    log('Server instance added to load balancer', {
      instanceId: instance.id,
      host: instance.host,
      port: instance.port,
      weight: instance.weight
    })
  }

  /**
   * Remove a server instance from the load balancer
   */
  removeInstance(instanceId: string): void {
    const instance = this.instances.get(instanceId)
    if (instance) {
      this.instances.delete(instanceId)

      // Remove session mappings for this instance
      for (const [sessionId, mappedInstanceId] of this.sessionMap.entries()) {
        if (mappedInstanceId === instanceId) {
          this.sessionMap.delete(sessionId)
        }
      }

      log('Server instance removed from load balancer', {
        instanceId,
        host: instance.host,
        port: instance.port
      })
    }
  }

  /**
   * Get the next server instance based on load balancing strategy
   */
  getNextInstance(sessionId?: string): ServerInstance | null {
    const healthyInstances = Array.from(this.instances.values()).filter((i) => i.healthy)

    if (healthyInstances.length === 0) {
      log('No healthy instances available')
      return null
    }

    // Check session affinity first
    if (sessionId && this.config.sessionAffinity) {
      const mappedInstanceId = this.sessionMap.get(sessionId)
      if (mappedInstanceId) {
        const instance = this.instances.get(mappedInstanceId)
        if (instance && instance.healthy) {
          return instance
        } else {
          // Remove stale session mapping
          this.sessionMap.delete(sessionId)
        }
      }
    }

    let selectedInstance: ServerInstance

    switch (this.config.strategy) {
      case 'round-robin':
        selectedInstance = this.selectRoundRobin(healthyInstances)
        break

      case 'least-connections':
        selectedInstance = this.selectLeastConnections(healthyInstances)
        break

      case 'weighted':
        selectedInstance = this.selectWeighted(healthyInstances)
        break

      case 'ip-hash':
        selectedInstance = this.selectIPHash(healthyInstances, sessionId || '')
        break

      default:
        selectedInstance = healthyInstances[0]
    }

    // Create session mapping if session affinity is enabled
    if (sessionId && this.config.sessionAffinity) {
      this.sessionMap.set(sessionId, selectedInstance.id)

      // Clean up expired sessions
      setTimeout(() => {
        this.sessionMap.delete(sessionId)
      }, this.config.sessionTimeout)
    }

    return selectedInstance
  }

  private selectRoundRobin(instances: ServerInstance[]): ServerInstance {
    const instance = instances[this.currentIndex % instances.length]
    this.currentIndex++
    return instance
  }

  private selectLeastConnections(instances: ServerInstance[]): ServerInstance {
    return instances.reduce((min, current) =>
      current.connections < min.connections ? current : min
    )
  }

  private selectWeighted(instances: ServerInstance[]): ServerInstance {
    const totalWeight = instances.reduce((sum, instance) => sum + instance.weight, 0)
    let random = Math.random() * totalWeight

    for (const instance of instances) {
      random -= instance.weight
      if (random <= 0) {
        return instance
      }
    }

    return instances[0] // Fallback
  }

  private selectIPHash(instances: ServerInstance[], identifier: string): ServerInstance {
    // Simple hash function for consistent routing
    let hash = 0
    for (let i = 0; i < identifier.length; i++) {
      const char = identifier.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }

    const index = Math.abs(hash) % instances.length
    return instances[index]
  }

  /**
   * Record request completion for an instance
   */
  recordRequest(instanceId: string, responseTime: number, success: boolean): void {
    const instance = this.instances.get(instanceId)
    if (instance) {
      instance.totalRequests++
      instance.responseTime = (instance.responseTime + responseTime) / 2 // Moving average

      if (!success) {
        instance.errorCount++
      }
    }
  }

  /**
   * Update connection count for an instance
   */
  updateConnections(instanceId: string, delta: number): void {
    const instance = this.instances.get(instanceId)
    if (instance) {
      instance.connections = Math.max(0, instance.connections + delta)
    }
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks()
    }, this.config.healthCheckInterval)
  }

  private async performHealthChecks(): Promise<void> {
    const promises = Array.from(this.instances.values()).map((instance) =>
      this.checkInstanceHealth(instance)
    )

    await Promise.allSettled(promises)
    this.updateMetrics()
  }

  private async checkInstanceHealth(instance: ServerInstance): Promise<void> {
    const startTime = Date.now()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.healthCheckTimeout)

      const response = await fetch(
        `http://${instance.host}:${instance.port}${this.config.healthCheckPath}`,
        {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'User-Agent': 'LoadBalancer-HealthCheck'
          }
        }
      )

      clearTimeout(timeoutId)

      const responseTime = Date.now() - startTime
      instance.responseTime = responseTime
      instance.lastHealthCheck = Date.now()

      if (response.ok) {
        if (!instance.healthy) {
          log('Instance recovered', {
            instanceId: instance.id,
            host: instance.host,
            port: instance.port,
            responseTime
          })
        }
        instance.healthy = true
      } else {
        instance.healthy = false
        instance.errorCount++
        log('Instance health check failed', {
          instanceId: instance.id,
          status: response.status,
          responseTime
        })
      }
    } catch (error) {
      instance.healthy = false
      instance.errorCount++
      instance.lastHealthCheck = Date.now()

      log('Instance health check error', {
        instanceId: instance.id,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  private startMonitoring(): void {
    if (!this.config.enableMonitoring) return

    this.monitoringInterval = setInterval(() => {
      this.updateMetrics()
      this.checkAutoScaling()

      // Log metrics periodically
      log('Load balancer metrics', this.metrics)
    }, this.config.monitoringInterval)
  }

  private updateMetrics(): void {
    const instances = Array.from(this.instances.values())
    const healthyInstances = instances.filter((i) => i.healthy)

    this.metrics.totalInstances = instances.length
    this.metrics.healthyInstances = healthyInstances.length
    this.metrics.totalConnections = instances.reduce((sum, i) => sum + i.connections, 0)
    this.metrics.totalRequests = instances.reduce((sum, i) => sum + i.totalRequests, 0)

    if (healthyInstances.length > 0) {
      this.metrics.averageResponseTime =
        healthyInstances.reduce((sum, i) => sum + i.responseTime, 0) / healthyInstances.length

      const totalErrors = instances.reduce((sum, i) => sum + i.errorCount, 0)
      this.metrics.errorRate =
        this.metrics.totalRequests > 0 ? (totalErrors / this.metrics.totalRequests) * 100 : 0

      // Calculate current load as percentage of capacity
      const maxConnections = healthyInstances.length * 100 // Assume 100 connections per instance
      this.metrics.currentLoad = (this.metrics.totalConnections / maxConnections) * 100
    }
  }

  private checkAutoScaling(): void {
    if (!this.config.enableAutoScaling) return

    const now = Date.now()
    const timeSinceLastScale = now - this.lastScaleEvent

    // Scale up if load is high and cooldown period has passed
    if (
      this.metrics.currentLoad > this.config.scaleUpThreshold &&
      this.metrics.healthyInstances < this.config.maxInstances &&
      timeSinceLastScale > this.config.scaleUpCooldown
    ) {
      this.triggerScaleUp()
      this.lastScaleEvent = now
    }

    // Scale down if load is low and cooldown period has passed
    else if (
      this.metrics.currentLoad < this.config.scaleDownThreshold &&
      this.metrics.healthyInstances > this.config.minInstances &&
      timeSinceLastScale > this.config.scaleDownCooldown
    ) {
      this.triggerScaleDown()
      this.lastScaleEvent = now
    }
  }

  private triggerScaleUp(): void {
    this.metrics.scalingEvents++
    log('Triggering scale up', {
      currentLoad: this.metrics.currentLoad,
      healthyInstances: this.metrics.healthyInstances,
      maxInstances: this.config.maxInstances
    })

    // In a real implementation, this would trigger container orchestration
    // For now, we just log the scaling event
    this.emitScalingEvent('scale-up', {
      reason: 'high-load',
      currentLoad: this.metrics.currentLoad,
      targetInstances: Math.min(this.metrics.healthyInstances + 1, this.config.maxInstances)
    })
  }

  private triggerScaleDown(): void {
    this.metrics.scalingEvents++
    log('Triggering scale down', {
      currentLoad: this.metrics.currentLoad,
      healthyInstances: this.metrics.healthyInstances,
      minInstances: this.config.minInstances
    })

    // In a real implementation, this would trigger container orchestration
    this.emitScalingEvent('scale-down', {
      reason: 'low-load',
      currentLoad: this.metrics.currentLoad,
      targetInstances: Math.max(this.metrics.healthyInstances - 1, this.config.minInstances)
    })
  }

  private emitScalingEvent(type: 'scale-up' | 'scale-down', data: any): void {
    // This would integrate with container orchestration systems like Kubernetes, Docker Swarm, etc.
    log(`Scaling event: ${type}`, data)

    // Example integration points:
    // - Kubernetes HPA (Horizontal Pod Autoscaler)
    // - Docker Swarm scaling
    // - AWS Auto Scaling Groups
    // - Custom scaling webhooks
  }

  /**
   * Get load balancer metrics
   */
  getMetrics(): LoadBalancerMetrics {
    this.updateMetrics()
    return { ...this.metrics }
  }

  /**
   * Get load balancer status
   */
  getStatus(): {
    healthy: boolean
    totalInstances: number
    healthyInstances: number
    currentLoad: number
    sessionCount: number
  } {
    const metrics = this.getMetrics()
    return {
      healthy: metrics.healthyInstances > 0 && metrics.currentLoad < 90,
      totalInstances: metrics.totalInstances,
      healthyInstances: metrics.healthyInstances,
      currentLoad: metrics.currentLoad,
      sessionCount: this.sessionMap.size
    }
  }

  /**
   * Get all instances with their status
   */
  getInstances(): ServerInstance[] {
    return Array.from(this.instances.values())
  }

  /**
   * Shutdown the load balancer
   */
  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }

    this.instances.clear()
    this.sessionMap.clear()

    log('Load balancer shutdown complete')
  }
}

// Create and export load balancer instance
export const loadBalancer = new LoadBalancer({
  strategy: (getEnvVar('LB_STRATEGY') as any) || 'round-robin',
  enableAutoScaling: getEnvVar('ENABLE_AUTO_SCALING') === 'true',
  minInstances: parseInt(getEnvVar('MIN_INSTANCES') || '2'),
  maxInstances: parseInt(getEnvVar('MAX_INSTANCES') || '10'),
  sessionAffinity: getEnvVar('SESSION_AFFINITY') !== 'false'
})

// Graceful shutdown handling
process.on('SIGTERM', () => {
  loadBalancer.shutdown()
})

process.on('SIGINT', () => {
  loadBalancer.shutdown()
})
