import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useOwnerEarnings } from "@/hooks/useOwnerEarnings"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function FinancialsOwnerEarnings() {
  const { bridge, historical, state, toggleSegment, currentOwnerEarnings } = useOwnerEarnings()

  return (
    <div className="space-y-6">
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Owner Earnings Bridge</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-400">
            Toggle adjustments to see how owner earnings shift. Applied segments stay highlighted; skipped segments
            are treated as pending follow-ups before valuation can advance.
          </p>
          <div className="divide-y divide-slate-800 rounded-lg border border-slate-800">
            {bridge.map((segment) => {
              const included = state.includeBridgeSegments[segment.id]
              return (
                <div
                  key={segment.id}
                  className={cn(
                    'flex items-start justify-between gap-4 px-4 py-3 text-xs transition',
                    included ? 'bg-slate-900/60' : 'bg-slate-950/40'
                  )}
                >
                  <div>
                    <p className="font-medium text-slate-200">{segment.label}</p>
                    <p className="text-slate-400">{segment.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn('text-sm font-semibold', segment.direction === 'add' ? 'text-emerald-300' : 'text-rose-300')}>
                      {segment.amount >= 0 ? '+' : ''}
                      {segment.amount}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleSegment(segment.id)}
                      className={cn(
                        'rounded border px-3 py-1 text-[11px] uppercase transition',
                        included
                          ? 'border-emerald-500 text-emerald-200 hover:bg-emerald-900/40'
                          : 'border-slate-600 text-slate-300 hover:bg-slate-900'
                      )}
                    >
                      {included ? 'Included' : 'Skip'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3">
            <span className="text-xs uppercase text-slate-500">Owner earnings (ttm)</span>
            <span className="text-lg font-semibold text-slate-100">{currentOwnerEarnings}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Historical Trend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-400">
            Review the multi-year trajectory to ensure owner earnings trends align with the qualitative narrative.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-xs">
              <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Year</th>
                  <th className="px-3 py-2 text-right">Revenue</th>
                  <th className="px-3 py-2 text-right">EBIT</th>
                  <th className="px-3 py-2 text-right">Depreciation</th>
                  <th className="px-3 py-2 text-right">Capex</th>
                  <th className="px-3 py-2 text-right">Working Capital</th>
                  <th className="px-3 py-2 text-right">Owner Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {historical.map((row) => (
                  <tr key={row.year}>
                    <td className="px-3 py-2 text-slate-200">{row.year}</td>
                    <td className="px-3 py-2 text-right">{row.revenue}</td>
                    <td className="px-3 py-2 text-right">{row.ebit}</td>
                    <td className="px-3 py-2 text-right">{row.depreciation}</td>
                    <td className="px-3 py-2 text-right">{row.capex}</td>
                    <td className="px-3 py-2 text-right">{row.workingCapital}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-100">{row.ownerEarnings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Badge variant="outline" className="border-slate-700 text-[10px] uppercase text-slate-300">
            Use this to sanity check valuation inputs
          </Badge>
        </CardContent>
      </Card>
    </div>
  )
}
