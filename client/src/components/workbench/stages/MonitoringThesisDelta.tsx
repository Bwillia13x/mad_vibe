import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useWorkflow } from "@/hooks/useWorkflow"

export function MonitoringThesisDelta() {
  const { researchLog } = useWorkflow()
  const recent = useMemo(() => researchLog.slice(0, 6), [researchLog])

  return (
    <div className="space-y-6">
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Thesis Drift Watch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-slate-400">
          <p>
            Monitoring consolidates alerts from scenarios, execution, and risk registers. Close the loop whenever
            you adjust the position, updating the lessons library for the next intake cycle.
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Recent Journal Entries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.length === 0 ? (
            <p className="text-xs text-slate-500">No journal entries yet — complete earlier stages to populate.</p>
          ) : (
            <ul className="space-y-2 text-xs text-slate-400">
              {recent.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded border border-slate-800 bg-slate-950/60 px-3 py-2"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{entry.stageTitle}</span>
                    <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="mt-1 text-slate-200">{entry.action}</p>
                  {entry.details && <p className="text-[11px] text-slate-500">{entry.details}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
