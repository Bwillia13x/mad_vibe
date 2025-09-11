import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '@/shared/schema'
import { log } from '../log'

if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
  throw new Error(
    "POSTGRES_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  )
}

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL

export const pool = new Pool({ 
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export const db = drizzle(pool, { schema })

// Test database connection
pool.on('connect', () => {
  log('Database connection established', { timestamp: new Date().toISOString() })
})

pool.on('error', (err) => {
  log('Database connection error', { error: err.message })
})

export default db
