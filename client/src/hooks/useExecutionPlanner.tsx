import { useState, useMemo, useCallback, useEffect } from 'react'
import { useScenarioLab } from './useScenarioLab'
import { useMonitoring } from './useMonitoring'
import { useWorkflow } from './useWorkflow'
import type { ResearchLogInput } from '@/lib/workflow-api'
import type { ExecutionPlannerStatePayload, ExecutionPlannerStateInput, Row } from '@shared/types'

const STORAGE_KEY = 'valor-execution-planner-state'

interface ExecutionPlannerState {
  rows: Row[]
  portfolioNotional: number
  maxPart: number
  algo: string
  limitBps: number
  tif: string
  daysHorizon: number
}

const defaultState: ExecutionPlannerState = {
  rows: [],
  portfolioNotional: 100,
  maxPart: 15,
  algo: 'VWAP',
  limitBps: 20,
  tif: 'Day',
  daysHorizon: 3
}

const loadLocalState = (): ExecutionPlannerState => {
  if (typeof window === 'undefined') return defaultState
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState
    const parsed = JSON.parse(raw) as ExecutionPlannerState
    return { ...defaultState, ...parsed }
  } catch {
    return defaultState
  }
}

const saveLocalState = (state: ExecutionPlannerState) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('Failed to persist execution planner state locally', error)
  }
}

