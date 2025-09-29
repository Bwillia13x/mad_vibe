import { Router } from 'express'
import { db } from '../../lib/db'
import { companies, financialMetrics } from '../../lib/db/schema'
import { desc, eq, sql, gte, lte } from 'drizzle-orm'
import OpenAI from 'openai'
import { getEnvVar } from '../../lib/env-security'

let openai: OpenAI | null = null
const apiKey = getEnvVar('OPENAI_API_KEY')
if (apiKey && apiKey.trim().length > 0) {
  openai = new OpenAI({ apiKey })
}

interface NLQueryFilters {
  roicMin?: number
  fcfYieldMin?: number
  leverageMax?: number
  sector?: string
  geo?: string
}

interface ScreenerCompany {
  id: number
  ticker: string
  name: string
  sector: string
  geo: string
  roic: number | null
  fcfYield: number | null
  leverage: number | null
  growthDurability: number | null
  insiderOwnership: number | null
  qualityScore: number
  moat: string | null
  accruals: number | null
  selected: boolean
  matchReason: string | null
}

interface NLQueryResult {
  companies: ScreenerCompany[]
  averageROIC: number
  averageFCFYield: number
  averageLeverage: number
  roicMin?: number
  fcfyMin?: number
  netCash?: boolean
  lowAccruals?: boolean
  neglect?: boolean
}

