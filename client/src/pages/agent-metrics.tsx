import { useEffect, useMemo, useState } from 'react'
import { GlassCard } from '@/components/layout/GlassCard'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'

interface AgentPerformanceMetrics {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  successRate: number
  averageDurationMs: number
  p50DurationMs: number
  p95DurationMs: number
  p99DurationMs: number
  stepSuccessRates: Record<string, { success: number; total: number; rate: number }>
  slowestSteps: Array<{ action: string; avgDurationMs: number }>
  errorsByType: Record<string, number>
  mostFailedSteps: Array<{ action: string; failureCount: number }>
  tasksLast24h: number
  tasksLast7d: number
  tasksLast30d: number
}

export default function AgentMetricsPage() {
  const { currentWorkspace, isLoading: isWorkspaceLoading } = useWorkspaceContext()
  const [metrics, setMetrics] = useState<AgentPerformanceMetrics | null>(null)
  const [periodHours, setPeriodHours] = useState(720)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!currentWorkspace?.id) return
      setIsLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        params.set('workspaceId', String(currentWorkspace.id))
        params.set('periodHours', String(periodHours))
        const res = await fetch(`/api/agent-results/metrics?${params.toString()}`)
        if (!res.ok) throw new Error(`Failed to load metrics (${res.status})`)
        const data = (await res.json()) as { metrics: AgentPerformanceMetrics }
        if (!cancelled) setMetrics(data.metrics)
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load metrics'
          setError(message)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [currentWorkspace?.id, periodHours])

  const kpis = useMemo(() => {
    if (!metrics) return [] as Array<{ label: string; value: string; helper?: string }>
    return [
      {
        label: 'Total Tasks',
        value: metrics.totalTasks.toLocaleString()
      },
      {
        label: 'Success Rate',
        value: `${metrics.successRate.toFixed(1)}%`,
        helper: `${metrics.completedTasks.toLocaleString()} completed / ${metrics.failedTasks.toLocaleString()} failed`
      },
      {
        label: 'Avg Duration',
        value: `${(metrics.averageDurationMs / 1000).toFixed(1)}s`,
        helper: `p50 ${(metrics.p50DurationMs / 1000).toFixed(1)}s • p95 ${(metrics.p95DurationMs / 1000).toFixed(1)}s`
      },
      {
        label: 'Tasks (24h)',
        value: metrics.tasksLast24h.toLocaleString()
      },
      {
        label: 'Tasks (7d)',
        value: metrics.tasksLast7d.toLocaleString()
      },
      {
        label: 'Tasks (30d)',
        value: metrics.tasksLast30d.toLocaleString()
      }
    ]
  }, [metrics])

  if (isWorkspaceLoading) {
    return (
      <div className="p-6">
        <GlassCard title="Agent Metrics" subtitle="Loading workspace...">
          <div className="h-32 flex items-center justify-center text-sm text-slate-400">
            Loading…
          </div>
        </GlassCard>
      </div>
    )
  }

  if (!currentWorkspace) {
    return (
      <div className="p-6">
        <GlassCard title="Agent Metrics" subtitle="Select or create a workspace">
          <div className="h-32 flex items-center justify-center text-sm text-slate-400">
            Choose a workspace to view metrics.
          </div>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-slate-100">Agent Metrics</h1>
        <p className="text-sm text-slate-400">Workspace: {currentWorkspace.name}</p>
      </header>

      {error && (
        <GlassCard title="Issue" subtitle="We had trouble loading metrics">
          <p className="text-sm text-amber-300">{error}</p>
        </GlassCard>
      )}

      <GlassCard
        title="Overview"
        subtitle={`Aggregated over last ${(periodHours / 24).toFixed(0)} days`}
        right={
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <label htmlFor="period" className="sr-only">
              Period (hours)
            </label>
            <select
              id="period"
              value={periodHours}
              onChange={(e) => setPeriodHours(parseInt(e.target.value))}
              className="rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1"
            >
              <option value={168}>7 days</option>
              <option value={720}>30 days</option>
              <option value={2160}>90 days</option>
            </select>
          </div>
        }
      >
        {isLoading && !metrics ? (
          <div className="h-24 flex items-center justify-center text-sm text-slate-500">Loading…</div>
        ) : !metrics ? (
          <div className="h-24 flex items-center justify-center text-sm text-slate-500">
            No data for selected period.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{kpi.label}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-100">{kpi.value}</p>
                  {kpi.helper && <p className="text-xs text-slate-500 mt-1">{kpi.helper}</p>}
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section>
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Slowest steps</p>
                {metrics.slowestSteps.length === 0 ? (
                  <p className="text-xs text-slate-500">No step timings yet.</p>
                ) : (
                  <ul className="space-y-1 text-xs text-slate-400">
                    {metrics.slowestSteps.map((s) => (
                      <li key={s.action} className="flex items-center justify-between">
                        <span className="text-slate-300">{s.action}</span>
                        <span>{(s.avgDurationMs / 1000).toFixed(1)}s</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Most failed steps</p>
                {metrics.mostFailedSteps.length === 0 ? (
                  <p className="text-xs text-slate-500">No failures recorded.</p>
                ) : (
                  <ul className="space-y-1 text-xs text-slate-400">
                    {metrics.mostFailedSteps.map((s) => (
                      <li key={s.action} className="flex items-center justify-between">
                        <span className="text-slate-300">{s.action}</span>
                        <span>{s.failureCount.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section>
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Step success rates</p>
              {Object.keys(metrics.stepSuccessRates).length === 0 ? (
                <p className="text-xs text-slate-500">No steps recorded.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(metrics.stepSuccessRates)
                    .sort((a, b) => b[1].rate - a[1].rate)
                    .slice(0, 9)
                    .map(([action, s]) => (
                      <div key={action} className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                        <p className="text-sm text-slate-200">{action}</p>
                        <p className="text-xs text-slate-500">{s.success}/{s.total} • {s.rate.toFixed(1)}%</p>
                      </div>
                    ))}
                </div>
              )}
            </section>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
