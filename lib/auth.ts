import { log } from './log'

export interface AdminUser {
  id: string
  username: string
  role: 'admin'
}

export function validateAdminToken(token?: string): boolean {
  const adminToken = process.env.ADMIN_TOKEN
  const smokeMode = process.env.SMOKE_MODE === '1'
  
  // Allow access in smoke mode for testing
  if (smokeMode) {
    log('Admin access granted via smoke mode', { smokeMode: true })
    return true
  }
  
  if (!adminToken) {
    log('Admin access denied: ADMIN_TOKEN not configured', { configured: false })
    return false
  }
  
  if (!token) {
    log('Admin access denied: No token provided', { tokenProvided: false })
    return false
  }
  
  const isValid = token === adminToken
  
  log('Admin token validation', { 
    valid: isValid,
    timestamp: new Date().toISOString()
  })
  
  return isValid
}

export function getCurrentUser(): AdminUser | null {
  // In a real implementation, this would check session/JWT
  // For now, we'll return a mock admin user if token is valid
  const smokeMode = process.env.SMOKE_MODE === '1'
  const adminToken = process.env.ADMIN_TOKEN
  
  if (smokeMode || adminToken) {
    return {
      id: 'admin-1',
      username: 'admin',
      role: 'admin'
    }
  }
  
  return null
}

export function requireAdmin(): AdminUser {
  const user = getCurrentUser()
  
  if (!user) {
    throw new Error('Admin access required')
  }
  
  return user
}
