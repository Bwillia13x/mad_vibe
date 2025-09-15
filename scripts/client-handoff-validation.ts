import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { FinalAcceptanceValidation } from '../test/uat/final-acceptance-validation';
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

async function runClientHandoffValidation() {
  console.log('🎯 Starting Client Handoff Validation');
  console.log('   This comprehensive validation ensures the platform is ready for client delivery');
  
  const startTime = Date.now();
  const portFile = path.resolve('.local', 'handoff_validation_port');
  
  // Clean up port file
  try { 
    fs.mkdirSync(path.dirname(portFile), { recursive: true }); 
  } catch {}
  try { 
    if (fs.existsSync(portFile)) fs.unlinkSync(portFile); 
  } catch {}

  // Start server in production mode
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
    console.log(`✅ Production server started on ${baseUrl}`);

    // Initialize test configuration for client handoff validation
    const testConfig: TestConfig = {
      environment: 'production',
      testSuites: [
        {
          name: 'client-handoff-validation',
          type: 'uat',
          enabled: true,
          config: {
            validateDeployment: true,
            validateDocumentation: true,
            validateFunctionality: true,
            validatePerformance: true,
            validateSecurity: true,
            validateUsability: true,
            validateMaintenance: true
          }
        }
      ],
      thresholds: {
        maxResponseTime: 3000,
        maxMemoryUsage: 512,
        minConcurrentUsers: 1,
        maxErrorRate: 2
      },
      security: {
        enableVulnerabilityScanning: true,
        enablePenetrationTesting: false,
        checkDependencies: true
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
          NODE_ENV: 'production',
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

    // Initialize final acceptance validation
    const finalAcceptance = new FinalAcceptanceValidation(testEnv, testConfig.reporting);
    
    console.log('🔧 Setting up final acceptance validation environment...');
    await finalAcceptance.setup();

    console.log('🧪 Running comprehensive client handoff validation...');
    const results = await finalAcceptance.runFinalAcceptanceValidation();

    console.log('🧹 Cleaning up validation environment...');
    await finalAcceptance.teardown();

    // Display comprehensive results
    console.log('\n' + '='.repeat(100));
    console.log('📊 CLIENT HANDOFF VALIDATION RESULTS');
    console.log('='.repeat(100));
    
    const statusEmoji = results.overallAcceptance === 'accepted' ? '✅' : 
                       results.overallAcceptance === 'conditionally_accepted' ? '⚠️' : '❌';
    
    console.log(`\n${statusEmoji} Overall Status: ${results.overallAcceptance.toUpperCase().replace('_', ' ')}`);
    console.log(`🎯 Acceptance Score: ${results.acceptanceScore}%`);
    console.log(`⏱️  Total Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

    // Requirements summary
    console.log('\n📋 Requirements Summary:');
    console.log(`   📊 Total Requirements: ${results.summary.totalRequirements}`);
    console.log(`   ✅ Fully Met: ${results.summary.fullyMet}`);
    console.log(`   ⚠️  Partially Met: ${results.summary.partiallyMet}`);
    console.log(`   ❌ Not Met: ${results.summary.notMet}`);
    console.log(`   📈 Criteria Passed: ${results.summary.passedCriteria}/${results.summary.totalCriteria}`);

    // Detailed requirements breakdown
    console.log('\n📝 Detailed Requirements:');
    for (const requirement of results.requirements) {
      const icon = requirement.status === 'pass' ? '✅' : requirement.status === 'partial' ? '⚠️' : '❌';
      console.log(`   ${icon} ${requirement.requirementId}: ${requirement.requirementName} (${requirement.completionPercentage.toFixed(0)}%)`);
      
      if (requirement.status !== 'pass') {
        const failedCriteria = requirement.criteria.filter(c => c.status === 'fail');
        if (failedCriteria.length > 0) {
          console.log(`      Failed criteria: ${failedCriteria.length}/${requirement.criteria.length}`);
        }
      }
    }

    // Client handoff package status
    console.log('\n📦 Client Handoff Package:');
    console.log(`   📚 Documentation: ${results.clientHandoffPackage.documentsReady ? '✅ Ready' : '❌ Not Ready'}`);
    console.log(`   🚀 Deployment: ${results.clientHandoffPackage.deploymentsReady ? '✅ Ready' : '❌ Not Ready'}`);
    console.log(`   🎓 Training Materials: ${results.clientHandoffPackage.trainingMaterialsReady ? '✅ Ready' : '❌ Not Ready'}`);
    console.log(`   🔧 Support Processes: ${results.clientHandoffPackage.supportProcessesReady ? '✅ Ready' : '❌ Not Ready'}`);

    // Handoff validation summary
    console.log('\n🔍 Handoff Validation Summary:');
    console.log(`   🎯 Readiness Score: ${results.handoffValidation.readinessScore}%`);
    console.log(`   ✅ Passed Checks: ${results.handoffValidation.summary.passed}`);
    console.log(`   ❌ Failed Checks: ${results.handoffValidation.summary.failed}`);
    console.log(`   ⚠️  Warnings: ${results.handoffValidation.summary.warnings}`);
    console.log(`   🚨 Critical Issues: ${results.handoffValidation.summary.criticalIssues}`);

    // Critical blockers
    if (results.criticalBlockers.length > 0) {
      console.log('\n🚫 Critical Blockers:');
      for (const blocker of results.criticalBlockers) {
        console.log(`   ❌ ${blocker}`);
      }
    }

    // Top recommendations
    if (results.recommendations.length > 0) {
      console.log('\n💡 Key Recommendations:');
      for (const recommendation of results.recommendations.slice(0, 5)) {
        console.log(`   💡 ${recommendation}`);
      }
      if (results.recommendations.length > 5) {
        console.log(`   ... and ${results.recommendations.length - 5} more (see detailed report)`);
      }
    }

    // Demo and workflow validation summary
    console.log('\n🎬 Demo Validation:');
    const passedScenarios = results.demoValidation.scenarios.filter(s => s.status === 'pass').length;
    console.log(`   📋 Scenarios: ${passedScenarios}/${results.demoValidation.scenarios.length} passed`);
    console.log(`   📝 Script Execution: ${results.demoValidation.scriptExecution.status === 'pass' ? '✅ Passed' : '❌ Failed'}`);

    console.log('\n🔄 User Workflows:');
    const passedWorkflows = results.userWorkflows.filter(w => w.status === 'pass').length;
    console.log(`   🔄 Workflows: ${passedWorkflows}/${results.userWorkflows.length} passed`);

    // Final decision and next steps
    console.log('\n🎯 Final Decision:');
    switch (results.overallAcceptance) {
      case 'accepted':
        console.log('   🎉 PLATFORM ACCEPTED FOR CLIENT HANDOFF');
        console.log('   ✅ All critical requirements met');
        console.log('   ✅ No critical blockers identified');
        console.log('   ✅ Ready for production deployment');
        break;
      
      case 'conditionally_accepted':
        console.log('   ⚠️  PLATFORM CONDITIONALLY ACCEPTED');
        console.log('   ✅ Core requirements met');
        console.log('   ⚠️  Minor issues require attention');
        console.log('   📋 Address recommendations before full handoff');
        break;
      
      case 'rejected':
        console.log('   ❌ PLATFORM REJECTED FOR HANDOFF');
        console.log('   🚫 Critical blockers must be resolved');
        console.log('   📋 Significant work required before resubmission');
        break;
    }

    // Report locations
    console.log('\n📄 Detailed reports generated:');
    console.log('   📊 Final Acceptance Report: test-results/final-acceptance-report.html');
    console.log('   📋 Executive Summary: test-results/executive-summary.md');
    console.log('   📝 Detailed Results: test-results/final-acceptance-results.json');
    console.log('   🔍 Handoff Checklist: test-results/uat-report.html');

    console.log('\n🎯 Client Handoff Validation completed successfully!');

    // Exit with appropriate code based on acceptance status
    if (results.overallAcceptance === 'rejected') {
      console.log('\n❌ Platform rejected for handoff. Address critical blockers and resubmit.');
      process.exit(1);
    } else if (results.overallAcceptance === 'conditionally_accepted') {
      console.log('\n⚠️  Platform conditionally accepted. Address recommendations for full acceptance.');
      process.exit(0);
    } else {
      console.log('\n✅ Platform fully accepted and ready for client handoff!');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Client Handoff Validation failed:', error);
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
  runClientHandoffValidation().catch((err) => {
    console.error('Client Handoff Validation failed:', err);
    process.exit(1);
  });
}

export { runClientHandoffValidation };