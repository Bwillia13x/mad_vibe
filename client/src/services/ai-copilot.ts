/**
 * AI Copilot Service
 * Handles routing, context management, and proactive AI assistance
 */

export type AICapability =
  | 'summarize'
  | 'analyze'
  | 'validate'
  | 'suggest'
  | 'explain'
  | 'compare'
  | 'forecast'
  | 'critique'

export type AIContext = {
  stageSlug: string
  stageTitle: string
  activeTab?: string
  currentData?: Record<string, unknown>
  recentActions?: string[]
  userIntent?: string
}

export type AISuggestion = {
  id: string
  type: 'insight' | 'action' | 'warning' | 'tip'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  actionLabel?: string
  actionPrompt?: string
  dismissible: boolean
  timestamp: number
}

export type AIPromptTemplate = {
  id: string
  label: string
  capability: AICapability
  prompt: string
  contextKeys?: string[]
}

// Stage-specific AI prompts and capabilities
const STAGE_PROMPTS: Record<string, AIPromptTemplate[]> = {
  screener: [
    {
      id: 'suggest-factors',
      label: 'Suggest screening factors',
      capability: 'suggest',
      prompt:
        'Based on current market conditions, suggest relevant screening factors for {industry} companies'
    },
    {
      id: 'explain-results',
      label: 'Explain screening results',
      capability: 'explain',
      prompt: 'Analyze these screening results and highlight key patterns: {results}'
    },
    {
      id: 'compare-screens',
      label: 'Compare with prior screens',
      capability: 'compare',
      prompt: 'Compare current screening criteria with previous successful screens'
    }
  ],
  financials: [
    {
      id: 'validate-adjustments',
      label: 'Validate normalization',
      capability: 'validate',
      prompt: 'Review these financial adjustments for accuracy and completeness: {adjustments}'
    },
    {
      id: 'owner-earnings-bridge',
      label: 'Explain owner earnings',
      capability: 'explain',
      prompt: 'Break down the owner earnings calculation and flag any unusual items'
    },
    {
      id: 'detect-anomalies',
      label: 'Detect anomalies',
      capability: 'analyze',
      prompt: 'Identify potential red flags or anomalies in the financial statements'
    }
  ],
  valuation: [
    {
      id: 'sanity-check',
      label: 'Sanity check assumptions',
      capability: 'validate',
      prompt: 'Review valuation assumptions against industry benchmarks: {assumptions}'
    },
    {
      id: 'sensitivity-analysis',
      label: 'Suggest sensitivity cases',
      capability: 'suggest',
      prompt: 'Recommend key variables for sensitivity analysis based on business model'
    },
    {
      id: 'comparable-analysis',
      label: 'Compare multiples',
      capability: 'compare',
      prompt: 'Compare valuation multiples with peer group and explain differences'
    }
  ],
  scenario: [
    {
      id: 'stress-scenarios',
      label: 'Generate stress scenarios',
      capability: 'forecast',
      prompt: 'Create realistic stress test scenarios for {company} based on key risk factors'
    },
    {
      id: 'probability-assessment',
      label: 'Assess scenario probability',
      capability: 'analyze',
      prompt: 'Evaluate the likelihood of each scenario based on historical data and current trends'
    }
  ],
  memo: [
    {
      id: 'improve-narrative',
      label: 'Improve narrative flow',
      capability: 'suggest',
      prompt: 'Suggest improvements to memo structure and narrative coherence: {memo}'
    },
    {
      id: 'strengthen-thesis',
      label: 'Strengthen investment thesis',
      capability: 'analyze',
      prompt: 'Identify weak points in the investment thesis and suggest reinforcements'
    }
  ],
  'red-team': [
    {
      id: 'challenge-thesis',
      label: 'Challenge core assumptions',
      capability: 'critique',
      prompt: "Act as devil's advocate and challenge the core investment thesis"
    },
    {
      id: 'find-blindspots',
      label: 'Identify blind spots',
      capability: 'analyze',
      prompt: 'What important factors or risks might have been overlooked in this analysis?'
    }
  ]
}

// Global AI prompts (available across all stages)
const GLOBAL_PROMPTS: AIPromptTemplate[] = [
  {
    id: 'summarize-context',
    label: 'Summarize current work',
    capability: 'summarize',
    prompt: 'Provide a concise summary of the current analysis state and next logical steps'
  },
  {
    id: 'next-steps',
    label: 'Suggest next steps',
    capability: 'suggest',
    prompt: 'Based on current progress, what are the most important next steps?'
  }
]

