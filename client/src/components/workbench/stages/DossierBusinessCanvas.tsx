import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useWorkflow } from "@/hooks/useWorkflow"

const segments = [
  { title: "Segments", description: "Define major revenue streams and geographies." },
  { title: "Customers", description: "Who buys, why they stay, and churn triggers." },
  { title: "Competitors", description: "Direct rivals plus substitute threats." },
  { title: "Moat", description: "Attach evidence to each moat claim." },
  { title: "Risks", description: "Track unresolved gaps as TODOs." }
]

export function DossierBusinessCanvas() {
  const { getChecklist, activeStage, checklistState } = useWorkflow()
  const checklist = useMemo(() => getChecklist(activeStage.slug), [activeStage.slug, getChecklist])
  const stageState = checklistState[activeStage.slug] ?? {}
  const completion = useMemo(() => {
    if (!checklist.length) return 0
    const done = checklist.filter((item) => stageState[item.id]).length
    return Math.round((done / checklist.length) * 100)
  }, [checklist, stageState])

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Business Model Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-slate-400">
          <p>
            Fill every block even if the answer is "unknown" — uncertainty is better than assumptions. Attach
            evidence as you go; the stage gate requires five citations minimum.
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-slate-700 text-[10px] uppercase text-slate-300">
              Completion {completion}%
            </Badge>
            <Badge variant="outline" className="border-slate-700 text-[10px] uppercase text-slate-300">
              Evidence ≥ 5 required
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {segments.map((segment) => (
          <Card key={segment.title} className="bg-slate-900/60 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm text-slate-200">{segment.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-400">
              <p>{segment.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
