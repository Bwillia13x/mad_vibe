import React, { useState } from 'react'

// ------------------------ helpers & primitives -----------------------------
const cls = (...s: (string | undefined | false)[]) => s.filter(Boolean).join(' ')

function Card({
  title,
  subtitle,
  right,
  children
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
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

function Tag({
  tone = 'slate',
  children
}: {
  tone?: 'slate' | 'violet' | 'emerald' | 'amber' | 'rose' | 'blue'
  children: React.ReactNode
}) {
  const palette = {
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

function Field({
  label,
  placeholder,
  value,
  onChange,
  required = false
}: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  return (
    <label className="block">
      <div className="text-xs text-slate-400 mb-1">
        {label} {required && <span className="text-violet-400">*</span>}
      </div>
      <input
        className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </label>
  )
}

function TextArea({
  label,
  placeholder,
  value,
  onChange,
  rows = 5,
  required = false
}: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  rows?: number
  required?: boolean
}) {
  return (
    <label className="block">
      <div className="text-xs text-slate-400 mb-1">
        {label} {required && <span className="text-violet-400">*</span>}
      </div>
      <textarea
        rows={rows}
        className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors resize-vertical"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </label>
  )
}

function Pill({
  children,
  active,
  onClick
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cls(
        'px-2 py-1 rounded-full text-xs border',
        active
          ? 'bg-emerald-700/30 border-emerald-700 text-emerald-100'
          : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-900'
      )}
    >
      {children}
    </button>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
      <div
        className="h-full bg-violet-500"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

// ------------------------ Icon components (wrapped) ------------------------
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
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-3.5-3.5" />
      </svg>
    </span>
  )
}

function IconClock() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    </span>
  )
}

function IconBolt() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
      </svg>
    </span>
  )
}

function IconCheck() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m20 6-11 11L4 12" />
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

