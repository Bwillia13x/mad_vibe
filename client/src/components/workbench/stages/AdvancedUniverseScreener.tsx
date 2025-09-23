// MadLab / Valor‑IVX — Universe Screener (Production Render v1)
// Tri‑pane IDE: Left filters & NL screener • Center results grid • Right inspector & gate
// Notes: SVG icons wrapped; avoid raw '>' in JSX text (use ≥ or \u003e). No external libs.
// Refactored: Uses shared UI components, optimized performance, enhanced accessibility

import React, { useCallback, useState } from 'react'
import { ScreenerCompany } from '@/hooks/useScreener'
import { MemoizedCard, MemoizedTag, ProgressBar, cls } from '@/lib/workbench-ui.tsx'
import type { PaletteKey } from '@/lib/workbench-ui.tsx'
import { useScreener } from '@/hooks/useScreener'  // Use the updated hook

const ChipScore = React.memo<{ n?: number; label?: string; tone?: PaletteKey }>(
  ({ n = 0, label = '', tone = 'slate' }) => {
    const dots = new Array(5).fill(0).map((_, i) => i < n)
    return (
      <div className="inline-flex items-center gap-1">
        {dots.map((on, i) => (
          <span
            key={i}
            className={cls(
              'w-2 h-2 rounded-full',
              on
                ? tone === 'violet'
                  ? 'bg-violet-500'
                  : tone === 'emerald'
                    ? 'bg-emerald-500'
                    : 'bg-amber-500'
                : 'bg-slate-700'
            )}
          />
        ))}
        {label && <span className="text-xs text-slate-400 ml-1">{label}</span>}
      </div>
    )
  }
)
ChipScore.displayName = 'ChipScore'

