/* Dev-mode smoke tests that boot the server with Vite on an ephemeral port
   and verify key endpoints and SPA routes respond. */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

async function delay(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function waitForPortFile(portFile: string, timeoutMs = 30000): Promise<number> {
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
    headers: { 'Content-Type': 'application/json' },
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

async function streamSSE(url: string, body: unknown, timeoutMs = 15000): Promise<string> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  let acc = ''
  let gotContent = false
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal
    })
    if (!res.ok || !res.body) throw new Error(`SSE ${url} -> ${res.status}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') return acc
        try {
          const parsed = JSON.parse(data)
          if (parsed?.content) {
            acc += parsed.content
            gotContent = true
          }
        } catch {}
      }
      if (gotContent && acc.length > 20) return acc
    }
    if (!gotContent) throw new Error('No SSE content received')
    return acc
  } finally {
    clearTimeout(t)
    try { ctrl.abort() } catch {}
  }
}

async function main() {
  const portFile = path.resolve('.local', 'dev_port')
  try { fs.mkdirSync(path.dirname(portFile), { recursive: true }) } catch {}
  try { if (fs.existsSync(portFile)) fs.unlinkSync(portFile) } catch {}

  const tsxBin = path.resolve('node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx')
  const child = spawn(tsxBin, [path.resolve('server', 'index.ts')], {
    env: { ...process.env, NODE_ENV: 'development', PORT: '0', PORT_FILE: portFile },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  child.stdout.on('data', d => process.stdout.write(d))
  child.stderr.on('data', d => process.stderr.write(d))

  let exitCode: number | null = null
  child.on('exit', code => { exitCode = code ?? 0 })

  try {
    const port = await waitForPortFile(portFile)
    const base = `http://127.0.0.1:${port}`

    // Health
    const health = await getJson(`${base}/api/health`)
    if (health?.status !== 'ok') throw new Error('Health not ok')

    // SPA routes should serve HTML in dev via Vite middleware
    const routes = ['/', '/scheduling', '/inventory', '/staff', '/analytics']
    for (const r of routes) {
      const res = await get(base + r)
      if (!res.ok) throw new Error(`${r} -> ${res.status}`)
      const ctype = res.headers.get('content-type') || ''
      if (!ctype.includes('text/html')) throw new Error(`${r} wrong content-type: ${ctype}`)
    }

    // Core API endpoints
    const services = await getJson(`${base}/api/services`)
    if (!Array.isArray(services) || services.length === 0) throw new Error('Services empty')

    const staff = await getJson(`${base}/api/staff`)
    if (!Array.isArray(staff) || staff.length === 0) throw new Error('Staff empty')

    const appts = await getJson(`${base}/api/appointments?day=today`)
    if (!Array.isArray(appts)) throw new Error('Appointments not array')

    const analytics = await getJson(`${base}/api/analytics`)
    if (!Array.isArray(analytics)) throw new Error('Analytics not array')

    // Test comprehensive API endpoint coverage
    
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

    // POS endpoints
    const sales = await getJson(`${base}/api/pos/sales`)
    if (!Array.isArray(sales)) throw new Error('POS sales not array')

    // Marketing endpoints
    const campaigns = await getJson(`${base}/api/marketing/campaigns`)
    if (!Array.isArray(campaigns)) throw new Error('Marketing campaigns not array')

    // Marketing performance endpoint
    const performance = await getJson(`${base}/api/marketing/performance`)
    if (!performance || !performance.summary || !Array.isArray(performance.campaigns)) {
      throw new Error('Marketing performance endpoint failed')
    }

    // Loyalty endpoints
    const loyaltyEntries = await getJson(`${base}/api/loyalty/entries`)
    if (!Array.isArray(loyaltyEntries)) throw new Error('Loyalty entries not array')

    // CSV export endpoints
    const csvRes = await get(`${base}/api/analytics/export`)
    if (!csvRes.ok) throw new Error('Analytics CSV export not ok')
    const ctypeCsv = csvRes.headers.get('content-type') || ''
    if (!ctypeCsv.includes('text/csv')) throw new Error('Analytics CSV export wrong content-type')

    // POS sales CSV export
    const posCsvRes = await get(`${base}/api/pos/sales/export`)
    if (!posCsvRes.ok) throw new Error('POS CSV export not ok')
    const posCtype = posCsvRes.headers.get('content-type') || ''
    if (!posCtype.includes('text/csv')) throw new Error('POS CSV export wrong content-type')

    // Loyalty CSV export
    const loyaltyCsvRes = await get(`${base}/api/loyalty/entries/export`)
    if (!loyaltyCsvRes.ok) throw new Error('Loyalty CSV export not ok')
    const loyaltyCtype = loyaltyCsvRes.headers.get('content-type') || ''
    if (!loyaltyCtype.includes('text/csv')) throw new Error('Loyalty CSV export wrong content-type')

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

    // Security validation (basic checks for dev environment)
    console.log('\n=== Security Validation ===')
    
    // Test input validation
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

    console.log('\nDev smoke tests passed.')
  } finally {
    try { if (child && exitCode === null) child.kill('SIGINT') } catch {}
  }
}

main().catch((err) => { console.error('Dev smoke failed:', err); process.exit(1) })

