import { Router } from 'express'
import { generateBusinessResponse, type BusinessChatMessage } from '../lib/openai'
import { generateStreamingBusinessResponse } from '../lib/streaming-openai'
import { getBusinessContext, getSpecificContext } from '../lib/business-context'
import {
  inputValidation,
  validateContentType,
  validateRequestSize
} from '../middleware/input-validation'

const router = Router()

// Apply input validation middleware to chat routes
router.use(inputValidation)
router.use(validateContentType(['application/json']))
router.use(validateRequestSize(1024 * 1024)) // 1MB limit for chat

router.post('/chat', async (req, res) => {
  try {
    const { messages, stream } = req.body

    // Enhanced input validation
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Messages array is required',
        code: 'INVALID_MESSAGES_FORMAT'
      })
    }

    // Validate array size to prevent DoS
    if (messages.length > 100) {
      return res.status(400).json({
        error: 'Too many messages in conversation',
        code: 'MESSAGES_LIMIT_EXCEEDED',
        limit: 100
      })
    }

    // Validate and sanitize message format
    const validMessages: BusinessChatMessage[] = []

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]

      // Validate message structure
      if (!msg || typeof msg !== 'object') {
        return res.status(400).json({
          error: `Invalid message format at index ${i}`,
          code: 'INVALID_MESSAGE_STRUCTURE'
        })
      }

      // Validate role
      if (!msg.role || (msg.role !== 'user' && msg.role !== 'assistant')) {
        return res.status(400).json({
          error: `Invalid role at message index ${i}. Must be 'user' or 'assistant'`,
          code: 'INVALID_MESSAGE_ROLE'
        })
      }

      // Validate content
      if (typeof msg.content !== 'string') {
        return res.status(400).json({
          error: `Invalid content type at message index ${i}. Must be string`,
          code: 'INVALID_MESSAGE_CONTENT'
        })
      }

      // Validate content length
      if (msg.content.length > 10000) {
        return res.status(400).json({
          error: `Message content too long at index ${i}`,
          code: 'MESSAGE_TOO_LONG',
          limit: 10000
        })
      }

      // Content is already sanitized by input validation middleware
      validMessages.push({
        role: msg.role,
        content: msg.content.trim()
      })
    }

    // Validate stream parameter
    if (stream !== undefined && typeof stream !== 'boolean') {
      return res.status(400).json({
        error: 'Stream parameter must be boolean',
        code: 'INVALID_STREAM_PARAMETER'
      })
    }

    // Generate business context based on the user's message
    console.log('Generating business context for AI assistant...')
    let businessContext: string
    try {
      // Check if the user is asking about something specific
      const lastUserMessage =
        validMessages
          .filter((m) => m.role === 'user')
          .pop()
          ?.content.toLowerCase() || ''

      if (
        lastUserMessage.includes('appointment') ||
        lastUserMessage.includes('schedule') ||
        lastUserMessage.includes('booking')
      ) {
        businessContext = await getSpecificContext('appointments')
      } else if (
        lastUserMessage.includes('inventory') ||
        lastUserMessage.includes('stock') ||
        lastUserMessage.includes('supply')
      ) {
        businessContext = await getSpecificContext('inventory')
      } else if (
        lastUserMessage.includes('staff') ||
        lastUserMessage.includes('barber') ||
        lastUserMessage.includes('employee')
      ) {
        businessContext = await getSpecificContext('staff')
      } else if (
        lastUserMessage.includes('analytics') ||
        lastUserMessage.includes('performance') ||
        lastUserMessage.includes('revenue') ||
        lastUserMessage.includes('business')
      ) {
        businessContext = await getSpecificContext('analytics')
      } else {
        // General business context for other queries
        businessContext = await getBusinessContext()
      }
      console.log('Business context generated successfully')
    } catch (error) {
      console.error('Error generating business context:', error)
      businessContext =
        'Unable to fetch current business data. Operating with basic business information only.'
    }

    if (stream) {
      // Set up Server-Sent Events for streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      })

      try {
        for await (const chunk of generateStreamingBusinessResponse(
          validMessages,
          businessContext
        )) {
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
        }
        res.write('data: [DONE]\n\n')
        res.end()
      } catch (error) {
        console.error('Streaming error:', error)
        res.write(`data: ${JSON.stringify({ error: 'Streaming error occurred' })}\n\n`)
        res.end()
      }
    } else {
      // Non-streaming response (fallback)
      const response = await generateBusinessResponse(validMessages, businessContext)
      res.json({
        message: response,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('Chat endpoint error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
