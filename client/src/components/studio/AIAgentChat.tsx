import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { GlassCard } from '@/components/layout/GlassCard'
import { Button } from '@/components/ui/button'
import { useWorkflow } from '@/hooks/useWorkflow'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
import { fetchConversations, createMessage, fetchArtifacts } from '@/lib/workspace-api'
import type { ConversationMessage } from '@shared/types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export function AIAgentChat({ className = '' }: { className?: string }) {
  const { activeStage } = useWorkflow()
  const { currentWorkspace } = useWorkspaceContext()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachedImage, setAttachedImage] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!currentWorkspace?.id) return
    const load = async () => {
      try {
        const history = await fetchConversations(currentWorkspace.id, 50)
        if (history.length === 0) {
          setMessages([
            {
              id: 'welcome',
              role: 'assistant',
              content:
                "Hi! I'm your AI pair-programming copilot. Use the canvas to sketch ideas and ask me anything here.",
              timestamp: Date.now()
            }
          ])
        } else {
          setMessages(
            history.map((m: ConversationMessage) => ({
              id: String(m.id),
              role: m.role,
              content: m.content,
              timestamp: new Date(m.createdAt).getTime()
            }))
          )
        }
      } catch (_e) {
        setMessages([
          {
            id: 'error',
            role: 'assistant',
            content: 'Unable to load prior messages. Starting fresh.',
            timestamp: Date.now()
          }
        ])
      }
    }
    load()
  }, [currentWorkspace?.id, currentWorkspace?.name])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentWorkspace) return
    const prompt = input.trim()
    setInput('')

    const user: Message = {
      id: String(Date.now()),
      role: 'user',
      content: prompt,
      timestamp: Date.now()
    }
    setMessages((prev) => [...prev, user])
    setIsLoading(true)

    try {
      await createMessage(currentWorkspace.id, {
        workflowId: currentWorkspace.id,
        role: 'user',
        content: prompt,
        context: { stageSlug: activeStage.slug, stageTitle: activeStage.title }
      })

      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          context: {
            stageSlug: activeStage.slug,
            stageTitle: activeStage.title,
            workspaceName: currentWorkspace.name,
            ticker: currentWorkspace.ticker,
            currentData: attachedImage ? { canvasImage: attachedImage } : undefined
          },
          capability: 'suggest',
          conversationHistory: messages.filter((m) => m.id !== 'welcome' && m.id !== 'error'),
          workspaceId: currentWorkspace.id
        })
      })

      const data = await res.json()
      const reply: Message = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: data.response || 'I had trouble responding. Please try again.',
        timestamp: Date.now()
      }
      setMessages((prev) => [...prev, reply])

      await createMessage(currentWorkspace.id, {
        workflowId: currentWorkspace.id,
        role: 'assistant',
        content: reply.content,
        context: { stageSlug: activeStage.slug, stageTitle: activeStage.title }
      })
    } catch (_e) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 2),
          role: 'assistant',
          content: 'I cannot reach the server right now. Please try again shortly.',
          timestamp: Date.now()
        }
      ])
    } finally {
      setIsLoading(false)
      setAttachedImage(null)
    }
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <GlassCard title="AI Agent" subtitle="Chat with your copilot" className={className}>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={
                  m.role === 'user'
                    ? 'bg-violet-600 text-white rounded-2xl px-3 py-2 max-w-[85%]'
                    : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-2xl px-3 py-2 max-w-[85%]'
                }
              >
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</div>
                <div className="text-[10px] opacity-60 mt-1">
                  {new Date(m.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}
          {isLoading && <div className="text-xs text-slate-400">Thinking…</div>}
          {attachedImage && (
            <div className="text-xs text-slate-400">
              Attached canvas snapshot will be included.
              <div className="mt-2 border border-slate-700 rounded-lg overflow-hidden bg-slate-900">
                <img src={attachedImage} alt="Attached canvas" className="max-h-32 w-auto" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="mt-3 border-t border-slate-800 pt-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask anything…"
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
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
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              className="text-xs px-2 py-1 rounded border border-slate-800 hover:bg-slate-900 text-slate-300"
              onClick={async () => {
                if (!currentWorkspace?.id) return
                try {
                  const arts = await fetchArtifacts(currentWorkspace.id, {
                    stageSlug: 'studio',
                    type: 'note'
                  })
                  if (Array.isArray(arts) && arts.length > 0) {
                    const first = arts[0]
                    const img = (first.data as { image?: string } | null | undefined)?.image
                    if (typeof img === 'string' && img.length > 0) {
                      setAttachedImage(img)
                    } else {
                      setMessages((prev) => [
                        ...prev,
                        {
                          id: String(Date.now()),
                          role: 'assistant',
                          content: 'No image found in the latest canvas artifact.',
                          timestamp: Date.now()
                        }
                      ])
                    }
                  } else {
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: String(Date.now()),
                        role: 'assistant',
                        content:
                          'No recent canvas snapshot found to attach. Save one from the canvas.',
                        timestamp: Date.now()
                      }
                    ])
                  }
                } catch (_e) {
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: String(Date.now()),
                      role: 'assistant',
                      content: 'Failed to fetch latest canvas snapshot.',
                      timestamp: Date.now()
                    }
                  ])
                }
              }}
            >
              {attachedImage ? 'Attached: latest canvas' : 'Attach latest canvas'}
            </button>
            {attachedImage && (
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border border-slate-800 hover:bg-slate-900 text-slate-300"
                onClick={() => setAttachedImage(null)}
              >
                Remove attachment
              </button>
            )}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Press Enter to send</div>
        </div>
      </div>
    </GlassCard>
  )
}
