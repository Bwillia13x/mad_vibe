/**
 * Secure Environment Variable Management
 *
 * This module provides secure handling of environment variables with:
 * - Input validation and sanitization
 * - Sensitive data protection
 * - Configuration validation
 * - Secure defaults
 */

export interface EnvironmentConfig {
  // Server configuration
  PORT: number
  NODE_ENV: 'development' | 'production' | 'test'

  // Database configuration
  DATABASE_URL?: string
  POSTGRES_URL?: string

  // API keys and secrets
  OPENAI_API_KEY?: string
  AI_MODE?: string
  ADMIN_TOKEN?: string
  SESSION_SECRET?: string

  // Demo and testing
  DEMO_SCENARIO?: string
  DEMO_SEED?: number
  DEMO_DATE?: string
  SMOKE_MODE?: boolean

  // Operations
  OPERATIONS_WS_PORT?: number
  PORT_FILE?: string

  // Testing and development
  SKIP_RATE_LIMIT?: boolean
  TEST_VERBOSE?: boolean

  // Auto-scaling configuration
  AUTO_SCALING_ENABLED?: string
  SCALING_CHECK_INTERVAL?: string
  SCALING_COOLDOWN?: string
  SCALING_WEBHOOK_URL?: string

  // Load balancer configuration
  LB_STRATEGY?: string
  ENABLE_AUTO_SCALING?: string
  MIN_INSTANCES?: string
  MAX_INSTANCES?: string
  SESSION_AFFINITY?: string

  // Session management
  SESSION_STORAGE?: string
  SESSION_TIMEOUT?: string
  MAX_SESSIONS?: string

  // Security headers
  SECURITY_HEADERS_CONFIG?: string
  // CORS
  CORS_ORIGIN?: string

  // Resource manager thresholds
  RM_HEAP_ALERT_THRESHOLD?: number
  RM_MEMORY_THRESHOLD_MB?: number
}

class EnvironmentSecurityManager {
  private static instance: EnvironmentSecurityManager
  private config: EnvironmentConfig
  private sensitiveKeys = new Set([
    'OPENAI_API_KEY',
    'ADMIN_TOKEN',
    'DATABASE_URL',
    'POSTGRES_URL',
    'JWT_SECRET',
    'SESSION_SECRET',
    'ENCRYPTION_KEY',
    'SCALING_WEBHOOK_URL'
  ])

  private constructor() {
    this.config = this.loadAndValidateConfig()
  }

  public static getInstance(): EnvironmentSecurityManager {
    if (!EnvironmentSecurityManager.instance) {
      EnvironmentSecurityManager.instance = new EnvironmentSecurityManager()
    }
    return EnvironmentSecurityManager.instance
  }

  /**
   * Get a configuration value with security validation
   */
  public get<K extends keyof EnvironmentConfig>(key: K): EnvironmentConfig[K] {
    return this.config[key]
  }

  /**
   * Check if a configuration key exists
   */
  public has(key: keyof EnvironmentConfig): boolean {
    return this.config[key] !== undefined
  }

  /**
   * Get configuration for safe exposure (removes sensitive data)
   */
  public getSafeConfig(): Partial<EnvironmentConfig> {
    const safeConfig: Partial<EnvironmentConfig> = {}
    const rec = safeConfig as unknown as Record<keyof EnvironmentConfig, unknown>
    const entries = Object.entries(this.config) as [
      keyof EnvironmentConfig,
      EnvironmentConfig[keyof EnvironmentConfig]
    ][]

    for (const [key, value] of entries) {
      if (!this.sensitiveKeys.has(String(key))) {
        rec[key] = value
      }
    }

    return safeConfig
  }

  /**
   * Validate environment configuration
   */
  public validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validate NODE_ENV
    if (!this.config.NODE_ENV) {
      errors.push('NODE_ENV is required')
    } else if (!['development', 'production', 'test'].includes(this.config.NODE_ENV)) {
      errors.push('NODE_ENV must be development, production, or test')
    }

    // Validate PORT
    if (this.config.PORT < 1 || this.config.PORT > 65535) {
      errors.push('PORT must be between 1 and 65535')
    }

    // Validate database configuration in production
    if (this.config.NODE_ENV === 'production') {
      if (!this.config.DATABASE_URL && !this.config.POSTGRES_URL) {
        errors.push('Database URL is required in production')
      }
      // Enforce strong session secret in production
      if (!this.config.SESSION_SECRET || this.config.SESSION_SECRET.length < 32) {
        errors.push('SESSION_SECRET must be at least 32 characters in production')
      }
      // Enforce admin token presence and strength in production
      if (!this.config.ADMIN_TOKEN || !this.isValidAdminToken(this.config.ADMIN_TOKEN)) {
        errors.push(
          'ADMIN_TOKEN is required in production and must be at least 32 alphanumeric characters'
        )
      }
    }

    // Validate API keys format
    if (this.config.OPENAI_API_KEY) {
      if (!this.isValidOpenAIKey(this.config.OPENAI_API_KEY)) {
        errors.push('OPENAI_API_KEY format is invalid')
      }
    }

