// MadLab / Valor‑IVX — Watchlists & Portfolios (Production Render v1)
// Layout: Left Watchlists & Filters • Center Holdings & Analytics • Right Risk, Factor Mix & Rebalance Gate
// Notes: No external libs. Icons wrapped. Avoid raw '>' in JSX text (use ≥ or \u003e). Client‑side stubs only.

import React, { useMemo, useState, useCallback } from 'react'
import {
  MemoizedCard,
  MemoizedTag,
  MemoizedSparkline,
  IconList,
  IconPlus,
  IconTrash,
  IconUpDown,
  IconHome,
  IconNext,
  MiniBar,
  cn
} from '@/lib/workbench-ui.tsx'

// Types
interface Watchlist {
  id: number
  name: string
  tags: string[]
}

interface Holding {
  t: string
  name: string
  w: number // weight
  px: number // price
  cost: number // cost basis
  pl: number // P&L %
  mcap: number // market cap $m
  adv: number // average daily volume $m
  fcfY: number // FCF yield %
  roic: number // ROIC %
  netDebtEBITDA: number // net debt/EBITDA
  spark: number[] // trend data
}

interface Target {
  t: string
  tgt: number
}

interface FilterState {
  minFCFY: number
  maxDebt: number
  minROIC: number
  liquidity: string
}