// ------------------------ page component -----------------------------------
export default function IdeaIntake() {
  // Omni‑Prompt
  const [prompt, setPrompt] = useState('')
  const [history, setHistory] = useState<{ q: string; t: string }[]>([])

  // Intake fields
  const [ticker, setTicker] = useState('')
  const [source, setSource] = useState('')
  const [whyNow, setWhyNow] = useState('')
  const [thesis, setThesis] = useState('')
  const [disquals, setDisquals] = useState<string[]>([]) // array of strings

  // Triage decision
  const [triageDecision, setTriageDecision] = useState('Advance')

  // Current time for header display
  const currentTime = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })

  // Stage gate
  const gatePassed = thesis.trim().length > 0 && disquals.length >= 1

  // Whiteboard notes (simple demo)
  const [notes, setNotes] = useState([
    { id: 1, text: 'Unit economics improving', x: 12, y: 22, tone: 'emerald' as const },
    { id: 2, text: 'Customer conc. risk', x: 54, y: 64, tone: 'amber' as const },
    { id: 3, text: 'Reg. change watchlist', x: 68, y: 28, tone: 'rose' as const }
  ])

  const disqualifierOptions = [
    'Customer concentration',
    'Regulatory overhang',
    'Leverage/solvency',
    'Aggressive accounting',
    'No pricing power'
  ]

  function toggleDisqual(d: string) {
    setDisquals((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }

  function onPromptSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!prompt.trim()) return
    const t = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
    setHistory([{ q: prompt.trim(), t }, ...history].slice(0, 8))
    setPrompt('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setPrompt('')
    }
  }

  function onNext() {
    // Placeholder: would navigate to Screener or One‑Pager depending on decision
    const t = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
    setHistory(
      [
        {
          q: `[Gate] ${triageDecision} to One-Pager`,
          t
        },
        ...history
      ].slice(0, 8)
    )
  }

  return (
    <div className="w-full bg-slate-950 text-slate-100 rounded-xl ring-1 ring-slate-800">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/70 backdrop-blur px-4 py-3 flex items-center gap-3">
        <div className="text-sm text-slate-300 flex items-center gap-2 min-w-[260px]">
          <span className="text-slate-500">Intake /</span>
          <span className="font-medium text-slate-100">Whiteboard</span>
          <span className="text-slate-600">•</span>
          <span className="inline-flex items-center gap-1 text-slate-400">
            <IconClock /> <span>{currentTime} MT</span>
          </span>
        </div>
        <form onSubmit={onPromptSubmit} className="flex-1 flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
            <span className="text-slate-500">
              <IconSearch />
            </span>
            <input
              className="bg-transparent outline-none text-sm text-slate-100 placeholder-slate-500 w-full"
              placeholder={
                "Ask the Pair Analyst… e.g., 'summarize last call; list 3 risks; ROIC>12% peers'"
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Omni-Prompt input"
            />
            <Tag tone="violet">Omni‑Prompt</Tag>
          </div>
          <button
            type="submit"
            className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm"
          >
            Send
          </button>
        </form>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs">
            Shortcuts
          </button>
          <button className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs">
            Settings
          </button>
        </div>
      </div>

      {/* Body grid */}
      <div className="p-4 grid grid-cols-12 gap-4">
        {/* Left: Inputs */}
        <div className="col-span-12 xl:col-span-4 space-y-4">
          <Card
            title="Inputs"
            subtitle="5‑minute triage fields"
            right={<Tag tone="slate">Required</Tag>}
          >
            <div className="grid sm:grid-cols-2 gap-3">
              <Field
                label="Ticker / Theme"
                placeholder="e.g., TKR or 'payments infra'"
                value={ticker}
                onChange={setTicker}
                required
              />
              <Field
                label="Source"
                placeholder="web clip, friend, screen…"
                value={source}
                onChange={setSource}
                required
              />
            </div>
            <div className="mt-3 grid gap-3">
              <TextArea
                label="Why now?"
                placeholder="catalyst, mispricing, forced seller…"
                value={whyNow}
                onChange={setWhyNow}
                rows={3}
                required
              />
              <TextArea
                label="Thesis stub (testable)"
                placeholder="Because X, Y, Z — expect ABC within 12–24m; disconfirming KPI is …"
                value={thesis}
                onChange={setThesis}
                rows={4}
                required
              />
            </div>
          </Card>

          <Card
            title="Disqualifiers"
            subtitle="Select 1+ if present"
            right={
              <Tag tone={disquals.length ? 'emerald' : 'slate'}>
                {disquals.length ? `${disquals.length} selected` : 'None'}
              </Tag>
            }
          >
            <div className="flex flex-wrap gap-2">
              {disqualifierOptions.map((d) => (
                <Pill key={d} active={disquals.includes(d)} onClick={() => toggleDisqual(d)}>
                  {d}
                </Pill>
              ))}
            </div>
            <div className="text-xs text-slate-500 mt-2">
              Tip: add custom disqualifiers later in Risk Register.
            </div>
          </Card>

          <Card title="Quality Hints" subtitle="Signals to watch">
            <ul className="text-sm text-slate-200 list-disc pl-5 space-y-1">
              <li>{'10y ROIC > 12% & low reinvestment needs'}</li>
              <li>Recurring revenue or switching costs</li>
              <li>Clean accounting; low accruals</li>
            </ul>
          </Card>
        </div>

        {/* Center: Work (auto‑draft + whiteboard) */}
        <div className="col-span-12 xl:col-span-5 space-y-4">
          <Card
            title="Auto‑Draft One‑Pager (preview)"
            subtitle="AI summary from filings/transcripts; you can edit later"
            right={<Tag tone="violet">Draft</Tag>}
          >
            <div className="text-sm text-slate-300">
              <p className="mb-2">
                Business gist, drivers, quick flags, and a rough EPV will appear here. Use the
                prompt to refine sections or request citations.
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { k: 'ROIC (10y)', v: '18%' },
                  { k: 'FCF Yield', v: '7.2%' },
                  { k: 'Leverage', v: 'Net cash' }
                ].map(({ k, v }, i) => (
                  <div key={k} className="bg-slate-950/50 rounded-xl p-3 border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">{k}</div>
                    <div className="text-lg text-slate-100">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card
            title="Whiteboard Canvas"
            subtitle="Free‑form notes; drag to arrange (static demo)"
            right={<Tag tone="slate">Canvas</Tag>}
          >
            <div className="relative h-72 rounded-xl border border-slate-800 bg-[linear-gradient(to_right,rgba(100,116,139,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(100,116,139,0.08)_1px,transparent_1px)] bg-[length:20px_20px] overflow-hidden p-2">
              {notes.map((n) => (
                <div
                  key={n.id}
                  className={cls(
                    'absolute w-48 rounded-lg p-3 text-sm shadow-md border',
                    n.tone === 'emerald' && 'bg-emerald-900/30 border-emerald-700 text-emerald-100',
                    n.tone === 'amber' && 'bg-amber-900/30 border-amber-700 text-amber-100',
                    n.tone === 'rose' && 'bg-rose-900/30 border-rose-700 text-rose-100'
                  )}
                  style={{ left: `${n.x}%`, top: `${n.y}%` }}
                >
                  {n.text}
                </div>
              ))}
              <div className="absolute bottom-2 right-2 text-xs text-slate-500">Static preview</div>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs hover:bg-slate-800 transition-colors"
                title="Add a new note to the whiteboard"
              >
                Add note
              </button>
              <button
                className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs hover:bg-slate-800 transition-colors"
                title="Attach evidence from filings or transcripts"
              >
                Attach evidence
              </button>
            </div>
          </Card>

          <Card
            title="Evidence Capture"
            subtitle="Link to filings / transcripts / notes"
            right={<Tag tone="emerald">3 cited</Tag>}
          >
            <ul className="text-sm text-slate-200 space-y-1 list-disc pl-5">
              <li>10‑K FY2024 (pp. 13–18)</li>
              <li>Q2 call transcript — CFO margin commentary</li>
              <li>Competitor filing — segment economics</li>
            </ul>
          </Card>
        </div>

        {/* Right: Outputs (gate, decision, next) */}
        <div className="col-span-12 xl:col-span-3 space-y-4">
          <Card
            title="AI Pair Analyst"
            subtitle="Explain • Verify • Challenge • Draft"
            right={<Tag tone="violet">Online</Tag>}
          >
            <ul className="text-sm text-slate-200 space-y-1">
              <li>Summarize 10‑K in 5 bullets with citations</li>
              <li>Explain revenue drivers in plain English</li>
              <li>List 3 contrarian risks vs consensus</li>
            </ul>
            <div className="text-xs text-slate-500 mt-2">
              Use the Omni‑Prompt above to trigger any of these.
            </div>
          </Card>

          <Card
            title="Stage Gate"
            subtitle="Complete to enable Next"
            right={
              <Tag tone={gatePassed ? 'emerald' : 'amber'}>
                {gatePassed ? 'Ready' : 'Incomplete'}
              </Tag>
            }
          >
            <ul className="text-sm space-y-2">
              <li className="flex items-center gap-2">
                <IconCheck />
                <span>Thesis stub provided</span>
              </li>
              <li className="flex items-center gap-2">
                <IconCheck />
                <span>{'≥ 1 disqualifier checked'}</span>
              </li>
            </ul>
            <div className="mt-3">
              <div className="text-xs text-slate-500 mb-1">Triage Decision</div>
              <div className="flex items-center gap-2">
                {['Advance', 'Park', 'Reject'].map((opt) => (
                  <label key={opt} className="inline-flex items-center gap-1 text-sm">
                    <input
                      type="radio"
                      name="triage"
                      className="accent-violet-500"
                      checked={triageDecision === opt}
                      onChange={() => setTriageDecision(opt)}
                    />{' '}
                    {opt}
                  </label>
                ))}
              </div>
              <button
                disabled={!gatePassed}
                onClick={onNext}
                className={cls(
                  'mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border',
                  gatePassed
                    ? 'bg-violet-600 hover:bg-violet-500 text-white border-violet-500'
                    : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
                )}
                title={
                  gatePassed
                    ? 'Proceed to One‑Pager'
                    : 'Provide thesis + select at least one disqualifier'
                }
              >
                Next <IconNext />
              </button>
            </div>
          </Card>

          <Card title="Research Log (preview)" subtitle="Audit entries">
            <ul className="text-sm text-slate-200 space-y-1">
              <li>10:02 — Created idea: {ticker || '—'}</li>
              <li>10:10 — Added disqualifiers: {disquals.length ? disquals.join(', ') : '—'}</li>
              <li>10:22 — Auto‑drafted One‑Pager (preview)</li>
              <li>10:25 — Triage decision: {triageDecision}</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Footer console */}
      <div className="h-40 border-top border-t border-slate-800 bg-slate-950/80 p-2 flex gap-2">
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
              <span className="text-slate-500">G then I</span> Go to Intake
            </li>
            <li>
              <span className="text-slate-500">J</span> Next Stage
            </li>
          </ul>
        </div>
      </div>

      {/* Dev Test (render-only) */}
      <div className="hidden">
        <Card
          title="Parser Test — Symbols and Icons"
          subtitle="Ensures '>' and icons render without parse errors"
        >
          <div className="text-sm text-slate-300 space-y-2">
            <div>Edge text: {'ROIC > 12%'}</div>
            <div className="inline-flex items-center gap-2">
              Icons: <IconSearch /> <IconBolt /> <IconClock />
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
