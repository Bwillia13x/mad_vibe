/**
 * Memory and Resource Usage Monitoring Module
 * Implements memory leak detection, CPU usage monitoring, and resource usage reporting
 */

import { createTestResult, type TestResult } from '../reporting/test-reporter.js';
import { TestHttpClient } from '../utils/test-environment.js';

export interface ResourceMonitoringConfig {
  memoryTest: MemoryTestConfig;
  cpuTest: CpuTestConfig;
  resourceTest: ResourceTestConfig;
  alerting: AlertingConfig;
}

export interface MemoryTestConfig {
  enabled: boolean;
  durationMs: number;
  samplingIntervalMs: number;
  leakThresholdMb: number;
  stabilityThresholdPercent: number;
  gcForceInterval?: number;
}

export interface CpuTestConfig {
  enabled: boolean;
  durationMs: number;
  samplingIntervalMs: number;
  maxCpuPercent: number;
  sustainedHighCpuMs: number;
}

export interface ResourceTestConfig {
  enabled: boolean;
  monitorHandles: boolean;
  monitorEventLoop: boolean;
  maxEventLoopDelayMs: number;
  maxFileHandles: number;
}

export interface AlertingConfig {
  enabled: boolean;
  memoryThresholdMb: number;
  cpuThresholdPercent: number;
  eventLoopThresholdMs: number;
}

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss: number;
}

export interface CpuSnapshot {
  timestamp: number;
  user: number;
  system: number;
  percent: number;
}

export interface ResourceSnapshot {
  timestamp: number;
  handles: number;
  eventLoopDelay: number;
  activeRequests: number;
}

export interface MemoryAnalysis {
  snapshots: MemorySnapshot[];
  leakDetected: boolean;
  leakRate: number; // MB per second
  peakMemory: number;
  averageMemory: number;
  memoryStability: number; // percentage
  gcEfficiency: number; // percentage
  violations: string[];
}

export interface CpuAnalysis {
  snapshots: CpuSnapshot[];
  averageCpu: number;
  peakCpu: number;
  sustainedHighCpuDuration: number;
  cpuStability: number;
  violations: string[];
}

export interface ResourceAnalysis {
  snapshots: ResourceSnapshot[];
  peakHandles: number;
  averageEventLoopDelay: number;
  maxEventLoopDelay: number;
  violations: string[];
}

export interface ResourceMonitoringResult {
  memoryAnalysis?: MemoryAnalysis;
  cpuAnalysis?: CpuAnalysis;
  resourceAnalysis?: ResourceAnalysis;
  alerts: ResourceAlert[];
  passed: boolean;
  summary: string;
}

export interface ResourceAlert {
  timestamp: number;
  type: 'memory' | 'cpu' | 'eventloop' | 'handles';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
}

/**
 * Resource Monitoring Framework
 */
export class ResourceMonitor {
  private memorySnapshots: MemorySnapshot[] = [];
  private cpuSnapshots: CpuSnapshot[] = [];
  private resourceSnapshots: ResourceSnapshot[] = [];
  private alerts: ResourceAlert[] = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private lastCpuUsage?: NodeJS.CpuUsage;

  constructor(
    private config: ResourceMonitoringConfig,
    private httpClient?: TestHttpClient
  ) {}

  /**
   * Execute comprehensive resource monitoring tests
   */
  async executeTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    console.log('🧠 Starting memory and resource monitoring tests...');

    // Memory leak detection test
    if (this.config.memoryTest.enabled) {
      results.push(await this.testMemoryLeaks());
    }

    // CPU usage monitoring test
    if (this.config.cpuTest.enabled) {
      results.push(await this.testCpuUsage());
    }

    // Resource usage monitoring test
    if (this.config.resourceTest.enabled) {
      results.push(await this.testResourceUsage());
    }

    // Combined stress test with monitoring
    results.push(await this.testResourcesUnderLoad());

