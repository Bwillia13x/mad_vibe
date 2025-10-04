// MadLab / Valor‑IVX — Red‑Team Mode (Production Render v1)
// Layout: Left Playbooks & Targets • Center Critiques & Decisions • Right Coverage, Conflicts & Gate
// Notes: No external libs. Icons wrapped. Avoid raw '>' in JSX text (use ≥ or \u003e). Includes a minimal contradiction scan stub.
// Refactored: Uses shared UI components, optimized performance, enhanced accessibility, improved memory usage

import React, { useMemo, useCallback, useState } from 'react'
import { MemoizedCard, MemoizedTag, ProgressBar, cls } from '@/lib/workbench-ui.tsx'
import type { PaletteKey } from '@/lib/workbench-ui.tsx'
import { useRedTeam } from '@/hooks/useRedTeam'

// Optimized IconShield component
const IconShield = React.memo(() => (
  <span aria-hidden className="inline-block">
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  </span>
))

// Optimized IconTarget component
const IconTarget = React.memo(() => (
  <span aria-hidden className="inline-block">
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 3" />
    </svg>
  </span>
))

// Optimized IconHammer component
const IconHammer = React.memo(() => (
  <span aria-hidden className="inline-block">
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m2 18 7-7 3 3-7 7H2z" />
      <path d="M14 4l6 6" />
    </svg>
  </span>
))

// Optimized IconSearch component
const IconSearch = React.memo(() => (
  <span aria-hidden className="inline-block">
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-3.5-3.5" />
    </svg>
  </span>
))

// Optimized IconCheck component
const IconCheck = React.memo(() => (
  <span aria-hidden className="inline-block">
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m20 6-11 11L4 12" />
    </svg>
  </span>
))

// Optimized IconX component
const IconX = React.memo(() => (
  <span aria-hidden className="inline-block">
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  </span>
))

// Optimized IconNext component
const IconNext = React.memo(() => (
  <span aria-hidden className="inline-block">
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m9 18 6-6-6-6" />
    </svg>
  </span>
))