// Memoized component for better performance
function MadLab_WatchlistsPortfolios_Prod() {
  const [activeWL, setActiveWL] = useState('Small‑Cap Alpha')
  const [watchlists, setWatchlists] = useState<Watchlist[]>([
    { id: 1, name: 'Small‑Cap Alpha', tags: ['small', 'cash‑rich'] },
    { id: 2, name: 'Micro/Illiquid Hunt', tags: ['micro', '≤ $100m ADV'] },
    { id: 3, name: 'Specials Watch', tags: ['events', 'spin‑offs'] }
  ])

  const [holdings, setHoldings] = useState<Holding[]>([
    {
      t: 'TKR',
      name: 'Takuru Systems',
      w: 3.0,
      px: 41.2,
      cost: 39.8,
      pl: 3.5,
      mcap: 1200,
      adv: 6.0,
      fcfY: 6.2,
      roic: 18,
      netDebtEBITDA: 0.2,
      spark: [-0.5, 0.3, 1.1, 0.4, 1.4, 0.8, 2.3]
    },
    {
      t: 'ACME',
      name: 'Acme Platforms',
      w: 2.0,
      px: 21.4,
      cost: 24.0,
      pl: -10.8,
      mcap: 850,
      adv: 4.2,
      fcfY: 4.9,
      roic: 12,
      netDebtEBITDA: 0.9,
      spark: [0.2, -0.4, -1.1, -0.6, 0.1, 0.4, 0.2]
    },
    {
      t: 'NTR',
      name: 'Nutrimax',
      w: 1.5,
      px: 12.9,
      cost: 10.5,
      pl: 22.9,
      mcap: 460,
      adv: 1.3,
      fcfY: 8.1,
      roic: 14,
      netDebtEBITDA: -0.1,
      spark: [-0.2, 0.1, 0.6, 0.8, 1.2, 1.6, 1.9]
    }
  ])

  const [filters, setFilters] = useState<FilterState>({
    minFCFY: 0,
    maxDebt: 3,
    minROIC: 0,
    liquidity: 'All'
  })
  const [sortKey, setSortKey] = useState<keyof Holding>('w')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const [targets, setTargets] = useState<Target[]>([
    { t: 'TKR', tgt: 3.0 },
    { t: 'ACME', tgt: 2.0 },
    { t: 'NTR', tgt: 2.0 }
  ])

  // Memoized event handlers for performance
  const handleAddTicker = useCallback(() => {
    const t = prompt('Ticker? (e.g., ABC)')
    if (!t) return
    setHoldings((prev) => [
      ...prev,
      {
        t: t.toUpperCase(),
        name: 'New Co.',
        w: 0.0,
        px: 10,
        cost: 10,
        pl: 0,
        mcap: 200,
        adv: 0.5,
        fcfY: 5,
        roic: 10,
        netDebtEBITDA: 0.0,
        spark: [0, 0, 0, 0, 0, 0, 0]
      }
    ])
  }, [])

  const handleRemoveTicker = useCallback((t: string) => {
    setHoldings((prev) => prev.filter((x) => x.t !== t))
  }, [])

  const handleToggleSort = useCallback(
    (k: keyof Holding) => {
      if (sortKey === k) {
        setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortKey(k)
        setSortDir('desc')
      }
    },
    [sortKey]
  )

  const handleSetTarget = useCallback((t: string, v: number) => {
    setTargets((prev) =>
      prev.some((x) => x.t === t)
        ? prev.map((x) => (x.t === t ? { ...x, tgt: v } : x))
        : [...prev, { t, tgt: v }]
    )
  }, [])

  // Memoized utility functions
  const formatNumber = useCallback((n: number, d: number = 2): string => {
    return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : '-'
  }, [])

  const formatPercentage = useCallback(
    (x: number, d: number = 2): string => {
      return `${formatNumber(x, d)}%`
    },
    [formatNumber]
  )

  const formatCurrency = useCallback(
    (x: number, d: number = 2): string => {
      return `$${formatNumber(x, d)}m`
    },
    [formatNumber]
  )

  // Memoized data processing
  const filtered = useMemo(
    () =>
      holdings.filter((h) => {
        if (h.fcfY < filters.minFCFY) return false
        if (Math.abs(h.netDebtEBITDA) > filters.maxDebt) return false
        if (h.roic < filters.minROIC) return false
        if (filters.liquidity === 'Low' && h.adv >= 3) return false
        if (filters.liquidity === 'High' && h.adv < 3) return false
        return true
      }),
    [holdings, filters]
  )

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const da = (a as any)[sortKey]
        const db = (b as any)[sortKey]
        const s = da === db ? 0 : da > db ? 1 : -1
        return sortDir === 'asc' ? s : -s
      }),
    [filtered, sortKey, sortDir]
  )

  const totals = useMemo(
    () => ({
      w: sorted.reduce((s, x) => s + x.w, 0),
      pl: sorted.reduce((s, x) => s + x.w * (x.pl / 100), 0),
      fcfW:
        sorted.reduce((s, x) => s + x.w * x.fcfY, 0) /
        Math.max(
          1,
          sorted.reduce((s, x) => s + x.w, 0)
        ),
      roicW:
        sorted.reduce((s, x) => s + x.w * x.roic, 0) /
        Math.max(
          1,
          sorted.reduce((s, x) => s + x.w, 0)
        )
    }),
    [sorted]
  )

  // Factor mix (demo): Value, Quality, Momentum, Size (0..100)
  const factors = useMemo(
    () => ({
      Value: Math.max(0, Math.min(100, Math.round(60 + (totals.fcfW - 5) * 4))),
      Quality: Math.max(0, Math.min(100, Math.round(55 + (totals.roicW - 12) * 2))),
      Momentum: 45,
      Size: Math.max(
        0,
        Math.min(100, Math.round(70 - sorted.reduce((s, x) => s + x.mcap, 0) / sorted.length / 200))
      )
    }),
    [totals, sorted]
  )

  const rebalance = useMemo(
    () =>
      sorted.map((x) => {
        const tgt = targets.find((y) => y.t === x.t)?.tgt ?? 0
        const delta = tgt - x.w
        const notional = delta * 1.0 // assume $1m portfolio per 1% weight, for demo
        const days = Math.ceil(Math.abs(notional) / Math.max(0.01, x.adv)) // adv=m$ per day
        return { ...x, tgt, delta, notional, days }
      }),
    [sorted, targets]
  )

  const coverageOK = useMemo(
    () => rebalance.every((r) => Math.abs(r.delta) < 5 && r.days <= 20),
    [rebalance]
  )

  // Table headers configuration
  const tableHeaders = useMemo(
    () => [
      ['t', 'Ticker'],
      ['name', 'Name'],
      ['w', 'Weight %'],
      ['pl', 'P&L %'],
      ['px', 'Price'],
      ['mcap', 'MCap $m'],
      ['adv', 'ADV $m/d'],
      ['fcfY', 'FCF yield %'],
      ['roic', 'ROIC %'],
      ['netDebtEBITDA', 'Net debt/EBITDA'],
      ['spark', 'Trend']
    ],
    []
  )

  return (
    <div className="w-full min-h-[calc(100vh-16px)] bg-slate-950 text-slate-100 rounded-xl overflow-hidden ring-1 ring-slate-800">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/70 backdrop-blur px-4 py-3 flex items-center gap-3">
        <div className="text-sm text-slate-300 min-w-[260px] inline-flex items-center gap-2">
          <span className="text-violet-400">
            <IconList />
          </span>
          Watchlists & Portfolios
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <MemoizedTag tone="slate">Active {activeWL}</MemoizedTag>
          <MemoizedTag tone="slate">Tickers {holdings.length}</MemoizedTag>
          <MemoizedTag tone="slate">Coverage {formatPercentage(totals.w, 1)}</MemoizedTag>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 grid grid-cols-12 gap-4">
        {/* Left: Watchlists & Filters */}
        <div className="col-span-12 xl:col-span-3 space-y-4">
          <MemoizedCard
            title="Watchlists"
            subtitle="Choose or create"
            right={
              <button
                onClick={handleAddTicker}
                className="text-xs text-slate-300 inline-flex items-center gap-1"
              >
                <IconPlus /> Add Ticker
              </button>
            }
          >
            <ul className="text-sm text-slate-300 space-y-2">
              {watchlists.map((w) => (
                <li
                  key={w.id}
                  className={cn(
                    'bg-slate-950/50 border rounded-md p-2 flex items-center justify-between cursor-pointer hover:bg-slate-900/60',
                    activeWL === w.name ? 'border-violet-600' : 'border-slate-800'
                  )}
                  onClick={() => setActiveWL(w.name)}
                >
                  <span className="truncate">{w.name}</span>
                  <MemoizedTag tone={activeWL === w.name ? 'violet' : 'slate'}>
                    {w.tags.join(' • ')}
                  </MemoizedTag>
                </li>
              ))}
            </ul>
          </MemoizedCard>

          <MemoizedCard title="Filters" subtitle="Narrow the list">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label>
                Min FCFY %
                <input
                  type="number"
                  value={filters.minFCFY}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, minFCFY: parseFloat(e.target.value || '0') }))
                  }
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1"
                />
              </label>
              <label>
                Max |Net debt/EBITDA|
                <input
                  type="number"
                  step="0.1"
                  value={filters.maxDebt}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, maxDebt: parseFloat(e.target.value || '0') }))
                  }
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1"
                />
              </label>
              <label>
                Min ROIC %
                <input
                  type="number"
                  value={filters.minROIC}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, minROIC: parseFloat(e.target.value || '0') }))
                  }
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1"
                />
              </label>
              <label>
                Liquidity
                <select
                  value={filters.liquidity}
                  onChange={(e) => setFilters((f) => ({ ...f, liquidity: e.target.value }))}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1"
                >
                  {['All', 'Low', 'High'].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </MemoizedCard>

          <MemoizedCard title="Factor Mix (est.)" subtitle="0–100 scale">
            <div className="space-y-2">
              <MiniBar label="Value" value={factors.Value} right={`${factors.Value}%`} />
              <MiniBar label="Quality" value={factors.Quality} right={`${factors.Quality}%`} />
              <MiniBar label="Momentum" value={factors.Momentum} right={`${factors.Momentum}%`} />
              <MiniBar label="Size (Sm)" value={factors.Size} right={`${factors.Size}%`} />
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Heuristics only; in production use a risk model.
            </div>
          </MemoizedCard>
        </div>

        {/* Center: Holdings */}
        <div className="col-span-12 xl:col-span-6 space-y-4">
          <MemoizedCard
            title="Holdings & Candidates"
            subtitle="Sortable; click headers to sort"
            right={
              <span className="text-xs text-slate-400 inline-flex items-center gap-1">
                <IconUpDown /> sort
              </span>
            }
          >
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400">
                  <tr className="border-b border-slate-800">
                    {tableHeaders.map(([k, h]) => (
                      <th
                        key={k}
                        onClick={() => handleToggleSort(k as keyof Holding)}
                        className="px-2 py-1 text-left whitespace-nowrap cursor-pointer hover:text-slate-200"
                      >
                        {h}
                      </th>
                    ))}
                    <th className="px-2 py-1" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((x) => (
                    <tr key={x.t} className="border-b border-slate-900/60 hover:bg-slate-900/40">
                      <td className="px-2 py-1 font-medium">{x.t}</td>
                      <td className="px-2 py-1 text-slate-300 truncate max-w-[200px]">{x.name}</td>
                      <td className="px-2 py-1">{formatNumber(x.w, 1)}</td>
                      <td
                        className={cn(
                          'px-2 py-1',
                          x.pl >= 0 ? 'text-emerald-300' : 'text-rose-300'
                        )}
                      >
                        {formatNumber(x.pl, 1)}
                      </td>
                      <td className="px-2 py-1">{formatNumber(x.px, 2)}</td>
                      <td className="px-2 py-1">{formatNumber(x.mcap, 0)}</td>
                      <td className="px-2 py-1">{formatNumber(x.adv, 1)}</td>
                      <td className="px-2 py-1">{formatNumber(x.fcfY, 1)}</td>
                      <td className="px-2 py-1">{formatNumber(x.roic, 0)}</td>
                      <td className="px-2 py-1">{formatNumber(x.netDebtEBITDA, 2)}</td>
                      <td className="px-2 py-1">
                        <MemoizedSparkline points={x.spark} height={24} />
                      </td>
                      <td className="px-2 py-1 text-right">
                        <button
                          onClick={() => handleRemoveTicker(x.t)}
                          className="text-xs text-rose-300 hover:text-rose-200 inline-flex items-center gap-1"
                        >
                          <IconTrash /> remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Totals reflect sorted/filtered set only.
            </div>
          </MemoizedCard>

          <MemoizedCard title="Snapshot" subtitle="Weighted metrics & contributions">
            <div className="grid md:grid-cols-3 gap-2">
              <div className="bg-slate-950/50 border border-slate-800 rounded p-2 text-center">
                <div className="text-xs text-slate-400">Coverage (sum weights)</div>
                <div className="text-xl font-semibold">{formatPercentage(totals.w, 1)}</div>
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded p-2 text-center">
                <div className="text-xs text-slate-400">P&L (weighted)</div>
                <div className="text-xl font-semibold">{formatPercentage(totals.pl, 1)}</div>
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded p-2 text-center">
                <div className="text-xs text-slate-400">FCF yield (wtd)</div>
                <div className="text-xl font-semibold">{formatPercentage(totals.fcfW, 1)}</div>
              </div>
            </div>
          </MemoizedCard>
        </div>

        {/* Right: Risk & Rebalance */}
        <div className="col-span-12 xl:col-span-3 space-y-4">
          <MemoizedCard title="Risk Overview" subtitle="Heuristics">
            <ul className="text-sm text-slate-300 space-y-1">
              <li>
                Largest weight: {sorted[0]?.t || '—'} {formatNumber(sorted[0]?.w || 0, 1)}%
              </li>
              <li>
                Avg ADV:{' '}
                {formatNumber(
                  sorted.reduce((s, x) => s + x.adv, 0) / Math.max(1, sorted.length),
                  2
                )}{' '}
                m$/d
              </li>
              <li>
                Net leverage mix: median |Net debt/EBITDA|{' '}
                {formatNumber(
                  [...sorted].sort((a, b) => Math.abs(a.netDebtEBITDA) - Math.abs(b.netDebtEBITDA))[
                    Math.floor((sorted.length - 1) / 2)
                  ]?.netDebtEBITDA ?? 0,
                  2
                )}
              </li>
              <li>
                Micro share:{' '}
                {formatPercentage(
                  (sorted.filter((x) => x.mcap < 500).length / Math.max(1, sorted.length)) * 100,
                  1
                )}
              </li>
            </ul>
            <div className="text-xs text-slate-500 mt-1">
              In production, hook to a risk model and constraints engine.
            </div>
          </MemoizedCard>

          <MemoizedCard
            title="Targets & Rebalance"
            subtitle="Set target %; preview days"
            right={
              <MemoizedTag tone={coverageOK ? 'emerald' : 'amber'}>
                {coverageOK ? 'Feasible' : 'Tight'}
              </MemoizedTag>
            }
          >
            <ul className="text-sm text-slate-300 space-y-2">
              {rebalance.map((r) => (
                <li key={r.t} className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{r.t}</div>
                    <div className="text-xs text-slate-500">cur {formatNumber(r.w, 1)}%</div>
                  </div>
                  <div className="mt-1 grid grid-cols-3 gap-2 items-center">
                    <label className="col-span-2">
                      Target %
                      <input
                        type="number"
                        step="0.1"
                        value={r.tgt}
                        onChange={(e) => handleSetTarget(r.t, parseFloat(e.target.value || '0'))}
                        className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1"
                      />
                    </label>
                    <div
                      className={cn(
                        'text-right text-xs',
                        Math.abs(r.delta) <= 1 ? 'text-slate-400' : 'text-amber-300'
                      )}
                    >
                      Δ {formatNumber(r.delta, 1)}%
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Est. notional: {formatCurrency(Math.abs(r.notional), 1)} • Days: {r.days}
                  </div>
                </li>
              ))}
            </ul>
            <button
              className={cn(
                'mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border',
                coverageOK
                  ? 'bg-violet-600 hover:bg-violet-500 text-white border-violet-500'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              )}
            >
              Open Execution Planner <IconNext />
            </button>
          </MemoizedCard>

          <MemoizedCard
            title="Close the Loop"
            subtitle="Back to Home"
            right={<MemoizedTag tone="slate">nav</MemoizedTag>}
          >
            <button className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border bg-slate-900 border-slate-800">
              <IconHome /> Home / Daily Brief
            </button>
          </MemoizedCard>
        </div>
      </div>

      {/* Footer */}
      <div className="h-28 border-t border-slate-800 bg-slate-950/80 p-2 flex gap-2">
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 overflow-y-auto">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Notes</div>
          <div className="text-sm text-slate-300">
            Use **Filters** to narrow candidates (FCF yield, leverage, ROIC, liquidity). Sort
            columns to focus attention. **Targets & Rebalance** estimates ADV‑aware days; the button
            hands off to **Execution Planner**. Factor mix is a heuristic stub — replace with a
            proper risk model.
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
        <MemoizedCard title={'Parser Test'} subtitle={'Ensure symbols render'}>
          <div className="text-sm text-slate-300">
            Rules: {'FCFY ≥ 5%'}, {'|Net debt/EBITDA| <= 3'}, {'ADV/day sufficient'}
          </div>
        </MemoizedCard>
      </div>
    </div>
  )
}

// Export alias for stage-tabs.tsx
export const WatchlistsPortfolios = React.memo(MadLab_WatchlistsPortfolios_Prod)
