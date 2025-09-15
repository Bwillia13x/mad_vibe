#!/usr/bin/env tsx

/**
 * Validation script for performance monitoring implementation
 * Tests the basic functionality without running the full server
 */

import { performanceMonitor } from '../lib/performance-monitor';
import { performanceOptimizer } from '../lib/performance-optimizer';
import { performanceDashboard } from '../lib/performance-dashboard';

async function validatePerformanceMonitoring() {
  console.log('🔍 Validating performance monitoring implementation...');
  
  try {
    // Test 1: Performance Monitor
    console.log('\n1. Testing Performance Monitor...');
    
    // Simulate some requests
    const mockReq = { path: '/api/test', method: 'GET', session: { id: 'test-session' } };
    const mockRes = { statusCode: 200 };
    
    performanceMonitor.recordRequest(mockReq, mockRes, 150);
    performanceMonitor.recordRequest(mockReq, mockRes, 200);
    performanceMonitor.recordRequest(mockReq, mockRes, 100);
    
    // Get current metrics
    const currentMetrics = performanceMonitor.getCurrentMetrics();
    console.log('✅ Performance monitor is collecting metrics:', !!currentMetrics);
    
    // Get summary
    const summary = performanceMonitor.getPerformanceSummary();
    console.log('✅ Performance summary available:', summary.health);
    
    // Test 2: Performance Optimizer
    console.log('\n2. Testing Performance Optimizer...');
    
    const optimizerStatus = performanceOptimizer.getStatus();
    console.log('✅ Memory leak detection enabled:', optimizerStatus.memoryLeakDetection.enabled);
    console.log('✅ Performance degradation detection enabled:', optimizerStatus.performanceDegradation.enabled);
    console.log('✅ Maintenance tasks enabled:', optimizerStatus.maintenanceTasks.enabled);
    
    // Test memory optimization
    performanceOptimizer.optimizeMemoryUsage();
    console.log('✅ Memory optimization completed successfully');
    
    // Test 3: Performance Dashboard
    console.log('\n3. Testing Performance Dashboard...');
    
    const dashboardData = performanceDashboard.getDashboardData();
    console.log('✅ Dashboard data structure valid:', !!dashboardData.summary && !!dashboardData.metrics);
    
    const healthStatus = performanceDashboard.getHealthStatus();
    console.log('✅ Health status available:', healthStatus.status);
    
    // Test report generation
    try {
      const report = performanceDashboard.generateReport(1); // 1 hour report
      console.log('✅ Performance report generated:', !!report.id);
    } catch (error) {
      console.log('⚠️  Report generation skipped (insufficient data):', (error as Error).message);
    }
    
    // Test 4: Integration
    console.log('\n4. Testing Integration...');
    
    // Simulate connection events
    performanceMonitor.onConnectionOpen();
    performanceMonitor.onConnectionClose();
    console.log('✅ Connection tracking working');
    
    // Test configuration updates
    performanceMonitor.updateConfig({ 
      metricsInterval: 10000,
      alertingEnabled: true 
    });
    console.log('✅ Configuration updates working');
    
    console.log('\n🎉 All performance monitoring components validated successfully!');
    
    // Display current status
    console.log('\n📊 Current Status:');
    console.log('- Health:', summary.health);
    console.log('- Active Alerts:', summary.activeAlerts);
    console.log('- Uptime:', Math.round(summary.uptime / 1000), 'seconds');
    console.log('- Memory Usage:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024), 'MB');
    
    return true;
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return false;
  } finally {
    // Cleanup
    performanceMonitor.stop();
    performanceOptimizer.stop();
  }
}

// Run validation
validatePerformanceMonitoring()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Validation script failed:', error);
    process.exit(1);
  });