import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { UATTestSuite } from '../test/uat/uat-test-suite';
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

async function runUATTests() {
  console.log('🎯 Starting User Acceptance Testing Suite');
  console.log('   This comprehensive test validates all demo scenarios, user workflows, and acceptance criteria');
  
  const _startTime = Date.now();
  const portFile = path.resolve('.local', 'uat_port');
  
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
      PORT_FILE: portFile,
      DEMO_SCENARIO: 'default',
      DEMO_SEED: '123'
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
    console.log(`✅ Test server started on ${baseUrl}`);

    // Initialize test configuration
    const testConfig: TestConfig = {
      environment: 'uat',
      testSuites: [
        {
          name: 'demo-scenarios',
          type: 'uat',
          enabled: true,
          config: {
            scenarios: ['default', 'busy_day', 'low_inventory', 'appointment_gaps'],
            seeds: [123, 999, 2025, 456]
          }
        },
        {
          name: 'user-workflows',
          type: 'uat',
          enabled: true,
          config: {
            workflows: ['customer-service', 'inventory-management', 'marketing-campaigns', 'staff-scheduling', 'business-intelligence']
          }
        }
      ],
      thresholds: {
        maxResponseTime: 3000,
        maxMemoryUsage: 512,
        minConcurrentUsers: 1,
        maxErrorRate: 5
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
        env: {
          DEMO_SCENARIO: 'default',
          DEMO_SEED: '123'
        }
      }
    };

    // Create test environment
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

    // Initialize and run UAT test suite
    const uatSuite = new UATTestSuite(testEnv, testConfig);
    
    console.log('🔧 Setting up UAT test environment...');
    await uatSuite.setup();

    console.log('🧪 Running comprehensive UAT test suite...');
    const results = await uatSuite.runCompleteUATSuite();

    console.log('🧹 Cleaning up test environment...');
    await uatSuite.teardown();

    // Display comprehensive results
    console.log('\n' + '='.repeat(80));
    console.log('📊 USER ACCEPTANCE TESTING RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\n🎯 Overall Success Rate: ${results.summary.successRate.toFixed(1)}%`);
    console.log(`⏱️  Total Duration: ${(results.summary.duration / 1000).toFixed(1)}s`);
    console.log(`📈 Tests: ${results.summary.passed}/${results.summary.totalTests} passed`);

    // Detailed breakdown
    console.log('\n📋 Test Category Breakdown:');
    
    console.log(`\n🎬 Demo Scenarios: ${results.demoScenarios.summary.passed}/${results.demoScenarios.summary.totalScenarios} passed`);
    for (const scenario of results.demoScenarios.results) {
      const icon = scenario.status === 'pass' ? '✅' : '❌';
      console.log(`   ${icon} ${scenario.name} (${scenario.scenario}) - ${(scenario.duration / 1000).toFixed(2)}s`);
      if (scenario.status === 'fail' && scenario.error) {
        console.log(`      Error: ${scenario.error}`);
      }
    }

    console.log(`\n📝 Demo Script: ${results.demoScript.summary.passed}/${results.demoScript.summary.totalSteps} steps passed`);
    const scriptIcon = results.demoScript.result.status === 'pass' ? '✅' : '❌';
    console.log(`   ${scriptIcon} ${results.demoScript.result.name} - ${(results.demoScript.result.duration / 1000).toFixed(2)}s`);
    if (results.demoScript.result.status === 'fail' && results.demoScript.result.error) {
      console.log(`      Error: ${results.demoScript.result.error}`);
    }

    console.log(`\n🔄 User Workflows: ${results.userWorkflows.summary.passed}/${results.userWorkflows.summary.totalWorkflows} passed`);
    for (const workflow of results.userWorkflows.results) {
      const icon = workflow.status === 'pass' ? '✅' : '❌';
      console.log(`   ${icon} ${workflow.name} - ${(workflow.duration / 1000).toFixed(2)}s`);
      if (workflow.status === 'fail' && workflow.error) {
        console.log(`      Error: ${workflow.error}`);
      }
    }

    console.log(`\n⌨️  Keyboard Shortcuts: ${results.keyboardShortcuts.summary.passed}/${results.keyboardShortcuts.summary.totalShortcuts} passed`);
    const keyboardIcon = results.keyboardShortcuts.result.status === 'pass' ? '✅' : '❌';
    console.log(`   ${keyboardIcon} ${results.keyboardShortcuts.result.name} - ${(results.keyboardShortcuts.result.duration / 1000).toFixed(2)}s`);

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (results.summary.successRate >= 95) {
      console.log('   🎉 Excellent! All tests passing. Platform is ready for client handoff.');
    } else if (results.summary.successRate >= 85) {
      console.log('   ⚠️  Good overall, but review failed tests before client handoff.');
    } else if (results.summary.successRate >= 70) {
      console.log('   🔧 Several issues detected. Address failures before handoff.');
    } else {
      console.log('   ❌ Critical issues detected. Significant work needed before handoff.');
    }

    // Report locations
    console.log('\n📄 Detailed reports generated:');
    console.log('   📊 HTML Report: test-results/uat-report.html');
    console.log('   📋 JSON Results: test-results/uat-results.json');
    console.log('   📝 Summary: test-results/uat-summary.md');

    console.log('\n🎯 UAT Testing completed successfully!');

    // Exit with appropriate code
    if (results.summary.failed > 0) {
      console.log('\n⚠️  Some tests failed. Review the detailed reports for more information.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ UAT Testing failed:', error);
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
  runUATTests().catch((err) => {
    console.error('UAT Tests failed:', err);
    process.exit(1);
  });
}

export { runUATTests };