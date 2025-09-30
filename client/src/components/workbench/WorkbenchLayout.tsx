import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { useWorkflow } from '@/hooks/useWorkflow'
import { usePresence } from '@/hooks/usePresence'
import { useMemoComposer } from '@/hooks/useMemoComposer'
import { useAICopilot } from '@/hooks/useAICopilot'
import { explorerObjects } from '@/lib/workflow'
import { Console, Explorer, Inspector, MemoSyncStatusCard, TopBar, Workbench } from './panels'
import { AIAssistantPanel } from './AIAssistantPanel'
import { ContextualHelp } from '@/components/ui/ContextualHelp'
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
  pinned?: boolean
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
  const enableRemotePromptHistory = true

  const [activeTab, setActiveTab] = useState(() => tabs[0]?.id ?? 'main')

  // AI Copilot integration
  const { suggestions, availablePrompts, dismissSuggestion } = useAICopilot({
    stageSlug: activeStage.slug,
    stageTitle: activeStage.title,
    activeTab,
    currentData: {},
    recentActions: []
  })
  const [promptHistory, setPromptHistory] = useState<PromptHistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem('workbench_prompt_history')
      return raw ? (JSON.parse(raw) as PromptHistoryEntry[]) : []
    } catch {
      return []
    }
  })
  const [lastPrompt, setLastPrompt] = useState('')
  const [explorerOpen, setExplorerOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [explorerCollapsed, setExplorerCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('workbench_explorer_collapsed') === '1'
    } catch {
      return false
    }
  })
  const [inspectorCollapsed, setInspectorCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('workbench_inspector_collapsed') === '1'
    } catch {
      return false
    }
  })
  const [consoleCollapsed, setConsoleCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('workbench_console_collapsed')
      return saved === null ? true : saved === '1' // Default to collapsed (true) if not set
    } catch {
      return true // Default to collapsed
    }
  })
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return false // Default to not showing onboarding
    } catch {
      return false
    }
  })

  const stageStatusesBySlug = stageStatuses as Record<string, StageStatus>

  useEffect(() => {
    if (tabs.length === 0) return
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(tabs[0]?.id ?? '')
    }
  }, [activeTab, tabs])

  useEffect(() => {
    try {
      localStorage.setItem('workbench_explorer_collapsed', explorerCollapsed ? '1' : '0')
    } catch {}
  }, [explorerCollapsed])
  useEffect(() => {
    try {
      localStorage.setItem('workbench_inspector_collapsed', inspectorCollapsed ? '1' : '0')
    } catch {}
  }, [inspectorCollapsed])
  useEffect(() => {
    try {
      localStorage.setItem('workbench_console_collapsed', consoleCollapsed ? '1' : '0')
    } catch {}
  }, [consoleCollapsed])

  useEffect(() => {
    try {
      localStorage.setItem('workbench_prompt_history', JSON.stringify(promptHistory))
    } catch {}
  }, [promptHistory])

  // Optional: Merge research log prompt submissions into prompt history
  useEffect(() => {
    if (!enableRemotePromptHistory) return
    const merged: PromptHistoryEntry[] = [...promptHistory]
    for (const entry of researchLog) {
      if (entry.action !== 'Omni-prompt submitted') continue
      const exists = merged.some((p) => p.id === entry.id)
      if (!exists) {
        merged.push({
          id: entry.id,
          question: entry.details ?? '',
          timestamp: new Date(entry.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          }),
          stageTitle: entry.stageTitle
        })
      }
    }
    // Keep newest first
    merged.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1))
    setPromptHistory(merged.slice(0, 12))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableRemotePromptHistory, researchLog])

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
  }, [
    upcomingStage,
    canAdvance,
    isStageComplete,
    activeStage.slug,
    allTasksComplete,
    markStageComplete,
    handleStageChange
  ])

  const stageLog = useMemo(
    () => researchLog.filter((entry) => entry.stageSlug === activeStage.slug).slice(0, 6),
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

  const stageProgress: Record<string, { completed: number; total: number }> = useMemo(() => {
    const result: Record<string, { completed: number; total: number }> = {}
    for (const stage of stages) {
      const list = getChecklist(stage.slug)
      const state = checklistState[stage.slug] ?? {}
      const total = list.length
      const completed = list.reduce((sum, item) => sum + (state[item.id] ? 1 : 0), 0)
      result[stage.slug] = { completed, total }
    }
    return result
  }, [stages, getChecklist, checklistState])

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
      setShowOnboarding(false)
      localStorage.setItem('workbench_onboarding_shown', 'true')
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
      <ContextualHelp stageName={activeStage.slug} />
      {showOnboarding && (
        <div className="fixed top-4 right-4 z-50">
          <Tooltip open={showOnboarding}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowOnboarding(false)
                  localStorage.setItem('workbench_onboarding_shown', 'true')
                }}
              >
                Dismiss Tour
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              Welcome to the Workbench! Use the sidebar to navigate stages, the top bar for prompts, and drawers for explorer/inspector. Dismiss to hide.
            </TooltipContent>
          </Tooltip>
        </div>
      )}
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
        onToggleExplorerCollapsed={() => setExplorerCollapsed((v) => !v)}
        onToggleInspectorCollapsed={() => setInspectorCollapsed((v) => !v)}
        explorerCollapsed={explorerCollapsed}
        inspectorCollapsed={inspectorCollapsed}
        onToggleConsoleCollapsed={() => setConsoleCollapsed((v) => !v)}
        consoleCollapsed={consoleCollapsed}
      />
 
      <div className="flex flex-col lg:flex-row min-h-0 flex-1 border-t border-slate-900 transition-all duration-300 ease-in-out">
        {!explorerCollapsed && (
          <div className="transition-all duration-300 ease-in-out lg:w-64">
            <Explorer
              stages={stages}
              activeStage={activeStage.slug}
              stageStatuses={stageStatusesBySlug}
              stageProgress={stageProgress}
              onSelectStage={handleStageChange}
              supplementalSections={explorerObjects}
            />
          </div>
        )}
 
        <div className="flex-1 transition-all duration-300 ease-in-out">
          <ErrorBoundary>
            <Workbench
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              stageTitle={activeStage.shortTitle}
              stageGoal={activeStage.goal}
            />
          </ErrorBoundary>
        </div>
 
        {!inspectorCollapsed && (
          <div className="transition-all duration-300 ease-in-out lg:w-80">
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
              aiAssistantPanel={
                <AIAssistantPanel
                  suggestions={suggestions}
                  availablePrompts={availablePrompts}
                  onDismiss={dismissSuggestion}
                  onPromptSelect={handlePromptSubmit}
                />
              }
              onPromptShortcut={handlePromptSubmit}
            />
          </div>
        )}
      </div>

      <div
        className={`transition-all duration-300 ease-in-out ${consoleCollapsed ? 'h-0 opacity-0 overflow-hidden' : 'h-36 opacity-100'}`}
      >
        {!consoleCollapsed && (
          <Console
            history={promptHistory}
            tasks={tasks.map((task) => ({
              ...task,
              onToggle: () => toggleChecklistItem(activeStage.slug, task.id)
            }))}
            onClearHistory={() => setPromptHistory([])}
            onTogglePin={(id) =>
              setPromptHistory((prev) =>
                prev.map((p) => (p.id === id ? { ...p, pinned: !p.pinned } : p))
              )
            }
          />
        )}
      </div>

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
