import React, { memo } from 'react'
import { IdeaIntakeCard } from '@/components/ui/idea-intake-card'
import { IdeaIntakeField } from '@/components/ui/idea-intake-field'
import { IdeaIntakeTextArea } from '@/components/ui/idea-intake-textarea'
import { IdeaIntakeTag } from '@/components/ui/idea-intake-tag'

import { IdeaIntakeQuickActions, IntakeQuickAction } from './quick-actions'

interface InputsSectionProps {
  ticker: string
  source: string
  whyNow: string
  thesis: string
  onTickerChange: (value: string) => void
  onSourceChange: (value: string) => void
  onWhyNowChange: (value: string) => void
  onThesisChange: (value: string) => void
  quickActions: IntakeQuickAction[]
  onQuickActionSelect: (prompt: string) => void
  isGenerating: boolean
}

export const InputsSection = memo(function InputsSection({
  ticker,
  source,
  whyNow,
  thesis,
  onTickerChange,
  onSourceChange,
  onWhyNowChange,
  onThesisChange,
  quickActions,
  onQuickActionSelect,
  isGenerating
}: InputsSectionProps) {
  return (
    <>
      <IdeaIntakeCard
        title="Inputs"
        subtitle="5‑minute triage fields"
        right={<IdeaIntakeTag tone="slate">Required</IdeaIntakeTag>}
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <IdeaIntakeField
            label="Ticker / Theme"
            placeholder="e.g., TKR or 'payments infra'"
            value={ticker}
            onChange={onTickerChange}
            required
          />
          <IdeaIntakeField
            label="Source"
            placeholder="web clip, friend, screen…"
            value={source}
            onChange={onSourceChange}
            required
          />
        </div>
        <div className="mt-3 grid gap-3">
          <IdeaIntakeTextArea
            label="Why now?"
            placeholder="catalyst, mispricing, forced seller…"
            value={whyNow}
            onChange={onWhyNowChange}
            rows={3}
            required
          />
          <IdeaIntakeTextArea
            label="Thesis stub (testable)"
            placeholder="Because X, Y, Z — expect ABC within 12–24m; disconfirming KPI is …"
            value={thesis}
            onChange={onThesisChange}
            rows={4}
            required
          />
        </div>
      </IdeaIntakeCard>

      <IdeaIntakeQuickActions
        actions={quickActions}
        onSelect={onQuickActionSelect}
        isGenerating={isGenerating}
      />
    </>
  )
})
