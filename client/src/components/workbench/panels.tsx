import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Check, ChevronRight, History, Lock, PanelLeft, PanelRight, Search, Users, Zap } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { WorkbenchTab, PromptHistoryEntry, ChecklistTask } from './WorkbenchLayout'
import type { StageGateChecklistItem, WorkflowStage } from '@/lib/workflow'
import type { ResearchLogEntry } from '@shared/types'

export type StageStatus = 'locked' | 'in-progress' | 'complete'

type ConsoleTask = ChecklistTask & { onToggle: () => void }

const cardClasses = 'rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-[0_0_20px_rgba(15,23,42,0.45)]'
const labelClasses = 'text-[11px] uppercase tracking-[0.14em] text-slate-500'

export interface TopBarProps {
  stageTitle: string
  stageGoal: string
  stageIndex: number
  totalStages: number
  presenceLabel: string
  onSubmitPrompt: (value: string) => void
  onOpenPrompt?: () => void
  onNext: () => void
  disableNext: boolean
  onOpenExplorer: () => void
  onOpenInspector: () => void
}

export function TopBar({
  stageTitle,
  stageGoal,
  stageIndex,
  totalStages,
  presenceLabel,
  onSubmitPrompt,
  onOpenPrompt,
  onNext,
  disableNext,
  onOpenExplorer,
  onOpenInspector
}: TopBarProps) {
  const [value, setValue] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!value.trim()) return
    onSubmitPrompt(value)
    setValue('')
  }

  return (
    <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-800 bg-slate-950/75 px-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={onOpenExplorer}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-slate-50"
            aria-label="Open navigator"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onOpenInspector}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-slate-50"
            aria-label="Open inspector"
          >
            <PanelRight className="h-4 w-4" />
          </button>
        </div>
        <div className="hidden flex-col leading-tight text-slate-300 sm:flex">
          <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Stage {stageIndex} / {totalStages}
          </span>
          <span className="text-sm font-semibold text-slate-100">{stageTitle}</span>
          <span className="text-xs text-slate-500">{stageGoal}</span>
        </div>
      </div>

      <form className="flex flex-1 items-center gap-3" onSubmit={handleSubmit}>
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 shadow-[0_0_14px_rgba(15,23,42,0.45)]">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
            placeholder="Ask anything… e.g., summarize the latest filings with sources"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <Chip tone="violet">Omni-Prompt</Chip>
        </div>
        {onOpenPrompt && (
          <button
            type="button"
            onClick={onOpenPrompt}
            className="hidden items-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-900 md:inline-flex"
          >
            Open Console
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={disableNext}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-slate-800/60"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </form>

      <div className="hidden min-w-[180px] flex-col text-xs text-slate-400 lg:flex">
        <span className="flex items-center gap-1 text-slate-500">
          <Users className="h-3.5 w-3.5" /> Presence
        </span>
        <span className="truncate text-slate-200">{presenceLabel}</span>
      </div>
    </div>
  )
}

export interface ExplorerProps {
  stages: WorkflowStage[]
  activeStage: string
  stageStatuses: Record<string, StageStatus>
  onSelectStage: (slug: string) => void
  variant?: 'sidebar' | 'drawer'
  onAfterSelect?: () => void
  supplementalSections: Array<{ section: string; items: string[] }>
}

