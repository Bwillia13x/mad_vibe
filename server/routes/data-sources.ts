import { Router } from 'express'
import { optionalAuth } from '../middleware/auth'
import {
  tickerToCik,
  getCompanyInfo,
  getRecentFilings,
  getLatest10K,
  getLatest10Q,
  getFilingUrl,
  getDocumentUrl,
  searchCompanies as searchEdgarCompanies
} from '../../lib/data-sources/sec-edgar'
import {
  getStockQuote,
  getHistoricalPrices,
  getCompanyProfile,
  getFinancialMetrics,
  getMarketPeers
} from '../../lib/data-sources/market-data'

const router = Router()
router.use(optionalAuth)

/**
 * SEC EDGAR endpoints
 */

// Get company info from SEC
router.get('/data-sources/sec/company/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params
    const info = await getCompanyInfo(ticker)

    if (!info) {
      return res.status(404).json({ error: 'Company not found in SEC database' })
    }

    res.json(info)
  } catch (error) {
    console.error('SEC company info error:', error)
    res.status(500).json({ error: 'Failed to fetch SEC company info' })
  }
})

// Get recent filings
router.get('/data-sources/sec/filings/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params
    const { form, limit } = req.query

    const filings = await getRecentFilings(
      ticker,
      form as '10-K' | '10-Q' | '8-K' | undefined,
      limit ? parseInt(limit as string) : 10
    )

    res.json({ filings, count: filings.length })
  } catch (error) {
    console.error('SEC filings error:', error)
    res.status(500).json({ error: 'Failed to fetch SEC filings' })
  }
})

// Get latest 10-K
router.get('/data-sources/sec/10k/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params
    const filing = await getLatest10K(ticker)

    if (!filing) {
      return res.status(404).json({ error: 'No 10-K filing found' })
    }

    // Get CIK for URLs
    const cik = await tickerToCik(ticker)
    const viewUrl = cik ? getFilingUrl(filing.accessionNumber, cik) : null
    const downloadUrl = cik
      ? getDocumentUrl(filing.accessionNumber, cik, filing.primaryDocument)
      : null

    res.json({
      filing,
      urls: {
        view: viewUrl,
        download: downloadUrl
      }
    })
  } catch (error) {
    console.error('SEC 10-K error:', error)
    res.status(500).json({ error: 'Failed to fetch 10-K' })
  }
})

// Get latest 10-Q
router.get('/data-sources/sec/10q/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params
    const filing = await getLatest10Q(ticker)

    if (!filing) {
      return res.status(404).json({ error: 'No 10-Q filing found' })
    }

    const cik = await tickerToCik(ticker)
    const viewUrl = cik ? getFilingUrl(filing.accessionNumber, cik) : null
    const downloadUrl = cik
      ? getDocumentUrl(filing.accessionNumber, cik, filing.primaryDocument)
      : null

    res.json({
      filing,
      urls: {
        view: viewUrl,
        download: downloadUrl
      }
    })
  } catch (error) {
    console.error('SEC 10-Q error:', error)
    res.status(500).json({ error: 'Failed to fetch 10-Q' })
  }
})

// Search SEC companies
router.get('/data-sources/sec/search', async (req, res) => {
  try {
    const { q } = req.query

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required' })
    }

    const results = await searchEdgarCompanies(q)
    res.json({ results, count: results.length })
  } catch (error) {
    console.error('SEC search error:', error)
    res.status(500).json({ error: 'Failed to search companies' })
  }
})

/**
 * Market Data endpoints
 */

// Get real-time quote
router.get('/data-sources/market/quote/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params
    const quote = await getStockQuote(ticker)

    if (!quote) {
      return res.status(404).json({ error: 'Stock quote not found' })
    }

    res.json(quote)
  } catch (error) {
    console.error('Market quote error:', error)
    res.status(500).json({ error: 'Failed to fetch stock quote' })
  }
})

// Get historical prices
router.get('/data-sources/market/history/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params
    const { start, end } = req.query

    const startDate = start
      ? new Date(start as string)
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 1 year ago
    const endDate = end ? new Date(end as string) : new Date()

    const prices = await getHistoricalPrices(ticker, startDate, endDate)
    res.json({ prices, count: prices.length })
  } catch (error) {
    console.error('Market history error:', error)
    res.status(500).json({ error: 'Failed to fetch historical prices' })
  }
})

// Get company profile
router.get('/data-sources/market/profile/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params
    const profile = await getCompanyProfile(ticker)

    if (!profile) {
      return res.status(404).json({ error: 'Company profile not found' })
    }

    res.json(profile)
  } catch (error) {
    console.error('Market profile error:', error)
    res.status(500).json({ error: 'Failed to fetch company profile' })
  }
})

// Get financial metrics
router.get('/data-sources/market/metrics/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params
    const metrics = await getFinancialMetrics(ticker)

    if (!metrics) {
      return res.status(404).json({ error: 'Financial metrics not found' })
    }

    res.json(metrics)
  } catch (error) {
    console.error('Market metrics error:', error)
    res.status(500).json({ error: 'Failed to fetch financial metrics' })
  }
})

// Combined endpoint: Get all data for a ticker
router.get('/data-sources/company/:ticker/all', async (req, res) => {
  try {
    const { ticker } = req.params

    // Fetch all data in parallel
    const [secInfo, latest10K, latest10Q, quote, profile, metrics] = await Promise.allSettled([
      getCompanyInfo(ticker),
      getLatest10K(ticker),
      getLatest10Q(ticker),
      getStockQuote(ticker),
      getCompanyProfile(ticker),
      getFinancialMetrics(ticker)
    ])

    res.json({
      ticker,
      sec: secInfo.status === 'fulfilled' ? secInfo.value : null,
      filings: {
        latest10K: latest10K.status === 'fulfilled' ? latest10K.value : null,
        latest10Q: latest10Q.status === 'fulfilled' ? latest10Q.value : null
      },
      market: {
        quote: quote.status === 'fulfilled' ? quote.value : null,
        profile: profile.status === 'fulfilled' ? profile.value : null,
        metrics: metrics.status === 'fulfilled' ? metrics.value : null
      }
    })
  } catch (error) {
    console.error('Combined data fetch error:', error)
    res.status(500).json({ error: 'Failed to fetch company data' })
  }
})

router.get('/data-sources/peers/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params
    const peers = await getMarketPeers(ticker)
    res.json({ peers })
  } catch (error) {
    console.error('Failed to fetch peers:', error)
    res.status(500).json({ error: 'Failed to fetch peer data' })
  }
})

export default router
