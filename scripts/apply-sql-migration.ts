import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { Client } from 'pg'

async function main() {
  const file = process.argv[2]
  if (!file) {
    console.error('Usage: tsx scripts/apply-sql-migration.ts <path-to-sql>')
    process.exit(1)
  }
  const sqlPath = path.resolve(process.cwd(), file)
  const sql = fs.readFileSync(sqlPath, 'utf8')

  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL
  if (!connectionString) {
    console.error('POSTGRES_URL or DATABASE_URL must be set in environment')
    process.exit(1)
  }

  const client = new Client({ connectionString })
  try {
    await client.connect()
    console.log(`Applying SQL migration: ${sqlPath}`)
    await client.query('BEGIN')
    await client.query(sql)
    await client.query('COMMIT')
    console.log('Migration applied successfully')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Migration failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  } finally {
    await client.end()
  }
}

void main()
