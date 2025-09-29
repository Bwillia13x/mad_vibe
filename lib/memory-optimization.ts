/**
 * Emergency Memory Optimization
 * Provides aggressive memory management for high-utilization scenarios
 */

import { log, logWarn } from './log'

export interface MemoryOptimizationConfig {
  // Aggressive GC thresholds
  criticalHeapThreshold: number
  warningHeapThreshold: number

  // Cleanup intervals
  aggressiveCleanupInterval: number
  normalCleanupInterval: number

  // Cache management
  maxCacheSize: number
  cacheEvictionThreshold: number
}

class MemoryOptimizer {
  private config: MemoryOptimizationConfig
  private cleanupInterval: NodeJS.Timeout | null = null
  private isOptimizing = false

  constructor(config: Partial<MemoryOptimizationConfig> = {}) {
    this.config = {
      criticalHeapThreshold: 85, // 85% heap utilization
      warningHeapThreshold: 75, // 75% heap utilization
      aggressiveCleanupInterval: 5000, // 5 seconds
      normalCleanupInterval: 30000, // 30 seconds
      maxCacheSize: 100,
      cacheEvictionThreshold: 0.8,
      ...config
    }

    this.startMonitoring()
  }

  private startMonitoring(): void {
    this.scheduleCleanup()
  }

  private scheduleCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    const heapUtilization = this.getHeapUtilization()
    const interval =
      heapUtilization > this.config.criticalHeapThreshold
        ? this.config.aggressiveCleanupInterval
        : this.config.normalCleanupInterval

    this.cleanupInterval = setInterval(() => {
      this.performOptimization()
    }, interval)
  }

  private getHeapUtilization(): number {
    const memUsage = process.memoryUsage()
    return (memUsage.heapUsed / memUsage.heapTotal) * 100
  }

  private async performOptimization(): Promise<void> {
    if (this.isOptimizing) return

    this.isOptimizing = true
    const heapUtilization = this.getHeapUtilization()

    try {
      if (heapUtilization > this.config.criticalHeapThreshold) {
        await this.aggressiveOptimization()
      } else if (heapUtilization > this.config.warningHeapThreshold) {
        await this.normalOptimization()
      }

      // Reschedule based on current heap utilization
      this.scheduleCleanup()
    } catch (error) {
      logWarn('Memory optimization failed', {
        error: error instanceof Error ? error.message : String(error)
      })
    } finally {
      this.isOptimizing = false
    }
  }

  private async aggressiveOptimization(): Promise<void> {
    log('Starting aggressive memory optimization', {
      heapUtilization: this.getHeapUtilization().toFixed(2) + '%'
    })

    // Force garbage collection multiple times
    if (global.gc) {
      for (let i = 0; i < 5; i++) {  // Increase to 5 for more thorough GC
        global.gc()
        await this.sleep(50)  // Shorter sleep for faster cycles
      }
    }

    // Clear global caches and integrate resource manager
    this.clearGlobalCaches()
    // Note: resourceManager integration disabled to avoid circular dependencies
    // if (typeof resourceManager !== 'undefined') {
    //   resourceManager.optimizeMemory()
    // }

    // Prune idle DB connections if pool exists
    // Note: connectionPool integration disabled to avoid circular dependencies
    // if (typeof connectionPool !== 'undefined' && connectionPool) {
    //   try {
    //     // Force release of idle connections
    //     await connectionPool.pool.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid() AND state = \'idle\';')
    //     log('Pruned idle database connections during optimization')
    //   } catch (error) {
    //     logWarn('Failed to prune idle DB connections', { error: String(error) })
    //   }
    // }

    // Clear session or other app-specific caches (assuming session-store exists)
    // Note: clearSessionCache integration disabled to avoid undefined reference
    // try {
    //   if (typeof clearSessionCache === 'function') {
    //     clearSessionCache()
    //   }
    // } catch (error) {
    //   // Ignore if not available
    // }

    // Force process to release memory back to OS
    if (process.platform !== 'win32') {
      try {
        process.nextTick(() => {
          if (global.gc) global.gc()
        })
      } catch (error) {
        // Ignore errors
      }
    }

    const afterUtil = this.getHeapUtilization()
    const heapUtilization = this.getHeapUtilization()
    log('Aggressive memory optimization completed', {
      heapUtilization: afterUtil.toFixed(2) + '%',
      reduction: (heapUtilization - afterUtil).toFixed(2) + '%'
    })
  }

  private async normalOptimization(): Promise<void> {
    log('Starting normal memory optimization')

    if (global.gc) {
      global.gc()
    }

    this.clearGlobalCaches()

    log('Normal memory optimization completed')
  }

  private clearGlobalCaches(): void {
    // Clear any module caches that might be holding references (ESM compatible)
    try {
      // In ESM, no require.cache; clear known global caches instead
      const globalAny = global as any
      if (typeof globalAny.gcCache === 'object' && 'clear' in globalAny.gcCache) {
        globalAny.gcCache.clear()
      }
      // Clear other known caches (e.g., from resource-manager)
      // Note: resourceManager integration disabled to avoid circular dependencies
      // if (typeof resourceManager !== 'undefined' && resourceManager.clearCache) {
      //   resourceManager.clearCache()
      // }
      log('Cleared global caches (ESM mode)')
    } catch (error) {
      logWarn('Global cache clearing error', { error: String(error) })
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  public getMetrics() {
    const memUsage = process.memoryUsage()
    return {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUtilization: this.getHeapUtilization(),
      external: Math.round(memUsage.external / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
      isOptimizing: this.isOptimizing
    }
  }

  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

// Create and export the memory optimizer
export const memoryOptimizer = new MemoryOptimizer({
  criticalHeapThreshold: 80, // Lower threshold for more aggressive cleanup
  warningHeapThreshold: 70,
  aggressiveCleanupInterval: 3000, // More frequent cleanup
  normalCleanupInterval: 15000
})

// Ensure cleanup on process exit
process.on('exit', () => {
  memoryOptimizer.shutdown()
})

process.on('SIGINT', () => {
  memoryOptimizer.shutdown()
  process.exit(0)
})

process.on('SIGTERM', () => {
  memoryOptimizer.shutdown()
  process.exit(0)
})
