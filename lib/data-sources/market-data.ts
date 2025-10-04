/**
 * Market Data Integration
 * Fetches real-time and historical market data from the configured provider.
 *
 * Providers are pluggable; Yahoo Finance is the fallback when no API key is present.
 */

export interface StockQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap: number
  peRatio: number | null
  dividendYield: number | null
  high52Week: number | null
  low52Week: number | null
  currency: string
  exchange: string
}

export interface HistoricalPrice {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  adjustedClose: number
}

export interface PeerQuote {
  symbol: string
  name: string
  price: number
  changePercent: number
  marketCap: number
}

export interface CompanyProfile {
  symbol: string
  name: string
  description: string
  sector: string
  industry: string
  website: string
  employees: number | null
  ceo: string | null
  founded: string | null
}

export interface FinancialMetrics {
  symbol: string
  marketCap: number
  enterpriseValue: number
  peRatio: number | null
  pbRatio: number | null
  priceToSales: number | null
  evToRevenue: number | null
  evToEbitda: number | null
  debtToEquity: number | null
  currentRatio: number | null
  returnOnEquity: number | null
  returnOnAssets: number | null
  profitMargin: number | null
}

interface PolygonTickerDetails {
  name?: string
  ticker?: string
  market_cap?: number
  primary_exchange?: string
  locale?: string
  currency_name?: string
}

type MarketDataProviderName = 'yahoo' | 'polygon'

interface MarketDataProvider {
  name: MarketDataProviderName
  getQuote(ticker: string): Promise<StockQuote | null>
  getPeers?(ticker: string): Promise<PeerQuote[]>
  getHistoricalPrices?(ticker: string, startDate: Date, endDate: Date): Promise<HistoricalPrice[]>
}

interface FetchOptions {
  forceRefresh?: boolean
  cacheTtlMs?: number
}

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

class MarketDataCache {
  private store = new Map<string, CacheEntry<unknown>>()

  constructor(private readonly defaultTtlMs: number) {}

  getDefaultTtlMs() {
    return this.defaultTtlMs
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key)
      return undefined
    }
    return entry.value as T
  }

  set<T>(key: string, value: T, ttlMs?: number) {
    const ttl = ttlMs ?? this.defaultTtlMs
    if (ttl <= 0) {
      this.store.delete(key)
      return
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl
    })
  }

  delete(key: string) {
    this.store.delete(key)
  }
}

class RateLimiter {
  private readonly requests = new Map<string, number[]>()

  constructor(
    private readonly limit: number,
    private readonly intervalMs: number
  ) {}

  async schedule<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const now = Date.now()
    const existing = this.requests.get(key) ?? []
    const recent = existing.filter((timestamp) => now - timestamp < this.intervalMs)

    if (recent.length >= this.limit) {
      const earliest = recent[0]
      const waitTime = this.intervalMs - (now - earliest)
      await delay(waitTime)
      return this.schedule(key, fn)
    }

    recent.push(Date.now())
    this.requests.set(key, recent)

    return fn()
  }
}

const DEFAULT_CACHE_TTL_MS = 60_000
const DEFAULT_HISTORICAL_CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours
const cache = new MarketDataCache(DEFAULT_CACHE_TTL_MS)
const rateLimiter = new RateLimiter(4, 1000) // 4 requests per second per key

const YAHOO_FINANCE_API = 'https://query2.finance.yahoo.com'
const POLYGON_API = 'https://api.polygon.io'
const DEFAULT_PEER_GROUPS: Record<string, string[]> = {
  AAPL: ['MSFT', 'GOOGL', 'AMZN', 'NVDA'],
  MSFT: ['AAPL', 'GOOGL', 'CRM', 'ORCL'],
  GOOGL: ['META', 'AAPL', 'MSFT', 'AMZN'],
  AMZN: ['AAPL', 'MSFT', 'WMT', 'COST'],
  NVDA: ['AMD', 'AVGO', 'INTC', 'TSM'],
  META: ['GOOGL', 'SNAP', 'PINS', 'NFLX'],
  TSLA: ['GM', 'F', 'NIO', 'LCID']
}

const polygonDetailCache = new MarketDataCache(24 * 60 * 60 * 1000) // 24 hours

