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

async function expectActive(page: puppeteer.Page, id: string) {
  const cls = await page.$eval(id, el => (el as HTMLElement).className)
  if (!/bg-blue-100/.test(cls) && !/dark:bg-blue-900/.test(cls)) {
    throw new Error(`${id} not active; class="${cls}"`)
  }
}

async function expectInactive(page: puppeteer.Page, id: string) {
  const cls = await page.$eval(id, el => (el as HTMLElement).className)
  if (/bg-blue-100/.test(cls) || /dark:bg-blue-900/.test(cls)) {
    throw new Error(`${id} unexpectedly active; class="${cls}"`)
  }
}

async function main() {
  const portFile = path.resolve('.local', 'nav_port')
  try { fs.mkdirSync(path.dirname(portFile), { recursive: true }) } catch {}
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

    const toButton = (name: string) => `[data-testid="button-tool-${name}"]`

    // Open home
    await page.goto(base + '/')
    await page.waitForSelector('[data-testid="heading-main"]', { timeout: 10000 })

    // Sidebar is open by default; Chat should be active
    await expectActive(page, toButton('chat'))
    await expectInactive(page, toButton('scheduling'))

    // Navigate via sidebar buttons and verify headings + active state
    // Scheduling
    await page.click(toButton('scheduling'))
    await page.waitForSelector('[data-testid="heading-scheduling"]', { timeout: 10000 })
    await expectActive(page, toButton('scheduling'))
    await expectInactive(page, toButton('chat'))

    // Inventory
    await page.click(toButton('inventory'))
    await page.waitForSelector('[data-testid="heading-inventory"]', { timeout: 10000 })
    await expectActive(page, toButton('inventory'))

    // Staff
    await page.click(toButton('staff'))
    await page.waitForSelector('[data-testid="heading-staff"]', { timeout: 10000 })
    await expectActive(page, toButton('staff'))

    // Analytics
    await page.click(toButton('analytics'))
    await page.waitForSelector('[data-testid="heading-analytics"]', { timeout: 10000 })
    await expectActive(page, toButton('analytics'))

    // POS
    await page.click(toButton('pos'))
    await page.waitForSelector('[data-testid="heading-pos"]', { timeout: 10000 })
    await expectActive(page, toButton('pos'))

    // Marketing
    await page.click(toButton('marketing'))
    await page.waitForSelector('[data-testid="heading-marketing"]', { timeout: 10000 })
    await expectActive(page, toButton('marketing'))

    // Loyalty
    await page.click(toButton('loyalty'))
    await page.waitForSelector('[data-testid="heading-loyalty"]', { timeout: 10000 })
    await expectActive(page, toButton('loyalty'))

    // Toggle sidebar closed and confirm labels hidden
    await page.click('[data-testid="button-toggle-sidebar"]')
    await delay(250)
    const invTextClosed = await page.$eval(toButton('inventory'), el => (el.textContent || '').trim())
    if (invTextClosed.length > 0) throw new Error('Sidebar closed but inventory label still visible')

    // Hover should show tooltip for Staff when collapsed
    await page.hover(toButton('staff'))
    await page.waitForFunction(() => {
      const nodes = Array.from(document.querySelectorAll('[role="tooltip"],[data-state="delayed-open"],[data-side]'))
      return nodes.some((n: any) => (n.textContent || '').trim() === 'Staff')
    }, { timeout: 2000 })
    await delay(500)

    // Reload and ensure collapsed state persisted
    await page.reload({ waitUntil: 'networkidle0' })
    await page.waitForSelector('[data-testid="heading-analytics"]', { timeout: 10000 })
    const invTextClosedReload = await page.$eval(toButton('inventory'), el => (el.textContent || '').trim())
    const sidebarClass = await page.$eval('[data-testid="sidebar"]', el => (el as HTMLElement).className)
    const persisted = await page.evaluate(() => localStorage.getItem('av_sidebar_open'))
    if (invTextClosedReload.length > 0 || !/\bw-16\b/.test(sidebarClass)) {
      throw new Error(`Sidebar persisted state failed after reload (text='${invTextClosedReload}', class='${sidebarClass}', stored='${persisted}')`)
    }

    // Toggle open again and confirm labels visible
    await page.click('[data-testid="button-toggle-sidebar"]')
    await delay(250)
    const invTextOpen = await page.$eval(toButton('inventory'), el => (el.textContent || '').toLowerCase())
    if (!invTextOpen.includes('inventory')) throw new Error('Sidebar open but inventory label missing')

    // Keyboard shortcuts: g + i -> inventory
    await page.keyboard.type('gi')
    await page.waitForSelector('[data-testid="heading-inventory"]', { timeout: 10000 })

    await browser.close()
    console.log('Navigation E2E passed.')
  } finally {
    try { if (child && exitCode === null) child.kill('SIGINT') } catch {}
  }
}

main().catch((err) => { console.error('Navigation E2E failed:', err); process.exit(1) })
