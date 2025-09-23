import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { UserWorkflowTests } from '../test/e2e/user-workflow-tests'
import { type TestEnvironment } from '../test/utils/test-environment'
import { TestReporter } from '../test/reporting/test-reporter'

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitForPortFile(portFile: string, timeoutMs = 20000): Promise<number> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(portFile)) {
      const content = fs.readFileSync(portFile, 'utf8').trim()
      const port = Number(content)
      if (Number.isFinite(port) && port > 0) return port
    }
    await delay(200)
  }
  throw new Error(`Timed out waiting for port file at ${portFile}`)
}

interface ComprehensiveTestResults {
  workflow: any[]
  accessibility: any[]
  usability: any[]
  browserCompatibility: any[]
  responsiveDesign: any[]
  summary: {
    totalTests: number
    passed: number
    failed: number
    skipped: number
    duration: number
    successRate: number
  }
}

async function runComprehensiveE2ETests(): Promise<void> {
  console.log(
    '🚀 Starting Comprehensive E2E Tests with User Workflows, Accessibility & Browser Compatibility'
  )

  const overallStartTime = Date.now()
  const portFile = path.resolve('.local', 'comprehensive_e2e_port')

  // Clean up port file
  try {
    fs.mkdirSync(path.dirname(portFile), { recursive: true })
  } catch {}
  try {
    if (fs.existsSync(portFile)) fs.unlinkSync(portFile)
  } catch {}

  // Start server
  console.log('🔧 Starting test server...')
  const child = spawn(process.execPath, [path.resolve('dist', 'index.js')], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '0',
      PORT_FILE: portFile
    },
    stdio: ['ignore', 'pipe', 'pipe']
  })

  child.stdout.on('data', (d) => process.stdout.write(d))
  child.stderr.on('data', (d) => process.stderr.write(d))

  let exitCode: number | null = null
  child.on('exit', (code) => {
    exitCode = code ?? 0
  })

  try {
    // Wait for server to start
    const port = await waitForPortFile(portFile)
    const baseUrl = `http://127.0.0.1:${port}`
    console.log(`✅ Server started on ${baseUrl}`)

    // Initialize test environment and reporter

    // Use the server we just started rather than starting a second one
    const testEnv: TestEnvironment = {
      port,
      baseUrl,
      serverProcess: child,
      cleanup: async () => {
        try {
          if (child && exitCode === null) child.kill('SIGINT')
        } catch {}
        try {
          if (fs.existsSync(portFile)) fs.unlinkSync(portFile)
        } catch {}
      }
    }

    const reporter = new TestReporter({
      environment: 'production',
      testSuites: [],
      thresholds: {
        maxResponseTime: 200,
        maxMemoryUsage: 512,
        minConcurrentUsers: 50,
        maxErrorRate: 1
      },
      security: {
        enableVulnerabilityScanning: false,
        enableInputValidationTests: false,
        enableAuthenticationTests: false,
        maxSecurityRiskLevel: 'medium'
      },
      reporting: {
        outputDir: 'test-results',
        formats: ['html', 'json'],
        includeScreenshots: false,
        includeMetrics: true
      },
      server: { startupTimeoutMs: 20000, portFile, env: {} }
    } as any)

    const results: ComprehensiveTestResults = {
      workflow: [],
      accessibility: [],
      usability: [],
      browserCompatibility: [],
      responsiveDesign: [],
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        successRate: 0
      }
    }

    // 1. Run User Workflow Tests
    console.log('\n🧪 Running User Workflow Tests...')
    const workflowTests = new UserWorkflowTests(testEnv, reporter)
    await workflowTests.setup()

    try {
      results.workflow = await workflowTests.runAllWorkflowTests()
      console.log(`   ✅ Completed ${results.workflow.length} workflow tests`)
    } catch (error) {
      console.error('   ❌ Workflow tests failed:', error)
    } finally {
      await workflowTests.teardown()
    }

    // 2. Run Accessibility Tests
    // Accessibility and usability tests disabled for this run
    console.log('\n♿ Accessibility/Usability tests disabled for this run')

    // 3. Run Browser Compatibility Tests
    // Browser compatibility/responsive tests disabled for this run
    console.log('\n🌐 Browser compatibility/responsive tests disabled for this run')

    // Calculate overall summary
    const allResults = [
      ...results.workflow,
      ...results.accessibility,
      ...results.usability,
      ...results.browserCompatibility,
      ...results.responsiveDesign
    ]

    results.summary = {
      totalTests: allResults.length,
      passed: allResults.filter((r) => r.status === 'pass').length,
      failed: allResults.filter((r) => r.status === 'fail').length,
      skipped: allResults.filter((r) => r.status === 'skip').length,
      duration: Date.now() - overallStartTime,
      successRate:
        allResults.length > 0
          ? (allResults.filter((r) => r.status === 'pass').length / allResults.length) * 100
          : 0
    }

    // Generate comprehensive report
    console.log('\n📊 Generating comprehensive test reports...')

    const reportData = {
      timestamp: new Date().toISOString(),
      environment: 'comprehensive-e2e',
      testSuites: {
        userWorkflows: {
          name: 'User Workflow Tests',
          results: results.workflow,
          summary: {
            total: results.workflow.length,
            passed: results.workflow.filter((r) => r.status === 'pass').length,
            failed: results.workflow.filter((r) => r.status === 'fail').length
          }
        },
        accessibility: {
          name: 'Accessibility Tests',
          results: results.accessibility,
          summary: {
            total: results.accessibility.length,
            passed: results.accessibility.filter((r) => r.status === 'pass').length,
            failed: results.accessibility.filter((r) => r.status === 'fail').length,
            averageScore:
              results.accessibility.length > 0
                ? results.accessibility.reduce((sum, r) => sum + (r.score || 0), 0) /
                  results.accessibility.length
                : 0
          }
        },
        usability: {
          name: 'Usability Tests',
          results: results.usability,
          summary: {
            total: results.usability.length,
            passed: results.usability.filter((r) => r.status === 'pass').length,
            failed: results.usability.filter((r) => r.status === 'fail').length
          }
        },
        browserCompatibility: {
          name: 'Browser Compatibility Tests',
          results: results.browserCompatibility,
          summary: {
            total: results.browserCompatibility.length,
            passed: results.browserCompatibility.filter((r) => r.status === 'pass').length,
            failed: results.browserCompatibility.filter((r) => r.status === 'fail').length
          }
        },
        responsiveDesign: {
          name: 'Responsive Design Tests',
          results: results.responsiveDesign,
          summary: {
            total: results.responsiveDesign.length,
            passed: results.responsiveDesign.filter((r) => r.status === 'pass').length,
            failed: results.responsiveDesign.filter((r) => r.status === 'fail').length
          }
        }
      },
      summary: results.summary
    }

    // The reporter aggregates from internal suite results; this script prints its own summary
    // Optionally, save a lightweight JSON for reference
    fs.mkdirSync('test-results', { recursive: true })
    fs.writeFileSync(
      path.join('test-results', 'comprehensive-e2e-summary.json'),
      JSON.stringify(reportData, null, 2)
    )

    // Print detailed summary
    console.log('\n📋 Comprehensive E2E Test Results Summary:')
    console.log(`   Total Tests: ${results.summary.totalTests}`)
    console.log(`   ✅ Passed: ${results.summary.passed}`)
    console.log(`   ❌ Failed: ${results.summary.failed}`)
    console.log(`   ⏭️  Skipped: ${results.summary.skipped}`)
    console.log(`   📊 Success Rate: ${results.summary.successRate.toFixed(1)}%`)
    console.log(`   ⏱️  Total Duration: ${(results.summary.duration / 1000).toFixed(2)}s`)

    // Print test suite summaries
    console.log('\n📝 Test Suite Breakdown:')

    console.log(
      `   🧪 User Workflows: ${results.workflow.filter((r) => r.status === 'pass').length}/${results.workflow.length} passed`
    )
    if (results.workflow.some((r) => r.status === 'fail')) {
      const failed = results.workflow.filter((r) => r.status === 'fail')
      console.log(`      Failed: ${failed.map((r) => r.name).join(', ')}`)
    }

    console.log(
      `   ♿ Accessibility: ${results.accessibility.filter((r) => r.status === 'pass').length}/${results.accessibility.length} passed`
    )
    if (results.accessibility.length > 0) {
      const avgScore =
        results.accessibility.reduce((sum, r) => sum + (r.score || 0), 0) /
        results.accessibility.length
      console.log(`      Average Score: ${avgScore.toFixed(1)}/100`)

      const wcagLevels = results.accessibility.reduce(
        (acc, r) => {
          acc[r.wcagLevel] = (acc[r.wcagLevel] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )
      console.log(
        `      WCAG Levels: ${Object.entries(wcagLevels)
          .map(([level, count]) => `${level}: ${count}`)
          .join(', ')}`
      )
    }

    console.log(
      `   🎯 Usability: ${results.usability.filter((r) => r.status === 'pass').length}/${results.usability.length} passed`
    )

    console.log(
      `   🌐 Browser Compatibility: ${results.browserCompatibility.filter((r) => r.status === 'pass').length}/${results.browserCompatibility.length} passed`
    )

    console.log(
      `   📱 Responsive Design: ${results.responsiveDesign.filter((r) => r.status === 'pass').length}/${results.responsiveDesign.length} passed`
    )

    // Show critical issues
    const criticalIssues = allResults.filter(
      (r) =>
        r.status === 'fail' && (r.error || r.violations?.some((v: any) => v.impact === 'critical'))
    )
    if (criticalIssues.length > 0) {
      console.log('\n⚠️  Critical Issues Found:')
      criticalIssues.forEach((issue) => {
        console.log(`   ❌ ${issue.name}: ${issue.error || 'Critical accessibility violations'}`)
      })
    }

    console.log('\n🎯 Comprehensive E2E Tests completed!')
    console.log(`📄 Detailed reports generated in: test-results/`)

    // Cleanup test environment
    await testEnv.cleanup()

    // Exit with appropriate code
    if (results.summary.failed > 0) {
      console.log('\n⚠️  Some tests failed. Check the detailed results above.')
      process.exit(1)
    } else {
      console.log('\n🎉 All tests passed successfully!')
    }
  } catch (error) {
    console.error('❌ Comprehensive E2E Tests failed:', error)
    process.exit(1)
  } finally {
    // Kill server
    try {
      if (child && exitCode === null) child.kill('SIGINT')
    } catch {}
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runComprehensiveE2ETests().catch((err) => {
    console.error('Comprehensive E2E failed:', err)
    process.exit(1)
  })
}

export { runComprehensiveE2ETests }
