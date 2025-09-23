import React, { useMemo, useState, useCallback } from 'react'
import { useMonitoring } from '@/hooks/useMonitoring'
import { useScenarioLab } from '@/hooks/useScenarioLab'
import { useWorkflow } from '@/hooks/useWorkflow'

// Types
interface WorkflowStage {
  slug: string
  title: string
}

interface ResearchLogInput {
  stageSlug: string
  stageTitle: string
  action: string
  details?: string
  timestamp?: string
}

type Tone = 'slate' | 'violet' | 'emerald' | 'amber' | 'rose' | 'blue'

type KPI = {
  id: string
  name: string
  unit: string
  latest: number
  plan: number
  band: number
  series: number[]
  diff?: number
  ok?: boolean
}

type Catalyst = {
  id: number
  when: string
  what: string
  type: string
}

type JournalEntry = {
  id: string
  when: string
  who: string
  text: string
  tags: string[]
}

// ---------------- helpers ----------------
const cls = (...s: (string | false | null | undefined)[]): string => s.filter(Boolean).join(' ')
const clamp = (x: number, min: number, max: number): number => Math.max(min, Math.min(max, x))
const fmt = (n: number, d = 2): string =>
  Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : '-'
const pct = (x: number, d = 1): string => `${fmt(x, d)}%`

// Custom Card from mockup
interface CustomCardProps {
  title: string
  subtitle?: string
  right?: React.ReactNode
  children: React.ReactNode
}

function CustomCard({ title, subtitle, right, children }: CustomCardProps) {
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

interface CustomTagProps {
  tone?: Tone
  children: React.ReactNode
}

function CustomTag({ tone = 'slate' as Tone, children }: CustomTagProps) {
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

function ProgressBar({ value, tone = 'violet' }: { value: number; tone?: Tone }) {
  const color =
    tone === 'emerald'
      ? 'bg-emerald-500'
      : tone === 'amber'
        ? 'bg-amber-500'
        : tone === 'rose'
          ? 'bg-rose-500'
          : 'bg-violet-500'
  return (
    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
      <div className={cls('h-full', color)} style={{ width: `${clamp(value, 0, 100)}%` }} />
    </div>
  )
}

function Sparkline({ points = [], height = 36 }: { points: number[]; height?: number }) {
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
function IconEye() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </span>
  )
}

function IconCalendar() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M8 2v4M16 2v4" />
        <rect x="3" y="6" width="18" height="16" rx="2" />
      </svg>
    </span>
  )
}

function IconAlert() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 5 3 9H3c0-4 3-2 3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    </span>
  )
}

function IconDiff() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 20V4M18 10h-4M10 14H6" />
      </svg>
    </span>
  )
}

function IconBook() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M20 22H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20Z" />
      </svg>
    </span>
  )
}

function IconHealth() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M20.5 6.5 17 10l-3-3-4 5-2-2-4.5 6.5" />
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

