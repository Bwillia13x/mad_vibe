import { type ReactNode, useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Lock,
  Play,
  Sparkles
} from "lucide-react"
import { useWorkflow } from "@/hooks/useWorkflow"
import { usePresence } from "@/hooks/usePresence"
import { explorerObjects } from "@/lib/workflow"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type TaskEntry = {
  id: string
  label: string
  status: "open" | "done" | "blocked"
}

type AlertEntry = {
  id: string
  label: string
  level: "info" | "warning" | "critical"
}

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
    researchLog
  } = useWorkflow()

  const [activeTab, setActiveTab] = useState<string>(() => tabs[0]?.id ?? "main")

  useEffect(() => {
    if (tabs.length === 0) return
    const firstTab = tabs[0]?.id
    if (firstTab && !tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(firstTab)
    }
  }, [activeTab, tabs])

  const currentIndex = activeStage.id
  const prevStage = useMemo(
    () => stages.slice().reverse().find((stage) => stage.id < currentIndex),
    [currentIndex, stages]
  )
  const nextStage = useMemo(
    () => stages.find((stage) => stage.id > currentIndex),
    [currentIndex, stages]
  )

  const handleStageChange = (slug: string) => {
    setActiveStage(slug)
    onNavigateStage?.(slug)
  }

  const statusLabel = stageStatuses[activeStage.slug]

  const checklist = getChecklist(activeStage.slug)
  const checklistStateForStage = checklistState[activeStage.slug] ?? {}

  const stageLog = useMemo(
    () =>
      researchLog
        .filter((entry) => entry.stageSlug === activeStage.slug)
        .slice(0, 5),
    [activeStage.slug, researchLog]
  )

  const promptHistory = useMemo(() => {
    const mapped = stageLog.map((entry) => ({
      id: entry.id,
      title: entry.action,
      snippet: entry.details ?? "Logged event",
      timestamp: new Date(entry.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
    }))
    return mapped.length > 0
      ? mapped
      : [
          {
            id: "prompt.empty",
            title: "No recent activity",
            snippet: "Complete checklist actions to populate the log.",
            timestamp: "--:--"
          }
        ]
  }, [stageLog])

  const tasks = useMemo(() => {
    const items: TaskEntry[] = checklist.map((item) => {
      const complete = checklistStateForStage[item.id] ?? false
      return {
        id: item.id,
        label: item.label,
        status: complete ? "done" : "open"
      }
    })
    if (items.length === 0) {
      return [
        {
          id: "task.none",
          label: "This stage has no gating tasks",
          status: "done"
        }
      ]
    }
    return items
  }, [checklist, checklistStateForStage])

  const alerts = useMemo(() => {
    const currentStatus = stageStatuses[activeStage.slug]
    const list: AlertEntry[] = []
    if (currentStatus === "locked") {
      list.push({
        id: "alert.locked",
        label: "Stage locked — finish prior gates to proceed",
        level: "critical"
      })
    }
    if (currentStatus === "in-progress" && checklist.some((item) => !checklistStateForStage[item.id])) {
      list.push({
        id: "alert.checklist",
        label: "Complete the gate checklist to unlock next tools",
        level: "warning"
      })
    }
    if (list.length === 0) {
      list.push({
        id: "alert.clear",
        label: "No active alerts",
        level: "info"
      })
    }
    return list
  }, [activeStage.slug, checklist, checklistStateForStage, stageStatuses])

  const { actorId, peers } = usePresence(activeStage.slug)
  const otherPeers = useMemo(
    () => peers.filter((peer) => peer.actorId !== actorId),
    [actorId, peers]
  )
  const formatPeerId = (id: string) => `…${id.slice(-4)}`

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-slate-700 text-xs uppercase">
              Stage {activeStage.id + 1} / {stages.length}
            </Badge>
            <div>
              <div className="text-sm font-semibold tracking-wide text-slate-100">
                {activeStage.title}
              </div>
              <div className="text-xs text-slate-400">
                {activeStage.goal}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    otherPeers.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                  )}
                />
                {otherPeers.length === 0 ? (
                  <span>Solo editing</span>
                ) : (
                  <span>
                    Collaborating with {otherPeers.length}{' '}
                    {otherPeers.length === 1 ? 'analyst' : 'analysts'}{' '}
                    ({otherPeers.map((peer) => formatPeerId(peer.actorId)).join(', ')})
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex gap-2"
              onClick={onOpenPrompt}
            >
              <Sparkles className="h-4 w-4" />
              Omni-Prompt
              <span className="rounded bg-slate-800 px-1 py-0.5 text-[10px] text-slate-300">
                ⌘K
              </span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={!prevStage || stageStatuses[prevStage.slug] === "locked"}
              onClick={() => prevStage && handleStageChange(prevStage.slug)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="sm"
              className="gap-2"
              disabled={!nextStage || stageStatuses[nextStage.slug] === "locked"}
              onClick={() => nextStage && handleStageChange(nextStage.slug)}
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-950 lg:flex">
          <ScrollArea className="h-full w-full">
            <nav className="space-y-6 p-4">
              <div>
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Stage Pipeline
                </div>
                <ul className="space-y-1">
                  {stages.map((stage) => {
                    const status = stageStatuses[stage.slug]
                    const isActive = stage.slug === activeStage.slug
                    return (
                      <li key={stage.slug}>
                        <button
                          type="button"
                          onClick={() =>
                            status !== "locked" && handleStageChange(stage.slug)
                          }
                          className={cn(
                            "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition",
                            status === "locked" && "cursor-not-allowed text-slate-600",
                            isActive && "bg-slate-800 text-slate-50",
                            !isActive && status !== "locked" && "hover:bg-slate-900"
                          )}
                        >
                          {status === "complete" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : status === "locked" ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            <Circle className="h-4 w-4 text-slate-400" />
                          )}
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-100">
                              {stage.shortTitle}
                            </span>
                            <span className="text-xs text-slate-500">
                              {stage.goal}
                            </span>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>

              {explorerObjects.map((section) => (
                <div key={section.section}>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {section.section}
                  </div>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item}>
                        <button
                          type="button"
                          className="w-full rounded-md px-2 py-1 text-left text-xs text-slate-400 transition hover:bg-slate-900 hover:text-slate-200"
                        >
                          {item}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </ScrollArea>
        </aside>

        <main className="flex-1 border-r border-slate-800 bg-slate-900">
          <div className="flex h-full flex-col overflow-hidden">
            {tabs.length > 0 ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col px-4 py-3">
                <div className="flex items-center justify-between">
                  <TabsList>
                    {tabs.map((tab) => (
                      <TabsTrigger key={tab.id} value={tab.id}>
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <div className="hidden items-center gap-2 text-xs text-slate-400 md:flex">
                    <Play className="h-3 w-3" />
                    Progressive disclosure: next tools unlock after gates.
                  </div>
                </div>
                <div className="mt-4 flex-1 overflow-hidden">
                  {tabs.map((tab) => (
                    <TabsContent
                      key={tab.id}
                      value={tab.id}
                      className="h-full overflow-hidden"
                    >
                      <ScrollArea className="h-full rounded-lg border border-slate-800 bg-slate-950/60">
                        <div className="space-y-6 p-6 text-sm text-slate-200">
                          {tab.content}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  ))}
                </div>
              </Tabs>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">
                No workbench tabs defined for this stage.
              </div>
            )}
          </div>
        </main>

        <aside className="hidden w-80 shrink-0 bg-slate-950 lg:flex">
          <ScrollArea className="h-full w-full">
            <div className="space-y-6 p-4">
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </h3>
                <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <div className="text-sm font-medium text-slate-100">
                    {statusLabel === "complete" && "Ready for next stage"}
                    {statusLabel === "in-progress" && "In progress"}
                    {statusLabel === "locked" && "Locked"}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {statusLabel === "locked"
                      ? "Complete prior stage gates to unlock."
                      : "Use the checklist to mark gating tasks."}
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Gate Checklist
                </h3>
                <div className="mt-3 space-y-2">
                  {checklist.length === 0 && (
                    <p className="text-xs text-slate-400">
                      This stage has no gating requirements.
                    </p>
                  )}
                  {checklist.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-900 p-2 text-xs"
                    >
                      <Checkbox
                        checked={checklistStateForStage[item.id] ?? false}
                        onCheckedChange={() =>
                          toggleChecklistItem(activeStage.slug, item.id)
                        }
                      />
                      <span className="leading-tight text-slate-200">
                        {item.label}
                        {item.helper && (
                          <span className="block text-[11px] text-slate-500">
                            {item.helper}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                  {checklist.length > 0 && !isStageComplete(activeStage.slug) && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => markStageComplete(activeStage.slug)}
                    >
                      Mark stage ready
                    </Button>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Inputs
                </h3>
                <ul className="mt-2 space-y-1 text-xs text-slate-400">
                  {activeStage.inputs.map((input) => (
                    <li key={input} className="rounded bg-slate-900/60 px-2 py-1">
                      {input}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Work
                </h3>
                <ul className="mt-2 space-y-1 text-xs text-slate-400">
                  {activeStage.work.map((item) => (
                    <li key={item} className="rounded bg-slate-900/60 px-2 py-1">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Outputs
                </h3>
                <ul className="mt-2 space-y-1 text-xs text-slate-400">
                  {activeStage.outputs.map((output) => (
                    <li key={output} className="rounded bg-slate-900/60 px-2 py-1">
                      {output}
                    </li>
                  ))}
                </ul>
              </section>

              {activeStage.aiModes && activeStage.aiModes.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    AI Pair Analyst
                  </h3>
                  <ul className="mt-2 space-y-1 text-xs text-slate-400">
                    {activeStage.aiModes.map((mode) => (
                      <li key={mode} className="rounded bg-slate-900/60 px-2 py-1">
                        {mode}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Research Log
                </h3>
                <div className="mt-2 space-y-2 text-xs">
                  {stageLog.length === 0 && (
                    <p className="text-slate-500">No log entries yet for this stage.</p>
                  )}
                  {stageLog.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-slate-800 bg-slate-900 p-2"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        <span>{entry.action}</span>
                      </div>
                      {entry.details && (
                        <p className="mt-1 text-slate-300">{entry.details}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {inspectorExtras}
            </div>
          </ScrollArea>
        </aside>
      </div>

      <footer className="border-t border-slate-900 bg-slate-950/90">
        <div className="grid gap-4 px-4 py-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Prompt History
              </h3>
              <span className="text-[11px] text-slate-600">⌘⇧S Snapshot</span>
            </div>
            <ScrollArea className="mt-2 h-24 rounded-md border border-slate-900/60 bg-slate-950">
              <ul className="divide-y divide-slate-900/80 text-xs">
                {promptHistory.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3 px-3 py-2">
                    <span className="mt-[2px] text-[10px] font-semibold uppercase text-slate-500">
                      {entry.timestamp}
                    </span>
                    <div>
                      <p className="font-medium text-slate-200">{entry.title}</p>
                      <p className="text-[11px] text-slate-500">{entry.snippet}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Task List
              </h3>
              <ScrollArea className="mt-2 h-24 rounded-md border border-slate-900/60 bg-slate-950">
                <ul className="space-y-1 p-2 text-xs">
                  {tasks.map((task) => (
                    <li
                      key={task.id}
                      className={cn(
                        "flex items-center justify-between rounded px-2 py-1",
                        task.status === "open" && "bg-slate-900 text-slate-200",
                        task.status === "done" && "text-emerald-400",
                        task.status === "blocked" && "bg-amber-900/40 text-amber-200"
                      )}
                    >
                      <span>{task.label}</span>
                      <span className="text-[10px] uppercase">
                        {task.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Alerts Log
              </h3>
              <ScrollArea className="mt-2 h-20 rounded-md border border-slate-900/60 bg-slate-950">
                <ul className="space-y-1 p-2 text-xs">
                  {alerts.map((alert) => (
                    <li
                      key={alert.id}
                      className={cn(
                        "rounded px-2 py-1",
                        alert.level === "info" && "bg-slate-900 text-slate-200",
                        alert.level === "warning" && "bg-amber-900/40 text-amber-200",
                        alert.level === "critical" && "bg-rose-900/50 text-rose-200"
                      )}
                    >
                      {alert.label}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
