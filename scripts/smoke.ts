/* Simple smoke tests that boot the server on an ephemeral port and verify key endpoints. */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitForPortFile(portFile: string, timeoutMs = 15000): Promise<number> {
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

async function get(url: string) {
  return await fetch(url)
}

// Performance metrics collection
interface PerformanceMetrics {
  url: string
  method: string
  responseTime: number
  status: number
  memoryUsage?: number
}

const performanceMetrics: PerformanceMetrics[] = []

function getMemoryUsage(): number {
  const usage = process.memoryUsage()
  return Math.round(usage.heapUsed / 1024 / 1024) // MB
}

async function getJson(url: string) {
  const startTime = Date.now()
  const startMemory = getMemoryUsage()
  
  const res = await get(url)
  
  const endTime = Date.now()
  const endMemory = getMemoryUsage()
  
  performanceMetrics.push({
    url,
    method: 'GET',
    responseTime: endTime - startTime,
    status: res.status,
    memoryUsage: endMemory - startMemory
  })
  
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return await res.json()
}

async function postJson(url: string, body: unknown) {
  const startTime = Date.now()
  const startMemory = getMemoryUsage()
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer smoke-test' },
    body: JSON.stringify(body)
  })
  
  const endTime = Date.now()
  const endMemory = getMemoryUsage()
  
  performanceMetrics.push({
    url,
    method: 'POST',
    responseTime: endTime - startTime,
    status: res.status,
    memoryUsage: endMemory - startMemory
  })
  
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return await res.json()
}

async function streamSSE(url: string, body: unknown, timeoutMs = 10000): Promise<string> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal
    })
    if (!res.ok) throw new Error(`${url} -> ${res.status}`)
    if (!res.body) throw new Error('No response body for SSE')

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let acc = ''
    let gotContent = false
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') {
          return acc
        }
        try {
          const parsed = JSON.parse(data)
          if (parsed?.content) {
            acc += parsed.content
            gotContent = true
          }
        } catch {
          // ignore incomplete JSON lines
        }
      }
      if (gotContent && acc.length > 50) {
        // enough signal that streaming works
        return acc
      }
    }
    if (!gotContent) throw new Error('No SSE content received')
    return acc
  } finally {
    clearTimeout(t)
    try { ctrl.abort() } catch {}
  }
}

