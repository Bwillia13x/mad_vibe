import { Router } from 'express'
import { optionalAuth } from '../middleware/auth'
import { db } from '../../lib/db'
import { marketSnapshots, workspaceDataSnapshots, workflows } from '../../lib/db/schema'
import {
  getStockQuote,
  getCompanyProfile,
  getFinancialMetrics,
  getHistoricalPrices
} from '../../lib/data-sources/market-data'
import { logError } from '../../lib/log'
import { eq, desc } from 'drizzle-orm'

const router = Router()
router.use(optionalAuth)

function assertDb() {
  if (!db) {
    throw new Error('Database connection unavailable')
  }
}

type WorkspaceContext = {
  id: number
  ticker?: string | null
}

async function loadWorkspaceContext(workspaceId: number): Promise<WorkspaceContext | null> {
  assertDb()
  const result = await db.select().from(workflows).where(eq(workflows.id, workspaceId)).limit(1)
  if (result.length === 0) return null
  const workspace = result[0]
  return { id: workspace.id, ticker: workspace.ticker }
}

router.post('/data-ingest/market/refresh', async (req, res) => {
  try {
    const { ticker, workspaceId } = req.body as { ticker?: string; workspaceId?: number }

    if (!ticker || typeof ticker !== 'string') {
      return res.status(400).json({ error: 'ticker is required' })
    }

    const symbol = ticker.trim().toUpperCase()

    let workspaceContext: WorkspaceContext | null = null
    if (workspaceId && typeof workspaceId === 'number') {
      workspaceContext = await loadWorkspaceContext(workspaceId)
      if (!workspaceContext) {
        return res.status(404).json({ error: 'workspace not found' })
      }
    }

    const [quote, profile, metrics, history] = await Promise.all([
      getStockQuote(symbol, { forceRefresh: true }),
      getCompanyProfile(symbol),
      getFinancialMetrics(symbol),
      getHistoricalPrices(symbol, new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date(), {
        forceRefresh: true
      })
    ])

    if (!quote) {
      return res.status(404).json({ error: 'Failed to fetch market data quote' })
    }

    assertDb()

    const [snapshot] = await db
      .insert(marketSnapshots)
      .values({
        ticker: symbol,
        provider: process.env.MARKET_DATA_PROVIDER || 'yahoo',
        rawPayload: {
          quote,
          profile,
          metrics,
          history
        },
        normalizedMetrics: {
          price: quote.price,
          changePercent: quote.changePercent,
          marketCap: quote.marketCap,
          debtToEquity: metrics?.debtToEquity ?? null,
          sector: profile?.sector ?? null,
          industry: profile?.industry ?? null
        },
        sourceMetadata: {
          fetchedAt: new Date().toISOString(),
          provider: process.env.MARKET_DATA_PROVIDER || 'yahoo'
        }
      })
      .returning()

    let workspaceSnapshot = null

    if (workspaceContext) {
      const [wsSnapshot] = await db
        .insert(workspaceDataSnapshots)
        .values({
          workflowId: workspaceContext.id,
          snapshotType: 'market-refresh',
          marketSnapshotId: snapshot.id,
          data: {
            ticker: symbol,
            quote,
            metrics,
            profile,
            history: history.slice(-30)
          }
        })
        .returning()
      workspaceSnapshot = wsSnapshot
    }

    res.status(201).json({
      snapshot,
      workspaceSnapshot
    })
  } catch (error) {
    logError('Market refresh failed', error as Error)
    res.status(500).json({ error: 'Failed to refresh market data' })
  }
})

router.get('/data-ingest/market/latest/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params
    const symbol = ticker.trim().toUpperCase()

    assertDb()
    const latest = await db
      .select()
      .from(marketSnapshots)
      .where(eq(marketSnapshots.ticker, symbol))
      .orderBy(desc(marketSnapshots.capturedAt))
      .limit(1)

    if (latest.length === 0) {
      return res.status(404).json({ error: 'No snapshots found' })
    }

    res.json(latest[0])
  } catch (error) {
    logError('Failed to fetch latest market snapshot', error as Error)
    res.status(500).json({ error: 'Failed to fetch latest snapshot' })
  }
})

router.get('/data-ingest/workspaces/:id/snapshots', async (req, res) => {
  try {
    const workspaceId = Number(req.params.id)
    if (Number.isNaN(workspaceId)) {
      return res.status(400).json({ error: 'Invalid workspace id' })
    }

    assertDb()
    const snapshots = await db
      .select()
      .from(workspaceDataSnapshots)
      .where(eq(workspaceDataSnapshots.workflowId, workspaceId))
      .orderBy(desc(workspaceDataSnapshots.createdAt))
      .limit(50)

    res.json({ snapshots, count: snapshots.length })
  } catch (error) {
    logError('Failed to fetch workspace snapshots', error as Error)
    res.status(500).json({ error: 'Failed to fetch workspace snapshots' })
  }
})

router.get('/data-ingest/workspaces/:id/snapshots/:snapshotId', async (req, res) => {
  try {
    const workspaceId = Number(req.params.id)
    const snapshotId = Number(req.params.snapshotId)

    if (Number.isNaN(workspaceId) || Number.isNaN(snapshotId)) {
      return res.status(400).json({ error: 'Invalid identifiers' })
    }

    assertDb()
    const result = await db
      .select()
      .from(workspaceDataSnapshots)
      .where(eq(workspaceDataSnapshots.workflowId, workspaceId))
      .where(eq(workspaceDataSnapshots.id, snapshotId))
      .limit(1)

    if (result.length === 0) {
      return res.status(404).json({ error: 'Snapshot not found' })
    }

    res.json(result[0])
  } catch (error) {
    logError('Failed to fetch workspace snapshot detail', error as Error)
    res.status(500).json({ error: 'Failed to fetch snapshot detail' })
  }
})

export default router
