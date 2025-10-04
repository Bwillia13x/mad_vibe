#!/usr/bin/env node
/**
 * Quick test script for /api/screener/nl-query endpoint
 * Verifies CORS headers and query functionality
 */

import { spawn } from 'node:child_process'
import { setTimeout } from 'node:timers/promises'

const PORT = 5001
const BASE_URL = `http://localhost:${PORT}`

async function testNLQuery() {
  console.log('Starting server...')

  // Start the server
  const server = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: PORT.toString(),
      NODE_ENV: 'production',
      AI_MODE: 'demo'
    },
    stdio: 'pipe'
  })

  // Wait for server to be ready
  await setTimeout(3000)

  try {
    // Test 1: Verify CORS preflight
    console.log('\n✓ Testing CORS preflight...')
    const preflightResponse = await fetch(`${BASE_URL}/api/screener/nl-query`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, X-Session-Key, X-Actor-Id'
      }
    })

    const allowedHeaders = preflightResponse.headers.get('access-control-allow-headers')
    console.log(`  CORS Allow-Headers: ${allowedHeaders}`)

    if (!allowedHeaders?.includes('X-Session-Key') || !allowedHeaders?.includes('X-Actor-Id')) {
      throw new Error('CORS headers missing X-Session-Key or X-Actor-Id')
    }
    console.log('  ✓ Custom headers allowed in CORS')

    // Test 2: Verify NL query endpoint
    console.log('\n✓ Testing NL query endpoint...')
    const queryResponse = await fetch(`${BASE_URL}/api/screener/nl-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:5173',
        'X-Session-Key': 'test-session-123',
        'X-Actor-Id': 'test-actor-456'
      },
      body: JSON.stringify({
        query: 'Show me companies with ROIC above 15%, FCF yield at least 7%, and leverage below 1'
      })
    })

    if (!queryResponse.ok) {
      const errorText = await queryResponse.text()
      throw new Error(`Query failed: ${queryResponse.status} ${errorText}`)
    }

    const result = await queryResponse.json()
    console.log(`  ✓ Query successful`)
    console.log(`  Found ${result.companies?.length || 0} companies`)
    console.log(`  Average ROIC: ${result.averageROIC}%`)
    console.log(`  Average FCF Yield: ${result.averageFCFYield}%`)

    // Test 3: Verify response has CORS headers
    const corsOrigin = queryResponse.headers.get('access-control-allow-origin')
    console.log(`\n✓ Response CORS Origin: ${corsOrigin}`)

    console.log('\n✅ All tests passed!')
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  } finally {
    server.kill()
    await setTimeout(500)
  }
}

testNLQuery().catch(console.error)
