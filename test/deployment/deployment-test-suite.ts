/**
 * Deployment and Infrastructure Testing Suite
 * Integrates Docker deployment, database connectivity, and health monitoring tests
 */

import type { TestConfig } from '../config/test-config.js'
import { DockerDeploymentTester, type DockerTestResult } from './docker-deployment-tests.js'
import {
  DatabaseConnectivityTester,
  type DatabaseTestResult
} from './database-connectivity-tests.js'
import { HealthMonitoringTester, type HealthTestResult } from './health-monitoring-tests.js'

export interface DeploymentTestSuite {
  docker: DockerTestResult[]
  database: DatabaseTestResult[]
  health: HealthTestResult[]
}

export interface DeploymentTestSummary {
  total: number
  passed: number
  failed: number
  duration: number
  suites: {
    docker: { total: number; passed: number; failed: number; duration: number }
    database: { total: number; passed: number; failed: number; duration: number }
    health: { total: number; passed: number; failed: number; duration: number }
  }
}

export class DeploymentTestRunner {
  private dockerTester: DockerDeploymentTester
  private databaseTester: DatabaseConnectivityTester
  private healthTester: HealthMonitoringTester

  constructor(private config: TestConfig) {
    this.dockerTester = new DockerDeploymentTester(config)
    this.databaseTester = new DatabaseConnectivityTester(config)
    this.healthTester = new HealthMonitoringTester(config)
  }

  /**
   * Run all deployment and infrastructure tests
   */
  async runAllTests(): Promise<DeploymentTestSuite> {
    console.log('🚀 Starting Deployment and Infrastructure Testing Suite')
    console.log('='.repeat(60))

    const results: DeploymentTestSuite = {
      docker: [],
      database: [],
      health: []
    }

    try {
      // Run Docker deployment tests
      console.log('\n📦 Docker Deployment Tests')
      console.log('-'.repeat(40))
      results.docker = await this.dockerTester.runAllTests()

      // Run Database connectivity tests
      console.log('\n🗄️  Database Connectivity Tests')
      console.log('-'.repeat(40))
      results.database = await this.databaseTester.runAllTests()

      // Run Health monitoring tests
      console.log('\n🏥 Health Monitoring Tests')
      console.log('-'.repeat(40))
      results.health = await this.healthTester.runAllTests()
    } catch (error) {
      console.error('❌ Deployment test suite failed:', error)
      throw error
    }

    // Print summary
    this.printSummary(results)

    return results
  }

  /**
   * Run specific test suite
   */
  async runDockerTests(): Promise<DockerTestResult[]> {
    console.log('🐳 Running Docker Deployment Tests Only')
    return this.dockerTester.runAllTests()
  }

  async runDatabaseTests(): Promise<DatabaseTestResult[]> {
    console.log('🗄️  Running Database Connectivity Tests Only')
    return this.databaseTester.runAllTests()
  }

  async runHealthTests(): Promise<HealthTestResult[]> {
    console.log('🏥 Running Health Monitoring Tests Only')
    return this.healthTester.runAllTests()
  }

  /**
   * Get test summary statistics
   */
  getSummary(results: DeploymentTestSuite): DeploymentTestSummary {
    const dockerSummary = this.dockerTester.getSummary()
    const databaseSummary = this.databaseTester.getSummary()
    const healthSummary = this.healthTester.getSummary()

    const total = dockerSummary.total + databaseSummary.total + healthSummary.total
    const passed = dockerSummary.passed + databaseSummary.passed + healthSummary.passed
    const failed = dockerSummary.failed + databaseSummary.failed + healthSummary.failed
    const duration = dockerSummary.duration + databaseSummary.duration + healthSummary.duration

    return {
      total,
      passed,
      failed,
      duration,
      suites: {
        docker: dockerSummary,
        database: databaseSummary,
        health: healthSummary
      }
    }
  }

