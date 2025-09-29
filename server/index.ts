import express, { type Request, Response, NextFunction } from 'express'
import session from 'express-session'
import fs from 'fs'
import { registerRoutes } from './routes'
import { setupVite, serveStatic, log } from './vite'
import { getEnvVar } from '../lib/env-security'
import { enhancedErrorHandler } from './middleware/error-handling'
import { requestThrottler } from './middleware/request-throttling'
import { resourceManager } from '../lib/resource-manager'
import { performanceMonitor } from '../lib/performance-monitor'
import { performanceOptimizer } from '../lib/performance-optimizer'
import { memoryOptimizer } from '../lib/memory-optimization'

// Initialize performance systems (they auto-start on import)
void resourceManager
void performanceOptimizer
void memoryOptimizer

const app = express()

// Configure Express for better performance under load
app.set('trust proxy', 1) // Trust first proxy for proper IP detection
app.set('x-powered-by', false) // Remove X-Powered-By header for security

// Apply request throttling middleware early in the stack
app.use(requestThrottler.middleware())

// Configure secure session middleware
app.use(
  session({
    secret: (getEnvVar('SESSION_SECRET') as string) || 'fallback-dev-secret-change-in-production',
    name: 'sessionId', // Change default session name for security
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiration on activity
    cookie: {
      secure: app.get('env') === 'production', // HTTPS only in production
      httpOnly: true, // Prevent XSS access to cookies
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict' // CSRF protection
    }
  })
)

// Configure JSON parsing with size limits for security
app.use(
  express.json({
    limit: '2mb',
    strict: true,
    type: ['application/json', 'text/plain']
  })
)

app.use(
  express.urlencoded({
    extended: false,
    limit: '2mb',
    parameterLimit: 100
  })
)

app.use((req, res, next) => {
  const start = Date.now()
  const path = req.path
  let capturedJsonResponse: unknown

  const originalResJson = res.json.bind(res)
  const jsonOverride = (...args: Parameters<typeof res.json>): ReturnType<typeof res.json> => {
    capturedJsonResponse = args[0]
    return originalResJson(...args)
  }
  res.json = jsonOverride as typeof res.json

  res.on('finish', () => {
    const duration = Date.now() - start

    // Record request metrics for performance monitoring
    performanceMonitor.recordRequest(req, res, duration)

    if (path.startsWith('/api')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + '…'
      }

      log(logLine)
    }
  })

  next()
})
;(async () => {
  const server = await registerRoutes(app)

  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    // Use enhanced error handler
    enhancedErrorHandler(req, res, next, err)
  })

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get('env') === 'development') {
    await setupVite(app, server)
  } else {
    serveStatic(app)
  }

  // Initialize demo data before starting the server
  try {
    // Import storage here to avoid circular dependencies
    const { storage } = await import('./storage')
    if (getEnvVar('NODE_ENV') !== 'test') {
      await storage.seedDemoData()
      log('Demo data initialized successfully')
    } else {
      log('Skipping demo data seeding in test mode')
    }
  } catch (error) {
    log(`Error initializing demo data: ${error}`)
    // Continue server startup even if seeding fails
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const desiredPort = getEnvVar('PORT') ?? 5000
  const host = '0.0.0.0'

  // Configure server for better connection handling under load
  server.keepAliveTimeout = 65000 // 65 seconds (longer than typical load balancer timeout)
  server.headersTimeout = 66000 // 66 seconds (slightly longer than keepAliveTimeout)
  server.requestTimeout = 30000 // 30 seconds for individual requests
  server.timeout = 120000 // 2 minutes for socket timeout

  // Set maximum number of concurrent connections
  server.maxConnections = 1000

  // Configure TCP settings for better performance and track connections
  server.on('connection', (socket) => {
    performanceMonitor.onConnectionOpen()

    socket.setKeepAlive(true, 30000) // Enable keep-alive with 30s initial delay
    socket.setNoDelay(true) // Disable Nagle's algorithm for lower latency
    socket.setTimeout(120000) // 2 minute socket timeout

    socket.on('close', () => {
      performanceMonitor.onConnectionClose()
    })
  })

  async function tryListen(portToUse: number): Promise<boolean> {
    return await new Promise<boolean>((resolve) => {
      const onError = (err: unknown) => {
        let descriptor: string
        if (err instanceof Error) {
          descriptor = err.message
        } else if (typeof err === 'object' && err !== null && 'code' in err) {
          const code = (err as { code?: unknown }).code
          descriptor = String(code ?? err)
        } else {
          descriptor = String(err)
        }

        log(`listen error on ${host}:${portToUse} -> ${descriptor}`, 'express')
        server.off('listening', onListening)
        server.off('error', onError)
        resolve(false)
      }
      const onListening = () => {
        const address = server.address()
        // @ts-ignore - Node typings allow address to be string | AddressInfo | null
        const actualPort = typeof address === 'object' && address ? address.port : portToUse
        log(`serving on port ${actualPort} with enhanced connection handling`)
        log(
          `Server configuration: keepAlive=${server.keepAliveTimeout}ms, maxConnections=${server.maxConnections}`
        )

        // Optionally write the bound port to a file for smoke tests or tooling
        const portFile = getEnvVar('PORT_FILE')
        if (portFile) {
          try {
            fs.writeFileSync(portFile, String(actualPort), { encoding: 'utf8' })
          } catch {}
        }
        server.off('error', onError)
        server.off('listening', onListening)
        resolve(true)
      }
      server.once('error', onError)
      server.once('listening', onListening)
      try {
        server.listen({ port: portToUse, host })
      } catch (err) {
        onError(err)
      }
    })
  }

  // Attempt to bind to the desired port, then try a few alternatives
  const portNumber = typeof desiredPort === 'string' ? parseInt(desiredPort, 10) : desiredPort
  let bound = await tryListen(portNumber)
  if (!bound) {
    for (let i = 1; i <= 5 && !bound; i++) {
      const nextPort = portNumber + i
      bound = await tryListen(nextPort)
    }
    if (!bound) {
      log(`Could not bind to ${host} on ${portNumber}-${portNumber + 5}.`, 'express')
    }
  }
})()
