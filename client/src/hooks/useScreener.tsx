import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export interface ScreenerCompany {
  id: string
  ticker: string
  name: string
  sector: string
  roic: number
  fcfYield: number
  leverage: number
  growthDurability: number
  insiderOwnership: number
  qualityScore: number
  moat: string
  geo: string
  accruals: number
  selected: boolean
  matchReason?: string
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

export interface QueryHistory {
  text: string
  timestamp: string
  results: number
}

interface FactorAnalysis {
  factor: string
  description: string
  weight: number
  correlation: number
  predictivePower: number
  stability: number
}

interface FactorBacktest {
  factor: string
  period: string
  return: number
  sharpe: number
  maxDrawdown: number
  winRate: number
}

interface ScreenerContextValue {
  companies: ScreenerCompany[]
  selectedCompanies: string[]
  toggleCompany: (companyId: string) => void
  saveScreener: () => void
  naturalLanguageQuery: string
  setNaturalLanguageQuery: (query: string) => void
  executeNLQuery: (query: string) => Promise<void>
  queryResults: NLQueryResult | null
  queryHistory: QueryHistory[]
  factorAnalysis: FactorAnalysis[]
  runFactorBacktest: (factor: string, period: string) => Promise<void>
  factorBacktests: FactorBacktest[]
  isLoading: boolean
  error: string | null
}

const ScreenerContext = createContext<ScreenerContextValue | undefined>(undefined)

function qualityScore({
  roic,
  fcfYield,
  accruals
}: {
  roic: number
  fcfYield: number
  accruals: number
}) {
  const s = roic * 2 + fcfYield * 5 - accruals * 1.5
  return Math.max(0, Math.min(100, Math.round(s)))
}

const mockFactorAnalysis: FactorAnalysis[] = [
  {
    factor: 'ROIC',
    description: 'Return on Invested Capital',
    weight: 25,
    correlation: 0.68,
    predictivePower: 85,
    stability: 92
  },
  {
    factor: 'FCF Yield',
    description: 'Free Cash Flow Yield',
    weight: 20,
    correlation: 0.52,
    predictivePower: 78,
    stability: 88
  },
  {
    factor: 'Leverage',
    description: 'Debt-to-Equity Ratio',
    weight: 15,
    correlation: -0.34,
    predictivePower: 65,
    stability: 76
  },
  {
    factor: 'Growth Durability',
    description: 'Revenue Growth Consistency',
    weight: 15,
    correlation: 0.41,
    predictivePower: 72,
    stability: 69
  },
  {
    factor: 'Insider Ownership',
    description: 'Management Ownership %',
    weight: 10,
    correlation: 0.23,
    predictivePower: 58,
    stability: 81
  },
  {
    factor: 'Earnings Quality',
    description: 'Accounting Quality Score',
    weight: 8,
    correlation: 0.45,
    predictivePower: 71,
    stability: 74
  },
  {
    factor: 'Capital Allocation',
    description: 'Capital Return Efficiency',
    weight: 7,
    correlation: 0.38,
    predictivePower: 67,
    stability: 78
  }
]

export function ScreenerProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const companiesQuery = useQuery({
    queryKey: ['screener', 'companies'],
    queryFn: async () => {
      const response = await fetch('/api/screener/companies')
      if (!response.ok) {
        throw new Error('Failed to fetch companies')
      }
      return response.json() as Promise<ScreenerCompany[]>
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3
  })

  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState('')
  const [queryResults, setQueryResults] = useState<NLQueryResult | null>(null)
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([])
  const [factorBacktests, setFactorBacktests] = useState<FactorBacktest[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const companies = companiesQuery.data ?? []

  const toggleCompany = useCallback(
    (companyId: string) => {
      setSelectedCompanies((prev) =>
        prev.includes(companyId) ? prev.filter((id) => id !== companyId) : [...prev, companyId]
      )

      // Optimistically update selected in companies if data is available
      if (companiesQuery.data) {
        queryClient.setQueryData(
          ['screener', 'companies'],
          (old: ScreenerCompany[] | undefined) =>
            old?.map((company) =>
              company.id === companyId ? { ...company, selected: !company.selected } : company
            ) ?? []
        )
      }
    },
    [companiesQuery.data, queryClient]
  )

  const saveScreener = useCallback(() => {
    const selectedCount = selectedCompanies.length
    console.log(`Saved screener with ${selectedCount} companies selected`)
    // Here you would typically save to a backend or localStorage
  }, [selectedCompanies.length])

  const executeNLQuery = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setError('Query cannot be empty')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Mock AI processing - in real implementation, this would call GPT-5 or similar
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Mock results based on query parsing
        const mockResults: NLQueryResult = {
          companies: companies.slice(0, 8), // Return first 8 companies as mock results
          averageROIC: 22.1,
          averageFCFYield: 3.2,
          averageLeverage: 0.7
        }

        setQueryResults(mockResults)
        setQueryHistory((prev) =>
          [
            {
              text: query,
              timestamp,
              results: mockResults.companies.length
            },
            ...prev
          ].slice(0, 10)
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to execute query')
        console.error('Query execution error:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [companies]
  )

  const runFactorBacktest = useCallback(async (factor: string, period: string) => {
    if (!factor.trim()) {
      setError('Factor cannot be empty')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Mock backtest execution
      const mockResults: FactorBacktest[] = [
        {
          factor,
          period,
          return: Math.random() * 20 - 5, // -5% to 15% range
          sharpe: Math.random() * 1.5 + 0.5, // 0.5 to 2.0 range
          maxDrawdown: Math.random() * 15 + 5, // 5% to 20% range
          winRate: Math.random() * 40 + 50 // 50% to 90% range
        }
      ]

      setFactorBacktests((prev) => [...prev, ...mockResults])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run backtest')
      console.error('Backtest execution error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const value: ScreenerContextValue = {
    companies,
    selectedCompanies,
    toggleCompany,
    saveScreener,
    naturalLanguageQuery,
    setNaturalLanguageQuery,
    executeNLQuery,
    queryResults,
    queryHistory,
    factorAnalysis: mockFactorAnalysis,
    runFactorBacktest,
    factorBacktests,
    isLoading: isLoading || companiesQuery.isLoading,
    error: error || companiesQuery.error?.message || null
  }

  return <ScreenerContext.Provider value={value}>{children}</ScreenerContext.Provider>
}

export function useScreener(): ScreenerContextValue {
  const context = useContext(ScreenerContext)
  if (!context) {
    throw new Error('useScreener must be used within a ScreenerProvider')
  }
  return context
}
