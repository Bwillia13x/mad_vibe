#!/usr/bin/env node
/**
 * Ensure screener tables exist without interactive drizzle push.
 */
import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

async function ensureTables() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: databaseUrl })

  const createCompanies = `
  CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(10) NOT NULL,
    name VARCHAR(255) NOT NULL,
    sector VARCHAR(100),
    geo VARCHAR(100),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`

  const createFinancials = `
  CREATE TABLE IF NOT EXISTS financial_metrics (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    roic INTEGER,
    fcf_yield INTEGER,
    leverage INTEGER,
    growth_durability INTEGER,
    insider_ownership INTEGER,
    moat VARCHAR(100),
    accruals INTEGER,
    selected INTEGER DEFAULT 0,
    match_reason VARCHAR(255),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`

  try {
    await pool.query('BEGIN')
    await pool.query(createCompanies)
    await pool.query(createFinancials)
    await pool.query('COMMIT')
    console.log('✅ Screener tables are present (created if missing).')
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {})
    console.error('❌ Failed ensuring tables:', err)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

ensureTables().catch(console.error)
