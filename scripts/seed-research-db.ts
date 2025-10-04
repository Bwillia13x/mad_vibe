import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { Pool } from 'pg'

async function main() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL or POSTGRES_URL must be set to seed the database')
  }

  const pool = new Pool({ connectionString })
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const sqlPath = resolve(__dirname, '../init.sql')
  const sql = await readFile(sqlPath, 'utf8')

  console.log('Seeding research database...')
  await pool.query(sql)
  await pool.end()
  console.log('Research database seeded successfully.')
}

main().catch((error) => {
  console.error('Error seeding research database:', error)
  process.exitCode = 1
})
