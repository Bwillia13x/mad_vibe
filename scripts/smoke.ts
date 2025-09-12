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

async function getJson(url: string) {
  const res = await get(url)
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return await res.json()
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
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
    env: { ...process.env, NODE_ENV: 'production', PORT: '0', PORT_FILE: portFile },
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

    // CSV export endpoint works
    const csvRes = await fetch(`${base}/api/analytics/export`)
    if (!csvRes.ok) throw new Error('CSV export not ok')
    const ctype = csvRes.headers.get('content-type') || ''
    if (!ctype.includes('text/csv')) throw new Error('CSV export wrong content-type')
    const csvText = await csvRes.text()
    if (!csvText.includes('totalRevenue')) throw new Error('CSV export content missing header')

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
