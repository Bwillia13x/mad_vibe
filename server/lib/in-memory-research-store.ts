export interface ResearchScreenerCompany {
  id: number
  ticker: string
  name: string
  sector: string
  geo: string
  roic: number
  fcfYield: number
  leverage: number
  growthDurability: number
  insiderOwnership: number
  qualityScore: number
  moat: string
  accruals: number
  selected: boolean
  matchReason: string | null
}

const companies: ResearchScreenerCompany[] = [
  {
    id: 1,
    ticker: 'APCX',
    name: 'Atlas Precision Components',
    sector: 'Industrials',
    geo: 'North America',
    roic: 18.7,
    fcfYield: 6.8,
    leverage: 1.1,
    growthDurability: 0.74,
    insiderOwnership: 0.12,
    qualityScore: 86,
    moat: 'High switching costs in aerospace sensors',
    accruals: 0.8,
    selected: false,
    matchReason: 'Mission-critical supplier with durable aftermarket economics'
  },
  {
    id: 2,
    ticker: 'MRSY',
    name: 'Meridian Relay Systems',
    sector: 'Information Technology',
    geo: 'Global',
    roic: 21.3,
    fcfYield: 7.5,
    leverage: 0.9,
    growthDurability: 0.69,
    insiderOwnership: 0.09,
    qualityScore: 84,
    moat: 'Automation workflow platform with sticky integrations',
    accruals: 0.5,
    selected: false,
    matchReason: 'Sticky automation footprint; pricing tailwinds from backlog conversion'
  },
  {
    id: 3,
    ticker: 'CLAR',
    name: 'Clarion Capital Partners',
    sector: 'Financials',
    geo: 'North America',
    roic: 16.5,
    fcfYield: 6.2,
    leverage: 1.3,
    growthDurability: 0.65,
    insiderOwnership: 0.07,
    qualityScore: 79,
    moat: 'Capital allocator compounding book value via tuck-ins',
    accruals: 1.1,
    selected: false,
    matchReason: 'Disciplined capital rotation; governance review pending'
  },
  {
    id: 4,
    ticker: 'MERX',
    name: 'Meridian Express Logistics',
    sector: 'Industrials',
    geo: 'EMEA',
    roic: 14.8,
    fcfYield: 5.9,
    leverage: 1.4,
    growthDurability: 0.58,
    insiderOwnership: 0.15,
    qualityScore: 74,
    moat: 'Regional logistics network with scale benefits',
    accruals: 1.3,
    selected: false,
    matchReason: 'Improving route density; leverage trending below 1.5x in base plan'
  },
  {
    id: 5,
    ticker: 'LUMN',
    name: 'Lumenis Networks',
    sector: 'Communication Services',
    geo: 'North America',
    roic: 12.9,
    fcfYield: 8.1,
    leverage: 1.6,
    growthDurability: 0.45,
    insiderOwnership: 0.05,
    qualityScore: 68,
    moat: 'Optical networking spin-off with long-term contracts',
    accruals: 1.6,
    selected: false,
    matchReason: 'Asset-heavy deleveraging story; needs covenant headroom validation'
  }
]

export function getInMemoryScreenerCompanies(): ResearchScreenerCompany[] {
  return companies.map((company) => ({ ...company }))
}

interface ScreenerFilters {
  roicMin?: number
  fcfYieldMin?: number
  leverageMax?: number
  sector?: string
  geo?: string
}

interface ScreenerResult {
  companies: ResearchScreenerCompany[]
  averageROIC: number
  averageFCFYield: number
  averageLeverage: number
}

export function runInMemoryScreenerQuery(filters: ScreenerFilters): ScreenerResult {
  const matches = companies.filter((company) => {
    if (filters.roicMin !== undefined && company.roic < filters.roicMin) return false
    if (filters.fcfYieldMin !== undefined && company.fcfYield < filters.fcfYieldMin) return false
    if (filters.leverageMax !== undefined && company.leverage > filters.leverageMax) return false
    if (filters.sector && company.sector.toLowerCase() !== filters.sector.toLowerCase())
      return false
    if (filters.geo && company.geo.toLowerCase() !== filters.geo.toLowerCase()) return false
    return true
  })

  const selectedCompanies = matches.length > 0 ? matches : companies

  const totals = selectedCompanies.reduce(
    (acc, company) => {
      acc.roic += company.roic
      acc.fcfYield += company.fcfYield
      acc.leverage += company.leverage
      return acc
    },
    { roic: 0, fcfYield: 0, leverage: 0 }
  )

  const divisor = selectedCompanies.length || 1

  return {
    companies: selectedCompanies.map((company) => ({ ...company })),
    averageROIC: totals.roic / divisor,
    averageFCFYield: totals.fcfYield / divisor,
    averageLeverage: totals.leverage / divisor
  }
}
