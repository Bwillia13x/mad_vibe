/**
 * SEC EDGAR Integration
 * Fetches company filings (10-K, 10-Q) from SEC EDGAR API
 *
 * API Docs: https://www.sec.gov/edgar/sec-api-documentation
 * No API key required, but must include User-Agent header
 */

interface EdgarCompanyInfo {
  cik: string
  entityType: string
  sic: string
  sicDescription: string
  name: string
  tickers: string[]
  exchanges: string[]
}

interface EdgarFiling {
  accessionNumber: string
  filingDate: string
  reportDate: string
  acceptanceDateTime: string
  act: string
  form: string
  fileNumber: string
  filmNumber: string
  items: string
  size: number
  isXBRL: number
  isInlineXBRL: number
  primaryDocument: string
  primaryDocDescription: string
}

interface EdgarFilingsResponse {
  name: string
  cik: string
  filings: {
    recent: {
      accessionNumber: string[]
      filingDate: string[]
      reportDate: string[]
      acceptanceDateTime: string[]
      act: string[]
      form: string[]
      fileNumber: string[]
      filmNumber: string[]
      items: string[]
      size: number[]
      isXBRL: number[]
      isInlineXBRL: number[]
      primaryDocument: string[]
      primaryDocDescription: string[]
    }
  }
}

const SEC_API_BASE = 'https://data.sec.gov'
const USER_AGENT = 'MAD Vibe IDE contact@madlab.com' // SEC requires contact info

/**
 * Convert ticker to CIK (Central Index Key)
 * SEC uses CIK for company identification
 */
export async function tickerToCik(ticker: string): Promise<string | null> {
  try {
    // SEC provides a JSON file with ticker to CIK mappings
    const response = await fetch(`${SEC_API_BASE}/files/company_tickers.json`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`SEC API error: ${response.status}`)
    }

    const data = await response.json()

    // Find ticker in the data (case insensitive)
    const tickerUpper = ticker.toUpperCase()
    for (const key in data) {
      const entry = data[key]
      if (entry.ticker?.toUpperCase() === tickerUpper) {
        // CIK needs to be padded to 10 digits
        return String(entry.cik_str).padStart(10, '0')
      }
    }

    return null
  } catch (error) {
    console.error('Failed to convert ticker to CIK:', error)
    return null
  }
}

/**
 * Get company information from SEC
 */
export async function getCompanyInfo(ticker: string): Promise<EdgarCompanyInfo | null> {
  try {
    const cik = await tickerToCik(ticker)
    if (!cik) return null

    const response = await fetch(`${SEC_API_BASE}/submissions/CIK${cik}.json`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`SEC API error: ${response.status}`)
    }

    const data = await response.json()

    return {
      cik: data.cik,
      entityType: data.entityType,
      sic: data.sic,
      sicDescription: data.sicDescription,
      name: data.name,
      tickers: data.tickers || [],
      exchanges: data.exchanges || []
    }
  } catch (error) {
    console.error('Failed to get company info:', error)
    return null
  }
}

/**
 * Get recent filings for a company
 */
export async function getRecentFilings(
  ticker: string,
  formType?: '10-K' | '10-Q' | '8-K',
  limit = 10
): Promise<EdgarFiling[]> {
  try {
    const cik = await tickerToCik(ticker)
    if (!cik) return []

    const response = await fetch(`${SEC_API_BASE}/submissions/CIK${cik}.json`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`SEC API error: ${response.status}`)
    }

    const data: EdgarFilingsResponse = await response.json()
    const recent = data.filings.recent

    // Transform array-based format to array of objects
    const filings: EdgarFiling[] = []
    const length = recent.accessionNumber.length

    for (let i = 0; i < Math.min(length, limit * 3); i++) {
      // Get more than needed in case we filter by type
      const form = recent.form[i]

      // Skip if form type specified and doesn't match
      if (formType && form !== formType) continue

      filings.push({
        accessionNumber: recent.accessionNumber[i],
        filingDate: recent.filingDate[i],
        reportDate: recent.reportDate[i],
        acceptanceDateTime: recent.acceptanceDateTime[i],
        act: recent.act[i],
        form: recent.form[i],
        fileNumber: recent.fileNumber[i],
        filmNumber: recent.filmNumber[i],
        items: recent.items[i],
        size: recent.size[i],
        isXBRL: recent.isXBRL[i],
        isInlineXBRL: recent.isInlineXBRL[i],
        primaryDocument: recent.primaryDocument[i],
        primaryDocDescription: recent.primaryDocDescription[i]
      })

      if (filings.length >= limit) break
    }

    return filings
  } catch (error) {
    console.error('Failed to get filings:', error)
    return []
  }
}

/**
 * Get the most recent 10-K filing
 */
export async function getLatest10K(ticker: string): Promise<EdgarFiling | null> {
  const filings = await getRecentFilings(ticker, '10-K', 1)
  return filings[0] || null
}

/**
 * Get the most recent 10-Q filing
 */
export async function getLatest10Q(ticker: string): Promise<EdgarFiling | null> {
  const filings = await getRecentFilings(ticker, '10-Q', 1)
  return filings[0] || null
}

/**
 * Get URL to view filing on SEC website
 */
export function getFilingUrl(accessionNumber: string, cik: string): string {
  // Remove dashes from accession number for URL
  const accessionNoSlash = accessionNumber.replace(/-/g, '')
  return `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/${accessionNoSlash}/${accessionNumber}-index.htm`
}

/**
 * Get URL to download primary document (usually HTML filing)
 */
export function getDocumentUrl(
  accessionNumber: string,
  cik: string,
  primaryDocument: string
): string {
  const accessionNoSlash = accessionNumber.replace(/-/g, '')
  return `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/${accessionNoSlash}/${primaryDocument}`
}

/**
 * Search for companies by name or ticker
 */
export async function searchCompanies(query: string): Promise<EdgarCompanyInfo[]> {
  try {
    const response = await fetch(`${SEC_API_BASE}/files/company_tickers.json`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`SEC API error: ${response.status}`)
    }

    const data = await response.json()
    const queryLower = query.toLowerCase()
    const results: EdgarCompanyInfo[] = []

    for (const key in data) {
      const entry = data[key]
      const ticker = entry.ticker?.toLowerCase() || ''
      const title = entry.title?.toLowerCase() || ''

      if (ticker.includes(queryLower) || title.includes(queryLower)) {
        results.push({
          cik: String(entry.cik_str).padStart(10, '0'),
          entityType: '',
          sic: '',
          sicDescription: '',
          name: entry.title,
          tickers: [entry.ticker],
          exchanges: []
        })

        if (results.length >= 20) break // Limit results
      }
    }

    return results
  } catch (error) {
    console.error('Failed to search companies:', error)
    return []
  }
}

/**
 * Helper to format filing date for display
 */
export function formatFilingDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
