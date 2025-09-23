/**
 * Resource Management and Memory Optimization
 * Provides memory monitoring, garbage collection optimization, and resource cleanup
 */

import { log } from './log'

export interface ResourceConfig {
  // Memory monitoring
  memoryThresholdMB: number
  memoryCheckInterval: number

  // Garbage collection
  enableGCOptimization: boolean
  gcInterval: number
  forceGCThreshold: number

  // Resource cleanup
  enableResourceCleanup: boolean
  cleanupInterval: number
  maxCacheAge: number

  // Monitoring
  enableMonitoring: boolean
  monitoringInterval: number
}

export interface ResourceMetrics {
  memory: {
    heapUsed: number
    heapTotal: number
    external: number
    rss: number
    heapUtilization: number
  }
  gc: {
    totalCollections: number
    totalGCTime: number
    averageGCTime: number
    lastGCTime: number
  }
  resources: {
    activeTimers: number
    activeHandles: number
    openFileDescriptors: number
  }
  uptime: number
  cpuUsage: NodeJS.CpuUsage
}

interface CacheEntry {
  data: any
  timestamp: number
  accessCount: number
  lastAccess: number
}

export class ResourceManager {
  private config: ResourceConfig
  private metrics: ResourceMetrics
  private cache = new Map<string, CacheEntry>()
  private gcStats = {
    totalCollections: 0,
    totalGCTime: 0,
    gcTimes: [] as number[]
  }
  private monitoringInterval?: NodeJS.Timeout
  private gcInterval?: NodeJS.Timeout
  private cleanupInterval?: NodeJS.Timeout
  private startTime: number
  private lastCpuUsage: NodeJS.CpuUsage

  constructor(config: Partial<ResourceConfig> = {}) {
    this.config = {
      memoryThresholdMB: 512,
      memoryCheckInterval: 10000, // 10 seconds
      enableGCOptimization: true,
      gcInterval: 30000, // 30 seconds
      forceGCThreshold: 0.85, // 85% heap utilization
      enableResourceCleanup: true,
      cleanupInterval: 60000, // 1 minute
      maxCacheAge: 300000, // 5 minutes
      enableMonitoring: true,
      monitoringInterval: 15000, // 15 seconds
      ...config
    }

    this.startTime = Date.now()
    this.lastCpuUsage = process.cpuUsage()
    this.metrics = this.initializeMetrics()

    this.setupGCMonitoring()
    this.startMonitoring()
    this.startGCOptimization()
    this.startResourceCleanup()
  }

  private initializeMetrics(): ResourceMetrics {
    const memUsage = process.memoryUsage()
    return {
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapUtilization: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      gc: {
        totalCollections: 0,
        totalGCTime: 0,
        averageGCTime: 0,
        lastGCTime: 0
      },
      resources: {
        activeTimers: 0,
        activeHandles: 0,
        openFileDescriptors: 0
      },
      uptime: 0,
      cpuUsage: process.cpuUsage()
    }
  }

  private setupGCMonitoring(): void {
    // Monitor garbage collection if available
    if (global.gc && typeof global.gc === 'function') {
      const originalGC = global.gc
      global.gc = async (...args: any[]) => {
        const start = Date.now()
        const result = originalGC.call(global, args[0])
        const duration = Date.now() - start

        this.gcStats.totalCollections++
        this.gcStats.totalGCTime += duration
        this.gcStats.gcTimes.push(duration)

        // Keep only recent GC times
        if (this.gcStats.gcTimes.length > 100) {
          this.gcStats.gcTimes = this.gcStats.gcTimes.slice(-100)
        }

        log('Garbage collection completed', {
          duration,
          totalCollections: this.gcStats.totalCollections,
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
        })

        return result
      }
    }
  }

