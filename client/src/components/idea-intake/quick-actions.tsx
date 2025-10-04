import { memo } from 'react'
import { IdeaIntakeCard } from '@/components/ui/idea-intake-card'
import { IdeaIntakeTag } from '@/components/ui/idea-intake-tag'

export interface IntakeQuickAction {
  id: string
  label: string
  prompt: string
}

interface QuickActionsProps {
  actions: IntakeQuickAction[]
  onSelect: (prompt: string) => void
  isGenerating: boolean
}

export const IdeaIntakeQuickActions = memo(function IdeaIntakeQuickActions({
  actions,
  onSelect,
  isGenerating
}: QuickActionsProps) {
  return (
    <IdeaIntakeCard
      title="Guided Prompts"
      subtitle="Jumpstart the pair analyst"
      right={<IdeaIntakeTag tone="violet">Copilot</IdeaIntakeTag>}
    >
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={isGenerating}
            onClick={() => onSelect(action.prompt)}
            className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950/60 text-xs text-slate-200 hover:border-violet-500 hover:text-violet-200 transition-colors disabled:opacity-50"
          >
            {action.label}
          </button>
        ))}
      </div>
    </IdeaIntakeCard>
  )
})
