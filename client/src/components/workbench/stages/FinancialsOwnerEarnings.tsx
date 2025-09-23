// MadLab / Valor‑IVX — Financials Workbench (Owner‑Earnings Build) — Production Render v1.0
// Design: Prompt‑first tri‑pane. Inputs (normalized statements) → Owner‑earnings bridge → Working capital & maintenance capex → Outputs → Gate → Next.
// Parser safety: wrap SVGs in components; escape raw '>' as \u003e in strings.
// Refactored: Uses shared UI components, optimized performance, enhanced accessibility

import React, { useMemo, useState, useCallback } from 'react'
import {
  MemoizedCard,
  MemoizedTag,
  MemoizedSparkline,
  IconSearch,
  IconClock,
  IconBolt,
  IconCheck,
  IconNext,
  formatCurrency,
  formatPercentage,
  cls
} from '@/lib/workbench-ui.tsx'

// Types
interface HistoryItem {
  q: string
  t: string
}

interface OwnerEarningsData {
  nopat: number
  maintenanceCapex: number
  wc: number
  adjustments: number
  oe: number
}

// Memoized component for better performance
export function MadLab_Financials_OwnerEarnings_Prod() {
  const [prompt, setPrompt] = useState('')
  const [history, setHistory] = useState<HistoryItem[]>([])

  // Inputs (would be provided by Data & Adjustments stage)
  const normalized = {
    revenue: 2102, // $m TTM
    ebit: 348,
    taxes: 56,
    dep: 120,
    capex_mnt: 75,
    wc_delta: -18, // negative = release
    leases_adj: -12,
    sbc_adj: -95,
    nonrecurring: -22
  }

  // Owner earnings bridge (toy) - optimized with proper typing
  const ownerEarnings: OwnerEarningsData = useMemo(() => {
    const nopat = normalized.ebit - normalized.taxes // simplified
    const maintenanceCapex = normalized.capex_mnt
    const wc = normalized.wc_delta
    const adjustments = normalized.leases_adj + normalized.sbc_adj + normalized.nonrecurring
    const oe = nopat + normalized.dep - maintenanceCapex + wc + adjustments
    return { nopat, maintenanceCapex, wc, adjustments, oe }
  }, [normalized])

  // Memoized event handlers for performance
  const handlePromptSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!prompt.trim()) return
      const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setHistory((prev) => [{ q: prompt.trim(), t }, ...prev].slice(0, 8))
      setPrompt('')
    },
    [prompt]
  )

  const handleNext = useCallback(() => {
    const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setHistory((prev) => [{ q: '[Gate] Proceed to Valuation', t }, ...prev].slice(0, 8))
  }, [])

  // Trends (toy)
  const revSeries = [1820, 1890, 1970, 2050, 2102]
  const oeSeries = [120, 138, 150, 170, Math.max(0, ownerEarnings.oe)]

  // Reviewer affirmation
  const [numbersMatchNarrative, setNumbersMatchNarrative] = useState(false)
  const [assumptionsTagged, setAssumptionsTagged] = useState(false)
  const gatePassed = numbersMatchNarrative && assumptionsTagged

  return (
    <div className="w-full min-h-[calc(100vh-16px)] bg-slate-950 text-slate-100 rounded-xl overflow-hidden ring-1 ring-slate-800">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/70 backdrop-blur px-4 py-3 flex items-center gap-3">
        <div className="text-sm text-slate-300 flex items-center gap-2 min-w-[260px]">
          <span className="text-slate-500">Financials /</span>
          <span className="font-medium text-slate-100">Owner‑Earnings</span>
          <span className="text-slate-600">•</span>
          <span className="inline-flex items-center gap-1 text-slate-400">
            <IconClock /> <span>09:30 MT</span>
          </span>
        </div>
        <form
          onSubmit={handlePromptSubmit}
          className="flex-1 flex items-center gap-2"
          role="search"
        >
          <div className="flex-1 flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
            <span className="text-slate-500">
              <IconSearch />
            </span>
            <input
              className="bg-transparent outline-none text-sm text-slate-100 placeholder-slate-500 w-full"
              placeholder={
                "Ask… e.g., 'explain OE bridge; test 5y maintenance capex; reconcile vs cash flow'"
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <MemoizedTag tone="violet">Omni‑Prompt</MemoizedTag>
          </div>
          <button
            type="submit"
            className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm"
          >
            Send
          </button>
        </form>
      </div>

      {/* Body grid */}
      <div className="p-4 grid grid-cols-12 gap-4">
        {/* Left: Inputs & mini statements */}
        <div className="col-span-12 xl:col-span-3 space-y-4">
          <MemoizedCard
            title="Normalized Inputs"
            subtitle="From Data & Adjustments"
            right={<MemoizedTag tone="slate">TTM</MemoizedTag>}
          >
            <ul className="text-sm text-slate-200 space-y-1">
              <li>Revenue: {formatCurrency(normalized.revenue)}</li>
              <li>EBIT: {formatCurrency(normalized.ebit)}</li>
              <li>Taxes: {formatCurrency(normalized.taxes)}</li>
              <li>Depreciation: {formatCurrency(normalized.dep)}</li>
              <li>Maint. Capex: {formatCurrency(normalized.capex_mnt)}</li>
              <li>Working capital Δ: {formatCurrency(normalized.wc_delta)}</li>
              <li>Lease adj.: {formatCurrency(normalized.leases_adj)}</li>
              <li>SBC adj.: {formatCurrency(normalized.sbc_adj)}</li>
              <li>Non‑rec.: {formatCurrency(normalized.nonrecurring)}</li>
            </ul>
          </MemoizedCard>

          <MemoizedCard
            title="Mini Statements"
            subtitle="TTM trend lines"
            right={<MemoizedTag tone="slate">Charts</MemoizedTag>}
          >
            <div className="grid gap-3">
              <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800">
                <div className="text-xs text-slate-400 mb-1">Revenue</div>
                <MemoizedSparkline points={revSeries} />
                <div className="text-xs text-slate-500">TTM growth +11.2%</div>
              </div>
              <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800">
                <div className="text-xs text-slate-400 mb-1">Owner Earnings</div>
                <MemoizedSparkline points={oeSeries} />
                <div className="text-xs text-slate-500">
                  Margin anchor {formatPercentage(ownerEarnings.oe / normalized.revenue)}
                </div>
              </div>
            </div>
          </MemoizedCard>
        </div>

        {/* Center: Owner‑Earnings Bridge */}
        <div className="col-span-12 xl:col-span-6 space-y-4">
          <MemoizedCard
            title="Owner‑Earnings Bridge"
            subtitle="From NOPAT to OE"
            right={<MemoizedTag tone="slate">Bridge</MemoizedTag>}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-slate-400">
                  <tr>
                    {['Step', 'Amount ($m)', 'Note'].map((h) => (
                      <th key={h} className="py-1">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  <tr className="border-t border-slate-800">
                    <td className="py-1">EBIT − Taxes (NOPAT)</td>
                    <td className="py-1">{formatCurrency(ownerEarnings.nopat)}</td>
                    <td className="py-1">Tax rate simplification</td>
                  </tr>
                  <tr className="border-t border-slate-800">
                    <td className="py-1">+ Depreciation</td>
                    <td className="py-1">{formatCurrency(normalized.dep)}</td>
                    <td className="py-1">Non‑cash</td>
                  </tr>
                  <tr className="border-t border-slate-800">
                    <td className="py-1">− Maintenance capex</td>
                    <td className="py-1">{formatCurrency(ownerEarnings.maintenanceCapex)}</td>
                    <td className="py-1">Sustain operations</td>
                  </tr>
                  <tr className="border-t border-slate-800">
                    <td className="py-1">± Working capital Δ</td>
                    <td className="py-1">{formatCurrency(ownerEarnings.wc)}</td>
                    <td className="py-1">Release (−) or use (+)</td>
                  </tr>
                  <tr className="border-t border-slate-800">
                    <td className="py-1">± Other adjustments</td>
                    <td className="py-1">{formatCurrency(ownerEarnings.adjustments)}</td>
                    <td className="py-1">Leases, SBC, non‑rec.</td>
                  </tr>
                  <tr className="border-t border-slate-800 font-semibold">
                    <td className="py-1">= Owner earnings</td>
                    <td className="py-1">{formatCurrency(ownerEarnings.oe)}</td>
                    <td className="py-1">Baseline</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </MemoizedCard>

          <MemoizedCard
            title="Working Capital & Maintenance Capex"
            subtitle="Assumptions with provenance"
            right={<MemoizedTag tone="slate">Rules</MemoizedTag>}
          >
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800 space-y-2">
                <div className="text-xs text-slate-400">Working capital cycle</div>
                <div className="text-slate-100 text-lg">{formatCurrency(ownerEarnings.wc)}</div>
                <div className="text-xs text-slate-500">
                  Rule: seasonal average; tag to disclosures.
                </div>
              </div>
              <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800 space-y-2">
                <div className="text-xs text-slate-400">Maintenance capex</div>
                <div className="text-slate-100 text-lg">
                  {formatCurrency(ownerEarnings.maintenanceCapex)}
                </div>
                <div className="text-xs text-slate-500">
                  Rule: capex split; cross‑check vs depreciation.
                </div>
              </div>
            </div>
          </MemoizedCard>
        </div>

        {/* Right: Reviewer check & Gate */}
        <div className="col-span-12 xl:col-span-3 space-y-4">
          <MemoizedCard
            title="Reviewer Check"
            subtitle="Numbers tell same story as map?"
            right={
              <MemoizedTag tone={numbersMatchNarrative ? 'emerald' : 'amber'}>
                {numbersMatchNarrative ? 'OK' : 'Check'}
              </MemoizedTag>
            }
          >
            <ul className="text-sm space-y-2">
              <li className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-violet-500"
                  checked={numbersMatchNarrative}
                  onChange={() => setNumbersMatchNarrative((v) => !v)}
                  aria-label="Numbers align with Business Map"
                />
                Numbers align with Business Map
              </li>
              <li className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-violet-500"
                  checked={assumptionsTagged}
                  onChange={() => setAssumptionsTagged((v) => !v)}
                  aria-label="Assumptions tagged to evidence"
                />
                Assumptions tagged to evidence
              </li>
            </ul>
          </MemoizedCard>

          <MemoizedCard
            title="Key Ratios (TTM)"
            subtitle="Owner‑oriented"
            right={<MemoizedTag tone="slate">Auto</MemoizedTag>}
          >
            <ul className="text-sm text-slate-200 space-y-1">
              <li>OE margin: {formatPercentage(ownerEarnings.oe / normalized.revenue)}</li>
              <li>
                Reinvestment rate:{' '}
                {formatPercentage(ownerEarnings.maintenanceCapex / (ownerEarnings.oe || 1))}
              </li>
              <li>
                Cash conversion:{' '}
                {formatPercentage(
                  (ownerEarnings.oe + normalized.capex_mnt - normalized.dep) /
                    (normalized.ebit - normalized.taxes || 1)
                )}
              </li>
            </ul>
          </MemoizedCard>

          <MemoizedCard
            title="Stage Gate"
            subtitle="Enable Next"
            right={
              <MemoizedTag tone={gatePassed ? 'emerald' : 'amber'}>
                {gatePassed ? 'Ready' : 'Incomplete'}
              </MemoizedTag>
            }
          >
            <ul className="text-sm space-y-2">
              <li className="flex items-center gap-2">
                <IconCheck />
                <span>Reviewer: numbers & narrative align</span>
              </li>
              <li className="flex items-center gap-2">
                <IconCheck />
                <span>Assumptions tagged to citations</span>
              </li>
            </ul>
            <button
              disabled={!gatePassed}
              onClick={handleNext}
              className={cls(
                'mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border',
                gatePassed
                  ? 'bg-violet-600 hover:bg-violet-500 text-white border-violet-500'
                  : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
              )}
              title={gatePassed ? 'Proceed to Valuation' : 'Complete reviewer checks first'}
              aria-label={
                gatePassed ? 'Proceed to Valuation stage' : 'Complete reviewer checks first'
              }
            >
              Next <IconNext />
            </button>
          </MemoizedCard>
        </div>
      </div>

      {/* Footer console */}
      <div className="h-36 border-t border-slate-800 bg-slate-950/80 p-2 flex gap-2">
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 overflow-y-auto">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Prompt History</div>
          <div className="space-y-1 text-sm">
            {history.length === 0 && <div className="text-slate-500">No prompts yet.</div>}
            {history.map((h, i) => (
              <div key={i} className="flex items-start gap-2 bg-slate-950/50 rounded-md p-2">
                <span className="text-violet-300 mt-0.5">
                  <IconBolt />
                </span>
                <div className="flex-1">
                  <div className="text-slate-200">{h.q}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{h.t}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-72 bg-slate-900 border border-slate-800 rounded-lg p-2 overflow-y-auto">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Shortcuts</div>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>
              <span className="text-slate-500">⌘K</span> Omni‑Prompt
            </li>
            <li>
              <span className="text-slate-500">G then F</span> Go to Financials
            </li>
            <li>
              <span className="text-slate-500">J</span> Next Stage
            </li>
          </ul>
        </div>
      </div>

      {/* Dev Test (render-only) */}
      <div className="hidden" aria-hidden="true">
        <MemoizedCard
          title={'Parser Test — Symbols and Icons'}
          subtitle={"Ensures '>' and icons render without parse errors"}
          right={<MemoizedTag tone="slate">Test</MemoizedTag>}
        >
          <div className="text-sm text-slate-300 space-y-2">
            <div>Edge text: {'Target OE margin \u003e= 10%'}</div>
            <div className="inline-flex items-center gap-2">
              Icons: <IconSearch /> <IconBolt /> <IconClock /> <IconNext /> <IconCheck />
            </div>
          </div>
        </MemoizedCard>
      </div>
    </div>
  )
}

// Export alias for stage-tabs.tsx
export { MadLab_Financials_OwnerEarnings_Prod as FinancialsOwnerEarnings }
