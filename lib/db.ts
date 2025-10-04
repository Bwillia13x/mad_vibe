import { getEnvVar } from './env-security'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as sharedSchema from '../shared/schema'
import * as localSchema from './db/schema'

const schema = { ...sharedSchema, ...localSchema }

let db: any = null
let pool: Pool | null = null

if (getEnvVar('NODE_ENV') !== 'test') {
  const databaseUrl = getEnvVar('DATABASE_URL')
  if (!databaseUrl) {
    console.error('DATABASE_URL not set; cannot initialize DB')
    db = null
  } else {
    // Use node-postgres Pool for local PostgreSQL connection
    pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    })
    db = drizzle(pool, { schema })
    console.log('Drizzle DB initialized with node-postgres')
  }
} else {
  console.log('Using null DB in test mode')
}

export { db, schema }
