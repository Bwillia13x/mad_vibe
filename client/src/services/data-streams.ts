/**
 * Data Streams Service
 * Aggregates real-time market data, news, filings, and signals for idea generation
 */

export type DataStreamType = 
  | 'market-movers'
  | 'earnings-calendar'
  | 'sec-filings'
  | 'news-feed'
  | 'insider-activity'
  | 'analyst-updates'
  | 'unusual-volume'
  | 'sector-rotation'

export type MarketMover = {
  ticker: string
  company: string
  price: number
  change: number
  changePercent: number
  volume: number
  reason: string
  sector: string
}

export type EarningsEvent = {
  ticker: string
  company: string
  date: string
  time: 'BMO' | 'AMC' | 'TBD'
  consensus: {
    eps: number
    revenue: number
  }
  surprise?: {
    eps: number
    revenue: number
  }
}

export type SECFiling = {
  ticker: string
  company: string
  formType: '10-K' | '10-Q' | '8-K' | '13F' | '13D' | 'S-1' | 'DEF 14A'
  filedDate: string
  description: string
  url: string
  significance: 'high' | 'medium' | 'low'
}

export type NewsItem = {
  id: string
  headline: string
  summary: string
  source: string
  timestamp: string
  tickers: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  relevance: number
}

export type InsiderActivity = {
  ticker: string
  company: string
  insider: string
  title: string
  transactionType: 'buy' | 'sell'
  shares: number
  value: number
  date: string
  pricePerShare: number
}

export type AnalystUpdate = {
  ticker: string
  company: string
  firm: string
  analyst: string
  action: 'upgrade' | 'downgrade' | 'initiate' | 'reiterate'
  priorRating?: string
  newRating: string
  priorTarget?: number
  newTarget: number
  date: string
}

export type IdeaSpark = {
  id: string
  source: DataStreamType
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  tickers: string[]
  timestamp: string
  confidence: number
  tags: string[]
  data: unknown
}

/**
 * Data Stream Manager
 */
class DataStreamManager {
  private subscribers: Map<DataStreamType, Set<(data: unknown) => void>> = new Map()
  private cache: Map<DataStreamType, unknown[]> = new Map()

  /**
   * Subscribe to a data stream
   */
  subscribe(stream: DataStreamType, callback: (data: unknown) => void): () => void {
    if (!this.subscribers.has(stream)) {
      this.subscribers.set(stream, new Set())
    }
    this.subscribers.get(stream)!.add(callback)

    // Return unsubscribe function
    return () => {
      this.subscribers.get(stream)?.delete(callback)
    }
  }

  /**
   * Publish data to stream subscribers
   */
  private publish(stream: DataStreamType, data: unknown): void {
    const subs = this.subscribers.get(stream)
    if (subs) {
      subs.forEach(callback => callback(data))
    }
  }

  /**
   * Get cached data for a stream
   */
  getCached<T>(stream: DataStreamType): T[] {
    return (this.cache.get(stream) as T[]) || []
  }

  /**
   * Set cached data for a stream
   */
  private setCache(stream: DataStreamType, data: unknown[]): void {
    this.cache.set(stream, data)
  }

  /**
   * Fetch market movers
   */
  async fetchMarketMovers(): Promise<MarketMover[]> {
    // TODO: Replace with real API call
    const mockData: MarketMover[] = [
      {
        ticker: 'NVDA',
        company: 'NVIDIA Corporation',
        price: 495.20,
        change: 12.45,
        changePercent: 2.58,
        volume: 45000000,
        reason: 'Strong AI chip demand guidance',
        sector: 'Technology'
      },
      {
        ticker: 'META',
        company: 'Meta Platforms Inc',
        price: 505.30,
        change: -8.20,
        changePercent: -1.60,
        volume: 18000000,
        reason: 'Regulatory concerns in EU',
        sector: 'Technology'
      },
      {
        ticker: 'JPM',
        company: 'JPMorgan Chase & Co',
        price: 168.50,
        change: 5.30,
        changePercent: 3.25,
        volume: 12000000,
        reason: 'Better than expected earnings',
        sector: 'Financials'
      }
    ]

    this.setCache('market-movers', mockData)
    this.publish('market-movers', mockData)
    return mockData
  }

  /**
   * Fetch earnings calendar
   */
  async fetchEarningsCalendar(): Promise<EarningsEvent[]> {
    // TODO: Replace with real API call
    const mockData: EarningsEvent[] = [
      {
        ticker: 'AAPL',
        company: 'Apple Inc',
        date: '2025-10-01',
        time: 'AMC',
        consensus: { eps: 1.54, revenue: 89500000000 }
      },
      {
        ticker: 'GOOGL',
        company: 'Alphabet Inc',
        date: '2025-10-02',
        time: 'AMC',
        consensus: { eps: 1.85, revenue: 76200000000 }
      },
      {
        ticker: 'MSFT',
        company: 'Microsoft Corporation',
        date: '2025-10-03',
        time: 'AMC',
        consensus: { eps: 2.75, revenue: 56100000000 }
      }
    ]

    this.setCache('earnings-calendar', mockData)
    this.publish('earnings-calendar', mockData)
    return mockData
  }

