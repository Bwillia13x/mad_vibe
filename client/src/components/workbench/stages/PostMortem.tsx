import React, { useMemo, useState, useCallback } from 'react'
import { useMonitoring } from '@/hooks/useMonitoring'
import { useMemoComposer } from '@/hooks/useMemoComposer'
import { GlassCard } from '@/components/layout/GlassCard'

// Types
interface TimelineEvent {
  t: string
  what: string
  type: 'init' | 'event' | 'add' | 'trim'
}

interface Hypothesis {
  thesis: string
  falsifiers: string
  outcome: string
}

interface Attribution {
  whatWorked: string[]
  whatDidnt: string[]
  controllable: string[]
  uncontrollable: string[]
}

interface Meta {
  ticker: string
  name: string
  side: 'Buy' | 'Sell'
  entry: string
  exit: string
  entryPx: number
  exitPx: number
  qty: number
}

// ---------------- helpers ----------------
const cls = (...s: (string | false | null | undefined)[]) => s.filter(Boolean).join(' ')
const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x))
const fmt = (n: number, d: number = 2) =>
  Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : '-'
const pct = (x: number, d: number = 1) => `${fmt(x, d)}%`

// Card moved to shared component: GlassCard

function Tag({ tone = 'slate', children }: { tone?: string; children: React.ReactNode }) {
  const palette = {
    slate: 'bg-slate-800/60 text-slate-200 ring-slate-700/80',
    violet: 'bg-violet-800/40 text-violet-100 ring-violet-700/70',
    emerald: 'bg-emerald-800/40 text-emerald-100 ring-emerald-700/70',
    amber: 'bg-amber-800/40 text-amber-100 ring-amber-700/70',
    rose: 'bg-rose-800/40 text-rose-100 ring-rose-700/70',
    blue: 'bg-sky-800/40 text-sky-100 ring-sky-700/70'
  }
  return (
    <span
      className={cls(
        'px-2 py-0.5 rounded-full text-xs font-medium ring-1',
        palette[tone as keyof typeof palette]
      )}
    >
      {children}
    </span>
  )
}

function ProgressBar({ value, tone = 'violet' }: { value: number; tone?: string }) {
  const color =
    tone === 'emerald'
      ? 'text-emerald-500'
      : tone === 'amber'
        ? 'text-amber-500'
        : tone === 'rose'
          ? 'text-rose-500'
          : 'text-violet-500'
  const pct = clamp(value, 0, 100)
  return (
    <div className="w-full h-2">
      <svg
        viewBox="0 0 100 8"
        className="w-full h-full block rounded-full overflow-hidden"
        aria-hidden
      >
        <rect
          x="0"
          y="0"
          width="100"
          height="8"
          rx="4"
          fill="currentColor"
          className="text-slate-800"
        />
        <rect x="0" y="0" width={pct} height="8" rx="4" fill="currentColor" className={color} />
      </svg>
    </div>
  )
}

