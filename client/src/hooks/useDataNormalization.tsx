import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import {
  defaultDataNormalizationState,
  type DataNormalizationState,
  defaultDataSources,
  adjustmentPresets
} from '@/lib/workflow-data'
import { fetchNormalizationState, persistNormalizationState } from '@/lib/workflow-api'

interface CoverageSnapshot {
  avgCoverage: number
  avgFootnoteCoverage: number
  totalUnmatched: number
  reconciledCount: number
  totalSources: number
}

interface SyncStatus {
  hydrated: boolean
  isSyncing: boolean
  lastSavedAt: string | null
  error: string | null
}

interface DataNormalizationContextValue {
  state: DataNormalizationState
  toggleSource: (id: string) => void
  toggleAdjustment: (id: string) => void
  coverage: CoverageSnapshot
  syncStatus: SyncStatus
}

const DataNormalizationContext = createContext<DataNormalizationContextValue | undefined>(undefined)

export function DataNormalizationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DataNormalizationState>(() => defaultDataNormalizationState)
  const [version, setVersion] = useState(0)
  const [hydrated, setHydrated] = useState(false)
  const [isSyncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  const applyRemoteState = useCallback(
    (remote: Awaited<ReturnType<typeof fetchNormalizationState>>) => {
      if (!remote) {
        setState(defaultDataNormalizationState)
        setVersion(0)
        return
      }
      setState({
        reconciledSources: {
          ...defaultDataNormalizationState.reconciledSources,
          ...remote.reconciledSources
        },
        appliedAdjustments: {
          ...defaultDataNormalizationState.appliedAdjustments,
          ...remote.appliedAdjustments
        }
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
        const remote = await fetchNormalizationState()
        if (cancelled) return
        applyRemoteState(remote)
        setSyncError(null)
      } catch (error) {
        if (!cancelled) {
          console.warn('Failed to hydrate normalization state', error)
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
          const saved = await persistNormalizationState({
            reconciledSources: state.reconciledSources,
            appliedAdjustments: state.appliedAdjustments,
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
                const remote = await fetchNormalizationState()
                if (!cancelled) {
                  applyRemoteState(remote)
                  setSyncError('Normalization state refreshed due to concurrent edits.')
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

  const toggleSource = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      reconciledSources: {
        ...prev.reconciledSources,
        [id]: !prev.reconciledSources[id]
      }
    }))
  }, [])

  const toggleAdjustment = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      appliedAdjustments: {
        ...prev.appliedAdjustments,
        [id]: !prev.appliedAdjustments[id]
      }
    }))
  }, [])

  const coverage = useMemo<CoverageSnapshot>(() => {
    const reconciledCount = Object.values(state.reconciledSources).filter(Boolean).length
    const totals = defaultDataSources.reduce(
      (acc, source) => {
        const reconciled = state.reconciledSources[source.id]
        acc.coverage += source.coverage
        acc.footnoteCoverage += source.footnoteCoverage
        if (!reconciled) acc.unmatched += source.unmatchedLineItems
        return acc
      },
      { coverage: 0, footnoteCoverage: 0, unmatched: 0 }
    )

    const totalSources = defaultDataSources.length || 1
    return {
      avgCoverage: Math.round(totals.coverage / totalSources),
      avgFootnoteCoverage: Math.round(totals.footnoteCoverage / totalSources),
      totalUnmatched: totals.unmatched,
      reconciledCount,
      totalSources
    }
  }, [state.reconciledSources])

  const value = useMemo<DataNormalizationContextValue>(
    () => ({
      state,
      toggleSource,
      toggleAdjustment,
      coverage,
      syncStatus: {
        hydrated,
        isSyncing,
        lastSavedAt,
        error: syncError
      }
    }),
    [coverage, hydrated, isSyncing, lastSavedAt, state, syncError, toggleAdjustment, toggleSource]
  )

  return <DataNormalizationContext.Provider value={value}>{children}</DataNormalizationContext.Provider>
}

export function useDataNormalization() {
  const ctx = useContext(DataNormalizationContext)
  if (!ctx) throw new Error('useDataNormalization must be used within DataNormalizationProvider')
  return ctx
}

export const dataSources = defaultDataSources
export const adjustments = adjustmentPresets
