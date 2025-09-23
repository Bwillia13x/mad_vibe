import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  epvAssumptions,
  epvOutputs,
  dcfScenarioOutputs,
  relativesOutputs,
  BASE_VALUATION,
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

interface EPVCalc {
  ev: number
  equity: number
  ps: number
  ownerEarnings: number
  capRate: number
  netDebt: number
  shares: number
  price: number
}

interface DCCalc {
  ev: number
  equity: number
  ps: number
  r: number
  g1: number
  g2: number
  gT: number
  ownerEarnings: number
  termG: number
  netDebt: number
  shares: number
  price: number
}

interface RelCalc {
  evFromEbit: number
  eqFromFcf: number
  psEV: number
  psEQ: number
  ps: number
  ebit: number
  peerEVEBIT: number
  fcf: number
  peerPFCF: number
  netDebt: number
  shares: number
  price: number
}

interface AggCalc {
  low: number
  mid: number
  high: number
  mos: number
  price: number
}

interface ValuationContextValue {
  state: ValuationState
  setScenario: (band: ScenarioBand) => void
  updateAssumption: (id: string, value: number) => void
  getOverriddenValue: (id: string, base: number) => number
  assumptions: ValuationAssumption[]
  epv: EPVCalc
  dcf: DCCalc
  rel: RelCalc
  agg: AggCalc
  currentScenario: (typeof dcfScenarioOutputs)[number]
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
                const message =
                  refreshError instanceof Error ? refreshError.message : 'Unknown persistence error'
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

  const getOverriddenValue = useCallback(
    (id: string, base: number) => {
      const override = state.assumptionOverrides[id]
      return typeof override === 'number' ? override : base
    },
    [state.assumptionOverrides]
  )

  const adj = useMemo(() => {
    const baseWacc = getOverriddenValue('wacc', BASE_VALUATION.wacc)
    const baseG1 = getOverriddenValue('g1', 6.0)
    const baseG2 = getOverriddenValue('g2', 3.0)
    if (state.selectedScenario === 'bull') {
      return {
        wacc: baseWacc - 1.0,
        g1: baseG1 + 2.0,
        g2: baseG2 + 1.0
      }
    }
    if (state.selectedScenario === 'bear') {
      return {
        wacc: baseWacc + 1.5,
        g1: Math.max(0, baseG1 - 3.0),
        g2: Math.max(0, baseG2 - 2.0)
      }
    }
    return { wacc: baseWacc, g1: baseG1, g2: baseG2 }
  }, [state.selectedScenario, getOverriddenValue])

  const epv = useMemo((): EPVCalc => {
    const price = getOverriddenValue('price', BASE_VALUATION.price)
    const ownerEarnings = getOverriddenValue('ownerEarnings', BASE_VALUATION.ownerEarnings)
    const capRate = getOverriddenValue('capRate', BASE_VALUATION.capRate)
    const netDebt = getOverriddenValue('netDebt', BASE_VALUATION.netDebt)
    const shares = getOverriddenValue('shares', BASE_VALUATION.shares)
    const ev = ownerEarnings / (Math.max(0.01, capRate) / 100)
    const equity = ev - netDebt
    const ps = equity / shares
    console.log('EPV calc:', { ev, equity, ps, ownerEarnings, capRate, price }) // temp log
    return { ev, equity, ps, ownerEarnings, capRate, netDebt, shares, price }
  }, [getOverriddenValue])

