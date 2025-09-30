import { useState } from 'react'
import { Bot, Lightbulb, AlertTriangle, Info, Sparkles, X, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { AISuggestion, AIPromptTemplate } from '@/services/ai-copilot'

interface AIAssistantPanelProps {
  suggestions: AISuggestion[]
  availablePrompts: AIPromptTemplate[]
  onDismiss: (id: string) => void
  onPromptSelect: (prompt: string) => void
}

const cardClasses =
  'rounded-xl border border-slate-800/50 bg-slate-900/40 backdrop-blur-sm p-3 shadow-[0_0_12px_rgba(0,0,0,0.3)]'

const labelClasses = 'text-xs font-semibold uppercase tracking-wider text-slate-400'

function getSuggestionIcon(type: AISuggestion['type']) {
  switch (type) {
    case 'insight':
      return <Lightbulb className="h-4 w-4 text-violet-400" />
    case 'action':
      return <Sparkles className="h-4 w-4 text-blue-400" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-amber-400" />
    case 'tip':
      return <Info className="h-4 w-4 text-slate-400" />
  }
}

function getSuggestionBorderColor(priority: AISuggestion['priority']) {
  switch (priority) {
    case 'high':
      return 'border-l-violet-500'
    case 'medium':
      return 'border-l-blue-500'
    case 'low':
      return 'border-l-slate-600'
  }
}

export function AIAssistantPanel({
  suggestions,
  availablePrompts,
  onDismiss,
  onPromptSelect
}: AIAssistantPanelProps) {
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set())

  const toggleSuggestion = (id: string) => {
    setExpandedSuggestions(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* AI Copilot Header */}
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4 text-violet-400" />
        <div className={labelClasses}>AI Copilot</div>
      </div>

      {/* Active Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map(suggestion => (
            <div
              key={suggestion.id}
              className={cn(
                cardClasses,
                'border-l-2',
                getSuggestionBorderColor(suggestion.priority)
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1">
                  {getSuggestionIcon(suggestion.type)}
                  <div className="flex-1 space-y-1">
                    <div className="text-sm font-medium text-slate-100">{suggestion.title}</div>
                    {expandedSuggestions.has(suggestion.id) && (
                      <div className="text-xs text-slate-400">{suggestion.description}</div>
                    )}
                  </div>
                </div>
                {suggestion.dismissible && (
                  <button
                    onClick={() => onDismiss(suggestion.id)}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {suggestion.actionLabel && suggestion.actionPrompt && (
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-violet-600/50 text-violet-300 hover:bg-violet-600/20"
                    onClick={() => onPromptSelect(suggestion.actionPrompt!)}
                  >
                    <ChevronRight className="h-3 w-3 mr-1" />
                    {suggestion.actionLabel}
                  </Button>
                  {!expandedSuggestions.has(suggestion.id) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-slate-400"
                      onClick={() => toggleSuggestion(suggestion.id)}
                    >
                      Details
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-2">
        <div className={labelClasses}>Quick Actions</div>
        <div className={cn(cardClasses, 'space-y-1.5')}>
          {availablePrompts.slice(0, 3).map(prompt => (
            <button
              key={prompt.id}
              onClick={() => {
                const builtPrompt = prompt.prompt
                onPromptSelect(builtPrompt)
              }}
              className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800/50 hover:text-violet-300 transition-colors"
            >
              {prompt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      {suggestions.length === 0 && (
        <div className={cn(cardClasses, 'text-center py-4')}>
          <Bot className="h-8 w-8 text-slate-600 mx-auto mb-2" />
          <div className="text-xs text-slate-500">
            AI copilot is monitoring your work
          </div>
        </div>
      )}
    </div>
  )
}