    // Validate admin token strength
    if (this.config.ADMIN_TOKEN) {
      if (!this.isValidAdminToken(this.config.ADMIN_TOKEN)) {
        errors.push('ADMIN_TOKEN is too weak (minimum 32 characters, alphanumeric)')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Load and validate environment configuration
   */
  private loadAndValidateConfig(): EnvironmentConfig {
    const config: EnvironmentConfig = {
      // Server configuration with secure defaults
      // Allow explicit '0' to request an ephemeral port for test/smoke runs
      PORT:
        process.env.PORT === '0'
          ? 0
          : (this.parseInteger(process.env.PORT, 5000, 1, 65535) ?? 5000),
      NODE_ENV: this.parseNodeEnv(process.env.NODE_ENV),

      // Database configuration
      DATABASE_URL: this.sanitizeString(process.env.DATABASE_URL),
      POSTGRES_URL: this.sanitizeString(process.env.POSTGRES_URL),

      // API keys and secrets
      OPENAI_API_KEY: this.sanitizeApiKey(process.env.OPENAI_API_KEY),
      AI_MODE: this.sanitizeString(process.env.AI_MODE),
      ADMIN_TOKEN: this.sanitizeString(process.env.ADMIN_TOKEN),
      SESSION_SECRET: this.sanitizeString(process.env.SESSION_SECRET),

      // Demo and testing
      DEMO_SCENARIO: this.sanitizeString(process.env.DEMO_SCENARIO),
      DEMO_SEED: this.parseInteger(process.env.DEMO_SEED),
      DEMO_DATE: this.sanitizeString(process.env.DEMO_DATE),
      SMOKE_MODE: this.parseBoolean(process.env.SMOKE_MODE),

      // Operations
      OPERATIONS_WS_PORT: this.parseInteger(process.env.OPERATIONS_WS_PORT, 8080, 1, 65535),
      PORT_FILE: this.sanitizeFilePath(process.env.PORT_FILE),

      // Testing and development
      SKIP_RATE_LIMIT: this.parseBoolean(process.env.SKIP_RATE_LIMIT),
      TEST_VERBOSE: this.parseBoolean(process.env.TEST_VERBOSE),

      // Auto-scaling configuration
      AUTO_SCALING_ENABLED: this.sanitizeString(process.env.AUTO_SCALING_ENABLED),
      SCALING_CHECK_INTERVAL: this.sanitizeString(process.env.SCALING_CHECK_INTERVAL),
      SCALING_COOLDOWN: this.sanitizeString(process.env.SCALING_COOLDOWN),
      SCALING_WEBHOOK_URL: this.sanitizeString(process.env.SCALING_WEBHOOK_URL),

      // Load balancer configuration
      LB_STRATEGY: this.sanitizeString(process.env.LB_STRATEGY),
      ENABLE_AUTO_SCALING: this.sanitizeString(process.env.ENABLE_AUTO_SCALING),
      MIN_INSTANCES: this.sanitizeString(process.env.MIN_INSTANCES),
      MAX_INSTANCES: this.sanitizeString(process.env.MAX_INSTANCES),
      SESSION_AFFINITY: this.sanitizeString(process.env.SESSION_AFFINITY),

      // Session management
      SESSION_STORAGE: this.sanitizeString(process.env.SESSION_STORAGE),
      SESSION_TIMEOUT: this.sanitizeString(process.env.SESSION_TIMEOUT),
      MAX_SESSIONS: this.sanitizeString(process.env.MAX_SESSIONS),

      // Security headers
      SECURITY_HEADERS_CONFIG: this.sanitizeString(process.env.SECURITY_HEADERS_CONFIG),

      // CORS
      CORS_ORIGIN: this.sanitizeString(process.env.CORS_ORIGIN),

      // Resource manager thresholds
      RM_HEAP_ALERT_THRESHOLD: this.parseInteger(process.env.RM_HEAP_ALERT_THRESHOLD),
      RM_MEMORY_THRESHOLD_MB: this.parseInteger(process.env.RM_MEMORY_THRESHOLD_MB)
    }

    // Remove undefined values with proper typing
    const cleaned = { ...config } as Partial<EnvironmentConfig>
    for (const key of Object.keys(cleaned) as (keyof EnvironmentConfig)[]) {
      if (cleaned[key] === undefined) {
        delete cleaned[key]
      }
    }

    return cleaned as EnvironmentConfig
  }

  /**
   * Parse and validate NODE_ENV
   */
  private parseNodeEnv(value?: string): 'development' | 'production' | 'test' {
    if (!value) return 'development'

    const sanitized = value.toLowerCase().trim()
    if (['development', 'production', 'test'].includes(sanitized)) {
      return sanitized as 'development' | 'production' | 'test'
    }

    return 'development'
  }

  /**
   * Parse and validate integer values
   */
  private parseInteger(
    value?: string,
    defaultValue?: number,
    min?: number,
    max?: number
  ): number | undefined {
    if (!value) return defaultValue

    const parsed = parseInt(value.trim(), 10)
    if (isNaN(parsed)) return defaultValue

    if (min !== undefined && parsed < min) return defaultValue
    if (max !== undefined && parsed > max) return defaultValue

    return parsed
  }

  /**
   * Parse boolean values
   */
  private parseBoolean(value?: string): boolean | undefined {
    if (!value) return undefined

    const sanitized = value.toLowerCase().trim()
    if (sanitized === '1' || sanitized === 'true' || sanitized === 'yes') {
      return true
    }
    if (sanitized === '0' || sanitized === 'false' || sanitized === 'no') {
      return false
    }

    return undefined
  }

  /**
   * Sanitize string values
   */
  private sanitizeString(value?: string): string | undefined {
    if (!value) return undefined
    const sanitized = this.stripControlChars(value).trim()
    return sanitized.length > 0 ? sanitized : undefined
  }

  /**
   * Sanitize API keys
   */
  private sanitizeApiKey(value?: string): string | undefined {
    if (!value) return undefined
    // Remove whitespace then control characters
    const noWs = value.replace(/\s/g, '')
    const sanitized = this.stripControlChars(noWs)
    return sanitized.length > 0 ? sanitized : undefined
  }

  /**
   * Sanitize file paths
   */
  private sanitizeFilePath(value?: string): string | undefined {
    if (!value) return undefined

    // Remove dangerous characters and normalize
    const sanitized = value
      .replace(/[<>:"|?*]/g, '')
      .replace(/\.\./g, '')
      .trim()

    return sanitized.length > 0 ? sanitized : undefined
  }

  /**
   * Remove ASCII control characters (0-31 and 127) without using control-char regex
   */
  private stripControlChars(input: string): string {
    let out = ''
    for (let i = 0; i < input.length; i++) {
      const code = input.charCodeAt(i)
      if (code >= 32 && code !== 127) out += input[i]
    }
    return out
  }

  /**
   * Validate OpenAI API key format
   */
  private isValidOpenAIKey(key: string): boolean {
    // OpenAI keys can be:
    // - Legacy: sk-[48 chars]
    // - Project: sk-proj-[longer string with hyphens]
    // Allow placeholder values in development/demo mode
    if (
      key === 'your-api-key' ||
      key === 'your-api-key-here' ||
      key === 'demo-key' ||
      key === 'placeholder'
    ) {
      return true
    }
    // Accept both legacy (sk-...) and project keys (sk-proj-...)
    return /^sk-[a-zA-Z0-9_-]{20,}$/.test(key)
  }

  /**
   * Validate admin token strength
   */
  private isValidAdminToken(token: string): boolean {
    // Minimum 32 characters, alphanumeric
    return token.length >= 32 && /^[a-zA-Z0-9]+$/.test(token)
  }

  /**
   * Mask sensitive values for logging
   */
  public maskSensitiveValue(key: string, value: string): string {
    if (this.sensitiveKeys.has(key)) {
      if (value.length <= 8) {
        return '*'.repeat(value.length)
      }
      return (
        value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4)
      )
    }
    return value
  }

  /**
   * Get environment security audit
   */
  public getSecurityAudit(): {
    configuredKeys: string[]
    sensitiveKeys: string[]
    missingRecommended: string[]
    weakConfigurations: string[]
  } {
    const configuredKeys = Object.keys(this.config)
    const sensitiveKeys = configuredKeys.filter((key) => this.sensitiveKeys.has(key))

    const recommendedKeys = ['NODE_ENV', 'PORT']
    if (this.config.NODE_ENV === 'production') {
      recommendedKeys.push('DATABASE_URL', 'ADMIN_TOKEN')
    }

    const missingRecommended = recommendedKeys.filter(
      (key) => !this.has(key as keyof EnvironmentConfig)
    )

    const weakConfigurations: string[] = []

    // Check for weak admin token
    if (this.config.ADMIN_TOKEN && !this.isValidAdminToken(this.config.ADMIN_TOKEN)) {
      weakConfigurations.push('ADMIN_TOKEN is too weak')
    }

    // Check for invalid OpenAI key
    if (this.config.OPENAI_API_KEY && !this.isValidOpenAIKey(this.config.OPENAI_API_KEY)) {
      weakConfigurations.push('OPENAI_API_KEY format is invalid')
    }

    return {
      configuredKeys,
      sensitiveKeys,
      missingRecommended,
      weakConfigurations
    }
  }
}

// Export singleton instance
export const envSecurity = EnvironmentSecurityManager.getInstance()

// Convenience functions for backward compatibility
export function getEnvVar<K extends keyof EnvironmentConfig>(key: K): EnvironmentConfig[K] {
  return envSecurity.get(key)
}

export function hasEnvVar(key: keyof EnvironmentConfig): boolean {
  return envSecurity.has(key)
}

export function getSafeEnvConfig(): Partial<EnvironmentConfig> {
  return envSecurity.getSafeConfig()
}

export function validateEnvConfig(): { isValid: boolean; errors: string[] } {
  return envSecurity.validateConfiguration()
}
