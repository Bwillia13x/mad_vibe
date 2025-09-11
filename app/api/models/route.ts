import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { log } from '@/lib/log'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
})

export async function GET(request: NextRequest) {
  try {
    // In smoke mode, return mock data
    if (process.env.SMOKE_MODE === '1') {
      return NextResponse.json({
        models: [
          { id: 'gpt-5', name: 'GPT-5', available: true },
          { id: 'gpt-4o', name: 'GPT-4o', available: true },
          { id: 'dall-e-3', name: 'DALL-E 3', available: true }
        ],
        smokeMode: true
      })
    }

    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const models = await openai.models.list()
    
    const availableModels = models.data
      .filter(model => ['gpt-5', 'gpt-4o', 'gpt-4', 'dall-e-3', 'whisper-1'].includes(model.id))
      .map(model => ({
        id: model.id,
        name: model.id.toUpperCase(),
        available: true
      }))

    log('Models retrieved successfully', { count: availableModels.length })
    
    return NextResponse.json({
      models: availableModels,
      smokeMode: false
    })
  } catch (error) {
    log('Failed to retrieve models', { error: error instanceof Error ? error.message : 'Unknown error' })
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve models' },
      { status: 500 }
    )
  }
}
