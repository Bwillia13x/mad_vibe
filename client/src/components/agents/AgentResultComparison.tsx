import { useEffect, useState } from 'react'
import { GlassCard } from '@/components/layout/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react'

interface AgentResult {
  taskId: string
  taskType: string
  taskDescription: string
  status: string
  startedAt: string
  completedAt: string | null
  durationMs: number | null
  resultSummary: Record<string, unknown> | null
  steps?: Array<{
    stepId: string
    action: string
    status: string
    result: unknown
    durationMs: number
  }>
}

interface AgentResultComparisonProps {
  taskId1: string
  taskId2: string
  onBack?: () => void
}

export function AgentResultComparison({ taskId1, taskId2, onBack }: AgentResultComparisonProps) {
  const [result1, setResult1] = useState<AgentResult | null>(null)
  const [result2, setResult2] = useState<AgentResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadResults() {
      try {
        setLoading(true)
        setError(null)

        const [res1, res2] = await Promise.all([
          fetch(`/api/agent-results/${taskId1}`),
          fetch(`/api/agent-results/${taskId2}`)
        ])

        if (!res1.ok || !res2.ok) {
          throw new Error('Failed to load one or more results')
        }

        const [data1, data2] = await Promise.all([res1.json(), res2.json()])
        setResult1(data1.result || data1)
        setResult2(data2.result || data2)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load results')
      } finally {
        setLoading(false)
      }
    }

    loadResults()
  }, [taskId1, taskId2])

  function getStatusBadge(status: string) {
    switch (status) {
      case 'completed':
      case 'succeeded':
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
      <div className="space-y-4">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <GlassCard key={i} title="Loading..." subtitle="Please wait">
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    )
  }

  if (error || !result1 || !result2) {
    return (
      <GlassCard title="Comparison Error" subtitle="Unable to load results">
        <div className="p-4 bg-red-950/30 border border-red-900 rounded text-sm text-red-400">
          {error || 'One or more results could not be loaded'}
        </div>
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        )}
      </GlassCard>
    )
  }

  return (
    <div className="space-y-4">
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Result 1 */}
        <GlassCard
          title={result1.taskDescription || 'Analysis A'}
          subtitle={`${result1.taskType} • ${formatDuration(result1.durationMs)}`}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {getStatusBadge(result1.status)}
              <span className="text-xs text-slate-400">
                {new Date(result1.startedAt).toLocaleString()}
              </span>
            </div>

            {result1.resultSummary && (
              <div className="p-3 bg-slate-950/50 rounded-lg">
                <p className="text-xs font-medium text-slate-400 mb-2">Summary</p>
                <pre className="text-xs text-slate-300 whitespace-pre-wrap">
                  {JSON.stringify(result1.resultSummary, null, 2)}
                </pre>
              </div>
            )}

            {result1.steps && result1.steps.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-400 mb-2">
                  Steps ({result1.steps.length})
                </p>
                <div className="space-y-2">
                  {result1.steps.map((step) => (
                    <div
                      key={step.stepId}
                      className="p-2 bg-slate-900/60 rounded border border-slate-700/50"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-300">{step.action}</span>
                        {getStatusBadge(step.status)}
                      </div>
                      <span className="text-xs text-slate-500">
                        {formatDuration(step.durationMs)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Result 2 */}
        <GlassCard
          title={result2.taskDescription || 'Analysis B'}
          subtitle={`${result2.taskType} • ${formatDuration(result2.durationMs)}`}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {getStatusBadge(result2.status)}
              <span className="text-xs text-slate-400">
                {new Date(result2.startedAt).toLocaleString()}
              </span>
            </div>

            {result2.resultSummary && (
              <div className="p-3 bg-slate-950/50 rounded-lg">
                <p className="text-xs font-medium text-slate-400 mb-2">Summary</p>
                <pre className="text-xs text-slate-300 whitespace-pre-wrap">
                  {JSON.stringify(result2.resultSummary, null, 2)}
                </pre>
              </div>
            )}

            {result2.steps && result2.steps.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-400 mb-2">
                  Steps ({result2.steps.length})
                </p>
                <div className="space-y-2">
                  {result2.steps.map((step) => (
                    <div
                      key={step.stepId}
                      className="p-2 bg-slate-900/60 rounded border border-slate-700/50"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-300">{step.action}</span>
                        {getStatusBadge(step.status)}
                      </div>
                      <span className="text-xs text-slate-500">
                        {formatDuration(step.durationMs)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Comparison Summary */}
      <GlassCard title="Comparison Summary" subtitle="Key differences">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="p-3 bg-slate-900/60 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Duration Difference</p>
            <p className="text-lg font-semibold text-slate-200">
              {Math.abs((result1.durationMs || 0) - (result2.durationMs || 0)) > 0
                ? `${formatDuration(Math.abs((result1.durationMs || 0) - (result2.durationMs || 0)))}`
                : 'Same'}
            </p>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Status Match</p>
            <p className="text-lg font-semibold text-slate-200">
              {result1.status === result2.status ? '✓ Same' : '✗ Different'}
            </p>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Step Count</p>
            <p className="text-lg font-semibold text-slate-200">
              {result1.steps?.length || 0} vs {result2.steps?.length || 0}
            </p>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Type Match</p>
            <p className="text-lg font-semibold text-slate-200">
              {result1.taskType === result2.taskType ? '✓ Same' : '✗ Different'}
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
