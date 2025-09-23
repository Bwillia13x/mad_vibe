/**
 * Memory optimization utilities to prevent memory leaks and improve performance
 */

// Extend Performance interface to include memory API
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number
      totalJSHeapSize: number
      jsHeapSizeLimit: number
    }
  }
}

interface MemoryOptimizationConfig {
  maxHistoryItems?: number
  cleanupInterval?: number
  heapThreshold?: number
}

const DEFAULT_CONFIG: Required<MemoryOptimizationConfig> = {
  maxHistoryItems: 100,
  cleanupInterval: 30000, // 30 seconds
  heapThreshold: 0.85 // 85% heap usage
}

export class MemoryOptimizer {
  private config: Required<MemoryOptimizationConfig>
  private cleanupTimer: NodeJS.Timeout | null = null
  private isCleanupScheduled = false

  constructor(config: MemoryOptimizationConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Clean up old data structures to free memory
   */
  cleanup(): void {
    if (this.isCleanupScheduled) return

    this.isCleanupScheduled = true

    // Use requestIdleCallback if available for non-blocking cleanup
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(
        () => {
          this.performCleanup()
          this.isCleanupScheduled = false
        },
        { timeout: 5000 }
      )
    } else {
      // Fallback to setTimeout for older browsers
      setTimeout(() => {
        this.performCleanup()
        this.isCleanupScheduled = false
      }, 0)
    }
  }

  performCleanup(): void {
    // Force garbage collection if available (development only)
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        ;(window as any).gc()
      } catch (error) {
        // Ignore gc errors
      }
    }

    this.logMemoryUsage('After cleanup')
  }

  /**
   * Limit array size to prevent memory bloat
   */
  limitArraySize<T>(array: T[], maxSize: number = this.config.maxHistoryItems): T[] {
    if (array.length <= maxSize) return array

    const excess = array.length - maxSize
    const trimmed = array.slice(excess)

    this.logMemoryUsage(`Trimmed array from ${array.length} to ${trimmed.length} items`)
    return trimmed
  }

  /**
   * Check if memory usage is high and trigger cleanup
   */
  shouldCleanup(): boolean {
    if (typeof performance === 'undefined' || !performance.memory) {
      return false
    }

    const memory = performance.memory
    const heapUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit

    return heapUsage > this.config.heapThreshold
  }

  /**
   * Start periodic cleanup
   */
  startPeriodicCleanup(): void {
    if (this.cleanupTimer) return

    this.cleanupTimer = setInterval(() => {
      if (this.shouldCleanup()) {
        this.cleanup()
      }
    }, this.config.cleanupInterval)
  }

  /**
   * Stop periodic cleanup
   */
  stopPeriodicCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /**
   * Get current memory usage information
   */
  getMemoryInfo(): {
    used: number
    total: number
    usagePercentage: number
    isHighUsage: boolean
  } {
    if (typeof performance === 'undefined' || !performance.memory) {
      return {
        used: 0,
        total: 0,
        usagePercentage: 0,
        isHighUsage: false
      }
    }

    const memory = performance.memory
    const usagePercentage = memory.usedJSHeapSize / memory.jsHeapSizeLimit

    return {
      used: memory.usedJSHeapSize,
      total: memory.jsHeapSizeLimit,
      usagePercentage,
      isHighUsage: usagePercentage > this.config.heapThreshold
    }
  }

  private logMemoryUsage(context: string): void {
    const memoryInfo = this.getMemoryInfo()

    if (memoryInfo.isHighUsage) {
      console.warn(`MemoryOptimizer: High memory usage detected (${context})`, {
        used: `${Math.round(memoryInfo.used / 1024 / 1024)}MB`,
        total: `${Math.round(memoryInfo.total / 1024 / 1024)}MB`,
        percentage: `${Math.round(memoryInfo.usagePercentage * 100)}%`
      })
    } else {
      console.debug(`MemoryOptimizer: Memory usage (${context})`, {
        used: `${Math.round(memoryInfo.used / 1024 / 1024)}MB`,
        total: `${Math.round(memoryInfo.total / 1024 / 1024)}MB`,
        percentage: `${Math.round(memoryInfo.usagePercentage * 100)}%`
      })
    }
  }
}

// Create singleton instance
export const memoryOptimizer = new MemoryOptimizer()

// Start periodic cleanup
if (typeof window !== 'undefined') {
  memoryOptimizer.startPeriodicCleanup()
}