/**
 * AI Copilot orchestration class
 */
export class AICopilot {
  private context: AIContext | null = null
  private suggestions: AISuggestion[] = []
  private suggestionListeners: Set<(suggestions: AISuggestion[]) => void> = new Set()

  /**
   * Update the current context
   */
  setContext(context: AIContext): void {
    this.context = context
    this.generateProactiveSuggestions()
  }

  /**
   * Get available prompts for current context
   */
  getAvailablePrompts(): AIPromptTemplate[] {
    if (!this.context) return GLOBAL_PROMPTS

    const stagePrompts = STAGE_PROMPTS[this.context.stageSlug] || []
    return [...stagePrompts, ...GLOBAL_PROMPTS]
  }

  /**
   * Get prompt template by ID
   */
  getPromptTemplate(id: string): AIPromptTemplate | undefined {
    const allPrompts = [...Object.values(STAGE_PROMPTS).flat(), ...GLOBAL_PROMPTS]
    return allPrompts.find((p) => p.id === id)
  }

  /**
   * Build a prompt with context interpolation
   */
  buildPrompt(templateId: string, contextOverrides?: Record<string, unknown>): string | null {
    const template = this.getPromptTemplate(templateId)
    if (!template) return null

    let prompt = template.prompt
    const fullContext = { ...this.context?.currentData, ...contextOverrides }

    // Replace placeholders like {industry}, {results}, etc.
    Object.entries(fullContext).forEach(([key, value]) => {
      prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value))
    })

    return prompt
  }

  /**
   * Generate proactive suggestions based on context
   */
  private generateProactiveSuggestions(): void {
    if (!this.context) return

    const newSuggestions: AISuggestion[] = []

    // Stage-specific suggestions
    switch (this.context.stageSlug) {
      case 'financials':
        if (!this.context.currentData?.normalized) {
          newSuggestions.push({
            id: 'normalize-prompt',
            type: 'action',
            priority: 'high',
            title: 'Data normalization needed',
            description: 'Financial data should be normalized before proceeding to valuation',
            actionLabel: 'Review adjustments',
            actionPrompt: 'Guide me through normalizing these financial statements',
            dismissible: true,
            timestamp: Date.now()
          })
        }
        break

      case 'valuation':
        if (this.context.recentActions?.includes('assumptions-changed')) {
          newSuggestions.push({
            id: 'validate-assumptions',
            type: 'insight',
            priority: 'medium',
            title: 'Assumption validation',
            description: 'Your assumptions have changed. Consider running a sanity check.',
            actionLabel: 'Validate',
            actionPrompt: 'Review my valuation assumptions for reasonableness',
            dismissible: true,
            timestamp: Date.now()
          })
        }
        break

      case 'memo':
        if (
          this.context.currentData?.wordCount &&
          (this.context.currentData.wordCount as number) > 5000
        ) {
          newSuggestions.push({
            id: 'memo-length-warning',
            type: 'tip',
            priority: 'low',
            title: 'Memo length',
            description: 'Consider condensing the memo for better readability',
            actionLabel: 'Get suggestions',
            actionPrompt: 'Help me tighten this memo while preserving key arguments',
            dismissible: true,
            timestamp: Date.now()
          })
        }
        break
    }

    this.setSuggestions(newSuggestions)
  }

  /**
   * Get current suggestions
   */
  getSuggestions(): AISuggestion[] {
    return this.suggestions
  }

  /**
   * Set suggestions and notify listeners
   */
  private setSuggestions(suggestions: AISuggestion[]): void {
    this.suggestions = suggestions
    this.notifyListeners()
  }

  /**
   * Dismiss a suggestion
   */
  dismissSuggestion(id: string): void {
    this.suggestions = this.suggestions.filter((s) => s.id !== id)
    this.notifyListeners()
  }

  /**
   * Subscribe to suggestion updates
   */
  onSuggestionsChange(callback: (suggestions: AISuggestion[]) => void): () => void {
    this.suggestionListeners.add(callback)
    return () => {
      this.suggestionListeners.delete(callback)
    }
  }

  /**
   * Notify all listeners of suggestion changes
   */
  private notifyListeners(): void {
    this.suggestionListeners.forEach((listener) => {
      listener(this.suggestions)
    })
  }

  /**
   * Clear all suggestions
   */
  clearSuggestions(): void {
    this.setSuggestions([])
  }
}

// Singleton instance
export const aiCopilot = new AICopilot()