  /**
   * Print test summary
   */
  private printSummary(results: DeploymentTestSuite): void {
    const summary = this.getSummary(results)

    console.log('\n' + '='.repeat(60))
    console.log('📊 DEPLOYMENT TEST SUITE SUMMARY')
    console.log('='.repeat(60))

    // Overall summary
    console.log(`\n🎯 Overall Results:`)
    console.log(`   Total Tests: ${summary.total}`)
    console.log(`   Passed: ${summary.passed} ✅`)
    console.log(`   Failed: ${summary.failed} ❌`)
    console.log(`   Success Rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%`)
    console.log(`   Total Duration: ${(summary.duration / 1000).toFixed(2)}s`)

    // Suite breakdown
    console.log(`\n📦 Docker Deployment Tests:`)
    console.log(
      `   ${summary.suites.docker.passed}/${summary.suites.docker.total} passed (${(summary.suites.docker.duration / 1000).toFixed(2)}s)`
    )

    console.log(`\n🗄️  Database Connectivity Tests:`)
    console.log(
      `   ${summary.suites.database.passed}/${summary.suites.database.total} passed (${(summary.suites.database.duration / 1000).toFixed(2)}s)`
    )

    console.log(`\n🏥 Health Monitoring Tests:`)
    console.log(
      `   ${summary.suites.health.passed}/${summary.suites.health.total} passed (${(summary.suites.health.duration / 1000).toFixed(2)}s)`
    )

    // Failed tests details
    if (summary.failed > 0) {
      console.log(`\n❌ Failed Tests:`)

      const failedDocker = results.docker.filter((t) => !t.success)
      const failedDatabase = results.database.filter((t) => !t.success)
      const failedHealth = results.health.filter((t) => !t.success)

      if (failedDocker.length > 0) {
        console.log(`   Docker: ${failedDocker.map((t) => t.testName).join(', ')}`)
      }
      if (failedDatabase.length > 0) {
        console.log(`   Database: ${failedDatabase.map((t) => t.testName).join(', ')}`)
      }
      if (failedHealth.length > 0) {
        console.log(`   Health: ${failedHealth.map((t) => t.testName).join(', ')}`)
      }
    }

    // Recommendations
    console.log(`\n💡 Recommendations:`)

    if (summary.suites.docker.failed > 0) {
      console.log(`   - Review Docker configuration and build process`)
      console.log(`   - Check container resource limits and networking`)
    }

    if (summary.suites.database.failed > 0) {
      console.log(`   - Verify database connection strings and credentials`)
      console.log(`   - Check database schema and migration status`)
    }

    if (summary.suites.health.failed > 0) {
      console.log(`   - Review health endpoint implementation`)
      console.log(`   - Check monitoring and alerting configuration`)
    }

    if (summary.failed === 0) {
      console.log(`   🎉 All deployment tests passed! System is ready for production.`)
    } else {
      console.log(`   ⚠️  Address failed tests before production deployment.`)
    }

    console.log('\n' + '='.repeat(60))
  }

  /**
   * Generate deployment readiness report
   */
  generateReadinessReport(results: DeploymentTestSuite): {
    ready: boolean
    score: number
    issues: string[]
    recommendations: string[]
  } {
    const summary = this.getSummary(results)
    const score = (summary.passed / summary.total) * 100
    const ready = score >= 90 // 90% pass rate required for production readiness

    const issues: string[] = []
    const recommendations: string[] = []

    // Analyze Docker issues
    const failedDocker = results.docker.filter((t) => !t.success)
    if (failedDocker.length > 0) {
      issues.push(`Docker deployment issues: ${failedDocker.length} tests failed`)
      recommendations.push('Review Docker configuration, build process, and container settings')
    }

    // Analyze Database issues
    const failedDatabase = results.database.filter((t) => !t.success)
    if (failedDatabase.length > 0) {
      issues.push(`Database connectivity issues: ${failedDatabase.length} tests failed`)
      recommendations.push('Verify database configuration, connection strings, and schema')
    }

    // Analyze Health monitoring issues
    const failedHealth = results.health.filter((t) => !t.success)
    if (failedHealth.length > 0) {
      issues.push(`Health monitoring issues: ${failedHealth.length} tests failed`)
      recommendations.push('Check health endpoint implementation and monitoring setup')
    }

    // Performance recommendations
    if (summary.duration > 300000) {
      // 5 minutes
      recommendations.push('Consider optimizing test execution time for faster CI/CD pipeline')
    }

    return {
      ready,
      score,
      issues,
      recommendations
    }
  }
}

/**
 * Export test runner for use in other modules
 */
export async function runDeploymentTests(config: TestConfig): Promise<DeploymentTestSuite> {
  const runner = new DeploymentTestRunner(config)
  return runner.runAllTests()
}

export default DeploymentTestRunner
