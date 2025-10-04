import { useEffect, useState, useCallback } from 'react'
import {
  dataStreamManager,
  type DataStreamType,
  type IdeaSpark,
  type MarketMover,
  type EarningsEvent,
  type SECFiling,
  type NewsItem
} from '@/services/data-streams'

/**
 * Hook for accessing market data streams
 */
export function useDataStream<T>(stream: DataStreamType, autoFetch = true) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let result: unknown[] = []

      switch (stream) {
        case 'market-movers':
          result = await dataStreamManager.fetchMarketMovers()
          break
        case 'earnings-calendar':
          result = await dataStreamManager.fetchEarningsCalendar()
          break
        case 'sec-filings':
          result = await dataStreamManager.fetchSECFilings()
          break
        case 'news-feed':
          result = await dataStreamManager.fetchNews()
          break
        default:
          result = dataStreamManager.getCached(stream)
      }

      setData(result as T[])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'))
    } finally {
      setLoading(false)
    }
  }, [stream])

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchData()
    }
  }, [autoFetch, fetchData])

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = dataStreamManager.subscribe(stream, (newData) => {
      setData(newData as T[])
    })

    return unsubscribe
  }, [stream])

  return {
    data,
    loading,
    error,
    refresh: fetchData
  }
}

/**
 * Hook for idea generation sparks
 */
export function useIdeaSparks(autoGenerate = true) {
  const [sparks, setSparks] = useState<IdeaSpark[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const generate = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const generated = await dataStreamManager.generateIdeaSparks()
      setSparks(generated)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to generate ideas'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (autoGenerate) {
      generate()
    }
  }, [autoGenerate, generate])

  const dismissSpark = useCallback((id: string) => {
    setSparks((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const filterByTicker = useCallback(
    (ticker: string) => {
      return sparks.filter((s) => s.tickers.includes(ticker))
    },
    [sparks]
  )

  const filterByPriority = useCallback(
    (priority: 'high' | 'medium' | 'low') => {
      return sparks.filter((s) => s.priority === priority)
    },
    [sparks]
  )

  return {
    sparks,
    loading,
    error,
    generate,
    dismissSpark,
    filterByTicker,
    filterByPriority
  }
}

/**
 * Combined hook for home dashboard
 */
export function useHomeDashboard() {
  const marketMovers = useDataStream<MarketMover>('market-movers')
  const earnings = useDataStream<EarningsEvent>('earnings-calendar')
  const filings = useDataStream<SECFiling>('sec-filings')
  const news = useDataStream<NewsItem>('news-feed')
  const ideaSparks = useIdeaSparks()

  const refreshAll = useCallback(async () => {
    await Promise.all([
      marketMovers.refresh(),
      earnings.refresh(),
      filings.refresh(),
      news.refresh(),
      ideaSparks.generate()
    ])
  }, [marketMovers, earnings, filings, news, ideaSparks])

  return {
    marketMovers,
    earnings,
    filings,
    news,
    ideaSparks,
    refreshAll
  }
}