const yahooProvider: MarketDataProvider = {
  name: 'yahoo',
  async getQuote(ticker: string): Promise<StockQuote | null> {
    try {
      const response = await fetch(
        `${YAHOO_FINANCE_API}/v8/finance/chart/${ticker}?interval=1d&range=1d`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status}`)
      }

      const data = await response.json()
      const result = data.chart.result?.[0]
      if (!result) return null

      const meta = result.meta
      const quote = result.indicators.quote?.[0]
      if (!meta || !quote) return null

      const lastIdx = quote.close.length - 1
      const regularPrice = meta.regularMarketPrice ?? quote.close[lastIdx]
      const previousClose = meta.previousClose ?? quote.close[lastIdx - 1] ?? regularPrice

      return {
        symbol: meta.symbol,
        name: meta.longName || meta.symbol,
        price: regularPrice,
        change: regularPrice - previousClose,
        changePercent: previousClose ? ((regularPrice - previousClose) / previousClose) * 100 : 0,
        volume: quote.volume[lastIdx] || 0,
        marketCap: meta.marketCap ?? 0,
        peRatio: meta.trailingPE ?? null,
        dividendYield: meta.trailingAnnualDividendRate ?? null,
        high52Week: meta.fiftyTwoWeekHigh ?? null,
        low52Week: meta.fiftyTwoWeekLow ?? null,
        currency: meta.currency,
        exchange: meta.exchangeName
      }
    } catch (error) {
      console.error('Yahoo provider failed to get stock quote:', error)
      return null
    }
  },
  async getPeers(ticker: string): Promise<PeerQuote[]> {
    const normalized = ticker.toUpperCase()
    const peerSymbols = DEFAULT_PEER_GROUPS[normalized] || [normalized]

    const results = await Promise.all(
      peerSymbols.map(async (symbol) => {
        const quote = await yahooProvider.getQuote(symbol)
        if (!quote) return null

        return {
          symbol: quote.symbol,
          name: quote.name,
          price: quote.price,
          changePercent: quote.changePercent,
          marketCap: quote.marketCap
        } satisfies PeerQuote
      })
    )

    return results.filter((item): item is PeerQuote => item !== null)
  },
  async getHistoricalPrices(
    ticker: string,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalPrice[]> {
    try {
      const period1 = Math.floor(startDate.getTime() / 1000)
      const period2 = Math.floor(endDate.getTime() / 1000)

      const response = await fetch(
        `${YAHOO_FINANCE_API}/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=1d`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status}`)
      }

      const data = await response.json()
      const result = data.chart.result?.[0]
      if (!result) return []

      const timestamps = result.timestamp || []
      const quote = result.indicators.quote?.[0]
      if (!quote) return []

      const adjClose = result.indicators.adjclose?.[0]?.adjclose || quote.close

      const prices: HistoricalPrice[] = []

      for (let i = 0; i < timestamps.length; i++) {
        prices.push({
          date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
          open: quote.open[i] || 0,
          high: quote.high[i] || 0,
          low: quote.low[i] || 0,
          close: quote.close[i] || 0,
          volume: quote.volume[i] || 0,
          adjustedClose: adjClose[i] || quote.close[i] || 0
        })
      }

      return prices
    } catch (error) {
      console.error('Yahoo provider failed to get historical prices:', error)
      return []
    }
  }
}

