import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import {
  epvAssumptions,
  epvOutputs,
  dcfScenarioOutputs,
  type ValuationAssumption,
  type ScenarioBand
} from '@/lib/workflow-data'
import { fetchValuationState, persistValuationState } from '@/lib/workflow-api'

interface ValuationState {
  selectedScenario: ScenarioBand
  assumptionOverrides: Partial<Record<string, number>>
}

interface SyncStatus {
  hydrated: boolean
  isSyncing: boolean
  lastSavedAt: string | null
  error: string | null
}

interface ValuationContextValue {
  state: ValuationState
  setScenario: (band: ScenarioBand) => void
  updateAssumption: (id: string, value: number) => void
  assumptions: ValuationAssumption[]
  epv: typeof epvOutputs
  dcf: typeof dcfScenarioOutputs
  currentScenario: typeof dcfScenarioOutputs[number]
  syncStatus: SyncStatus
}

const defaultValuationState: ValuationState = {
  selectedScenario: 'base',
  assumptionOverrides: {}
}

const ValuationContext = createContext<ValuationContextValue | undefined>(undefined)

const isScenarioBand = (value: string): value is ScenarioBand =>
  value === 'bear' || value === 'base' || value === 'bull'

export function ValuationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ValuationState>(defaultValuationState)
  const [version, setVersion] = useState(0)
  const [hydrated, setHydrated] = useState(false)
  const [isSyncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  const applyRemoteState = useCallback(
    (remote: Awaited<ReturnType<typeof fetchValuationState>>) => {
      if (!remote) {
        setState(defaultValuationState)
        setVersion(0)
        return
      }
      const mergedScenario = isScenarioBand(remote.selectedScenario)
        ? remote.selectedScenario
        : defaultValuationState.selectedScenario
      const mergedOverrides: Partial<Record<string, number>> = {}
      for (const [key, value] of Object.entries(remote.assumptionOverrides ?? {})) {
        const numeric = Number(value)
        if (!Number.isNaN(numeric)) mergedOverrides[key] = numeric
      }
      setState({
        selectedScenario: mergedScenario,
        assumptionOverrides: mergedOverrides
      })
      setVersion(remote.version ?? 0)
      setLastSavedAt(remote.updatedAt ?? null)
    },
    []
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const remote = await fetchValuationState()
        if (cancelled) return
        applyRemoteState(remote)
        setSyncError(null)
      } catch (error) {
        if (!cancelled) {
          console.warn('Failed to hydrate valuation state', error)
          setSyncError(error instanceof Error ? error.message : 'Unknown hydration error')
        }
      } finally {
        if (!cancelled) setHydrated(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [applyRemoteState])

  useEffect(() => {
    if (!hydrated) return

    let cancelled = false
    const timeout = setTimeout(() => {
      void (async () => {
        setSyncing(true)
        try {
          const saved = await persistValuationState({
            selectedScenario: state.selectedScenario,
            assumptionOverrides: Object.fromEntries(
              Object.entries(state.assumptionOverrides)
                .filter(([, value]) => typeof value === 'number' && !Number.isNaN(value))
                .map(([key, value]) => [key, value as number])
            ),
            version
          })
          if (!cancelled) {
            setVersion(saved.version ?? version)
            setLastSavedAt(saved.updatedAt ?? new Date().toISOString())
            setSyncError(null)
          }
        } catch (error) {
          if (!cancelled) {
            const status = (error as any)?.status as number | undefined
            if (status === 409) {
              try {
                const remote = await fetchValuationState()
                if (!cancelled) {
                  applyRemoteState(remote)
                  setSyncError('Valuation refreshed due to concurrent edits.')
                }
              } catch (refreshError) {
                const message = refreshError instanceof Error ? refreshError.message : 'Unknown persistence error'
                setSyncError(message)
              }
            } else {
              const message = error instanceof Error ? error.message : 'Unknown persistence error'
              setSyncError(message)
            }
          }
        } finally {
          if (!cancelled) setSyncing(false)
        }
      })()
    }, 500)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [state, version, hydrated, applyRemoteState])

  const setScenario = useCallback((band: ScenarioBand) => {
    setState((prev) => ({
      ...prev,
      selectedScenario: band
    }))
  }, [])

  const updateAssumption = useCallback((id: string, value: number) => {
    setState((prev) => ({
      ...prev,
      assumptionOverrides: {
        ...prev.assumptionOverrides,
        [id]: value
      }
    }))
  }, [])

  const currentScenario = useMemo(
    () => dcfScenarioOutputs.find((row) => row.band === state.selectedScenario) ?? dcfScenarioOutputs[1],
    [state.selectedScenario]
  )

  const contextValue = useMemo<ValuationContextValue>(
    () => ({
      state,
      setScenario,
      updateAssumption,
      assumptions: epvAssumptions,
      epv: epvOutputs,
      dcf: dcfScenarioOutputs,
      currentScenario,
      syncStatus: {
        hydrated,
        isSyncing,
        lastSavedAt,
        error: syncError
      }
    }),
    [state, setScenario, updateAssumption, currentScenario, hydrated, isSyncing, lastSavedAt, syncError]
  )

  return <ValuationContext.Provider value={contextValue}>{children}</ValuationContext.Provider>
}

export function useValuation() {
  const ctx = useContext(ValuationContext)
  if (!ctx) throw new Error('useValuation must be used within ValuationProvider')
  return ctx
}
