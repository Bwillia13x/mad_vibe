import { useState } from 'react'
import { useParams, useLocation } from 'wouter'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
import { AgentResultsTable } from '@/components/agents/AgentResultsTable'
import { AgentResultDetail } from '@/components/agents/AgentResultDetail'
import { GlassCard } from '@/components/layout/GlassCard'
import { ReviewerAssignmentPanel } from '@/components/agents/ReviewerAssignmentPanel'

export default function AgentResultsPage() {
  const { currentWorkspace } = useWorkspaceContext()
  const params = useParams()
  const [, navigate] = useLocation()
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(params.taskId || null)

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
    navigate('/agent-results')
  }

  return (
    <div className="space-y-6 p-6">
      {selectedTaskId ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
          <AgentResultDetail taskId={selectedTaskId} onBack={handleBack} />
          <ReviewerAssignmentPanel workspaceId={currentWorkspace.id} stageSlug="memo" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
          <AgentResultsTable
            workspaceId={currentWorkspace.id}
            onSelectResult={(taskId) => {
              setSelectedTaskId(taskId)
              navigate(`/agent-results/${taskId}`)
            }}
          />
          <ReviewerAssignmentPanel workspaceId={currentWorkspace.id} stageSlug="memo" />
        </div>
      )}
    </div>
  )
}
