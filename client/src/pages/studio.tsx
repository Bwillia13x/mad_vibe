import { GlassCard } from '@/components/layout/GlassCard'
import { CanvasBoard } from '@/components/studio/CanvasBoard'
import { AIAgentChat } from '@/components/studio/AIAgentChat'
import { FormulaAssistant } from '@/components/studio/FormulaAssistant'
import { MacroPalette } from '@/components/studio/MacroPalette'
import { DataToolbelt } from '@/components/studio/DataToolbelt'
import { ExportsPanel } from '@/components/studio/ExportsPanel'
import { ArtifactTimeline } from '@/components/studio/ArtifactTimeline'

export default function StudioPage() {
  return (
    <div className="h-full w-full p-4">
      <div className="h-full w-full flex gap-4">
        <div className="flex-1 min-w-0">
          <GlassCard title="Canvas" subtitle="Sketch, plan, and iterate" className="h-full p-0">
            <div className="h-[calc(100vh-8rem)]">
              <CanvasBoard className="h-full" />
            </div>
          </GlassCard>
        </div>
        <div className="w-[360px] min-w-[320px]">
          <div className="h-[calc(100vh-8rem)] flex flex-col gap-4 overflow-y-auto">
            <ExportsPanel />
            <DataToolbelt />
            <ArtifactTimeline />
            <MacroPalette className="flex-1 min-h-[200px]" />
            <FormulaAssistant className="flex-1 min-h-[200px]" />
            <AIAgentChat className="flex-1 min-h-[200px]" />
          </div>
        </div>
      </div>
    </div>
  )
}
