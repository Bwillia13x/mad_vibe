/**
 * Secure Configuration Management System
 * 
 * This module provides advanced configuration management with:
 * - Secure environment variable loading
 * - Configuration validation and sanitization
 * - Secrets rotation capabilities
 * - Configuration change monitoring
 */

import { envSecurity, type EnvironmentConfig } from './env-security';
import { log } from './log';

export interface ConfigurationChangeEvent {
  timestamp: string;
  key: string;
  oldValue?: string;
  newValue?: string;
  source: 'environment' | 'runtime' | 'rotation';
  userId?: string;
}

export interface SecretRotationConfig {
  key: string;
  rotationIntervalHours: number;
  lastRotated?: string;
  nextRotation?: string;
  rotationCallback?: (newValue: string) => Promise<void>;
}

export interface ConfigurationValidationRule {
  key: keyof EnvironmentConfig;
  required: boolean;
  validator: (value: any) => { valid: boolean; error?: string };
  sanitizer?: (value: any) => any;
}

class SecureConfigurationManager {
  private static instance: SecureConfigurationManager;
  private changeHistory: ConfigurationChangeEvent[] = [];
  private rotationConfigs: Map<string, SecretRotationConfig> = new Map();
  private validationRules: Map<string, ConfigurationValidationRule> = new Map();
  private configWatchers: Map<string, ((value: any) => void)[]> = new Map();

  private constructor() {
    this.initializeValidationRules();
    this.startRotationScheduler();
  }

  public static getInstance(): SecureConfigurationManager {
    if (!SecureConfigurationManager.instance) {
      SecureConfigurationManager.instance = new SecureConfigurationManager();
    }
    return SecureConfigurationManager.instance;
  }

  /**
   * Initialize default validation rules
   */
  private initializeValidationRules(): void {
    // NODE_ENV validation
    this.addValidationRule({
      key: 'NODE_ENV',
      required: true,
      validator: (value) => {
        const valid = ['development', 'production', 'test'].includes(value);
        return { valid, error: valid ? undefined : 'NODE_ENV must be development, production, or test' };
      }
    });

    // PORT validation
    this.addValidationRule({
      key: 'PORT',
      required: true,
      validator: (value) => {
        const port = typeof value === 'number' ? value : parseInt(value, 10);
        const valid = !isNaN(port) && port >= 1 && port <= 65535;
        return { valid, error: valid ? undefined : 'PORT must be a number between 1 and 65535' };
      },
      sanitizer: (value) => typeof value === 'number' ? value : parseInt(value, 10)
    });

    // Database URL validation
    this.addValidationRule({
      key: 'DATABASE_URL',
      required: false,
      validator: (value) => {
        if (!value) return { valid: true };
        const valid = typeof value === 'string' && (value.startsWith('postgres://') || value.startsWith('postgresql://'));
        return { valid, error: valid ? undefined : 'DATABASE_URL must be a valid PostgreSQL connection string' };
      }
    });

    // OpenAI API Key validation
    this.addValidationRule({
      key: 'OPENAI_API_KEY',
      required: false,
      validator: (value) => {
        if (!value) return { valid: true };
        const isPlaceholder = ['your-api-key', 'your-api-key-here', 'demo-key', 'placeholder'].includes(value);
        const validFormat = isPlaceholder || /^sk-[a-zA-Z0-9]{48}$/.test(value);
        return { valid: validFormat, error: validFormat ? undefined : 'OPENAI_API_KEY must be a valid OpenAI API key or placeholder' };
      }
    });

    // Admin Token validation
    this.addValidationRule({
      key: 'ADMIN_TOKEN',
      required: false,
      validator: (value) => {
        if (!value) return { valid: true };
        const valid = typeof value === 'string' && value.length >= 32 && /^[a-zA-Z0-9]+$/.test(value);
        return { valid, error: valid ? undefined : 'ADMIN_TOKEN must be at least 32 alphanumeric characters' };
      }
    });
  }

  /**
   * Add a validation rule for a configuration key
   */
  public addValidationRule(rule: ConfigurationValidationRule): void {
    this.validationRules.set(rule.key, rule);
  }

