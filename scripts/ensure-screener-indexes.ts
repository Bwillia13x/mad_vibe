#!/usr/bin/env node
/**
 * Ensure useful indexes for screener queries exist.
 */
import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

async function ensureIndexes() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: databaseUrl })

  const statements = [
    `CREATE INDEX IF NOT EXISTS idx_companies_sector ON companies (sector)`,
    `CREATE INDEX IF NOT EXISTS idx_companies_geo ON companies (geo)`,
    `CREATE INDEX IF NOT EXISTS idx_finmetrics_company_id ON financial_metrics (company_id)`,
    `CREATE INDEX IF NOT EXISTS idx_finmetrics_roic ON financial_metrics (roic)`,
    `CREATE INDEX IF NOT EXISTS idx_finmetrics_fcf_yield ON financial_metrics (fcf_yield)`,
    `CREATE INDEX IF NOT EXISTS idx_finmetrics_leverage ON financial_metrics (leverage)`
  ]

  try {
    await pool.query('BEGIN')
    for (const sql of statements) {
      await pool.query(sql)
    }
    await pool.query('COMMIT')
    console.log('✅ Screener indexes ensured (created if missing).')
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {})
    console.error('❌ Failed ensuring screener indexes:', err)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

ensureIndexes().catch(console.error)
