/**
 * Emergency Memory Optimization
 * Provides aggressive memory management for high-utilization scenarios
 */

import { log, logWarn } from './log';

export interface MemoryOptimizationConfig {
  // Aggressive GC thresholds
  criticalHeapThreshold: number;
  warningHeapThreshold: number;
  
  // Cleanup intervals
  aggressiveCleanupInterval: number;
  normalCleanupInterval: number;
  
  // Cache management
  maxCacheSize: number;
  cacheEvictionThreshold: number;
}

class MemoryOptimizer {
  private config: MemoryOptimizationConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isOptimizing = false;

  constructor(config: Partial<MemoryOptimizationConfig> = {}) {
    this.config = {
      criticalHeapThreshold: 85, // 85% heap utilization
      warningHeapThreshold: 75,  // 75% heap utilization
      aggressiveCleanupInterval: 5000,  // 5 seconds
      normalCleanupInterval: 30000,     // 30 seconds
      maxCacheSize: 100,
      cacheEvictionThreshold: 0.8,
      ...config
    };

    this.startMonitoring();
  }

  private startMonitoring(): void {
    this.scheduleCleanup();
  }

  private scheduleCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    const heapUtilization = this.getHeapUtilization();
    const interval = heapUtilization > this.config.criticalHeapThreshold 
      ? this.config.aggressiveCleanupInterval 
      : this.config.normalCleanupInterval;

    this.cleanupInterval = setInterval(() => {
      this.performOptimization();
    }, interval);
  }

  private getHeapUtilization(): number {
    const memUsage = process.memoryUsage();
    return (memUsage.heapUsed / memUsage.heapTotal) * 100;
  }

  private async performOptimization(): Promise<void> {
    if (this.isOptimizing) return;
    
    this.isOptimizing = true;
    const heapUtilization = this.getHeapUtilization();

    try {
      if (heapUtilization > this.config.criticalHeapThreshold) {
        await this.aggressiveOptimization();
      } else if (heapUtilization > this.config.warningHeapThreshold) {
        await this.normalOptimization();
      }

      // Reschedule based on current heap utilization
      this.scheduleCleanup();
    } catch (error) {
      logWarn('Memory optimization failed', { error: error instanceof Error ? error.message : String(error) });
    } finally {
      this.isOptimizing = false;
    }
  }

  private async aggressiveOptimization(): Promise<void> {
    log('Starting aggressive memory optimization', { 
      heapUtilization: this.getHeapUtilization().toFixed(2) + '%' 
    });

    // Force garbage collection multiple times
    if (global.gc) {
      for (let i = 0; i < 3; i++) {
        global.gc();
        await this.sleep(100);
      }
    }

    // Clear any global caches
    this.clearGlobalCaches();

    // Force process to release memory back to OS
    if (process.platform !== 'win32') {
      try {
        process.nextTick(() => {
          if (global.gc) global.gc();
        });
      } catch (error) {
        // Ignore errors
      }
    }

    log('Aggressive memory optimization completed', { 
      heapUtilization: this.getHeapUtilization().toFixed(2) + '%' 
    });
  }

  private async normalOptimization(): Promise<void> {
    log('Starting normal memory optimization');

    if (global.gc) {
      global.gc();
    }

    this.clearGlobalCaches();

    log('Normal memory optimization completed');
  }

  private clearGlobalCaches(): void {
    // Clear any module caches that might be holding references
    try {
      // Clear require cache for non-core modules (be very careful with this)
      const moduleKeys = Object.keys(require.cache);
      const nonCoreModules = moduleKeys.filter(key => 
        !key.includes('node_modules') && 
        !key.includes('/lib/') &&
        key.includes('/dist/') // Only clear built files
      );
      
      // Only clear a few at a time to avoid breaking the app
      nonCoreModules.slice(0, 5).forEach(key => {
        delete require.cache[key];
      });
    } catch (error) {
      // Ignore cache clearing errors
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getMetrics() {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUtilization: this.getHeapUtilization(),
      external: Math.round(memUsage.external / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
      isOptimizing: this.isOptimizing
    };
  }

  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Create and export the memory optimizer
export const memoryOptimizer = new MemoryOptimizer({
  criticalHeapThreshold: 80, // Lower threshold for more aggressive cleanup
  warningHeapThreshold: 70,
  aggressiveCleanupInterval: 3000, // More frequent cleanup
  normalCleanupInterval: 15000
});

// Ensure cleanup on process exit
process.on('exit', () => {
  memoryOptimizer.shutdown();
});

process.on('SIGINT', () => {
  memoryOptimizer.shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  memoryOptimizer.shutdown();
  process.exit(0);
});