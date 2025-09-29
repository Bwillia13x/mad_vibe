import { getEnvVar } from './env-security'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as sharedSchema from '../shared/schema'
import * as localSchema from './db/schema'

const schema = { ...sharedSchema, ...localSchema }

let db: any = null

if (getEnvVar('NODE_ENV') !== 'test') {
  const databaseUrl = getEnvVar('DATABASE_URL')
  if (!databaseUrl) {
    console.error('DATABASE_URL not set; cannot initialize DB')
    db = null
  } else {
    const sql = neon(databaseUrl)
    db = drizzle(sql, { schema })
    console.log('Drizzle DB initialized with Neon')
  }
} else {
  console.log('Using null DB in test mode')
}

export { db, schema }