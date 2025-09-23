import { useMemo, useState, useCallback } from 'react'

// Types for the Universe Screener
export interface ScreenerFilters {
  capMin: number
  capMax: number
  advMin: number
  roicMin: number
  fcfyMin: number
  ndMax: number
  include: Record<string, boolean>
  query: string
}

export interface ParsedQuery {
  roicMin: number
  fcfyMin: number
  ndMax: number
  netCash: boolean
  lowAccruals: boolean
  neglect: boolean
}

export interface MockData {
  t: string
  name: string
  exch: string
  mcap: number
  adv: number
  sector: string
  roic: number
  fcfy: number
  nd: number
  accruals: string
  f: number
  z: string
  m: string
  neglect: boolean
  coverage: number
  insider: number
  hooks: string[]
  moat?: number
  quality?: number
  hook?: number
}

interface UseUniverseScreenerReturn {
  // State
  filters: ScreenerFilters
  parsedQuery: ParsedQuery
  selected: Record<string, boolean>
  presetsOpen: boolean

  // Computed values
  filtered: (MockData & { moat: number; quality: number; hook: number })[]
  results: (MockData & { moat: number; quality: number; hook: number })[]
  selectedCount: number

  // Actions
  updateFilter: (key: keyof ScreenerFilters, value: any) => void
  toggleSelect: (ticker: string) => void
  togglePreset: () => void
  applyPreset: (name: string) => void
  handleQuerySubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

const MOCK: MockData[] = [
  {
    t: 'TKR',
    name: 'Tinker Robotics',
    exch: 'NASDAQ',
    mcap: 980,
    adv: 1200,
    sector: 'Industrial',
    roic: 14.2,
    fcfy: 6.3,
    nd: -0.1,
    accruals: 'low',
    f: 7,
    z: 'safe',
    m: 'ok',
    neglect: true,
    coverage: 1,
    insider: 18,
    hooks: ['cheap_vs_history', 'neglect', 'catalyst']
  },
  {
    t: 'ACME',
    name: 'Acme Components',
    exch: 'NYSE',
    mcap: 1650,
    adv: 2200,
    sector: 'Industrial',
    roic: 11.1,
    fcfy: 5.1,
    nd: 0.8,
    accruals: 'med',
    f: 6,
    z: 'gray',
    m: 'ok',
    neglect: false,
    coverage: 4,
    insider: 7,
    hooks: ['cheap_vs_peers']
  },
  {
    t: 'NTR',
    name: 'NutriAgri Micro',
    exch: 'OTCQX',
    mcap: 210,
    adv: 180,
    sector: 'Agri',
    roic: 9.8,
    fcfy: 7.2,
    nd: -0.2,
    accruals: 'low',
    f: 8,
    z: 'safe',
    m: 'ok',
    neglect: true,
    coverage: 0,
    insider: 26,
    hooks: ['neglect', 'complexity']
  },
  {
    t: 'VLT',
    name: 'VoltWare',
    exch: 'TSXV',
    mcap: 85,
    adv: 95,
    sector: 'Tech',
    roic: 8.6,
    fcfy: 4.8,
    nd: 1.4,
    accruals: 'med',
    f: 5,
    z: 'gray',
    m: 'watch',
    neglect: true,
    coverage: 0,
    insider: 22,
    hooks: ['complexity', 'catalyst']
  },
  {
    t: 'CML',
    name: 'ChemLogix',
    exch: 'NEO',
    mcap: 420,
    adv: 260,
    sector: 'Chem',
    roic: 16.5,
    fcfy: 9.1,
    nd: -0.5,
    accruals: 'low',
    f: 8,
    z: 'safe',
    m: 'ok',
    neglect: true,
    coverage: 1,
    insider: 15,
    hooks: ['cheap_vs_history', 'neglect']
  },
  {
    t: 'SHI',
    name: 'Shipyard Intl.',
    exch: 'NYSE',
    mcap: 1250,
    adv: 1400,
    sector: 'Transport',
    roic: 7.5,
    fcfy: 3.2,
    nd: 2.4,
    accruals: 'high',
    f: 3,
    z: 'risk',
    m: 'flag',
    neglect: false,
    coverage: 6,
    insider: 3,
    hooks: ['cyclical']
  },
  {
    t: 'MNF',
    name: 'MicroNifty',
    exch: 'OTCQB',
    mcap: 55,
    adv: 70,
    sector: 'Misc',
    roic: 10.2,
    fcfy: 5.6,
    nd: 0.0,
    accruals: 'low',
    f: 6,
    z: 'gray',
    m: 'ok',
    neglect: true,
    coverage: 0,
    insider: 28,
    hooks: ['neglect']
  }
]

export function useUniverseScreener(): UseUniverseScreenerReturn {
  // Filter state
  const [filters, setFilters] = useState<ScreenerFilters>({
    capMin: 50,
    capMax: 2000,
    advMin: 100,
    roicMin: 8,
    fcfyMin: 4,
    ndMax: 2,
    include: {
      NASDAQ: true,
      NYSE: true,
      AMEX: true,
      OTCQX: true,
      OTCQB: true,
      Pink: false,
      TSXV: true,
      NEO: true
    },
    query: ''
  })

  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [presetsOpen, setPresetsOpen] = useState(true)

  // Parse natural language query
  const parsedQuery = useMemo((): ParsedQuery => {
    const q = filters.query.toLowerCase()
    const p: ParsedQuery = {
      roicMin: filters.roicMin,
      fcfyMin: filters.fcfyMin,
      ndMax: filters.ndMax,
      netCash: false,
      lowAccruals: false,
      neglect: false
    }

    if (q.includes('net cash')) {
      p.netCash = true
    }
    const roicMatch = q.match(/roic\s*(?:>=|≥|\u2265|\u003e=)\s*(\d{1,2})/)
    if (roicMatch) p.roicMin = Math.max(filters.roicMin, parseFloat(roicMatch[1]))
    const fcfMatch = q.match(/fcf(?:\s*yield)?\s*(?:>=|≥|\u2265|\u003e=)\s*(\d{1,2})/)
    if (fcfMatch) p.fcfyMin = Math.max(filters.fcfyMin, parseFloat(fcfMatch[1]))
    if (q.includes('low accrual')) p.lowAccruals = true
    if (q.includes('neglect')) p.neglect = true

    return p
  }, [filters])

  // Filter companies based on criteria
  const filtered = useMemo(() => {
    return MOCK.filter((x: MockData) => {
      const exchValue = x.exch as keyof typeof filters.include
      if (!(filters.include[exchValue] ?? false)) return false
      if (x.mcap < filters.capMin || x.mcap > filters.capMax) return false
      if (x.adv < filters.advMin) return false

      const roicRule = x.roic >= (parsedQuery.roicMin ?? filters.roicMin)
      const fcfRule = x.fcfy >= (parsedQuery.fcfyMin ?? filters.fcfyMin)
      const ndRule = parsedQuery.netCash ? x.nd <= 0 : x.nd <= filters.ndMax
      const accrualRule = parsedQuery.lowAccruals ? x.accruals === 'low' : true
      const neglectRule = parsedQuery.neglect ? x.neglect === true : true

      return roicRule && fcfRule && ndRule && accrualRule && neglectRule
    }).map((x) => ({
      ...x,
      moat: Math.min(
        5,
        Math.round(
          ((x.insider >= 20 ? 1 : 0) +
            (x.neglect ? 1 : 0) +
            (x.hooks.includes('complexity') ? 1 : 0) +
            (x.roic > 12 ? 1 : 0)) *
            1.2
        )
      ),
      quality: Math.min(
        5,
        Math.round(
          (x.f >= 7 ? 1 : 0) +
            (x.z === 'safe' ? 1 : 0) +
            (x.accruals === 'low' ? 1 : 0) +
            (x.nd <= 1 ? 1 : 0) +
            (x.roic >= 10 ? 1 : 0)
        )
      ),
      hook: Math.min(5, Math.round((x.hooks?.length || 0) + (x.neglect ? 1 : 0)))
    }))
  }, [filters, parsedQuery])

  // Sort by composite score
  const results = useMemo(() => {
    return [...filtered].sort((a, b) => b.moat + b.quality + b.hook - (a.moat + a.quality + a.hook))
  }, [filtered])

  const selectedCount = Object.values(selected).filter(Boolean).length

  // Actions
  const updateFilter = useCallback((key: keyof ScreenerFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const toggleSelect = useCallback(
    (ticker: string) => {
      setSelected((prev) => {
        const next = { ...prev }
        const nextVal = !next[ticker]
        if (nextVal && selectedCount >= 5) return prev // enforce ≤5
        next[ticker] = nextVal
        return next
      })
    },
    [selectedCount]
  )

  const togglePreset = useCallback(() => {
    setPresetsOpen((prev) => !prev)
  }, [])

  const applyPreset = useCallback(
    (name: string) => {
      const presets = {
        'Small Value': {
          roicMin: 10,
          fcfyMin: 6,
          ndMax: 1.5,
          query: '',
          include: {
            ...filters.include,
            OTCQX: true,
            OTCQB: true,
            Pink: false,
            TSXV: true,
            NEO: true
          }
        },
        'Quality Value': { roicMin: 12, fcfyMin: 5, ndMax: 1, query: '' },
        'Neglect/Insider': { roicMin: 8, fcfyMin: 4, ndMax: 2, query: 'neglect insider net cash' },
        'Low Accruals': { query: 'low accruals roic≥10 fcf≥5' }
      }

      if (name in presets) {
        const preset = presets[name as keyof typeof presets]
        setFilters((prev) => ({ ...prev, ...preset }))
      }
    },
    [filters]
  )

  const handleQuerySubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!filters.query.trim()) return
      console.log('Processing NL query:', filters.query.trim())
    },
    [filters.query]
  )

  return {
    filters,
    parsedQuery,
    selected,
    presetsOpen,
    filtered,
    results,
    selectedCount,
    updateFilter,
    toggleSelect,
    togglePreset,
    applyPreset,
    handleQuerySubmit
  }
}
