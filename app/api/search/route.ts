import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { log } from '@/lib/log'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
})

interface SearchRequest {
  query: string
  context?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequest = await request.json()
    const { query, context } = body

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    // In smoke mode, return mock search results
    if (process.env.SMOKE_MODE === '1') {
      return NextResponse.json({
        query,
        results: [
          {
            title: 'Andreas Vibe - Business Management',
            content: 'Production-ready business management platform with AI scheduling and inventory management.',
            relevance: 0.95
          },
          {
            title: 'Scheduling System',
            content: 'AI-powered scheduling with conflict detection and optimization suggestions.',
            relevance: 0.87
          }
        ],
        smokeMode: true
      })
    }

    // Use AI to enhance the search query and provide intelligent results
    const prompt = `
    You are a search assistant for the Andreas Vibe business management platform. 
    The user is searching for: "${query}"
    ${context ? `Additional context: ${context}` : ''}
    
    Provide relevant search results in JSON format with the following structure:
    {
      "results": [
        {
          "title": "Result Title",
          "content": "Brief description",
          "relevance": 0.95
        }
      ]
    }
    
    Focus on business management, scheduling, inventory, staff management, and analytics features.
    `

    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: query }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000
    })

    const searchResults = JSON.parse(response.choices[0].message.content || '{"results": []}')

    log('Search completed', { query, resultsCount: searchResults.results?.length || 0 })
    
    return NextResponse.json({
      query,
      ...searchResults,
      smokeMode: false
    })
  } catch (error) {
    log('Search failed', { error: error instanceof Error ? error.message : 'Unknown error' })
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    )
  }
}
