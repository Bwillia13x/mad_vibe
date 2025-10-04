import OpenAI from 'openai'

import { getEnvVar } from '../../lib/env-security'

// Gracefully handle missing API key in demo environments
let openai: OpenAI | null = null
const apiKey = getEnvVar('OPENAI_API_KEY')
const resolvedApiKey = typeof apiKey === 'string' && apiKey.length > 0 ? apiKey : undefined
const configuredAiMode = (getEnvVar('AI_MODE') as string | undefined)?.toLowerCase()

let aiMode: 'demo' | 'live'
if (configuredAiMode === 'demo' || configuredAiMode === 'live') {
  aiMode = configuredAiMode
} else {
  aiMode = resolvedApiKey ? 'live' : 'demo'
}

if (aiMode === 'live' && resolvedApiKey) {
  try {
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025.
    // do not change this unless explicitly requested by the user
    openai = new OpenAI({ apiKey: resolvedApiKey })
  } catch (_err) {
    console.error('Failed to initialize OpenAI client, falling back to demo mode:', _err)
    openai = null
  }
} else {
  if (aiMode === 'demo') {
    console.warn('AI_MODE set to demo. Streaming AI will run in demo mode.')
  } else {
    console.warn('OPENAI_API_KEY not set. Streaming AI will run in demo mode.')
  }
}

export interface BusinessChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function* generateStreamingBusinessResponse(
  messages: BusinessChatMessage[],
  businessContext?: string
): AsyncGenerator<string, void, unknown> {
  const systemPrompt: BusinessChatMessage = {
    role: 'system',
    content:
      `You are an AI equity-research copilot in the MadLab value-investing IDE. ` +
      `Collaborate with analysts to advance ideas through screening, normalization, valuation, ` +
      `and memo workflows.

**WORK CONTEXT:**
${businessContext || 'No additional context supplied.'}

**STYLE GUIDE:**
- Anchor every statement in fundamentals (ROIC, FCF, leverage, reinvestment runway).
- Highlight uncertainties, diligence blockers, and next steps when conviction is low.
- Keep responses concise yet actionable, and reference the scenarios or checklists you rely on.`
  }

  const allMessages = [systemPrompt, ...messages]

  // List of models to try in order of preference
  const modelsToTry = ['gpt-5', 'gpt-4o', 'gpt-4-turbo', 'gpt-4']

  // Fallback early if OpenAI isn't configured or demo mode is active
  if (!openai || aiMode === 'demo') {
    console.log('OpenAI not configured. Streaming demo response.')
    const intro = 'Demo mode: AI assistant is running without an API key. '
    const ctx = businessContext ? `\n\nResearch context: ${businessContext.slice(0, 300)}` : ''
    yield intro + 'I can still walk you through the app and reference mock data.' + ctx
    return
  }

  for (const model of modelsToTry) {
    try {
      console.log(`Attempting streaming with model: ${model}`)

      const stream = await openai.chat.completions.create({
        model: model,
        messages: allMessages,
        max_completion_tokens: 500,
        stream: true
      })

      let hasContent = false
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          hasContent = true
          yield content
        }
      }

      // If we got here successfully, return
      if (hasContent) {
        console.log(`Streaming successful with model: ${model}`)
        return
      }
    } catch (error) {
      console.error(`OpenAI streaming error with model ${model}:`, error)

      const isOrganizationIssue =
        error instanceof Error && error.message.toLowerCase().includes('organization')

      if (isOrganizationIssue && model !== modelsToTry[modelsToTry.length - 1]) {
        console.log(`Organization verification issue with ${model}, trying next model...`)
        continue
      }

      break
    }
  }

  // Fallback response if all models fail
  console.log('All streaming models failed, providing fallback response')
  yield "I'm ready to help progress the investment workflow. I can walk through screens, " +
    'valuation checkpoints, memo tasks, and monitoring alerts. What should we tackle next?'
}
