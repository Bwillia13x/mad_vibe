import { Router } from 'express'
import { generateBusinessResponse, type BusinessChatMessage } from '../lib/openai'
import { optionalAuth } from '../middleware/auth'

const router = Router()

// Apply optional auth
router.use(optionalAuth)

/**
 * AI Copilot endpoint - handles context-aware AI requests
 */
router.post('/copilot', async (req, res) => {
  try {
    const { prompt, context, capability } = req.body

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: 'Prompt is required',
        code: 'INVALID_PROMPT'
      })
    }

    // Build system message based on context
    const systemContext = buildSystemContext(context, capability)

    const messages: BusinessChatMessage[] = [
      {
        role: 'system',
        content: systemContext
      },
      {
        role: 'user',
        content: prompt
      }
    ]

    const response = await generateBusinessResponse(messages)

    res.json({
      response,
      capability,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('AI Copilot error:', error)
    res.status(500).json({
      error: 'Failed to process AI request',
      code: 'AI_COPILOT_ERROR'
    })
  }
})

/**
 * Build context-aware system message
 */
function buildSystemContext(
  context: Record<string, unknown> | undefined,
  capability: string | undefined
): string {
  const baseContext = `You are an AI copilot for a finance analyst's IDE. You assist with investment analysis, valuation, and research.
Your responses should be:
- Concise and actionable
- Grounded in financial analysis best practices
- Specific to the analyst's current work context
- Professional but conversational`

  if (!context) return baseContext

  const { stageSlug, stageTitle, activeTab, currentData } = context as {
    stageSlug?: string
    stageTitle?: string
    activeTab?: string
    currentData?: Record<string, unknown>
  }

  const contextualInstructions: Record<string, string> = {
    screener: `The analyst is currently screening companies. Focus on:
- Screening criteria selection and refinement
- Pattern recognition in screening results
- Comparative analysis of candidates`,

    financials: `The analyst is reviewing financial statements. Focus on:
- Data quality and normalization
- Financial metric calculations
- Anomaly detection and red flags
- Owner earnings adjustments`,

    valuation: `The analyst is building valuation models. Focus on:
- Assumption validation against benchmarks
- Sensitivity analysis recommendations
- Comparable company analysis
- Intrinsic value assessment`,

    scenario: `The analyst is conducting scenario analysis. Focus on:
- Stress test scenario generation
- Probability assessment of outcomes
- Risk factor identification
- Downside protection analysis`,

    memo: `The analyst is composing an investment memo. Focus on:
- Narrative structure and clarity
- Argument strength and evidence
- Thesis coherence
- Readability improvements`,

    'red-team': `The analyst is performing red team review. Focus on:
- Challenging core assumptions
- Identifying blind spots and biases
- Contrarian perspectives
- Risk factor deep-dives`
  }

  const stageInstructions = stageSlug ? contextualInstructions[stageSlug] : ''

  let fullContext = baseContext
  if (stageInstructions) {
    fullContext += `\n\n**Current Stage**: ${stageTitle || stageSlug}\n${stageInstructions}`
  }

  if (activeTab) {
    fullContext += `\n\n**Active Tab**: ${activeTab}`
  }

  if (capability) {
    const capabilityInstructions: Record<string, string> = {
      summarize: 'Provide a clear, structured summary.',
      analyze: 'Conduct thorough analysis with specific observations.',
      validate: 'Check for accuracy, completeness, and reasonableness.',
      suggest: 'Offer concrete, actionable recommendations.',
      explain: 'Break down complex concepts clearly.',
      compare: 'Highlight similarities, differences, and relative strengths.',
      forecast: 'Project outcomes with clear assumptions.',
      critique: 'Challenge assumptions and identify weaknesses.'
    }

    const capInstruction = capabilityInstructions[capability]
    if (capInstruction) {
      fullContext += `\n\n**Task Type**: ${capability}\n${capInstruction}`
    }
  }

  if (currentData && Object.keys(currentData).length > 0) {
    fullContext += `\n\n**Available Data**: ${JSON.stringify(currentData, null, 2).substring(0, 500)}`
  }

  return fullContext
}

export default router
