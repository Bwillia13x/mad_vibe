import { useMemo } from 'react'
import { GlassCard } from '@/components/layout/GlassCard'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
import { computeWorkspaceMetrics } from '@/lib/workspace-utils'
import type { WorkspaceMetric } from '@/lib/workspace-utils'

function MetricTile({ label, value, helper, trend }: WorkspaceMetric) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-100">{value}</p>
      {trend && <p className="text-xs text-emerald-400 mt-1">{trend}</p>}
      {helper && <p className="text-xs text-slate-500 mt-1">{helper}</p>}
    </div>
  )
}

export default function WorkspaceOverviewPage() {
  const { currentWorkspace, isLoading } = useWorkspaceContext()

  const metrics = useMemo<WorkspaceMetric[]>(
    () => computeWorkspaceMetrics(currentWorkspace),
    [currentWorkspace]
  )

  if (isLoading) {
    return (
      <div className="p-6">
        <GlassCard title="Workspace" subtitle="Loading overview...">
          <div className="h-32 flex items-center justify-center text-sm text-slate-400">
            Loading workspace…
          </div>
        </GlassCard>
      </div>
    )
  }

  if (!currentWorkspace) {
    return (
      <div className="p-6">
        <GlassCard title="Workspace" subtitle="Select or create a workspace">
          <div className="h-32 flex items-center justify-center text-sm text-slate-400">
            Choose a workspace in the switcher to see the overview.
          </div>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-slate-100">{currentWorkspace.name}</h1>
        <p className="text-sm text-slate-400">
          {currentWorkspace.ticker
            ? `${currentWorkspace.companyName || ''} (${currentWorkspace.ticker})`
            : currentWorkspace.companyName || 'Workspace overview'}
        </p>
      </header>

      <GlassCard id="workspace-overview" title="Snapshot" subtitle="Key metrics and status">
        {metrics.length === 0 ? (
          <div className="h-24 flex items-center justify-center text-sm text-slate-500">
            No metrics available.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((m) => (
              <MetricTile key={m.label} {...m} />
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  )
}