export function useExecutionPlanner() {
  const [state, setState] = useState<ExecutionPlannerState>(() => loadLocalState())
  const [version, setVersion] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { simulation } = useScenarioLab()
  const { alerts } = useMonitoring()
  const { activeStage, logEvent } = useWorkflow()

  // Load from API on mount
  useEffect(() => {
    const loadFromApi = async () => {
      try {
        setLoading(true)
        const loaded = await fetchExecutionPlannerState()
        if (loaded) {
          setState({
            ...defaultState,
            ...loaded,
            rows: loaded.rows || defaultState.rows // Ensure rows is array
          })
          setVersion(loaded.version)
        } else {
          // Fallback to local
          setState(loadLocalState())
        }
      } catch (err) {
        console.warn('Failed to load execution planner state from API', err)
        setState(loadLocalState())
      } finally {
        setLoading(false)
      }
    }

    loadFromApi()
  }, [])

  // Save to local on state change
  useEffect(() => {
    saveLocalState(state)
  }, [state])

  // Derive rows if empty (dynamic from valuation/scenario)
  const derivedRows = useMemo(() => {
    if (state.rows.length > 0) return state.rows

    const { currentScenario } = useValuation() // Assume useValuation available or pass as prop if needed
    const mosThreshold = currentScenario?.mos || 15
    const baseTgtW = mosThreshold > 20 ? 5 : mosThreshold > 10 ? 3 : 2
    const ticker = currentScenario?.ticker || 'DEMO'
    const px = currentScenario?.value || 41.2
    const adv = simulation?.adv || 6.0

    if (ticker !== 'DEMO') {
      return [
        { t: ticker, side: 'Buy' as const, px, adv, curW: 0, tgtW: baseTgtW },
        { t: `${ticker}-bear`, side: 'Buy' as const, px: px * 0.9, adv: adv * 0.8, curW: 0, tgtW: baseTgtW * 0.5 },
        { t: `${ticker}-bull`, side: 'Buy' as const, px: px * 1.1, adv: adv * 1.2, curW: 0, tgtW: baseTgtW * 1.5 }
      ]
    }

    return [
      { t: 'TKR', side: 'Buy' as const, px: 41.2, adv: 6.0, curW: 3.0, tgtW: baseTgtW },
      { t: 'ACME', side: 'Buy' as const, px: 21.4, adv: 4.2, curW: 2.0, tgtW: baseTgtW * 0.8 },
      { t: 'NTR', side: 'Sell' as const, px: 12.9, adv: 1.3, curW: 1.5, tgtW: baseTgtW * 0.3 }
    ]
  }, [state.rows.length, simulation, currentScenario]) // currentScenario from useValuation

  const updateState = useCallback((updates: Partial<ExecutionPlannerState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const setRows = useCallback((rows: Row[]) => {
    updateState({ rows })
  }, [updateState])

  const setPortfolioNotional = useCallback((value: number) => {
    updateState({ portfolioNotional: value })
  }, [updateState])

  const setMaxPart = useCallback((value: number) => {
    updateState({ maxPart: value })
  }, [updateState])

  const setAlgo = useCallback((value: string) => {
    updateState({ algo: value })
  }, [updateState])

  const setLimitBps = useCallback((value: number) => {
    updateState({ limitBps: value })
  }, [updateState])

  const setTif = useCallback((value: string) => {
    updateState({ tif: value })
  }, [updateState])

  const setDaysHorizon = useCallback((value: number) => {
    updateState({ daysHorizon: value })
  }, [updateState])

  const persist = useCallback(async () => {
    try {
      const payload: ExecutionPlannerStateInput = {
        ...state,
        rows: derivedRows,
        version
      }
      const result = await persistExecutionPlannerState(payload)
      setVersion(result.version)
      logEvent({
        stageSlug: activeStage.slug,
        stageTitle: activeStage.title,
        action: 'State persisted',
        details: `v${result.version}`
      }).catch(console.warn)
    } catch (err: any) {
      if (err.status === 409) {
        // Conflict: reload and merge
        const loaded = await fetchExecutionPlannerState()
        if (loaded) {
          setState(prev => ({ ...prev, ...loaded, version: loaded.version }))
          setVersion(loaded.version)
          setError('State conflict resolved by reload')
          setTimeout(() => setError(null), 3000)
        }
      } else {
        setError('Failed to persist state')
        console.error(err)
      }
    }
  }, [state, derivedRows, version, activeStage, logEvent])

  // Auto-persist on change (debounced in production)
  useEffect(() => {
    const timer = setTimeout(persist, 1000)
    return () => clearTimeout(timer)
  }, [state, persist])

  // Slippage model
  const downsideFactor = useMemo(() => (simulation?.downsideProbability || 0) > 25 ? 1.5 : 1.0, [simulation])
  const slipBps = useCallback((participation: number) => {
    const base = 5 * downsideFactor
    const k = 0.9 * downsideFactor
    return Math.round(base + k * Math.pow(Math.max(0, participation), 1.2))
  }, [downsideFactor])

  // Risk cap
  const riskCap = useMemo(() => {
    const downside = simulation?.downsideProbability || 0
    return downside > 25 ? 0.03 : downside > 15 ? 0.05 : 0.08
  }, [simulation])

  // Plan computation
  const plan = useMemo(() => {
    if (derivedRows.length === 0) return []
    return derivedRows.map(r => {
      const deltaW = r.tgtW - r.curW
      let notional = Math.abs(deltaW / 100) * state.portfolioNotional
      if (r.tgtW > riskCap * 100) {
        notional = Math.min(notional, riskCap * state.portfolioNotional)
      }
      const side = deltaW > 0 ? 'Buy' : 'Sell'
      const shares = (notional * 1_000_000) / Math.max(0.01, r.px)
      const dailyCap = (state.maxPart / 100) * r.adv * 1_000_000
      const days = Math.max(1, Math.ceil((notional * 1_000_000) / Math.max(1, dailyCap)))
      const participation = Math.min((notional / Math.max(0.01, r.adv * state.daysHorizon)) * 100, 400)
      const bps = slipBps(participation)
      const cost = notional * (bps / 10000)
      const limitPx = state.algo === 'Limit ladder' ? (side === 'Buy' ? r.px * (1 + state.limitBps / 10000) : r.px * (1 - state.limitBps / 10000)) : null
      return { ...r, side, deltaW, notional, shares, days, participation, bps, cost, limitPx }
    })
  }, [derivedRows, state.portfolioNotional, state.maxPart, state.algo, state.limitBps, state.tif, state.daysHorizon, riskCap, slipBps])

  const totals = useMemo(() => ({
    buy: plan.filter(p => p.side === 'Buy').reduce((s, x) => s + x.notional, 0),
    sell: plan.filter(p => p.side === 'Sell').reduce((s, x) => s + x.notional, 0),
    cost: plan.reduce((s, x) => s + x.cost, 0),
    avgBps: plan.length ? Math.round(plan.reduce((s, x) => s + x.bps, 0) / plan.length) : 0
  }), [plan])

  const outstandingAlerts = useMemo(() => alerts.filter(a => !a.acknowledged), [alerts])
  const planConstraintsMet = plan.length > 0 ? plan.every(p => p.days <= state.daysHorizon && p.participation <= state.maxPart * 1.1 && p.tgtW <= riskCap * 100) : true
  const noAlerts = outstandingAlerts.length === 0
  const gateReady = planConstraintsMet && noAlerts // Add checklist if needed

  const setTgt = useCallback((t: string, v: number) => {
    setRows(prev => prev.map(x => x.t === t ? { ...x, tgtW: v } : x))
    logEvent({
      stageSlug: activeStage.slug,
      stageTitle: activeStage.title,
      action: 'Target updated',
      details: `${t}:${v}%`
    }).catch(console.warn)
  }, [setRows, logEvent, activeStage])

  return {
    state,
    derivedRows,
    plan,
    totals,
    riskCap,
    outstandingAlerts,
    gateReady,
    loading,
    error,
    setRows,
    setPortfolioNotional,
    setMaxPart,
    setAlgo,
    setLimitBps,
    setTif,
    setDaysHorizon,
    setTgt,
    persist,
    slipBps
  }
}