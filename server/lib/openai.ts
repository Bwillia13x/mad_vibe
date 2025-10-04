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
    console.log('OpenAI client initialized successfully')
  } catch (err) {
    console.error('Failed to initialize OpenAI client, falling back to demo mode:', err)
    openai = null
  }
} else {
  if (aiMode === 'demo') {
    console.warn('AI_MODE set to demo. AI features will run in demo mode with fallback responses.')
  } else {
    console.warn(
      'OPENAI_API_KEY not set. AI features will run in demo mode with fallback responses.'
    )
  }
}

export interface BusinessChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GenerateBusinessResponseOptions {
  businessContext?: string
  systemPromptOverride?: string
  includeDefaultSystemPrompt?: boolean
}

function buildDefaultSystemPrompt(businessContext?: string): string {
  return (
    `You are an AI equity-research copilot embedded in the MadLab value-investing IDE. ` +
    `You work alongside human analysts to progress ideas from screening through ` +
    `valuation, memo drafting, and position sizing. Ground every answer in fundamental ` +
    `analysis and disciplined capital allocation.

**WHAT YOU KNOW:**
- Pipeline companies, normalized financials, scenario models, and monitoring triggers are ` +
    `kept in the workspace context provided below.
- Analysts expect market-agnostic, skeptical thinking with explicit acknowledgment of data ` +
    `quality, assumptions, and margin-of-safety requirements.
- The research mandate is long-term value creation with a focus on ROIC, free-cash-flow ` +
    `durability, balance sheet resilience, and downside protection.

**CURRENT WORK CONTEXT:**
${businessContext || 'No additional context supplied.'}

**RESPONSE GUIDELINES:**
- Cite the metrics, scenarios, or checklist items you are using.
- Call out gaps, missing data, or risks that would block a decision.
- Recommend next analytical steps or diligence items when confidence is low.
- Stay concise, professional, and action-oriented.`
  )
}

export async function generateBusinessResponse(
  messages: BusinessChatMessage[],
  businessContext?: string,
  options?: GenerateBusinessResponseOptions
): Promise<string> {
  const resolvedBusinessContext =
    options?.businessContext !== undefined ? options.businessContext : businessContext

  const includeDefaultSystemPrompt =
    options?.includeDefaultSystemPrompt ?? !options?.systemPromptOverride

  const allMessages: BusinessChatMessage[] = [...messages]

  if (options?.systemPromptOverride) {
    allMessages.unshift({
      role: 'system',
      content: options.systemPromptOverride
    })
  }

  if (includeDefaultSystemPrompt) {
    allMessages.unshift({
      role: 'system',
      content: buildDefaultSystemPrompt(resolvedBusinessContext)
    })
  }

  // List of models to try in order of preference
  const modelsToTry = ['gpt-5', 'gpt-4o', 'gpt-4-turbo', 'gpt-4']

  // Fallback early if OpenAI isn't configured or demo mode is active
  if (!openai || aiMode === 'demo') {
    console.log('OpenAI not configured. Returning non-AI demo response.')
    const hint = resolvedBusinessContext
      ? ' Here’s current business context I can use: ' + resolvedBusinessContext.slice(0, 300)
      : ''
    return (
      "I'm ready to help progress the investment workflow. " +
      'I can discuss screening filters, valuation assumptions, memo checkpoints, and risk monitors.' +
      hint
    )
  }

  for (const model of modelsToTry) {
    try {
      console.log(`Attempting non-streaming with model: ${model}`)

      const response = await openai.chat.completions.create({
        model: model,
        messages: allMessages,
        max_completion_tokens: 500
      })

      const content = response.choices[0].message.content
      if (content) {
        console.log(`Non-streaming successful with model: ${model}`)
        return content
      }
    } catch (error) {
      console.error(`OpenAI API error with model ${model}:`, error)

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
  console.log('All non-streaming models failed, providing fallback response')
  return (
    "I'm ready to help progress the investment workflow. " +
    'I can outline screening ideas, valuation checkpoints, memo tasks, and risk monitors. ' +
    'What should we tackle next?'
  )
}

export async function analyzeBusinessData(data: string, analysisType: string): Promise<string> {
  if (!openai || aiMode === 'demo') {
    return 'Demo mode: AI analysis disabled. Review ROIC trends, owner earnings bridges, leverage, and downside cases manually before updating the investment memo.'
  }
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        {
          role: 'system',
          content:
            `You are a fundamental equity analyst. Evaluate the provided dataset for ${analysisType}. ` +
            'Discuss unit economics, capital allocation, downside protection, and margin of safety. '
        },
        {
          role: 'user',
          content: `Please analyze this investment research data for ${analysisType}:\n\n${data}`
        }
      ],
      max_completion_tokens: 400
    })

    return response.choices[0].message.content || 'Unable to analyze the data at this time.'
  } catch (error) {
    console.error('Investment analysis error:', error)
    return "I'm having trouble analyzing the data right now. Please try again."
  }
}

// Screener helper: parse natural language query into filters with AI when live, else heuristic
export interface ScreenerFilters {
  roicMin?: number
  fcfYieldMin?: number
  leverageMax?: number
  sector?: string
  geo?: string
}

export async function parseScreenerFilters(query: string): Promise<ScreenerFilters> {
  const defaults: ScreenerFilters = {}

  if (!openai || aiMode === 'demo') {
    // Heuristic parser for demo/test environments
    const q = query.toLowerCase()
    const num = (m: RegExpMatchArray | null) => (m ? Number(m[1]) : undefined)

    const roicMin = num(q.match(/roic[^0-9]*([0-9]{1,2}(?:\.[0-9]+)?)/))
    const fcfYieldMin = num(q.match(/fcf\s*yield[^0-9]*([0-9]{1,2}(?:\.[0-9]+)?)/))
    const leverageMax = num(q.match(/leverage[^0-9-]*(-?[0-9]{1,2}(?:\.[0-9]+)?)/))
    const sector = (q.match(/sector\s*[:=]\s*([a-z]+)/) || [])[1]
    const geo = (q.match(/geo\s*[:=]\s*([a-z]+)/) || [])[1]

    return {
      ...(roicMin !== undefined ? { roicMin } : {}),
      ...(fcfYieldMin !== undefined ? { fcfYieldMin } : {}),
      ...(leverageMax !== undefined ? { leverageMax } : {}),
      ...(sector ? { sector } : {}),
      ...(geo ? { geo } : {})
    }
  }

  try {
    const modelsToTry = ['gpt-5', 'gpt-4o', 'gpt-4-turbo']
    const prompt = `Parse this natural language stock screener query into JSON filters. Keys: roicMin, fcfYieldMin, leverageMax, sector, geo. Use null or omit if unspecified. Query: "${query}"`

    for (const model of modelsToTry) {
      try {
        const response = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content:
                'You are a stock screener AI. Respond only with strict JSON containing optional keys roicMin, fcfYieldMin, leverageMax, sector, geo.'
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 200,
          temperature: 0.1
        })
        const content = response.choices[0].message.content
        if (content) {
          const parsed = JSON.parse(content) as ScreenerFilters
          return parsed || defaults
        }
      } catch (_err) {
        // try next model
        continue
      }
    }
  } catch {}

  return defaults
}
