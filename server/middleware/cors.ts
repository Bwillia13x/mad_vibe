import { Request, Response, NextFunction } from 'express'
import { getEnvVar } from '../../lib/env-security'

// Simple CORS middleware without external dependency
export function corsMiddleware() {
  const nodeEnv = getEnvVar('NODE_ENV') || 'development'
  const configuredOrigin =
    (getEnvVar('CORS_ORIGIN') as string) || (nodeEnv === 'production' ? 'https://example.com' : '*')
  const allowMethods = 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
  const defaultAllowedHeaders = [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Session-Key',
    'X-Actor-Id'
  ]

  return (req: Request, res: Response, next: NextFunction) => {
    let originToUse = configuredOrigin
    const requestOrigin = req.headers.origin

    // In development, if wildcard configured, echo request origin for better DX
    if (configuredOrigin === '*' && requestOrigin) {
      originToUse = requestOrigin
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', originToUse)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', allowMethods)

    const requestedHeadersRaw = req.headers['access-control-request-headers']
    const allowedHeaders = new Set(defaultAllowedHeaders)

    if (typeof requestedHeadersRaw === 'string') {
      requestedHeadersRaw
        .split(',')
        .map((header) => header.trim())
        .filter(Boolean)
        .forEach((header) => allowedHeaders.add(header))
    }

    res.setHeader('Access-Control-Allow-Headers', Array.from(allowedHeaders).join(', '))

    // Only enable credentials when origin is a specific origin, not '*'
    if (originToUse !== '*') {
      res.setHeader('Access-Control-Allow-Credentials', 'true')
    }

    // Handle preflight requests quickly
    if (req.method === 'OPTIONS') {
      res.status(204).end()
      return
    }

    next()
  }
}
