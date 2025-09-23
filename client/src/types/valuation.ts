/**
 * Shared types for valuation models and financial analysis
 */

export interface BaseFinancialMetric {
  id: string
  label: string
  value: number
  unit: string
  description?: string
}

export interface ValuationAssumption {
  id: string
  label: string
  description: string
  unit: string
  base: number
  bear: number
  bull: number
  sensitivity?: 'low' | 'medium' | 'high'
}

export interface ScenarioOutput {
  scenario: 'bear' | 'base' | 'bull'
  value: number
  irr?: number
  impliedMoS?: number
}

export interface MetricSummary {
  total: number
  average: number
  min: number
  max: number
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high'
  score: number
  factors: string[]
  recommendations: string[]
}

export interface ComparisonResult {
  subject: number
  peerAverage: number
  premiumDiscount: number
  ranking: 'top' | 'middle' | 'bottom'
}

export interface StatusIndicator {
  status: 'excellent' | 'good' | 'adequate' | 'poor' | 'critical'
  color: 'emerald' | 'blue' | 'amber' | 'orange' | 'red'
  message: string
}

export interface RegulatoryThreshold {
  minimum: number
  companyAction: number
  regulatoryAction: number
  mandatoryControl: number
}

export interface PortfolioMetric {
  current: number
  target: number
  variance: number
  confidence: number
}

export interface DataTableColumn<T = any> {
  key: keyof T
  title: string
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (value: any, record: T) => React.ReactNode
  sortable?: boolean
  format?: 'currency' | 'percentage' | 'ratio' | 'number'
  decimals?: number
}

export interface LoadingState {
  isLoading: boolean
  progress?: number
  message?: string
}

export interface ErrorState {
  hasError: boolean
  error?: Error
  retry?: () => void
}

// Specialized model interfaces
export interface REITProperty {
  id: string
  name: string
  type: 'office' | 'retail' | 'industrial' | 'residential' | 'hotel' | 'other'
  location: string
  squareFeet: number
  occupancy: number
  noi: number
  capRate: number
  appraisedValue: number
}

export interface BankAsset {
  category: string
  balance: number
  riskWeight: number
  rwa: number
  capitalRequired: number
}

export interface BankLiability {
  category: string
  balance: number
  tier: 'CET1' | 'AT1' | 'Tier2' | 'None'
  amount: number
}

export interface ReserveCategory {
  category: string
  reserves: number // MMBOE
  production: number // MBOE/day
  price: number // $/BOE
  costs: number // $/BOE
  discountRate: number // %
  pv10: number
}

export interface RBCComponent {
  category: string
  risk: string
  capitalRequired: number
  totalAdjustedCapital: number
}

export interface PeerCompany {
  name: string
  ticker: string
  price: number
  marketCap: number
  pe: number
  pb: number
  evEbitda: number
  roic: number
  fcfYield: number
  leverage: number
}

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
  selected: boolean
  matchReason?: string
}
