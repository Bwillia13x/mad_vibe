import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { useScenarioLab } from '@/hooks/useScenarioLab'

// Types for the Red-Team Mode
export interface Critique {
  id: number
  playbook: string
  severity: 'High' | 'Med' | 'Low'
  claim: string
  rationale: string
  action: string
  decided: boolean | null
}

export interface ScanHit {
  id: string
  src: string
  excerpt: string
}

export interface VulnerabilityItem {
  id: string
  label: string
  completed: boolean
  playbook?: string
}

interface UseRedTeamReturn {
  // State
  artifact: string
  scope: string[]
  activePlaybooks: string[]
  critiques: Critique[]
  scanQuery: string
  scanHits: ScanHit[]
  vulnerabilityChecklist: VulnerabilityItem[]

  // Computed values
  coverage: number
  highOpen: number
  gateReady: boolean
  adversarialSim: {
    extremeDownside: number
    extremeUpside: number
    biasShift: string
  } | null
  error: string | null

  // Actions
  updateArtifact: (artifact: string) => void
  updateScope: (scope: string[]) => void
  togglePlaybook: (playbook: string) => void
  decideCritique: (id: number, decision: boolean) => void
  updateScanQuery: (query: string) => void
  toggleVulnerability: (id: string, completed: boolean) => void
  clearError: () => void
}

const INITIAL_CRITIQUES: Critique[] = [
  {
    id: 1,
    playbook: 'Steelman short',
    severity: 'High',
    claim: 'FCF durability overstated',
    rationale:
      '5‑yr capex under‑capitalized vs peer maintenance; lease renewals suggest higher sustaining capex.',
    action: 'Reduce steady‑state margin by 150 bps or justify with citations.',
    decided: null
  },
  {
    id: 2,
    playbook: 'Attack assumptions',
    severity: 'Med',
    claim: 'Competitive fade too slow',
    rationale: 'Top‑quartile ROIC likely invites entry; history shows fade to market in < 5y.',
    action: 'Increase fade speed; add sensitivity.',
    decided: null
  },
  {
    id: 3,
    playbook: 'Evidence contradiction',
    severity: 'Low',
    claim: 'Customer conc. risk minimized',
    rationale: '10‑K shows top‑3 customers 41% of rev; memo says "< 25%".',
    action: 'Fix memo and add mitigation plan.',
    decided: null
  }
]

const INITIAL_SCAN_HITS: ScanHit[] = [
  {
    id: '10K‑p42',
    src: '10‑K',
    excerpt: 'Major customers represented approximately 43% of revenue in FY24.'
  },
  {
    id: 'TR‑note',
    src: 'Transcript',
    excerpt: 'Management expects maintenance capex to normalize higher as leases renew.'
  }
]

