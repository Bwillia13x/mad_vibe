import { getEnvVar } from './env-security';

interface LogContext {
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  message: string
  context?: LogContext
}

export function log(message: string, context?: LogContext): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'info',
    message,
    context
  }
  
  // In development, also log to console
  if (getEnvVar('NODE_ENV') === 'development') {
    console.log(`[${entry.timestamp}] ${entry.message}`, context ? context : '')
  }
  
  // In production, you might want to send to a logging service
  // For now, we'll just use console.log with structured format
  console.log(JSON.stringify(entry))
}

export function logError(message: string, error: Error, context?: LogContext): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message,
    context: {
      ...context,
      error: error.message,
      stack: error.stack
    }
  }
  
  console.error(JSON.stringify(entry))
}

export function logWarn(message: string, context?: LogContext): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'warn',
    message,
    context
  }
  
  console.warn(JSON.stringify(entry))
}
