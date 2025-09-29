import { Request, Response, NextFunction } from 'express'
import { log } from '../../lib/log'

export type SanitizedValue =
  | string
  | number
  | boolean
  | null
  | SanitizedValue[]
  | { [key: string]: SanitizedValue }

export interface SanitizedRequest extends Request {
  sanitizedBody?: SanitizedValue
  sanitizedQuery?: SanitizedValue
  sanitizedParams?: SanitizedValue
}

/**
 * XSS Prevention and Input Sanitization Middleware
 * Implements comprehensive input validation and sanitization to prevent XSS attacks
 */

/**
 * HTML entity encoding map for XSS prevention
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
}

/**
 * Dangerous patterns that indicate potential XSS attacks
 */
const XSS_PATTERNS = [
  // Script tags
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /<script[^>]*>/gi,

  // Event handlers
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /on\w+\s*=\s*[^"'\s>]+/gi,

  // JavaScript URLs
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
  /data\s*:\s*text\/html/gi,

  // HTML tags that can execute JavaScript
  /<iframe[\s\S]*?>/gi,
  /<object[\s\S]*?>/gi,
  /<embed[\s\S]*?>/gi,
  /<applet[\s\S]*?>/gi,
  /<meta[\s\S]*?>/gi,
  /<link[\s\S]*?>/gi,
  /<style[\s\S]*?>/gi,

  // SVG with script
  /<svg[\s\S]*?onload[\s\S]*?>/gi,
  /<svg[\s\S]*?onerror[\s\S]*?>/gi,

  // IMG with onerror
  /<img[\s\S]*?onerror[\s\S]*?>/gi,
  /<img[\s\S]*?onload[\s\S]*?>/gi,

  // Form elements with JavaScript
  /<form[\s\S]*?action[\s\S]*?javascript/gi,
  /<input[\s\S]*?onfocus[\s\S]*?>/gi,

  // Expression() CSS
  /expression\s*\(/gi,
  /-moz-binding/gi,

  // Data URLs with JavaScript
  /data:[\w/+]+;base64,[\w+/=]+/gi,

  // Unicode and encoded attacks
  /\\u[0-9a-fA-F]{4}/gi,
  /\\x[0-9a-fA-F]{2}/gi,
  /&#x?[0-9a-fA-F]+;?/gi,

  // Template literals and expressions
  /\$\{[\s\S]*?\}/gi,
  /`[\s\S]*?`/gi,

  // Dangerous functions
  /eval\s*\(/gi,
  /setTimeout\s*\(/gi,
  /setInterval\s*\(/gi,
  /Function\s*\(/gi,

  // Protocol handlers
  /livescript\s*:/gi,
  /mocha\s*:/gi
]

/**
 * Malicious payload patterns for detection
 */
const MALICIOUS_PATTERNS = [
  // SQL injection patterns
  /(union\s+select|insert\s+into|delete\s+from|update\s+set|drop\s+table|create\s+table|alter\s+table|exec\s+|execute\s+)/gi,
  /('|;|--|\/\*|\*\/)/gi,

  // Command injection patterns
  /(\||&|;|\$\(|`|<|>)/gi,

  // Path traversal patterns
  /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\\)/gi,

  // Null byte injection
  // eslint-disable-next-line no-control-regex
  /\x00|\u0000|%00/gi,

  // LDAP injection
  /(\*|\(|\)|\\|\||&)/gi,

  // XML injection
  /(<\?xml|<!DOCTYPE|<!ENTITY)/gi,

  // Server-side template injection
  /(\{\{|\}\}|\{%|%\}|\{#|#\})/gi
]

/**
 * Sanitizes a string value to prevent XSS attacks
 */
function sanitizeString(value: string): string {
  if (typeof value !== 'string') {
    return String(value)
  }

  // First, trim whitespace
  let sanitized = value.trim()

  // Check for extremely long strings (potential DoS)
  if (sanitized.length > 10000) {
    log('Input validation warning: Extremely long string detected', {
      length: sanitized.length,
      truncated: true
    })
    sanitized = sanitized.substring(0, 10000)
  }

  // Remove null bytes and control characters
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Detect and log potential XSS attempts
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(sanitized)) {
      log('XSS attempt detected and blocked', {
        pattern: pattern.source,
        input: sanitized.substring(0, 100) + (sanitized.length > 100 ? '...' : ''),
        timestamp: new Date().toISOString()
      })

      // Remove the malicious content
      sanitized = sanitized.replace(pattern, '')
    }
  }

  // Detect malicious payloads
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(sanitized)) {
      log('Malicious payload detected and blocked', {
        pattern: pattern.source,
        input: sanitized.substring(0, 100) + (sanitized.length > 100 ? '...' : ''),
        timestamp: new Date().toISOString()
      })
    }
  }

  // HTML entity encoding for remaining content
  sanitized = sanitized.replace(/[&<>"'`=/]/g, (match) => HTML_ENTITIES[match] || match)

  // Additional encoding for Unicode attacks
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\u0000-\u001F\u007F-\u009F]/g, (match) => {
    return `&#${match.charCodeAt(0)};`
  })

  return sanitized
}

/**
 * Validates and sanitizes input values recursively
 */
function sanitizeValue(value: unknown, maxDepth: number = 10): SanitizedValue {
  if (maxDepth <= 0) {
    log('Input validation warning: Maximum recursion depth reached', {
      type: typeof value,
      truncated: true
    })
    return null
  }

  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string') {
    return sanitizeString(value)
  }

  if (typeof value === 'number') {
    // Validate number ranges to prevent overflow
    if (!isFinite(value) || value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER) {
      log('Input validation warning: Invalid number detected', {
        value,
        replaced: 0
      })
      return 0
    }
    return value
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    let arrayValue = value
    if (arrayValue.length > 1000) {
      log('Input validation warning: Large array detected', {
        length: arrayValue.length,
        truncated: true
      })
      arrayValue = arrayValue.slice(0, 1000)
    }

    return arrayValue.map((item) => sanitizeValue(item, maxDepth - 1))
  }

  if (typeof value === 'object') {
    // Limit object properties to prevent DoS
    const entries = Object.entries(value as Record<string, unknown>)
    const keys = entries.map(([key]) => key)
    if (keys.length > 100) {
      log('Input validation warning: Large object detected', {
        properties: keys.length,
        truncated: true
      })
    }

    const sanitized: Record<string, SanitizedValue> = {}
    for (const [key, rawValue] of entries.slice(0, 100)) {
      const sanitizedKey = sanitizeString(key)
      sanitized[sanitizedKey] = sanitizeValue(rawValue, maxDepth - 1)
    }
    return sanitized
  }

  // For other types, convert to string and sanitize
  return sanitizeString(String(value))
}

/**
 * Input validation middleware that sanitizes request body, query, and params
 */
export function inputValidation(req: SanitizedRequest, res: Response, next: NextFunction): void {
  try {
    const startTime = Date.now()

    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.sanitizedBody = sanitizeValue(req.body)
      // Replace original body with sanitized version
      req.body = req.sanitizedBody
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.sanitizedQuery = sanitizeValue(req.query)
      // Replace original query with sanitized version
      req.query = req.sanitizedQuery as any
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.sanitizedParams = sanitizeValue(req.params)
      // Replace original params with sanitized version
      req.params = req.sanitizedParams as any
    }

    const duration = Date.now() - startTime

    // Log slow sanitization (potential DoS attempt)
    if (duration > 100) {
      log('Input validation warning: Slow sanitization detected', {
        duration,
        path: req.path,
        method: req.method,
        bodySize: req.body ? JSON.stringify(req.body).length : 0
      })
    }

    next()
  } catch (error) {
    log('Input validation error', {
      error: error instanceof Error ? error.message : String(error),
      path: req.path,
      method: req.method
    })

    // On sanitization error, reject the request
    res.status(400).json({
      message: 'Invalid input data',
      error: 'INPUT_VALIDATION_ERROR'
    })
  }
}

/**
 * Strict input validation for sensitive endpoints
 */
export function strictInputValidation(
  req: SanitizedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // Apply normal input validation first
    inputValidation(req, res, () => {
      // Additional strict validation

      // Check for any remaining suspicious patterns
      const requestData = JSON.stringify({
        body: req.body,
        query: req.query,
        params: req.params
      })

      // More aggressive pattern detection for sensitive endpoints
      const strictPatterns = [
        /<script[\s\S]*?>/gi,
        /javascript\s*:/gi,
        /vbscript\s*:/gi,
        /on\w+\s*=/gi,
        /eval\s*\(/gi,
        /expression\s*\(/gi,
        /<iframe[\s\S]*?>/gi,
        /<object[\s\S]*?>/gi,
        /<embed[\s\S]*?>/gi
      ]

      for (const pattern of strictPatterns) {
        if (pattern.test(requestData)) {
          log('Strict validation failed: Suspicious pattern detected', {
            pattern: pattern.source,
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString()
          })

          res.status(400).json({
            message: 'Input contains invalid characters',
            error: 'STRICT_VALIDATION_FAILED'
          })
          return
        }
      }

      next()
    })
  } catch (error) {
    log('Strict input validation error', {
      error: error instanceof Error ? error.message : String(error),
      path: req.path,
      method: req.method
    })

    res.status(400).json({
      message: 'Input validation failed',
      error: 'STRICT_VALIDATION_ERROR'
    })
  }
}

/**
 * Content-Type validation middleware
 */
export function validateContentType(allowedTypes: string[] = ['application/json']) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const contentType = req.get('Content-Type')

      if (!contentType) {
        res.status(400).json({
          message: 'Content-Type header is required',
          error: 'MISSING_CONTENT_TYPE'
        })
        return
      }

      const isAllowed = allowedTypes.some((type) =>
        contentType.toLowerCase().includes(type.toLowerCase())
      )

      if (!isAllowed) {
        log('Invalid Content-Type detected', {
          contentType,
          allowedTypes,
          path: req.path,
          method: req.method
        })

        res.status(415).json({
          message: 'Unsupported Content-Type',
          error: 'UNSUPPORTED_CONTENT_TYPE',
          allowedTypes
        })
        return
      }
    }

    next()
  }
}

/**
 * Request size validation middleware
 */
export function validateRequestSize(maxSizeBytes: number = 1024 * 1024) {
  // 1MB default
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.get('Content-Length')

    if (contentLength && parseInt(contentLength, 10) > maxSizeBytes) {
      log('Request size limit exceeded', {
        contentLength: parseInt(contentLength, 10),
        maxSize: maxSizeBytes,
        path: req.path,
        method: req.method
      })

      res.status(413).json({
        message: 'Request entity too large',
        error: 'REQUEST_TOO_LARGE',
        maxSize: maxSizeBytes
      })
      return
    }

    next()
  }
}

/**
 * Export sanitization functions for use in other modules
 */
export { sanitizeString, sanitizeValue }
