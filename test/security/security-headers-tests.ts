import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express, { Express } from 'express'
import {
  securityHeaders,
  strictSecurityHeaders,
  createSecurityHeadersMiddleware,
  validateSecurityConfig,
  type SecurityHeadersConfig
} from '../../server/middleware/security-headers'

describe('Security Headers Middleware', () => {
  let app: Express

  beforeEach(() => {
    app = express()
    // Clear any environment variables that might affect tests
    delete process.env.NODE_ENV
    delete process.env.SECURITY_HEADERS_CONFIG
  })

  afterEach(() => {
    // Reset environment
    delete process.env.NODE_ENV
    delete process.env.SECURITY_HEADERS_CONFIG
  })

  describe('Default Security Headers', () => {
    beforeEach(() => {
      app.use(securityHeaders)
      app.get('/test', (req, res) => res.json({ ok: true }))
      app.get('/api/test', (req, res) => res.json({ ok: true }))
    })

    it('should set X-Content-Type-Options header', async () => {
      const response = await request(app).get('/test')
      expect(response.headers['x-content-type-options']).toBe('nosniff')
    })

    it('should set X-Frame-Options header', async () => {
      const response = await request(app).get('/test')
      expect(response.headers['x-frame-options']).toBe('DENY')
    })

    it('should set X-XSS-Protection header', async () => {
      const response = await request(app).get('/test')
      expect(response.headers['x-xss-protection']).toBe('1; mode=block')
    })

    it('should set Content-Security-Policy header', async () => {
      const response = await request(app).get('/test')
      expect(response.headers['content-security-policy']).toContain("default-src 'self'")
      expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'")
      expect(response.headers['content-security-policy']).toContain("object-src 'none'")
    })

    it('should set Referrer-Policy header', async () => {
      const response = await request(app).get('/test')
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    })

    it('should set Permissions-Policy header', async () => {
      const response = await request(app).get('/test')
      expect(response.headers['permissions-policy']).toContain('camera=()')
      expect(response.headers['permissions-policy']).toContain('microphone=()')
    })

    it('should remove X-Powered-By header', async () => {
      const response = await request(app).get('/test')
      expect(response.headers['x-powered-by']).toBeUndefined()
    })

    it('should not set HSTS header in development', async () => {
      process.env.NODE_ENV = 'development'
      const response = await request(app).get('/test')
      expect(response.headers['strict-transport-security']).toBeUndefined()
    })

    it('should set cache control headers for API endpoints', async () => {
      const response = await request(app).get('/api/test')
      expect(response.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, private')
      expect(response.headers['pragma']).toBe('no-cache')
      expect(response.headers['expires']).toBe('0')
    })

    it('should not set cache control headers for non-API endpoints', async () => {
      const response = await request(app).get('/test')
      expect(response.headers['cache-control']).toBeUndefined()
      expect(response.headers['pragma']).toBeUndefined()
      expect(response.headers['expires']).toBeUndefined()
    })
  })

  describe('Production Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
      app.use(securityHeaders)
      app.get('/test', (req, res) => res.json({ ok: true }))
    })

    it('should set HSTS header in production', async () => {
      const response = await request(app).get('/test')
      expect(response.headers['strict-transport-security']).toBe(
        'max-age=31536000; includeSubDomains; preload'
      )
    })

    it('should include all security headers in production', async () => {
      const response = await request(app).get('/test')

      // Essential security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBe('DENY')
      expect(response.headers['strict-transport-security']).toBeTruthy()
      expect(response.headers['content-security-policy']).toBeTruthy()

      // Additional security headers
      expect(response.headers['x-xss-protection']).toBe('1; mode=block')
      expect(response.headers['referrer-policy']).toBeTruthy()
      expect(response.headers['permissions-policy']).toBeTruthy()

      // Server information should be removed
      expect(response.headers['x-powered-by']).toBeUndefined()
      expect(response.headers['server']).toBeUndefined()
    })
  })

  describe('Strict Security Headers', () => {
    beforeEach(() => {
      app.use(strictSecurityHeaders)
      app.get('/test', (req, res) => res.json({ ok: true }))
    })

    it('should apply stricter CSP policy', async () => {
      const response = await request(app).get('/test')
      const csp = response.headers['content-security-policy']

      expect(csp).toContain("default-src 'self'")
      expect(csp).toContain("script-src 'self'")
      expect(csp).toContain("style-src 'self'")
      expect(csp).not.toContain('unsafe-inline')
      expect(csp).not.toContain('unsafe-eval')
    })

    it('should set stricter referrer policy', async () => {
      const response = await request(app).get('/test')
      expect(response.headers['referrer-policy']).toBe('no-referrer')
    })

    it('should set more restrictive permissions policy', async () => {
      const response = await request(app).get('/test')
      const permissionsPolicy = response.headers['permissions-policy']
      expect(permissionsPolicy).toContain('usb=()')
      expect(permissionsPolicy).toContain('bluetooth=()')
    })
  })

  describe('Custom Configuration', () => {
    it('should accept custom frame options', async () => {
      const customMiddleware = createSecurityHeadersMiddleware({
        frameOptions: 'SAMEORIGIN'
      })

      app.use(customMiddleware)
      app.get('/test', (req, res) => res.json({ ok: true }))

      const response = await request(app).get('/test')
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')
    })

    it('should accept custom CSP directives', async () => {
      const customMiddleware = createSecurityHeadersMiddleware({
        csp: {
          enabled: true,
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", 'https://fonts.googleapis.com']
          }
        }
      })

      app.use(customMiddleware)
      app.get('/test', (req, res) => res.json({ ok: true }))

      const response = await request(app).get('/test')
      const csp = response.headers['content-security-policy']
      expect(csp).toContain("style-src 'self' https://fonts.googleapis.com")
    })

    it('should disable headers when configured', async () => {
      const customMiddleware = createSecurityHeadersMiddleware({
        contentTypeOptions: false,
        xssProtection: false,
        csp: { enabled: false }
      })

      app.use(customMiddleware)
      app.get('/test', (req, res) => res.json({ ok: true }))

      const response = await request(app).get('/test')
      expect(response.headers['x-content-type-options']).toBeUndefined()
      expect(response.headers['x-xss-protection']).toBeUndefined()
      expect(response.headers['content-security-policy']).toBeUndefined()
    })

    it('should handle custom HSTS configuration', async () => {
      const customMiddleware = createSecurityHeadersMiddleware({
        hsts: {
          enabled: true,
          maxAge: 86400, // 1 day
          includeSubDomains: false,
          preload: false
        }
      })

      process.env.NODE_ENV = 'production'
      app.use(customMiddleware)
      app.get('/test', (req, res) => res.json({ ok: true }))

      const response = await request(app).get('/test')
      expect(response.headers['strict-transport-security']).toBe('max-age=86400')
    })
  })

  describe('Environment Configuration', () => {
    it('should load configuration from environment variable', async () => {
      const config: Partial<SecurityHeadersConfig> = {
        frameOptions: 'SAMEORIGIN',
        referrerPolicy: 'no-referrer'
      }

      process.env.SECURITY_HEADERS_CONFIG = JSON.stringify(config)

      app.use(securityHeaders)
      app.get('/test', (req, res) => res.json({ ok: true }))

      const response = await request(app).get('/test')
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')
      expect(response.headers['referrer-policy']).toBe('no-referrer')
    })

    it('should handle invalid environment configuration gracefully', async () => {
      process.env.SECURITY_HEADERS_CONFIG = 'invalid-json'

      app.use(securityHeaders)
      app.get('/test', (req, res) => res.json({ ok: true }))

      const response = await request(app).get('/test')
      // Should fall back to defaults
      expect(response.headers['x-frame-options']).toBe('DENY')
      expect(response.status).toBe(200)
    })
  })

  describe('Error Handling', () => {
    it('should apply minimal headers on middleware error', async () => {
      // Create a middleware that throws an error
      const errorMiddleware = createSecurityHeadersMiddleware({
        // @ts-ignore - intentionally invalid config to trigger error
        frameOptions: { invalid: 'config' }
      })

      app.use(errorMiddleware)
      app.get('/test', (req, res) => res.json({ ok: true }))

      const response = await request(app).get('/test')

      // Should still apply minimal security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBe('DENY')
      expect(response.headers['x-powered-by']).toBeUndefined()
      expect(response.status).toBe(200)
    })

    it('should continue request processing on error', async () => {
      // Mock console.error to avoid test output pollution
      const originalError = console.error
      console.error = () => {}

      try {
        const errorMiddleware = (req: any, res: any, next: any) => {
          // Simulate error in header setting
          res.setHeader = () => {
            throw new Error('Header error')
          }
          securityHeaders(req, res, next)
        }

        app.use(errorMiddleware)
        app.get('/test', (req, res) => res.json({ ok: true }))

        const response = await request(app).get('/test')
        expect(response.status).toBe(200)
        expect(response.body).toEqual({ ok: true })
      } finally {
        console.error = originalError
      }
    })
  })

  describe('Configuration Validation', () => {
    it('should validate valid configuration', () => {
      const config: SecurityHeadersConfig = {
        frameOptions: 'DENY',
        hsts: {
          enabled: true,
          maxAge: 31536000,
          includeSubDomains: true
        },
        csp: {
          enabled: true,
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"]
          }
        }
      }

      const result = validateSecurityConfig(config)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid frame options', () => {
      const config: SecurityHeadersConfig = {
        frameOptions: 'INVALID_OPTION'
      }

      const result = validateSecurityConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain(
        'Invalid frameOptions value. Must be DENY, SAMEORIGIN, or ALLOW-FROM uri'
      )
    })

    it('should detect invalid HSTS maxAge', () => {
      const config: SecurityHeadersConfig = {
        hsts: {
          enabled: true,
          maxAge: -1
        }
      }

      const result = validateSecurityConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('HSTS maxAge must be a non-negative number')
    })

    it('should detect unknown CSP directives', () => {
      const config: SecurityHeadersConfig = {
        csp: {
          enabled: true,
          directives: {
            // @ts-ignore - intentionally invalid directive
            unknownDirective: ["'self'"]
          }
        }
      }

      const result = validateSecurityConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Unknown CSP directive: unknownDirective')
    })

    it('should accept ALLOW-FROM frame options', () => {
      const config: SecurityHeadersConfig = {
        frameOptions: 'ALLOW-FROM https://example.com'
      }

      const result = validateSecurityConfig(config)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('CSP Header Building', () => {
    it('should build comprehensive CSP header', async () => {
      const customMiddleware = createSecurityHeadersMiddleware({
        csp: {
          enabled: true,
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.example.com'],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            imgSrc: ["'self'", 'data:', 'https:'],
            fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
            connectSrc: ["'self'", 'https://api.example.com'],
            frameAncestors: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: true
          }
        }
      })

      app.use(customMiddleware)
      app.get('/test', (req, res) => res.json({ ok: true }))

      const response = await request(app).get('/test')
      const csp = response.headers['content-security-policy']

      expect(csp).toContain("default-src 'self'")
      expect(csp).toContain("script-src 'self' 'unsafe-inline' https://cdn.example.com")
      expect(csp).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com")
      expect(csp).toContain("img-src 'self' data: https:")
      expect(csp).toContain("font-src 'self' data: https://fonts.gstatic.com")
      expect(csp).toContain("connect-src 'self' https://api.example.com")
      expect(csp).toContain("frame-ancestors 'none'")
      expect(csp).toContain("object-src 'none'")
      expect(csp).toContain('upgrade-insecure-requests')
    })

    it('should handle empty CSP directives', async () => {
      const customMiddleware = createSecurityHeadersMiddleware({
        csp: {
          enabled: true,
          directives: {}
        }
      })

      app.use(customMiddleware)
      app.get('/test', (req, res) => res.json({ ok: true }))

      const response = await request(app).get('/test')
      // Should not set CSP header if no directives
      expect(response.headers['content-security-policy']).toBeUndefined()
    })
  })

  describe('Health Endpoint Exception', () => {
    beforeEach(() => {
      app.use(securityHeaders)
      app.get('/api/health', (req, res) => res.json({ status: 'ok' }))
      app.get('/api/other', (req, res) => res.json({ ok: true }))
    })

    it('should not set cache control headers for health endpoint', async () => {
      const response = await request(app).get('/api/health')
      expect(response.headers['cache-control']).toBeUndefined()
      expect(response.headers['pragma']).toBeUndefined()
      expect(response.headers['expires']).toBeUndefined()
    })

    it('should set cache control headers for other API endpoints', async () => {
      const response = await request(app).get('/api/other')
      expect(response.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, private')
      expect(response.headers['pragma']).toBe('no-cache')
      expect(response.headers['expires']).toBe('0')
    })
  })
})
