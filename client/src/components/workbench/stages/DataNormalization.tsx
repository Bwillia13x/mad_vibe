import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { dataSources, adjustments, useDataNormalization } from "@/hooks/useDataNormalization"
import { getSourceStatusBadge } from "@/lib/workflow-data"
import { cn } from "@/lib/utils"

const statusToneClasses: Record<'ready' | 'review' | 'blocked', string> = {
  ready: 'bg-emerald-900/40 text-emerald-200 border-emerald-800',
  review: 'bg-amber-900/40 text-amber-200 border-amber-800',
  blocked: 'bg-rose-900/40 text-rose-200 border-rose-800'
}

export function DataNormalization() {
  const { state, toggleSource, toggleAdjustment, coverage } = useDataNormalization()

  return (
    <div className="space-y-6">
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Normalization Progress</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4 text-xs text-slate-400">
          <div>
            <p className="text-[11px] uppercase text-slate-500">Sources reconciled</p>
            <p className="text-lg font-semibold text-slate-100">
              {coverage.reconciledCount}/{coverage.totalSources}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-500">Average coverage</p>
            <p className="text-lg font-semibold text-slate-100">{coverage.avgCoverage}%</p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-500">Footnote coverage</p>
            <p className="text-lg font-semibold text-slate-100">{coverage.avgFootnoteCoverage}%</p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-500">Outstanding line items</p>
            <p className="text-lg font-semibold text-slate-100">{coverage.totalUnmatched}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Source Mapping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-400">
            Toggle a source to mark reconciliation complete. Coverage and unmatched line items update live so you
            can spot where to dig deeper before advancing to financial modeling.
          </p>
          <div className="rounded-lg border border-slate-800 overflow-hidden">
            <div className="grid grid-cols-6 bg-slate-950/60 px-4 py-2 text-[11px] uppercase tracking-wide text-slate-500">
              <span>Name</span>
              <span>Type</span>
              <span>As of</span>
              <span>Coverage</span>
              <span>Footnotes</span>
              <span>Status</span>
            </div>
            <div className="divide-y divide-slate-800">
              {dataSources.map((source) => {
                const status = getSourceStatusBadge(source.status)
                const reconciled = state.reconciledSources[source.id]
                return (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() => toggleSource(source.id)}
                    className={cn(
                      'grid grid-cols-6 items-center px-4 py-3 text-left text-xs transition',
                      reconciled ? 'bg-slate-900/70 hover:bg-slate-900' : 'hover:bg-slate-900/40'
                    )}
                  >
                    <span className="font-medium text-slate-200">{source.name}</span>
                    <span className="text-slate-400">{source.type}</span>
                    <span className="text-slate-400">{source.asOf}</span>
                    <span className="text-slate-200">{source.coverage}%</span>
                    <span className="text-slate-200">{source.footnoteCoverage}%</span>
                    <span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'border px-2 py-1 text-[10px] uppercase',
                          statusToneClasses[status.tone]
                        )}
                      >
                        {reconciled ? 'Reconciled' : status.label}
                      </Badge>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Adjustments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-400">
            Apply or remove normalization presets to see how they flow into owner earnings. The workflow checklist
            will demand notes on any adjustment that stays unchecked.
          </p>
          <div className="space-y-2">
            {adjustments.map((adj) => {
              const applied = state.appliedAdjustments[adj.id]
              return (
                <div
                  key={adj.id}
                  className={cn(
                    'flex items-start justify-between rounded-lg border px-4 py-3 transition',
                    applied
                      ? 'border-emerald-800 bg-emerald-900/20'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                  )}
                >
                  <div>
                    <p className="font-medium text-slate-200">{adj.label}</p>
                    <p className="text-xs text-slate-400">{adj.description}</p>
                    <p className="mt-1 text-[11px] uppercase text-slate-500">Impact: {adj.impact}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleAdjustment(adj.id)}
                    className={cn(
                      'rounded border px-3 py-1 text-[11px] uppercase transition',
                      applied
                        ? 'border-emerald-500 text-emerald-200 hover:bg-emerald-900/40'
                        : 'border-slate-600 text-slate-300 hover:bg-slate-900'
                    )}
                  >
                    {applied ? 'Applied' : 'Apply'}
                  </button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
