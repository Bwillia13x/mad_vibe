import { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react'
import { scenarioDrivers, scenarioPresets } from '@/lib/workflow-data'

const SCENARIO_STORAGE_KEY = 'valor-scenario-lab-state'

interface ScenarioState {
  driverValues: Record<string, number>
  iterations: number
}

interface ScenarioLabContextValue {
  drivers: typeof scenarioDrivers
  presets: typeof scenarioPresets
  state: ScenarioState
  applyPreset: (id: string) => void
  updateDriver: (id: string, value: number) => void
  setIterations: (count: number) => void
  simulation: {
    meanValue: number
    p10: number
    p90: number
    downsideProbability: number
  }
}

const defaultState: ScenarioState = {
  driverValues: Object.fromEntries(scenarioDrivers.map((driver) => [driver.id, driver.base])),
  iterations: 500
}

const ScenarioLabContext = createContext<ScenarioLabContextValue | undefined>(undefined)

const loadState = async (): Promise<ScenarioState> => {
  if (typeof window === 'undefined') return defaultState
  try {
    const raw = window.localStorage.getItem(SCENARIO_STORAGE_KEY)
    if (!raw) return defaultState
    const parsed = JSON.parse(raw) as ScenarioState
    return {
      driverValues: { ...defaultState.driverValues, ...parsed.driverValues },
      iterations: parsed.iterations ?? defaultState.iterations
    }
  } catch {
    return defaultState
  }
}

function simulateValue(state: ScenarioState): number[] {
  const { driverValues, iterations } = state
  const results: number[] = []
  for (let i = 0; i < iterations; i++) {
    const revenueGrowth = driverValues['driver-revenue-growth'] + (Math.random() - 0.5) * 2
    const margin = driverValues['driver-margin'] + (Math.random() - 0.5) * 1.5
    const multiple = driverValues['driver-multiple'] + (Math.random() - 0.5) * 1.2

    const cashFlow = 258 * (1 + revenueGrowth / 100) * (margin / 15)
    const terminalValue = cashFlow * multiple
    results.push(terminalValue / 100) // simplified per-share proxy
  }
  results.sort((a, b) => a - b)
  return results
}

export function ScenarioLabProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ScenarioState>(defaultState)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadState().then(loadedState => {
      setState(loadedState)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (loading) return
    const timer = setTimeout(() => {
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(state))
        }
      } catch (err) {
        console.warn('Failed to persist scenario lab state locally', err)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [state, loading])

  const applyPreset = useCallback((id: string) => {
    const preset = scenarioPresets.find((entry) => entry.id === id)
    if (!preset) return
    setState((prev) => ({
      ...prev,
      driverValues: {
        ...prev.driverValues,
        ...preset.overrides
      }
    }))
  }, [])

  const updateDriver = useCallback((id: string, value: number) => {
    setState((prev) => ({
      ...prev,
      driverValues: {
        ...prev.driverValues,
        [id]: value
      }
    }))
  }, [])

  const setIterations = useCallback((count: number) => {
    setState((prev) => ({
      ...prev,
      iterations: count
    }))
  }, [])

  const distribution = useMemo(() => simulateValue(state), [state])

  const simulation = useMemo(() => {
    const mean = distribution.reduce((sum, value) => sum + value, 0) / distribution.length
    const index = (percentile: number) => {
      const pos = Math.floor(percentile * (distribution.length - 1))
      return distribution[pos]
    }
    const downsideProbability =
      distribution.filter((value) => value < 40).length / distribution.length

    return {
      meanValue: Number(mean.toFixed(2)),
      p10: Number(index(0.1).toFixed(2)),
      p90: Number(index(0.9).toFixed(2)),
      downsideProbability: Math.round(downsideProbability * 100)
    }
  }, [distribution])

  const value: ScenarioLabContextValue = {
    drivers: scenarioDrivers,
    presets: scenarioPresets,
    state,
    applyPreset,
    updateDriver,
    setIterations,
    simulation
  }

  return <ScenarioLabContext.Provider value={value}>{children}</ScenarioLabContext.Provider>
}

export function useScenarioLab() {
  const ctx = useContext(ScenarioLabContext)
  if (!ctx) throw new Error('useScenarioLab must be used within ScenarioLabProvider')
  return ctx
}
