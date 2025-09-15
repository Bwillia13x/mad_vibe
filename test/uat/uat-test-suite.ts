import { DemoScenarioValidation, type DemoScenarioResult } from './demo-scenario-validation';
import { UserWorkflowE2E, type UserWorkflowResult } from './user-workflow-e2e';
import type { TestEnvironment } from '../utils/test-environment';
import { TestReporter } from '../reporting/test-reporter';
import type { TestConfig } from '../config/test-config';

export interface UATTestResult {
  timestamp: string;
  environment: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    successRate: number;
  };
  demoScenarios: {
    summary: {
      totalScenarios: number;
      passed: number;
      failed: number;
      duration: number;
    };
    results: DemoScenarioResult[];
  };
  userWorkflows: {
    summary: {
      totalWorkflows: number;
      passed: number;
      failed: number;
      duration: number;
    };
    results: UserWorkflowResult[];
  };
  demoScript: {
    summary: {
      totalSteps: number;
      passed: number;
      failed: number;
      duration: number;
    };
    result: DemoScenarioResult;
  };
  keyboardShortcuts: {
    summary: {
      totalShortcuts: number;
      passed: number;
      failed: number;
      duration: number;
    };
    result: UserWorkflowResult;
  };
}

export class UATTestSuite {
  private testEnv: TestEnvironment;
  private reporter: TestReporter;
  private config: TestConfig;
  private demoValidator: DemoScenarioValidation;
  private workflowTester: UserWorkflowE2E;

  constructor(testEnv: TestEnvironment, config: TestConfig) {
    this.testEnv = testEnv;
    this.config = config;
    this.reporter = new TestReporter(config);
    this.demoValidator = new DemoScenarioValidation(testEnv, this.reporter);
    this.workflowTester = new UserWorkflowE2E(testEnv, this.reporter);
  }

  async setup(): Promise<void> {
    console.log('🔧 Setting up UAT test environment...');
    await this.demoValidator.setup();
    await this.workflowTester.setup();
  }

  async teardown(): Promise<void> {
    console.log('🧹 Cleaning up UAT test environment...');
    await this.demoValidator.teardown();
    await this.workflowTester.teardown();
  }

