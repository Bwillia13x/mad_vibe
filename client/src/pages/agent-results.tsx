import { useState } from 'react'
import { useParams, useLocation } from 'wouter'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
import { AgentResultsTable } from '@/components/agents/AgentResultsTable'
import { AgentResultDetail } from '@/components/agents/AgentResultDetail'
import { AgentResultComparison } from '@/components/agents/AgentResultComparison'
import { GlassCard } from '@/components/layout/GlassCard'
import { ReviewerAssignmentPanel } from '@/components/agents/ReviewerAssignmentPanel'
import { Button } from '@/components/ui/button'
import { GitCompare } from 'lucide-react'

export default function AgentResultsPage() {
  const { currentWorkspace } = useWorkspaceContext()
  const params = useParams()
  const [, navigate] = useLocation()
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(params.taskId || null)
  const [compareMode, setCompareMode] = useState(false)
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([])

  if (!currentWorkspace) {
    return (
      <div className="p-6">
        <GlassCard title="Agent Results" subtitle="Select a workspace">
          <div className="h-32 flex items-center justify-center text-sm text-slate-400">
            Please select a workspace to view agent results.
          </div>
        </GlassCard>
      </div>
    )
  }

  const handleBack = () => {
    setSelectedTaskId(null)
    setCompareMode(false)
    setSelectedForComparison([])
    navigate('/agent-results')
  }

  const handleToggleCompareMode = () => {
    setCompareMode(!compareMode)
    setSelectedForComparison([])
  }

  const handleSelectForComparison = (taskId: string) => {
    if (selectedForComparison.includes(taskId)) {
      setSelectedForComparison(selectedForComparison.filter((id) => id !== taskId))
    } else if (selectedForComparison.length < 2) {
      setSelectedForComparison([...selectedForComparison, taskId])
    }
  }

  // Show comparison view if 2 results selected
  const showingComparison = compareMode && selectedForComparison.length === 2

  return (
    <div className="space-y-6 p-6">
      {showingComparison ? (
        <AgentResultComparison
          taskId1={selectedForComparison[0]}
          taskId2={selectedForComparison[1]}
          onBack={handleBack}
        />
      ) : selectedTaskId ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
          <AgentResultDetail taskId={selectedTaskId} onBack={handleBack} />
          <ReviewerAssignmentPanel workspaceId={currentWorkspace.id} stageSlug="memo" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-100">Agent Results</h2>
              <Button
                variant={compareMode ? 'default' : 'outline'}
                size="sm"
                onClick={handleToggleCompareMode}
              >
                <GitCompare className="w-4 h-4 mr-2" />
                {compareMode ? 'Cancel Compare' : 'Compare Results'}
                {compareMode && selectedForComparison.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-violet-500 text-white text-xs rounded">
                    {selectedForComparison.length}/2
                  </span>
                )}
              </Button>
            </div>
            <AgentResultsTable
              workspaceId={currentWorkspace.id}
              compareMode={compareMode}
              selectedForComparison={selectedForComparison}
              onSelectForComparison={handleSelectForComparison}
              onSelectResult={(taskId) => {
                if (!compareMode) {
                  setSelectedTaskId(taskId)
                  navigate(`/agent-results/${taskId}`)
                }
              }}
            />
          </div>
          <ReviewerAssignmentPanel workspaceId={currentWorkspace.id} stageSlug="memo" />
        </div>
      )}
    </div>
  )
}