export function Explorer({
  stages,
  activeStage,
  stageStatuses,
  onSelectStage,
  variant = 'sidebar',
  onAfterSelect,
  supplementalSections
}: ExplorerProps) {
  const content = (
    <ScrollArea className={variant === 'sidebar' ? 'h-full w-full' : 'h-[calc(100vh-12rem)]'}>
      <div className="space-y-6 p-4">
        <section>
          <div className={labelClasses}>Pipeline</div>
          <div className="mt-3 space-y-1.5">
            {stages.map((stage) => {
              const status = stageStatuses[stage.slug]
              const isActive = stage.slug === activeStage
              const isComplete = status === 'complete'
              const isLocked = status === 'locked'
              return (
                <button
                  key={stage.slug}
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    if (isLocked) return
                    onSelectStage(stage.slug)
                    onAfterSelect?.()
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition',
                    isLocked && 'cursor-not-allowed text-slate-600',
                    isActive && 'bg-slate-900/80 text-slate-50 shadow-[0_0_18px_rgba(99,102,241,0.35)]',
                    !isActive && !isLocked && 'text-slate-300 hover:bg-slate-900/60'
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 h-2 w-2 rounded-full',
                      isComplete ? 'bg-emerald-400' : isActive ? 'bg-violet-400' : 'bg-slate-600'
                    )}
                  />
                  <div className="flex flex-1 flex-col">
                    <span className="font-medium leading-tight text-slate-100">{stage.shortTitle}</span>
                    <span className="text-xs text-slate-500">{stage.goal}</span>
                  </div>
                  {isComplete && <Check className="h-4 w-4 text-emerald-400" />}
                  {isLocked && <Lock className="h-4 w-4 text-slate-600" />}
                </button>
              )
            })}
          </div>
        </section>

        {supplementalSections.map((section) => (
          <section key={section.section}>
            <div className={labelClasses}>{section.section}</div>
            <div className="mt-3 space-y-1">
              {section.items.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-slate-300 transition hover:bg-slate-900/60"
                >
                  <span className="text-slate-500">◆</span>
                  <span className="flex-1 truncate">{item}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </ScrollArea>
  )

  if (variant === 'drawer') {
    return <div className="pb-6">{content}</div>
  }

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-900 bg-slate-950/70 lg:flex">
      {content}
    </aside>
  )
}

export interface WorkbenchProps {
  tabs: WorkbenchTab[]
  activeTab: string
  onTabChange: (id: string) => void
  stageTitle: string
  stageGoal: string
}

export function Workbench({ tabs, activeTab, onTabChange, stageTitle, stageGoal }: WorkbenchProps) {
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0]

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-slate-950/50">
      <header className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
        <div className="leading-tight">
          <div className={labelClasses}>Workbench</div>
          <div className="text-sm font-semibold text-slate-100">{stageTitle}</div>
          <div className="text-xs text-slate-500">{stageGoal}</div>
        </div>
      </header>
      <div className="flex h-11 items-center gap-1 overflow-x-auto border-b border-slate-800 px-3 text-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'rounded-t-lg px-3 py-1.5 shadow-[inset_0_-1px_0_rgba(148,163,184,0.12)]',
              tab.id === active?.id
                ? 'bg-slate-900/80 text-slate-100'
                : 'text-slate-400 hover:bg-slate-900/60'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {active ? (
          <ScrollArea className="h-full">
            <div className="space-y-6 bg-slate-950/40 p-6 text-sm text-slate-100">
              {active.content}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex h-full items-center justify-center text-slate-500">
            No workbench tabs available for this stage.
          </div>
        )}
      </div>
    </section>
  )
}

export interface InspectorProps {
  statusLabel: string
  checklist: StageGateChecklistItem[]
  checklistState: Record<string, boolean>
  onToggle: (itemId: string) => void
  stageLog: ResearchLogEntry[]
  lastPrompt: string
  presenceLabel: string
  inspectorExtras?: ReactNode
  aiModes: string[]
  variant?: 'sidebar' | 'drawer'
  onPromptShortcut?: (prompt: string) => void
}