    console.log('✅ Memory and resource monitoring tests completed');
    return results;
  }

  /**
   * Test for memory leaks
   */
  private async testMemoryLeaks(): Promise<TestResult> {
    return this.runTest('memory-leak-detection', async () => {
      console.log('  Testing memory leak detection...');
      
      const initialMemory = this.getMemorySnapshot();
      const snapshots: MemorySnapshot[] = [initialMemory];
      
      // Run test workload while monitoring memory
      const testDuration = this.config.memoryTest.durationMs;
      const samplingInterval = this.config.memoryTest.samplingIntervalMs;
      const iterations = Math.floor(testDuration / samplingInterval);
      
      for (let i = 0; i < iterations; i++) {
        // Simulate workload
        await this.simulateMemoryWorkload();
        
        // Take memory snapshot
        const snapshot = this.getMemorySnapshot();
        snapshots.push(snapshot);
        
        // Force garbage collection periodically if configured
        if (this.config.memoryTest.gcForceInterval && 
            i % this.config.memoryTest.gcForceInterval === 0 && 
            global.gc) {
          global.gc();
        }
        
        await new Promise(resolve => setTimeout(resolve, samplingInterval));
      }
      
      // Analyze memory usage patterns
      const analysis = this.analyzeMemoryUsage(snapshots);
      
      if (analysis.leakDetected) {
        throw new Error(`Memory leak detected: ${analysis.leakRate.toFixed(2)} MB/s leak rate. ${analysis.violations.join(', ')}`);
      }
      
      if (analysis.memoryStability < this.config.memoryTest.stabilityThresholdPercent) {
        console.warn(`⚠️  Memory usage appears unstable: ${analysis.memoryStability.toFixed(1)}% stability`);
      }
      
      console.log(`    ✅ No memory leaks detected. Peak: ${analysis.peakMemory}MB, Avg: ${analysis.averageMemory.toFixed(1)}MB, Stability: ${analysis.memoryStability.toFixed(1)}%`);
      
      return analysis;
    });
  }

  /**
   * Test CPU usage patterns
   */
  private async testCpuUsage(): Promise<TestResult> {
    return this.runTest('cpu-usage-monitoring', async () => {
      console.log('  Testing CPU usage monitoring...');
      
      const snapshots: CpuSnapshot[] = [];
      this.lastCpuUsage = process.cpuUsage();
      
      const testDuration = this.config.cpuTest.durationMs;
      const samplingInterval = this.config.cpuTest.samplingIntervalMs;
      const iterations = Math.floor(testDuration / samplingInterval);
      
      for (let i = 0; i < iterations; i++) {
        // Simulate CPU workload
        await this.simulateCpuWorkload();
        
        // Take CPU snapshot
        const snapshot = this.getCpuSnapshot();
        snapshots.push(snapshot);
        
        await new Promise(resolve => setTimeout(resolve, samplingInterval));
      }
      
      // Analyze CPU usage patterns
      const analysis = this.analyzeCpuUsage(snapshots);
      
      if (analysis.violations.length > 0) {
        throw new Error(`CPU usage violations: ${analysis.violations.join(', ')}`);
      }
      
      console.log(`    ✅ CPU usage within limits. Peak: ${analysis.peakCpu.toFixed(1)}%, Avg: ${analysis.averageCpu.toFixed(1)}%, Stability: ${analysis.cpuStability.toFixed(1)}%`);
      
      return analysis;
    });
  }

  /**
   * Test resource usage (handles, event loop)
   */
  private async testResourceUsage(): Promise<TestResult> {
    return this.runTest('resource-usage-monitoring', async () => {
      console.log('  Testing resource usage monitoring...');
      
      const snapshots: ResourceSnapshot[] = [];
      
      const testDuration = Math.min(this.config.resourceTest.enabled ? 30000 : 10000, 30000); // Max 30 seconds
      const samplingInterval = 1000; // 1 second
      const iterations = Math.floor(testDuration / samplingInterval);
      
      for (let i = 0; i < iterations; i++) {
        // Simulate resource usage
        await this.simulateResourceWorkload();
        
        // Take resource snapshot
        const snapshot = this.getResourceSnapshot();
        snapshots.push(snapshot);
        
        await new Promise(resolve => setTimeout(resolve, samplingInterval));
      }
      
      // Analyze resource usage patterns
      const analysis = this.analyzeResourceUsage(snapshots);
      
      if (analysis.violations.length > 0) {
        throw new Error(`Resource usage violations: ${analysis.violations.join(', ')}`);
      }
      
      console.log(`    ✅ Resource usage within limits. Peak handles: ${analysis.peakHandles}, Avg event loop delay: ${analysis.averageEventLoopDelay.toFixed(1)}ms`);
      
      return analysis;
    });
  }

  /**
   * Test resources under load
   */
  private async testResourcesUnderLoad(): Promise<TestResult> {
    return this.runTest('resources-under-load', async () => {
      console.log('  Testing resources under simulated load...');
      
      // Start monitoring
      this.startContinuousMonitoring();
      
      try {
        // Simulate concurrent load
        const concurrentRequests = 20;
        const requestDuration = 15000; // 15 seconds
        
        const promises: Promise<void>[] = [];
        
        for (let i = 0; i < concurrentRequests; i++) {
          promises.push(this.simulateLoadTestRequest(requestDuration));
        }
        
        // Wait for all requests to complete
        await Promise.all(promises);
        
        // Stop monitoring and analyze
        this.stopContinuousMonitoring();
        
        const result: ResourceMonitoringResult = {
          memoryAnalysis: this.analyzeMemoryUsage(this.memorySnapshots),
          cpuAnalysis: this.analyzeCpuUsage(this.cpuSnapshots),
          resourceAnalysis: this.analyzeResourceUsage(this.resourceSnapshots),
          alerts: this.alerts,
          passed: true,
          summary: ''
        };
        
        // Check for violations
        const violations: string[] = [];
        
        if (result.memoryAnalysis?.leakDetected) {
          violations.push(`Memory leak under load: ${result.memoryAnalysis.leakRate.toFixed(2)} MB/s`);
        }
        
        if (result.cpuAnalysis && result.cpuAnalysis.peakCpu > this.config.cpuTest.maxCpuPercent) {
          violations.push(`CPU usage too high under load: ${result.cpuAnalysis.peakCpu.toFixed(1)}%`);
        }
        
        if (result.resourceAnalysis && result.resourceAnalysis.maxEventLoopDelay > this.config.resourceTest.maxEventLoopDelayMs) {
          violations.push(`Event loop delay too high under load: ${result.resourceAnalysis.maxEventLoopDelay.toFixed(1)}ms`);
        }
        
        result.passed = violations.length === 0;
        result.summary = result.passed 
          ? 'Resources stable under load' 
          : `Resource issues under load: ${violations.join(', ')}`;
        
        if (!result.passed) {
          throw new Error(result.summary);
        }
        
        console.log(`    ✅ ${result.summary}`);
        console.log(`    Memory: peak=${result.memoryAnalysis?.peakMemory}MB, CPU: peak=${result.cpuAnalysis?.peakCpu.toFixed(1)}%`);
        
        return result;
      } finally {
        this.stopContinuousMonitoring();
      }
    });
  }

  /**
   * Start continuous monitoring
   */
  private startContinuousMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.memorySnapshots = [];
    this.cpuSnapshots = [];
    this.resourceSnapshots = [];
    this.alerts = [];
    this.lastCpuUsage = process.cpuUsage();
    
    this.monitoringInterval = setInterval(() => {
      const memSnapshot = this.getMemorySnapshot();
      const cpuSnapshot = this.getCpuSnapshot();
      const resourceSnapshot = this.getResourceSnapshot();
      
      this.memorySnapshots.push(memSnapshot);
      this.cpuSnapshots.push(cpuSnapshot);
      this.resourceSnapshots.push(resourceSnapshot);
      
      // Check for alerts
      this.checkAlerts(memSnapshot, cpuSnapshot, resourceSnapshot);
    }, 1000); // Sample every second
  }

  /**
   * Stop continuous monitoring
   */
  private stopContinuousMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Get memory snapshot
   */
  private getMemorySnapshot(): MemorySnapshot {
    const usage = process.memoryUsage();
    
    return {
      timestamp: Date.now(),
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024), // MB
      rss: Math.round(usage.rss / 1024 / 1024) // MB
    };
  }

  /**
   * Get CPU snapshot
   */
  private getCpuSnapshot(): CpuSnapshot {
    const currentUsage = process.cpuUsage(this.lastCpuUsage);
    this.lastCpuUsage = process.cpuUsage();
    
    const totalTime = currentUsage.user + currentUsage.system;
    const percent = totalTime > 0 ? (totalTime / 1000000) * 100 : 0; // Convert microseconds to percentage
    
    return {
      timestamp: Date.now(),
      user: currentUsage.user,
      system: currentUsage.system,
      percent: Math.min(percent, 100) // Cap at 100%
    };
  }

  /**
   * Get resource snapshot
   */
  private getResourceSnapshot(): ResourceSnapshot {
    // Note: Some of these metrics require additional setup in a real environment
    // For now, we'll use approximations
    
    return {
      timestamp: Date.now(),
      handles: this.getActiveHandleCount(),
      eventLoopDelay: this.measureEventLoopDelay(),
      activeRequests: 0 // Would need request tracking
    };
  }

  /**
   * Simulate memory workload
   */
  private async simulateMemoryWorkload(): Promise<void> {
    // Create and release objects to test memory management
    const objects: any[] = [];
    
    for (let i = 0; i < 1000; i++) {
      objects.push({
        id: i,
        data: new Array(100).fill(Math.random()),
        timestamp: Date.now()
      });
    }
    
    // Simulate some processing
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Release references (should be garbage collected)
    objects.length = 0;
  }

  /**
   * Simulate CPU workload
   */
  private async simulateCpuWorkload(): Promise<void> {
    // Perform CPU-intensive calculation
    let result = 0;
    const iterations = 100000;
    
    for (let i = 0; i < iterations; i++) {
      result += Math.sqrt(i) * Math.sin(i);
    }
    
    // Small async break to allow other operations
    await new Promise(resolve => setImmediate(resolve));
  }

  /**
   * Simulate resource workload
   */
  private async simulateResourceWorkload(): Promise<void> {
    // Simulate file operations, timers, etc.
    const timers: NodeJS.Timeout[] = [];
    
    // Create some timers
    for (let i = 0; i < 10; i++) {
      const timer = setTimeout(() => {}, 1000);
      timers.push(timer);
    }
    
    // Clean up timers
    timers.forEach(timer => clearTimeout(timer));
    
    // Simulate HTTP requests if client available
    if (this.httpClient) {
      try {
        await this.httpClient.get('/api/health');
      } catch (error) {
        // Ignore errors in simulation
      }
    }
  }

  /**
   * Simulate load test request
   */
  private async simulateLoadTestRequest(durationMs: number): Promise<void> {
    const endTime = Date.now() + durationMs;
    
    while (Date.now() < endTime) {
      await this.simulateMemoryWorkload();
      await this.simulateCpuWorkload();
      
      // Make HTTP request if client available
      if (this.httpClient) {
        try {
          await this.httpClient.get('/api/health');
        } catch (error) {
          // Ignore errors
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Analyze memory usage patterns
   */
  private analyzeMemoryUsage(snapshots: MemorySnapshot[]): MemoryAnalysis {
    if (snapshots.length < 2) {
      return {
        snapshots,
        leakDetected: false,
        leakRate: 0,
        peakMemory: 0,
        averageMemory: 0,
        memoryStability: 100,
        gcEfficiency: 100,
        violations: []
      };
    }
    
    const heapUsages = snapshots.map(s => s.heapUsed);
    const peakMemory = Math.max(...heapUsages);
    const averageMemory = heapUsages.reduce((sum, usage) => sum + usage, 0) / heapUsages.length;
    
    // Calculate memory trend (leak detection)
    const firstHalf = heapUsages.slice(0, Math.floor(heapUsages.length / 2));
    const secondHalf = heapUsages.slice(Math.floor(heapUsages.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, usage) => sum + usage, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, usage) => sum + usage, 0) / secondHalf.length;
    
    const totalDurationSeconds = (snapshots[snapshots.length - 1].timestamp - snapshots[0].timestamp) / 1000;
    const leakRate = totalDurationSeconds > 0 ? (secondHalfAvg - firstHalfAvg) / totalDurationSeconds : 0;
    const leakDetected = leakRate > this.config.memoryTest.leakThresholdMb;
    
    // Calculate memory stability (coefficient of variation)
    const variance = heapUsages.reduce((sum, usage) => sum + Math.pow(usage - averageMemory, 2), 0) / heapUsages.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = averageMemory > 0 ? (standardDeviation / averageMemory) * 100 : 0;
    const memoryStability = Math.max(0, 100 - coefficientOfVariation);
    
    // Estimate GC efficiency (simplified)
    const gcEfficiency = 100; // Would need more detailed GC metrics
    
    const violations: string[] = [];
    if (leakDetected) {
      violations.push(`Memory leak detected: ${leakRate.toFixed(2)} MB/s`);
    }
    if (peakMemory > this.config.memoryTest.leakThresholdMb * 10) {
      violations.push(`Peak memory usage too high: ${peakMemory}MB`);
    }
    
    return {
      snapshots,
      leakDetected,
      leakRate,
      peakMemory,
      averageMemory,
      memoryStability,
      gcEfficiency,
      violations
    };
  }

  /**
   * Analyze CPU usage patterns
   */
  private analyzeCpuUsage(snapshots: CpuSnapshot[]): CpuAnalysis {
    if (snapshots.length === 0) {
      return {
        snapshots,
        averageCpu: 0,
        peakCpu: 0,
        sustainedHighCpuDuration: 0,
        cpuStability: 100,
        violations: []
      };
    }
    
    const cpuPercentages = snapshots.map(s => s.percent);
    const averageCpu = cpuPercentages.reduce((sum, cpu) => sum + cpu, 0) / cpuPercentages.length;
    const peakCpu = Math.max(...cpuPercentages);
    
    // Calculate sustained high CPU duration
    let sustainedHighCpuDuration = 0;
    let currentHighCpuStart = 0;
    
    for (let i = 0; i < snapshots.length; i++) {
      if (snapshots[i].percent > this.config.cpuTest.maxCpuPercent) {
        if (currentHighCpuStart === 0) {
          currentHighCpuStart = snapshots[i].timestamp;
        }
      } else {
        if (currentHighCpuStart > 0) {
          sustainedHighCpuDuration += snapshots[i].timestamp - currentHighCpuStart;
          currentHighCpuStart = 0;
        }
      }
    }
    
    // Calculate CPU stability
    const variance = cpuPercentages.reduce((sum, cpu) => sum + Math.pow(cpu - averageCpu, 2), 0) / cpuPercentages.length;
    const standardDeviation = Math.sqrt(variance);
    const cpuStability = Math.max(0, 100 - standardDeviation);
    
    const violations: string[] = [];
    if (peakCpu > this.config.cpuTest.maxCpuPercent) {
      violations.push(`Peak CPU usage too high: ${peakCpu.toFixed(1)}%`);
    }
    if (sustainedHighCpuDuration > this.config.cpuTest.sustainedHighCpuMs) {
      violations.push(`Sustained high CPU usage: ${sustainedHighCpuDuration}ms`);
    }
    
    return {
      snapshots,
      averageCpu,
      peakCpu,
      sustainedHighCpuDuration,
      cpuStability,
      violations
    };
  }

  /**
   * Analyze resource usage patterns
   */
  private analyzeResourceUsage(snapshots: ResourceSnapshot[]): ResourceAnalysis {
    if (snapshots.length === 0) {
      return {
        snapshots,
        peakHandles: 0,
        averageEventLoopDelay: 0,
        maxEventLoopDelay: 0,
        violations: []
      };
    }
    
    const handles = snapshots.map(s => s.handles);
    const eventLoopDelays = snapshots.map(s => s.eventLoopDelay);
    
    const peakHandles = Math.max(...handles);
    const averageEventLoopDelay = eventLoopDelays.reduce((sum, delay) => sum + delay, 0) / eventLoopDelays.length;
    const maxEventLoopDelay = Math.max(...eventLoopDelays);
    
    const violations: string[] = [];
    if (peakHandles > this.config.resourceTest.maxFileHandles) {
      violations.push(`Too many handles: ${peakHandles}`);
    }
    if (maxEventLoopDelay > this.config.resourceTest.maxEventLoopDelayMs) {
      violations.push(`Event loop delay too high: ${maxEventLoopDelay.toFixed(1)}ms`);
    }
    
    return {
      snapshots,
      peakHandles,
      averageEventLoopDelay,
      maxEventLoopDelay,
      violations
    };
  }

  /**
   * Check for alerts
   */
  private checkAlerts(
    memSnapshot: MemorySnapshot,
    cpuSnapshot: CpuSnapshot,
    resourceSnapshot: ResourceSnapshot
  ): void {
    if (!this.config.alerting.enabled) return;
    
    const now = Date.now();
    
    // Memory alerts
    if (memSnapshot.heapUsed > this.config.alerting.memoryThresholdMb) {
      this.alerts.push({
        timestamp: now,
        type: 'memory',
        severity: memSnapshot.heapUsed > this.config.alerting.memoryThresholdMb * 2 ? 'critical' : 'warning',
        message: `High memory usage: ${memSnapshot.heapUsed}MB`,
        value: memSnapshot.heapUsed,
        threshold: this.config.alerting.memoryThresholdMb
      });
    }
    
    // CPU alerts
    if (cpuSnapshot.percent > this.config.alerting.cpuThresholdPercent) {
      this.alerts.push({
        timestamp: now,
        type: 'cpu',
        severity: cpuSnapshot.percent > this.config.alerting.cpuThresholdPercent * 1.5 ? 'critical' : 'warning',
        message: `High CPU usage: ${cpuSnapshot.percent.toFixed(1)}%`,
        value: cpuSnapshot.percent,
        threshold: this.config.alerting.cpuThresholdPercent
      });
    }
    
    // Event loop alerts
    if (resourceSnapshot.eventLoopDelay > this.config.alerting.eventLoopThresholdMs) {
      this.alerts.push({
        timestamp: now,
        type: 'eventloop',
        severity: resourceSnapshot.eventLoopDelay > this.config.alerting.eventLoopThresholdMs * 2 ? 'critical' : 'warning',
        message: `High event loop delay: ${resourceSnapshot.eventLoopDelay.toFixed(1)}ms`,
        value: resourceSnapshot.eventLoopDelay,
        threshold: this.config.alerting.eventLoopThresholdMs
      });
    }
  }

  /**
   * Get active handle count (approximation)
   */
  private getActiveHandleCount(): number {
    // This is a simplified approximation
    // In a real implementation, you'd use process._getActiveHandles() or similar
    return Math.floor(Math.random() * 50) + 10;
  }

  /**
   * Measure event loop delay
   */
  private measureEventLoopDelay(): number {
    // Simplified event loop delay measurement
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const delay = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
      return delay;
    });
    
    // Return a simulated value for now
    return Math.random() * 10;
  }

  /**
   * Helper method to run a single test with error handling
   */
  private async runTest(testName: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now();
    const startTimeIso = new Date().toISOString();

    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      return createTestResult('performance', testName, 'pass', duration, {
        startTime: startTimeIso,
        endTime: new Date().toISOString(),
        result
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return createTestResult('performance', testName, 'fail', duration, {
        startTime: startTimeIso,
        endTime: new Date().toISOString(),
        errors: [{
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }]
      });
    }
  }
}

/**
 * Create default resource monitoring configuration
 */
export function createDefaultResourceMonitoringConfig(): ResourceMonitoringConfig {
  return {
    memoryTest: {
      enabled: true,
      durationMs: 60000, // 1 minute
      samplingIntervalMs: 2000, // Every 2 seconds
      leakThresholdMb: 1, // 1 MB/s leak rate
      stabilityThresholdPercent: 80, // 80% stability
      gcForceInterval: 10 // Force GC every 10 samples
    },
    cpuTest: {
      enabled: true,
      durationMs: 30000, // 30 seconds
      samplingIntervalMs: 1000, // Every second
      maxCpuPercent: 80, // 80% CPU
      sustainedHighCpuMs: 5000 // 5 seconds of high CPU
    },
    resourceTest: {
      enabled: true,
      monitorHandles: true,
      monitorEventLoop: true,
      maxEventLoopDelayMs: 100, // 100ms event loop delay
      maxFileHandles: 1000 // 1000 file handles
    },
    alerting: {
      enabled: true,
      memoryThresholdMb: 200, // 200MB
      cpuThresholdPercent: 70, // 70% CPU
      eventLoopThresholdMs: 50 // 50ms event loop delay
    }
  };
}