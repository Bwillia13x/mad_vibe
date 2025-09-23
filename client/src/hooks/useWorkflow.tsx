import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { type StageGateChecklistItem, type WorkflowStage, workflowStages } from '@/lib/workflow'
import { createResearchLogEntry, fetchResearchLog } from '@/lib/workflow-api'
import type { ResearchLogEntry, ResearchLogInput } from '@shared/types'

export type StageStatus = 'locked' | 'in-progress' | 'complete'

const STORAGE_KEY = 'valor-workflow-state'

export type StageChecklistState = Record<string, Record<string, boolean>>

export interface WorkflowContextValue {
  stages: WorkflowStage[]
  activeStage: WorkflowStage
  stageStatuses: Record<string, StageStatus>
  checklistState: StageChecklistState
  researchLog: ResearchLogEntry[]
  setActiveStage: (slug: string) => void
  toggleChecklistItem: (stageSlug: string, itemId: string) => void
  markStageComplete: (stageSlug: string) => void
  resetStage: (stageSlug: string) => void
  isStageComplete: (stageSlug: string) => boolean
  getChecklist: (stageSlug: string) => StageGateChecklistItem[]
  logEvent: (entry: ResearchLogInput) => Promise<void>
}

const WorkflowContext = createContext<WorkflowContextValue | undefined>(undefined)

const buildDefaultChecklistState = (): StageChecklistState => {
  return workflowStages.reduce<StageChecklistState>((acc, stage) => {
    if (stage.gateChecklist.length === 0) return acc
    acc[stage.slug] = stage.gateChecklist.reduce<Record<string, boolean>>((stageAcc, item) => {
      stageAcc[item.id] = false
      return stageAcc
    }, {})
    return acc
  }, {})
}

