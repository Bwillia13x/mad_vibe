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

    // CSV export endpoint works
    const csvRes = await get(`${base}/api/analytics/export`)
    if (!csvRes.ok) throw new Error('CSV export not ok')
    const ctypeCsv = csvRes.headers.get('content-type') || ''
    if (!ctypeCsv.includes('text/csv')) throw new Error('CSV export wrong content-type')

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

    console.log('\nDev smoke tests passed.')
  } finally {
    try { if (child && exitCode === null) child.kill('SIGINT') } catch {}
  }
}

main().catch((err) => { console.error('Dev smoke failed:', err); process.exit(1) })