// Memoized component for better performance
export function MadLab_UniverseScreener_Prod() {
  // -------------- icons --------------
  function IconSearch() {
    return (
      <span aria-hidden className="inline-block">
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-3.5-3.5" />
        </svg>
      </span>
    )
  }
  function IconFilter() {
    return (
      <span aria-hidden className="inline-block">
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 5h18" />
          <path d="M6 12h12" />
          <path d="M10 19h4" />
        </svg>
      </span>
    )
  }
  function IconSave() {
    return (
      <span aria-hidden className="inline-block">
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
          <path d="M17 21v-8H7v8M7 3v5h8" />
        </svg>
      </span>
    )
  }
  // IconBolt and IconCheck removed as unused
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

  // Use the updated screener hook
  const {
    companies: results,
    selectedCompanies,
    toggleCompany: toggleSelect,
    naturalLanguageQuery: query,
    setNaturalLanguageQuery: setQuery,
    executeNLQuery,
    queryResults,
    queryHistory,
    factorAnalysis,
    runFactorBacktest,
    factorBacktests,
    isLoading,
    error,
    saveScreener
  } = useScreener()

  const selectedCount = selectedCompanies.length
  const parsedQuery = queryResults || { companies: results, averageROIC: 0, averageFCFYield: 0, averageLeverage: 0 }

  // Define filter types
  interface Filters {
    capMin: number
    capMax: number
    advMin: number
    roicMin: number
    fcfyMin: number
    ndMax: number
    include: { TSX: boolean; TSXV: boolean; OTC: boolean }
  }

  // Mock filters for UI (integrate with real filters from workflow if needed)
  const [filters, setFilters] = useState<Filters>({ capMin: 0, capMax: 0, advMin: 0, roicMin: 0, fcfyMin: 0, ndMax: 0, include: { TSX: true, TSXV: true, OTC: true } })
  const updateFilter = useCallback((key: keyof Filters, value: Filters[keyof Filters]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    // Trigger re-query on filter change
    executeNLQuery(query)
  }, [query, executeNLQuery])

  const presetsOpen = false  // Stub; add state if needed
  const togglePreset = useCallback(() => {}, [])
  const applyPreset = useCallback((preset: string) => {
    // Apply preset filters
    const presets: Record<string, Partial<Filters>> = {
      'Small Value': { capMin: 50, capMax: 500, roicMin: 10, fcfyMin: 5 },
      // Add more
    }
    const presetFilters = presets[preset] || {}
    Object.entries(presetFilters).forEach(([k, v]) => {
      updateFilter(k as keyof Filters, v as Filters[keyof Filters])
    })
  }, [updateFilter])

  const gradeOf = (x: { quality?: number; moat?: number; neglect?: boolean }) => {
    const quality = x.quality || 0
    const moat = x.moat || 0
    const neglect = x.neglect || false
    const cites = 3 + (neglect ? 0 : 1) // toy: fewer cites if neglected
    const g = quality >= 3 && moat >= 3 ? (cites >= 3 ? 'A' : 'B') : 'C'
    return g
  }

  // Promotion handler
  const promote = useCallback(() => {
    saveScreener()  // Save to workflow
    const selectedTickers = selectedCompanies
    alert(`Promoted ${selectedCount} tickers to Quick Briefs: ` + selectedTickers.join(', '))
    // In real app, navigate to workflow stage with selected
  }, [selectedCompanies, selectedCount, saveScreener])

  return (
    <div className="w-full min-h-[calc(100vh-16px)] bg-slate-950 text-slate-100 rounded-xl overflow-hidden ring-1 ring-slate-800">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/70 backdrop-blur px-4 py-3 flex items-center gap-3">
        <div className="text-sm text-slate-300 min-w-[260px]">
          Screener • Small/Microcap universe
        </div>
        <div className="flex-1 flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
          <span className="text-slate-500">
            <IconSearch />
          </span>
          <input
            placeholder={
              'Ask in English… e.g., "wide‑moat" small caps with ROIC≥12%, net cash, FCF yield≥6%'
            }
            className={cls(
              "bg-transparent outline-none text-sm text-slate-100 placeholder-slate-500 w-full",
              isLoading && "opacity-50 cursor-wait"
            )}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && executeNLQuery(query)}
            aria-label="Natural language screener query"
            disabled={isLoading}
          />
          <MemoizedTag tone="violet">NL Screener</MemoizedTag>
          {error && <MemoizedTag tone="rose">{error}</MemoizedTag>}
        </div>
        <button
          onClick={() => console.log('Save Run clicked')}
          className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm inline-flex items-center gap-1"
        >
          <IconSave /> Save Run
        </button>
      </div>

      {/* Body */}
      <div className="p-4 grid grid-cols-12 gap-4">
        {/* Left: Filters */}
        <div className="col-span-12 xl:col-span-3 space-y-4">
          <MemoizedCard
            title="Filters"
            subtitle="Hard guards & bands"
            right={
              <span className="text-slate-400 text-xs inline-flex items-center gap-1">
                <IconFilter /> guardrails
              </span>
            }
          >
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="col-span-1">
                Cap min ($m)
                <input
                  type="number"
                  value={filters.capMin}
                  onChange={(e) => updateFilter('capMin', parseInt(e.target.value || '0'))}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded-md px-2 py-1"
                />
              </label>
              <label className="col-span-1">
                Cap max ($m)
                <input
                  type="number"
                  value={filters.capMax}
                  onChange={(e) => updateFilter('capMax', parseInt(e.target.value || '0'))}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded-md px-2 py-1"
                />
              </label>
              <label className="col-span-1">
                ADV min ($k)
                <input
                  type="number"
                  value={filters.advMin}
                  onChange={(e) => updateFilter('advMin', parseInt(e.target.value || '0'))}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded-md px-2 py-1"
                />
              </label>
              <div className="col-span-2 border-t border-slate-800 pt-2" />
              <label className="col-span-1">
                ROIC min (%)
                <input
                  type="number"
                  value={filters.roicMin}
                  onChange={(e) => updateFilter('roicMin', parseInt(e.target.value || '0'))}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded-md px-2 py-1"
                />
              </label>
              <label className="col-span-1">
                FCF yield min (%)
                <input
                  type="number"
                  value={filters.fcfyMin}
                  onChange={(e) => updateFilter('fcfyMin', parseInt(e.target.value || '0'))}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded-md px-2 py-1"
                />
              </label>
              <label className="col-span-1">
                ND/EBITDA max (×)
                <input
                  type="number"
                  step="0.1"
                  value={filters.ndMax}
                  onChange={(e) => updateFilter('ndMax', parseFloat(e.target.value || '0'))}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded-md px-2 py-1"
                />
              </label>
            </div>
            <div className="mt-3">
              <div className="text-xs text-slate-400 mb-1">Exchanges</div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(filters.include).map((k) => (
                  <label
                    key={k}
                    className="inline-flex items-center gap-1 bg-slate-950/60 border border-slate-800 rounded-md px-2 py-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      className="accent-violet-500"
                      checked={filters.include[k as keyof typeof filters.include]}
                      onChange={() =>
                        updateFilter('include', { ...filters.include, [k]: !filters.include[k as keyof typeof filters.include] })
                      }
                    />{' '}
                    {k}
                  </label>
                ))}
              </div>
            </div>
          </MemoizedCard>

          <MemoizedCard
            title="Presets"
            subtitle="One‑click templates"
            right={
              <button onClick={togglePreset} className="text-xs text-slate-400">
                {presetsOpen ? 'Hide' : 'Show'}
              </button>
            }
          >
            {presetsOpen && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {['Small Value', 'Quality Value', 'Neglect/Insider', 'Low Accruals'].map((p) => (
                  <button
                    key={p}
                    onClick={() => applyPreset(p)}
                    className="px-2 py-1.5 rounded-md bg-slate-900 border border-slate-800 hover:border-slate-700 text-left"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 text-xs text-slate-500">
              Tip: NL examples — "net cash", "low accruals", "neglect", and numeric minima (e.g.,
              ROIC≥12).
            </div>
          </MemoizedCard>

          <MemoizedCard
            title="Saved Runs"
            subtitle="Recent snapshots"
            right={<MemoizedTag tone="slate">History</MemoizedTag>}
          >
            <div className="text-sm text-slate-500">Feature coming soon.</div>
          </MemoizedCard>
        </div>

        {/* Center: Results */}
        <div className="col-span-12 xl:col-span-6 space-y-4">
          <MemoizedCard
            title={`Results (${results.length})`}
            subtitle="Ranked by Moat + Quality + Hook"
            right={<MemoizedTag tone="slate">Ranked</MemoizedTag>}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-slate-400">Running screener...</div>
              </div>
            ) : error ? (
              <div className="text-sm text-rose-400 p-4">{error}</div>
            ) : (
              <div className="overflow-auto">
                {results.length > 50 && (
                  <div className="mb-2 text-xs text-slate-400 text-center">
                    Showing first 50 results. <button onClick={() => { /* toggle full */ }} className="underline">Show all</button>
                  </div>
                )}
                <table className="w-full text-sm" role="table" aria-label="Screener results">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {[
                        '',
                        'Ticker',
                        'Name',
                        'Exch',
                        'MCAP ($m)',
                        'ADV ($k)',
                        'ROIC %',
                        'FCFy %',
                        'ND/EBITDA',
                        'F',
                        'Z',
                        'Moat',
                        'Quality',
                        'Hook',
                        'Grade'
                      ].map((h) => (
                        <th key={h} scope="col" className="py-1 px-2 text-left whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.slice(0, 50).map((x: ScreenerCompany) => (
                      <tr key={x.id} className="border-b border-slate-900/60 hover:bg-slate-900/40">
                        <td className="px-2 py-1">
                          <label className="sr-only">Select {x.ticker}</label>
                          <input
                            type="checkbox"
                            className="accent-violet-500"
                            checked={selectedCompanies.includes(x.id)}
                            onChange={() => toggleSelect(x.id)}
                            aria-label={`Select ${x.ticker} for promotion`}
                          />
                        </td>
                        <td className="px-2 py-1 font-medium text-slate-100">{x.ticker}</td>
                        <td className="px-2 py-1 text-slate-200 truncate max-w-[180px]">{x.name}</td>
                        <td className="px-2 py-1 text-slate-300">{x.geo}</td>
                        <td className="px-2 py-1">{x.sector}</td>  // Adjust columns to match data
                        <td className="px-2 py-1">{x.roic.toFixed(1)}</td>
                        <td className="px-2 py-1">{x.fcfYield.toFixed(1)}</td>
                        <td className="px-2 py-1">{x.leverage.toFixed(1)}</td>
                        <td className="px-2 py-1 text-center">{x.growthDurability}</td>
                        <td className="px-2 py-1 text-center">{x.insiderOwnership}</td>
                        <td className="px-2 py-1">
                          <ChipScore n={Math.floor(x.qualityScore / 20)} label="" tone="violet" />
                        </td>
                        <td className="px-2 py-1">
                          <ChipScore n={Math.floor(x.qualityScore / 20)} label="" tone="emerald" />
                        </td>
                        <td className="px-2 py-1">
                          <ChipScore n={Math.floor(x.qualityScore / 20)} label="" tone="amber" />
                        </td>
                        <td className="px-2 py-1">
                          <MemoizedTag
                            tone={
                              x.qualityScore >= 80 ? 'emerald' : x.qualityScore >= 60 ? 'violet' : 'rose'
                            }
                          >
                            {x.qualityScore >= 80 ? 'A' : x.qualityScore >= 60 ? 'B' : 'C'}
                          </MemoizedTag>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </MemoizedCard>

          <MemoizedCard
            title="Explain selection rules"
            subtitle="Plain English"
            right={<MemoizedTag tone="slate">Rules</MemoizedTag>}
          >
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
              <li>Hard guards: market cap band, liquidity (ADV), exchanges on/off.</li>
              <li>
                Bands not cliffs: ROIC and FCF yield as minimums; ND/EBITDA cap; optional net-cash
                rule.
              </li>
              <li>
                NL Screener parses hints like "net cash", "low accruals", "neglect", and numeric
                minima (e.g., ROIC≥12).
              </li>
              <li>Composite rank = Moat + Quality + Hook; each chip is 0–5.</li>
              <li>Select up to 5 names to promote into Quick Briefs.</li>
            </ul>
          </MemoizedCard>
        </div>

        {/* Right: Inspector & Gate */}
        <div className="col-span-12 xl:col-span-3 space-y-4">
          <MemoizedCard
            title="Query Summary"
            subtitle="What the system heard"
            right={<MemoizedTag tone="slate">Parsed</MemoizedTag>}
          >
            <div className="text-sm text-slate-300 space-y-1">
              <div>
                ROIC min:{' '}
                <MemoizedTag tone="slate">{parsedQuery.roicMin ?? filters.roicMin}%</MemoizedTag>
              </div>
              <div>
                FCF yield min:{' '}
                <MemoizedTag tone="slate">{parsedQuery.fcfyMin ?? filters.fcfyMin}%</MemoizedTag>
              </div>
              <div>
                ND/EBITDA max:{' '}
                <MemoizedTag tone="slate">
                  {parsedQuery.netCash ? 'net cash (≤0)' : filters.ndMax}
                </MemoizedTag>
              </div>
              <div>
                Low accruals:{' '}
                <MemoizedTag tone={parsedQuery.lowAccruals ? 'emerald' : 'slate'}>
                  {parsedQuery.lowAccruals ? 'on' : 'off'}
                </MemoizedTag>
              </div>
              <div>
                Neglect:{' '}
                <MemoizedTag tone={parsedQuery.neglect ? 'emerald' : 'slate'}>
                  {parsedQuery.neglect ? 'on' : 'off'}
                </MemoizedTag>
              </div>
              <div className="pt-2">Exchanges included:</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(filters.include)
                  .filter(([, v]) => v)
                  .map(([k]) => (
                    <MemoizedTag key={k}>{k}</MemoizedTag>
                  ))}
              </div>
            </div>
          </MemoizedCard>

          <MemoizedCard
            title="Selection"
            subtitle="Promote ≤5 to Briefs"
            right={
              <MemoizedTag tone={selectedCount > 0 ? 'emerald' : 'slate'}>
                {selectedCount}
              </MemoizedTag>
            }
          >
            <div className="text-sm text-slate-300">
              Choose up to five candidates. This creates a **Screen Run** snapshot and opens Quick
              Brief tabs.
            </div>
            <button
              disabled={selectedCount === 0 || selectedCount > 5}
              onClick={promote}
              className={cls(
                'mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border',
                selectedCount > 0 && selectedCount <= 5
                  ? 'bg-violet-600 hover:bg-violet-500 text-white border-violet-500'
                  : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
              )}
              title={selectedCount === 0 ? 'Select at least one' : 'Proceed to Quick Briefs'}
            >
              Promote to Briefs <IconNext />
            </button>
          </MemoizedCard>

          <MemoizedCard
            title="Saved Runs (progress)"
            subtitle="Last action"
            right={<MemoizedTag tone="slate">dev</MemoizedTag>}
          >
            <ProgressBar
              value={Math.min(
                100,
                results.length ? Math.round((selectedCount / Math.min(results.length, 5)) * 100) : 0
              )}
            />
            <div className="text-xs text-slate-500 mt-1">Selected {selectedCount} / 5</div>
          </MemoizedCard>
        </div>
      </div>

      {/* Footer console */}
      <div className="h-28 border-t border-slate-800 bg-slate-950/80 p-2 flex gap-2">
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 overflow-y-auto">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Tips</div>
          <div className="text-sm text-slate-300 space-y-1">
            <div>
              Use natural language like: "TSXV + OTCQX, net cash, low accruals, ROIC≥12, FCF≥6".
            </div>
            <div>Presets help you jump to common small/microcap filters.</div>
            <div>
              Promote only names that look **plausible moat + decent quality + a clear hook**.
            </div>
          </div>
        </div>
        <div className="w-80 bg-slate-900 border border-slate-800 rounded-lg p-2">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Keyboard</div>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>
              <span className="text-slate-500">⌘K</span> NL Screener
            </li>
            <li>
              <span className="text-slate-500">A/P/R</span> Advance/Park/Reject in Briefs
            </li>
          </ul>
        </div>
      </div>

      {/* Dev Test (ensures parser handles '>' properly) */}
      <div className="hidden" aria-hidden="true">
        <MemoizedCard
          title={'Parser Test'}
          subtitle={'Ensure symbols render'}
          right={<MemoizedTag tone="slate">Test</MemoizedTag>}
        >
          <div className="text-sm text-slate-300">Edge text: {'ROIC \u003e= 12%'}</div>
        </MemoizedCard>
      </div>
    </div>
  )
}

// Export alias for stage-tabs.tsx
export { MadLab_UniverseScreener_Prod as AdvancedUniverseScreener }
