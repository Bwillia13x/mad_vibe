import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useWorkflow } from "@/hooks/useWorkflow"
import { Badge } from "@/components/ui/badge"

const riskColumns = [
  {
    title: "Top Risks",
    bullets: [
      "Score likelihood × impact for each risk",
      "Attach mitigation owners and review cadence",
      "Flag tail events that require escalation"
    ]
  },
  {
    title: "Catalysts",
    bullets: [
      "Map expected data points with precise dates",
      "Define alert thresholds and playbooks",
      "Sync with execution monitoring tasks"
    ]
  },
  {
    title: "Alerting",
    bullets: [
      "Push high-severity items to Monitoring",
      "Ensure stop triggers match scenario outputs",
      "Capture follow-ups in the lessons library"
    ]
  }
]

export function RiskCatalystPlanner() {
  const { getChecklist, checklistState, activeStage } = useWorkflow()
  const checklist = useMemo(() => getChecklist(activeStage.slug), [activeStage.slug, getChecklist])
  const stageState = checklistState[activeStage.slug] ?? {}
  const outstanding = checklist.filter((item) => !stageState[item.id])

  return (
    <div className="space-y-6">
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Uncertainty Tracker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-slate-400">
          <p>
            Document the top five risks and their mitigations before promoting to Quality & Governance. The
            catalyst calendar drives monitoring alerts later in the workflow.
          </p>
          <div className="flex flex-wrap gap-2">
            {outstanding.length === 0 ? (
              <Badge variant="outline" className="border-slate-700 text-[10px] uppercase text-emerald-300">
                Gate complete
              </Badge>
            ) : (
              outstanding.map((item) => (
                <Badge key={item.id} variant="outline" className="border-slate-700 text-[10px] uppercase text-amber-200">
                  {item.label}
                </Badge>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {riskColumns.map((column) => (
          <Card key={column.title} className="border-slate-800 bg-slate-900/60">
            <CardHeader>
              <CardTitle className="text-sm text-slate-200">{column.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-400">
              <ul className="list-disc space-y-1 pl-5">
                {column.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