// ---------------- main ----------------
export default function MonitoringDashboard() {
  const { deltas, alerts, acknowledgeAlert } = useMonitoring()
  const { simulation, state: scenarioState } = useScenarioLab()
  const { researchLog, logEvent } = useWorkflow()

  const [journalInput, setJournalInput] = useState('')

  // Derived KPIs from deltas (mock series)
  const kpis: KPI[] = useMemo(() => {
    if (deltas.length > 0) {
      return deltas.map((d) => {
        const plan = 100 // Stub
        const latest = plan + Math.abs(d.variance) // Mock from variance
        const band = 5 // Stub
        const series = Array.from({ length: 7 }, (_, i) => plan + (i - 3) * (d.variance / 6)) // Simple trend
        const diff = latest - plan
        const ok = Math.abs(diff) <= band
        return {
          id: d.id,
          name: d.metric,
          unit: '%',
          latest,
          plan,
          band,
          series,
          diff,
          ok
        }
      })
    }
    // Demo fallback
    return [
      {
        id: 'ARR',
        name: 'ARR growth',
        unit: '% YoY',
        latest: 18.2,
        plan: 16.0,
        band: 12,
        series: [12, 13, 14, 16, 17, 17.8, 18.2]
      },
      {
        id: 'GM',
        name: 'Gross margin',
        unit: '%',
        latest: 61.5,
        plan: 60.0,
        band: 3,
        series: [58, 59, 60, 60.5, 60.8, 61.2, 61.5]
      },
      {
        id: 'NDE',
        name: 'Net debt/EBITDA',
        unit: 'x',
        latest: 0.2,
        plan: 0.4,
        band: 0.5,
        series: [1.1, 0.9, 0.7, 0.5, 0.3, 0.25, 0.2]
      },
      {
        id: 'NRR',
        name: 'Net retention',
        unit: '%',
        latest: 118,
        plan: 115,
        band: 5,
        series: [110, 112, 113, 114, 116, 117, 118]
      }
    ]
  }, [deltas])

  // Catalysts from researchLog or demo
  const catalysts: Catalyst[] = useMemo(() => {
    const logCatalysts = researchLog
      .filter((entry) => entry.action.includes('event') || entry.action.includes('catalyst'))
      .slice(0, 3)
      .map((entry, id) => ({
        id,
        when: new Date(entry.timestamp).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          timeZone: 'America/New_York'
        }),
        what: entry.details || 'Catalyst Event',
        type: entry.action.includes('earn')
          ? 'Earnings'
          : entry.action.includes('kpi')
            ? 'KPI'
            : 'Event'
      }))
    return logCatalysts.length > 0
      ? logCatalysts
      : [
          { id: 1, when: '2025-09-22 14:00 ET', what: 'TKR Q2 Earnings', type: 'Earnings' },
          { id: 2, when: '2025-10-01', what: 'ACME Investor Day', type: 'Event' },
          { id: 3, when: '2025-10-05', what: 'NTR Monthly KPI', type: 'KPI' }
        ]
  }, [researchLog])

  // Alerts with extensions
  const alertsData = useMemo(
    () =>
      alerts.map((a) => ({
        ...a,
        age: 'Today', // Stub
        tone: a.severity === 'critical' ? 'rose' : a.severity === 'warning' ? 'amber' : 'slate'
      })),
    [alerts]
  )

  // Journal from researchLog or demo
  const journal: JournalEntry[] = useMemo(() => {
    const logJournal = researchLog
      .filter((entry) => entry.details && entry.action !== 'journal')
      .slice(0, 5)
      .reverse()
      .map((entry, id) => ({
        id: entry.id,
        when: new Date(entry.timestamp).toISOString().slice(0, 10),
        who: entry.stageTitle || 'Drew',
        text: entry.details || entry.action,
        tags: [entry.stageTitle || 'note']
      }))
    return logJournal.length > 0
      ? logJournal
      : [
          {
            id: 'j1',
            when: '2025-09-10',
            who: 'Drew',
            text: 'Initiated 3.0% @ 41.20 (TKR). Thesis: pricing power from renewals; risk: lease step-up capex.',
            tags: ['init', 'TKR']
          },
          {
            id: 'j2',
            when: '2025-10-15',
            who: 'Drew',
            text: 'Added 1.0% on KPI beat (ACME). Set alert bands tighter.',
            tags: ['add', 'ACME']
          }
        ]
  }, [researchLog])

  // Thesis-delta
  const thesisDelta = useMemo(
    () =>
      kpis.map((k) => ({
        ...k,
        diff: k.latest - k.plan,
        ok: k.id === 'NDE' ? k.latest <= k.plan + k.band : k.latest >= k.plan - k.band
      })),
    [kpis]
  )

  const healthScore = useMemo(
    () =>
      Math.round(
        (thesisDelta.reduce((s, k) => s + (k.ok ? 1 : 0), 0) / Math.max(1, thesisDelta.length)) *
          100
      ),
    [thesisDelta]
  )
  const healthTone = healthScore >= 80 ? 'emerald' : healthScore >= 60 ? 'amber' : 'rose'

  // Gate logic
  const kpiChecked = kpis.length > 0
  const catalystsReviewed = catalysts.length > 0
  const hasRecentJournal = journal.some((j) => {
    const journalDate = new Date(j.when)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    return journalDate > thirtyDaysAgo
  })
  const gatePct = Math.round(
    (((kpiChecked ? 1 : 0) + (catalystsReviewed ? 1 : 0) + (hasRecentJournal ? 1 : 0)) / 3) * 100
  )
  const gateReady = gatePct >= 100 && alertsData.filter((a) => a.tone === 'rose').length === 0

  // Handlers
  const addEntry = useCallback(async () => {
    if (!journalInput.trim()) return
    const when = new Date().toISOString().slice(0, 10)
    await logEvent({
      stageSlug: 'monitoring',
      stageTitle: 'Monitoring & Journal',
      action: 'journal',
      details: journalInput.trim(),
      timestamp: new Date().toISOString()
    }).catch(console.warn)
    setJournalInput('')
  }, [journalInput, logEvent])

  const handleAckAlert = useCallback(
    (id: string) => {
      acknowledgeAlert(id)
    },
    [acknowledgeAlert]
  )

  return (
    <div className="w-full min-h-[calc(100vh-16px)] bg-slate-950 text-slate-100 rounded-xl overflow-hidden ring-1 ring-slate-800">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/70 backdrop-blur px-4 py-3 flex items-center gap-3">
        <div className="text-sm text-slate-300 min-w-[260px] inline-flex items-center gap-2">
          <IconEye /> Monitoring & Journal
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <CustomTag tone={healthTone}>
            <IconHealth /> Health {healthScore}%
          </CustomTag>
          <CustomTag tone="slate">KPIs {kpis.length}</CustomTag>
          <CustomTag tone="slate">Catalysts {catalysts.length}</CustomTag>
          <CustomTag tone={alertsData.length ? 'amber' : 'emerald'}>
            <IconAlert /> Alerts {alertsData.length}
          </CustomTag>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 grid grid-cols-12 gap-4">
        {/* Left: KPIs & Catalysts */}
        <div className="col-span-12 xl:col-span-3 space-y-4">
          <CustomCard title="KPI Tracker" subtitle="Plan vs latest; within band?">
            <div className="space-y-3">
              {thesisDelta.map((k) => (
                <div key={k.id} className="bg-slate-950/50 rounded-xl p-3 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-400">{k.name}</div>
                    <CustomTag tone={k.ok ? 'emerald' : 'rose'}>
                      {k.ok ? 'On-track' : 'Off-track'}
                    </CustomTag>
                  </div>
                  <div className="mt-1">
                    <Sparkline points={k.series} />
                  </div>
                  <div className="text-xs text-slate-500">
                    Latest {fmt(k.latest)}
                    {k.unit} • Plan {fmt(k.plan)}
                    {k.unit} • Δ {fmt(k.diff, 1)}
                  </div>
                </div>
              ))}
            </div>
          </CustomCard>

          <CustomCard
            title="Catalyst Calendar"
            subtitle="Upcoming"
            right={
              <CustomTag tone="blue">
                <IconCalendar /> view
              </CustomTag>
            }
          >
            <ul className="text-sm text-slate-300 space-y-2">
              {catalysts.map((c) => (
                <li key={c.id} className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                  <div className="text-slate-200 font-medium truncate">{c.what}</div>
                  <div className="text-xs text-slate-500">{c.when}</div>
                  <CustomTag
                    tone={c.type === 'Earnings' ? 'violet' : c.type === 'KPI' ? 'emerald' : 'amber'}
                  >
                    {c.type}
                  </CustomTag>
                </li>
              ))}
            </ul>
          </CustomCard>
        </div>

        {/* Center: Thesis-Delta & Journal */}
        <div className="col-span-12 xl:col-span-6 space-y-4">
          <CustomCard
            title="Thesis-Delta"
            subtitle="What changed since entry?"
            right={
              <CustomTag tone="slate">
                <IconDiff /> diffs
              </CustomTag>
            }
          >
            <div className="grid md:grid-cols-3 gap-3">
              <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800">
                <div className="text-xs text-slate-400 mb-1">Unit economics</div>
                <div className="text-sm text-slate-200">
                  FCF margin trending \u2191; maintenance capex stable; WC cycle normalizing.
                </div>
              </div>
              <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800">
                <div className="text-xs text-slate-400 mb-1">Competitive position</div>
                <div className="text-sm text-slate-200">
                  Churn \u003c= plan; new entrant in SMB; pricing\u2191 on renewals holds.
                </div>
              </div>
              <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800">
                <div className="text-xs text-slate-400 mb-1">Valuation vs range</div>
                <div className="text-sm text-slate-200">
                  Price within MOS; base EPV unchanged; bear raised slightly on leverage progress.
                </div>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-slate-400 mb-1">Thesis Health</div>
              <ProgressBar value={healthScore} tone={healthTone} />
              <div className="text-xs text-slate-500 mt-1">
                Composite score based on KPI bands, risk events, and valuation drift.
              </div>
            </div>
          </CustomCard>

          <CustomCard
            title="Decision Journal"
            subtitle="Newest first"
            right={
              <CustomTag tone="violet">
                <IconBook /> log
              </CustomTag>
            }
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  value={journalInput}
                  onChange={(e) => setJournalInput(e.target.value)}
                  className="flex-1 bg-slate-950/60 border border-slate-800 rounded px-2 py-1 text-sm"
                  placeholder="Add a journal entry… include what changed and why."
                  onKeyDown={(e) => e.key === 'Enter' && addEntry()}
                />
                <button
                  onClick={addEntry}
                  className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm"
                >
                  Add
                </button>
              </div>
              <ul className="text-sm text-slate-300 space-y-2">
                {journal.map((j) => (
                  <li key={j.id} className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                    <div className="text-xs text-slate-500">
                      {j.when} • {j.who}
                    </div>
                    <div className="text-slate-200">{j.text}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {j.tags.map((t) => (
                        <CustomTag key={t} tone="slate">
                          {t}
                        </CustomTag>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </CustomCard>
        </div>

        {/* Right: Alerts, Rules & Gate */}
        <div className="col-span-12 xl:col-span-3 space-y-4">
          <CustomCard
            title="Active Alerts"
            subtitle="Acknowledge or adjust"
            right={
              <CustomTag tone={alertsData.length ? 'amber' : 'emerald'}>
                <IconAlert /> {alertsData.length}
              </CustomTag>
            }
          >
            <ul className="text-sm text-slate-300 space-y-2">
              {alertsData.length === 0 && <li className="text-slate-500">No active alerts.</li>}
              {alertsData.map((a) => (
                <li
                  key={a.id}
                  className={cls(
                    'bg-slate-950/50 border border-slate-800 rounded-md p-2 flex items-start justify-between gap-2',
                    a.tone === 'rose'
                      ? 'border-rose-900'
                      : a.tone === 'amber'
                        ? 'border-amber-900'
                        : 'border-slate-800'
                  )}
                >
                  <div>
                    <div className="text-slate-200">{a.text || a.trigger}</div>
                    <div className="text-xs text-slate-500">{a.age}</div>
                  </div>
                  <button
                    onClick={() => handleAckAlert(a.id)}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Acknowledge
                  </button>
                </li>
              ))}
            </ul>
          </CustomCard>

          <CustomCard
            title="Alert Rules (stub)"
            subtitle="Price, KPIs, news"
            right={<CustomTag tone="blue">rules</CustomTag>}
          >
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label>
                Price band %
                <input
                  type="number"
                  step="0.5"
                  defaultValue={7}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1"
                />
              </label>
              <label>
                KPI variance sd
                <input
                  type="number"
                  step="0.5"
                  defaultValue={2}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1"
                />
              </label>
              <label className="col-span-2">
                News watch
                <input
                  type="text"
                  defaultValue={'supplier dispute OR data breach OR accounting restatement'}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1"
                />
              </label>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              In production, rules write to the alerts engine and broker or data feeds.
            </div>
          </CustomCard>

          <CustomCard
            title="Quarterly Update Gate"
            subtitle="Close the loop"
            right={
              <CustomTag tone={gateReady ? 'emerald' : 'amber'}>
                {gateReady ? 'Ready' : 'Incomplete'}
              </CustomTag>
            }
          >
            <div className="text-xs text-slate-400 mb-1">Checklist progress</div>
            <ProgressBar value={gatePct} tone={gateReady ? 'emerald' : 'amber'} />
            <ol className="text-sm text-slate-300 list-decimal list-inside mt-2 space-y-1">
              <li>KPI review logged</li>
              <li>Catalyst outcomes recorded</li>
              <li>Journal updated in last 30 days</li>
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
              Open Post-Mortem Template <IconNext />
            </button>
          </CustomCard>
        </div>
      </div>

      {/* Footer */}
      <div className="h-28 border-t border-slate-800 bg-slate-950/80 p-2 flex gap-2">
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 overflow-y-auto">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Notes</div>
          <div className="text-sm text-slate-300">
            Monitoring turns **assumptions into tests**. KPIs track bands, catalysts anchor dates,
            and the Journal captures decisions and reasoning. The **Quarterly Update Gate** enforces
            a written review before the next sizing or exit.
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
        <CustomCard title="Parser Test" subtitle="Ensure symbols render">
          <div className="text-sm text-slate-300">
            Rules: {'NRR ≥ plan'}, {'NDE ≤ plan + band'}, {'Price band alerts'}
          </div>
        </CustomCard>
      </div>
    </div>
  )
}