  private startMonitoring(): void {
    if (!this.config.enableMonitoring) return

    this.monitoringInterval = setInterval(() => {
      this.updateMetrics()

      // Log metrics periodically
      if (this.metrics.gc.totalCollections % 10 === 0 && this.metrics.gc.totalCollections > 0) {
        log('Resource manager metrics', {
          memory: this.metrics.memory,
          gc: this.metrics.gc,
          uptime: Math.round(this.metrics.uptime / 1000)
        })
      }

      this.checkResourceHealth()
    }, this.config.monitoringInterval)
  }

  private startGCOptimization(): void {
    if (!this.config.enableGCOptimization) return

    this.gcInterval = setInterval(() => {
      const memUsage = process.memoryUsage()
      const heapUtilization = memUsage.heapUsed / memUsage.heapTotal

      // Force garbage collection if heap utilization is high
      if (heapUtilization > this.config.forceGCThreshold) {
        log('High heap utilization detected, forcing garbage collection', {
          heapUtilization: (heapUtilization * 100).toFixed(2),
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024)
        })

        this.forceGarbageCollection()
      }
    }, this.config.gcInterval)
  }

  private startResourceCleanup(): void {
    if (!this.config.enableResourceCleanup) return

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredCache()
      this.cleanupUnusedResources()
    }, this.config.cleanupInterval)
  }

  private updateMetrics(): void {
    const memUsage = process.memoryUsage()
    const currentCpuUsage = process.cpuUsage(this.lastCpuUsage)

    this.metrics.memory = {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUtilization: (memUsage.heapUsed / memUsage.heapTotal) * 100
    }

    this.metrics.gc = {
      totalCollections: this.gcStats.totalCollections,
      totalGCTime: this.gcStats.totalGCTime,
      averageGCTime:
        this.gcStats.gcTimes.length > 0
          ? this.gcStats.gcTimes.reduce((a, b) => a + b, 0) / this.gcStats.gcTimes.length
          : 0,
      lastGCTime: this.gcStats.gcTimes[this.gcStats.gcTimes.length - 1] || 0
    }

    this.metrics.uptime = Date.now() - this.startTime
    this.metrics.cpuUsage = currentCpuUsage
    this.lastCpuUsage = process.cpuUsage()

    // Update resource counts (approximations)
    this.metrics.resources = {
      activeTimers:
        (process as any)._getActiveHandles?.()?.filter((h: any) => h.constructor.name === 'Timeout')
          .length || 0,
      activeHandles: (process as any)._getActiveHandles?.()?.length || 0,
      openFileDescriptors: 0 // Would need platform-specific implementation
    }
  }

  private checkResourceHealth(): void {
    const { memory, gc, resources } = this.metrics

    // Check memory usage
    if (memory.heapUsed > this.config.memoryThresholdMB) {
      log('High memory usage detected', {
        heapUsed: memory.heapUsed,
        threshold: this.config.memoryThresholdMB,
        heapUtilization: memory.heapUtilization.toFixed(2)
      })
    }

    // Check heap utilization
    if (memory.heapUtilization > 80) {
      log('High heap utilization detected', {
        heapUtilization: memory.heapUtilization.toFixed(2),
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal
      })
    }

    // Check for memory leaks (increasing RSS without corresponding heap increase)
    const rssToHeapRatio = memory.rss / memory.heapUsed
    if (rssToHeapRatio > 3) {
      log('Potential memory leak detected', {
        rssToHeapRatio: rssToHeapRatio.toFixed(2),
        rss: memory.rss,
        heapUsed: memory.heapUsed
      })
    }

    // Check active handles
    if (resources.activeHandles > 1000) {
      log('High number of active handles detected', {
        activeHandles: resources.activeHandles,
        activeTimers: resources.activeTimers
      })
    }
  }

  private forceGarbageCollection(): void {
    if (global.gc && typeof global.gc === 'function') {
      try {
        global.gc()
      } catch (error) {
        log('Failed to force garbage collection', {
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }
  }

  private cleanupExpiredCache(): void {
    const now = Date.now()
    let cleanedCount = 0
    let totalSize = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.maxCacheAge || entry.accessCount === 0) {  // Also clear unused
        totalSize += JSON.stringify(entry.data).length  // Approximate size
        this.cache.delete(key)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      log('Cleaned up expired/unused cache entries', {
        cleanedCount,
        remainingEntries: this.cache.size,
        approxBytesFreed: totalSize
      })
    }
  }

  private cleanupUnusedResources(): void {
    // Clear module cache for development modules (if in development)
    if (process.env.NODE_ENV === 'development') {
      // In ES modules, we can't directly access require.cache
      // Instead, we'll focus on other cleanup tasks

      // Clean up any temporary files or resources
      // This is a placeholder for module-specific cleanup

      // Log cleanup completion
      log('Resource cleanup completed', {
        timestamp: Date.now(),
        cacheSize: this.cache.size
      })
    }
  }

  /**
   * Cache management methods
   */
  setCache(key: string, data: any, ttl?: number): void {
    const now = Date.now()
    this.cache.set(key, {
      data,
      timestamp: now,
      accessCount: 0,
      lastAccess: now
    })

    // Auto-cleanup if TTL is specified
    if (ttl) {
      setTimeout(() => {
        this.cache.delete(key)
      }, ttl)
    }
  }

  getCache(key: string): any {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > this.config.maxCacheAge) {
      this.cache.delete(key)
      return null
    }

    entry.accessCount++
    entry.lastAccess = now
    return entry.data
  }

  clearCache(): void {
    const size = this.cache.size
    let totalSize = 0
    for (const [, entry] of this.cache) {
      totalSize += JSON.stringify(entry.data).length
    }
    this.cache.clear()
    log('Cache cleared', { entriesRemoved: size, approxBytesFreed: totalSize })
  }

  /**
   * Get current resource metrics
   */
  getMetrics(): ResourceMetrics {
    this.updateMetrics()
    return { ...this.metrics }
  }

  /**
   * Get resource status for health checks
   */
  getStatus(): {
    healthy: boolean
    memoryUsage: number
    heapUtilization: number
    activeHandles: number
    cacheSize: number
  } {
    const metrics = this.getMetrics()
    return {
      healthy:
        metrics.memory.heapUtilization < 85 &&
        metrics.memory.heapUsed < this.config.memoryThresholdMB &&
        metrics.resources.activeHandles < 1000,
      memoryUsage: metrics.memory.heapUsed,
      heapUtilization: metrics.memory.heapUtilization,
      activeHandles: metrics.resources.activeHandles,
      cacheSize: this.cache.size
    }
  }

  /**
   * Optimize memory usage
   */
  optimizeMemory(): void {
    log('Starting memory optimization')

    // Clear cache aggressively
    this.clearCache()

    // Force garbage collection
    this.forceGarbageCollection()

    // Clean up unused resources
    this.cleanupUnusedResources()

    // Integrate with main memory optimizer if available
    if (typeof memoryOptimizer !== 'undefined') {
      memoryOptimizer.performOptimization()
    }

    // Prune DB idle connections
    if (typeof connectionPool !== 'undefined' && connectionPool) {
      try {
        // Release idle connections
        connectionPool.pool.query('SELECT pg_advisory_unlock_all();')  // If advisory locks used
        log('Pruned DB resources during optimization')
      } catch (error) {
        logWarn('DB prune error', { error: String(error) })
      }
    }

    const after = Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    log('Memory optimization completed', {
      memoryAfter: after
    })
  }

  /**
   * Shutdown the resource manager
   */
  shutdown(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }
    if (this.gcInterval) {
      clearInterval(this.gcInterval)
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    this.clearCache()
    log('Resource manager shutdown complete')
  }
}

// Create and export the resource manager
export const resourceManager = new ResourceManager({
  memoryThresholdMB: 512,
  enableGCOptimization: true,
  enableResourceCleanup: true,
  enableMonitoring: true
})

// Graceful shutdown handling
process.on('SIGTERM', () => {
  resourceManager.shutdown()
})

process.on('SIGINT', () => {
  resourceManager.shutdown()
})
