import React, { useMemo, useState, useCallback } from 'react'
import { useMonitoring } from '@/hooks/useMonitoring'
import { useWorkflow } from '@/hooks/useWorkflow'

interface Lesson {
  id: string
  title: string
  scope: string
  impact: string
  uses: number
  date: string
  tags: string[]
  guidance: string
  linked: string[]
}

interface CardProps {
  title: string
  subtitle?: string
  right?: React.ReactNode
  children: React.ReactNode
}

interface TagProps {
  tone?: string
  children: React.ReactNode
}

interface MiniBarProps {
  label: string
  value: number
  right?: string
}

// Helpers
const cls = (...s: any[]) => s.filter(Boolean).join(' ')
const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x))
const fmt = (n: number, d = 0) =>
  Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : '-'

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

function Tag({ tone = 'slate', children }: TagProps) {
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

function MiniBar({ label, value, right }: MiniBarProps) {
  const pctw = clamp(value, 0, 100)
  return (
    <div className="flex items-center gap-2">
      <div className="text-xs w-28 text-slate-400 truncate">{label}</div>
      <div className="flex-1 h-2 bg-slate-800 rounded">
        <div className="h-2 bg-sky-500 rounded" style={{ width: `${pctw}%` }} />
      </div>
      <div className="text-xs text-slate-300 w-14 text-right">
        {right ?? `${Math.round(pctw)}%`}
      </div>
    </div>
  )
}

// Icons (stubbed as text for simplicity, replace with SVGs if needed)
const IconBook = () => (
  <span className="inline-block w-4 h-4" title="Book">
    📖
  </span>
)
const IconSearch = () => (
  <span className="inline-block w-4 h-4" title="Search">
    🔍
  </span>
)
const IconTagIcon = () => (
  <span className="inline-block w-4 h-4" title="Tag">
    🏷️
  </span>
)
const IconSend = () => (
  <span className="inline-block w-4 h-4" title="Send">
    📤
  </span>
)
const IconSpark = () => (
  <span className="inline-block w-4 h-4" title="Spark">
    ⚡
  </span>
)
const IconPin = () => (
  <span className="inline-block w-4 h-4" title="Pin">
    📌
  </span>
)
const IconNext = () => (
  <span className="inline-block w-4 h-4" title="Next">
    →
  </span>
)

function MemoHistoryTimeline() {
  const { lessons } = useMonitoring()
  const { logEvent } = useWorkflow()

  // Stub lessons from monitoring or demo
  const [rows, setRows] = useState(() => {
    if (lessons && lessons.length > 0) {
      return lessons.map((l, index) => ({
        id: l.id,
        title: l.title,
        scope: 'Analysis', // Stub
        impact: 'Medium', // Stub
        uses: Math.floor(Math.random() * 20), // Stub
        date: new Date().toISOString().slice(0, 10), // Stub
        tags: ['analysis'], // Stub
        guidance: l.insight || 'Stub guidance.', // Use insight if available
        linked: ['Stub link'] // Stub
      }))
    }
    // Demo fallback
    return [
      {
        id: 'L-001',
        title: 'Footnote-level capex check before EPV sign-off',
        scope: 'Analysis',
        impact: 'High',
        uses: 12,
        date: '2025-09-15',
        tags: ['capex-estimates', 'EPV', 'accounting'],
        guidance:
          'Ensure footnote walk for capex; reconcile maintenance vs growth; tie to EPV bridge; set alert when capex > plan by 20%.',
        linked: ['TKR-2025-06 (gain)', 'ACME-2025-08 (add)', 'NTR-2025-05 (trim)']
      },
      {
        id: 'L-002',
        title: 'Move adds to rule-based ladder when price bands hit',
        scope: 'Execution',
        impact: 'Medium',
        uses: 8,
        date: '2025-08-05',
        tags: ['execution', 'bands', 'sizing'],
        guidance: 'Add ladder rule to execution plan; trigger on price band breach.',
        linked: ['TKR-2025-07']
      },
      {
        id: 'L-003',
        title: 'Steelman the short before IC to surface blind spots',
        scope: 'Process',
        impact: 'High',
        uses: 15,
        date: '2025-07-22',
        tags: ['red-team', 'IC'],
        linked: ['All ICs']
      },
      {
        id: 'L-004',
        title: 'Prefer owner-earnings vs GAAP for cash businesses',
        scope: 'Analysis',
        impact: 'Medium',
        uses: 21,
        date: '2025-06-18',
        tags: ['owner-earnings', 'quality'],
        guidance: 'Adjust for stock-based comp and non-cash items; use normalized capex.',
        linked: ['ACME-2025-04']
      },
      {
        id: 'L-005',
        title: 'For micro-caps, enforce ADV pacing ≤ 10%',
        scope: 'Risk',
        impact: 'High',
        uses: 6,
        date: '2025-05-12',
        tags: ['liquidity', 'ADV', 'risk'],
        guidance: 'Cap daily volume in execution rules; use VWAP for entries.',
        linked: ['NTR-2025-02']
      }
    ]
  })

  const [query, setQuery] = useState('')
  const [scope, setScope] = useState('All')
  const [time, setTime] = useState('12m')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [activeId, setActiveId] = useState(rows[0]?.id || '')
  const [applyScope, setApplyScope] = useState('Global')
  const [pin, setPin] = useState(false)

  const active = useMemo(() => rows.find((r) => r.id === activeId) || rows[0], [rows, activeId])

  // Filtered rows
  const filtered = useMemo(() => {
    let filteredRows = rows.filter((r) => {
      if (scope !== 'All' && r.scope !== scope) return false
      if (selectedTags.length > 0 && !selectedTags.every((t) => r.tags.includes(t))) return false
      if (
        query.trim() &&
        !r.title.toLowerCase().includes(query.toLowerCase()) &&
        !r.tags.some((t) => t.includes(query.toLowerCase()))
      )
        return false
      return true
    })
    // Time filter (stub - assume all are recent for demo)
    filteredRows = filteredRows.filter((r) => {
      const lessonDate = new Date(r.date)
      const monthsBack = time === '3m' ? 3 : time === '6m' ? 6 : 12
      const cutoff = new Date()
      cutoff.setMonth(cutoff.getMonth() - monthsBack)
      return lessonDate >= cutoff
    })
    return filteredRows
  }, [rows, scope, selectedTags, query, time])

  // Library stats
  const stats = useMemo(() => {
    const total = filtered.length
    const byScope = [
      { s: 'Process', n: rows.filter((r) => r.scope === 'Process').length },
      { s: 'Analysis', n: rows.filter((r) => r.scope === 'Analysis').length },
      { s: 'Execution', n: rows.filter((r) => r.scope === 'Execution').length },
      { s: 'Risk', n: rows.filter((r) => r.scope === 'Risk').length },
      { s: 'Accounting', n: rows.filter((r) => r.scope === 'Accounting').length }
    ]
    const reuse = Math.round(rows.reduce((s, r) => s + r.uses, 0) / Math.max(1, rows.length))
    const lastAdded =
      rows.length > 0 ? [...rows].sort((a, b) => b.date.localeCompare(a.date))[0]?.date : ''
    return { total, byScope, reuse, lastAdded }
  }, [rows])

  // Toggle tag
  const toggleTag = useCallback((t: string) => {
    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }, [])

  // Apply lesson stub
  const applyLesson = useCallback(
    (lessonId: string, scope: string, pin: boolean) => {
      console.log('Applying lesson', { lessonId, scope, pin })
      // In full: logEvent({ action: 'apply-lesson', details: JSON.stringify({ id: lessonId, scope, pin }) });
    },
    [logEvent]
  )

  // Export CSV
  const exportCSV = useCallback(() => {
    const headers = 'ID,Title,Scope,Impact,Uses,Date,Tags\n'
    const csv =
      headers +
      filtered
        .map(
          (r) =>
            `${r.id},${r.title},${r.scope},${r.impact},${r.uses},${r.date},"${r.tags.join(', ')}"`
        )
        .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lessons-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [filtered])

  return (
    <div className="w-full min-h-[calc(100vh-16px)] bg-slate-950 text-slate-100 rounded-xl overflow-hidden ring-1 ring-slate-800">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/70 backdrop-blur px-4 py-3 flex items-center gap-3">
        <div className="text-sm text-slate-300 min-w-[260px] inline-flex items-center gap-2">
          <IconBook />
          Lessons Library
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Tag tone="slate">Lessons {stats.total}</Tag>
          <Tag tone="slate">Avg reuse {stats.reuse}×</Tag>
          <Tag tone="blue">
            <IconSpark />
            priors
          </Tag>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 grid grid-cols-12 gap-4">
        {/* Left: Filters & Tags */}
        <div className="col-span-12 xl:col-span-3 space-y-4">
          <Card title="Search & Filter" subtitle="Narrow the library">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
              <IconSearch />
              <input
                className="bg-transparent outline-none text-sm text-slate-100 placeholder-slate-500 w-full"
                placeholder="Search titles or tags"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm mt-2">
              <label>
                Scope
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1"
                >
                  {['All', 'Process', 'Analysis', 'Execution', 'Risk', 'Accounting'].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Time
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1"
                >
                  {['3m', '6m', '12m', 'All'].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Card>

          <Card
            title="Tags"
            subtitle="Click to filter"
            right={<Tag tone="slate">{selectedTags.length}</Tag>}
          >
            <div className="flex flex-wrap gap-1">
              {['pricing-power', 'capex-estimates', 'execution', 'governance', 'moat'].map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={cls(
                    'px-2 py-1 rounded-md border text-xs',
                    selectedTags.includes(t)
                      ? 'bg-violet-600 text-white border-violet-500'
                      : 'bg-slate-950/50 text-slate-300 border-slate-800'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Tags come from Post-Mortem and Red-Team sessions.
            </div>
          </Card>

          <Card title="Coverage by Scope" subtitle="Share of lessons">
            <div className="space-y-2">
              {stats.byScope.map((obj) => (
                <MiniBar
                  key={obj.s}
                  label={obj.s}
                  value={Math.round((obj.n / Math.max(1, stats.total)) * 100)}
                  right={`${obj.n}`}
                />
              ))}
            </div>
          </Card>
        </div>

        {/* Center: Lessons List & Stats */}
        <div className="col-span-12 xl:col-span-6 space-y-4">
          <Card
            title="Lessons"
            subtitle="Click a row to view details"
            right={<Tag tone="blue">{filtered.length}</Tag>}
          >
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400">
                  <tr className="border-b border-slate-800">
                    {['ID', 'Title', 'Scope', 'Impact', 'Reuse', 'Date', 'Tags'].map((h) => (
                      <th key={h} className="px-2 py-1 text-left whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      className={cls(
                        'border-b border-slate-900/60 hover:bg-slate-900/40 cursor-pointer',
                        activeId === r.id ? 'bg-slate-900/60' : ''
                      )}
                      onClick={() => setActiveId(r.id)}
                    >
                      <td className="px-2 py-1 font-medium">{r.id}</td>
                      <td className="px-2 py-1 text-slate-200 truncate max-w-[260px]">{r.title}</td>
                      <td className="px-2 py-1">{r.scope}</td>
                      <td className="px-2 py-1">{r.impact}</td>
                      <td className="px-2 py-1">{r.uses}</td>
                      <td className="px-2 py-1">{r.date}</td>
                      <td className="px-2 py-1">
                        <div className="flex flex-wrap gap-1">
                          {r.tags.slice(0, 3).map((t) => (
                            <Tag key={t} tone="slate">
                              {t}
                            </Tag>
                          ))}
                          {r.tags.length > 3 && <Tag tone="slate">+{r.tags.length - 3}</Tag>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Library Stats" subtitle="Reuse & drift impact">
            <div className="grid md:grid-cols-3 gap-2">
              <div className="bg-slate-950/50 border border-slate-800 rounded p-2 text-center">
                <div className="text-xs text-slate-400">Total lessons</div>
                <div className="text-xl font-semibold">{stats.total}</div>
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded p-2 text-center">
                <div className="text-xs text-slate-400">Avg reuse</div>
                <div className="text-xl font-semibold">{stats.reuse}×</div>
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded p-2 text-center">
                <div className="text-xs text-slate-400">Last added</div>
                <div className="text-xl font-semibold">{stats.lastAdded}</div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <button
                onClick={exportCSV}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800"
              >
                Export CSV
              </button>
              <button className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800">
                Open in Notebook (stub)
              </button>
            </div>
          </Card>
        </div>

        {/* Right: Lesson Detail & Apply-as-Prior */}
        <div className="col-span-12 xl:col-span-3 space-y-4">
          <Card
            title="Lesson Detail"
            subtitle={active?.id}
            right={
              <Tag tone="violet">
                <IconPin />
                prior
              </Tag>
            }
          >
            <div className="text-sm text-slate-200">{active?.title}</div>
            <div className="text-xs text-slate-500 mt-1">
              Scope: {active?.scope} • Impact: {active?.impact} • Date: {active?.date}
            </div>
            <div className="mt-2 text-sm text-slate-300">{active?.guidance}</div>
            <div className="mt-2 text-xs text-slate-400">
              Linked trades: {active?.linked?.join(', ') || 'None'}
            </div>
          </Card>

          <Card
            title="Apply as Prior"
            subtitle="Where to use"
            right={<Tag tone="slate">scope</Tag>}
          >
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label>
                Scope
                <select
                  value={applyScope}
                  onChange={(e) => setApplyScope(e.target.value)}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1"
                >
                  {['Global', 'Idea', 'Sector'].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Pin to stage
                <select className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1">
                  {[
                    'Intake',
                    'One-Pager',
                    'Dossier',
                    'Data',
                    'Financials',
                    'Valuation',
                    'Scenarios',
                    'IC',
                    'Execution',
                    'Monitoring'
                  ].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-2 inline-flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  checked={pin}
                  onChange={(e) => setPin(e.target.checked)}
                  className="accent-violet-500"
                />
                <span>Pin as checklist item</span>
              </label>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => applyLesson(active?.id || '', applyScope, pin)}
                className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm inline-flex items-center gap-1"
              >
                <IconSend />
                Send to Omni-Prompt
              </button>
              <button
                onClick={() => console.log('Add to Playbook', { scope: applyScope, pin })}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm"
              >
                Add to Playbook
              </button>
            </div>
          </Card>

          <Card
            title="Quick Prompts"
            subtitle="Leverage this lesson"
            right={
              <Tag tone="blue">
                <IconSpark />
                seeds
              </Tag>
            }
          >
            <ul className="text-sm text-slate-300 space-y-2">
              {[
                'Scan the 10-K footnotes for capex disclosure and reconcile to cash flow.',
                'Build an EPV bridge that separates maintenance vs growth capex.',
                'Generate alert rules when capex variance exceeds 20% vs plan.'
              ].map((q, i) => (
                <li key={i}>
                  <button
                    onClick={() => console.log('Prompt used', q)}
                    className="w-full text-left bg-slate-950/50 border border-slate-800 rounded-md p-2 hover:bg-slate-900/60"
                  >
                    {q}
                  </button>
                </li>
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
            The Lessons Library turns **experience into priors**. Apply items globally or pin them
            to specific stages so they appear as checklists or prompt seeds at the right time.
            Publishing from **Post-Mortem** auto-adds tags and links trades.
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
        <Card title="Parser Test" subtitle="Ensure symbols render">
          <div className="text-sm text-slate-300">
            Rules: {'ADV ≤ 10%'}, {'Capex variance > 20% triggers alert'},{' '}
            {'Owner-earnings guidance'}
          </div>
        </Card>
      </div>
    </div>
  )
}

export { MemoHistoryTimeline }
export default MemoHistoryTimeline
