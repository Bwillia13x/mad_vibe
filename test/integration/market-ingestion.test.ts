import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('drizzle-orm', () => {
  const toCamel = (value: string): string =>
    value.replace(/_([a-z])/g, (_match, char: string) => char.toUpperCase())

  const resolveColumnKey = (column: Record<string, unknown>): string => {
    if (!column || typeof column !== 'object') {
      throw new Error('Mock drizzle column is not an object')
    }

    const possibleNames = [
      typeof column.name === 'string' ? (column.name as string) : undefined,
      typeof column.columnName === 'string' ? (column.columnName as string) : undefined,
      typeof column.key === 'string' ? (column.key as string) : undefined
    ].filter(Boolean) as string[]

    if (possibleNames.length === 0) {
      const stringProperty = Object.values(column).find((value) => typeof value === 'string')
      if (typeof stringProperty === 'string') {
        possibleNames.push(stringProperty)
      }
    }

    if (possibleNames.length === 0) {
      throw new Error('Unable to resolve column name for mock drizzle eq/desc')
    }

    return toCamel(possibleNames[0])
  }

  const eq = (column: Record<string, unknown>, value: unknown) => ({
    type: 'eq' as const,
    columnKey: resolveColumnKey(column),
    value
  })

  const desc = (column: Record<string, unknown>) => ({
    type: 'order' as const,
    columnKey: resolveColumnKey(column),
    direction: 'desc' as const
  })

  return {
    eq,
    desc
  }
})

vi.mock('../../lib/db', () => {
  type TableKey = object
  const tables = new Map<TableKey, any[]>()
  const idCounters = new Map<TableKey, number>()

  const ensureTable = (table: TableKey): any[] => {
    if (!tables.has(table)) {
      tables.set(table, [])
    }
    return tables.get(table) as any[]
  }

  const clone = <T>(value: T): T => structuredClone(value)

  const assignDefaults = (table: TableKey, record: Record<string, any>) => {
    if (typeof record.id !== 'number') {
      const nextId = (idCounters.get(table) ?? 0) + 1
      idCounters.set(table, nextId)
      record.id = nextId
    }

    const timestampFields = ['createdAt', 'updatedAt', 'capturedAt']
    const now = new Date()
    for (const field of timestampFields) {
      if (!(field in record)) {
        record[field] = now
      }
    }
  }

  const applyPredicate = (predicate: any, row: Record<string, unknown>): boolean => {
    if (!predicate) return true
    if (predicate.type === 'eq') {
      return row[predicate.columnKey] === predicate.value
    }
    if (predicate.type === 'and' && Array.isArray(predicate.predicates)) {
      return predicate.predicates.every((inner) => applyPredicate(inner, row))
    }
    return true
  }

  const compare = (a: unknown, b: unknown): number => {
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime()
    }
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b
    }
    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b)
    }
    return 0
  }

  const db = {
    insert(table: TableKey) {
      return {
        values(values: Record<string, any>) {
          const record = { ...values }
          assignDefaults(table, record)
          ensureTable(table).push(record)
          return {
            returning() {
              return [clone(record)]
            }
          }
        }
      }
    },
    select() {
      return {
        from(table: TableKey) {
          let rows = ensureTable(table).map((row) => clone(row))
          const builder = {
            where(predicate: any) {
              rows = rows.filter((row) => applyPredicate(predicate, row))
              return builder
            },
            orderBy(orderArg: any) {
              if (!orderArg) return builder
              const orders = Array.isArray(orderArg) ? orderArg : [orderArg]
              rows.sort((left, right) => {
                for (const order of orders) {
                  if (!order || typeof order.columnKey !== 'string') continue
                  const direction = order.direction === 'desc' ? -1 : 1
                  const comparison = compare(left[order.columnKey], right[order.columnKey])
                  if (comparison !== 0) {
                    return comparison * direction
                  }
                }
                return 0
              })
              return builder
            },
            limit(count: number) {
              const limited = typeof count === 'number' ? rows.slice(0, count) : rows
              return Promise.resolve(limited)
            }
          }
          return builder
        }
      }
    }
  }

  const reset = () => {
    tables.clear()
    idCounters.clear()
  }

  const getTableData = (table: TableKey) => ensureTable(table).map((row) => clone(row))

  const seedRow = (table: TableKey, values: Record<string, any>) => {
    const record = { ...values }
    assignDefaults(table, record)
    ensureTable(table).push(record)
    return clone(record)
  }

  return {
    db,
    default: db,
    pool: null,
    query: undefined,
    getConnection: undefined,
    transaction: undefined,
    getMetrics: undefined,
    getStatus: undefined,
    __resetMockDb: reset,
    __getTableData: getTableData,
    __seedRow: seedRow
  }
})

const marketDataMocks = {
  getStockQuote: vi.fn(),
  getCompanyProfile: vi.fn(),
  getFinancialMetrics: vi.fn(),
  getHistoricalPrices: vi.fn()
}

vi.mock('../../lib/data-sources/market-data', () => marketDataMocks)

const openAiMocks = {
  generateBusinessResponse: vi.fn()
}

vi.mock('../../server/lib/openai', () => openAiMocks)

const dataIngestRouterModule = await import('../../server/routes/data-ingest')
const dataIngestRouter = dataIngestRouterModule.default
const aiCopilotRouterModule = await import('../../server/routes/ai-copilot')
const aiCopilotRouter = aiCopilotRouterModule.default

const schema = await import('../../lib/db/schema')
const { marketSnapshots, workspaceDataSnapshots, aiAuditLogs, workflows, workflowUsers } = schema

