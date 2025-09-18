import { useMemo } from "react"
import { useWorkflow } from "@/hooks/useWorkflow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

export function HomeDailyBrief() {
  const { stages, stageStatuses, activeStage, researchLog } = useWorkflow()

  const nextStage = useMemo(() => {
    return stages.find((stage) => stage.id === activeStage.id + 1)
  }, [activeStage.id, stages])

  const recentEntries = useMemo(() => researchLog.slice(0, 5), [researchLog])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm text-slate-200">Current Stage</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400">
            <div className="text-lg font-semibold text-slate-50">{activeStage.title}</div>
            <p className="mt-1">{activeStage.goal}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm text-slate-200">Next Up</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400">
            {nextStage ? (
              <div>
                <div className="text-lg font-semibold text-slate-50">{nextStage.title}</div>
                <p className="mt-1">Unlock once gates are cleared.</p>
                <Badge
                  variant="outline"
                  className="mt-3 border-slate-700 text-[10px] uppercase text-slate-300"
                >
                  {stageStatuses[nextStage.slug] === "locked" ? "Locked" : "Available"}
                </Badge>
              </div>
            ) : (
              <p>Monitoring loop is the last step in the workflow.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm text-slate-200">Pipeline View</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-slate-400">
            {stages.map((stage) => (
              <div key={stage.slug} className="flex items-center justify-between">
                <span>{stage.shortTitle}</span>
                <Badge
                  variant="outline"
                  className="border-slate-700 text-[10px] uppercase text-slate-300"
                >
                  {stageStatuses[stage.slug]}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Recent Research Log Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <p className="text-xs text-slate-500">No journal entries yet — advance a stage to populate.</p>
          ) : (
            <ul className="space-y-2 text-xs text-slate-400">
              {recentEntries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start gap-3 rounded border border-slate-800 bg-slate-950/60 px-3 py-2"
                >
                  <span className="mt-[2px] text-[10px] font-semibold uppercase text-slate-500">
                    {formatTime(entry.timestamp)}
                  </span>
                  <div>
                    <p className="font-medium text-slate-200">{entry.stageTitle}</p>
                    <p>{entry.action}</p>
                    {entry.details && (
                      <span className="text-[11px] text-slate-500">{entry.details}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
