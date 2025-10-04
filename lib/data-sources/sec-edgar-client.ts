/**
 * SEC Edgar API Client
 * Provides rate-limited access to SEC EDGAR filing system
 * Rate limit: 10 requests per second per https://www.sec.gov/os/accessing-edgar-data
 */

import { log } from '../log'

export interface EdgarFiling {
  cik: string
  accessionNumber: string
  filingDate: string
  reportDate: string
  formType: '10-K' | '10-Q' | '8-K' | 'DEF 14A'
  fileUrl: string
  primaryDocument: string
}

export interface CompanyInfo {
  cik: string
  name: string
  ticker: string
  sic: string
  sicDescription: string
}

export class SecEdgarClient {
  private baseUrl = 'https://data.sec.gov'
  private userAgent: string
  private requestQueue: Promise<void> = Promise.resolve()
  private requestDelay = 150 // 150ms = ~6-7 req/sec (well within 10 req/sec limit)
  private lastRequestTime = 0

  constructor(userAgent?: string) {
    // SEC requires a descriptive User-Agent with contact info
    this.userAgent = userAgent || 'MAD Vibe Research Platform contact@example.com'
  }

  /**
   * Rate limit requests to comply with SEC guidelines
   */
  private async rateLimit<T>(fn: () => Promise<T>): Promise<T> {
    // Wait for previous request to complete
    await this.requestQueue

    // Ensure minimum delay between requests
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay - timeSinceLastRequest))
    }

    this.lastRequestTime = Date.now()

    // Execute the request
    return fn()
  }

  /**
   * Get company information by ticker
   */
  async getCompanyInfo(ticker: string): Promise<CompanyInfo | null> {
    return this.rateLimit(async () => {
      try {
        // SEC ticker lookup via company tickers JSON
        const response = await fetch(`${this.baseUrl}/files/company_tickers.json`, {
          headers: { 'User-Agent': this.userAgent }
        })

        if (!response.ok) {
          log('SEC EDGAR company lookup failed', { ticker, status: response.status })
          return null
        }

        const data = await response.json()
        
        // Find company by ticker
        const entry = Object.values(data).find(
          (company: any) => company.ticker?.toUpperCase() === ticker.toUpperCase()
        ) as any

        if (!entry) {
          log('Company not found in SEC database', { ticker })
          return null
        }

        return {
          cik: String(entry.cik_str).padStart(10, '0'),
          name: entry.title,
          ticker: entry.ticker,
          sic: String(entry.sic || ''),
          sicDescription: ''
        }
      } catch (error) {
        log('Error fetching company info', { 
          ticker, 
          error: error instanceof Error ? error.message : String(error) 
        })
        return null
      }
    })
  }

  /**
   * Get recent filings for a company
   */
  async getCompanyFilings(
    cik: string, 
    formType?: '10-K' | '10-Q' | '8-K'
  ): Promise<EdgarFiling[]> {
    return this.rateLimit(async () => {
      try {
        const paddedCik = cik.padStart(10, '0')
        const response = await fetch(
          `${this.baseUrl}/submissions/CIK${paddedCik}.json`,
          { headers: { 'User-Agent': this.userAgent } }
        )

        if (!response.ok) {
          throw new Error(`SEC EDGAR API error: ${response.status}`)
        }

        const data = await response.json()
        return this.parseFilings(data, formType)
      } catch (error) {
        log('Error fetching company filings', { 
          cik, 
          error: error instanceof Error ? error.message : String(error) 
        })
        return []
      }
    })
  }

  /**
   * Download filing document
   */
  async downloadFiling(filing: EdgarFiling): Promise<string | null> {
    return this.rateLimit(async () => {
      try {
        const response = await fetch(filing.fileUrl, {
          headers: { 'User-Agent': this.userAgent }
        })

        if (!response.ok) {
          throw new Error(`Failed to download filing: ${response.status}`)
        }

        return await response.text()
      } catch (error) {
        log('Error downloading filing', {
          accessionNumber: filing.accessionNumber,
          error: error instanceof Error ? error.message : String(error)
        })
        return null
      }
    })
  }

  /**
   * Get latest filing of specific type
   */
  async getLatestFiling(
    ticker: string, 
    formType: '10-K' | '10-Q'
  ): Promise<EdgarFiling | null> {
    try {
      // First get company info to get CIK
      const companyInfo = await this.getCompanyInfo(ticker)
      if (!companyInfo) {
        return null
      }

      // Get filings
      const filings = await this.getCompanyFilings(companyInfo.cik, formType)
      
      // Return most recent filing
      return filings.length > 0 ? filings[0] : null
    } catch (error) {
      log('Error getting latest filing', {
        ticker,
        formType,
        error: error instanceof Error ? error.message : String(error)
      })
      return null
    }
  }

  /**
   * Parse SEC filing response into structured format
   */
  private parseFilings(data: any, formType?: string): EdgarFiling[] {
    if (!data.filings || !data.filings.recent) {
      return []
    }

    const recent = data.filings.recent
    const filings: EdgarFiling[] = []

    for (let i = 0; i < recent.form.length; i++) {
      const form = recent.form[i]
      
      // Filter by form type if specified
      if (formType && form !== formType) {
        continue
      }

      const accessionNumber = recent.accessionNumber[i].replace(/-/g, '')
      const primaryDocument = recent.primaryDocument[i]

      filings.push({
        cik: String(data.cik).padStart(10, '0'),
        accessionNumber: recent.accessionNumber[i],
        filingDate: recent.filingDate[i],
        reportDate: recent.reportDate[i] || recent.filingDate[i],
        formType: form as '10-K' | '10-Q' | '8-K',
        fileUrl: `${this.baseUrl}/Archives/edgar/data/${data.cik}/${accessionNumber}/${primaryDocument}`,
        primaryDocument
      })
    }

    // Sort by filing date descending (most recent first)
    return filings.sort((a, b) => 
      new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime()
    )
  }
}

// Export singleton instance
export const secEdgarClient = new SecEdgarClient()
