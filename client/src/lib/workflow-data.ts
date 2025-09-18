export type DataSourceType = '10-K' | '10-Q' | 'Transcript' | 'Supplemental'

export interface DataSourceRecord {
  id: string
  name: string
  type: DataSourceType
  asOf: string
  coverage: number
  unmatchedLineItems: number
  footnoteCoverage: number
  status: 'ready' | 'review' | 'blocked'
}

export interface AdjustmentPreset {
  id: string
  label: string
  description: string
  impact: string
  defaultApplied: boolean
}

export interface HistoricalMetric {
  year: string
  revenue: number
  ebit: number
  depreciation: number
  capex: number
  workingCapital: number
  ownerEarnings: number
}

export interface OwnerEarningsBridgeSegment {
  id: string
  label: string
  description: string
  amount: number
  direction: 'add' | 'subtract'
}

export type ScenarioBand = 'bear' | 'base' | 'bull'

export interface ValuationAssumption {
  id: string
  label: string
  description: string
  unit: string
  base: number
  bear: number
  bull: number
  sensitivity?: string
}

export interface EPVOutput {
  id: string
  label: string
  value: number
  note?: string
}

export interface DCFScenarioOutput {
  band: ScenarioBand
  value: number
  irr: number
  impliedMoS: number
}

export interface MemoSectionTemplate {
  id: string
  title: string
  placeholder: string
  wordTarget: number
}

export interface MemoReviewPrompt {
  id: string
  question: string
  helper?: string
}

export interface MemoExhibit {
  id: string
  title: string
  summary: string
  sourceStage: string
  highlights: string[]
  defaultIncluded: boolean
}

export interface MonitoringThesisDelta {
  id: string
  metric: string
  status: 'on-track' | 'warning' | 'breach'
  description: string
  lastUpdate: string
  variance: number
}

export interface MonitoringLesson {
  id: string
  title: string
  insight: string
  recordedAt: string
}

export interface MonitoringAlert {
  id: string
  title: string
  severity: 'info' | 'warning' | 'critical'
  trigger: string
  owner?: string
  acknowledged: boolean
}

export interface ScenarioDriver {
  id: string
  label: string
  description: string
  unit: string
  base: number
  min: number
  max: number
  impact: 'revenue' | 'margin' | 'multiple'
}

export interface ScenarioPreset {
  id: string
  name: string
  description: string
  overrides: Record<string, number>
}

export const defaultDataSources: DataSourceRecord[] = [
  {
    id: 'ds-10k-fy24',
    name: 'FY24 Form 10-K',
    type: '10-K',
    asOf: '2024-12-31',
    coverage: 94,
    unmatchedLineItems: 3,
    footnoteCoverage: 88,
    status: 'review'
  },
  {
    id: 'ds-10q-q1',
    name: 'Q1 2025 Form 10-Q',
    type: '10-Q',
    asOf: '2025-03-31',
    coverage: 97,
    unmatchedLineItems: 1,
    footnoteCoverage: 92,
    status: 'ready'
  },
  {
    id: 'ds-transcript',
    name: 'Q1 2025 Earnings Call Transcript',
    type: 'Transcript',
    asOf: '2025-04-15',
    coverage: 82,
    unmatchedLineItems: 5,
    footnoteCoverage: 70,
    status: 'review'
  },
  {
    id: 'ds-supplemental',
    name: 'Operations Supplemental Tables',
    type: 'Supplemental',
    asOf: '2025-04-18',
    coverage: 76,
    unmatchedLineItems: 7,
    footnoteCoverage: 64,
    status: 'blocked'
  }
]

export const adjustmentPresets: AdjustmentPreset[] = [
  {
    id: 'adj-rd-capitalization',
    label: 'Capitalize R&D',
    description: 'Move 60% of R&D into capitalized intangibles with 3-year amortization.',
    impact: '+180 bps EBIT margin',
    defaultApplied: true
  },
  {
    id: 'adj-sbc-normalization',
    label: 'Normalize SBC',
    description: 'Strip stock-based compensation from owner earnings and add back cash tax effect.',
    impact: '+$12.4M owner earnings',
    defaultApplied: true
  },
  {
    id: 'adj-lease-adjustment',
    label: 'Lease Adjustment',
    description: 'Convert operating leases to capital leases to align leverage metrics.',
    impact: '+0.3x leverage',
    defaultApplied: false
  },
  {
    id: 'adj-one-time-charges',
    label: 'One-time Charges',
    description: 'Remove restructuring and integration expenses from FY24 base year.',
    impact: '+$8.1M EBITDA',
    defaultApplied: true
  }
]

