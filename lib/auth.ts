import { log } from './log'

export interface AdminUser {
  id: string
  username: string
  role: 'admin'
}

import { getEnvVar } from './env-security';

export function validateAdminToken(token?: string): boolean {
  const adminToken = getEnvVar('ADMIN_TOKEN')
  const smokeMode = getEnvVar('SMOKE_MODE')
  
  // Validate input parameters with enhanced security checks
  if (typeof token !== 'string') {
    log('Admin access denied: Invalid token type', { 
      tokenType: typeof token,
      timestamp: new Date().toISOString()
    })
    return false
  }

  // Additional token format validation
  if (token.length === 0 || token.length > 512) {
    log('Admin access denied: Invalid token length', { 
      tokenLength: token.length,
      timestamp: new Date().toISOString()
    })
    return false
  }

  // Check for dangerous characters that could indicate bypass attempts
  if (token.includes('\0') || token.includes('\r') || token.includes('\n')) {
    log('Admin access denied: Dangerous characters in token', { 
      timestamp: new Date().toISOString()
    })
    return false
  }

  // Allow access in smoke mode for testing (but log it with security warning)
  if (smokeMode) {
    log('Admin access granted via smoke mode - SECURITY WARNING', { 
      smokeMode: true,
      timestamp: new Date().toISOString(),
      tokenProvided: !!token,
      tokenLength: token.length
    })
    return true
  }
  
  if (!adminToken) {
    log('Admin access denied: ADMIN_TOKEN not configured', { 
      configured: false,
      timestamp: new Date().toISOString()
    })
    return false
  }

  // Validate admin token configuration
  if (adminToken.length < 8) {
    log('Admin access denied: ADMIN_TOKEN too short (security risk)', { 
      configuredTokenLength: adminToken.length,
      timestamp: new Date().toISOString()
    })
    return false
  }
  
  if (!token || token.length === 0) {
    log('Admin access denied: No token provided', { 
      tokenProvided: false,
      timestamp: new Date().toISOString()
    })
    return false
  }

  // Prevent timing attacks with constant-time comparison
  const isValid = constantTimeStringCompare(token, adminToken)
  
  log('Admin token validation', { 
    valid: isValid,
    tokenLength: token.length,
    expectedLength: adminToken.length,
    timestamp: new Date().toISOString()
  })
  
  return isValid
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeStringCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  
  return result === 0
}

export function getCurrentUser(token?: string): AdminUser | null {
  // Validate token before returning user
  if (!validateAdminToken(token)) {
    return null
  }
  
  return {
    id: 'admin-1',
    username: 'admin',
    role: 'admin'
  }
}

export function requireAdmin(token?: string): AdminUser {
  const user = getCurrentUser(token)
  
  if (!user) {
    log('Admin access denied: Invalid or missing token', {
      tokenProvided: !!token,
      timestamp: new Date().toISOString()
    })
    throw new Error('Admin access required')
  }
  
  return user
}
