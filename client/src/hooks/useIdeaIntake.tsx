import { useCallback, useMemo, useState, useRef, useEffect } from 'react'
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

export function useIdeaIntake(): IdeaIntakeState &
  IdeaIntakeActions & {
    whiteboardNotes: WhiteboardNote[]
    currentTime: string
    gatePassed: boolean
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

  // Actions with optimized dependencies and memory management
  const submitPrompt = useCallback(() => {
    if (!prompt.trim()) return
    const t = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
    setHistory((prev) => {
      const newEntry = { q: prompt.trim(), t }
      const updated = [newEntry, ...prev]
      // Limit history size to prevent memory bloat
      return updated.slice(0, 50)
    })
    setPrompt('')
  }, [prompt])

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