export function createScreenerRouter() {
  const screenerRouter = Router()

  const hasDatabase = db !== null

  // GET /companies - Fetch screener companies with latest financial metrics
  screenerRouter.get('/companies', async (_req, res) => {
    if (!hasDatabase) {
      return res.status(503).json({ message: 'Database not available' })
    }

    try {
      const results = await db!
        .select({
          id: companies.id,
          ticker: companies.ticker,
          name: companies.name,
          sector: companies.sector,
          geo: companies.geo,
          roic: financialMetrics.roic,
          fcfYield: financialMetrics.fcfYield,
          leverage: financialMetrics.leverage,
          growthDurability: financialMetrics.growthDurability,
          insiderOwnership: financialMetrics.insiderOwnership,
          qualityScore: sql<number>`GREATEST(0, LEAST(100, ROUND(COALESCE(${financialMetrics.roic}, 0) * 2 + COALESCE(${financialMetrics.fcfYield}, 0) * 5 - COALESCE(${financialMetrics.accruals}, 0) * 1.5)))`.as('qualityScore'),
          moat: financialMetrics.moat,
          accruals: financialMetrics.accruals,
          selected: financialMetrics.selected,
          matchReason: financialMetrics.matchReason
        })
        .from(companies)
        .leftJoin(financialMetrics, eq(companies.id, financialMetrics.companyId))
        .orderBy(desc(financialMetrics.updatedAt ?? companies.updatedAt))
        .limit(100)

      const screenerCompanies: ScreenerCompany[] = results.map((row: any) => ({
        ...row,
        roic: row.roic ?? 0,
        fcfYield: row.fcfYield ?? 0,
        leverage: row.leverage ?? 0,
        growthDurability: row.growthDurability ?? 0,
        insiderOwnership: row.insiderOwnership ?? 0,
        qualityScore: Number(row.qualityScore),
        moat: row.moat ?? '',
        accruals: row.accruals ?? 0,
        selected: row.selected ?? false,
        matchReason: row.matchReason ?? null
      }))

      res.json(screenerCompanies)
    } catch (error) {
      console.error('Failed to fetch screener companies:', error)
      res.status(500).json({ message: 'Failed to fetch companies' })
    }
  })

  // POST /nl-query - Natural language query processing
  screenerRouter.post('/nl-query', async (req, res) => {
    const { query } = req.body
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ message: 'Query is required' })
    }

    if (!hasDatabase) {
      return res.status(503).json({ message: 'Database not available' })
    }

    if (!openai) {
      return res.status(503).json({ message: 'AI service not available' })
    }

    try {
      // Parse query with OpenAI
      const prompt = `Parse this natural language stock screener query into JSON filters. Use keys: roicMin, fcfYieldMin, leverageMax, sector, geo. Values null if unspecified. Respond only with valid JSON. Query: "${query}"`

      const response = await openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          { role: 'system', content: 'You are a stock screener AI. Parse queries into JSON filters for financial metrics. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.1
      })

      const aiResponse = response.choices[0].message.content
      if (!aiResponse) {
        throw new Error('No response from AI')
      }

      const parsedFilters = JSON.parse(aiResponse) as NLQueryFilters

      // Build filtered query
      let dbQuery = db!
        .select({
          id: companies.id,
          ticker: companies.ticker,
          name: companies.name,
          sector: companies.sector,
          geo: companies.geo,
          roic: financialMetrics.roic,
          fcfYield: financialMetrics.fcfYield,
          leverage: financialMetrics.leverage,
          growthDurability: financialMetrics.growthDurability,
          insiderOwnership: financialMetrics.insiderOwnership,
          qualityScore: sql<number>`GREATEST(0, LEAST(100, ROUND(COALESCE(${financialMetrics.roic}, 0) * 2 + COALESCE(${financialMetrics.fcfYield}, 0) * 5 - COALESCE(${financialMetrics.accruals}, 0) * 1.5)))`.as('qualityScore'),
          moat: financialMetrics.moat,
          accruals: financialMetrics.accruals,
          selected: financialMetrics.selected,
          matchReason: financialMetrics.matchReason
        })
        .from(companies)
        .leftJoin(financialMetrics, eq(companies.id, financialMetrics.companyId))

      if (parsedFilters.roicMin) dbQuery = dbQuery.where(gte(financialMetrics.roic, parsedFilters.roicMin))
      if (parsedFilters.fcfYieldMin) dbQuery = dbQuery.where(gte(financialMetrics.fcfYield, parsedFilters.fcfYieldMin))
      if (parsedFilters.leverageMax) dbQuery = dbQuery.where(lte(financialMetrics.leverage, parsedFilters.leverageMax))
      if (parsedFilters.sector) dbQuery = dbQuery.where(eq(companies.sector, parsedFilters.sector))
      if (parsedFilters.geo) dbQuery = dbQuery.where(eq(companies.geo, parsedFilters.geo))

      dbQuery = dbQuery.orderBy(desc(financialMetrics.updatedAt ?? companies.updatedAt)).limit(50)

      const results = await dbQuery

      const screenerCompanies: ScreenerCompany[] = results.map((row: any) => ({
        ...row,
        roic: row.roic ?? 0,
        fcfYield: row.fcfYield ?? 0,
        leverage: row.leverage ?? 0,
        growthDurability: row.growthDurability ?? 0,
        insiderOwnership: row.insiderOwnership ?? 0,
        qualityScore: Number(row.qualityScore),
        moat: row.moat ?? '',
        accruals: row.accruals ?? 0,
        selected: row.selected ?? false,
        matchReason: row.matchReason ?? null
      }))

      // Compute averages
      const averageROIC = screenerCompanies.reduce((sum, c) => sum + (c.roic ?? 0), 0) / screenerCompanies.length || 0
      const averageFCFYield = screenerCompanies.reduce((sum, c) => sum + (c.fcfYield ?? 0), 0) / screenerCompanies.length || 0
      const averageLeverage = screenerCompanies.reduce((sum, c) => sum + (c.leverage ?? 0), 0) / screenerCompanies.length || 0

      const nlResult: NLQueryResult = {
        companies: screenerCompanies,
        averageROIC,
        averageFCFYield,
        averageLeverage,
        roicMin: parsedFilters.roicMin,
        fcfyMin: parsedFilters.fcfYieldMin,
        netCash: parsedFilters.leverageMax !== undefined && parsedFilters.leverageMax < 0,
        lowAccruals: true, // Placeholder
        neglect: true // Placeholder
      }

      res.json(nlResult)
    } catch (error) {
      console.error('Failed to execute NL query:', error)
      res.status(500).json({ message: 'Failed to execute query' })
    }
  })

  return screenerRouter
}

export default createScreenerRouter