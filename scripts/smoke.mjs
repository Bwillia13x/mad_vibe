#!/usr/bin/env node

/**
 * Smoke Test Suite for Andreas Vibe Production Readiness
 * 
 * This script validates critical endpoints and functionality without external dependencies
 * when SMOKE_MODE=1 is set. It ensures the application is production-ready.
 */

import { spawn } from 'child_process'
import { readFileSync } from 'fs'
import { join } from 'path'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
const SMOKE_MODE = process.env.SMOKE_MODE === '1'

class SmokeTestRunner {
  constructor() {
    this.results = []
    this.passed = 0
    this.failed = 0
  }

  async runTest(name, testFn) {
    try {
      console.log(`🧪 Running: ${name}`)
      await testFn()
      this.results.push({ name, status: 'PASS', error: null })
      this.passed++
      console.log(`✅ PASS: ${name}`)
    } catch (error) {
      this.results.push({ name, status: 'FAIL', error: error.message })
      this.failed++
      console.log(`❌ FAIL: ${name} - ${error.message}`)
    }
  }

  async fetch(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'Andreas-Vibe-Smoke-Test/1.0',
        ...options.headers
      }
    })
    return response
  }

  async testHomePage() {
    const response = await this.fetch(BASE_URL)
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`)
    }
    
    const html = await response.text()
    if (!html.includes('Andreas Vibe')) {
      throw new Error('Home page does not contain expected content')
    }
  }

  async testPickupPage() {
    const response = await this.fetch(`${BASE_URL}/pickup`)
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`)
    }
    
    const html = await response.text()
    if (!html.includes('Order Pickup Service')) {
      throw new Error('Pickup page does not contain expected content')
    }
  }

  async testHealthEndpoint() {
    const response = await this.fetch(`${BASE_URL}/api/health`)
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`)
    }
    
    const data = await response.json()
    if (!data.status || !data.timestamp) {
      throw new Error('Health endpoint missing required fields')
    }

    // Validate environment checks
    if (typeof data.environment !== 'object') {
      throw new Error('Health endpoint missing environment status')
    }
  }

  async testModelsEndpoint() {
    const response = await this.fetch(`${BASE_URL}/api/models`)
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`)
    }
    
    const data = await response.json()
    if (!Array.isArray(data.models)) {
      throw new Error('Models endpoint should return models array')
    }

    if (SMOKE_MODE && !data.smokeMode) {
      throw new Error('Models endpoint should indicate smoke mode when SMOKE_MODE=1')
    }
  }

  async testSearchEndpoint() {
    const response = await this.fetch(`${BASE_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'test search query',
        context: 'smoke test'
      })
    })

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`)
    }
    
    const data = await response.json()
    if (!data.query || !Array.isArray(data.results)) {
      throw new Error('Search endpoint missing required fields')
    }

    if (SMOKE_MODE && !data.smokeMode) {
      throw new Error('Search endpoint should indicate smoke mode when SMOKE_MODE=1')
    }
  }

  async testAdminRedirect() {
    const response = await this.fetch(`${BASE_URL}/admin`, {
      redirect: 'manual'
    })
    
    // Should either show admin page (if authorized) or redirect to auth
    if (response.status !== 200 && response.status !== 302 && response.status !== 307) {
      throw new Error(`Expected 200 or 30x redirect, got ${response.status}`)
    }

    if (response.status === 200) {
      const html = await response.text()
      if (!html.includes('Operations Dashboard') && !html.includes('Admin')) {
        throw new Error('Admin page does not contain expected content')
      }
    }
  }

  async testOperationsEndpoint() {
    // Test WebSocket operations status
    const statusResponse = await this.fetch(`${BASE_URL}/api/operations?action=status`)
    if (statusResponse.status !== 200) {
      throw new Error(`Operations status endpoint returned ${statusResponse.status}`)
    }
    
    const statusData = await statusResponse.json()
    if (typeof statusData.connected !== 'boolean' || typeof statusData.port !== 'number') {
      throw new Error('Operations status endpoint missing required fields')
    }
  }

  async testBuildArtifacts() {
    try {
      // Check if Next.js build artifacts exist
      const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'))
      if (!packageJson.name || !packageJson.version) {
        throw new Error('Invalid package.json structure')
      }

      // Validate essential dependencies
      const requiredDeps = ['next', 'react', 'typescript']
      for (const dep of requiredDeps) {
        if (!packageJson.dependencies[dep] && !packageJson.devDependencies[dep]) {
          throw new Error(`Missing required dependency: ${dep}`)
        }
      }

      // Check scripts
      const requiredScripts = ['build', 'start', 'lint', 'typecheck']
      for (const script of requiredScripts) {
        if (!packageJson.scripts[script]) {
          throw new Error(`Missing required script: ${script}`)
        }
      }

    } catch (error) {
      throw new Error(`Build artifacts validation failed: ${error.message}`)
    }
  }

  async testDatabaseConfiguration() {
    // Verify database configuration without actually connecting
    const hasPostgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL
    if (!hasPostgresUrl && !SMOKE_MODE) {
      throw new Error('Database URL not configured and not in smoke mode')
    }

    // Check if Drizzle schema file exists
    try {
      readFileSync(join(process.cwd(), 'shared/schema.ts'), 'utf8')
    } catch (error) {
      throw new Error('Database schema file missing: shared/schema.ts')
    }
  }

  async testTypeScriptConfiguration() {
    try {
      // Check TypeScript config
      const tsConfig = JSON.parse(readFileSync(join(process.cwd(), 'tsconfig.json'), 'utf8'))
      if (!tsConfig.compilerOptions || !tsConfig.compilerOptions.strict) {
        console.warn('⚠️  TypeScript strict mode not enabled')
      }

      // Check Next.js config
      try {
        readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8')
      } catch (error) {
        throw new Error('Next.js configuration missing: next.config.ts')
      }

    } catch (error) {
      throw new Error(`TypeScript configuration validation failed: ${error.message}`)
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60))
    console.log('🏁 SMOKE TEST SUMMARY')
    console.log('='.repeat(60))
    console.log(`Environment: ${SMOKE_MODE ? 'SMOKE_MODE=1' : 'Production'}`)
    console.log(`Base URL: ${BASE_URL}`)
    console.log(`Total Tests: ${this.results.length}`)
    console.log(`✅ Passed: ${this.passed}`)
    console.log(`❌ Failed: ${this.failed}`)
    console.log(`Success Rate: ${Math.round((this.passed / this.results.length) * 100)}%`)
    
    if (this.failed > 0) {
      console.log('\n❌ FAILED TESTS:')
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`  - ${r.name}: ${r.error}`))
    }
    
    console.log('='.repeat(60))
    
    if (this.failed === 0) {
      console.log('🎉 ALL SMOKE TESTS PASSED - Production Ready!')
      return true
    } else {
      console.log('💥 SMOKE TESTS FAILED - Review issues before deployment')
      return false
    }
  }

  async run() {
    console.log('🚀 Starting Andreas Vibe Smoke Tests')
    console.log(`Mode: ${SMOKE_MODE ? 'SMOKE (No External Dependencies)' : 'Full Production'}`)
    console.log(`Target: ${BASE_URL}`)
    console.log('='.repeat(60))

    // Core functionality tests
    await this.runTest('Home Page (/)', () => this.testHomePage())
    await this.runTest('Pickup Page (/pickup)', () => this.testPickupPage())
    await this.runTest('Health Endpoint (/api/health)', () => this.testHealthEndpoint())
    await this.runTest('Models Endpoint (/api/models)', () => this.testModelsEndpoint())
    await this.runTest('Search Endpoint (POST /api/search)', () => this.testSearchEndpoint())
    await this.runTest('Admin Redirects', () => this.testAdminRedirect())
    await this.runTest('Operations WebSocket Status', () => this.testOperationsEndpoint())
    
    // Configuration and setup tests
    await this.runTest('Build Artifacts', () => this.testBuildArtifacts())
    await this.runTest('Database Configuration', () => this.testDatabaseConfiguration())
    await this.runTest('TypeScript Configuration', () => this.testTypeScriptConfiguration())

    return this.printSummary()
  }
}

// Run smoke tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new SmokeTestRunner()
  
  runner.run()
    .then((success) => {
      process.exit(success ? 0 : 1)
    })
    .catch((error) => {
      console.error('💥 Smoke test runner crashed:', error)
      process.exit(1)
    })
}

export default SmokeTestRunner
