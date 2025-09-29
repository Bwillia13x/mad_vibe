// MadLab / Valor‑IVX — Pair Analyst (Omni‑Prompt) Console (Production Render v1)
// Layout: Left History & Quick Prompts • Center Chat & Tool Runs • Right Modes, Context & Citations
// Notes: No external libs. Icons wrapped. Avoid raw '>' in JSX text (use ≥ or \u003e). Minimal fake tool runner.

import React, { useMemo, useState, useCallback } from 'react'
import {
  MemoizedCard,
  MemoizedTag,
  IconSearch,
  IconSend,
  IconPaper,
  IconCite,
  IconSpark,
  IconBolt,
  IconCopy,
  IconTool,
  cn
} from '@/lib/workbench-ui.tsx'
import { Separator } from '@/components/ui/separator'

// Types
interface ChatMessage {
  who: 'system' | 'user' | 'assistant' | 'tool'
  body: string
  detail?: { k: string; v: string }[]
}

interface Attachment {
  id: string
  kind: string
  title: string
}

interface Citation {
  id: string
  src: string
  note: string
}

interface HistoryItem {
  q: string
}

// Memoized component for better performance
function MadLab_PairAnalyst_OmniPrompt_Prod() {
  const [mode, setMode] = useState('Explain') // Explain | Verify | Challenge | Draft
  const [grounding, setGrounding] = useState(['Filings', 'Transcripts', 'Models'])
  const [prompt, setPrompt] = useState(
    'Summarize TKR 10‑K with five bullets and page‑level citations.'
  )
  const [chat, setChat] = useState<ChatMessage[]>([
    { who: 'system', body: 'Pair Analyst ready. Set mode, attach context, then prompt (⌘K).' }
  ])
  const [history, setHistory] = useState<string[]>([])

  const [attachments, setAttachments] = useState<Attachment[]>([
    { id: '10K‑TKR‑2024', kind: 'Filing', title: 'TKR 10‑K 2024' },
    { id: 'Model‑TKR‑v3', kind: 'Model', title: 'Owner Earnings v3' }
  ])

  const [citations, setCitations] = useState<Citation[]>([
    { id: '10K‑p12', src: '10‑K p.12', note: 'Revenue by segment' },
    { id: 'TR‑Q2‑p3', src: 'Q2 Call p.3', note: 'Pricing commentary' }
  ])

  // Memoized static data for performance
  const quickPrompts = useMemo(
    () => [
      'Summarize the latest 10‑K in five bullets with page citations.',
      'Explain the business model and revenue drivers for TKR.',
      'List 3 plausible moat sources and the evidence for each.',
      'Run a quick EPV rough cut and compare to price.',
      'Find contradictions between memo v1 and filings.'
    ],
    []
  )

  const groundingOptions = useMemo(
    () => ['Filings', 'Transcripts', 'Models', 'Notes', 'Screens', 'External'],
    []
  )

  const modes = useMemo(() => ['Explain', 'Verify', 'Challenge', 'Draft'], [])

  const runPrompt = useCallback(() => {
    if (!prompt.trim()) return
    setHistory((prev) => [prompt.trim(), ...prev].slice(0, 12))
    // Fake response + tool calls depending on mode
    const tool =
      mode === 'Verify'
        ? 'EvidenceCheck'
        : mode === 'Challenge'
          ? 'RedTeamProbe'
          : mode === 'Draft'
            ? 'MemoWriter'
            : 'Summarizer'
    const resp: ChatMessage = {
      who: 'assistant',
      body: `(${mode}) Running ${tool} on ${attachments.length} attached objects with grounding ${grounding.join(', ')}. See tool log below.`
    }
    const toolLog: ChatMessage = {
      who: 'tool',
      body: `${tool}: searched citations, computed stats, and produced ${mode === 'Draft' ? 'a memo outline' : 'a bullet summary'}.`,
      detail: [
        { k: 'Search', v: 'filings: TKR 10‑K 2024; transcripts Q2; notes' },
        {
          k: 'Findings',
          v: 'Segment mix ↑ services; margin tailwinds from renewals; capex likely higher post‑2026.'
        },
        { k: 'Citations', v: '[10‑K p.12], [Q2 Call p.3]' }
      ]
    }
    setChat((prev) => [...prev, { who: 'user', body: prompt.trim() }, resp, toolLog])
    setPrompt('')
  }, [prompt, mode, attachments.length, grounding])

  const handleQuickAsk = useCallback((q: string) => {
    setPrompt(q)
  }, [])

  const toggleGrounding = useCallback((g: string) => {
    setGrounding((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))
  }, [])

  return (
    <div className="w-full min-h-[calc(100vh-16px)] bg-slate-950 text-slate-100 rounded-xl overflow-hidden ring-1 ring-slate-800">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/70 backdrop-blur px-4 py-3 flex items-center gap-3">
        <div className="text-sm text-slate-300 min-w-[260px] inline-flex items-center gap-2">
          <span className="text-violet-400">
            <IconSpark />
          </span>
          Pair Analyst — Omni‑Prompt
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <MemoizedTag tone="violet">Mode {mode}</MemoizedTag>
          <MemoizedTag tone="slate">Grounding {grounding.length}</MemoizedTag>
          <MemoizedTag tone="slate">Attachments {attachments.length}</MemoizedTag>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 grid grid-cols-12 gap-4">
        {/* Left: History & Quick Prompts */}
        <div className="col-span-12 xl:col-span-3 space-y-4">
          <MemoizedCard title="Prompt History" subtitle="Last 12">
            <ul className="text-sm text-slate-300 space-y-1">
              {history.length === 0 && <li className="text-slate-500">No prompts yet.</li>}
              {history.map((h, i) => (
                <li
                  key={i}
                  className="bg-slate-950/50 border border-slate-800 rounded-md p-2 flex items-center justify-between"
                >
                  <span className="truncate mr-2">{h}</span>
                  <button
                    className="text-xs text-slate-400 hover:text-slate-200"
                    onClick={() => setPrompt(h)}
                  >
                    <IconCopy />
                  </button>
                </li>
              ))}
            </ul>
          </MemoizedCard>

          <MemoizedCard
            title="Quick Prompts"
            subtitle="One‑click seeds"
            right={
              <MemoizedTag tone="blue">
                <IconBolt /> fast
              </MemoizedTag>
            }
          >
            <ul className="text-sm text-slate-300 space-y-2">
              {quickPrompts.map((q, i) => (
                <li key={i}>
                  <button
                    onClick={() => handleQuickAsk(q)}
                    className="w-full text-left bg-slate-950/50 border border-slate-800 rounded-md p-2 hover:bg-slate-900/60"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </MemoizedCard>
        </div>

        {/* Center: Chat & Tool Runs */}
        <div className="col-span-12 xl:col-span-6 space-y-4">
          <MemoizedCard
            title="Chat"
            subtitle="Prompt → response → tool log"
            right={
              <MemoizedTag tone="violet">
                <IconTool /> tools
              </MemoizedTag>
            }
          >
            <div className="h-80 overflow-auto space-y-2">
              {chat.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-md p-2 border',
                    m.who === 'user'
                      ? 'bg-slate-950/60 border-slate-800'
                      : m.who === 'tool'
                        ? 'bg-slate-900/60 border-slate-800'
                        : 'bg-slate-950/40 border-slate-800'
                  )}
                >
                  <div className="text-xs text-slate-500 mb-0.5">{m.who}</div>
                  <div className="text-slate-200 text-sm whitespace-pre-wrap">{m.body}</div>
                  {m.detail && (
                    <div className="mt-1 text-xs text-slate-400">
                      {m.detail.map((d, j) => (
                        <div key={j}>
                          • <span className="text-slate-500">{d.k}:</span> {d.v}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Separator className="my-3" />
            <div className="border-t border-slate-800 pt-3">
              <div className="flex items-center gap-2">
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="bg-slate-950/60 border border-slate-800 rounded px-2 py-1 text-sm"
                >
                  {modes.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <div className="flex-1 flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                  <span className="text-slate-500">
                    <IconSearch />
                  </span>
                  <input
                    className="bg-transparent outline-none text-sm text-slate-100 placeholder-slate-500 w-full"
                    placeholder={'Ask the Pair Analyst… cite sources where possible'}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                  <MemoizedTag tone="violet">Omni‑Prompt</MemoizedTag>
                </div>
                <button
                  onClick={runPrompt}
                  className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm inline-flex items-center gap-1"
                >
                  <IconSend /> Send
                </button>
              </div>
            </div>
          </MemoizedCard>

          <MemoizedCard title="Tool Runner (stub)" subtitle="What the model executed">
            <div className="grid md:grid-cols-3 gap-2 text-sm">
              <div className="bg-slate-950/50 border border-slate-800 rounded p-2">
                <div className="text-xs text-slate-400">Search</div>
                <div>Filings, transcripts, notes</div>
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded p-2">
                <div className="text-xs text-slate-400">Compute</div>
                <div>EPV rough cut, quality checks</div>
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded p-2">
                <div className="text-xs text-slate-400">Cite</div>
                <div>Links to pages and snippets</div>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              In production: surfaces each call with duration, inputs, outputs, and provenance.
            </div>
          </MemoizedCard>
        </div>

        {/* Right: Modes, Context & Citations */}
        <div className="col-span-12 xl:col-span-3 space-y-4">
          <MemoizedCard title="Modes" subtitle="Behavior presets">
            <ul className="text-sm text-slate-300 space-y-1">
              {modes.map((m) => (
                <li key={m} className="flex items-center justify-between">
                  <span>{m}</span>
                  <input
                    type="radio"
                    name="md"
                    checked={mode === m}
                    onChange={() => setMode(m)}
                    className="accent-violet-500"
                  />
                </li>
              ))}
            </ul>
          </MemoizedCard>

          <MemoizedCard
            title="Grounding"
            subtitle="Sources to honor"
            right={<MemoizedTag tone="slate">{grounding.length}</MemoizedTag>}
          >
            <ul className="text-sm text-slate-300 space-y-1">
              {groundingOptions.map((g) => (
                <li key={g} className="flex items-center justify-between">
                  <span>{g}</span>
                  <input
                    type="checkbox"
                    className="accent-violet-500"
                    checked={grounding.includes(g)}
                    onChange={() => toggleGrounding(g)}
                  />
                </li>
              ))}
            </ul>
          </MemoizedCard>

          <MemoizedCard
            title="Attachments"
            subtitle="Objects in context"
            right={<MemoizedTag tone="blue">{attachments.length}</MemoizedTag>}
          >
            <ul className="text-sm text-slate-300 space-y-2">
              {attachments.map((a) => (
                <li
                  key={a.id}
                  className="bg-slate-950/50 border border-slate-800 rounded-md p-2 flex items-center justify-between"
                >
                  <span className="truncate">{a.title}</span>
                  <MemoizedTag tone="slate">{a.kind}</MemoizedTag>
                </li>
              ))}
            </ul>
          </MemoizedCard>

          <MemoizedCard
            title="Citations Inspector"
            subtitle="What the model cited"
            right={
              <MemoizedTag tone="violet">
                <IconCite /> cites
              </MemoizedTag>
            }
          >
            <ul className="text-sm text-slate-300 space-y-2">
              {citations.map((c) => (
                <li key={c.id} className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                  <div className="text-xs text-slate-500">{c.src}</div>
                  <div className="text-slate-200">{c.note}</div>
                </li>
              ))}
            </ul>
          </MemoizedCard>
        </div>
      </div>

      {/* Footer */}
      <div className="h-28 border-t border-slate-800 bg-slate-950/80 p-2 flex gap-2">
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 overflow-y-auto">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Notes</div>
          <div className="text-sm text-slate-300">
            The Pair Analyst honors **mode** (Explain/Verify/Challenge/Draft), **grounding**
            (sources to trust), and **attachments** (objects). Tool Runner shows the chain of search
            → compute → cite. In production, each response writes a Research Log entry with
            citations.
          </div>
        </div>
        <div className="w-80 bg-slate-900 border border-slate-800 rounded-lg p-2">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Keyboard</div>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>
              <span className="text-slate-500">⌘K</span> Omni‑Prompt
            </li>
            <li>
              <span className="text-slate-500">⌘P</span> Open object
            </li>
            <li>
              <span className="text-slate-500">⌘/</span> Toggle Inspector
            </li>
          </ul>
        </div>
      </div>

      {/* Dev Test */}
      <div className="hidden">
        <MemoizedCard title={'Parser Test'} subtitle={'Ensure symbols render'}>
          <div className="text-sm text-slate-300">
            Citations show when evidence quality \u2265 good and assumptions \u2264 limits.
          </div>
        </MemoizedCard>
      </div>
    </div>
  )
}

// Export alias for stage-tabs.tsx
export const PairAnalystOmniPrompt = React.memo(MadLab_PairAnalyst_OmniPrompt_Prod)
