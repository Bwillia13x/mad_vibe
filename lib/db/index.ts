import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '@/shared/schema'
import { log } from '../log'
import { connectionPool } from './connection-pool'

// Use the enhanced connection pool
export const pool = connectionPool;

// Create drizzle instance with enhanced pool
export const db = drizzle(pool as any, { schema })

// Export connection pool methods for direct access
export const { query, getConnection, transaction, getMetrics, getStatus } = connectionPool;

log('Enhanced database connection pool initialized', {
  maxConnections: 25,
  minConnections: 5,
  healthCheckEnabled: true
});

export default db