export const DATA_NORMALIZATION_STORAGE_KEY = 'valor-data-normalization-state'

export interface DataNormalizationState {
  reconciledSources: Record<string, boolean>
  appliedAdjustments: Record<string, boolean>
}

export const defaultDataNormalizationState: DataNormalizationState = {
  reconciledSources: Object.fromEntries(defaultDataSources.map((source) => [source.id, source.status === 'ready'])),
  appliedAdjustments: Object.fromEntries(adjustmentPresets.map((preset) => [preset.id, preset.defaultApplied]))
}

export const getSourceStatusBadge = (status: DataSourceRecord['status']): { label: string; tone: 'ready' | 'review' | 'blocked' } => {
  switch (status) {
    case 'ready':
      return { label: 'Ready', tone: 'ready' }
    case 'review':
      return { label: 'Needs review', tone: 'review' }
    default:
      return { label: 'Blocked', tone: 'blocked' }
  }
}

export const historicalOwnerEarnings: HistoricalMetric[] = [
  {
    year: '2021',
    revenue: 1485,
    ebit: 212,
    depreciation: 46,
    capex: 72,
    workingCapital: -18,
    ownerEarnings: 168
  },
  {
    year: '2022',
    revenue: 1652,
    ebit: 241,
    depreciation: 54,
    capex: 81,
    workingCapital: -12,
    ownerEarnings: 202
  },
  {
    year: '2023',
    revenue: 1824,
    ebit: 267,
    depreciation: 63,
    capex: 94,
    workingCapital: -9,
    ownerEarnings: 227
  },
  {
    year: '2024',
    revenue: 1988,
    ebit: 296,
    depreciation: 70,
    capex: 102,
    workingCapital: -6,
    ownerEarnings: 258
  }
]

export const ownerEarningsBridge: OwnerEarningsBridgeSegment[] = [
  {
    id: 'bridge-ebit',
    label: 'EBIT',
    description: 'Starting point after adjustments applied',
    amount: 296,
    direction: 'add'
  },
  {
    id: 'bridge-taxes',
    label: 'Less: Cash taxes',
    description: 'Cash taxes assuming 21% normalized rate',
    amount: -62,
    direction: 'subtract'
  },
  {
    id: 'bridge-depr',
    label: 'Add: Depreciation & amortization',
    description: 'Non-cash charges added back',
    amount: 70,
    direction: 'add'
  },
  {
    id: 'bridge-capex',
    label: 'Less: Maintenance capex',
    description: 'Maintenance level estimated from history',
    amount: -88,
    direction: 'subtract'
  },
  {
    id: 'bridge-working-capital',
    label: 'Working capital change',
    description: 'Normalized to ongoing -0.6% of revenue',
    amount: -12,
    direction: 'subtract'
  },
  {
    id: 'bridge-other',
    label: 'Other adjustments',
    description: 'Non-recurring items removed (restructuring, SBC normalization)',
    amount: 54,
    direction: 'add'
  }
]

export const OWNER_EARNINGS_STORAGE_KEY = 'valor-owner-earnings-state'

export interface OwnerEarningsState {
  includeBridgeSegments: Record<string, boolean>
}

export const defaultOwnerEarningsState: OwnerEarningsState = {
  includeBridgeSegments: Object.fromEntries(ownerEarningsBridge.map((segment) => [segment.id, true]))
}

