import { useEffect, useMemo, useState } from "react"
import { useLocation } from "wouter"
import { WorkbenchLayout } from "@/components/workbench/WorkbenchLayout"
import { buildStageTabs } from "@/components/workbench/stage-tabs"
import { OmniPrompt } from "@/components/workbench/OmniPrompt"
import { useWorkflow } from "@/hooks/useWorkflow"
import { DataNormalizationProvider } from "@/hooks/useDataNormalization"
import { OwnerEarningsProvider } from "@/hooks/useOwnerEarnings"
import { ValuationProvider } from "@/hooks/useValuation"
import { MemoComposerProvider } from "@/hooks/useMemoComposer"
import { MonitoringProvider } from "@/hooks/useMonitoring"
import { ScenarioLabProvider } from "@/hooks/useScenarioLab"

export interface WorkflowStageViewProps {
  stageSlug: string
}

export function WorkflowStageView({ stageSlug }: WorkflowStageViewProps) {
  const {
    stages,
    stageStatuses,
    activeStage,
    setActiveStage
  } = useWorkflow()
  const [, setLocation] = useLocation()
  const [promptOpen, setPromptOpen] = useState(false)

  useEffect(() => {
    const stage = stages.find((entry) => entry.slug === stageSlug)
    if (!stage) {
      const fallback = stages[0]
      setLocation(`/${fallback.slug}`, { replace: true })
      return
    }

    const status = stageStatuses[stage.slug]
    if (status === "locked") {
      const fallback =
        stages.find((entry) => stageStatuses[entry.slug] !== "locked") ?? stages[0]
      if (stageSlug !== fallback.slug) {
        setLocation(`/${fallback.slug}`, { replace: true })
      }
      if (fallback.slug !== activeStage.slug) setActiveStage(fallback.slug)
      return
    }

    if (stage.slug !== activeStage.slug) {
      setActiveStage(stage.slug)
    }
  }, [
    activeStage.slug,
    setActiveStage,
    setLocation,
    stageSlug,
    stageStatuses,
    stages
  ])

  const tabs = useMemo(() => buildStageTabs(activeStage), [activeStage])

  const handleNavigateStage = (slug: string) => {
    setLocation(`/${slug}`)
  }

  return (
    <DataNormalizationProvider>
      <OwnerEarningsProvider>
        <ValuationProvider>
          <ScenarioLabProvider>
            <MemoComposerProvider>
              <MonitoringProvider>
                <WorkbenchLayout
                  tabs={tabs}
                  onOpenPrompt={() => setPromptOpen(true)}
                  onNavigateStage={handleNavigateStage}
                />
                <OmniPrompt
                  open={promptOpen}
                  onOpenChange={setPromptOpen}
                  onNavigateStage={handleNavigateStage}
                />
              </MonitoringProvider>
            </MemoComposerProvider>
          </ScenarioLabProvider>
        </ValuationProvider>
      </OwnerEarningsProvider>
    </DataNormalizationProvider>
  )
}
