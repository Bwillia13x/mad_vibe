import { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import { fetchMemoComposerState, persistMemoComposerState } from '@/lib/workflow-api'
import { useSessionKey } from './useSessionKey'
import { useWorkflow } from './useWorkflow'
import type { MemoComposerStateInput } from '@shared/types'
import type {
  IdeaIntakeState,
  IdeaIntakeActions,
  TriageDecision,
  Disqualifier,
  PromptHistoryEntry,
  WhiteboardNote
} from '@/types/idea-intake'
import { IDEA_INTAKE_DISQUALIFIERS } from '@/lib/idea-intake-constants'
// import { memoryOptimizer } from '@/lib/memory-optimization'

const INITIAL_WHITEBOARD_NOTES: WhiteboardNote[] = [
  { id: 1, text: 'Unit economics improving', x: 12, y: 22, tone: 'emerald' },
  { id: 2, text: 'Customer conc. risk', x: 54, y: 64, tone: 'amber' },
  { id: 3, text: 'Reg. change watchlist', x: 68, y: 28, tone: 'rose' }
]

export const classifyLogActor = (action: string, details?: string | null): 'ai' | 'analyst' => {
  const lowered = action.toLowerCase()
  if (lowered.includes('copilot') || lowered.includes('ai')) {
    return 'ai'
  }
  if (typeof details === 'string' && details.toLowerCase().includes('copilot')) {
    return 'ai'
  }
  return 'analyst'
}

export function useIdeaIntake(): IdeaIntakeState &
  IdeaIntakeActions & {
    whiteboardNotes: WhiteboardNote[]
    currentTime: string
    gatePassed: boolean
    aiDraft: string
    isGenerating: boolean
    aiError: string | null
    runQuickAction: (prompt: string) => Promise<void>
    insertCopilotDraftIntoThesis: () => void
    recentLog: {
      id: string
      timestamp: string
      action: string
      details?: string
      actor: 'ai' | 'analyst'
    }[]
    handleKeyDown: (e: React.KeyboardEvent) => void
  } {
  // Use refs for stable references to prevent unnecessary re-renders
  const disqualifierOptionsRef = useRef(IDEA_INTAKE_DISQUALIFIERS)
  const triageOptionsRef = useRef(['Advance', 'Park', 'Reject'] as const)
  const [prompt, setPrompt] = useState('')
  const [history, setHistory] = useState<PromptHistoryEntry[]>([])
  const [ticker, setTicker] = useState('')
  const [source, setSource] = useState('')
  const [whyNow, setWhyNow] = useState('')
  const [thesis, setThesis] = useState('')
  const [disqualifiers, setDisqualifiers] = useState<Disqualifier[]>([])
  const [triageDecision, setTriageDecision] = useState<TriageDecision>('Advance')
  const [aiDraft, setAiDraft] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const sessionKey = useSessionKey()
  const { logEvent, researchLog } = useWorkflow()

  // Computed values
  const currentTime = useMemo(() => {
    return new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

  const whiteboardNotes = useMemo(() => INITIAL_WHITEBOARD_NOTES, [])

  const gatePassed = useMemo(() => {
    return thesis.trim().length > 0 && disqualifiers.length >= 1
  }, [thesis, disqualifiers])

  const recentLog = useMemo(() => {
    return researchLog
      .filter((entry) => entry.stageSlug === 'intake')
      .slice(0, 10)
      .map((entry) => ({
        id: entry.id,
        timestamp: entry.timestamp,
        action: entry.action,
        details: entry.details,
        actor: classifyLogActor(entry.action, entry.details)
      }))
  }, [researchLog])

  // Actions with optimized dependencies and memory management
  const runCopilot = useCallback(
    async (inputPrompt: string, recordPrompt = true) => {
      const trimmed = inputPrompt.trim()
      if (!trimmed || isGenerating) return

      if (recordPrompt) {
        const timestamp = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })

        setHistory((prev) => {
          const newEntry = { q: trimmed, t: timestamp }
          const updated = [newEntry, ...prev]
          return updated.slice(0, 50)
        })

        const truncatedPrompt = trimmed.length > 90 ? `${trimmed.slice(0, 90)}…` : trimmed
        void logEvent({
          stageSlug: 'intake',
          stageTitle: 'Idea Intake (Triage)',
          action: 'Copilot Prompt',
          details: truncatedPrompt
        })
      }

      if (recordPrompt) {
        setPrompt('')
      }
      setIsGenerating(true)
      setAiError(null)

      const contextPayload = {
        stageSlug: 'intake',
        stageTitle: 'Idea Intake (Triage)',
        currentData: {
          ticker: ticker || null,
          source: source || null,
          whyNow: whyNow || null,
          thesis: thesis || null,
          disqualifiers,
          triageDecision
        }
      }

      try {
        const response = await fetch('/api/copilot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: trimmed,
            context: contextPayload,
            capability: 'analyze'
          })
        })

        if (!response.ok) {
          throw new Error(`Copilot request failed with status ${response.status}`)
        }

        const data = (await response.json()) as { response?: string }
        setAiDraft(data.response?.trim() || 'Copilot returned no content.')
      } catch (error) {
        console.error('Idea intake copilot error:', error)
        setAiError('Copilot response unavailable right now. Try again in a moment.')
      } finally {
        setIsGenerating(false)
      }
    },
    [isGenerating, ticker, source, whyNow, thesis, disqualifiers, triageDecision]
  )

  const submitPrompt = useCallback(async () => {
    await runCopilot(prompt)
  }, [prompt, runCopilot])

  const runQuickAction = useCallback(
    async (quickPrompt: string) => {
      await runCopilot(quickPrompt, true)
    },
    [runCopilot]
  )

  const syncDraftToMemo = useCallback(
    async (updatedThesis: string) => {
      const trimmed = updatedThesis.trim()
      if (!trimmed || !sessionKey) return false
      try {
        const remote = await fetchMemoComposerState(sessionKey)
        const payload: MemoComposerStateInput = {
          sections: {
            ...(remote?.sections ?? {}),
            'memo-thesis': trimmed
          },
          reviewChecklist: remote?.reviewChecklist ?? {},
          attachments: remote?.attachments ?? {},
          commentThreads: remote?.commentThreads ?? {},
          version: remote?.version ?? 0
        }
        await persistMemoComposerState(sessionKey, payload)
        return true
      } catch (error) {
        console.warn('Failed to sync copilot draft to memo state', error)
        return false
      }
    },
    [sessionKey]
  )

  const insertCopilotDraftIntoThesis = useCallback(() => {
    setThesis((prev) => {
      const trimmedDraft = aiDraft.trim()
      if (!trimmedDraft) return prev
      const next = prev.trim() ? `${prev.trim()}\n\n${trimmedDraft}` : trimmedDraft

      const timestamp = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })

      const truncatedDraft = next.length > 90 ? `${next.slice(0, 90)}…` : next

      void syncDraftToMemo(next).then((synced) => {
        if (synced) {
          void logEvent({
            stageSlug: 'memo',
            stageTitle: 'IC-Style Memo Draft',
            action: 'Memo thesis synced',
            details: truncatedDraft
          })
        }
      })

      void logEvent({
        stageSlug: 'intake',
        stageTitle: 'Idea Intake (Triage)',
        action: 'AI Draft Inserted',
        details: truncatedDraft
      })
      return next
    })
  }, [aiDraft, syncDraftToMemo, logEvent])

  const toggleDisqualifier = useCallback((disqualifier: Disqualifier) => {
    setDisqualifiers((prev) => {
      const exists = prev.includes(disqualifier)
      return exists ? prev.filter((x) => x !== disqualifier) : [...prev, disqualifier]
    })
  }, [])

  const submitNext = useCallback(() => {
    const t = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
    setHistory((prev) => {
      const newEntry = { q: `[Gate] ${triageDecision} to One-Pager`, t }
      const updated = [newEntry, ...prev]
      // Limit history size to prevent memory bloat
      return updated.slice(0, 50)
    })
  }, [triageDecision])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setPrompt('')
    }
  }, [])

  // Memoize the return object to prevent unnecessary re-renders
  const hookReturn = useMemo(
    () => ({
      // State
      prompt,
      history,
      ticker,
      source,
      whyNow,
      thesis,
      disqualifiers,
      triageDecision,

      // Computed
      whiteboardNotes,
      currentTime,
      gatePassed,
      aiDraft,
      isGenerating,
      aiError,
      runQuickAction,
      insertCopilotDraftIntoThesis,
      recentLog,

      // Actions
      setPrompt,
      submitPrompt,
      setTicker,
      setSource,
      setWhyNow,
      setThesis,
      toggleDisqualifier,
      setTriageDecision,
      submitNext,
      handleKeyDown
    }),
    [
      prompt,
      history,
      ticker,
      source,
      whyNow,
      thesis,
      disqualifiers,
      triageDecision,
      whiteboardNotes,
      currentTime,
      gatePassed,
      aiDraft,
      isGenerating,
      aiError,
      runQuickAction,
      insertCopilotDraftIntoThesis,
      recentLog,
      setPrompt,
      submitPrompt,
      setTicker,
      setSource,
      setWhyNow,
      setThesis,
      toggleDisqualifier,
      setTriageDecision,
      submitNext,
      handleKeyDown
    ]
  )

  return hookReturn
}
