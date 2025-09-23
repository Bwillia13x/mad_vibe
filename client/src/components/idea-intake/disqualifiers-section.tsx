import React, { memo } from 'react'
import { IdeaIntakeCard } from '@/components/ui/idea-intake-card'
import { IdeaIntakePill } from '@/components/ui/idea-intake-pill'
import { IdeaIntakeTag } from '@/components/ui/idea-intake-tag'
import { IDEA_INTAKE_DISQUALIFIERS } from '@/lib/idea-intake-constants'
import type { Disqualifier } from '@/types/idea-intake'

interface DisqualifiersSectionProps {
  disqualifiers: Disqualifier[]
  onToggleDisqualifier: (disqualifier: Disqualifier) => void
}

export const DisqualifiersSection = memo(function DisqualifiersSection({
  disqualifiers,
  onToggleDisqualifier
}: DisqualifiersSectionProps) {
  return (
    <IdeaIntakeCard
      title="Disqualifiers"
      subtitle="Select 1+ if present"
      right={
        <IdeaIntakeTag tone={disqualifiers.length ? 'emerald' : 'slate'}>
          {disqualifiers.length ? `${disqualifiers.length} selected` : 'None'}
        </IdeaIntakeTag>
      }
    >
      <div className="flex flex-wrap gap-2">
        {IDEA_INTAKE_DISQUALIFIERS.map((disqualifier) => (
          <IdeaIntakePill
            key={disqualifier}
            active={disqualifiers.includes(disqualifier)}
            onClick={() => onToggleDisqualifier(disqualifier)}
          >
            {disqualifier}
          </IdeaIntakePill>
        ))}
      </div>
      <div className="text-xs text-slate-500 mt-2">
        Tip: add custom disqualifiers later in Risk Register.
      </div>
    </IdeaIntakeCard>
  )
})