const dbModule = await import('../../lib/db')
const mockDb = dbModule.db as any
const resetMockDb = dbModule.__resetMockDb as () => void
const getTableData = dbModule.__getTableData as (table: any) => any[]
const seedRow = dbModule.__seedRow as (table: any, values: Record<string, any>) => any

const marketData = await import('../../lib/data-sources/market-data')
const openAi = await import('../../server/lib/openai')

const createTestApp = () => {
  const app = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))
  app.use('/api', dataIngestRouter)
  app.use('/api', aiCopilotRouter)
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    res.status(500).json({ error: message })
  })
  return app
}

const seedWorkspace = () => {
  const [user] = mockDb.insert(workflowUsers).values({ username: 'analyst', role: 'admin' }).returning()
  const [workspace] = mockDb
    .insert(workflows)
    .values({
      userId: user.id,
      name: 'Alpha Workspace',
      ticker: 'AAPL',
      companyName: 'Apple Inc.',
      description: 'Consumer electronics business',
      status: 'active'
    })
    .returning()
  return workspace
}

const mockMarketDataResponses = () => {
  marketData.getStockQuote.mockResolvedValue({
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 175.64,
    change: 1.23,
    changePercent: 0.7,
    volume: 1000000,
    marketCap: 3000000000,
    peRatio: 28.5,
    dividendYield: 0.006,
    high52Week: 190.12,
    low52Week: 140.2,
    currency: 'USD',
    exchange: 'NASDAQ'
  })

  marketData.getCompanyProfile.mockResolvedValue({
    symbol: 'AAPL',
    name: 'Apple Inc.',
    description: 'Designs consumer electronics and software',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    website: 'https://www.apple.com',
    employees: 160000,
    ceo: 'Tim Cook',
    founded: '1976'
  })

  marketData.getFinancialMetrics.mockResolvedValue({
    symbol: 'AAPL',
    marketCap: 3000000000,
    enterpriseValue: 2500000000,
    peRatio: 28.5,
    pbRatio: 45.1,
    priceToSales: 8.2,
    evToRevenue: 7.1,
    evToEbitda: 16.3,
    debtToEquity: 1.5,
    currentRatio: 1.0,
    returnOnEquity: 0.38,
    returnOnAssets: 0.19,
    profitMargin: 0.24
  })

  marketData.getHistoricalPrices.mockResolvedValue([
    {
      date: '2025-09-01',
      open: 170,
      high: 176,
      low: 169,
      close: 175.64,
      volume: 1000000,
      adjustedClose: 175.64
    }
  ])
}

describe('Market ingestion integration', () => {
  beforeEach(() => {
    resetMockDb()
    vi.clearAllMocks()
    mockMarketDataResponses()
  })

  it('stores market snapshot and links to workspace during refresh', async () => {
    const workspace = seedWorkspace()
    const app = createTestApp()

    const response = await request(app)
      .post('/api/data-ingest/market/refresh')
      .send({ ticker: 'AAPL', workspaceId: workspace.id })

    expect(response.status).toBe(201)
    expect(response.body.snapshot).toBeTruthy()
    expect(response.body.workspaceSnapshot).toBeTruthy()

    const snapshots = getTableData(marketSnapshots)
    expect(snapshots).toHaveLength(1)
    expect(snapshots[0]).toMatchObject({ ticker: 'AAPL', provider: 'yahoo' })

    const workspaceSnapshots = getTableData(workspaceDataSnapshots)
    expect(workspaceSnapshots).toHaveLength(1)
    expect(workspaceSnapshots[0]).toMatchObject({ workflowId: workspace.id, snapshotType: 'market-refresh' })
  })

  it('returns workspace snapshots ordered by newest first', async () => {
    const workspace = seedWorkspace()

    seedRow(workspaceDataSnapshots, {
      workflowId: workspace.id,
      snapshotType: 'market-refresh',
      marketSnapshotId: 1,
      data: { ticker: 'AAPL', price: 170 },
      createdAt: new Date('2025-09-01T10:00:00Z')
    })

    seedRow(workspaceDataSnapshots, {
      workflowId: workspace.id,
      snapshotType: 'market-refresh',
      marketSnapshotId: 2,
      data: { ticker: 'AAPL', price: 175 },
      createdAt: new Date('2025-09-02T10:00:00Z')
    })

    const app = createTestApp()
    const response = await request(app).get(`/api/data-ingest/workspaces/${workspace.id}/snapshots`)

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body.snapshots)).toBe(true)
    expect(response.body.count).toBe(2)
    expect(response.body.snapshots[0].data.price).toBe(175)
  })
})

describe('AI Copilot audit logging integration', () => {
  beforeEach(() => {
    resetMockDb()
    vi.clearAllMocks()
    openAi.generateBusinessResponse.mockResolvedValue({
      text: 'Here is your thesis outline',
      steps: ['Intro', 'Drivers', 'Valuation']
    })
  })

  it('records audit entry when workspaceId is provided', async () => {
    const workspace = seedWorkspace()
    const app = createTestApp()

    const response = await request(app)
      .post('/api/copilot')
      .send({
        prompt: 'Draft an investment memo outline',
        capability: 'generate',
        workspaceId: workspace.id
      })

    expect(response.status).toBe(200)
    expect(response.body.response).toMatchObject({ text: 'Here is your thesis outline' })

    const logs = getTableData(aiAuditLogs)
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({
      workflowId: workspace.id,
      capability: 'generate'
    })
    expect(logs[0].prompt).toMatchObject({ input: 'Draft an investment memo outline' })
    expect(logs[0].response).toMatchObject({ output: { text: 'Here is your thesis outline' } })
  })
})
