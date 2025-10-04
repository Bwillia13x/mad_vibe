import { Router } from 'express'
import { db } from '../../lib/db'
import { companies, financialMetrics } from '../../lib/db/schema'
import { desc, eq, sql, gte, lte, and } from 'drizzle-orm'
import { parseScreenerFilters } from '../lib/openai'
import {
  getInMemoryScreenerCompanies,
  runInMemoryScreenerQuery
} from '../lib/in-memory-research-store'

// AI handled via parseScreenerFilters() which supports demo and live modes

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

type ScreenerRow = {
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
  selected: number | null
  matchReason: string | null
}

export function createScreenerRouter() {
  const screenerRouter = Router()

  const hasDatabase = db !== null

  // GET /companies - Fetch screener companies with latest financial metrics
  screenerRouter.get('/companies', async (_req, res) => {
    try {
      if (!hasDatabase) {
        const fallbackCompanies = getInMemoryScreenerCompanies()
        return res.json(fallbackCompanies)
      }

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
          qualityScore:
            sql<number>`GREATEST(0, LEAST(100, ROUND(COALESCE(${financialMetrics.roic}, 0) * 2 + COALESCE(${financialMetrics.fcfYield}, 0) * 5 - COALESCE(${financialMetrics.accruals}, 0) * 1.5)))`.as(
              'qualityScore'
            ),
          moat: financialMetrics.moat,
          accruals: financialMetrics.accruals,
          selected: financialMetrics.selected,
          matchReason: financialMetrics.matchReason
        })
        .from(companies)
        .leftJoin(financialMetrics, eq(companies.id, financialMetrics.companyId))
        .orderBy(desc(financialMetrics.updatedAt ?? companies.updatedAt))
        .limit(100)

      const screenerCompanies: ScreenerCompany[] = (results as ScreenerRow[]).map((row) => ({
        ...row,
        roic: row.roic ?? 0,
        fcfYield: row.fcfYield ?? 0,
        leverage: row.leverage ?? 0,
        growthDurability: row.growthDurability ?? 0,
        insiderOwnership: row.insiderOwnership ?? 0,
        qualityScore: Number(row.qualityScore),
        moat: row.moat ?? '',
        accruals: row.accruals ?? 0,
        selected: (row.selected ?? 0) === 1,
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

    try {
      // Parse query via AI helper (demo-friendly with heuristics)
      const parsedFilters = (await parseScreenerFilters(query)) as NLQueryFilters

      if (!hasDatabase) {
        const result = runInMemoryScreenerQuery(parsedFilters)
        const nlResult: NLQueryResult = {
          companies: result.companies,
          averageROIC: result.averageROIC,
          averageFCFYield: result.averageFCFYield,
          averageLeverage: result.averageLeverage,
          roicMin: parsedFilters.roicMin,
          fcfyMin: parsedFilters.fcfYieldMin,
          netCash: parsedFilters.leverageMax !== undefined && parsedFilters.leverageMax < 0,
          lowAccruals: true,
          neglect: true
        }
        return res.json(nlResult)
      }

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
          qualityScore:
            sql<number>`GREATEST(0, LEAST(100, ROUND(COALESCE(${financialMetrics.roic}, 0) * 2 + COALESCE(${financialMetrics.fcfYield}, 0) * 5 - COALESCE(${financialMetrics.accruals}, 0) * 1.5)))`.as(
              'qualityScore'
            ),
          moat: financialMetrics.moat,
          accruals: financialMetrics.accruals,
          selected: financialMetrics.selected,
          matchReason: financialMetrics.matchReason
        })
        .from(companies)
        .leftJoin(financialMetrics, eq(companies.id, financialMetrics.companyId))

      type WhereFragment = ReturnType<typeof eq>
      const predicates: WhereFragment[] = []

      if (parsedFilters.roicMin !== undefined) {
        predicates.push(gte(financialMetrics.roic, parsedFilters.roicMin))
      }
      if (parsedFilters.fcfYieldMin !== undefined) {
        predicates.push(gte(financialMetrics.fcfYield, parsedFilters.fcfYieldMin))
      }
      if (parsedFilters.leverageMax !== undefined) {
        predicates.push(lte(financialMetrics.leverage, parsedFilters.leverageMax))
      }
      if (parsedFilters.sector) {
        predicates.push(eq(companies.sector, parsedFilters.sector))
      }
      if (parsedFilters.geo) {
        predicates.push(eq(companies.geo, parsedFilters.geo))
      }

      if (predicates.length === 1) {
        dbQuery = dbQuery.where(predicates[0])
      } else if (predicates.length > 1) {
        dbQuery = dbQuery.where(and(...predicates))
      }

      dbQuery = dbQuery.orderBy(desc(financialMetrics.updatedAt ?? companies.updatedAt)).limit(50)

      const results = await dbQuery

      const screenerCompanies: ScreenerCompany[] = (results as ScreenerRow[]).map((row) => ({
        ...row,
        roic: row.roic ?? 0,
        fcfYield: row.fcfYield ?? 0,
        leverage: row.leverage ?? 0,
        growthDurability: row.growthDurability ?? 0,
        insiderOwnership: row.insiderOwnership ?? 0,
        qualityScore: Number(row.qualityScore),
        moat: row.moat ?? '',
        accruals: row.accruals ?? 0,
        selected: (row.selected ?? 0) === 1,
        matchReason: row.matchReason ?? null
      }))

      // Compute averages
      const averageROIC =
        screenerCompanies.reduce((sum, c) => sum + (c.roic ?? 0), 0) / screenerCompanies.length || 0
      const averageFCFYield =
        screenerCompanies.reduce((sum, c) => sum + (c.fcfYield ?? 0), 0) /
          screenerCompanies.length || 0
      const averageLeverage =
        screenerCompanies.reduce((sum, c) => sum + (c.leverage ?? 0), 0) /
          screenerCompanies.length || 0

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
