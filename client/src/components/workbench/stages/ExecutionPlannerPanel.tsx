import React, { useMemo, useCallback } from 'react'
import { useWorkflow, type WorkflowStage } from '@/hooks/useWorkflow'
import { useScenarioLab } from '@/hooks/useScenarioLab'
import { useValuation } from '@/hooks/useValuation'
import { useMonitoring } from '@/hooks/useMonitoring'
import { useExecutionPlanner } from '@/hooks/useExecutionPlanner'
import type { ResearchLogInput } from '@/lib/workflow-api'

// Types
type Tone = 'slate' | 'violet' | 'emerald' | 'amber' | 'rose' | 'blue'

type Row = {
  t: string
  side: 'Buy' | 'Sell'
  px: number
  adv: number
  curW: number
  tgtW: number
  deltaW?: number
  notional?: number
  shares?: number
  days?: number
  participation?: number
  bps?: number
  cost?: number
  limitPx?: number | null
}

interface CardProps {
  title: string
  subtitle?: string
  right?: React.ReactNode
  children: React.ReactNode
}

interface TagProps {
  tone?: Tone
  children: React.ReactNode
}

interface OrderIntentProps {
  rows: Row[]
  onSetTgt: (t: string, v: number) => void
  toggleChecklistItem: (id: string) => void
}

interface ConstraintsProps {
  portfolioNotional: number
  onPortChange: (v: number) => void
  maxPart: number
  onMaxPartChange: (v: number) => void
  algo: string
  onAlgoChange: (v: string) => void
  limitBps: number
  onLimitBpsChange: (v: number) => void
  tif: string
  onTifChange: (v: string) => void
  daysHorizon: number
  onDaysChange: (v: number) => void
  toggleChecklistItem: (id: string) => void
  logEvent: (entry: ResearchLogInput) => Promise<void>
  activeStage: WorkflowStage
}

// ---------------- helpers ----------------
const cls = (...s: (string | false | null | undefined)[]): string => s.filter(Boolean).join(' ')
const clamp = (x: number, min: number, max: number): number => Math.max(min, Math.min(max, x))
const fmt = (n: number, d = 2): string =>
  Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : '-'
const pct = (x: number, d = 2): string => `${fmt(x, d)}%`

function Card({ title, subtitle, right, children }: CardProps) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-slate-100 font-semibold leading-tight">{title}</h3>
          {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

function Tag({ tone = 'slate' as Tone, children }: TagProps) {
  const palette: Record<Tone, string> = {
    slate: 'bg-slate-800/60 text-slate-200 ring-slate-700/80',
    violet: 'bg-violet-800/40 text-violet-100 ring-violet-700/70',
    emerald: 'bg-emerald-800/40 text-emerald-100 ring-emerald-700/70',
    amber: 'bg-amber-800/40 text-amber-100 ring-amber-700/70',
    rose: 'bg-rose-800/40 text-rose-100 ring-rose-700/70',
    blue: 'bg-sky-800/40 text-sky-100 ring-sky-700/70'
  }
  return (
    <span className={cls('px-2 py-0.5 rounded-full text-xs font-medium ring-1', palette[tone])}>
      {children}
    </span>
  )
}

// ---------------- icons ----------------
function IconRoute() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="6" cy="19" r="2" />
        <circle cx="18" cy="5" r="2" />
        <path d="M8 19h8a4 4 0 0 0 4-4v-3" />
        <path d="M16 5H8a4 4 0 0 0-4 4v3" />
      </svg>
    </span>
  )
}
function IconCalc() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M10 8h4" />
        <path d="M7 12h10M7 16h10" />
      </svg>
    </span>
  )
}
function IconWarn() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    </span>
  )
}
function IconNext() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </span>
  )
}
function IconHome() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m3 12 9-9 9 9" />
        <path d="M9 21V9h6v12" />
      </svg>
    </span>
  )
}