function Sparkline({ points = [], height = 36 }: { points?: number[]; height?: number }) {
  const w = 120
  const h = height
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = Math.max(1, max - min)
  const d = points
    .map((y, i) => {
      const xPos = (i / (points.length - 1 || 1)) * w
      const yPos = h - ((y - min) / span) * h
      return `${i === 0 ? 'M' : 'L'}${xPos.toFixed(1)},${yPos.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-9" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" className="text-slate-500" strokeWidth="1.5" />
    </svg>
  )
}

// ---------------- icons ----------------
function IconPM() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3 3h18v6H3z" />
        <path d="M7 21h10M12 9v12" />
      </svg>
    </span>
  )
}
function IconTimeline() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M2 12h20" />
        <circle cx="7" cy="12" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="17" cy="12" r="2" />
      </svg>
    </span>
  )
}
function IconCogs() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    </span>
  )
}
function IconTag() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m3 7 7-4 7 4v6l-7 4-7-4z" />
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

// ---------------- main ----------------
export function PostMortem() {
  const { deltas, lessons: monitoringLessons } = useMonitoring()
  const { compiledMemo, commentThreads } = useMemoComposer()

  // Demo state (pre-fill from autoExtract)
  const [meta, _setMeta] = useState<Meta>({
    ticker: 'TKR',
    name: 'Takuru Systems',
    side: 'Buy',
    entry: '2025-06-10',
    exit: '2025-09-15',
    entryPx: 41.2,
    exitPx: 46.0,
    qty: 72000
  })
  const [timeline, _setTimeline] = useState<TimelineEvent[]>([
    { t: '2025-06-10', what: 'Initiated 3.0% @ 41.20', type: 'init' },
    { t: '2025-07-25', what: 'Q2 call: renewals pricing ↑; capex guide cautious', type: 'event' },
    { t: '2025-08-20', what: 'KPI beat; added 1.0%', type: 'add' },
    { t: '2025-09-15', what: 'Trimmed 1.0% near upper band', type: 'trim' }
  ])

  const [hypo, setHypo] = useState<Hypothesis>({
    thesis: 'Renewal pricing power supports EPV ≥ $45 with stable maintenance capex.',
    falsifiers: 'Loss of key customer; capex step-ups; renewals delay.',
    outcome: 'Renewals flowed as expected; maintenance capex slightly higher; demand steady.'
  })
  const [attrib, setAttrib] = useState<Attribution>({
    whatWorked: ['Pricing power', 'Cost control'],
    whatDidnt: ['Capex creep', 'Two-week execution delay'],
    controllable: ['Sizing discipline', 'Alert bands'],
    uncontrollable: ['Macro risk', 'Supplier issue']
  })
  const [errors, setErrors] = useState<string[]>([
    'Process: waited too long to add',
    'Analysis: under-estimated capex'
  ])
  const [lessons, setLessons] = useState<string[]>([
    'Move adds to rule-based ladder when bands hit',
    'Footnote-level capex check before EPV sign-off'
  ])
  const [tags, setTags] = useState<string[]>(['pricing-power', 'capex-estimates', 'execution'])

  // Auto-extract function
  const _autoExtract = useCallback(() => {
    // Extract thesis from memo (first section or search)
    const thesisMatch = compiledMemo.match(/## Thesis\n([\s\S]*?)(?=##|\n---)/)
    const extractedThesis = thesisMatch
      ? thesisMatch[1].trim()
      : 'Thesis not found in memo history.'

    // Outcome from deltas
    const outcomes = deltas
      .filter((delta) => delta.status === 'breach' || delta.status === 'warning')
      .map(
        (delta) => `${delta.metric}: ${delta.description}; variance ${delta.variance.toFixed(1)}%.`
      )
      .join(' ')

    // Errors from breaches and unresolved comments
    const breachErrors = deltas
      .filter((delta) => delta.status === 'breach')
      .map((delta) => `Error: ${delta.metric} breach - ${delta.description}.`)
    const commentErrors = commentThreads
      .flatMap((thread) => thread.comments.filter((c) => c.status !== 'resolved'))
      .map((c) => `Reviewer error note: ${c.message}`)
    const extractedErrors = [...breachErrors, ...commentErrors.slice(0, 2)] // Limit to 2

    // Lessons from warnings and monitoring lessons
    const warningLessons = deltas
      .filter((delta) => delta.status === 'warning')
      .map(
        (delta) =>
          `Lesson: ${delta.metric} - Adjust future assumptions for ${delta.description}; monitor ${delta.metric}.`
      )
    const extractedLessons = [
      ...warningLessons,
      ...monitoringLessons.slice(0, 2).map((l) => (typeof l === 'string' ? l : l.title))
    ] // Limit

    // Pre-fill
    setHypo((prev: Hypothesis) => ({
      ...prev,
      thesis: extractedThesis,
      outcome: outcomes || prev.outcome
    }))
    setErrors(extractedErrors.length ? extractedErrors : ['No auto-extracted errors.'])
    setLessons(extractedLessons.length ? extractedLessons : ['No auto-extracted lessons.'])

    // Tags from deltas
    const deltaTags = deltas.map((d) => d.metric.toLowerCase().replace(/\s+/g, '-'))
    setTags((prev: string[]) => [...new Set([...prev, ...deltaTags.slice(0, 3)])]) // Add up to 3 unique
  }, [deltas, monitoringLessons, compiledMemo, commentThreads])

  // simple metrics
  const pnlPct = useMemo(() => ((meta.exitPx - meta.entryPx) / meta.entryPx) * 100, [meta])
  const holdDays = 97 // stub
  const hitRate = 62 // portfolio level stub
  const docFillPct = useMemo(() => {
    const checks = [hypo.thesis, hypo.falsifiers, hypo.outcome, errors[0], lessons[0]]
    const done = checks.filter(Boolean).length
    return Math.round((done / checks.length) * 100)
  }, [hypo, errors, lessons])
  const gateReady =
    docFillPct >= 100 && errors.length >= 2 && lessons.length >= 2 && tags.length >= 2

  function addItem(
    callback: ((v: string) => void) | React.Dispatch<React.SetStateAction<string[]>>
  ) {
    const v = prompt('Add item')
    if (v) {
      if (typeof callback === 'function') {
        // Check if it's a simple setState or a custom callback
        try {
          ;(callback as React.Dispatch<React.SetStateAction<string[]>>)((prev: string[]) => [
            ...prev,
            v
          ])
        } catch {
          ;(callback as (v: string) => void)(v)
        }
      }
    }
  }
  function removeAt(
    callback: ((idx: number) => void) | React.Dispatch<React.SetStateAction<string[]>>,
    idx: number
  ) {
    if (typeof callback === 'function') {
      try {
        ;(callback as React.Dispatch<React.SetStateAction<string[]>>)((prev: string[]) =>
          prev.filter((_, i) => i !== idx)
        )
      } catch {
        ;(callback as (idx: number) => void)(idx)
      }
    }
  }

  return (
    <div className="w-full min-h-[calc(100vh-16px)] bg-slate-950 text-slate-100 rounded-xl overflow-hidden ring-1 ring-slate-800">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/70 backdrop-blur px-4 py-3 flex items-center gap-3">
        <div className="text-sm text-slate-300 min-w-[260px] inline-flex items-center gap-2">
          <IconPM />
          Post-Mortem Template
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Tag tone="slate">{meta.ticker}</Tag>
          <Tag tone={pnlPct >= 0 ? 'emerald' : 'rose'}>P\u0026L {pct(pnlPct, 1)}</Tag>
          <Tag tone="slate">Hold {holdDays}d</Tag>
          <Tag tone="slate">Doc {docFillPct}%</Tag>
          <Tag tone={gateReady ? 'emerald' : 'amber'}>{gateReady ? 'Ready' : 'Incomplete'}</Tag>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 grid grid-cols-12 gap-4">
        {/* Left: Trade Recap & Timeline */}
        <div className="col-span-12 xl:col-span-3 space-y-4">
          <GlassCard
            title="Trade Recap"
            subtitle="Position details"
            right={
              <Tag tone={pnlPct >= 0 ? 'emerald' : 'rose'}>{pnlPct >= 0 ? 'Gain' : 'Loss'}</Tag>
            }
          >
            <ul className="text-sm text-slate-300 space-y-1">
              <li>
                Ticker: {meta.ticker} — {meta.name}
              </li>
              <li>
                Side: {meta.side} • Qty: {fmt(meta.qty, 0)}
              </li>
              <li>
                Entry: {meta.entry} @ ${fmt(meta.entryPx, 2)}
              </li>
              <li>
                Exit: {meta.exit} @ ${fmt(meta.exitPx, 2)}
              </li>
            </ul>
          </GlassCard>

          <GlassCard
            title="Timeline"
            subtitle="Key events"
            right={
              <Tag tone="blue">
                <IconTimeline /> seq
              </Tag>
            }
          >
            <ul className="text-sm text-slate-300 space-y-2">
              {timeline.map((ev, i) => (
                <li key={i} className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                  <div className="text-xs text-slate-500">
                    {ev.t} • {ev.type}
                  </div>
                  <div className="text-slate-200">{ev.what}</div>
                </li>
              ))}
            </ul>
          </GlassCard>

          <GlassCard title="Price Path (stub)" subtitle="Entry → exit">
            <Sparkline points={[41.2, 40.9, 42.1, 43.4, 44.2, 45.1, 46.0]} />
            <div className="text-xs text-slate-500 mt-1">
              In production, overlay trades and bands.
            </div>
          </GlassCard>
        </div>

        {/* Center: Hypothesis vs Outcome & Attribution */}
        <div className="col-span-12 xl:col-span-6 space-y-4">
          <GlassCard
            title="Hypothesis vs Outcome"
            subtitle="What we believed vs what happened"
            right={
              <Tag tone="violet">
                <IconCogs /> compare
              </Tag>
            }
          >
            <div className="grid md:grid-cols-3 gap-2 text-sm">
              <label className="md:col-span-1">
                Thesis at entry
                <textarea
                  value={hypo.thesis}
                  onChange={(e) => setHypo((h) => ({ ...h, thesis: e.target.value }))}
                  className="mt-1 w-full h-24 bg-slate-950/60 border border-slate-800 rounded px-2 py-1"
                />
              </label>
              <label className="md:col-span-1">
                Falsifiers
                <textarea
                  value={hypo.falsifiers}
                  onChange={(e) => setHypo((h) => ({ ...h, falsifiers: e.target.value }))}
                  className="mt-1 w-full h-24 bg-slate-950/60 border border-slate-800 rounded px-2 py-1"
                />
              </label>
              <label className="md:col-span-1">
                Outcome
                <textarea
                  value={hypo.outcome}
                  onChange={(e) => setHypo((h) => ({ ...h, outcome: e.target.value }))}
                  className="mt-1 w-full h-24 bg-slate-950/60 border border-slate-800 rounded px-2 py-1"
                />
              </label>
            </div>
          </GlassCard>

          <GlassCard title="Attribution & Errors" subtitle="What worked; what did not">
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                <div className="text-xs text-slate-400 mb-1">What worked</div>
                <ul className="space-y-1">
                  {attrib.whatWorked.map((w, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <span>{w}</span>
                      <button
                        onClick={() =>
                          removeAt(
                            (_idx: number) =>
                              setAttrib((a) => ({
                                ...a,
                                whatWorked: a.whatWorked.filter((_, j) => j !== i)
                              })),
                            i
                          )
                        }
                        className="text-xs text-slate-400 hover:text-slate-200"
                      >
                        remove
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() =>
                    addItem((v: string) =>
                      setAttrib((a: Attribution) => ({ ...a, whatWorked: [...a.whatWorked, v] }))
                    )
                  }
                  className="mt-1 text-xs text-slate-300"
                >
                  + add
                </button>
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                <div className="text-xs text-slate-400 mb-1">What did not</div>
                <ul className="space-y-1">
                  {attrib.whatDidnt.map((w, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <span>{w}</span>
                      <button
                        onClick={() =>
                          removeAt(
                            (_idx: number) =>
                              setAttrib((a) => ({
                                ...a,
                                whatDidnt: a.whatDidnt.filter((_, j) => j !== i)
                              })),
                            i
                          )
                        }
                        className="text-xs text-slate-400 hover:text-slate-200"
                      >
                        remove
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() =>
                    addItem((v: string) =>
                      setAttrib((a: Attribution) => ({ ...a, whatDidnt: [...a.whatDidnt, v] }))
                    )
                  }
                  className="mt-1 text-xs text-slate-300"
                >
                  + add
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3 text-sm mt-3">
              <div className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                <div className="text-xs text-slate-400 mb-1">Controllable factors</div>
                <div className="text-slate-200">{attrib.controllable.join(', ')}</div>
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                <div className="text-xs text-slate-400 mb-1">Uncontrollable factors</div>
                <div className="text-slate-200">{attrib.uncontrollable.join(', ')}</div>
              </div>
            </div>

            <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                <div className="text-xs text-slate-400 mb-1">Errors (min 2)</div>
                <ul className="space-y-1">
                  {errors.map((w, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <span>{w}</span>
                      <button
                        onClick={() => removeAt(setErrors, i)}
                        className="text-xs text-slate-400 hover:text-slate-200"
                      >
                        remove
                      </button>
                    </li>
                  ))}
                </ul>
                <button onClick={() => addItem(setErrors)} className="mt-1 text-xs text-slate-300">
                  + add
                </button>
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                <div className="text-xs text-slate-400 mb-1">Lessons (min 2)</div>
                <ul className="space-y-1">
                  {lessons.map((w, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <span>{w}</span>
                      <button
                        onClick={() => removeAt(setLessons, i)}
                        className="text-xs text-slate-400 hover:text-slate-200"
                      >
                        remove
                      </button>
                    </li>
                  ))}
                </ul>
                <button onClick={() => addItem(setLessons)} className="mt-1 text-xs text-slate-300">
                  + add
                </button>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right: Lessons, Tags & Gate */}
        <div className="col-span-12 xl:col-span-3 space-y-4">
          <GlassCard
            title="Tags"
            subtitle="For Lessons Library"
            right={
              <Tag tone="blue">
                <IconTag /> meta
              </Tag>
            }
          >
            <div className="flex flex-wrap gap-1 text-sm">
              {tags.map((t, i) => (
                <span
                  key={i}
                  className="bg-slate-950/50 border border-slate-800 rounded-md px-2 py-1 inline-flex items-center gap-2"
                >
                  {t}
                  <button
                    onClick={() => removeAt(setTags, i)}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
            <button
              onClick={() => {
                const v = prompt('Add tag')
                if (v) setTags((a) => [...a, v])
              }}
              className="mt-2 text-xs text-slate-300"
            >
              + add tag
            </button>
          </GlassCard>

          <GlassCard
            title="Quality Gate"
            subtitle="Complete required fields"
            right={
              <Tag tone={gateReady ? 'emerald' : 'amber'}>{gateReady ? 'Ready' : 'Incomplete'}</Tag>
            }
          >
            <div className="text-xs text-slate-400 mb-1">Progress</div>
            <ProgressBar value={docFillPct} tone={gateReady ? 'emerald' : 'amber'} />
            <ol className="text-sm text-slate-300 list-decimal list-inside mt-2 space-y-1">
              <li>Thesis, falsifiers, outcome filled</li>
              <li>≥ 2 errors and ≥ 2 lessons documented</li>
              <li>≥ 2 tags added</li>
            </ol>
            <button
              disabled={!gateReady}
              className={cls(
                'mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border',
                gateReady
                  ? 'bg-violet-600 hover:bg-violet-500 text-white border-violet-500'
                  : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
              )}
            >
              Publish to Lessons Library <IconNext />
            </button>
            <button className="mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border bg-slate-900 border-slate-800">
              <IconHome /> Home / Daily Brief
            </button>
          </GlassCard>

          <GlassCard title="Metrics" subtitle="Sanity overview">
            <ul className="text-sm text-slate-300 space-y-1">
              <li>P&L: {pct(pnlPct, 1)}</li>
              <li>Holding period: {holdDays} days</li>
              <li>Portfolio hit-rate (rolling): {pct(hitRate, 0)}</li>
            </ul>
          </GlassCard>
        </div>
      </div>

      {/* Footer */}
      <div className="h-28 border-t border-slate-800 bg-slate-950/80 p-2 flex gap-2">
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 overflow-y-auto">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Notes</div>
          <div className="text-sm text-slate-300">
            This template enforces a <strong>written learning loop</strong>. Publish to the{' '}
            <strong>Lessons Library</strong> once the gate is satisfied; excerpts flow back into
            future intake and red-team prompts.
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
        <GlassCard title="Parser Test" subtitle="Ensure symbols render">
          <div className="text-sm text-slate-300">
            Rules: {'≥ 2 errors'}, {'≥ 2 lessons'}, {'Doc fill = 100%'}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