// Memoized component for better performance
export const MadLab_RedTeam_Prod = React.memo(() => {
  const {
    artifact,
    scope,
    activePlaybooks,
    critiques,
    scanQuery,
    scanHits,
    vulnerabilityChecklist,
    coverage,
    highOpen,
    gateReady,
    adversarialSim,
    error,
    updateArtifact,
    updateScope,
    togglePlaybook,
    decideCritique,
    updateScanQuery,
    toggleVulnerability,
    clearError
  } = useRedTeam()

  // Memoized severity tone function
  const sevTone = useCallback((s: string): PaletteKey => {
    switch (s) {
      case 'High':
        return 'rose'
      case 'Med':
        return 'amber'
      default:
        return 'slate'
    }
  }, [])

  // Memoized event handlers
  const handleArtifactChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateArtifact(e.target.value)
    },
    [updateArtifact]
  )

  const handleScopeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedOptions = Array.from(e.target.selectedOptions).map((option) => option.value)
      updateScope(selectedOptions)
    },
    [updateScope]
  )

  const handlePlaybookToggle = useCallback(
    (playbook: string) => {
      togglePlaybook(playbook)
    },
    [togglePlaybook]
  )

  const handleCritiqueDecision = useCallback(
    (id: number, decision: boolean) => {
      decideCritique(id, decision)
    },
    [decideCritique]
  )

  const handleScanQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateScanQuery(e.target.value)
    },
    [updateScanQuery]
  )

  // Memoized critique list to prevent unnecessary re-renders
  const critiqueElements = useMemo(() => {
    return critiques.map((c) => (
      <div key={c.id} className="bg-slate-950/50 border border-slate-800 rounded-md p-3">
        <div className="flex items-center justify-between">
          <div className="text-slate-100 font-medium truncate">
            {c.playbook}: {c.claim}
          </div>
          <MemoizedTag tone={sevTone(c.severity)}>{c.severity}</MemoizedTag>
        </div>
        <div className="text-sm text-slate-300 mt-1">{c.rationale}</div>
        <div className="text-xs text-slate-500 mt-1">Suggested action: {c.action}</div>
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => handleCritiqueDecision(c.id, true)}
            className={cls(
              'px-2 py-1 rounded-md border text-xs inline-flex items-center gap-1',
              c.decided === true
                ? 'bg-emerald-600 border-emerald-500'
                : 'bg-slate-900 border-slate-800'
            )}
          >
            {c.decided === true ? <IconCheck /> : null} Accept
          </button>
          <button
            onClick={() => handleCritiqueDecision(c.id, false)}
            className={cls(
              'px-2 py-1 rounded-md border text-xs inline-flex items-center gap-1',
              c.decided === false ? 'bg-rose-600 border-rose-500' : 'bg-slate-900 border-slate-800'
            )}
          >
            {c.decided === false ? <IconX /> : null} Reject
          </button>
        </div>
      </div>
    ))
  }, [critiques, sevTone, handleCritiqueDecision])

  return (
    <div className="w-full min-h-[calc(100vh-16px)] bg-slate-950 text-slate-100 rounded-xl overflow-hidden ring-1 ring-slate-800">
      {/* Error Display */}
      {error && (
        <div className="absolute top-4 right-4 z-50">
          <div className="bg-rose-900/80 border border-rose-700 rounded-lg p-3 max-w-md">
            <div className="flex items-center justify-between">
              <div className="text-sm text-rose-100">{error}</div>
              <button onClick={clearError} className="ml-2 text-rose-300 hover:text-rose-100">
                <IconX />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/70 backdrop-blur px-4 py-3 flex items-center gap-3">
        <div className="text-sm text-slate-300 min-w-[260px] inline-flex items-center gap-2">
          <IconShield /> Red‑Team Mode
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <MemoizedTag tone="slate">Artifact {artifact}</MemoizedTag>
          <MemoizedTag tone={gateReady ? 'emerald' : 'amber'}>Coverage {coverage}%</MemoizedTag>
          <MemoizedTag tone={highOpen === 0 ? 'emerald' : 'rose'}>High open {highOpen}</MemoizedTag>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 grid grid-cols-12 gap-4">
        {/* Left: Playbooks & Targets */}
        <div className="col-span-12 xl:col-span-3 space-y-4">
          <MemoizedCard
            title="Target"
            subtitle="What are we attacking?"
            right={
              <MemoizedTag tone="violet">
                <IconTarget /> select
              </MemoizedTag>
            }
          >
            <div className="grid grid-cols-1 gap-2 text-sm">
              <label>
                Artifact
                <select
                  value={artifact}
                  onChange={handleArtifactChange}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1"
                >
                  {['Valuation v3', 'Dossier v1', 'IC Memo v1'].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Scope
                <select
                  multiple
                  value={scope}
                  onChange={handleScopeChange}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1 h-24"
                >
                  {[
                    'Assumptions',
                    'Business Model',
                    'Accounting',
                    'Comps',
                    'Risks',
                    'Catalysts'
                  ].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </MemoizedCard>

          <MemoizedCard
            title="Playbooks"
            subtitle="Choose attack modes"
            right={
              <MemoizedTag tone="violet">
                <IconHammer /> tools
              </MemoizedTag>
            }
          >
            <ul className="text-sm text-slate-300 space-y-2">
              {[
                'Steelman short',
                'Attack assumptions',
                'Find missing comps',
                'Footnote/accounting stress',
                'Scenario adversary',
                'Evidence contradiction'
              ].map((p) => (
                <li
                  key={p}
                  className="flex items-center justify-between bg-slate-950/50 border border-slate-800 rounded-md p-2"
                >
                  <span>{p}</span>
                  <label className="inline-flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      className="accent-violet-500"
                      checked={activePlaybooks.includes(p)}
                      onChange={() => handlePlaybookToggle(p)}
                    />{' '}
                    active
                  </label>
                </li>
              ))}
            </ul>
          </MemoizedCard>

          <MemoizedCard
            title="Contradiction Scan (stub)"
            subtitle="Evidence that disagrees"
            right={
              <MemoizedTag tone="blue">
                <IconSearch /> scan
              </MemoizedTag>
            }
          >
            <div className="text-sm">
              <input
                value={scanQuery}
                onChange={handleScanQueryChange}
                className="w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1"
              />
              <ul className="mt-2 space-y-2">
                {scanHits.map((h) => (
                  <li key={h.id} className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                    <div className="text-xs text-slate-500">
                      {h.src} • {h.id}
                    </div>
                    <div className="text-slate-300">{h.excerpt}</div>
                  </li>
                ))}
              </ul>
              <div className="text-xs text-slate-500 mt-1">
                In prod, this queries filings, transcripts, notes and flags contradictions
                automatically.
              </div>
            </div>
          </MemoizedCard>

          {/* New Vulnerability Checklist Card */}
          <MemoizedCard
            title="Vulnerability Checklist"
            subtitle="Address playbook-specific gaps"
            right={<MemoizedTag tone="violet">Checklist</MemoizedTag>}
          >
            <ul className="text-sm text-slate-300 space-y-2">
              {vulnerabilityChecklist.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between bg-slate-950/50 border border-slate-800 rounded-md p-2"
                >
                  <span className="truncate">{item.label}</span>
                  <label className="inline-flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      className="accent-violet-500"
                      checked={item.completed}
                      onChange={(e) => toggleVulnerability(item.id, e.target.checked)}
                    />
                    <span>Done</span>
                  </label>
                </li>
              ))}
              {vulnerabilityChecklist.length === 0 && (
                <li className="text-xs text-slate-500 italic">
                  Activate playbooks to generate items.
                </li>
              )}
            </ul>
          </MemoizedCard>

          {/* New Adversarial Scenario Simulation Card */}
          {adversarialSim && (
            <MemoizedCard
              title="Adversarial Scenario Sim"
              subtitle="Tail-biased stress test"
              right={<MemoizedTag tone="rose">Extreme</MemoizedTag>}
            >
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Downside extreme (P5):</span>
                  <span className="font-semibold text-rose-300">
                    ${adversarialSim.extremeDownside}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Upside extreme (P95):</span>
                  <span className="font-semibold text-emerald-300">
                    ${adversarialSim.extremeUpside}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">{adversarialSim.biasShift}</div>
              </div>
            </MemoizedCard>
          )}
        </div>

        {/* Center: Critiques & Decisions */}
        <div className="col-span-12 xl:col-span-6 space-y-4">
          <MemoizedCard title="Critiques" subtitle="Review, accept or reject with rationale">
            <div className="space-y-2">{critiqueElements}</div>
          </MemoizedCard>

          <MemoizedCard title="Required Red‑Team Summary" subtitle="Write what could make us wrong">
            <textarea
              className="w-full h-28 bg-slate-950/50 rounded-md p-2 border border-slate-800 text-sm"
              placeholder="At least 60 characters: the most credible short case, where it would show up in the numbers, & what evidence could falsify it."
            ></textarea>
            <div className="text-xs text-slate-500 mt-1">
              In prod, this must be ≥ 60 chars to pass the gate and is stored in the Research Log.
            </div>
          </MemoizedCard>
        </div>

        {/* Right: Coverage, Conflicts & Gate */}
        <div className="col-span-12 xl:col-span-3 space-y-4">
          <MemoizedCard
            title="Coverage"
            subtitle="How much reviewed?"
            right={<MemoizedTag tone={gateReady ? 'emerald' : 'amber'}>{coverage}%</MemoizedTag>}
          >
            <div className="text-sm space-y-2">
              <div>
                <div className="text-xs text-slate-400 mb-1">Critique decisions</div>
                <ProgressBar value={coverage} />
                <div className="text-xs text-slate-500 mt-1">
                  {critiques.filter((c) => c.decided !== null).length} / {critiques.length} decided
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">High severity open</div>
                <ProgressBar value={Math.max(0, Math.min(100, 100 - (highOpen > 0 ? 0 : 100)))} />
                <div className="text-xs text-slate-500 mt-1">Open high: {highOpen}</div>
              </div>
            </div>
          </MemoizedCard>

          <MemoizedCard title="Conflicts (stub)" subtitle="Assumptions vs evidence">
            <ul className="text-sm text-slate-300 space-y-2">
              <li className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                Steady‑state margin assumes 24%, but post‑renewal leases imply 21–22%.
              </li>
              <li className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                Memo states conc. {'<'} 25%; filing cites 41%.
              </li>
            </ul>
            <div className="text-xs text-slate-500 mt-1">
              In prod, this is auto‑generated from tagged assumptions and citations.
            </div>
          </MemoizedCard>

          <MemoizedCard
            title="Gate back to IC Memo"
            subtitle="All highs closed, ≥ 80% decided"
            right={
              <MemoizedTag tone={gateReady ? 'emerald' : 'rose'}>
                {gateReady ? 'Ready' : 'Not ready'}
              </MemoizedTag>
            }
          >
            <div className="text-sm text-slate-300">
              When green, route to IC Memo with a Red‑Team appendix and diffs.
            </div>
            <button
              disabled={!gateReady}
              className={cls(
                'mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border',
                gateReady
                  ? 'bg-violet-600 hover:bg-violet-500 text-white border-violet-500'
                  : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
              )}
            >
              Return to IC Memo <IconNext />
            </button>
          </MemoizedCard>
        </div>
      </div>

      {/* Footer */}
      <div className="h-28 border-t border-slate-800 bg-slate-950/80 p-2 flex gap-2">
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 overflow-y-auto">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Notes</div>
          <div className="text-sm text-slate-300">
            Red‑Team turns **assumptions into attack surfaces**. Close the loop by either changing
            the numbers or documenting why not — with citations. The gate ensures real friction
            before sign‑off.
          </div>
        </div>
        <div className="w-80 bg-slate-900 border border-slate-800 rounded-lg p-2">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Keyboard</div>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>
              <span className="text-slate-500">⌘K</span> Omni‑Prompt
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

      {/* Dev Test (symbols) */}
      <div className="hidden">
        <MemoizedCard title="Parser Test" subtitle="Ensure symbols render">
          <div className="text-sm text-slate-300">
            Rules: {'Coverage ≥ 80%'}, {'High open = 0'}, {'Conc. < 25%'}
          </div>
        </MemoizedCard>
      </div>
    </div>
  )
})

// Export alias for stage-tabs.tsx
export { MadLab_RedTeam_Prod as RedTeamMode }
