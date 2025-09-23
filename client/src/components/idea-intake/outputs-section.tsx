import React, { memo } from 'react'
import { IdeaIntakeCard } from '@/components/ui/idea-intake-card'
import { IdeaIntakeTag } from '@/components/ui/idea-intake-tag'
import { IconCheck, IconNext } from '@/components/ui/idea-intake-icons'
import { cn } from '@/lib/utils'
import type { TriageDecision } from '@/types/idea-intake'

interface OutputsSectionProps {
  triageDecision: TriageDecision
  gatePassed: boolean
  onTriageDecisionChange: (decision: TriageDecision) => void
  onNext: () => void
  disqualifiers?: string[]
  ticker?: string
}

export const OutputsSection = memo(function OutputsSection({
  triageDecision,
  gatePassed,
  onTriageDecisionChange,
  onNext,
  disqualifiers = [],
  ticker = ''
}: OutputsSectionProps) {
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

      <IdeaIntakeCard title="Research Log (preview)" subtitle="Audit entries">
        <ul className="text-sm text-slate-200 space-y-1">
          <li>10:02 — Created idea: {ticker || '—'}</li>
          <li>
            10:10 — Added disqualifiers: {disqualifiers.length ? disqualifiers.join(', ') : '—'}
          </li>
          <li>10:22 — Auto‑drafted One‑Pager (preview)</li>
          <li>10:25 — Triage decision: {triageDecision}</li>
        </ul>
      </IdeaIntakeCard>
    </div>
  )
})
