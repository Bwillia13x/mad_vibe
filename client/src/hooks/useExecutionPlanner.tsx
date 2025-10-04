import { useState, useMemo, useCallback, useEffect } from 'react'
import { useScenarioLab } from './useScenarioLab'
import { useMonitoring } from './useMonitoring'
import { useWorkflow } from './useWorkflow'
import { useValuation } from './useValuation'
import type { Row } from '@shared/types'

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
  const { currentScenario } = useValuation()

  // Load from local storage on mount
  useEffect(() => {
    setLoading(true)
    try {
      setState(loadLocalState())
    } finally {
      setLoading(false)
    }
  }, [])

  // Save to local on state change
  useEffect(() => {
    saveLocalState(state)
  }, [state])

  // Derive rows if empty (dynamic from valuation/scenario)
  const derivedRows = useMemo((): Row[] => {
    if (state.rows.length > 0) return state.rows

    const mosThreshold = currentScenario?.impliedMoS ?? 15
    const baseTgtW = mosThreshold > 20 ? 5 : mosThreshold > 10 ? 3 : 2
    const ticker = 'DEMO'
    const px = currentScenario?.value ?? 41.2
    const adv = 6.0

    return [
      { t: ticker, side: 'Buy', px, adv, curW: 0, tgtW: baseTgtW },
      {
        t: `${ticker}-bear`,
        side: 'Buy',
        px: px * 0.9,
        adv: adv * 0.8,
        curW: 0,
        tgtW: baseTgtW * 0.5
      },
      {
        t: `${ticker}-bull`,
        side: 'Buy',
        px: px * 1.1,
        adv: adv * 1.2,
        curW: 0,
        tgtW: baseTgtW * 1.5
      }
    ]
  }, [state.rows, currentScenario])

  const updateState = useCallback((updates: Partial<ExecutionPlannerState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }, [])

  const setRows = useCallback(
    (rows: Row[]) => {
      updateState({ rows })
    },
    [updateState]
  )

  const setPortfolioNotional = useCallback(
    (value: number) => {
      updateState({ portfolioNotional: value })
    },
    [updateState]
  )

  const setMaxPart = useCallback(
    (value: number) => {
      updateState({ maxPart: value })
    },
    [updateState]
  )

  const setAlgo = useCallback(
    (value: string) => {
      updateState({ algo: value })
    },
    [updateState]
  )

  const setLimitBps = useCallback(
    (value: number) => {
      updateState({ limitBps: value })
    },
    [updateState]
  )

  const setTif = useCallback(
    (value: string) => {
      updateState({ tif: value })
    },
    [updateState]
  )

  const setDaysHorizon = useCallback(
    (value: number) => {
      updateState({ daysHorizon: value })
    },
    [updateState]
  )

  const persist = useCallback(async () => {
    try {
      const next = { ...state, rows: derivedRows }
      saveLocalState(next)
      setVersion((v) => v + 1)
      const vstr = (version + 1).toString()
      logEvent({
        stageSlug: activeStage.slug,
        stageTitle: activeStage.title,
        action: 'State persisted',
        details: `v${vstr}`
      }).catch(console.warn)
    } catch (err) {
      setError('Failed to persist state')
      console.error(err)
    }
  }, [state, derivedRows, version, activeStage, logEvent])

  // Auto-persist on change (debounced in production)
  useEffect(() => {
    const timer = setTimeout(persist, 1000)
    return () => clearTimeout(timer)
  }, [state, persist])

  // Slippage model
  const downsideFactor = useMemo(
    () => ((simulation?.downsideProbability || 0) > 25 ? 1.5 : 1.0),
    [simulation]
  )
  const slipBps = useCallback(
    (participation: number) => {
      const base = 5 * downsideFactor
      const k = 0.9 * downsideFactor
      return Math.round(base + k * Math.pow(Math.max(0, participation), 1.2))
    },
    [downsideFactor]
  )

  // Risk cap
  const riskCap = useMemo(() => {
    const downside = simulation?.downsideProbability || 0
    return downside > 25 ? 0.03 : downside > 15 ? 0.05 : 0.08
  }, [simulation])

  // Plan computation
  const plan = useMemo(() => {
    if (derivedRows.length === 0) return []
    return derivedRows.map((r) => {
      const deltaW = r.tgtW - r.curW
      let notional = Math.abs(deltaW / 100) * state.portfolioNotional
      if (r.tgtW > riskCap * 100) {
        notional = Math.min(notional, riskCap * state.portfolioNotional)
      }
      const side = deltaW > 0 ? 'Buy' : 'Sell'
      const shares = (notional * 1_000_000) / Math.max(0.01, r.px)
      const dailyCap = (state.maxPart / 100) * r.adv * 1_000_000
      const days = Math.max(1, Math.ceil((notional * 1_000_000) / Math.max(1, dailyCap)))
      const participation = Math.min(
        (notional / Math.max(0.01, r.adv * state.daysHorizon)) * 100,
        400
      )
      const bps = slipBps(participation)
      const cost = notional * (bps / 10000)
      const limitPx =
        state.algo === 'Limit ladder'
          ? side === 'Buy'
            ? r.px * (1 + state.limitBps / 10000)
            : r.px * (1 - state.limitBps / 10000)
          : null
      return { ...r, side, deltaW, notional, shares, days, participation, bps, cost, limitPx }
    })
  }, [
    derivedRows,
    state.portfolioNotional,
    state.maxPart,
    state.algo,
    state.limitBps,
    state.daysHorizon,
    riskCap,
    slipBps
  ])

  const totals = useMemo(
    () => ({
      buy: plan.filter((p) => p.side === 'Buy').reduce((s, x) => s + x.notional, 0),
      sell: plan.filter((p) => p.side === 'Sell').reduce((s, x) => s + x.notional, 0),
      cost: plan.reduce((s, x) => s + x.cost, 0),
      avgBps: plan.length ? Math.round(plan.reduce((s, x) => s + x.bps, 0) / plan.length) : 0
    }),
    [plan]
  )

  const outstandingAlerts = useMemo(() => alerts.filter((a) => !a.acknowledged), [alerts])
  const planConstraintsMet =
    plan.length > 0
      ? plan.every(
          (p) =>
            p.days <= state.daysHorizon &&
            p.participation <= state.maxPart * 1.1 &&
            p.tgtW <= riskCap * 100
        )
      : true
  const noAlerts = outstandingAlerts.length === 0
  const gateReady = planConstraintsMet && noAlerts // Add checklist if needed

  const setTgt = useCallback(
    (t: string, v: number) => {
      const sourceRows = state.rows.length > 0 ? state.rows : derivedRows
      if (sourceRows.length === 0) return

      const updated = sourceRows.map((x: Row) => (x.t === t ? ({ ...x, tgtW: v } as Row) : x))
      setRows(updated)
      logEvent({
        stageSlug: activeStage.slug,
        stageTitle: activeStage.title,
        action: 'Target updated',
        details: `${t}:${v}%`
      }).catch(console.warn)
    },
    [state.rows, derivedRows, setRows, logEvent, activeStage]
  )

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
