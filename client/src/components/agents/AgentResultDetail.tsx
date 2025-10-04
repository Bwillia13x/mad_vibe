import { useCallback, useEffect, useState } from 'react'
import { GlassCard } from '@/components/layout/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Clock, Download, ArrowLeft } from 'lucide-react'

interface AgentStepResult {
  id: number
  taskResultId: number
  stepId: string
  stepName: string
  stepDescription: string
  action: string
  status: string
  result: unknown
  error: string | null
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  retryCount: number
}

interface AgentResultDetailProps {
  taskId: string
  onBack?: () => void
}

export function AgentResultDetail({ taskId, onBack }: AgentResultDetailProps) {
  const [steps, setSteps] = useState<AgentStepResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'summary' | 'steps' | 'raw'>('summary')
  const [highlightedStepId, setHighlightedStepId] = useState<string | null>(null)

  const loadSteps = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/agent-results/${taskId}/steps`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load steps')
      }

      setSteps(data.steps || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load steps')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    void loadSteps()
  }, [loadSteps])

  useEffect(() => {
    if (!steps.length) return
    if (typeof window === 'undefined') return

    const applyHash = () => {
      const hash = window.location.hash.replace('#', '')
      if (!hash) {
        setHighlightedStepId(null)
        return
      }
      setHighlightedStepId(hash)
      // Defer scrolling to ensure layout is ready
      requestAnimationFrame(() => {
        const el = document.getElementById(`step-${hash}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
    }

    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [steps])

  function getStepIcon(status: string) {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />
      default:
        return <Clock className="w-4 h-4 text-slate-400" />
    }
  }

  function formatDuration(durationMs: number | null): string {
    if (!durationMs) return '—'
    const seconds = Math.floor(durationMs / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ${seconds % 60}s`
  }

  function renderSummary() {
    const completedSteps = steps.filter((s) => s.status === 'completed')
    const failedSteps = steps.filter((s) => s.status === 'failed')
    const totalDuration = steps.reduce((sum, s) => sum + (s.durationMs || 0), 0)

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-slate-900/40 rounded border border-slate-700/50">
            <div className="text-2xl font-semibold text-slate-100">{completedSteps.length}</div>
            <div className="text-xs text-slate-400">Completed Steps</div>
          </div>
          <div className="p-3 bg-slate-900/40 rounded border border-slate-700/50">
            <div className="text-2xl font-semibold text-slate-100">{failedSteps.length}</div>
            <div className="text-xs text-slate-400">Failed Steps</div>
          </div>
          <div className="p-3 bg-slate-900/40 rounded border border-slate-700/50">
            <div className="text-2xl font-semibold text-slate-100">
              {formatDuration(totalDuration)}
            </div>
            <div className="text-xs text-slate-400">Total Duration</div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-300">Key Results</h3>
          {completedSteps.slice(0, 5).map((step) => (
            <div key={step.id} className="p-2 bg-slate-900/40 rounded border border-slate-700/50">
              <div className="text-sm font-medium text-slate-200 mb-1">{step.stepName}</div>
              {step.result != null && (
                <pre className="text-xs text-slate-400 overflow-x-auto">
                  {JSON.stringify(step.result, null, 2).substring(0, 200)}...
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderSteps() {
    return (
      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.id}
            id={`step-${step.stepId}`}
            className={`relative pl-8 pb-4 border-l-2 last:border-transparent transition-colors ${
              highlightedStepId === step.stepId
                ? 'border-violet-500/60 bg-violet-950/40'
                : 'border-slate-700/50'
            }`}
          >
            <div className="absolute left-0 top-0 -translate-x-1/2 bg-slate-800 rounded-full p-1">
              {getStepIcon(step.status)}
            </div>

            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                    {step.stepName}
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window === 'undefined') return
                        const url = new URL(window.location.href)
                        url.hash = step.stepId
                        window.history.replaceState(null, '', url.toString())
                        setHighlightedStepId(step.stepId)
                      }}
                      className="text-xs text-violet-300 hover:text-violet-200 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                    >
                      Copy link
                    </button>
                  </h4>
                  <p className="text-xs text-slate-400">{String(step.stepDescription ?? '')}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {formatDuration(step.durationMs)}
                </Badge>
              </div>

              {step.status === 'completed' && step.result !== undefined && step.result !== null && (
                <details className="group">
                  <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">
                    View result
                  </summary>
                  <pre className="mt-2 p-2 bg-slate-950/50 rounded text-xs text-slate-400 overflow-x-auto">
                    {JSON.stringify(step.result, null, 2)}
                  </pre>
                </details>
              )}

              {step.error && (
                <div className="p-2 bg-red-950/30 border border-red-900 rounded text-xs text-red-400">
                  <strong>Error:</strong> {step.error}
                </div>
              )}

              {step.retryCount > 0 && (
                <div className="text-xs text-amber-400">
                  Retried {step.retryCount} time{step.retryCount > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  function renderRaw() {
    return (
      <pre className="p-4 bg-slate-950/50 rounded text-xs text-slate-400 overflow-x-auto">
        {JSON.stringify({ taskId, steps }, null, 2)}
      </pre>
    )
  }

  if (loading) {
    return (
      <GlassCard title="Loading Result...">
        <div className="h-32 flex items-center justify-center text-sm text-slate-400">
          Loading result details...
        </div>
      </GlassCard>
    )
  }

  if (error) {
    return (
      <GlassCard title="Error">
        <div className="p-4 bg-red-950/30 border border-red-900 rounded text-sm text-red-400">
          {error}
        </div>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Results
          </Button>
        )}
        <Button size="sm" variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Result
        </Button>
      </div>

      <GlassCard title={`Agent Result: ${taskId}`} subtitle={`${steps.length} steps executed`}>
        <div className="space-y-4">
          <div
            className="flex gap-2 border-b border-slate-700/50"
            role="tablist"
            aria-label="Result detail tabs"
          >
            <button
              type="button"
              id="tab-summary"
              role="tab"
              aria-selected={activeTab === 'summary' ? 'true' : 'false'}
              aria-controls="panel-summary"
              tabIndex={activeTab === 'summary' ? 0 : -1}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === 'summary'
                  ? 'text-violet-400 border-b-2 border-violet-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
              onClick={() => setActiveTab('summary')}
            >
              Summary
            </button>
            <button
              type="button"
              id="tab-steps"
              role="tab"
              aria-selected={activeTab === 'steps' ? 'true' : 'false'}
              aria-controls="panel-steps"
              tabIndex={activeTab === 'steps' ? 0 : -1}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === 'steps'
                  ? 'text-violet-400 border-b-2 border-violet-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
              onClick={() => setActiveTab('steps')}
            >
              Steps
            </button>
            <button
              type="button"
              id="tab-raw"
              role="tab"
              aria-selected={activeTab === 'raw' ? 'true' : 'false'}
              aria-controls="panel-raw"
              tabIndex={activeTab === 'raw' ? 0 : -1}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === 'raw'
                  ? 'text-violet-400 border-b-2 border-violet-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
              onClick={() => setActiveTab('raw')}
            >
              Raw Data
            </button>
          </div>

          <div>
            <div
              id="panel-summary"
              role="tabpanel"
              aria-labelledby="tab-summary"
              hidden={activeTab !== 'summary'}
            >
              {renderSummary()}
            </div>
            <div
              id="panel-steps"
              role="tabpanel"
              aria-labelledby="tab-steps"
              hidden={activeTab !== 'steps'}
            >
              {renderSteps()}
            </div>
            <div
              id="panel-raw"
              role="tabpanel"
              aria-labelledby="tab-raw"
              hidden={activeTab !== 'raw'}
            >
              {renderRaw()}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
