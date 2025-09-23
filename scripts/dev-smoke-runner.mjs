import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitForPortFile(portFile, timeoutMs = 45000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(portFile)) {
      const content = fs.readFileSync(portFile, 'utf8').trim()
      const port = Number(content)
      if (Number.isFinite(port) && port > 0) return port
    }
    await delay(250)
  }
  throw new Error(`Timed out waiting for port file at ${portFile}`)
}

async function get(url) {
  return await fetch(url)
}
async function getJson(url) {
  const r = await get(url)
  if (!r.ok) throw new Error(`${url} -> ${r.status}`)
  return await r.json()
}
async function postJson(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!r.ok) throw new Error(`${url} -> ${r.status}`)
  return await r.json()
}
async function streamSSE(url, body, timeoutMs = 20000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  let acc = ''
  let got = false
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal
    })
    if (!r.ok || !r.body) throw new Error(`SSE ${url} -> ${r.status}`)
    const reader = r.body.getReader()
    const dec = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = dec.decode(value)
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') return acc
        try {
          const parsed = JSON.parse(data)
          if (parsed?.content) {
            acc += parsed.content
            got = true
          }
        } catch {}
      }
      if (got && acc.length > 20) return acc
    }
    if (!got) throw new Error('No SSE content received')
    return acc
  } finally {
    clearTimeout(t)
    try {
      ctrl.abort()
    } catch {}
  }
}

async function main() {
  const portFile = path.resolve('.local', 'dev_port')
  try {
    fs.mkdirSync(path.dirname(portFile), { recursive: true })
  } catch {}
  try {
    if (fs.existsSync(portFile)) fs.unlinkSync(portFile)
  } catch {}

  const tsxBin = path.resolve(
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'tsx.cmd' : 'tsx'
  )
  const child = spawn(tsxBin, [path.resolve('server', 'index.ts')], {
    env: { ...process.env, NODE_ENV: 'development', PORT: '0', PORT_FILE: portFile },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  child.stdout.on('data', (d) => process.stdout.write(d))
  child.stderr.on('data', (d) => process.stderr.write(d))
  let exitCode = null
  child.on('exit', (c) => {
    exitCode = c ?? 0
  })

  try {
    const port = await waitForPortFile(portFile)
    const base = `http://127.0.0.1:${port}`

    const health = await getJson(`${base}/api/health`)
    if (health?.status !== 'ok' || health?.env !== 'development')
      throw new Error('Dev health not ok')

    const routes = [
      '/',
      '/pos',
      '/scheduling',
      '/inventory',
      '/staff',
      '/analytics',
      '/marketing',
      '/loyalty'
    ]
    for (const r of routes) {
      const res = await get(base + r)
      if (!res.ok) throw new Error(`${r} -> ${res.status}`)
      const ctype = res.headers.get('content-type') || ''
      if (!ctype.includes('text/html')) throw new Error(`${r} wrong content-type: ${ctype}`)
    }

    // APIs
    const services = await getJson(`${base}/api/services`)
    if (!Array.isArray(services) || services.length === 0) throw new Error('Services empty')
    const staff = await getJson(`${base}/api/staff`)
    if (!Array.isArray(staff) || staff.length === 0) throw new Error('Staff empty')
    const appts = await getJson(`${base}/api/appointments?day=today`)
    if (!Array.isArray(appts)) throw new Error('Appointments not array')
    const analytics = await getJson(`${base}/api/analytics`)
    if (!Array.isArray(analytics)) throw new Error('Analytics not array')

    // Chat
    const chat = await postJson(`${base}/api/chat`, {
      messages: [{ role: 'user', content: 'What is our schedule today?' }],
      stream: false
    })
    if (!chat?.message) throw new Error('Chat missing message')
    const streamed = await streamSSE(`${base}/api/chat`, {
      messages: [{ role: 'user', content: 'Stream a quick summary of inventory status.' }],
      stream: true
    })
    if (!streamed || streamed.length < 10) throw new Error('SSE chat too short')

    // POS: create a sale with one service
    const svcId = services[0]?.id
    if (svcId) {
      const sale = await postJson(`${base}/api/pos/sales`, {
        items: [{ kind: 'service', id: svcId, quantity: 1 }]
      })
      if (!sale?.id) throw new Error('POS sale not created')
    }

    // Marketing: create a campaign
    const camp = await postJson(`${base}/api/marketing/campaigns`, {
      name: 'Test Campaign',
      description: 'Smoke test',
      channel: 'email',
      status: 'draft'
    })
    if (!camp?.id) throw new Error('Campaign not created')

    // Loyalty: add a reward to first customer
    const customers = await getJson(`${base}/api/customers`)
    if (customers?.[0]?.id) {
      const entry = await postJson(`${base}/api/loyalty/entries`, {
        customerId: customers[0].id,
        type: 'reward',
        points: 10,
        note: 'Smoke'
      })
      if (!entry?.id) throw new Error('Loyalty entry not created')
    }

    console.log('\nDev smoke runner passed.')
  } finally {
    try {
      if (child && exitCode === null) child.kill('SIGINT')
    } catch {}
  }
}

main().catch((err) => {
  console.error('Dev smoke runner failed:', err)
  process.exit(1)
})
