import { useMemo } from 'react'
import { ArrowRight, BarChart3, RefreshCw, Sparkles, Target } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { useWorkflow } from '@/hooks/useWorkflow'
import { useLocation } from 'wouter'
import { resolveStatusTone, Chip } from '@/components/workbench/panels'

const quickPrompts = [
  'Surface the biggest deltas in the research log today',
  'Draft an IC memo outline using the latest valuation inputs',
  'Show me risks flagged by the team in the last 24 hours'
]

export default function Home() {
  const { data: systemHealth } = useQuery<{ status: string }>({ queryKey: ['/api/health'] })
  const { stages, stageStatuses, activeStage, setActiveStage, researchLog } = useWorkflow()
  const [, navigate] = useLocation()

  const stageSummary = useMemo(
    () =>
      stages.map((stage) => ({
        id: stage.id,
        slug: stage.slug,
        title: stage.title,
        shortTitle: stage.shortTitle,
        goal: stage.goal,
        status: stageStatuses[stage.slug]
      })),
    [stages, stageStatuses]
  )

  const recentLog = useMemo(() => researchLog.slice(0, 6), [researchLog])

  const handleNavigateStage = (slug: string) => {
    if (stageStatuses[slug] === 'locked') return
    setActiveStage(slug)
    navigate(`/${slug}`)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-600/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-violet-200">
                <Sparkles className="h-3 w-3" /> Value Venture Lab
              </div>
              <h1 className="text-3xl font-semibold text-slate-50">
                Welcome back, let&apos;s move your thesis forward
              </h1>
              <p className="max-w-2xl text-sm text-slate-400">
                Review pipeline momentum, pick up the next best task, or re-open the workbench right where you left
                off. Omni-Prompt and the research log stay in sync across every stage.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-right text-sm text-slate-300">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">System Status</div>
              <div className="flex items-center justify-end gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
                <span>{systemHealth?.status ?? 'Operational'}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              size="sm"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-[0_0_18px_rgba(99,102,241,0.4)] transition hover:bg-violet-500"
              onClick={() => handleNavigateStage(activeStage.slug)}
            >
              Resume Workbench
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl border-slate-700/60 bg-slate-900/60 text-slate-200 hover:bg-slate-900"
                  onClick={() => handleNavigateStage('memo')}
                >
                  Jump to Memo Composer
                </Button>
              </TooltipTrigger>
              <TooltipContent>Opens at the memo stage with live sync status</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl border-slate-700/60 bg-slate-900/60 text-slate-200 hover:bg-slate-900"
                  onClick={() => handleNavigateStage('scenarios')}
                >
                  Explore Scenario Lab
                </Button>
              </TooltipTrigger>
              <TooltipContent>Direct link into scenario modelling with latest assumptions</TooltipContent>
            </Tooltip>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="col-span-2 border-slate-800 bg-slate-900/60 shadow-[0_0_24px_rgba(15,23,42,0.45)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-200">Stage Pipeline</CardTitle>
                <p className="text-xs text-slate-500">Track downstream readiness and unlocks</p>
              </div>
              <Chip tone="violet">Active: {activeStage.shortTitle}</Chip>
            </CardHeader>
            <CardContent className="space-y-2">
              {stageSummary.map((stage) => {
                const tone = resolveStatusTone(stage.status)
                const isActive = stage.slug === activeStage.slug
                return (
                  <button
                    key={stage.slug}
                    type="button"
                    onClick={() => handleNavigateStage(stage.slug)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-left transition hover:border-violet-500/50 hover:bg-slate-900"
                    aria-label={`Navigate to ${stage.title} stage`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-100">{stage.shortTitle}</span>
                        {isActive && <Badge variant="outline">Current</Badge>}
                      </div>
                      <p className="text-xs text-slate-500">{stage.goal}</p>
                    </div>
                    <Chip tone={tone}>{stage.status}</Chip>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/60 shadow-[0_0_24px_rgba(15,23,42,0.45)]">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-200">Quick Prompts</CardTitle>
              <p className="text-xs text-slate-500">Seed Omni-Prompt with analyst-ready templates</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickPrompts.map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  className="w-full justify-start rounded-xl border-slate-800 bg-slate-950/60 text-left text-sm text-slate-200 hover:bg-slate-900"
                  onClick={() => handleNavigateStage(activeStage.slug)}
                >
                  <Sparkles className="mr-2 h-4 w-4 text-violet-300" />
                  {prompt}
                </Button>
              ))}
              <p className="text-xs text-slate-500">
                Use ⌘K or Ctrl+K to open Omni-Prompt anywhere in the workflow.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="border-slate-800 bg-slate-900/60 shadow-[0_0_24px_rgba(15,23,42,0.45)] lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-200">Research Log Highlights</CardTitle>
                <p className="text-xs text-slate-500">Latest activity across analysts and AI assists</p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-slate-700/60 bg-slate-950/60 text-slate-200 hover:bg-slate-900"
                    onClick={() => handleNavigateStage(activeStage.slug)}
                  >
                    View full log
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Opens the inspector activity view inside the workbench</TooltipContent>
              </Tooltip>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentLog.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-800/80 px-4 py-6 text-center text-sm text-slate-500">
                  No research events captured yet. The log updates as you collaborate and complete gates.
                </div>
              )}
              {recentLog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-3"
                >
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{entry.stageTitle}</div>
                    <div className="text-sm text-slate-100">{entry.action}</div>
                    {entry.details && <div className="text-xs text-slate-500">{entry.details}</div>}
                  </div>
                  <span className="text-xs text-slate-500">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/60 shadow-[0_0_24px_rgba(15,23,42,0.45)]">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-200">Next Best Actions</CardTitle>
              <p className="text-xs text-slate-500">AI suggestions based on current stage position</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-200">
              <div className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-950/60 px-3 py-2">
                <Target className="mt-0.5 h-4 w-4 text-violet-300" />
                <div>
                  <div className="font-medium">Review stage gate checklist</div>
                  <p className="text-xs text-slate-500">
                    Ensure the current stage requirements are checked off before advancing to keep downstream tabs unlocked.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-950/60 px-3 py-2">
                <BarChart3 className="mt-0.5 h-4 w-4 text-violet-300" />
                <div>
                  <div className="font-medium">Sync valuation scenarios</div>
                  <p className="text-xs text-slate-500">
                    Re-open Scenario Lab to adjust bull, base, and bear assumptions ahead of memo drafting.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-950/60 px-3 py-2">
                <RefreshCw className="mt-0.5 h-4 w-4 text-violet-300" />
                <div>
                  <div className="font-medium">Log a progress note</div>
                  <p className="text-xs text-slate-500">
                    Capture a short update in the research log so collaborators see the latest context when they join.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
