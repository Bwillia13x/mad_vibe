import { useMemo } from "react"
import { useWorkflow } from "@/hooks/useWorkflow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function IntakeOnePagerDraft() {
  const { activeStage, getChecklist, checklistState, toggleChecklistItem } = useWorkflow()
  const checklist = useMemo(() => getChecklist(activeStage.slug), [activeStage.slug, getChecklist])
  const stageState = checklistState[activeStage.slug] ?? {}

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Triaged Idea Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-slate-400">
          <p>
            Capture the ticker, theme, and source details. The system drafts the five-minute memo — edit the
            thesis stub, then document at least one disqualifier before moving forward.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-slate-700 text-[10px] uppercase text-slate-300">
              Thesis stub required
            </Badge>
            <Badge variant="outline" className="border-slate-700 text-[10px] uppercase text-slate-300">
              Disqualifier check required
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Gate Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {checklist.map((item) => {
            const complete = stageState[item.id] ?? false
            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/60 px-3 py-2"
              >
                <div>
                  <p className="text-sm text-slate-200">{item.label}</p>
                  {item.helper && <p className="text-xs text-slate-500">{item.helper}</p>}
                </div>
                <Button
                  size="sm"
                  variant={complete ? "secondary" : "default"}
                  onClick={() => toggleChecklistItem(activeStage.slug, item.id)}
                >
                  {complete ? "Undo" : "Mark"}
                </Button>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">AI Pair Prompts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-slate-400">
          <p>
            Use the omni-prompt (⌘K) to fire off targeted analyses. Your last responses are logged in the
            research trail automatically.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Summarize the latest filing in five bullet points.</li>
            <li>Explain revenue drivers over the past three years.</li>
            <li>List three contrarian risks that could derail the thesis.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
