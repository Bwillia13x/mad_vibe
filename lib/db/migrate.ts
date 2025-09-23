import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { db, pool } from './index'
import { log } from '../log'

async function runMigration() {
  try {
    log('Starting database migration...', { timestamp: new Date().toISOString() })

    if (!db || !pool) {
      throw new Error('Database connection is not configured; cannot run migrations.')
    }

    await migrate(db, { migrationsFolder: './migrations' })

    log('Database migration completed successfully', { timestamp: new Date().toISOString() })
  } catch (error) {
    log('Database migration failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
    throw error
  } finally {
    if (pool) {
      await pool.end()
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then(() => {
      console.log('Migration completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Migration failed:', error)
      process.exit(1)
    })
}

export { runMigration }