export function useRedTeam(): UseRedTeamReturn {
  const [_version, setVersion] = useState(0)

  // Target state
  const [artifact, setArtifact] = useState('Valuation v3')
  const [scope, setScope] = useState<string[]>([
    'Assumptions',
    'Business Model',
    'Accounting',
    'Comps'
  ])

  // Playbook state
  const [activePlaybooks, setActivePlaybooks] = useState<string[]>([
    'Steelman short',
    'Attack assumptions',
    'Evidence contradiction'
  ])

  // Critique state
  const [critiques, setCritiques] = useState<Critique[]>(INITIAL_CRITIQUES)

  // Scan state
  const [scanQuery, setScanQuery] = useState('customer concentration OR lease renewal capex')
  const [scanHits, _setScanHits] = useState<ScanHit[]>(INITIAL_SCAN_HITS)

  // Vulnerability checklist state
  const [vulnerabilityChecklist, setVulnerabilityChecklist] = useState<VulnerabilityItem[]>([])

  // Stable reference for initial data to prevent recreations
  const _initialCritiquesRef = useRef(INITIAL_CRITIQUES)
  const _initialScanHitsRef = useRef(INITIAL_SCAN_HITS)

  // Error handling state
  const [error, setError] = useState<string | null>(null)

  const { state: scenarioState } = useScenarioLab()

  // Initialize local-only state on mount
  useEffect(() => {}, [])

  // Cleanup effect for memory optimization
  useEffect(() => {
    return () => {
      // Cleanup function to prevent memory leaks
      setError(null)
    }
  }, [])

  // Computed values
  // Generate vulnerability checklist from active playbooks and scope
  useEffect(() => {
    const items: VulnerabilityItem[] = []
    activePlaybooks.forEach((playbook) => {
      if (playbook === 'Attack assumptions') {
        items.push({ id: 'vuln-assump-margin', label: 'Stress test margin assumptions', completed: false, playbook })
        items.push({ id: 'vuln-assump-growth', label: 'Validate growth deceleration', completed: false, playbook })
      }
      if (playbook === 'Scenario adversary') {
        items.push({ id: 'vuln-scenario-tail', label: 'Simulate tail risk scenarios', completed: false, playbook })
      }
      if (scope.includes('Accounting')) {
        items.push({ id: 'vuln-accounting', label: 'Check for aggressive revenue recognition', completed: false })
      }
    })
    setVulnerabilityChecklist(items)
  }, [activePlaybooks, scope])

  const coverage = useMemo(() => {
    const decidedCount = critiques.filter((c) => c.decided !== null).length
    const vulnComplete = vulnerabilityChecklist.filter((v) => v.completed).length
    const totalVuln = Math.max(1, vulnerabilityChecklist.length)
    const critiquePct = (decidedCount / Math.max(1, critiques.length)) * 70
    const vulnPct = (vulnComplete / totalVuln) * 30
    return Math.round(critiquePct + vulnPct)
  }, [critiques, vulnerabilityChecklist])

  const highOpen = useMemo(() => {
    return critiques.filter((c) => c.severity === 'High' && c.decided === null).length
  }, [critiques])

  const gateReady = useMemo(() => {
    return coverage >= 80 && highOpen === 0
  }, [coverage, highOpen])

  // Helper simulateValue from useScenarioLab (inline for now)
  interface ScenarioStateLike { driverValues: Record<string, number>; iterations: number }
  const simulateValue = useCallback((state: ScenarioStateLike): number[] => {
    const { driverValues, iterations } = state
    const results: number[] = []
    for (let i = 0; i < iterations; i++) {
      const revenueGrowth = driverValues['driver-revenue-growth'] + (Math.random() - 0.5) * 2
      const margin = driverValues['driver-margin'] + (Math.random() - 0.5) * 1.5
      const multiple = driverValues['driver-multiple'] + (Math.random() - 0.5) * 1.2

      const cashFlow = 258 * (1 + revenueGrowth / 100) * (margin / 15)
      const terminalValue = cashFlow * multiple
      results.push(terminalValue / 100)
    }
    results.sort((a, b) => a - b)
    return results
  }, [])

  // Memoized actions with proper dependencies and error handling
  const updateArtifact = useCallback(async (newArtifact: string) => {
    try {
      if (!newArtifact || typeof newArtifact !== 'string') {
        throw new Error('Invalid artifact value')
      }
      setArtifact(newArtifact)
      setError(null)
      setVersion((v) => v + 1)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(message)
    }
  }, [])

  const updateScope = useCallback(async (newScope: string[]) => {
    try {
      if (!Array.isArray(newScope)) {
        throw new Error('Scope must be an array')
      }
      setScope(newScope)
      setError(null)
      setVersion((v) => v + 1)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(message)
    }
  }, [])

  const togglePlaybook = useCallback(async (playbook: string) => {
    try {
      if (!playbook || typeof playbook !== 'string') {
        throw new Error('Invalid playbook value')
      }
      const newPlaybooks = activePlaybooks.includes(playbook) ? activePlaybooks.filter((p) => p !== playbook) : [...activePlaybooks, playbook]
      setActivePlaybooks(newPlaybooks)
      setError(null)
      setVersion((v) => v + 1)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(message)
    }
  }, [activePlaybooks])

  const decideCritique = useCallback((id: number, decision: boolean) => {
    try {
      if (typeof id !== 'number' || typeof decision !== 'boolean') {
        throw new Error('Invalid critique decision parameters')
      }
      setCritiques((prev) => prev.map((c) => (c.id === id ? { ...c, decided: decision } : c)))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    }
  }, [])

  // Adversarial scenario simulation
  const adversarialSim = useMemo(() => {
    if (!activePlaybooks.includes('Scenario adversary') || !scenarioState) return null
    // Bias drivers for adversarial: shift to tails
    const biasedDrivers = {
      ...scenarioState.driverValues,
      'driver-revenue-growth': scenarioState.driverValues['driver-revenue-growth'] - 20, // Bearish
      'driver-margin': scenarioState.driverValues['driver-margin'] - 10,
      'driver-multiple': scenarioState.driverValues['driver-multiple'] - 2
    }
    const biasedState = { ...scenarioState, driverValues: biasedDrivers }
    const dist = simulateValue(biasedState) // Reuse from useScenarioLab
    const p05 = dist[Math.floor(0.05 * dist.length)]
    const p95 = dist[Math.floor(0.95 * dist.length)]
    return {
      extremeDownside: Number(p05.toFixed(2)),
      extremeUpside: Number(p95.toFixed(2)),
      biasShift: 'Bear-biased tails (revenue -20%, margin -10%, multiple -2x)'
    }
  }, [activePlaybooks, scenarioState, simulateValue])

  const updateScanQuery = useCallback((query: string) => {
    try {
      if (typeof query !== 'string') {
        throw new Error('Scan query must be a string')
      }
      setScanQuery(query)
      // In production, this would trigger a real scan
      console.log('Scan query updated:', query)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    }
  }, [])

  const toggleVulnerability = useCallback((id: string, completed: boolean) => {
    setVulnerabilityChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed } : item))
    )
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  

  return {
    artifact,
    scope,
    activePlaybooks,
    critiques,
    scanQuery,
    scanHits,
    vulnerabilityChecklist,
    coverage,
    highOpen,
    gateReady,
    adversarialSim,
    error,
    updateArtifact,
    updateScope,
    togglePlaybook,
    decideCritique,
    updateScanQuery,
    toggleVulnerability,
    clearError
  }
}
