import { drizzle } from 'drizzle-orm/node-postgres'
import type { Pool } from 'pg'
import * as sharedSchema from '../../shared/schema'
import * as localSchema from './schema'
import { log } from '../log'
import { connectionPool } from './connection-pool'

const rawPool: Pool | null = connectionPool ? connectionPool.getRawPool() : null

export const pool = rawPool

const fullSchema = { ...sharedSchema, ...localSchema }
export const db = rawPool ? drizzle(rawPool, { schema: fullSchema }) : null

// Export connection pool methods for direct access (only if available)
export const query = connectionPool?.query
export const getConnection = connectionPool?.getConnection
export const transaction = connectionPool?.transaction
export const getMetrics = connectionPool?.getMetrics
export const getStatus = connectionPool?.getStatus

if (connectionPool) {
  log('Enhanced database connection pool initialized', {
    maxConnections: 25,
    minConnections: 5,
    healthCheckEnabled: true
  })
} else {
  log('Database connection pool not initialized - running in demo/memory mode')
}

export default db