  /**
   * Validate all configuration values
   */
  public validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [key, rule] of this.validationRules) {
      const value = envSecurity.get(key as keyof EnvironmentConfig);
      
      // Check if required value is missing
      if (rule.required && (value === undefined || value === null)) {
        errors.push(`${key} is required but not configured`);
        continue;
      }

      // Skip validation if value is not present and not required
      if (!rule.required && (value === undefined || value === null)) {
        continue;
      }

      // Validate the value
      const validation = rule.validator(value);
      if (!validation.valid) {
        errors.push(`${key}: ${validation.error}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize configuration values
   */
  public sanitizeConfiguration(): { [key: string]: any } {
    const sanitized: { [key: string]: any } = {};

    for (const [key, rule] of this.validationRules) {
      const value = envSecurity.get(key as keyof EnvironmentConfig);
      
      if (value !== undefined && value !== null && rule.sanitizer) {
        sanitized[key] = rule.sanitizer(value);
      } else if (value !== undefined && value !== null) {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Configure secret rotation for a key
   */
  public configureSecretRotation(config: SecretRotationConfig): void {
    this.rotationConfigs.set(config.key, {
      ...config,
      nextRotation: this.calculateNextRotation(config.rotationIntervalHours)
    });

    log(`Secret rotation configured for ${config.key}`, {
      intervalHours: config.rotationIntervalHours,
      nextRotation: this.calculateNextRotation(config.rotationIntervalHours)
    });
  }

  /**
   * Calculate next rotation time
   */
  private calculateNextRotation(intervalHours: number): string {
    const now = new Date();
    const nextRotation = new Date(now.getTime() + (intervalHours * 60 * 60 * 1000));
    return nextRotation.toISOString();
  }

  /**
   * Check if any secrets need rotation
   */
  public async checkSecretRotations(): Promise<void> {
    const now = new Date();

    for (const [key, config] of this.rotationConfigs) {
      if (config.nextRotation && new Date(config.nextRotation) <= now) {
        await this.rotateSecret(key);
      }
    }
  }

  /**
   * Rotate a specific secret
   */
  public async rotateSecret(key: string): Promise<void> {
    const config = this.rotationConfigs.get(key);
    if (!config) {
      throw new Error(`No rotation configuration found for ${key}`);
    }

    try {
      // Generate new secret value
      const newValue = this.generateSecretValue(key);
      
      // Record the change
      this.recordConfigurationChange({
        timestamp: new Date().toISOString(),
        key,
        oldValue: '[REDACTED]',
        newValue: '[REDACTED]',
        source: 'rotation'
      });

      // Execute rotation callback if provided
      if (config.rotationCallback) {
        await config.rotationCallback(newValue);
      }

      // Update rotation schedule
      config.lastRotated = new Date().toISOString();
      config.nextRotation = this.calculateNextRotation(config.rotationIntervalHours);

      log(`Secret rotated successfully for ${key}`, {
        lastRotated: config.lastRotated,
        nextRotation: config.nextRotation
      });

    } catch (error) {
      log(`Secret rotation failed for ${key}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generate a new secret value
   */
  private generateSecretValue(key: string): string {
    const length = key === 'ADMIN_TOKEN' ? 64 : 32;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Record a configuration change
   */
  private recordConfigurationChange(event: ConfigurationChangeEvent): void {
    this.changeHistory.push(event);
    
    // Keep only last 1000 changes
    if (this.changeHistory.length > 1000) {
      this.changeHistory = this.changeHistory.slice(-1000);
    }

    // Notify watchers
    const watchers = this.configWatchers.get(event.key) || [];
    watchers.forEach(watcher => {
      try {
        watcher(event.newValue);
      } catch (error) {
        log(`Configuration watcher error for ${event.key}`, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }

  /**
   * Watch for configuration changes
   */
  public watchConfiguration(key: string, callback: (value: any) => void): () => void {
    if (!this.configWatchers.has(key)) {
      this.configWatchers.set(key, []);
    }
    
    this.configWatchers.get(key)!.push(callback);

    // Return unwatch function
    return () => {
      const watchers = this.configWatchers.get(key);
      if (watchers) {
        const index = watchers.indexOf(callback);
        if (index > -1) {
          watchers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Get configuration change history
   */
  public getChangeHistory(key?: string): ConfigurationChangeEvent[] {
    if (key) {
      return this.changeHistory.filter(event => event.key === key);
    }
    return [...this.changeHistory];
  }

  /**
   * Get rotation status for all configured secrets
   */
  public getRotationStatus(): { [key: string]: SecretRotationConfig } {
    const status: { [key: string]: SecretRotationConfig } = {};
    
    for (const [key, config] of this.rotationConfigs) {
      status[key] = { ...config };
    }
    
    return status;
  }

  /**
   * Start the rotation scheduler
   */
  private startRotationScheduler(): void {
    // Check for rotations every hour
    setInterval(async () => {
      try {
        await this.checkSecretRotations();
      } catch (error) {
        log('Secret rotation check failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Get secure configuration summary
   */
  public getConfigurationSummary(): {
    totalKeys: number;
    validatedKeys: number;
    rotatingSecrets: number;
    lastValidation: string;
    validationStatus: { valid: boolean; errors: string[] };
  } {
    const validation = this.validateConfiguration();
    
    return {
      totalKeys: Object.keys(envSecurity.getSafeConfig()).length,
      validatedKeys: this.validationRules.size,
      rotatingSecrets: this.rotationConfigs.size,
      lastValidation: new Date().toISOString(),
      validationStatus: validation
    };
  }

  /**
   * Export configuration for backup (sensitive data masked)
   */
  public exportConfiguration(): {
    configuration: { [key: string]: any };
    validationRules: string[];
    rotationConfigs: string[];
    changeHistory: ConfigurationChangeEvent[];
  } {
    const safeConfig = envSecurity.getSafeConfig();
    
    return {
      configuration: safeConfig,
      validationRules: Array.from(this.validationRules.keys()),
      rotationConfigs: Array.from(this.rotationConfigs.keys()),
      changeHistory: this.changeHistory.slice(-100) // Last 100 changes
    };
  }
}

// Export singleton instance
export const configManager = SecureConfigurationManager.getInstance();

// Convenience functions
export function validateConfig(): { valid: boolean; errors: string[] } {
  return configManager.validateConfiguration();
}

export function sanitizeConfig(): { [key: string]: any } {
  return configManager.sanitizeConfiguration();
}

export function configureRotation(config: SecretRotationConfig): void {
  return configManager.configureSecretRotation(config);
}

export function watchConfig(key: string, callback: (value: any) => void): () => void {
  return configManager.watchConfiguration(key, callback);
}

export function getConfigSummary() {
  return configManager.getConfigurationSummary();
}