import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { useWorkflow } from '@/hooks/useWorkflow'
import { usePresence } from '@/hooks/usePresence'
import { useMemoComposer } from '@/hooks/useMemoComposer'
import { explorerObjects } from '@/lib/workflow'
import {
  Console,
  Explorer,
  Inspector,
  MemoSyncStatusCard,
  TopBar,
  Workbench
} from './panels'
import type { StageStatus } from './panels'

export type WorkbenchTab = {
  id: string
  label: string
  description?: string
  content: ReactNode
}

export interface WorkbenchLayoutProps {
  tabs: WorkbenchTab[]
  inspectorExtras?: ReactNode
  onOpenPrompt?: () => void
  onNavigateStage?: (slug: string) => void
}

export type PromptHistoryEntry = {
  id: string
  question: string
  timestamp: string
  stageTitle: string
}

export type ChecklistTask = {
  id: string
  label: string
  completed: boolean
  helper?: string
}

export function WorkbenchLayout({
  tabs,
  inspectorExtras,
  onOpenPrompt,
  onNavigateStage
}: WorkbenchLayoutProps) {
  const {
    stages,
    activeStage,
    stageStatuses,
    setActiveStage,
    getChecklist,
    checklistState,
    toggleChecklistItem,
    markStageComplete,
    isStageComplete,
    researchLog,
    logEvent
  } = useWorkflow()
  const { syncStatus: memoSyncStatus } = useMemoComposer()

  const [activeTab, setActiveTab] = useState(() => tabs[0]?.id ?? 'main')
  const [promptHistory, setPromptHistory] = useState<PromptHistoryEntry[]>([])
  const [lastPrompt, setLastPrompt] = useState('')
  const [explorerOpen, setExplorerOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(false)

  const stageStatusesBySlug = stageStatuses as Record<string, StageStatus>

  useEffect(() => {
    if (tabs.length === 0) return
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(tabs[0]?.id ?? '')
    }
  }, [activeTab, tabs])

  const stageMeta = useMemo(() => {
    const index = stages.findIndex((stage) => stage.slug === activeStage.slug)
    const next = index >= 0 ? stages[index + 1] : undefined
    return {
      index,
      number: index >= 0 ? index + 1 : 1,
      nextStage: next
    }
  }, [stages, activeStage.slug])

  const { number: stageNumber, nextStage: upcomingStage } = stageMeta

  const handleStageChange = useCallback(
    (slug: string) => {
      if (stageStatusesBySlug[slug] === 'locked') return
      setActiveStage(slug)
      onNavigateStage?.(slug)
    },
    [stageStatusesBySlug, setActiveStage, onNavigateStage]
  )

  const statusLabel = stageStatusesBySlug[activeStage.slug]
  const checklist = getChecklist(activeStage.slug)
  const checklistStateForStage = checklistState[activeStage.slug] ?? {}

  const hasChecklist = checklist.length > 0
  const allTasksComplete = useMemo(
    () => checklist.every((item) => checklistStateForStage[item.id]),
    [checklist, checklistStateForStage]
  )

  const canAdvance = useMemo(() => {
    if (!upcomingStage) return false
    const nextStatus = stageStatusesBySlug[upcomingStage.slug]
    if (nextStatus === 'locked') return false
    return !hasChecklist || allTasksComplete
  }, [allTasksComplete, hasChecklist, upcomingStage, stageStatusesBySlug])

  const handleNextStage = useCallback(() => {
    if (!upcomingStage || !canAdvance) return
    if (!isStageComplete(activeStage.slug) && allTasksComplete) {
      markStageComplete(activeStage.slug)
    }
    handleStageChange(upcomingStage.slug)
  }, [upcomingStage, canAdvance, isStageComplete, activeStage.slug, allTasksComplete, markStageComplete, handleStageChange])

  const stageLog = useMemo(
    () =>
      researchLog
        .filter((entry) => entry.stageSlug === activeStage.slug)
        .slice(0, 6),
    [activeStage.slug, researchLog]
  )

  const tasks: ChecklistTask[] = useMemo(
    () =>
      checklist.map((item) => ({
        id: item.id,
        label: item.label,
        helper: item.helper,
        completed: checklistStateForStage[item.id] ?? false
      })),
    [checklist, checklistStateForStage]
  )

  const { actorId, peers } = usePresence(activeStage.slug)
  const otherPeers = useMemo(
    () => peers.filter((peer) => peer.actorId !== actorId),
    [actorId, peers]
  )

  const presenceSummary = useMemo(() => {
    if (otherPeers.length === 0) return 'Solo analyst'
    const noun = otherPeers.length === 1 ? 'analyst' : 'analysts'
    return `Collaborating with ${otherPeers.length} ${noun}`
  }, [otherPeers.length])

  const handlePromptSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      if (!trimmed) return
      const now = new Date()
      const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const entry: PromptHistoryEntry = {
        id: `prompt-${Date.now()}`,
        question: trimmed,
        timestamp,
        stageTitle: activeStage.shortTitle
      }
      setPromptHistory((prev) => [entry, ...prev].slice(0, 8))
      setLastPrompt(trimmed)
      void logEvent({
        stageSlug: activeStage.slug,
        stageTitle: activeStage.title,
        action: 'Omni-prompt submitted',
        details: trimmed,
        timestamp: now.toISOString()
      })
      onOpenPrompt?.()
    },
    [activeStage.shortTitle, activeStage.slug, activeStage.title, logEvent, onOpenPrompt]
  )

  const combinedInspectorExtras = useMemo(
    () =>
      activeStage.slug === 'memo' ? (
        <>
          <MemoSyncStatusCard status={memoSyncStatus} />
          {inspectorExtras}
        </>
      ) : (
        inspectorExtras
      ),
    [activeStage.slug, inspectorExtras, memoSyncStatus]
  )

  return (
    <div className="flex h-screen w-full flex-col bg-slate-950 text-slate-100">
      <TopBar
        stageTitle={activeStage.title}
        stageGoal={activeStage.goal}
        stageIndex={stageNumber}
        totalStages={stages.length}
        presenceLabel={presenceSummary}
        onSubmitPrompt={handlePromptSubmit}
        onOpenPrompt={onOpenPrompt}
        onNext={handleNextStage}
        disableNext={!canAdvance}
        onOpenExplorer={() => setExplorerOpen(true)}
        onOpenInspector={() => setInspectorOpen(true)}
      />

      <div className="flex min-h-0 flex-1 border-t border-slate-900">
        <Explorer
          stages={stages}
          activeStage={activeStage.slug}
          stageStatuses={stageStatusesBySlug}
          onSelectStage={handleStageChange}
          supplementalSections={explorerObjects}
        />

        <Workbench
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          stageTitle={activeStage.shortTitle}
          stageGoal={activeStage.goal}
        />

        <Inspector
          statusLabel={statusLabel}
          checklist={checklist}
          checklistState={checklistStateForStage}
          onToggle={(itemId) => toggleChecklistItem(activeStage.slug, itemId)}
          stageLog={stageLog}
          lastPrompt={lastPrompt}
          presenceLabel={presenceSummary}
          inspectorExtras={combinedInspectorExtras}
          aiModes={activeStage.aiModes ?? []}
          onPromptShortcut={handlePromptSubmit}
        />
      </div>

      <Console
        history={promptHistory}
        tasks={tasks.map((task) => ({
          ...task,
          onToggle: () => toggleChecklistItem(activeStage.slug, task.id)
        }))}
      />

      <Drawer open={explorerOpen} onOpenChange={setExplorerOpen}>
        <DrawerContent className="h-[80vh] border-t border-slate-800 bg-slate-950 text-slate-100">
          <DrawerHeader className="border-b border-slate-800 pb-3">
            <DrawerTitle className="text-sm font-semibold text-slate-200">Navigator</DrawerTitle>
          </DrawerHeader>
          <Explorer
            stages={stages}
            activeStage={activeStage.slug}
            stageStatuses={stageStatusesBySlug}
            onSelectStage={(slug) => {
              handleStageChange(slug)
              setExplorerOpen(false)
            }}
            supplementalSections={explorerObjects}
            variant="drawer"
          />
        </DrawerContent>
      </Drawer>

      <Drawer open={inspectorOpen} onOpenChange={setInspectorOpen}>
        <DrawerContent className="h-[80vh] border-t border-slate-800 bg-slate-950 text-slate-100">
          <DrawerHeader className="border-b border-slate-800 pb-3">
            <DrawerTitle className="text-sm font-semibold text-slate-200">Inspector</DrawerTitle>
          </DrawerHeader>
          <Inspector
            statusLabel={statusLabel}
            checklist={checklist}
            checklistState={checklistStateForStage}
            onToggle={(itemId) => toggleChecklistItem(activeStage.slug, itemId)}
            stageLog={stageLog}
            lastPrompt={lastPrompt}
            presenceLabel={presenceSummary}
            inspectorExtras={combinedInspectorExtras}
            aiModes={activeStage.aiModes ?? []}
            variant="drawer"
            onPromptShortcut={handlePromptSubmit}
          />
        </DrawerContent>
      </Drawer>
    </div>
  )
}