  /**
   * Fetch recent SEC filings
   */
  async fetchSECFilings(): Promise<SECFiling[]> {
    // TODO: Replace with real API call (SEC EDGAR)
    const mockData: SECFiling[] = [
      {
        ticker: 'TSLA',
        company: 'Tesla Inc',
        formType: '8-K',
        filedDate: new Date().toISOString(),
        description: 'Material event disclosure - Production milestone reached',
        url: 'https://sec.gov/...',
        significance: 'high'
      },
      {
        ticker: 'AMZN',
        company: 'Amazon.com Inc',
        formType: '13F',
        filedDate: new Date(Date.now() - 86400000).toISOString(),
        description: 'Institutional holdings report',
        url: 'https://sec.gov/...',
        significance: 'medium'
      }
    ]

    this.setCache('sec-filings', mockData)
    this.publish('sec-filings', mockData)
    return mockData
  }

  /**
   * Fetch news feed
   */
  async fetchNews(): Promise<NewsItem[]> {
    // TODO: Replace with real news API
    const mockData: NewsItem[] = [
      {
        id: '1',
        headline: 'Fed signals potential rate cuts in Q4',
        summary: 'Federal Reserve hints at monetary policy shift amid cooling inflation',
        source: 'Bloomberg',
        timestamp: new Date().toISOString(),
        tickers: ['SPY', 'TLT'],
        sentiment: 'positive',
        relevance: 0.95
      },
      {
        id: '2',
        headline: 'Semiconductor shortage easing, says industry group',
        summary: 'Supply chain improvements noted across chip manufacturers',
        source: 'Reuters',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        tickers: ['NVDA', 'AMD', 'INTC'],
        sentiment: 'positive',
        relevance: 0.88
      },
      {
        id: '3',
        headline: 'Energy sector faces headwinds from renewable transition',
        summary: 'Traditional oil & gas companies announce climate initiatives',
        source: 'WSJ',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        tickers: ['XOM', 'CVX', 'COP'],
        sentiment: 'neutral',
        relevance: 0.75
      }
    ]

    this.setCache('news-feed', mockData)
    this.publish('news-feed', mockData)
    return mockData
  }

  /**
   * Generate idea sparks from data streams
   */
  async generateIdeaSparks(): Promise<IdeaSpark[]> {
    const movers = await this.fetchMarketMovers()
    const earnings = await this.fetchEarningsCalendar()
    const filings = await this.fetchSECFilings()
    const news = await this.fetchNews()

    const sparks: IdeaSpark[] = []

    // Generate sparks from market movers
    movers.filter(m => Math.abs(m.changePercent) > 2).forEach(mover => {
      sparks.push({
        id: `mover-${mover.ticker}`,
        source: 'market-movers',
        priority: Math.abs(mover.changePercent) > 5 ? 'high' : 'medium',
        title: `${mover.ticker} ${mover.changePercent > 0 ? 'surges' : 'drops'} ${Math.abs(mover.changePercent).toFixed(1)}%`,
        description: mover.reason,
        tickers: [mover.ticker],
        timestamp: new Date().toISOString(),
        confidence: 0.8,
        tags: [mover.sector, mover.changePercent > 0 ? 'momentum' : 'dip-buying'],
        data: mover
      })
    })

    // Generate sparks from upcoming earnings
    earnings.slice(0, 3).forEach(event => {
      sparks.push({
        id: `earnings-${event.ticker}`,
        source: 'earnings-calendar',
        priority: 'medium',
        title: `${event.ticker} reports earnings ${event.time}`,
        description: `Consensus: $${event.consensus.eps} EPS, $${(event.consensus.revenue / 1e9).toFixed(1)}B revenue`,
        tickers: [event.ticker],
        timestamp: event.date,
        confidence: 0.7,
        tags: ['earnings', 'catalyst'],
        data: event
      })
    })

    // Generate sparks from significant filings
    filings.filter(f => f.significance === 'high').forEach(filing => {
      sparks.push({
        id: `filing-${filing.ticker}-${filing.formType}`,
        source: 'sec-filings',
        priority: 'high',
        title: `${filing.ticker} files ${filing.formType}`,
        description: filing.description,
        tickers: [filing.ticker],
        timestamp: filing.filedDate,
        confidence: 0.85,
        tags: ['sec-filing', 'corporate-action'],
        data: filing
      })
    })

    // Generate sparks from high-relevance news
    news.filter(n => n.relevance > 0.8).forEach(item => {
      sparks.push({
        id: item.id,
        source: 'news-feed',
        priority: item.sentiment === 'positive' ? 'medium' : 'low',
        title: item.headline,
        description: item.summary,
        tickers: item.tickers,
        timestamp: item.timestamp,
        confidence: item.relevance,
        tags: [item.sentiment, 'news'],
        data: item
      })
    })

    return sparks.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }
}

export const dataStreamManager = new DataStreamManager()
