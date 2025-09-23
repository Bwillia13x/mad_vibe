import { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useWorkflow } from '@/hooks/useWorkflow'
import { Badge } from '@/components/ui/badge'

const sizingSections = [
  {
    title: 'Sizing Math',
    bullets: [
      'Use Kelly-capped sizing tied to scenario downside',
      'Check liquidity stress against trade plan',
      'Document scale-in vs. scale-out ladder'
    ]
  },
  {
    title: 'Correlation Mix',
    bullets: [
      'Measure factor exposure vs. current book',
      'Flag concentration or unintended bets',
      'Tag hedges that offset correlated risk'
    ]
  },
  {
    title: 'Governance',
    bullets: [
      'Capture reviewer sign-off with timestamp',
      'Store stop and review triggers for Execution',
      'Sync with monitoring alerts for drawdowns'
    ]
  }
]

export function PortfolioSizingWorkbench() {
  const { getChecklist, checklistState, activeStage } = useWorkflow()
  const checklist = useMemo(() => getChecklist(activeStage.slug), [activeStage.slug, getChecklist])
  const stageState = checklistState[activeStage.slug] ?? {}
  const signoffItem = checklist.find((item) => item.id.includes('signoff'))
  const signoffDone = signoffItem ? stageState[signoffItem.id] : false

  return (
    <div className="space-y-6">
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Risk Budget Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-slate-400">
          <p>
            Portfolio fit finalizes sizing before the IC memo. Ensure the sign-off badge is green
            before moving to Execution.
          </p>
          <Badge
            variant="outline"
            className={`border-slate-700 text-[10px] uppercase ${signoffDone ? 'text-emerald-300' : 'text-amber-200'}`}
          >
            {signoffDone ? 'Risk sign-off recorded' : 'Awaiting risk sign-off'}
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {sizingSections.map((section) => (
          <Card key={section.title} className="border-slate-800 bg-slate-900/60">
            <CardHeader>
              <CardTitle className="text-sm text-slate-200">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-400">
              <ul className="list-disc space-y-1 pl-5">
                {section.bullets.map((item) => (
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
