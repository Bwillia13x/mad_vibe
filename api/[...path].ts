import express, { type Request, type Response, type NextFunction } from 'express'
import { registerRoutes } from '../server/routes'
import { storage } from '../server/storage'

// Minimal logging for serverless environment
function log(line: string) {
  const ts = new Date().toISOString()
  console.log(`[api ${ts}] ${line}`)
}

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// Log API calls
app.use((req, res, next) => {
  const start = Date.now()
  const path = req.path
  res.on('finish', () => {
    const duration = Date.now() - start
    if (path.startsWith('/api') || path === '/') {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`)
    }
  })
  next()
})

// Register application routes once
const ready = (async () => {
  await registerRoutes(app)
})()

let seeded = false
async function ensureSeed() {
  if (!seeded) {
    try {
      await storage.seedDemoData()
      seeded = true
      log('Demo data initialized (serverless)')
    } catch (e) {
      log(`Seed error: ${(e as Error).message}`)
    }
  }
}

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err?.status || err?.statusCode || 500
  const message = err?.message || 'Internal Server Error'
  try { res.status(status).json({ message }) } catch {}
  log(`Unhandled error: ${message}`)
})

export default async function handler(req: Request, res: Response) {
  await ready
  await ensureSeed()
  ;(app as any)(req, res)
}

