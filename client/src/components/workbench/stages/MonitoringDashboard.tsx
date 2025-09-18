import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useMonitoring } from "@/hooks/useMonitoring"
import { useScenarioLab } from "@/hooks/useScenarioLab"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const statusBadge: Record<'on-track' | 'warning' | 'breach', string> = {
  'on-track': 'bg-emerald-900/40 text-emerald-200 border-emerald-800',
  warning: 'bg-amber-900/40 text-amber-200 border-amber-800',
  breach: 'bg-rose-900/40 text-rose-200 border-rose-800'
}

const alertBadge: Record<'info' | 'warning' | 'critical', string> = {
  info: 'border-slate-700 text-slate-300',
  warning: 'border-amber-600 text-amber-200',
  critical: 'border-rose-600 text-rose-200'
}

export function MonitoringDashboard() {
  const { deltas, alerts, lessons, acknowledgeAlert } = useMonitoring()
  const { simulation, state } = useScenarioLab()

  return (
    <div className="space-y-6">
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Scenario Risk Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4 text-xs text-slate-400">
          <div>
            <p className="text-[11px] uppercase text-slate-500">Iterations</p>
            <p className="text-lg font-semibold text-slate-100">{state.iterations}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-500">Mean value/share</p>
            <p className="text-lg font-semibold text-slate-100">${simulation.meanValue}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-500">P10 / P90</p>
            <p className="text-lg font-semibold text-slate-100">
              ${simulation.p10} – ${simulation.p90}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-500">Downside probability</p>
            <p className="text-lg font-semibold text-slate-100">{simulation.downsideProbability}%</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Thesis Health</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 text-xs text-slate-400">
          {deltas.map((delta) => (
            <div key={delta.id} className="rounded border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-100">{delta.metric}</h3>
                <Badge variant="outline" className={cn('border px-2 py-1 text-[10px] uppercase', statusBadge[delta.status])}>
                  {delta.status === 'on-track' ? 'On Track' : delta.status === 'warning' ? 'Warning' : 'Breach'}
                </Badge>
              </div>
              <p className="mt-2 text-slate-300">{delta.description}</p>
              <div className="mt-3 flex items-center justify-between text-[11px] uppercase text-slate-500">
                <span>Last update: {delta.lastUpdate}</span>
                <span>Variance: {delta.variance > 0 ? '+' : ''}{delta.variance}%</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-sm text-slate-200">Open Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-400">
            <p>
              Acknowledge alerts once action plans are in motion. Critical breaches should trigger Execution stop
              or scale-in rules.
            </p>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-start justify-between gap-4 rounded border px-4 py-3 transition',
                    alertBadge[alert.severity],
                    alert.acknowledged && 'opacity-60'
                  )}
                >
                  <div>
                    <p className="font-semibold text-slate-200">{alert.title}</p>
                    <p className="text-slate-400">{alert.trigger}</p>
                    {alert.owner && <p className="text-[11px] text-slate-500">Owner: {alert.owner}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => acknowledgeAlert(alert.id)}
                    className={cn(
                      'rounded border px-3 py-1 text-[11px] uppercase transition',
                      alert.acknowledged
                        ? 'border-emerald-500 text-emerald-200'
                        : 'border-slate-600 text-slate-300 hover:bg-slate-900'
                    )}
                  >
                    {alert.acknowledged ? 'Acknowledged' : 'Acknowledge'}
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-sm text-slate-200">Lessons Library</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-400">
            {lessons.map((lesson) => (
              <div key={lesson.id} className="rounded border border-slate-800 bg-slate-950/60 px-3 py-2">
                <p className="font-medium text-slate-200">{lesson.title}</p>
                <p>{lesson.insight}</p>
                <p className="text-[11px] uppercase text-slate-500">Recorded {lesson.recordedAt}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
