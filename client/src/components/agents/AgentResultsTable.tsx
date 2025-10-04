import { useState, useEffect } from 'react'
import { GlassCard } from '@/components/layout/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Download, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface AgentResult {
  id: number
  taskId: string
  workspaceId: number
  taskType: string
  taskDescription: string
  status: string
  startedAt: string
  completedAt: string | null
  durationMs: number | null
  error: string | null
  resultSummary: Record<string, unknown> | null
}

interface AgentResultsTableProps {
  workspaceId: number
  onSelectResult?: (taskId: string) => void
  compareMode?: boolean
  selectedForComparison?: string[]
  onSelectForComparison?: (taskId: string) => void
}

export function AgentResultsTable({
  workspaceId,
  onSelectResult,
  compareMode = false,
  selectedForComparison = [],
  onSelectForComparison
}: AgentResultsTableProps) {
  const [results, setResults] = useState<AgentResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadResults()
  }, [workspaceId])

  async function loadResults() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/workspaces/${workspaceId}/agent-results?limit=20`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load results')
      }

      setResults(data.results || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(taskId: string) {
    if (!confirm('Delete this agent result? This cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/agent-results/${taskId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setResults(results.filter((r) => r.taskId !== taskId))
      }
    } catch (err) {
      console.error('Failed to delete result:', err)
    }
  }

  async function handleExport(taskId: string, format: 'json' | 'pdf') {
    try {
      const response = await fetch(`/api/agent-results/${taskId}/export?format=${format}`)

      if (format === 'json') {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `agent-result-${taskId}.json`
        a.click()
      } else {
        // PDF download
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `agent-result-${taskId}.pdf`
        a.click()
      }
    } catch (err) {
      console.error('Failed to export result:', err)
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-950/30 text-green-400 border-green-900">
            <CheckCircle className="w-3 h-3 mr-1" />
            Complete
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-950/30 text-red-400 border-red-900">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-slate-800 text-slate-400 border-slate-700">
            <Clock className="w-3 h-3 mr-1" />
            {status}
          </Badge>
        )
    }
  }

  function formatDuration(durationMs: number | null): string {
    if (!durationMs) return '—'
    const seconds = Math.floor(durationMs / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ${seconds % 60}s`
  }

  if (loading) {
    return (
      <GlassCard title="Agent Results" subtitle="Loading...">
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 bg-slate-900/40 rounded-lg border border-slate-700/50">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
              <Skeleton className="h-8 w-full mb-2" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    )
  }

  if (error) {
    return (
      <GlassCard title="Agent Results" subtitle="Error loading results">
        <div className="p-4 bg-red-950/30 border border-red-900 rounded text-sm text-red-400">
          {error}
        </div>
      </GlassCard>
    )
  }

  if (results.length === 0) {
    return (
      <GlassCard title="Agent Results" subtitle="No results yet">
        <div className="h-32 flex items-center justify-center text-sm text-slate-400">
          No agent analyses have been completed yet.
        </div>
      </GlassCard>
    )
  }

  const isSelected = (taskId: string) => selectedForComparison.includes(taskId)

  return (
    <GlassCard title="Agent Results" subtitle={`${results.length} completed analyses`}>
      <div className="space-y-2">
        {results.map((result) => (
          <div
            key={result.taskId}
            className={`p-3 bg-slate-900/40 rounded-lg border transition ${
              isSelected(result.taskId)
                ? 'border-violet-500 bg-violet-950/20'
                : 'border-slate-700/50 hover:border-slate-600/50'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {compareMode && (
                    <input
                      type="checkbox"
                      checked={isSelected(result.taskId)}
                      onChange={() => onSelectForComparison?.(result.taskId)}
                      disabled={!isSelected(result.taskId) && selectedForComparison.length >= 2}
                      className="w-4 h-4 text-violet-500 bg-slate-800 border-slate-600 rounded focus:ring-violet-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  )}
                  <h4 className="text-sm font-medium text-slate-200">{result.taskDescription}</h4>
                  {getStatusBadge(result.status)}
                </div>
                <p className="text-xs text-slate-400">
                  Type: {result.taskType} • Duration: {formatDuration(result.durationMs)} •
                  {result.completedAt
                    ? ` Completed ${formatDistanceToNow(new Date(result.completedAt))} ago`
                    : ' In progress'}
                </p>
              </div>
            </div>

            {result.resultSummary && (
              <div className="mb-2 p-2 bg-slate-950/50 rounded text-xs text-slate-400">
                <span className="font-medium">Key Findings:</span>{' '}
                {Object.entries(result.resultSummary)
                  .slice(0, 3)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(' • ')}
              </div>
            )}

            {!compareMode && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => onSelectResult?.(result.taskId)}>
                  <FileText className="w-3 h-3 mr-1" />
                  View Details
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleExport(result.taskId, 'json')}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(result.taskId)}>
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