const loadState = (): StageChecklistState => {
  if (typeof window === 'undefined') return buildDefaultChecklistState()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return buildDefaultChecklistState()
    const parsed = JSON.parse(raw) as StageChecklistState
    return {
      ...buildDefaultChecklistState(),
      ...parsed
    }
  } catch (error) {
    console.warn('Failed to parse workflow state', error)
    return buildDefaultChecklistState()
  }
}

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const [checklists, setChecklists] = useState<StageChecklistState>(() => loadState())
  const [activeSlug, setActiveSlug] = useState<string>(workflowStages[0]?.slug ?? 'home')
  const [researchLog, setResearchLog] = useState<ResearchLogEntry[]>([])

  const appendLogEntry = useCallback((entry: ResearchLogEntry) => {
    setResearchLog((prev) => {
      const merged = [entry]
      for (const item of prev) {
        if (item.id !== entry.id) merged.push(item)
      }
      return merged
    })
  }, [])

  const logEvent = useCallback(
    async (entry: ResearchLogInput) => {
      try {
        const created = await createResearchLogEntry(entry)
        appendLogEntry(created)
      } catch (error) {
        console.warn('Failed to persist research log entry', error)
        appendLogEntry({
          id:
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          stageSlug: entry.stageSlug,
          stageTitle: entry.stageTitle,
          action: entry.action,
          details: entry.details,
          timestamp: entry.timestamp ?? new Date().toISOString()
        })
      }
    },
    [appendLogEntry]
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checklists))
    } catch (error) {
      console.warn('Failed to persist workflow state', error)
    }
  }, [checklists])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchResearchLog()
        if (!cancelled) {
          setResearchLog(data)
        }
      } catch (error) {
        console.warn('Failed to load research log', error)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const stageStatuses = useMemo(() => {
    const statuses: Record<string, StageStatus> = {}
    let previousComplete = true

    workflowStages.forEach((stage) => {
      const checklist = stage.gateChecklist
      const stageState = checklists[stage.slug] ?? {}
      const allDone = checklist.length === 0 || checklist.every((item) => stageState[item.id])

      if (!previousComplete && stage.id !== 0) {
        statuses[stage.slug] = 'locked'
      } else if (allDone) {
        statuses[stage.slug] = 'complete'
      } else {
        statuses[stage.slug] = 'in-progress'
      }

      previousComplete = previousComplete && allDone
    })

    return statuses
  }, [checklists])

  useEffect(() => {
    const currentStatus = stageStatuses[activeSlug]
    if (currentStatus === 'locked') {
      const fallback = workflowStages.find((stage) => stageStatuses[stage.slug] !== 'locked')
      if (fallback) setActiveSlug(fallback.slug)
    }
  }, [activeSlug, stageStatuses])

  const setActiveStage = useCallback(
    (slug: string) => {
      const status = stageStatuses[slug]
      if (status === 'locked' || slug === activeSlug) return
      const stage = workflowStages.find((entry) => entry.slug === slug)
      if (!stage) return
      setActiveSlug(slug)
      void logEvent({
        stageSlug: stage.slug,
        stageTitle: stage.title,
        action: 'Stage opened'
      })
    },
    [activeSlug, logEvent, stageStatuses]
  )

  const ensureStageState = useCallback((stageSlug: string) => {
    setChecklists((prev) => {
      if (prev[stageSlug]) return prev
      const stage = workflowStages.find((entry) => entry.slug === stageSlug)
      if (!stage || stage.gateChecklist.length === 0) return prev
      return {
        ...prev,
        [stageSlug]: stage.gateChecklist.reduce<Record<string, boolean>>((acc, item) => {
          acc[item.id] = false
          return acc
        }, {})
      }
    })
  }, [])

  const toggleChecklistItem = useCallback(
    (stageSlug: string, itemId: string) => {
      ensureStageState(stageSlug)
      setChecklists((prev) => {
        const stageState = prev[stageSlug] ?? {}
        return {
          ...prev,
          [stageSlug]: {
            ...stageState,
            [itemId]: !stageState[itemId]
          }
        }
      })
    },
    [ensureStageState]
  )

  const markStageComplete = useCallback(
    (stageSlug: string) => {
      const stage = workflowStages.find((entry) => entry.slug === stageSlug)
      if (!stage) return
      if (stage.gateChecklist.length === 0) return
      setChecklists((prev) => {
        return {
          ...prev,
          [stageSlug]: stage.gateChecklist.reduce<Record<string, boolean>>((acc, item) => {
            acc[item.id] = true
            return acc
          }, {})
        }
      })
      void logEvent({
        stageSlug: stage.slug,
        stageTitle: stage.title,
        action: 'Stage marked ready',
        details: 'Checklist confirmed'
      })
    },
    [logEvent]
  )

  const resetStage = useCallback(
    (stageSlug: string) => {
      const stage = workflowStages.find((entry) => entry.slug === stageSlug)
      if (!stage || stage.gateChecklist.length === 0) return
      setChecklists((prev) => {
        const next = { ...prev }
        delete next[stageSlug]
        return next
      })
      void logEvent({
        stageSlug: stage.slug,
        stageTitle: stage.title,
        action: 'Stage checklist reset'
      })
    },
    [logEvent]
  )

  const isStageComplete = useCallback(
    (stageSlug: string) => stageStatuses[stageSlug] === 'complete',
    [stageStatuses]
  )

  const getChecklist = useCallback((stageSlug: string) => {
    const stage = workflowStages.find((entry) => entry.slug === stageSlug)
    return stage?.gateChecklist ?? []
  }, [])

  const value: WorkflowContextValue = useMemo(
    () => ({
      stages: workflowStages,
      activeStage: workflowStages.find((stage) => stage.slug === activeSlug) ?? workflowStages[0],
      stageStatuses,
      checklistState: checklists,
      setActiveStage,
      toggleChecklistItem,
      markStageComplete,
      resetStage,
      isStageComplete,
      getChecklist,
      researchLog,
      logEvent
    }),
    [
      activeSlug,
      checklists,
      getChecklist,
      logEvent,
      isStageComplete,
      markStageComplete,
      researchLog,
      resetStage,
      setActiveStage,
      stageStatuses,
      toggleChecklistItem
    ]
  )

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>
}

export function useWorkflow() {
  const ctx = useContext(WorkflowContext)
  if (!ctx) throw new Error('useWorkflow must be used within a WorkflowProvider')
  return ctx
}
