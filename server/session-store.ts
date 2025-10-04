import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import { getEnvVar } from '../lib/env-security'
import { connectionPool } from '../lib/db/connection-pool'

export function getSessionStore(): session.Store | undefined {
  const nodeEnv = getEnvVar('NODE_ENV') || 'development'
  const desired =
    (getEnvVar('SESSION_STORAGE') as string) || (nodeEnv === 'production' ? 'postgres' : 'memory')

  if (desired !== 'postgres') return undefined

  const PgStore = connectPgSimple(session)
  const pool = connectionPool?.getRawPool()
  const conString = (getEnvVar('POSTGRES_URL') as string) || (getEnvVar('DATABASE_URL') as string)

  if (!pool && !conString) return undefined

  return new PgStore({
    pool: pool || undefined,
    conString: pool ? undefined : conString,
    tableName: 'session',
    schemaName: 'public',
    createTableIfMissing: true
  })
}
