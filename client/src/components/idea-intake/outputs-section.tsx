import React, { memo, useMemo, useState } from 'react'
import { IdeaIntakeCard } from '@/components/ui/idea-intake-card'
import { IdeaIntakeTag } from '@/components/ui/idea-intake-tag'
import { IconCheck, IconNext } from '@/components/ui/idea-intake-icons'
import { cn } from '@/lib/utils'
import type { TriageDecision } from '@/types/idea-intake'

type ResearchLogPreviewEntry = {
  id: string
  timestamp: string
  action: string
  details?: string
  actor: 'ai' | 'analyst'
}

const FILTER_OPTIONS: Array<{ id: 'all' | 'ai' | 'analyst'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'ai', label: 'AI' },
  { id: 'analyst', label: 'Analyst' }
]

const formatRelativeTime = (iso: string): string => {
  const target = new Date(iso)
  const targetMs = target.getTime()
  if (Number.isNaN(targetMs)) return 'just now'
  const diffMs = Date.now() - targetMs
  const minutes = Math.round(diffMs / 60000)
  if (Math.abs(minutes) < 1) return 'just now'
  if (Math.abs(minutes) < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

interface OutputsSectionProps {
  triageDecision: TriageDecision
  gatePassed: boolean
  onTriageDecisionChange: (decision: TriageDecision) => void
  onNext: () => void
  disqualifiers?: string[]
  ticker?: string
  recentLog?: ResearchLogPreviewEntry[]
  onViewFullLog?: () => void
}

export const OutputsSection = memo(function OutputsSection({
  triageDecision,
  gatePassed,
  onTriageDecisionChange,
  onNext,
  disqualifiers = [],
  ticker = '',
  recentLog = [],
  onViewFullLog
}: OutputsSectionProps) {
  const [filter, setFilter] = useState<'all' | 'ai' | 'analyst'>('all')

  const filteredLog = useMemo(() => {
    const scoped =
      filter === 'all' ? recentLog : recentLog.filter((entry) => entry.actor === filter)
    return scoped.slice(0, 6)
  }, [filter, recentLog])

  const emptyMessage = useMemo(() => {
    if (filter === 'ai') return 'No AI activity captured yet.'
    if (filter === 'analyst') return 'No analyst activity captured yet.'
    return 'No activity captured yet.'
  }, [filter])

  return (
    <div className="space-y-4">
      <IdeaIntakeCard
        title="AI Pair Analyst"
        subtitle="Explain • Verify • Challenge • Draft"
        right={<IdeaIntakeTag tone="violet">Online</IdeaIntakeTag>}
      >
        <ul className="text-sm text-slate-200 space-y-1">
          <li>Summarize 10‑K in 5 bullets with citations</li>
          <li>Explain revenue drivers in plain English</li>
          <li>List 3 contrarian risks vs consensus</li>
        </ul>
        <div className="text-xs text-slate-500 mt-2">
          Use the Omni‑Prompt above to trigger any of these.
        </div>
      </IdeaIntakeCard>

      <IdeaIntakeCard
        title="Stage Gate"
        subtitle="Complete to enable Next"
        right={
          <IdeaIntakeTag tone={gatePassed ? 'emerald' : 'amber'}>
            {gatePassed ? 'Ready' : 'Incomplete'}
          </IdeaIntakeTag>
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
            {(['Advance', 'Park', 'Reject'] as const).map((opt) => (
              <label key={opt} className="inline-flex items-center gap-1 text-sm">
                <input
                  type="radio"
                  name="triage"
                  className="accent-violet-500"
                  checked={triageDecision === opt}
                  onChange={() => onTriageDecisionChange(opt)}
                />{' '}
                {opt}
              </label>
            ))}
          </div>
          <button
            disabled={!gatePassed}
            onClick={onNext}
            className={cn(
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
      </IdeaIntakeCard>

      <IdeaIntakeCard title="Research Log" subtitle="Latest analyst + AI events">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-slate-500">Filter stream</div>
          <div className="inline-flex items-center gap-1">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={cn(
                  'px-2 py-1 rounded-md border text-[11px] transition-colors',
                  filter === option.id
                    ? 'bg-violet-700/40 border-violet-500 text-violet-100'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <ul className="text-sm text-slate-200 space-y-1">
          {filteredLog.length === 0 ? (
            <li className="text-slate-500">{emptyMessage}</li>
          ) : (
            filteredLog.map((entry) => {
              const formatted = formatRelativeTime(entry.timestamp)
              return (
                <li key={entry.id} className="flex flex-col">
                  <span className="text-xs text-slate-500 flex items-center gap-2">
                    <span title={new Date(entry.timestamp).toLocaleString()}>{formatted}</span>
                    <span
                      className={cn(
                        'uppercase tracking-wide',
                        'text-[10px]',
                        entry.actor === 'ai' ? 'text-violet-300' : 'text-emerald-300'
                      )}
                    >
                      {entry.actor === 'ai' ? 'AI' : 'Analyst'}
                    </span>
                  </span>
                  <span className="font-medium text-slate-200">
                    {entry.action}
                    {entry.details ? (
                      <span className="text-slate-400"> — {entry.details}</span>
                    ) : null}
                  </span>
                </li>
              )
            })
          )}
        </ul>
        {onViewFullLog ? (
          <button
            type="button"
            onClick={onViewFullLog}
            className="mt-3 text-xs text-violet-300 hover:text-violet-200 underline"
          >
            View full log →
          </button>
        ) : null}
      </IdeaIntakeCard>
    </div>
  )
})
