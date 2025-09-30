import { useEffect, useState, useCallback } from 'react'
import { aiCopilot, type AIContext, type AISuggestion, type AIPromptTemplate } from '@/services/ai-copilot'

/**
 * Hook for AI Copilot integration
 * Provides context-aware AI assistance and suggestions
 */
export function useAICopilot(context: AIContext) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [availablePrompts, setAvailablePrompts] = useState<AIPromptTemplate[]>([])

  // Update context when it changes
  useEffect(() => {
    aiCopilot.setContext(context)
    setAvailablePrompts(aiCopilot.getAvailablePrompts())
  }, [context])

  // Subscribe to suggestion updates
  useEffect(() => {
    setSuggestions(aiCopilot.getSuggestions())

    const unsubscribe = aiCopilot.onSuggestionsChange((newSuggestions) => {
      setSuggestions(newSuggestions)
    })

    return unsubscribe
  }, [])

  // Build a prompt with current context
  const buildPrompt = useCallback(
    (templateId: string, contextOverrides?: Record<string, unknown>): string | null => {
      return aiCopilot.buildPrompt(templateId, contextOverrides)
    },
    []
  )

  // Dismiss a suggestion
  const dismissSuggestion = useCallback((id: string) => {
    aiCopilot.dismissSuggestion(id)
  }, [])

  // Clear all suggestions
  const clearSuggestions = useCallback(() => {
    aiCopilot.clearSuggestions()
  }, [])

  return {
    suggestions,
    availablePrompts,
    buildPrompt,
    dismissSuggestion,
    clearSuggestions
  }
}