// Sub-components
function OrderIntentSection({ rows, onSetTgt, toggleChecklistItem }: OrderIntentProps) {
  const targetsItem = useMemo(() => 'confirm-targets' as const, [])

  return (
    <Card title="Order Intent" subtitle="Targets from sizing step" right={null}>
      <ul className="text-sm text-slate-300 space-y-2">
        {rows.length === 0 ? (
          <li className="text-amber-300">No tickers from watchlist. Load from prior stage.</li>
        ) : (
          rows.map((r) => (
            <li key={r.t} className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">{r.t}</div>
                <Tag tone={r.side === 'Buy' ? 'emerald' : 'rose'}>{r.side}</Tag>
              </div>
              <div className="mt-1 grid grid-cols-3 gap-2 items-center">
                <div className="text-xs text-slate-500">cur {fmt(r.curW, 1)}%</div>
                <label className="col-span-2">
                  Target %
                  <input
                    type="number"
                    step="0.1"
                    value={r.tgtW}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value || '0')
                      onSetTgt(r.t, v)
                      if (v > 0) toggleChecklistItem(targetsItem)
                    }}
                    className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1"
                  />
                </label>
              </div>
            </li>
          ))
        )}
      </ul>
    </Card>
  )
}

function ConstraintsSection({
  portfolioNotional,
  onPortChange,
  maxPart,
  onMaxPartChange,
  algo,
  onAlgoChange,
  limitBps,
  onLimitBpsChange,
  tif,
  onTifChange,
  daysHorizon,
  onDaysChange,
  toggleChecklistItem,
  logEvent,
  activeStage
}: ConstraintsProps) {
  const constraintsItem = useMemo(() => 'confirm-constraints' as const, [])

  const handleInputChange = useCallback(
    (value: number | string, itemId: string) => {
      toggleChecklistItem(constraintsItem)
      logEvent({
        stageSlug: activeStage.slug,
        stageTitle: activeStage.title,
        action: 'Constraint updated',
        details: `${itemId}:${value}`
      }).catch(console.warn)
    },
    [toggleChecklistItem, logEvent, activeStage, constraintsItem]
  )

  return (
    <Card
      title="Constraints"
      subtitle="Pacing & limits"
      right={
        <Tag tone="violet">
          <IconCalc /> calc
        </Tag>
      }
    >
      <div className="grid grid-cols-2 gap-2 text-sm">
        <label>
          NAV ($m)
          <input
            type="number"
            step="1"
            value={portfolioNotional}
            onChange={(e) => {
              const v = parseFloat(e.target.value || '0')
              onPortChange(v)
              handleInputChange(v, 'nav')
            }}
            className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1"
          />
        </label>
        <label>
          Max %ADV/day
          <input
            type="number"
            step="1"
            value={maxPart}
            onChange={(e) => {
              const v = parseFloat(e.target.value || '0')
              onMaxPartChange(v)
              handleInputChange(v, 'max-part')
            }}
            className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1"
          />
        </label>
        <label>
          Horizon (days)
          <input
            type="number"
            step="1"
            value={daysHorizon}
            onChange={(e) => {
              const v = parseFloat(e.target.value || '0')
              onDaysChange(v)
              handleInputChange(v, 'horizon')
            }}
            className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1"
          />
        </label>
        <label>
          Algo
          <select
            value={algo}
            onChange={(e) => {
              const v = e.target.value
              onAlgoChange(v)
              handleInputChange(v, 'algo')
            }}
            className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1"
          >
            {['VWAP', 'TWAP', 'Limit ladder'].map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        {algo === 'Limit ladder' && (
          <label className="col-span-2">
            Limit offset (bps)
            <input
              type="number"
              step="1"
              value={limitBps}
              onChange={(e) => {
                const v = parseFloat(e.target.value || '0')
                onLimitBpsChange(v)
                handleInputChange(v, 'limit-bps')
              }}
              className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1"
            />
          </label>
        )}
        <label className="col-span-2">
          Time in force
          <select
            value={tif}
            onChange={(e) => {
              const v = e.target.value
              onTifChange(v)
              handleInputChange(v, 'tif')
            }}
            className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1"
          >
            {['Day', 'IOC', 'GTC'].map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="text-xs text-slate-500 mt-1">
        In production, tie these to broker/OMS presets and venue mix.
      </div>
    </Card>
  )
}

// Route suggestions based on alerts and downside
const routeSuggestions = useMemo(() => {
  const { simulation } = useScenarioLab()
  const { alerts } = useMonitoring()
  const downside = simulation?.downsideProbability || 0
  const alertCount = alerts.filter((a: any) => !a.acknowledged).length
  const suggestions = []
  if (alertCount > 0 || downside > 25) {
    suggestions.push('Use TWAP for gradual execution to minimize impact')
    suggestions.push('Set TIF to IOC for high-risk entries')
  } else {
    suggestions.push('VWAP suitable for base case')
    suggestions.push('Day TIF for standard liquidity')
  }
  return suggestions
}, [])

// Risk Budget Panel data
const riskBudgetData = useMemo(() => {
  const { simulation } = useScenarioLab()
  const downside = simulation?.downsideProbability || 0
  const suggestedCap = riskCap * 100 // From earlier memo
  return { downside, suggestedCap, alerts: outstandingAlerts.length }
}, [riskCap, outstandingAlerts])

// ---------------- main ----------------
export default function ExecutionPlannerPanel() {
  const {
    getChecklist,
    checklistState,
    activeStage,
    toggleChecklistItem,
    markStageComplete,
    logEvent
  } = useWorkflow()
  const { simulation } = useScenarioLab()
  const { currentScenario, agg } = useValuation()
  const { alerts } = useMonitoring()
  const {
    derivedRows: rows,
    plan,
    totals,
    riskCap,
    outstandingAlerts,
    gateReady,
    setRows,
    setPortfolioNotional,
    setMaxPart,
    setAlgo,
    setLimitBps,
    setTif,
    setDaysHorizon,
    setTgt,
    slipBps
  } = useExecutionPlanner()

  const checklist = useMemo(() => getChecklist(activeStage.slug), [activeStage.slug, getChecklist])
  const stageState = checklistState[activeStage.slug] ?? {}

  // Readiness first
  const readinessSignals = useMemo(() => {
    return checklist.map((item: any) => ({
      id: item.id,
      title: item.label,
      complete: Boolean(stageState[item.id])
    }))
  }, [checklist, stageState])

  const readinessComplete = readinessSignals.every((item: any) => item.complete)
  const noAlerts = outstandingAlerts.length === 0
  const planConstraintsMet = plan.length > 0 ? plan.every((p) => p.days <= state.daysHorizon && p.participation <= state.maxPart * 1.1 && p.tgtW <= riskCap * 100) : true
  const gateReady = planConstraintsMet && readinessComplete && noAlerts

  const onPortChange = useCallback((v: number) => setPortfolioNotional(v), [setPortfolioNotional])
  const onMaxPartChange = useCallback((v: number) => setMaxPart(v), [setMaxPart])
  const onAlgoChange = useCallback((v: string) => setAlgo(v), [setAlgo])
  const onLimitBpsChange = useCallback((v: number) => setLimitBps(v), [setLimitBps])
  const onTifChange = useCallback((v: string) => setTif(v), [setTif])
  const onDaysChange = useCallback((v: number) => setDaysHorizon(v), [setDaysHorizon])

  // Enhanced Export: Download CSV
  const handleExport = useCallback(() => {
    if (plan.length === 0) return
    const headers =
      'Ticker,Side,Δ W%,Notional ($m),Shares,Px,Days,%ADV/day,Slippage (bps),Cost ($m),Limit Px\n'
    const csv =
      headers +
      plan
        .map(
          (p) =>
            `${p.t},"${p.side}",${fmt(p.deltaW, 1)},${fmt(p.notional, 2)},${fmt(p.shares, 0)},${fmt(p.px, 2)},${p.days},${pct(p.participation, 1)},${p.bps},${fmt(p.cost, 3)},${p.limitPx ? fmt(p.limitPx, 2) : '—'}`
        )
        .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `execution-plan-${activeStage.slug}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [plan, activeStage.slug])

  const handleSendToBroker = useCallback(() => {
    console.log('Send to broker:', plan)
    logEvent({
      stageSlug: activeStage.slug,
      stageTitle: activeStage.title,
      action: 'Broker handoff',
      details: JSON.stringify(totals)
    }).catch(console.warn)
  }, [plan, logEvent, activeStage, totals])

  const handleOpenMonitoring = useCallback(() => {
    if (gateReady) {
      markStageComplete(activeStage.slug)
      logEvent({
        stageSlug: activeStage.slug,
        stageTitle: activeStage.title,
        action: 'Gate passed',
        details: 'To monitoring'
      }).catch(console.warn)
      alert('Navigating to Monitoring & Journal')
    } else {
      alert('Resolve constraints, alerts, and checklist first.')
    }
  }, [gateReady, markStageComplete, logEvent, activeStage])

  const handleHome = useCallback(() => alert('Navigating to Home / Daily Brief'), [])

  const handleConstraintChange = useCallback(
    (value: number | string, type: string) => {
      toggleChecklistItem('confirm-constraints')
      logEvent({
        stageSlug: activeStage.slug,
        stageTitle: activeStage.title,
        action: 'Constraint updated',
        details: `${type}:${value}`
      }).catch(console.warn)
    },
    [toggleChecklistItem, logEvent, activeStage]
  )

  return (
    <div className="w-full min-h-[calc(100vh-16px)] bg-slate-950 text-slate-100 rounded-xl overflow-hidden ring-1 ring-slate-800">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/70 backdrop-blur px-4 py-3 flex items-center gap-3">
        <div className="text-sm text-slate-300 min-w-[260px] inline-flex items-center gap-2">
          <IconRoute /> Execution Planner
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Tag tone="slate">NAV ${fmt(portfolioNotional, 0)}m</Tag>
          <Tag tone="slate">Algo {algo}</Tag>
          <Tag tone={gateReady ? 'emerald' : 'amber'}>
            {gateReady ? 'Within constraints' : 'Tight'}
          </Tag>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 grid grid-cols-12 gap-4">
        {/* Left: Intent, Constraints, & New Panels */}
        <div className="col-span-12 xl:col-span-3 space-y-4">
          <OrderIntentSection
            rows={rows}
            onSetTgt={setTgt}
            toggleChecklistItem={toggleChecklistItem}
          />
          {/* New Route Suggestions Card */}
          <Card title="Route Suggestions" subtitle="Algo & TIF based on risk" right={<Tag tone="blue">Auto</Tag>}>
            <ul className="text-sm text-slate-300 space-y-1">
              {routeSuggestions.map((suggestion, i) => (
                <li key={i} className="text-xs">{suggestion}</li>
              ))}
            </ul>
            <div className="text-xs text-slate-500 mt-1">Suggestions update with alerts/downside.</div>
          </Card>
          {/* New Risk Budget Panel */}
          <Card title="Risk Budget" subtitle="Downside & caps" right={<Tag tone="rose">{riskBudgetData.downside}% downside</Tag>}>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span>Suggested cap:</span>
                <span className="font-semibold">{riskBudgetData.suggestedCap}%</span>
              </div>
              <div className="flex justify-between text-xs text-amber-300">
                <span>Alerts:</span>
                <span>{riskBudgetData.alerts}</span>
              </div>
              {riskBudgetData.alerts > 0 && (
                <div className="text-xs text-amber-400 mt-1">Reduce targets if alerts active.</div>
              )}
            </div>
          </Card>
          <ConstraintsSection
            portfolioNotional={portfolioNotional}
            onPortChange={onPortChange}
            maxPart={maxPart}
            onMaxPartChange={onMaxPartChange}
            algo={algo}
            onAlgoChange={onAlgoChange}
            limitBps={limitBps}
            onLimitBpsChange={onLimitBpsChange}
            tif={tif}
            onTifChange={onTifChange}
            daysHorizon={daysHorizon}
            onDaysChange={onDaysChange}
            toggleChecklistItem={toggleChecklistItem}
            logEvent={logEvent}
            activeStage={activeStage}
          />
        </div>

        {/* Center: Order Plan & Cost Model */}
        <div className="col-span-12 xl:col-span-6 space-y-4">
          <Card
            title="Order Plan"
            subtitle="ADV-aware schedule & limits"
            right={<Tag tone="slate">{algo}</Tag>}
          >
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400">
                  <tr className="border-b border-slate-800">
                    {[
                      'Ticker',
                      'Side',
                      'Δ W%',
                      'Notional ($m)',
                      'Shares',
                      'Px',
                      'Days',
                      '%ADV/day',
                      'Slippage (bps)',
                      'Cost ($m)',
                      'Limit Px'
                    ].map((h) => (
                      <th key={h} className="px-2 py-1 text-left whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plan.map((p) => (
                    <tr key={p.t} className="border-b border-slate-900/60">
                      <td className="px-2 py-1 font-medium">{p.t}</td>
                      <td
                        className={cls(
                          'px-2 py-1',
                          p.side === 'Buy' ? 'text-emerald-300' : 'text-rose-300'
                        )}
                      >
                        {p.side}
                      </td>
                      <td className="px-2 py-1">{fmt(p.deltaW, 1)}</td>
                      <td className="px-2 py-1">{fmt(p.notional, 2)}</td>
                      <td className="px-2 py-1">{fmt(p.shares, 0)}</td>
                      <td className="px-2 py-1">{fmt(p.px, 2)}</td>
                      <td className="px-2 py-1">{p.days}</td>
                      <td className="px-2 py-1">{pct(p.participation, 1)}</td>
                      <td className="px-2 py-1">{p.bps}</td>
                      <td className="px-2 py-1">{fmt(p.cost, 3)}</td>
                      <td className="px-2 py-1">{p.limitPx ? fmt(p.limitPx, 2) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Shares = notional/$; Days = ceil(|notional| / (max%ADV × ADV)). Slippage is a
              heuristic; replace with broker model.
            </div>
          </Card>

          <Card title="Totals & Export" subtitle="Roll-ups and handoff">
            <div className="grid md:grid-cols-4 gap-2">
              <div className="bg-slate-950/50 border border-slate-800 rounded p-2 text-center">
                <div className="text-xs text-slate-400">Buys ($m)</div>
                <div className="text-xl font-semibold">{fmt(totals.buy, 2)}</div>
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded p-2 text-center">
                <div className="text-xs text-slate-400">Sells ($m)</div>
                <div className="text-xl font-semibold">{fmt(totals.sell, 2)}</div>
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded p-2 text-center">
                <div className="text-xs text-slate-400">Est. cost ($m)</div>
                <div className="text-xl font-semibold">{fmt(totals.cost, 3)}</div>
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded p-2 text-center">
                <div className="text-xs text-slate-400">Avg slippage</div>
                <div className="text-xl font-semibold">{totals.avgBps} bps</div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <button
                onClick={handleExport}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800"
              >
                Export CSV
              </button>
              <button
                onClick={handleSendToBroker}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800"
              >
                Send to Broker (stub)
              </button>
            </div>
          </Card>
        </div>

        {/* Right: Risk Checks & Gate */}
        <div className="col-span-12 xl:col-span-3 space-y-4">
          <Card
            title="Risk Checks"
            subtitle="Pre-trade sanity"
            right={<Tag tone={gateReady ? 'emerald' : 'amber'}>{gateReady ? 'OK' : 'Review'}</Tag>}
          >
            <ul className="text-sm text-slate-300 space-y-2">
              {plan.map((p) => (
                <li key={p.t} className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{p.t}</div>
                    <span
                      className={cls(
                        'text-xs',
                        p.days <= daysHorizon ? 'text-emerald-300' : 'text-amber-300'
                      )}
                    >
                      {p.days}d ≤ {daysHorizon}d
                    </span>
                  </div>
                  <div
                    className={cls(
                      'text-xs',
                      p.participation <= maxPart * 1.1 ? 'text-slate-400' : 'text-amber-300'
                    )}
                  >
                    Participation {pct(p.participation, 1)} (cap {pct(maxPart, 0)})
                  </div>
                </li>
              ))}
              {outstandingAlerts.length > 0 && (
                <li className="bg-amber-950/50 border border-amber-800 rounded-md p-2">
                  <div className="text-xs text-amber-300">
                    {outstandingAlerts.length} outstanding alerts
                  </div>
                </li>
              )}
            </ul>
            <div className="text-xs text-slate-500 mt-1">
              All names should satisfy horizon and participation caps; otherwise adjust targets or
              horizon.
            </div>
          </Card>

          <Card
            title="Gate to Monitoring"
            subtitle="Write checklist & alerts"
            right={
              <Tag tone={gateReady ? 'emerald' : 'rose'}>{gateReady ? 'Ready' : 'Not ready'}</Tag>
            }
          >
            <ol className="text-sm text-slate-300 list-decimal list-inside space-y-1">
              <li>Confirm order plan constraints met</li>
              <li>Attach execution rationale</li>
              <li>Define alert bands (price, KPI, PnL)</li>
            </ol>
            <button
              disabled={!gateReady}
              onClick={handleOpenMonitoring}
              className={cls(
                'mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border',
                gateReady
                  ? 'bg-violet-600 hover:bg-violet-500 text-white border-violet-500'
                  : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
              )}
            >
              Open Monitoring & Journal <IconNext />
            </button>
            <button
              onClick={handleHome}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border bg-slate-900 border-slate-800"
            >
              <IconHome /> Home / Daily Brief
            </button>
          </Card>

          <Card
            title="Warnings"
            subtitle="Things to watch"
            right={
              <Tag tone="amber">
                <IconWarn /> risk
              </Tag>
            }
          >
            <ul className="text-sm text-amber-300 space-y-1">
              <li>High participation ≥ cap may increase slippage non-linearly.</li>
              <li>Illiquid names risk partial fills under Day TIF.</li>
              <li>Limit ladder can miss if market drifts away.</li>
              {outstandingAlerts.map((alert: any) => (
                <li key={alert.id}>Alert: {alert.title}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="h-28 border-t border-slate-800 bg-slate-950/80 p-2 flex gap-2">
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 overflow-y-auto">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Notes</div>
          <div className="text-sm text-slate-300">
            Set **targets** and **constraints**; the planner converts Δ weight into notional,
            shares, days, and a rough slippage/cost. Gate to **Monitoring** opens once horizon and
            participation rules pass.
          </div>
        </div>
        <div className="w-80 bg-slate-900 border border-slate-800 rounded-lg p-2">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Keyboard</div>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>
              <span className="text-slate-500">⌘P</span> Open object
            </li>
            <li>
              <span className="text-slate-500">⌘/</span> Toggle Inspector
            </li>
            <li>
              <span className="text-slate-500">⌘J</span> Next Stage
            </li>
          </ul>
        </div>
      </div>

      {/* Dev Test */}
      <div className="hidden">
        <Card title="Parser Test" subtitle="Ensure symbols render" right={null}>
          <div className="text-sm text-slate-300">
            Checks: {`Participation ≤ cap`}, {`Horizon ≥ days`}, {`ΔW computed`},{' '}
            {`Downside: ${simulation?.downsideProbability}%`}
          </div>
        </Card>
      </div>
    </div>
  )
}