  async runCompleteUATSuite(): Promise<UATTestResult> {
    const startTime = Date.now();
    console.log('🚀 Starting Complete User Acceptance Testing Suite');

    try {
      // 1. Demo Scenario Validation
      console.log('\n📋 Phase 1: Demo Scenario Validation');
      const demoScenarioStart = Date.now();
      const demoScenarioResults = await this.demoValidator.runAllScenarioTests();
      const demoScenarioDuration = Date.now() - demoScenarioStart;

      const demoScenarioSummary = {
        totalScenarios: demoScenarioResults.length,
        passed: demoScenarioResults.filter(r => r.status === 'pass').length,
        failed: demoScenarioResults.filter(r => r.status === 'fail').length,
        duration: demoScenarioDuration
      };

      console.log(`   ✅ Scenarios Passed: ${demoScenarioSummary.passed}/${demoScenarioSummary.totalScenarios}`);
      console.log(`   ❌ Scenarios Failed: ${demoScenarioSummary.failed}/${demoScenarioSummary.totalScenarios}`);

      // 2. Demo Script Execution Validation
      console.log('\n📝 Phase 2: Demo Script Execution Validation');
      const demoScriptStart = Date.now();
      const demoScriptResult = await this.demoValidator.runDemoScriptValidation('default', 123);
      const demoScriptDuration = Date.now() - demoScriptStart;

      const demoScriptSummary = {
        totalSteps: demoScriptResult.validations.length,
        passed: demoScriptResult.validations.filter(v => v.status === 'pass').length,
        failed: demoScriptResult.validations.filter(v => v.status === 'fail').length,
        duration: demoScriptDuration
      };

      console.log(`   ✅ Script Steps Passed: ${demoScriptSummary.passed}/${demoScriptSummary.totalSteps}`);
      console.log(`   ❌ Script Steps Failed: ${demoScriptSummary.failed}/${demoScriptSummary.totalSteps}`);

      // 3. User Workflow End-to-End Testing
      console.log('\n🔄 Phase 3: User Workflow End-to-End Testing');
      const userWorkflowStart = Date.now();
      const userWorkflowResults = await this.workflowTester.runAllWorkflows();
      const userWorkflowDuration = Date.now() - userWorkflowStart;

      const userWorkflowSummary = {
        totalWorkflows: userWorkflowResults.length,
        passed: userWorkflowResults.filter(r => r.status === 'pass').length,
        failed: userWorkflowResults.filter(r => r.status === 'fail').length,
        duration: userWorkflowDuration
      };

      console.log(`   ✅ Workflows Passed: ${userWorkflowSummary.passed}/${userWorkflowSummary.totalWorkflows}`);
      console.log(`   ❌ Workflows Failed: ${userWorkflowSummary.failed}/${userWorkflowSummary.totalWorkflows}`);

      // 4. Keyboard Shortcuts Testing
      console.log('\n⌨️  Phase 4: Keyboard Shortcuts Testing');
      const keyboardStart = Date.now();
      const keyboardResult = await this.workflowTester.testKeyboardShortcuts();
      const keyboardDuration = Date.now() - keyboardStart;

      const keyboardSummary = {
        totalShortcuts: keyboardResult.workflow.length,
        passed: keyboardResult.workflow.filter(s => s.status === 'pass').length,
        failed: keyboardResult.workflow.filter(s => s.status === 'fail').length,
        duration: keyboardDuration
      };

      console.log(`   ✅ Shortcuts Passed: ${keyboardSummary.passed}/${keyboardSummary.totalShortcuts}`);
      console.log(`   ❌ Shortcuts Failed: ${keyboardSummary.failed}/${keyboardSummary.totalShortcuts}`);

      // Calculate overall summary
      const totalTests = demoScenarioSummary.totalScenarios + demoScriptSummary.totalSteps + 
                        userWorkflowSummary.totalWorkflows + keyboardSummary.totalShortcuts;
      const totalPassed = demoScenarioSummary.passed + demoScriptSummary.passed + 
                         userWorkflowSummary.passed + keyboardSummary.passed;
      const totalFailed = demoScenarioSummary.failed + demoScriptSummary.failed + 
                         userWorkflowSummary.failed + keyboardSummary.failed;
      const totalDuration = Date.now() - startTime;

      const result: UATTestResult = {
        timestamp: new Date().toISOString(),
        environment: this.config.environment,
        summary: {
          totalTests,
          passed: totalPassed,
          failed: totalFailed,
          skipped: 0,
          duration: totalDuration,
          successRate: totalTests > 0 ? (totalPassed / totalTests) * 100 : 0
        },
        demoScenarios: {
          summary: demoScenarioSummary,
          results: demoScenarioResults
        },
        userWorkflows: {
          summary: userWorkflowSummary,
          results: userWorkflowResults
        },
        demoScript: {
          summary: demoScriptSummary,
          result: demoScriptResult
        },
        keyboardShortcuts: {
          summary: keyboardSummary,
          result: keyboardResult
        }
      };

      // Generate comprehensive report
      await this.generateUATReport(result);

      return result;

    } catch (error) {
      console.error('❌ UAT Suite execution failed:', error);
      throw error;
    }
  }

  private async generateUATReport(result: UATTestResult): Promise<void> {
    console.log('\n📊 Generating UAT Test Reports...');

    // Generate detailed HTML report
    const htmlReport = this.generateHTMLReport(result);
    await this.reporter.saveReport(htmlReport, 'uat-report.html');

    // Generate JSON report for programmatic access
    await this.reporter.saveReport(JSON.stringify(result, null, 2), 'uat-results.json');

    // Generate summary report
    const summaryReport = this.generateSummaryReport(result);
    await this.reporter.saveReport(summaryReport, 'uat-summary.md');

    console.log('📄 UAT reports generated successfully');
  }

