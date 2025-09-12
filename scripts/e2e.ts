import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'

async function delay(ms: number) { return new Promise(r => setTimeout(r, ms)) }

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

async function main() {
  const outDir = path.resolve('.local', 'screens')
  fs.mkdirSync(outDir, { recursive: true })
  const portFile = path.resolve('.local', 'e2e_port')
  try { if (fs.existsSync(portFile)) fs.unlinkSync(portFile) } catch {}

  // Start server
  const child = spawn(process.execPath, [path.resolve('dist', 'index.js')], {
    env: { ...process.env, NODE_ENV: 'production', PORT: '0', PORT_FILE: portFile },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  child.stdout.on('data', d => process.stdout.write(d))
  child.stderr.on('data', d => process.stderr.write(d))

  let exitCode: number | null = null
  child.on('exit', (code) => { exitCode = code ?? 0 })

  try {
    const port = await waitForPortFile(portFile)
    const base = `http://127.0.0.1:${port}`

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    const page = await browser.newPage()
    page.setViewport({ width: 1280, height: 800 })

    // Home
    await page.goto(base + '/?scenario=low_inventory&seed=123')
    await page.waitForSelector('[data-testid="heading-main"]', { timeout: 10000 })
    await page.screenshot({ path: path.join(outDir, 'home.png') })

    // Scheduling
    await page.goto(base + '/scheduling')
    await page.waitForSelector('[data-testid="heading-scheduling"]', { timeout: 10000 })
    await page.screenshot({ path: path.join(outDir, 'scheduling.png') })

    // Inventory
    await page.goto(base + '/inventory')
    await page.waitForSelector('[data-testid="heading-inventory"]', { timeout: 10000 })
    await page.screenshot({ path: path.join(outDir, 'inventory.png') })

    // Analytics
    await page.goto(base + '/analytics')
    await page.waitForSelector('[data-testid="heading-analytics"]', { timeout: 10000 })
    await page.screenshot({ path: path.join(outDir, 'analytics.png') })

    // Staff
    await page.goto(base + '/staff')
    await page.waitForSelector('[data-testid="heading-staff"]', { timeout: 10000 })
    await page.screenshot({ path: path.join(outDir, 'staff.png') })

    await browser.close()
    console.log(`E2E screenshots saved to ${outDir}`)
  } finally {
    try { if (child && exitCode === null) child.kill('SIGINT') } catch {}
  }
}

main().catch((err) => { console.error('E2E failed:', err); process.exit(1) })

