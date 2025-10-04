#!/usr/bin/env node
/**
 * Seed script for companies and financial_metrics tables
 * Populates with sample data for testing screener functionality
 */

// Load environment variables from .env file FIRST
import 'dotenv/config'

import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { companies, financialMetrics } from '../lib/db/schema'
import { getEnvVar } from '../lib/env-security'

const { Pool } = pg

async function seedCompanies() {
  const databaseUrl = getEnvVar('DATABASE_URL') as string
  if (!databaseUrl) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: databaseUrl })
  const db = drizzle(pool)

  console.log('Seeding companies and financial metrics...')

  try {
    // Sample companies data
    const sampleCompanies = [
      { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', geo: 'US' },
      { ticker: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', geo: 'US' },
      { ticker: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', geo: 'US' },
      { ticker: 'BRK.B', name: 'Berkshire Hathaway', sector: 'Financials', geo: 'US' },
      { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', geo: 'US' },
      { ticker: 'V', name: 'Visa Inc.', sector: 'Financials', geo: 'US' },
      { ticker: 'PG', name: 'Procter & Gamble', sector: 'Consumer', geo: 'US' },
      { ticker: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology', geo: 'US' },
      { ticker: 'HD', name: 'Home Depot', sector: 'Retail', geo: 'US' },
      { ticker: 'MA', name: 'Mastercard Inc.', sector: 'Financials', geo: 'US' }
    ]

    // Insert companies
    const insertedCompanies = await db.insert(companies).values(sampleCompanies).returning()
    console.log(`✓ Inserted ${insertedCompanies.length} companies`)

    // Sample financial metrics (high quality companies matching typical screener criteria)
    // Note: leverage is stored as integer (0 or 1) for demo parity with query filters
    const sampleMetrics = [
      {
        companyId: insertedCompanies[0].id,
        roic: 28,
        fcfYield: 8,
        leverage: 1,
        growthDurability: 85,
        insiderOwnership: 5,
        moat: 'Brand',
        accruals: 2,
        selected: 1,
        matchReason: 'High ROIC, strong FCF'
      },
      {
        companyId: insertedCompanies[1].id,
        roic: 25,
        fcfYield: 7,
        leverage: 0,
        growthDurability: 80,
        insiderOwnership: 3,
        moat: 'Network',
        accruals: 1,
        selected: 1,
        matchReason: 'Consistent quality metrics'
      },
      {
        companyId: insertedCompanies[2].id,
        roic: 22,
        fcfYield: 9,
        leverage: 0,
        growthDurability: 90,
        insiderOwnership: 8,
        moat: 'Network',
        accruals: 3,
        selected: 1,
        matchReason: 'Strong cash generation'
      },
      {
        companyId: insertedCompanies[3].id,
        roic: 18,
        fcfYield: 6,
        leverage: 1,
        growthDurability: 75,
        insiderOwnership: 35,
        moat: 'Diversified',
        accruals: 2,
        selected: 0,
        matchReason: ''
      },
      {
        companyId: insertedCompanies[4].id,
        roic: 20,
        fcfYield: 7,
        leverage: 1,
        growthDurability: 70,
        insiderOwnership: 2,
        moat: 'Brand',
        accruals: 4,
        selected: 1,
        matchReason: 'Healthcare leader'
      },
      {
        companyId: insertedCompanies[5].id,
        roic: 32,
        fcfYield: 10,
        leverage: 0,
        growthDurability: 95,
        insiderOwnership: 4,
        moat: 'Network',
        accruals: 1,
        selected: 1,
        matchReason: 'Exceptional metrics'
      },
      {
        companyId: insertedCompanies[6].id,
        roic: 16,
        fcfYield: 6,
        leverage: 1,
        growthDurability: 65,
        insiderOwnership: 1,
        moat: 'Brand',
        accruals: 5,
        selected: 0,
        matchReason: ''
      },
      {
        companyId: insertedCompanies[7].id,
        roic: 30,
        fcfYield: 5,
        leverage: 0,
        growthDurability: 100,
        insiderOwnership: 6,
        moat: 'Technology',
        accruals: 2,
        selected: 1,
        matchReason: 'High growth, strong moat'
      },
      {
        companyId: insertedCompanies[8].id,
        roic: 24,
        fcfYield: 8,
        leverage: 1,
        growthDurability: 68,
        insiderOwnership: 3,
        moat: 'Scale',
        accruals: 3,
        selected: 1,
        matchReason: 'Solid fundamentals'
      },
      {
        companyId: insertedCompanies[9].id,
        roic: 29,
        fcfYield: 9,
        leverage: 0,
        growthDurability: 92,
        insiderOwnership: 4,
        moat: 'Network',
        accruals: 1,
        selected: 1,
        matchReason: 'Premium quality'
      }
    ]

    await db.insert(financialMetrics).values(sampleMetrics)
    console.log(`✓ Inserted ${sampleMetrics.length} financial metrics`)

    console.log('\n✅ Database seeded successfully!')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

seedCompanies().catch(console.error)