export const epvAssumptions: ValuationAssumption[] = [
  {
    id: 'epv-revenue',
    label: 'Normalized revenue',
    description: 'Trailing twelve month revenue after adjustments',
    unit: '$M',
    base: 1988,
    bear: 1890,
    bull: 2070
  },
  {
    id: 'epv-ebit-margin',
    label: 'EBIT margin',
    description: 'Steady-state EBIT margin after reinvestment needs',
    unit: '%',
    base: 15,
    bear: 13.5,
    bull: 16.5,
    sensitivity: 'High'
  },
  {
    id: 'epv-maintenance-capex',
    label: 'Maintenance capex',
    description: 'Annual maintenance capital expenditure as % revenue',
    unit: '%',
    base: 4.5,
    bear: 5.2,
    bull: 4.0
  },
  {
    id: 'epv-required-return',
    label: 'Required return',
    description: 'Investor required return for EPV discount rate',
    unit: '%',
    base: 9.5,
    bear: 10.5,
    bull: 8.5
  }
]

export const epvOutputs: EPVOutput[] = [
  {
    id: 'epv-owner-earnings',
    label: 'Owner earnings',
    value: 258,
    note: 'Aligned with normalized bridge'
  },
  {
    id: 'epv-capitalized',
    label: 'Capitalized value',
    value: 2716,
    note: 'Owner earnings / required return'
  },
  {
    id: 'epv-value-per-share',
    label: 'Value per share',
    value: 42.18,
    note: 'Using diluted shares outstanding'
  }
]

export const dcfScenarioOutputs: DCFScenarioOutput[] = [
  {
    band: 'bear',
    value: 36.5,
    irr: 8.9,
    impliedMoS: 12
  },
  {
    band: 'base',
    value: 47.8,
    irr: 12.7,
    impliedMoS: 28
  },
  {
    band: 'bull',
    value: 58.3,
    irr: 16.4,
    impliedMoS: 45
  }
]

export const memoSections: MemoSectionTemplate[] = [
  {
    id: 'memo-thesis',
    title: 'Investment Thesis',
    placeholder: 'Summarize the differentiated insight and key drivers in 3-4 bullet points.',
    wordTarget: 120
  },
  {
    id: 'memo-catalysts',
    title: 'Catalysts & Timeline',
    placeholder: 'List upcoming catalysts, expected timing, and what success looks like.',
    wordTarget: 100
  },
  {
    id: 'memo-risks',
    title: 'Variant Risks & Mitigations',
    placeholder: 'Document top risks, leading indicators, and mitigation playbooks.',
    wordTarget: 140
  },
  {
    id: 'memo-valuation',
    title: 'Valuation & MoS',
    placeholder: 'Walk through valuation triangulation and margin of safety.',
    wordTarget: 110
  }
]

export const memoReviewPrompts: MemoReviewPrompt[] = [
  {
    id: 'review-redteam',
    question: 'How would a smart bear attack this thesis?',
    helper: 'Identify the strongest counter-arguments and data that could prove them.'
  },
  {
    id: 'review-evidence',
    question: 'Are all claims linked to hard evidence?',
    helper: 'Cite filings, transcripts, or models for every assertion.'
  },
  {
    id: 'review-actions',
    question: 'What triggers start scaling or exit decisions?',
    helper: 'Tie actions to Monitoring alerts and Execution playbooks.'
  }
]

export const memoExhibits: MemoExhibit[] = [
  {
    id: 'exhibit-owner-earnings',
    title: 'Owner Earnings Bridge',
    summary: 'Reconciles reported EBIT to normalized owner earnings with adjustment rationale.',
    sourceStage: 'Financials → Owner Earnings',
    highlights: [
      'Normalized owner earnings: $258M',
      'Maintenance capex assumption: $88M',
      'Working capital drag: -$12M'
    ],
    defaultIncluded: true
  },
  {
    id: 'exhibit-valuation-triangulation',
    title: 'Valuation Triangulation',
    summary: 'Compares EPV output with DCF scenario range and implied margin of safety.',
    sourceStage: 'Valuation Workbench',
    highlights: [
      'EPV per share: $42.18',
      'DCF base case: $47.8 with 28% MoS',
      'Bull/bear spread: $58.3 / $36.5'
    ],
    defaultIncluded: true
  },
  {
    id: 'exhibit-scenario-distribution',
    title: 'Scenario Lab Distribution',
    summary: 'Monte Carlo distribution for per-share value and downside probability.',
    sourceStage: 'Scenario Lab',
    highlights: [
      'Expected value: $48.10',
      'P10 vs P90: $39.20 / $57.40',
      'Downside probability (<$40): 32%'
    ],
    defaultIncluded: false
  },
  {
    id: 'exhibit-monitoring-hooks',
    title: 'Monitoring Hooks',
    summary: 'Links thesis deltas and alerts to execution triggers.',
    sourceStage: 'Monitoring Dashboard',
    highlights: [
      'Pricing uplift breach flagged critical',
      'Enterprise churn warning escalation owner: Portfolio Committee',
      'Alert acknowledgements outstanding: 2'
    ],
    defaultIncluded: false
  }
]

