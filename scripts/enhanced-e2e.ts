import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { UserWorkflowTests } from '../test/e2e/user-workflow-tests';
import { TestReporter } from '../test/reporting/test-reporter';
import { TestConfig } from '../test/config/test-config';

async function delay(ms: number) { 
  return new Promise(r => setTimeout(r, ms)); 
}

async function waitForPortFile(portFile: string, timeoutMs = 20000): Promise<number> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(portFile)) {
      const content = fs.readFileSync(portFile, 'utf8').trim();
      const port = Number(content);
      if (Number.isFinite(port) && port > 0) return port;
    }
    await delay(200);
  }
  throw new Error(`Timed out waiting for port file at ${portFile}`);
}

async function runEnhancedE2ETests() {
  console.log('🚀 Starting Enhanced E2E Tests with User Workflow Validation');
  
  const startTime = Date.now();
  const portFile = path.resolve('.local', 'enhanced_e2e_port');
  
  // Clean up port file
  try { 
    fs.mkdirSync(path.dirname(portFile), { recursive: true }); 
  } catch {}
  try { 
    if (fs.existsSync(portFile)) fs.unlinkSync(portFile); 
  } catch {}

  // Start server
  const child = spawn(process.execPath, [path.resolve('dist', 'index.js')], {
    env: { 
      ...process.env, 
      NODE_ENV: 'production', 
      PORT: '0', 
      PORT_FILE: portFile 
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', d => process.stdout.write(d));
  child.stderr.on('data', d => process.stderr.write(d));

  let exitCode: number | null = null;
  child.on('exit', (code) => { exitCode = code ?? 0; });

  try {
    // Wait for server to start
    const port = await waitForPortFile(portFile);
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`✅ Server started on ${baseUrl}`);

    // Initialize test environment and reporter

    // Create a simple test environment object using the already started server
    const testEnv = {
      port,
      baseUrl,
      serverProcess: child,
      cleanup: async () => {
        try {
          if (child && exitCode === null) {
            child.kill('SIGINT');
          }
        } catch {}
      }
    };

    const reporterConfig: TestConfig = {
      environment: 'production',
      testSuites: [],
      thresholds: {
        maxResponseTime: 3000,
        maxMemoryUsage: 512,
        minConcurrentUsers: 1,
        maxErrorRate: 10
      },
      security: {
        enableVulnerabilityScanning: false,
        enablePenetrationTesting: false,
        checkDependencies: false
      },
      reporting: {
        generateHtml: true,
        generateJson: true,
        outputDir: 'test-results'
      },
      server: {
        portFile: portFile,
        startupTimeoutMs: 20000,
        env: {}
      }
    };

    const reporter = new TestReporter(reporterConfig);

    // Initialize workflow tests
    const workflowTests = new UserWorkflowTests(testEnv, reporter);
    
    console.log('🔧 Setting up test environment...');
    await workflowTests.setup();

    console.log('🧪 Running user workflow tests...');
    const workflowResults = await workflowTests.runAllWorkflowTests();

    // Server cleanup is handled in the finally block

    console.log('📊 Generating test reports...');
    
    // Generate summary report
    const totalTests = workflowResults.length;
    const passedTests = workflowResults.filter(r => r.status === 'pass').length;
    const failedTests = workflowResults.filter(r => r.status === 'fail').length;
    const skippedTests = workflowResults.filter(r => r.status === 'skip').length;
    const totalDuration = Date.now() - startTime;

    console.log('\n📋 Enhanced E2E Test Results Summary:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   ⏭️  Skipped: ${skippedTests}`);
    console.log(`   ⏱️  Duration: ${(totalDuration / 1000).toFixed(2)}s`);

    // Detailed results
    console.log('\n📝 Detailed Results:');
    for (const result of workflowResults) {
      const statusIcon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️';
      console.log(`   ${statusIcon} ${result.name} (${(result.duration / 1000).toFixed(2)}s)`);
      
      if (result.error) {
        console.log(`      Error: ${result.error}`);
      }
      
      // Show step details for failed tests
      if (result.status === 'fail' && result.steps.length > 0) {
        console.log('      Steps:');
        for (const step of result.steps) {
          const stepIcon = step.status === 'pass' ? '  ✅' : '  ❌';
          console.log(`        ${stepIcon} ${step.name} (${(step.duration / 1000).toFixed(2)}s)`);
          if (step.error) {
            console.log(`           Error: ${step.error}`);
          }
        }
      }
    }

    // Generate reports
    const reportData = {
      timestamp: new Date().toISOString(),
      environment: 'enhanced-e2e',
      summary: {
        totalTests,
        passed: passedTests,
        failed: failedTests,
        skipped: skippedTests,
        duration: totalDuration,
        successRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0
      },
      results: workflowResults
    };

    await reporter.generateReport(reportData);

    console.log('\n🎯 Enhanced E2E Tests completed successfully!');
    console.log(`📄 Reports generated in: test-results/`);

    // Cleanup
    await workflowTests.teardown();

    // Exit with appropriate code
    if (failedTests > 0) {
      console.log('\n⚠️  Some tests failed. Check the detailed results above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Enhanced E2E Tests failed:', error);
    process.exit(1);
  } finally {
    // Kill server
    try { 
      if (child && exitCode === null) child.kill('SIGINT'); 
    } catch {}
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runEnhancedE2ETests().catch((err) => {
    console.error('Enhanced E2E failed:', err);
    process.exit(1);
  });
}

export { runEnhancedE2ETests };