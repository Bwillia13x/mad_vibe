/**
 * Security Headers Validation Test
 *
 * This test validates that the security headers middleware is properly
 * implemented and working as expected.
 */

import { createServer } from 'http'
import express from 'express'
import { securityHeaders, strictSecurityHeaders } from '../../server/middleware/security-headers'

interface TestResult {
  name: string
  passed: boolean
  error?: string
  details?: any
}

/**
 * Test the security headers middleware
 */
export async function testSecurityHeaders(): Promise<TestResult[]> {
  const results: TestResult[] = []

  try {
    // Create test app with security headers
    const app = express()
    app.use(securityHeaders)

    // Add test routes
    app.get('/test', (req, res) => res.json({ ok: true }))
    app.get('/api/test', (req, res) => res.json({ ok: true }))

    const server = createServer(app)

    // Start server on random port
    await new Promise<void>((resolve, reject) => {
      server.listen(0, 'localhost', () => {
        resolve()
      })
      server.on('error', reject)
    })

    const address = server.address()
    if (!address || typeof address === 'string') {
      throw new Error('Failed to get server address')
    }

    const port = address.port
    const baseUrl = `http://localhost:${port}`

    try {
      // Test 1: X-Content-Type-Options header
      const response1 = await fetch(`${baseUrl}/test`)
      const contentTypeOptions = response1.headers.get('x-content-type-options')
      results.push({
        name: 'X-Content-Type-Options header',
        passed: contentTypeOptions === 'nosniff',
        details: { expected: 'nosniff', actual: contentTypeOptions }
      })

      // Test 2: X-Frame-Options header
      const frameOptions = response1.headers.get('x-frame-options')
      results.push({
        name: 'X-Frame-Options header',
        passed: frameOptions === 'DENY',
        details: { expected: 'DENY', actual: frameOptions }
      })

      // Test 3: Content Security Policy header
      const csp = response1.headers.get('content-security-policy')
      const hasCsp = csp && csp.includes("default-src 'self'")
      results.push({
        name: 'Content Security Policy header',
        passed: !!hasCsp,
        details: { hasCSP: !!csp, containsDefaultSrc: hasCsp }
      })

      // Test 4: X-XSS-Protection header
      const xssProtection = response1.headers.get('x-xss-protection')
      results.push({
        name: 'X-XSS-Protection header',
        passed: xssProtection === '1; mode=block',
        details: { expected: '1; mode=block', actual: xssProtection }
      })

      // Test 5: Referrer-Policy header
      const referrerPolicy = response1.headers.get('referrer-policy')
      results.push({
        name: 'Referrer-Policy header',
        passed: referrerPolicy === 'strict-origin-when-cross-origin',
        details: { expected: 'strict-origin-when-cross-origin', actual: referrerPolicy }
      })

      // Test 6: X-Powered-By header removal
      const poweredBy = response1.headers.get('x-powered-by')
      results.push({
        name: 'X-Powered-By header removal',
        passed: poweredBy === null,
        details: { shouldBeNull: true, actual: poweredBy }
      })

      // Test 7: API endpoint cache control
      const apiResponse = await fetch(`${baseUrl}/api/test`)
      const cacheControl = apiResponse.headers.get('cache-control')
      const hasNoCacheControl = cacheControl && cacheControl.includes('no-store')
      results.push({
        name: 'API cache control headers',
        passed: !!hasNoCacheControl,
        details: { expected: 'no-store, no-cache, must-revalidate, private', actual: cacheControl }
      })

      // Test 8: HSTS header (should not be present in non-production)
      const hsts = response1.headers.get('strict-transport-security')
      results.push({
        name: 'HSTS header (development)',
        passed: hsts === null, // Should not be present in development
        details: { shouldBeNull: true, actual: hsts }
      })
    } finally {
      server.close()
    }
  } catch (error) {
    results.push({
      name: 'Security headers middleware test',
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    })
  }

  return results
}

/**
 * Test strict security headers middleware
 */
export async function testStrictSecurityHeaders(): Promise<TestResult[]> {
  const results: TestResult[] = []

  try {
    // Create test app with strict security headers
    const app = express()
    app.use(strictSecurityHeaders)

    // Add test route
    app.get('/test', (req, res) => res.json({ ok: true }))

    const server = createServer(app)

    // Start server on random port
    await new Promise<void>((resolve, reject) => {
      server.listen(0, 'localhost', () => {
        resolve()
      })
      server.on('error', reject)
    })

    const address = server.address()
    if (!address || typeof address === 'string') {
      throw new Error('Failed to get server address')
    }

    const port = address.port
    const baseUrl = `http://localhost:${port}`

    try {
      const response = await fetch(`${baseUrl}/test`)

      // Test 1: Strict CSP (no unsafe-inline, unsafe-eval)
      const csp = response.headers.get('content-security-policy')
      const hasStrictCSP =
        csp &&
        csp.includes("script-src 'self'") &&
        !csp.includes('unsafe-inline') &&
        !csp.includes('unsafe-eval')

      results.push({
        name: 'Strict CSP policy',
        passed: !!hasStrictCSP,
        details: {
          hasCSP: !!csp,
          isStrict: hasStrictCSP,
          csp: csp?.substring(0, 100) + '...'
        }
      })

      // Test 2: Strict referrer policy
      const referrerPolicy = response.headers.get('referrer-policy')
      results.push({
        name: 'Strict referrer policy',
        passed: referrerPolicy === 'no-referrer',
        details: { expected: 'no-referrer', actual: referrerPolicy }
      })
    } finally {
      server.close()
    }
  } catch (error) {
    results.push({
      name: 'Strict security headers middleware test',
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    })
  }

  return results
}

/**
 * Run all security headers tests
 */
export async function runSecurityHeadersTests(): Promise<void> {
  console.log('🔒 Testing Security Headers Middleware...\n')

  const standardResults = await testSecurityHeaders()
  const strictResults = await testStrictSecurityHeaders()

  const allResults = [...standardResults, ...strictResults]

  console.log('📋 Security Headers Test Results:')
  console.log('================================\n')

  let passed = 0
  let failed = 0

  allResults.forEach((result) => {
    const status = result.passed ? '✅' : '❌'
    console.log(`${status} ${result.name}`)

    if (!result.passed) {
      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`)
      }
      failed++
    } else {
      passed++
    }
  })

  console.log(`\n📊 Summary: ${passed} passed, ${failed} failed`)

  if (failed > 0) {
    console.log('\n❌ Some security headers tests failed!')
    process.exit(1)
  } else {
    console.log('\n✅ All security headers tests passed!')
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSecurityHeadersTests().catch(console.error)
}