const polygonProvider: MarketDataProvider = {
  name: 'polygon',
  async getQuote(ticker: string): Promise<StockQuote | null> {
    const apiKey = process.env.POLYGON_API_KEY
    if (!apiKey) {
      console.warn('POLYGON_API_KEY missing; falling back to Yahoo provider for quotes.')
      return yahooProvider.getQuote(ticker)
    }

    const symbol = ticker.toUpperCase()

    try {
      const aggResponse = await fetch(
        `${POLYGON_API}/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${apiKey}`
      )
      if (!aggResponse.ok) {
        throw new Error(`Polygon aggregate error: ${aggResponse.status}`)
      }

      const aggData = await aggResponse.json()
      const result = aggData.results?.[0]
      if (!result) return null

      const details = await getPolygonTickerDetails(symbol, apiKey)

      const close = result.c ?? result.o ?? 0
      const open = result.o ?? close
      const previousClose = result.pc ?? open
      const change = close - previousClose
      const changePercent = previousClose ? (change / previousClose) * 100 : 0

      return {
        symbol,
        name: details?.name ?? symbol,
        price: close,
        change,
        changePercent,
        volume: result.v ?? 0,
        marketCap: details?.market_cap ?? 0,
        peRatio: null,
        dividendYield: null,
        high52Week: null,
        low52Week: null,
        currency: details?.currency_name ?? 'USD',
        exchange: details?.primary_exchange ?? 'UNKNOWN'
      }
    } catch (error) {
      console.error('Polygon provider failed to get stock quote:', error)
      return yahooProvider.getQuote(ticker)
    }
  },
  async getPeers(ticker: string): Promise<PeerQuote[]> {
    // Polygon does not expose a simple peers endpoint; fall back to default mapping
    return yahooProvider.getPeers ? yahooProvider.getPeers(ticker) : []
  },
  async getHistoricalPrices(
    ticker: string,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalPrice[]> {
    const apiKey = process.env.POLYGON_API_KEY
    if (!apiKey) {
      return yahooProvider.getHistoricalPrices
        ? yahooProvider.getHistoricalPrices(ticker, startDate, endDate)
        : []
    }

    try {
      const from = formatDate(startDate)
      const to = formatDate(endDate)
      const response = await fetch(
        `${POLYGON_API}/v2/aggs/ticker/${ticker.toUpperCase()}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=5000&apiKey=${apiKey}`
      )

      if (!response.ok) {
        throw new Error(`Polygon historical data error: ${response.status}`)
      }

      const data = await response.json()
      const results = data.results || []

      return results.map((item: Record<string, number>) => ({
        date: new Date(item.t).toISOString().split('T')[0],
        open: item.o ?? 0,
        high: item.h ?? 0,
        low: item.l ?? 0,
        close: item.c ?? 0,
        volume: item.v ?? 0,
        adjustedClose: item.c ?? 0
      }))
    } catch (error) {
      console.error('Polygon provider failed to get historical prices:', error)
      return yahooProvider.getHistoricalPrices
        ? yahooProvider.getHistoricalPrices(ticker, startDate, endDate)
        : []
    }
  }
}

const providers: Record<MarketDataProviderName, MarketDataProvider> = {
  yahoo: yahooProvider,
  polygon: polygonProvider
}

const configuredProvider = resolveProvider()

export async function getStockQuote(
  ticker: string,
  options?: FetchOptions
): Promise<StockQuote | null> {
  const symbol = ticker.trim().toUpperCase()
  if (!symbol) return null

  return fetchWithCache(
    `quote:${symbol}`,
    `${configuredProvider.name}:quote`,
    () => configuredProvider.getQuote(symbol),
    options
  )
}

export async function getMarketPeers(ticker: string, options?: FetchOptions): Promise<PeerQuote[]> {
  const symbol = ticker.trim().toUpperCase()
  if (!symbol) return []

  const providerFn = configuredProvider.getPeers?.bind(configuredProvider)
  const fetcher = providerFn ? () => providerFn(symbol) : () => yahooProvider.getPeers!(symbol)

  return fetchWithCache(`peers:${symbol}`, `${configuredProvider.name}:peers`, fetcher, options)
}

export async function getHistoricalPrices(
  ticker: string,
  startDate: Date,
  endDate: Date = new Date(),
  options?: FetchOptions
): Promise<HistoricalPrice[]> {
  const symbol = ticker.trim().toUpperCase()
  if (!symbol) return []

  const providerFn = configuredProvider.getHistoricalPrices?.bind(configuredProvider)
  const fetcher = providerFn
    ? () => providerFn(symbol, startDate, endDate)
    : () => yahooProvider.getHistoricalPrices!(symbol, startDate, endDate)

  const cacheKey = `history:${symbol}:${formatDate(startDate)}:${formatDate(endDate)}`
  const cacheTtl = options?.cacheTtlMs ?? DEFAULT_HISTORICAL_CACHE_TTL_MS

  return fetchWithCache(cacheKey, `${configuredProvider.name}:history`, fetcher, {
    ...options,
    cacheTtlMs: cacheTtl
  })
}

function resolveProvider(): MarketDataProvider {
  const configured = (process.env.MARKET_DATA_PROVIDER || '').toLowerCase()
  if (configured === 'polygon') {
    const apiKey = process.env.POLYGON_API_KEY
    if (!apiKey) {
      console.warn(
        'MARKET_DATA_PROVIDER=polygon but POLYGON_API_KEY is missing. Falling back to Yahoo.'
      )
      return providers.yahoo
    }
    return providers.polygon
  }
  return providers.yahoo
}

async function fetchWithCache<T>(
  cacheKey: string,
  rateKey: string,
  fetcher: () => Promise<T>,
  options?: FetchOptions
): Promise<T> {
  if (!options?.forceRefresh) {
    const cached = cache.get<T>(cacheKey)
    if (cached !== undefined) {
      return cached
    }
  }

  const result = await rateLimiter.schedule(rateKey, fetcher)

  const ttlMs = options?.cacheTtlMs ?? cache.getDefaultTtlMs()
  if (options?.cacheTtlMs === 0) {
    cache.delete(cacheKey)
  } else {
    cache.set(cacheKey, result, ttlMs)
  }

  return result
}

async function getPolygonTickerDetails(
  ticker: string,
  apiKey: string
): Promise<PolygonTickerDetails | null> {
  const cacheKey = `polygon:ticker:${ticker}`
  const cached = polygonDetailCache.get<PolygonTickerDetails | null>(cacheKey)
  if (cached !== undefined) {
    return cached
  }

  try {
    const response = await fetch(`${POLYGON_API}/v3/reference/tickers/${ticker}?apiKey=${apiKey}`)
    if (!response.ok) {
      throw new Error(`Polygon ticker details error: ${response.status}`)
    }
    const data = await response.json()
    const details = (data?.results as PolygonTickerDetails) || null
    polygonDetailCache.set(cacheKey, details)
    return details
  } catch (error) {
    console.error('Failed to fetch Polygon ticker details:', error)
    polygonDetailCache.set(cacheKey, null)
    return null
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Get company profile/info
 */
export async function getCompanyProfile(ticker: string): Promise<CompanyProfile | null> {
  try {
    // Yahoo Finance summary endpoint
    const response = await fetch(
      `${YAHOO_FINANCE_API}/v10/finance/quoteSummary/${ticker}?modules=assetProfile,summaryProfile`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`)
    }

    const data = await response.json()
    const profile =
      data.quoteSummary.result[0].assetProfile || data.quoteSummary.result[0].summaryProfile

    return {
      symbol: ticker,
      name: profile.longName || ticker,
      description: profile.longBusinessSummary || '',
      sector: profile.sector || '',
      industry: profile.industry || '',
      website: profile.website || '',
      employees: profile.fullTimeEmployees || null,
      ceo: profile.companyOfficers?.[0]?.name || null,
      founded: profile.foundingDate || null
    }
  } catch (error) {
    console.error('Failed to get company profile:', error)
    return null
  }
}

/**
 * Get financial metrics/ratios
 */
export async function getFinancialMetrics(ticker: string): Promise<FinancialMetrics | null> {
  try {
    const response = await fetch(
      `${YAHOO_FINANCE_API}/v10/finance/quoteSummary/${ticker}?modules=defaultKeyStatistics,financialData`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`)
    }

    const data = await response.json()
    const stats = data.quoteSummary.result[0].defaultKeyStatistics
    const financial = data.quoteSummary.result[0].financialData

    return {
      symbol: ticker,
      marketCap: stats.marketCap?.raw || 0,
      enterpriseValue: stats.enterpriseValue?.raw || 0,
      peRatio: stats.forwardPE?.raw || stats.trailingPE?.raw || null,
      pbRatio: stats.priceToBook?.raw || null,
      priceToSales: stats.priceToSalesTrailing12Months?.raw || null,
      evToRevenue: stats.enterpriseToRevenue?.raw || null,
      evToEbitda: stats.enterpriseToEbitda?.raw || null,
      debtToEquity: financial.debtToEquity?.raw || null,
      currentRatio: financial.currentRatio?.raw || null,
      returnOnEquity: financial.returnOnEquity?.raw || null,
      returnOnAssets: financial.returnOnAssets?.raw || null,
      profitMargin: financial.profitMargins?.raw || null
    }
  } catch (error) {
    console.error('Failed to get financial metrics:', error)
    return null
  }
}

/**
 * Calculate simple technical indicators
 */
export function calculateSMA(prices: HistoricalPrice[], period: number): number[] {
  const sma: number[] = []

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(NaN)
      continue
    }

    let sum = 0
    for (let j = 0; j < period; j++) {
      sum += prices[i - j].close
    }
    sma.push(sum / period)
  }

  return sma
}

/**
 * Calculate returns
 */
export function calculateReturns(prices: HistoricalPrice[]): {
  daily: number[]
  cumulative: number[]
  totalReturn: number
} {
  const daily: number[] = []
  const cumulative: number[] = []

  for (let i = 1; i < prices.length; i++) {
    const ret =
      (prices[i].adjustedClose - prices[i - 1].adjustedClose) / prices[i - 1].adjustedClose
    daily.push(ret)

    const cumRet = (prices[i].adjustedClose - prices[0].adjustedClose) / prices[0].adjustedClose
    cumulative.push(cumRet)
  }

  const totalReturn =
    prices.length > 0
      ? (prices[prices.length - 1].adjustedClose - prices[0].adjustedClose) /
        prices[0].adjustedClose
      : 0

  return { daily, cumulative, totalReturn }
}

/**
 * Helper to format large numbers (market cap, etc.)
 */
export function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

/**
 * Helper to format percentage
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}