  private generateHTMLReport(result: UATTestResult): string {
    const successRate = result.summary.successRate.toFixed(1);
    const statusColor = result.summary.successRate >= 90 ? '#22c55e' : 
                       result.summary.successRate >= 70 ? '#f59e0b' : '#ef4444';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UAT Test Report - ${result.timestamp}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .title { font-size: 28px; font-weight: bold; color: #1e293b; margin: 0 0 10px 0; }
        .subtitle { color: #64748b; font-size: 16px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .metric-value { font-size: 32px; font-weight: bold; color: ${statusColor}; }
        .metric-label { color: #64748b; font-size: 14px; margin-top: 5px; }
        .section { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .section-title { font-size: 20px; font-weight: bold; color: #1e293b; margin: 0 0 20px 0; }
        .test-item { padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 10px; }
        .test-pass { border-left: 4px solid #22c55e; background: #f0fdf4; }
        .test-fail { border-left: 4px solid #ef4444; background: #fef2f2; }
        .test-name { font-weight: 600; color: #1e293b; }
        .test-details { color: #64748b; font-size: 14px; margin-top: 5px; }
        .status-pass { color: #22c55e; font-weight: 600; }
        .status-fail { color: #ef4444; font-weight: 600; }
        .duration { color: #64748b; font-size: 12px; }
        .error { background: #fef2f2; border: 1px solid #fecaca; padding: 10px; border-radius: 6px; margin-top: 10px; font-size: 14px; color: #dc2626; }
        .validation-list { margin-top: 10px; }
        .validation-item { padding: 8px; background: #f8fafc; border-radius: 4px; margin-bottom: 5px; font-size: 14px; }
        .workflow-step { margin-left: 20px; padding: 10px; background: #f8fafc; border-radius: 4px; margin-bottom: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">User Acceptance Testing Report</h1>
            <p class="subtitle">Generated on ${new Date(result.timestamp).toLocaleString()}</p>
            <p class="subtitle">Environment: ${result.environment}</p>
        </div>

        <div class="summary">
            <div class="metric">
                <div class="metric-value">${successRate}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">${result.summary.passed}</div>
                <div class="metric-label">Tests Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${result.summary.failed}</div>
                <div class="metric-label">Tests Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${(result.summary.duration / 1000).toFixed(1)}s</div>
                <div class="metric-label">Total Duration</div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Demo Scenario Validation</h2>
            <p>Tests all preset demo scenarios (default, busy_day, low_inventory, appointment_gaps)</p>
            ${result.demoScenarios.results.map(scenario => `
                <div class="test-item ${scenario.status === 'pass' ? 'test-pass' : 'test-fail'}">
                    <div class="test-name">
                        ${scenario.name} 
                        <span class="status-${scenario.status}">${scenario.status.toUpperCase()}</span>
                        <span class="duration">(${(scenario.duration / 1000).toFixed(2)}s)</span>
                    </div>
                    <div class="test-details">Scenario: ${scenario.scenario}${scenario.seed ? `, Seed: ${scenario.seed}` : ''}</div>
                    ${scenario.error ? `<div class="error">Error: ${scenario.error}</div>` : ''}
                    ${scenario.validations.length > 0 ? `
                        <div class="validation-list">
                            ${scenario.validations.map(v => `
                                <div class="validation-item">
                                    <span class="status-${v.status}">${v.status === 'pass' ? '✅' : '❌'}</span>
                                    ${v.name} (${(v.duration / 1000).toFixed(2)}s)
                                    ${v.error ? `<br><small style="color: #dc2626;">${v.error}</small>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2 class="section-title">Demo Script Execution</h2>
            <p>Validates complete demo script execution as per DEMO-SCRIPT.md</p>
            <div class="test-item ${result.demoScript.result.status === 'pass' ? 'test-pass' : 'test-fail'}">
                <div class="test-name">
                    ${result.demoScript.result.name}
                    <span class="status-${result.demoScript.result.status}">${result.demoScript.result.status.toUpperCase()}</span>
                    <span class="duration">(${(result.demoScript.result.duration / 1000).toFixed(2)}s)</span>
                </div>
                ${result.demoScript.result.error ? `<div class="error">Error: ${result.demoScript.result.error}</div>` : ''}
                <div class="validation-list">
                    ${result.demoScript.result.validations.map(v => `
                        <div class="validation-item">
                            <span class="status-${v.status}">${v.status === 'pass' ? '✅' : '❌'}</span>
                            ${v.name} (${(v.duration / 1000).toFixed(2)}s)
                            ${v.error ? `<br><small style="color: #dc2626;">${v.error}</small>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">User Workflow Testing</h2>
            <p>End-to-end business workflow validation</p>
            ${result.userWorkflows.results.map(workflow => `
                <div class="test-item ${workflow.status === 'pass' ? 'test-pass' : 'test-fail'}">
                    <div class="test-name">
                        ${workflow.name}
                        <span class="status-${workflow.status}">${workflow.status.toUpperCase()}</span>
                        <span class="duration">(${(workflow.duration / 1000).toFixed(2)}s)</span>
                    </div>
                    ${workflow.error ? `<div class="error">Error: ${workflow.error}</div>` : ''}
                    ${workflow.workflow.map(step => `
                        <div class="workflow-step">
                            <span class="status-${step.status}">${step.status === 'pass' ? '✅' : '❌'}</span>
                            ${step.step} (${(step.duration / 1000).toFixed(2)}s)
                            ${step.error ? `<br><small style="color: #dc2626;">${step.error}</small>` : ''}
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2 class="section-title">Keyboard Shortcuts</h2>
            <p>Navigation keyboard shortcuts validation</p>
            <div class="test-item ${result.keyboardShortcuts.result.status === 'pass' ? 'test-pass' : 'test-fail'}">
                <div class="test-name">
                    ${result.keyboardShortcuts.result.name}
                    <span class="status-${result.keyboardShortcuts.result.status}">${result.keyboardShortcuts.result.status.toUpperCase()}</span>
                    <span class="duration">(${(result.keyboardShortcuts.result.duration / 1000).toFixed(2)}s)</span>
                </div>
                ${result.keyboardShortcuts.result.error ? `<div class="error">Error: ${result.keyboardShortcuts.result.error}</div>` : ''}
                ${result.keyboardShortcuts.result.workflow.map(step => `
                    <div class="workflow-step">
                        <span class="status-${step.status}">${step.status === 'pass' ? '✅' : '❌'}</span>
                        ${step.step} (${(step.duration / 1000).toFixed(2)}s)
                        ${step.error ? `<br><small style="color: #dc2626;">${step.error}</small>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  private generateSummaryReport(result: UATTestResult): string {
    return `# User Acceptance Testing Summary

**Generated:** ${new Date(result.timestamp).toLocaleString()}  
**Environment:** ${result.environment}  
**Success Rate:** ${result.summary.successRate.toFixed(1)}%  
**Duration:** ${(result.summary.duration / 1000).toFixed(1)}s

## Overall Results

- **Total Tests:** ${result.summary.totalTests}
- **✅ Passed:** ${result.summary.passed}
- **❌ Failed:** ${result.summary.failed}
- **⏭️ Skipped:** ${result.summary.skipped}

## Test Categories

### 1. Demo Scenario Validation
- **Scenarios Tested:** ${result.demoScenarios.summary.totalScenarios}
- **Passed:** ${result.demoScenarios.summary.passed}
- **Failed:** ${result.demoScenarios.summary.failed}
- **Duration:** ${(result.demoScenarios.summary.duration / 1000).toFixed(1)}s

### 2. Demo Script Execution
- **Script Steps:** ${result.demoScript.summary.totalSteps}
- **Passed:** ${result.demoScript.summary.passed}
- **Failed:** ${result.demoScript.summary.failed}
- **Duration:** ${(result.demoScript.summary.duration / 1000).toFixed(1)}s

### 3. User Workflow Testing
- **Workflows Tested:** ${result.userWorkflows.summary.totalWorkflows}
- **Passed:** ${result.userWorkflows.summary.passed}
- **Failed:** ${result.userWorkflows.summary.failed}
- **Duration:** ${(result.userWorkflows.summary.duration / 1000).toFixed(1)}s

### 4. Keyboard Shortcuts
- **Shortcuts Tested:** ${result.keyboardShortcuts.summary.totalShortcuts}
- **Passed:** ${result.keyboardShortcuts.summary.passed}
- **Failed:** ${result.keyboardShortcuts.summary.failed}
- **Duration:** ${(result.keyboardShortcuts.summary.duration / 1000).toFixed(1)}s

## Failed Tests

${result.summary.failed > 0 ? `
${result.demoScenarios.results.filter(r => r.status === 'fail').map(r => `- **Demo Scenario:** ${r.name} - ${r.error || 'Multiple validation failures'}`).join('\n')}
${result.demoScript.result.status === 'fail' ? `- **Demo Script:** ${result.demoScript.result.error || 'Script execution failed'}` : ''}
${result.userWorkflows.results.filter(r => r.status === 'fail').map(r => `- **User Workflow:** ${r.name} - ${r.error || 'Workflow steps failed'}`).join('\n')}
${result.keyboardShortcuts.result.status === 'fail' ? `- **Keyboard Shortcuts:** ${result.keyboardShortcuts.result.error || 'Shortcut tests failed'}` : ''}
` : 'No failed tests! 🎉'}

## Recommendations

${result.summary.successRate >= 95 ? '✅ **Excellent:** All tests passing. Platform is ready for client handoff.' :
  result.summary.successRate >= 85 ? '⚠️ **Good:** Minor issues detected. Review failed tests before handoff.' :
  result.summary.successRate >= 70 ? '🔧 **Needs Work:** Several issues detected. Address failures before handoff.' :
  '❌ **Critical:** Major issues detected. Significant work needed before handoff.'}

---
*Generated by Andreas Vibe UAT Test Suite*
`;
  }
}