export function Inspector({
  statusLabel,
  checklist,
  checklistState,
  onToggle,
  stageLog,
  lastPrompt,
  presenceLabel,
  inspectorExtras,
  aiModes,
  variant = 'sidebar',
  onPromptShortcut
}: InspectorProps) {
  const content = (
    <ScrollArea className={variant === 'sidebar' ? 'h-full w-full' : 'h-[calc(100vh-12rem)]'}>
      <div className="space-y-6 p-4">
        <section className="space-y-3">
          <div className={labelClasses}>Stage Overview</div>
          <div className={cn(cardClasses, 'space-y-3')}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-100">{statusLabel}</div>
                <div className="text-xs text-slate-400">{presenceLabel}</div>
              </div>
              <Chip tone={resolveStatusTone(statusLabel)}>{statusLabel}</Chip>
            </div>
            {aiModes.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-slate-400">AI Modes Enabled</div>
                <div className="flex flex-wrap gap-2">
                  {aiModes.map((mode) => (
                    <Chip key={mode} tone="slate">
                      {mode}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div className={labelClasses}>AI Pair Analyst</div>
          <div className={cn(cardClasses, 'space-y-3')}>
            <div className="text-xs text-slate-400">Last prompt</div>
            <div className="min-h-[48px] rounded-xl bg-slate-950/60 px-3 py-2 text-sm text-slate-200">
              {lastPrompt || 'No prompt submitted yet.'}
            </div>
            <div className="text-xs text-slate-400">Suggested quick actions</div>
            <div className="grid gap-2 text-sm text-slate-200">
              {[
                'Summarize the latest filing with citations.',
                'Highlight three contrarian risks vs. consensus.',
                'Regenerate memo outline with valuation hooks.'
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onPromptShortcut?.(prompt)}
                  className="w-full rounded-xl border border-violet-500/30 bg-violet-600/10 px-3 py-2 text-left text-xs transition hover:bg-violet-600/20"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className={labelClasses}>Gating Checklist</div>
          <div className={cn(cardClasses, 'space-y-3 text-sm text-slate-200')}>
            {checklist.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-700/80 px-3 py-4 text-xs text-slate-500">
                No gating checklist for this stage.
              </div>
            )}
            {checklist.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-950/50 px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={checklistState[item.id] ?? false}
                  onChange={() => onToggle(item.id)}
                  className="mt-1 h-4 w-4 accent-violet-500"
                />
                <div className="space-y-1">
                  <div className="text-sm text-slate-100">{item.label}</div>
                  {item.helper && <div className="text-xs text-slate-500">{item.helper}</div>}
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className={labelClasses}>Activity Log</div>
          <div className={cn(cardClasses, 'space-y-2 text-sm text-slate-200')}>
            {stageLog.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-700/80 px-3 py-4 text-xs text-slate-500">
                Interaction log for this stage will appear here.
              </div>
            )}
            {stageLog.map((item) => (
              <div key={item.id} className="flex items-start gap-3 rounded-xl bg-slate-950/50 px-3 py-2">
                <History className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-slate-500">
                    {formatTimestamp(item.timestamp)}
                  </div>
                  <div className="text-sm text-slate-100">{item.action}</div>
                  {item.details && <div className="text-xs text-slate-500">{item.details}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {inspectorExtras && <section>{inspectorExtras}</section>}
      </div>
    </ScrollArea>
  )

  if (variant === 'drawer') {
    return <div className="pb-6">{content}</div>
  }

  return (
    <aside className="hidden w-80 shrink-0 border-l border-slate-900 bg-slate-950/70 lg:flex">
      {content}
    </aside>
  )
}

export interface ConsoleProps {
  history: PromptHistoryEntry[]
  tasks: ConsoleTask[]
}

export function Console({ history, tasks }: ConsoleProps) {
  return (
    <div className="flex h-36 gap-3 border-t border-slate-800 bg-slate-950/80 px-3 py-2 backdrop-blur">
      <div className="flex flex-1 flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-3 shadow-[0_0_18px_rgba(15,23,42,0.45)]">
        <div className={labelClasses}>Prompt History</div>
        <div className="mt-2 flex-1 space-y-2 overflow-y-auto text-sm">
          {history.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-700/80 px-3 py-4 text-xs text-slate-500">
              Submit prompts to populate the console.
            </div>
          )}
          {history.map((entry) => (
            <div key={entry.id} className="flex items-start gap-2 rounded-xl bg-slate-950/50 px-3 py-2">
              <Zap className="mt-0.5 h-4 w-4 text-violet-300" />
              <div className="flex-1">
                <div className="text-slate-100">{entry.question}</div>
                <div className="text-xs text-slate-500">
                  Mock response • {entry.stageTitle} • {entry.timestamp}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex w-72 flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-3 shadow-[0_0_18px_rgba(15,23,42,0.45)]">
        <div className={labelClasses}>Tasks</div>
        <div className="mt-2 flex-1 space-y-2 overflow-y-auto text-sm">
          {tasks.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-700/80 px-3 py-4 text-xs text-slate-500">
              No gating tasks for this stage.
            </div>
          )}
          {tasks.map((task) => (
            <label
              key={task.id}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-xl bg-slate-950/50 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={task.onToggle}
                  className="h-4 w-4 accent-violet-500"
                />
                <div className="flex flex-col">
                  <span
                    className={cn(
                      'text-sm',
                      task.completed ? 'text-slate-500 line-through decoration-slate-600' : 'text-slate-100'
                    )}
                  >
                    {task.label}
                  </span>
                  {task.helper && <span className="text-xs text-slate-500">{task.helper}</span>}
                </div>
              </div>
              <span className="text-xs text-slate-500">{task.completed ? 'Done' : 'Pending'}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

export type MemoSyncState = {
  error: string | null
  isSyncing: boolean
  hydrated: boolean
  lastSavedAt: string | null
}

export function MemoSyncStatusCard({ status }: { status: MemoSyncState }) {
  const stateLabel = status.error
    ? 'Retry required'
    : status.isSyncing
      ? 'Syncing…'
      : status.hydrated
        ? 'Up to date'
        : 'Hydrating…'
  const detail = status.error
    ? status.error
    : status.isSyncing
      ? 'Saving the latest memo edits to the server.'
      : status.lastSavedAt
        ? `Last saved ${formatTimestamp(status.lastSavedAt)}`
        : status.hydrated
          ? 'Awaiting your first memo edits.'
          : 'Loading memo composer state.'

  return (
    <section className={cn(cardClasses, 'space-y-2 text-sm text-slate-200')}>
      <div className="flex items-center justify-between">
        <div className={labelClasses}>Memo Sync</div>
        <Chip tone={resolveStatusTone(status.error ? 'Locked' : status.isSyncing ? 'In Progress' : 'Complete')}>
          {stateLabel}
        </Chip>
      </div>
      <p className="text-xs leading-relaxed text-slate-400">{detail}</p>
    </section>
  )
}

export function formatTimestamp(value: string | null) {
  if (!value) return 'Just now'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Just now'
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function resolveStatusTone(label: string): 'slate' | 'violet' | 'emerald' | 'amber' {
  if (label.toLowerCase().includes('lock')) return 'amber'
  if (label.toLowerCase().includes('progress')) return 'violet'
  if (label.toLowerCase().includes('complete') || label.toLowerCase().includes('sync')) return 'emerald'
  return 'slate'
}

export function Chip({
  children,
  tone = 'slate'
}: {
  children: ReactNode
  tone?: 'slate' | 'violet' | 'emerald' | 'amber'
}) {
  const toneStyles: Record<'slate' | 'violet' | 'emerald' | 'amber', string> = {
    slate: 'bg-slate-800/60 text-slate-200 ring-1 ring-slate-700/70 shadow-[0_0_12px_rgba(15,23,42,0.35)]',
    violet: 'bg-violet-700/30 text-violet-200 ring-1 ring-violet-600/50 shadow-[0_0_12px_rgba(99,102,241,0.35)]',
    emerald: 'bg-emerald-700/30 text-emerald-200 ring-1 ring-emerald-600/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
    amber: 'bg-amber-700/30 text-amber-200 ring-1 ring-amber-600/50 shadow-[0_0_12px_rgba(251,191,36,0.2)]'
  }

  return (
    <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide', toneStyles[tone])}>
      {children}
    </span>
  )
}
