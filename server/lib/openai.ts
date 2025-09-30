import OpenAI from 'openai'

import { getEnvVar } from '../../lib/env-security'

// Gracefully handle missing API key in demo environments
let openai: OpenAI | null = null
const apiKey = getEnvVar('OPENAI_API_KEY')

if (apiKey && apiKey.trim().length > 0) {
  try {
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025.
    // do not change this unless explicitly requested by the user
    openai = new OpenAI({ apiKey })
    console.log('OpenAI client initialized successfully')
  } catch (err) {
    console.error('Failed to initialize OpenAI client, falling back to demo mode:', err)
    openai = null
  }
} else {
  console.warn('OPENAI_API_KEY not set. AI features will run in demo mode with fallback responses.')
}

export interface BusinessChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function generateBusinessResponse(
  messages: BusinessChatMessage[],
  businessContext?: string
): Promise<string> {
  const systemPrompt: BusinessChatMessage = {
    role: 'system',
    content: `You are an AI business assistant for Andreas For Men, Calgary's premier men's grooming destination located in Bridgeland. You have intimate knowledge of the barbershop's daily operations and can provide real-time business insights.

**BUSINESS INFORMATION:**
- Name: Andreas For Men
- Location: 1234 1 Avenue NE, Bridgeland, Calgary, AB T2E 0B2
- Phone: (403) 555-CUTS
- Email: info@andreasformen.ca
- Website: https://www.andreasformen.ca
- Specializes in sophisticated men's grooming with traditional barbering techniques and modern style

**YOUR CAPABILITIES:**
- Scheduling and appointment management
- Real-time inventory tracking and stock management
- Staff coordination, availability, and performance monitoring
- Business analytics and financial insights
- Customer preferences and service recommendations
- Administrative tasks and operational efficiency

**CURRENT BUSINESS CONTEXT:**
${businessContext || 'No current business data available.'}

**RESPONSE GUIDELINES:**
- Use real business data when available to provide specific, actionable insights
- Reference actual appointments, inventory levels, staff schedules, and performance metrics
- Maintain a professional, knowledgeable tone as if you're an integral part of the business
- When discussing staff, use their actual names and specialties
- For inventory questions, reference actual stock levels and suggest reordering when appropriate
- For scheduling questions, check real availability and appointment data
- Always be supportive, solution-oriented, and focused on business success`
  }

  const allMessages = [systemPrompt, ...messages]

  // List of models to try in order of preference
  const modelsToTry = ['gpt-5', 'gpt-4o', 'gpt-4-turbo', 'gpt-4']

  // Fallback early if OpenAI isn't configured
  if (!openai) {
    console.log('OpenAI not configured. Returning non-AI demo response.')
    const hint = businessContext
      ? ' Here’s current business context I can use: ' + businessContext.slice(0, 300)
      : ''
    return (
      "I'm ready to help you with your business management needs! " +
      'I can assist with scheduling, inventory, staff coordination, analytics, and more.' +
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
  return "I'm ready to help you with your business management needs! I can assist with scheduling, inventory, staff coordination, analytics, and more. What would you like to work on today?"
}

export async function analyzeBusinessData(data: string, analysisType: string): Promise<string> {
  if (!openai) {
    return 'Demo mode: AI analysis is unavailable without an API key. Based on the data provided, consider monitoring appointment utilization, staff performance, inventory turnover, and customer satisfaction to identify quick wins.'
  }
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        {
          role: 'system',
          content: `You are a business analytics expert for Andreas For Men, a premium barbershop in Calgary. Analyze the provided data and provide insights for ${analysisType}. Focus on actionable recommendations and key metrics specific to the barbering industry. Consider factors like appointment utilization, staff performance, inventory turnover, and customer satisfaction.`
        },
        {
          role: 'user',
          content: `Please analyze this Andreas For Men business data for ${analysisType}:\n\n${data}`
        }
      ],
      max_completion_tokens: 400
    })

    return response.choices[0].message.content || 'Unable to analyze the data at this time.'
  } catch (error) {
    console.error('Business analysis error:', error)
    return "I'm having trouble analyzing the data right now. Please try again."
  }
}