export const monitoringDeltas: MonitoringThesisDelta[] = [
  {
    id: 'delta-owner-earnings',
    metric: 'Owner earnings',
    status: 'on-track',
    description: 'TTM owner earnings +6% YoY vs. +5% expectation',
    lastUpdate: '2025-09-14',
    variance: 1
  },
  {
    id: 'delta-churn',
    metric: 'Customer churn',
    status: 'warning',
    description: 'Enterprise churn 4.8% vs. 4.0% target due to onboarding backlog',
    lastUpdate: '2025-09-10',
    variance: -0.8
  },
  {
    id: 'delta-pricing',
    metric: 'Pricing uplift',
    status: 'breach',
    description: 'Q3 pricing uplift +1.1% vs. +2.5% plan—competitor discounting aggressive',
    lastUpdate: '2025-09-05',
    variance: -1.4
  }
]

export const monitoringAlerts: MonitoringAlert[] = [
  {
    id: 'alert-catalyst-transcript',
    title: 'Q3 transcript drop',
    severity: 'info',
    trigger: 'Upload Q3 transcript and diff verse prior guidance',
    owner: 'Sophia',
    acknowledged: false
  },
  {
    id: 'alert-pricing-review',
    title: 'Pricing underperformance',
    severity: 'warning',
    trigger: 'Hold go-deeper review with sales ops; update scenario assumptions',
    owner: 'Miguel',
    acknowledged: false
  },
  {
    id: 'alert-churn',
    title: 'Enterprise churn breach',
    severity: 'critical',
    trigger: 'Escalate to portfolio; consider trimming position 25% if next update negative',
    owner: 'Portfolio Committee',
    acknowledged: false
  }
]

export const monitoringLessons: MonitoringLesson[] = [
  {
    id: 'lesson-onboarding',
    title: 'Onboarding bottleneck mitigations',
    insight: 'When churn spiked, the fastest fix was a dedicated onboarding squad pulling from customer success.',
    recordedAt: '2025-08-20'
  },
  {
    id: 'lesson-pricing',
    title: 'Competitive discount response',
    insight: 'Differentiated add-ons justified holding price—positioning message mattered more than incentives.',
    recordedAt: '2025-07-18'
  }
]

export const scenarioDrivers: ScenarioDriver[] = [
  {
    id: 'driver-revenue-growth',
    label: 'Revenue growth CAGR',
    description: 'Compound annual growth in revenue over 5 years',
    unit: '%',
    base: 8,
    min: 2,
    max: 14,
    impact: 'revenue'
  },
  {
    id: 'driver-margin',
    label: 'EBIT margin',
    description: 'Normalized steady-state EBIT margin',
    unit: '%',
    base: 15,
    min: 11,
    max: 18,
    impact: 'margin'
  },
  {
    id: 'driver-multiple',
    label: 'Exit EBITDA multiple',
    description: 'Target exit multiple in year 5',
    unit: 'x',
    base: 12,
    min: 8,
    max: 16,
    impact: 'multiple'
  }
]

export const scenarioPresets: ScenarioPreset[] = [
  {
    id: 'preset-bear',
    name: 'Bear Case',
    description: 'Macro shock and slower adoption',
    overrides: {
      'driver-revenue-growth': 3,
      'driver-margin': 12,
      'driver-multiple': 9
    }
  },
  {
    id: 'preset-base',
    name: 'Base Case',
    description: 'Current plan with moderate execution risk',
    overrides: {
      'driver-revenue-growth': 8,
      'driver-margin': 15,
      'driver-multiple': 12
    }
  },
  {
    id: 'preset-bull',
    name: 'Bull Case',
    description: 'Share gains and stronger pricing power',
    overrides: {
      'driver-revenue-growth': 12,
      'driver-margin': 17,
      'driver-multiple': 15
    }
  }
]