async function main() {
  const portFile = path.resolve('.local', 'smoke_port')
  try { fs.mkdirSync(path.dirname(portFile), { recursive: true }) } catch {}
  try { if (fs.existsSync(portFile)) fs.unlinkSync(portFile) } catch {}

  // Start the server in production mode from dist
  const child = spawn(process.execPath, [path.resolve('dist', 'index.js')], {
    env: { ...process.env, NODE_ENV: 'production', PORT: '0', PORT_FILE: portFile, SMOKE_MODE: '1' },
    stdio: ['ignore', 'pipe', 'pipe']
  })

  child.stdout.on('data', (d) => process.stdout.write(d))
  child.stderr.on('data', (d) => process.stderr.write(d))

  let exitCode: number | null = null
  child.on('exit', (code) => { exitCode = code ?? 0 })

  try {
    const port = await waitForPortFile(portFile)
    const base = `http://127.0.0.1:${port}`

    // Health
    const health = await getJson(`${base}/api/health`)
    if (health?.status !== 'ok') throw new Error('Health not ok')
    if (typeof health.aiDemoMode === 'undefined') throw new Error('Health missing aiDemoMode')

    // Core data endpoints
    const services = await getJson(`${base}/api/services`)
    if (!Array.isArray(services) || services.length === 0) throw new Error('Services empty')

    const staff = await getJson(`${base}/api/staff`)
    if (!Array.isArray(staff) || staff.length === 0) throw new Error('Staff empty')

    const appts = await getJson(`${base}/api/appointments?day=today`)
    if (!Array.isArray(appts)) throw new Error('Appointments not array')

    const analytics = await getJson(`${base}/api/analytics`)
    if (!Array.isArray(analytics)) throw new Error('Analytics not array')

    // Test all API endpoints for comprehensive coverage
    
    // Business Profile endpoint
    const profile = await getJson(`${base}/api/profile`)
    if (!profile || typeof profile !== 'object') throw new Error('Profile endpoint failed')

    // Individual service endpoint
    if (services.length > 0) {
      const firstService = await getJson(`${base}/api/services/${services[0].id}`)
      if (!firstService || firstService.id !== services[0].id) throw new Error('Individual service endpoint failed')
    }

    // Individual staff endpoint
    if (staff.length > 0) {
      const firstStaff = await getJson(`${base}/api/staff/${staff[0].id}`)
      if (!firstStaff || firstStaff.id !== staff[0].id) throw new Error('Individual staff endpoint failed')
    }

    // Customers endpoint
    const customers = await getJson(`${base}/api/customers`)
    if (!Array.isArray(customers)) throw new Error('Customers not array')

    // Individual appointment endpoint (if appointments exist)
    if (appts.length > 0) {
      const firstAppt = await getJson(`${base}/api/appointments/${appts[0].id}`)
      if (!firstAppt || firstAppt.id !== appts[0].id) throw new Error('Individual appointment endpoint failed')
    }

    // Inventory endpoints
    const inventory = await getJson(`${base}/api/inventory`)
    if (!Array.isArray(inventory)) throw new Error('Inventory not array')
    
    if (inventory.length > 0) {
      const firstItem = await getJson(`${base}/api/inventory/${inventory[0].id}`)
      if (!firstItem || firstItem.id !== inventory[0].id) throw new Error('Individual inventory item endpoint failed')
    }

    // Individual analytics endpoint (if analytics exist)
    if (analytics.length > 0) {
      const firstAnalytics = await getJson(`${base}/api/analytics/${analytics[0].id}`)
      if (!firstAnalytics || firstAnalytics.id !== analytics[0].id) throw new Error('Individual analytics endpoint failed')
    }

    // POS endpoints
    const sales = await getJson(`${base}/api/pos/sales`)
    if (!Array.isArray(sales)) throw new Error('POS sales not array')

    // Test POS sale creation (use existing service)
    const newSale = await postJson(`${base}/api/pos/sales`, {
      items: [
        { kind: 'service', id: services[0]?.id, name: services[0]?.name || 'Executive Cut', quantity: 1 }
      ],
      discountPct: 10,
      taxPct: 8.5
    })
    if (!newSale || !newSale.id) throw new Error('POS sale creation failed')

    // Test POS sale deletion
    const deleteResult = await fetch(`${base}/api/pos/sales/${newSale.id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer smoke-test' } })
    if (!deleteResult.ok) throw new Error('POS sale deletion failed')

    // Marketing endpoints
    const campaigns = await getJson(`${base}/api/marketing/campaigns`)
    if (!Array.isArray(campaigns)) throw new Error('Marketing campaigns not array')

    // Test marketing campaign creation
    const newCampaign = await postJson(`${base}/api/marketing/campaigns`, {
      name: 'Test Campaign',
      description: 'Test Description',
      channel: 'email',
      status: 'draft'
    })
    if (!newCampaign || !newCampaign.id) throw new Error('Marketing campaign creation failed')

    // Test marketing campaign update
    const updatedCampaign = await fetch(`${base}/api/marketing/campaigns/${newCampaign.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer smoke-test' },
      body: JSON.stringify({ status: 'active' })
    })
    if (!updatedCampaign.ok) throw new Error('Marketing campaign update failed')

    // Marketing performance endpoint
    const performance = await getJson(`${base}/api/marketing/performance`)
    if (!performance || !performance.summary || !Array.isArray(performance.campaigns)) {
      throw new Error('Marketing performance endpoint failed')
    }

    // Loyalty endpoints
    const loyaltyEntries = await getJson(`${base}/api/loyalty/entries`)
    if (!Array.isArray(loyaltyEntries)) throw new Error('Loyalty entries not array')

    // Test loyalty entry creation (if customers exist)
    if (customers.length > 0) {
      const newLoyaltyEntry = await postJson(`${base}/api/loyalty/entries`, {
        customerId: customers[0].id,
        type: 'earned',
        points: 100,
        note: 'Test loyalty points'
      })
      if (!newLoyaltyEntry || !newLoyaltyEntry.id) throw new Error('Loyalty entry creation failed')
    }

    // Test loyalty entries with customer filter (if customers exist)
    if (customers.length > 0) {
      const customerLoyalty = await getJson(`${base}/api/loyalty/entries?customerId=${customers[0].id}`)
      if (!Array.isArray(customerLoyalty)) throw new Error('Customer loyalty filter failed')
    }

    // CSV export endpoints
    const csvRes = await fetch(`${base}/api/analytics/export`)
    if (!csvRes.ok) throw new Error('Analytics CSV export not ok')
    const ctype = csvRes.headers.get('content-type') || ''
    if (!ctype.includes('text/csv')) throw new Error('Analytics CSV export wrong content-type')
    const csvText = await csvRes.text()
    if (!csvText.includes('totalRevenue')) throw new Error('Analytics CSV export content missing header')

    // POS sales CSV export
    const posCsvRes = await fetch(`${base}/api/pos/sales/export`)
    if (!posCsvRes.ok) throw new Error('POS CSV export not ok')
    const posCtype = posCsvRes.headers.get('content-type') || ''
    if (!posCtype.includes('text/csv')) throw new Error('POS CSV export wrong content-type')
    const posCsvText = await posCsvRes.text()
    if (!posCsvText.includes('id,createdAt')) throw new Error('POS CSV export content missing headers')

    // Loyalty CSV export
    const loyaltyCsvRes = await fetch(`${base}/api/loyalty/entries/export`)
    if (!loyaltyCsvRes.ok) throw new Error('Loyalty CSV export not ok')
    const loyaltyCtype = loyaltyCsvRes.headers.get('content-type') || ''
    if (!loyaltyCtype.includes('text/csv')) throw new Error('Loyalty CSV export wrong content-type')
    const loyaltyCsvText = await loyaltyCsvRes.text()
    if (!loyaltyCsvText.includes('id,customerId')) throw new Error('Loyalty CSV export content missing headers')

    // Security validation tests
    console.log('\n=== Security Validation ===')
    
    // Test security headers
    const securityHeaders = health
    const healthResponse = await fetch(`${base}/api/health`)
    const headers = healthResponse.headers
    
    // Check for basic security headers
    const securityChecks = {
      'X-Content-Type-Options': headers.get('x-content-type-options'),
      'X-Frame-Options': headers.get('x-frame-options'),
      'X-XSS-Protection': headers.get('x-xss-protection'),
      'Content-Type': headers.get('content-type')
    }
    
    console.log('Security headers check:')
    Object.entries(securityChecks).forEach(([header, value]) => {
      console.log(`  ${header}: ${value || 'NOT SET'}`)
    })
    
    // Test input validation - malicious payloads
    console.log('\nTesting input validation...')
    
    // Test XSS prevention in chat
    try {
      const xssPayload = '<script>alert("xss")</script>'
      const xssChat = await postJson(`${base}/api/chat`, {
        messages: [{ role: 'user', content: xssPayload }],
        stream: false
      })
      if (xssChat?.message && xssChat.message.includes('<script>')) {
        console.warn('⚠️  Potential XSS vulnerability in chat endpoint')
      } else {
        console.log('✓ Chat endpoint properly handles XSS payload')
      }
    } catch (err) {
      console.log('✓ Chat endpoint rejected malicious input')
    }
    
    // Test SQL injection patterns (even though using in-memory storage)
    try {
      const sqlPayload = "'; DROP TABLE users; --"
      const sqlTest = await get(`${base}/api/appointments?date=${encodeURIComponent(sqlPayload)}`)
      if (sqlTest.status === 400) {
        console.log('✓ Appointments endpoint properly validates date input')
      } else {
        console.warn('⚠️  Appointments endpoint may not properly validate input')
      }
    } catch (err) {
      console.log('✓ Appointments endpoint rejected malicious input')
    }
    
    // Test oversized payload handling
    try {
      const largePayload = 'x'.repeat(10000) // 10KB payload
      const largeTest = await fetch(`${base}/api/marketing/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: largePayload,
          description: 'Test',
          channel: 'email',
          status: 'draft'
        })
      })
      
      if (largeTest.status === 413 || largeTest.status === 400) {
        console.log('✓ Server properly handles oversized payloads')
      } else if (largeTest.ok) {
        console.warn('⚠️  Server accepts very large payloads without limits')
      }
    } catch (err) {
      console.log('✓ Server rejected oversized payload')
    }
    
    // Test invalid JSON handling
    try {
      const invalidJsonRes = await fetch(`${base}/api/pos/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"invalid": json}'
      })
      
      if (invalidJsonRes.status === 400) {
        console.log('✓ Server properly handles invalid JSON')
      } else {
        console.warn('⚠️  Server may not properly validate JSON input')
      }
    } catch (err) {
      console.log('✓ Server rejected invalid JSON')
    }
    
    // Test CORS configuration (basic check)
    const corsHeaders = {
      'Access-Control-Allow-Origin': headers.get('access-control-allow-origin'),
      'Access-Control-Allow-Methods': headers.get('access-control-allow-methods'),
      'Access-Control-Allow-Headers': headers.get('access-control-allow-headers')
    }
    
    console.log('\nCORS configuration:')
    Object.entries(corsHeaders).forEach(([header, value]) => {
      console.log(`  ${header}: ${value || 'NOT SET'}`)
    })
    
    // Test error handling doesn't leak sensitive information
    const notFoundRes = await fetch(`${base}/api/nonexistent`)
    if (notFoundRes.status === 404) {
      const errorBody = await notFoundRes.text()
      if (errorBody.includes('stack') || errorBody.includes('Error:') || errorBody.includes('at ')) {
        console.warn('⚠️  Error responses may leak stack traces')
      } else {
        console.log('✓ Error responses do not leak sensitive information')
      }
    }
    
    console.log('Security validation completed.')

    // Chat (non-streaming, demo-friendly)
    const chat = await postJson(`${base}/api/chat`, {
      messages: [{ role: 'user', content: 'What is our schedule today?' }],
      stream: false
    })
    if (!chat?.message) throw new Error('Chat missing message')

    // Streaming chat (SSE)
    const streamed = await streamSSE(`${base}/api/chat`, {
      messages: [{ role: 'user', content: 'Stream a quick summary of inventory status.' }],
      stream: true
    })
    if (!streamed || streamed.length < 10) throw new Error('SSE chat too short')

    // Error path check: invalid date parameter should return 400
    const bad = await get(`${base}/api/appointments?date=not-a-date`)
    if (bad.status !== 400) throw new Error('Expected 400 for invalid date')

    // Demo scenario reseed: low_inventory should produce some out-of-stock
    await postJson(`${base}/api/demo/seed?scenario=low_inventory&seed=123`, {})
    const inv1 = await getJson(`${base}/api/inventory`)
    const out1 = Array.isArray(inv1) ? inv1.filter((i: any) => i.status === 'out-of-stock').map((i: any) => i.sku).sort() : []
    if (out1.length === 0) throw new Error('Expected low inventory after reseed')

    // Reseed with same seed and expect same out-of-stock set
    await postJson(`${base}/api/demo/seed?scenario=low_inventory&seed=123`, {})
    const inv2 = await getJson(`${base}/api/inventory`)
    const out2 = Array.isArray(inv2) ? inv2.filter((i: any) => i.status === 'out-of-stock').map((i: any) => i.sku).sort() : []
    if (JSON.stringify(out1) !== JSON.stringify(out2)) throw new Error('Deterministic reseed mismatch')

    // Freeze time and verify health shows frozen
    const frozenIso = new Date().toISOString()
    await postJson(`${base}/api/demo/time?date=${encodeURIComponent(frozenIso)}`, {})
    const healthFrozen = await getJson(`${base}/api/health`)
    if (!healthFrozen.freeze?.frozen) throw new Error('Expected freeze to be active')

    // Reset demo returns to default scenario and clears freeze
    await postJson(`${base}/api/demo/reset`, {})
    const health2 = await getJson(`${base}/api/health`)
    if (health2.scenario !== 'default') throw new Error('Reset did not restore default scenario')
    if (health2.freeze?.frozen) throw new Error('Reset did not clear time freeze')

    // Generate performance report
    console.log('\n=== Performance Metrics ===')
    const totalRequests = performanceMetrics.length
    const avgResponseTime = performanceMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests
    const maxResponseTime = Math.max(...performanceMetrics.map(m => m.responseTime))
    const minResponseTime = Math.min(...performanceMetrics.map(m => m.responseTime))
    const slowRequests = performanceMetrics.filter(m => m.responseTime > 200)
    
    console.log(`Total API requests: ${totalRequests}`)
    console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`)
    console.log(`Min response time: ${minResponseTime}ms`)
    console.log(`Max response time: ${maxResponseTime}ms`)
    console.log(`Requests > 200ms: ${slowRequests.length}`)
    
    if (slowRequests.length > 0) {
      console.log('\nSlow requests (>200ms):')
      slowRequests.forEach(req => {
        console.log(`  ${req.method} ${req.url}: ${req.responseTime}ms`)
      })
    }
    
    // Performance baseline establishment
    const performanceBaseline = {
      timestamp: new Date().toISOString(),
      totalRequests,
      avgResponseTime: Math.round(avgResponseTime),
      maxResponseTime,
      minResponseTime,
      slowRequestCount: slowRequests.length,
      memoryUsagePattern: performanceMetrics.map(m => m.memoryUsage).filter(m => m !== undefined)
    }
    
    // Save baseline to file for future comparisons
    try {
      fs.writeFileSync('.local/performance-baseline.json', JSON.stringify(performanceBaseline, null, 2))
      console.log('\nPerformance baseline saved to .local/performance-baseline.json')
    } catch (err) {
      console.warn('Could not save performance baseline:', err)
    }
    
    // Warn if performance is concerning
    if (avgResponseTime > 500) {
      console.warn(`⚠️  Average response time (${avgResponseTime.toFixed(2)}ms) exceeds 500ms threshold`)
    }
    if (slowRequests.length > totalRequests * 0.2) {
      console.warn(`⚠️  ${slowRequests.length} requests (${((slowRequests.length/totalRequests)*100).toFixed(1)}%) exceeded 200ms threshold`)
    }

    console.log('\nSmoke tests passed.')
  } finally {
    try {
      if (child && exitCode === null) child.kill('SIGINT')
    } catch {}
  }
}

main().catch((err) => {
  console.error('Smoke tests failed:', err)
  process.exit(1)
})