  const dcf = useMemo((): DCCalc => {
    const price = getOverriddenValue('price', BASE_VALUATION.price)
    const ownerEarnings = getOverriddenValue('ownerEarnings', BASE_VALUATION.ownerEarnings)
    const termG = getOverriddenValue('termG', BASE_VALUATION.termG)
    const netDebt = getOverriddenValue('netDebt', BASE_VALUATION.netDebt)
    const shares = getOverriddenValue('shares', BASE_VALUATION.shares)
    const r = Math.max(0.01, adj.wacc / 100)
    const g1 = adj.g1 / 100
    const g2 = adj.g2 / 100
    const gT = Math.max(0, termG / 100)
    let cf = ownerEarnings
    let pv = 0
    for (let y = 1; y <= 10; y++) {
      cf = cf * (1 + (y <= 5 ? g1 : g2))
      pv += cf / Math.pow(1 + r, y)
    }
    const tv = (cf * (1 + gT)) / (r - gT)
    pv += tv / Math.pow(1 + r, 11)
    const ev = pv
    const equity = ev - netDebt
    const ps = equity / shares
    console.log('DCF calc:', {
      ev,
      equity,
      ps,
      r: adj.wacc,
      g1: adj.g1,
      g2: adj.g2,
      gT: termG,
      price
    }) // temp log
    return {
      ev,
      equity,
      ps,
      r: adj.wacc,
      g1: adj.g1,
      g2: adj.g2,
      gT: termG,
      ownerEarnings,
      netDebt,
      shares,
      price
    }
  }, [getOverriddenValue, adj, BASE_VALUATION])

  const rel = useMemo((): RelCalc => {
    const price = getOverriddenValue('price', BASE_VALUATION.price)
    const ebit = getOverriddenValue('ebit', BASE_VALUATION.ebit)
    const peerEVEBIT = getOverriddenValue('peerEVEBIT', BASE_VALUATION.peerEVEBIT)
    const fcf = getOverriddenValue('fcf', BASE_VALUATION.fcf)
    const peerPFCF = getOverriddenValue('peerPFCF', BASE_VALUATION.peerPFCF)
    const netDebt = getOverriddenValue('netDebt', BASE_VALUATION.netDebt)
    const shares = getOverriddenValue('shares', BASE_VALUATION.shares)
    const evFromEbit = ebit * peerEVEBIT
    const eqFromFcf = fcf * peerPFCF
    const psEV = (evFromEbit - netDebt) / shares
    const psEQ = eqFromFcf / shares
    const ps = (psEV + psEQ) / 2
    console.log('Rel calc:', {
      evFromEbit,
      eqFromFcf,
      psEV,
      psEQ,
      ps,
      ebit,
      peerEVEBIT,
      fcf,
      peerPFCF,
      price
    }) // temp log
    return {
      evFromEbit,
      eqFromFcf,
      psEV,
      psEQ,
      ps,
      ebit,
      peerEVEBIT,
      fcf,
      peerPFCF,
      netDebt,
      shares,
      price
    }
  }, [getOverriddenValue, BASE_VALUATION])

  const agg = useMemo((): AggCalc => {
    const price = getOverriddenValue('price', BASE_VALUATION.price)
    const values = [epv.ps, dcf.ps, rel.ps].filter((v) => Number.isFinite(v))
    const low = Math.min(...values)
    const high = Math.max(...values)
    const mid = values.sort((a, b) => a - b)[Math.floor(values.length / 2)]
    const mos = (1 - price / mid) * 100
    console.log('Agg calc:', { low, mid, high, mos, price }) // temp log
    return { low, mid, high, mos, price }
  }, [epv.ps, dcf.ps, rel.ps, getOverriddenValue, BASE_VALUATION])

  const currentScenario = useMemo(
    () =>
      dcfScenarioOutputs.find((row) => row.band === state.selectedScenario) ??
      dcfScenarioOutputs[1],
    [state.selectedScenario]
  )

  const contextValue = useMemo<ValuationContextValue>(
    () => ({
      state,
      setScenario,
      updateAssumption,
      getOverriddenValue,
      assumptions: epvAssumptions,
      epv,
      dcf,
      rel,
      agg,
      currentScenario,
      syncStatus: {
        hydrated,
        isSyncing,
        lastSavedAt,
        error: syncError
      }
    }),
    [
      state,
      setScenario,
      updateAssumption,
      getOverriddenValue,
      epv,
      dcf,
      rel,
      agg,
      currentScenario,
      hydrated,
      isSyncing,
      lastSavedAt,
      syncError
    ]
  )

  return <ValuationContext.Provider value={contextValue}>{children}</ValuationContext.Provider>
}

export function useValuation() {
  const ctx = useContext(ValuationContext)
  if (!ctx) throw new Error('useValuation must be used within ValuationProvider')
  return ctx
}
