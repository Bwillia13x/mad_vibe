import { useState, useRef, useEffect } from 'react'
import { Bot, X, Minimize2, Maximize2, Send, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useWorkflow } from '@/hooks/useWorkflow'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
import { fetchConversations, createMessage } from '@/lib/workspace-api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [_isLoadingHistory, setIsLoadingHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { activeStage } = useWorkflow()
  const { currentWorkspace } = useWorkspaceContext()

  // Load conversation history when workspace changes
  useEffect(() => {
    if (!currentWorkspace || !isOpen) return

    const loadHistory = async () => {
      setIsLoadingHistory(true)
      try {
        const history = await fetchConversations(currentWorkspace.id, 50)
        if (history.length === 0) {
          // Show welcome message for new conversations
          setMessages([
            {
              id: 'welcome',
              role: 'assistant',
              content: `Hi! I'm your AI analyst copilot for ${currentWorkspace.name}. I can help you with valuation analysis, screening criteria, memo writing, and more. What would you like to explore?`,
              timestamp: Date.now()
            }
          ])
        } else {
          // Convert API messages to local format
          setMessages(
            history.map((msg) => ({
              id: msg.id.toString(),
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.createdAt).getTime()
            }))
          )
        }
      } catch (err) {
        console.error('Failed to load conversation history:', err)
        setMessages([
          {
            id: 'error',
            role: 'assistant',
            content: "I'm having trouble loading our conversation history. Starting fresh!",
            timestamp: Date.now()
          }
        ])
      } finally {
        setIsLoadingHistory(false)
      }
    }

    loadHistory()
  }, [currentWorkspace, isOpen])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentWorkspace) return

    const userPrompt = input
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userPrompt,
      timestamp: Date.now()
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Save user message to workspace
      await createMessage(currentWorkspace.id, {
        workflowId: currentWorkspace.id,
        role: 'user',
        content: userPrompt,
        context: {
          stageSlug: activeStage.slug,
          stageTitle: activeStage.title
        }
      })

      // Call AI API with enhanced context including conversation history
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          context: {
            stageSlug: activeStage.slug,
            stageTitle: activeStage.title,
            workspaceName: currentWorkspace.name,
            ticker: currentWorkspace.ticker
          },
          capability: 'suggest',
          conversationHistory: messages.filter(
            (m) => m.id !== 'welcome' && m.id !== 'error' && m.id !== 'fresh'
          ),
          workspaceId: currentWorkspace.id
        })
      })

      const data = await response.json()
      const aiContent = data.response || 'I encountered an issue. Please try again.'

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiContent,
        timestamp: Date.now()
      }

      setMessages((prev) => [...prev, aiMessage])

      // Save AI response to workspace
      await createMessage(currentWorkspace.id, {
        workflowId: currentWorkspace.id,
        role: 'assistant',
        content: aiContent,
        context: {
          stageSlug: activeStage.slug,
          stageTitle: activeStage.title
        }
      })
    } catch (error) {
      console.error('AI request failed:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: Date.now()
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const _handleStartFresh = () => {
    if (confirm('Start a fresh conversation? Previous messages will remain saved.')) {
      setMessages([
        {
          id: 'fresh',
          role: 'assistant',
          content: `Starting fresh! I'm ready to help with ${currentWorkspace?.name || 'your analysis'}. What would you like to explore?`,
          timestamp: Date.now()
        }
      ])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Quick action prompts
  const quickActions = [
    {
      label: 'Explain this stage',
      prompt: `What should I focus on in the ${activeStage.title} stage?`
    },
    {
      label: 'Suggest next steps',
      prompt: `What are the most important next steps for ${currentWorkspace?.name || 'this analysis'}?`
    },
    { label: 'Review assumptions', prompt: 'Can you review my key assumptions for any red flags?' }
  ]

  if (!currentWorkspace) {
    return null // Don't show assistant without workspace
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'w-14 h-14 rounded-full',
          'bg-gradient-to-br from-violet-600 to-purple-700',
          'shadow-lg shadow-violet-500/50',
          'hover:shadow-xl hover:shadow-violet-500/60',
          'transition-all duration-200',
          'flex items-center justify-center',
          'group',
          'animate-in fade-in slide-in-from-bottom-4 duration-500'
        )}
        aria-label="Open AI Assistant"
      >
        <Bot className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
      </button>
    )
  }

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl',
        'transition-all duration-300 ease-out',
        isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]',
        'flex flex-col overflow-hidden',
        'animate-in fade-in slide-in-from-bottom-8 duration-500'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-gradient-to-r from-violet-900/20 to-purple-900/20">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot className="w-5 h-5 text-violet-400" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">AI Copilot</h3>
            <p className="text-xs text-slate-400">{activeStage.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
            aria-label={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4 text-slate-400" />
            ) : (
              <Minimize2 className="w-4 h-4 text-slate-400" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-600/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2',
                    message.role === 'user'
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-800 text-slate-100 border border-slate-700'
                  )}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  <span className="text-xs opacity-60 mt-1 block">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-600/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
                </div>
                <div className="bg-slate-800 text-slate-100 border border-slate-700 rounded-2xl px-4 py-2">
                  <div className="flex gap-1">
                    <span
                      className="w-2 h-2 bg-slate-600 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-slate-600 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-slate-600 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length === 1 && (
            <div className="px-4 pb-3 space-y-2">
              <div className="text-xs text-slate-400 mb-2">Quick actions:</div>
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(action.prompt)
                    setTimeout(() => handleSend(), 100)
                  }}
                  className="w-full text-left px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors text-slate-300"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="sm"
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs">
                Enter
              </kbd>
              to send
            </div>
          </div>
        </>
      )}
    </div>
  )
}
