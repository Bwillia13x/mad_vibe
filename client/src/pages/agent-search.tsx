import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { GlassCard } from '@/components/layout/GlassCard'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'

function toLocalDateTimeInput(value: string | null): string {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function fromLocalInputToISO(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function parseDate(value: string | Date | null): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDurationMs(durationMs: number | null | undefined): string {
  if (!durationMs || durationMs <= 0) return '—'
  let remainingSeconds = Math.floor(durationMs / 1000)
  const hours = Math.floor(remainingSeconds / 3600)
  remainingSeconds -= hours * 3600
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60

  const parts: string[] = []
  if (hours) parts.push(`${hours}h`)
  if (minutes || hours) parts.push(`${minutes}m`)
  parts.push(`${seconds}s`)
  return parts.join(' ')
}

type StepHit = {
  stepId: string
  action: string
  status: string
  rank: number
  snippet: string
}

type TaskStatus = 'succeeded' | 'failed' | 'running' | 'queued'

type SearchHit = {
  taskId: string
  workspaceId: number
  taskType: string
  taskDescription: string | null
  status: TaskStatus
  startedAt: string | Date
  completedAt: string | Date | null
  durationMs: number | null
  rank: number
  snippet: string
  steps: StepHit[]
}

export default function AgentSearchPage() {
  const { currentWorkspace } = useWorkspaceContext()
  const [location, navigate] = useLocation()
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(20)
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [startedAfter, setStartedAfter] = useState('')
  const [startedBefore, setStartedBefore] = useState('')
  const [minDuration, setMinDuration] = useState('')
  const [hits, setHits] = useState<SearchHit[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const canSearch = useMemo(() => q.trim().length >= 2, [q])

  // Initialize search state from URL parameters and respond to manual URL changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const nextQuery = url.searchParams.get('q') ?? ''
    const limitRaw = url.searchParams.get('limit')
    const parsedLimit = limitRaw ? parseInt(limitRaw, 10) : NaN
    const normalizedLimit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 20
    const statusParamRaw = url.searchParams.get('status')
    const validStatuses: TaskStatus[] = ['succeeded', 'failed', 'running', 'queued']
    const normalizedStatus: TaskStatus | 'all' = statusParamRaw && validStatuses.includes(statusParamRaw as TaskStatus)
      ? (statusParamRaw as TaskStatus)
      : 'all'
    const startedAfterParam = toLocalDateTimeInput(url.searchParams.get('startedAfter'))
    const startedBeforeParam = toLocalDateTimeInput(url.searchParams.get('startedBefore'))
    const minDurationParam = url.searchParams.get('minDurationMs') ?? ''

    setQ((prev) => (prev === nextQuery ? prev : nextQuery))
    setLimit((prev) => (prev === normalizedLimit ? prev : normalizedLimit))
    setStatusFilter((prev) => (prev === normalizedStatus ? prev : normalizedStatus))
    setStartedAfter((prev) => (prev === startedAfterParam ? prev : startedAfterParam))
    setStartedBefore((prev) => (prev === startedBeforeParam ? prev : startedBeforeParam))
    setMinDuration((prev) => (prev === minDurationParam ? prev : minDurationParam))
  }, [location])

  const runSearch = useCallback(async () => {
    if (!canSearch) return

    setError(null)
    setValidationError(null)

    const trimmedQuery = q.trim()
    const minDurationValue = minDuration ? parseInt(minDuration, 10) : undefined
    if (minDuration && (Number.isNaN(minDurationValue) || minDurationValue < 0)) {
      setValidationError('Minimum duration must be a non-negative number')
      return
    }

    const startedAfterDate = startedAfter ? new Date(startedAfter) : undefined
    if (startedAfter && Number.isNaN(startedAfterDate.getTime())) {
      setValidationError('Provide a valid "started after" timestamp')
      return
    }

    const startedBeforeDate = startedBefore ? new Date(startedBefore) : undefined
    if (startedBefore && Number.isNaN(startedBeforeDate.getTime())) {
      setValidationError('Provide a valid "started before" timestamp')
      return
    }

    if (startedAfterDate && startedBeforeDate && startedAfterDate > startedBeforeDate) {
      setValidationError('"Started after" must be earlier than "started before"')
      return
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('q', trimmedQuery)
      if (currentWorkspace?.id) params.set('workspaceId', String(currentWorkspace.id))
      params.set('limit', String(limit))
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (startedAfterDate) params.set('startedAfter', startedAfterDate.toISOString())
      if (startedBeforeDate) params.set('startedBefore', startedBeforeDate.toISOString())
      if (minDurationValue !== undefined) params.set('minDurationMs', String(minDurationValue))

      const res = await fetch(`/api/agent-results/search?${params.toString()}`)
      if (!res.ok) throw new Error(`Search failed (${res.status})`)
      const data = (await res.json()) as { results: SearchHit[]; count: number }
      setHits(data.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setHits(null)
    } finally {
      setIsLoading(false)
    }
  }, [canSearch, currentWorkspace?.id, limit, q, statusFilter, startedAfter, startedBefore, minDuration])

  useEffect(() => {
    const h = setTimeout(() => {
      if (canSearch) void runSearch()
    }, 300)
    return () => clearTimeout(h)
  }, [canSearch, runSearch])

  // Keep URL in sync with current search parameters
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const trimmedQuery = q.trim()
    let changed = false

    if (trimmedQuery) {
      if (url.searchParams.get('q') !== trimmedQuery) {
        url.searchParams.set('q', trimmedQuery)
        changed = true
      }
    } else if (url.searchParams.has('q')) {
      url.searchParams.delete('q')
      changed = true
    }

    const limitString = String(limit)
    if (url.searchParams.get('limit') !== limitString) {
      url.searchParams.set('limit', limitString)
      changed = true
    }

    if (statusFilter !== 'all') {
      if (url.searchParams.get('status') !== statusFilter) {
        url.searchParams.set('status', statusFilter)
        changed = true
      }
    } else if (url.searchParams.has('status')) {
      url.searchParams.delete('status')
      changed = true
    }

    if (startedAfter) {
      const iso = fromLocalInputToISO(startedAfter)
      if (iso) {
        if (url.searchParams.get('startedAfter') !== iso) {
          url.searchParams.set('startedAfter', iso)
          changed = true
        }
      } else if (url.searchParams.has('startedAfter')) {
        url.searchParams.delete('startedAfter')
        changed = true
      }
    } else if (url.searchParams.has('startedAfter')) {
      url.searchParams.delete('startedAfter')
      changed = true
    }

    if (startedBefore) {
      const iso = fromLocalInputToISO(startedBefore)
      if (iso) {
        if (url.searchParams.get('startedBefore') !== iso) {
          url.searchParams.set('startedBefore', iso)
          changed = true
        }
      } else if (url.searchParams.has('startedBefore')) {
        url.searchParams.delete('startedBefore')
        changed = true
      }
    } else if (url.searchParams.has('startedBefore')) {
      url.searchParams.delete('startedBefore')
      changed = true
    }

    if (minDuration) {
      const trimmed = minDuration.trim()
      if (url.searchParams.get('minDurationMs') !== trimmed) {
        url.searchParams.set('minDurationMs', trimmed)
        changed = true
      }
    } else if (url.searchParams.has('minDurationMs')) {
      url.searchParams.delete('minDurationMs')
      changed = true
    }

    if (currentWorkspace?.id) {
      const workspaceValue = String(currentWorkspace.id)
      if (url.searchParams.get('workspaceId') !== workspaceValue) {
        url.searchParams.set('workspaceId', workspaceValue)
        changed = true
      }
    } else if (url.searchParams.has('workspaceId')) {
      url.searchParams.delete('workspaceId')
      changed = true
    }

    if (!changed) return

    const nextPath = `${url.pathname}${url.search}`
    if (nextPath !== location) {
      navigate(nextPath, { replace: true })
    }
  }, [currentWorkspace?.id, q, limit, statusFilter, startedAfter, startedBefore, minDuration, location, navigate])

  return (
    <div className="p-4 space-y-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-slate-100">Agent Results Search</h1>
        <p className="text-sm text-slate-400">
          {currentWorkspace ? `Workspace: ${currentWorkspace.name}` : 'No workspace selected'}
        </p>
      </header>

      <GlassCard
        title="Search"
        right={
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <label htmlFor="limit" className="sr-only">
              Limit
            </label>
            <select
              id="limit"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <label htmlFor="status" className="sr-only">
              Status
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
              className="rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1"
            >
              <option value="all">All statuses</option>
              <option value="succeeded">Succeeded</option>
              <option value="failed">Failed</option>
              <option value="running">Running</option>
              <option value="queued">Queued</option>
            </select>
            <label htmlFor="startedAfter" className="sr-only">
              Started after
            </label>
            <input
              id="startedAfter"
              type="datetime-local"
              value={startedAfter}
              onChange={(e) => setStartedAfter(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1"
            />
            <label htmlFor="startedBefore" className="sr-only">
              Started before
            </label>
            <input
              id="startedBefore"
              type="datetime-local"
              value={startedBefore}
              onChange={(e) => setStartedBefore(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1"
            />
            <label htmlFor="minDuration" className="sr-only">
              Min duration (ms)
            </label>
            <input
              id="minDuration"
              type="number"
              min={0}
              step={1000}
              placeholder="Min ms"
              value={minDuration}
              onChange={(e) => setMinDuration(e.target.value)}
              className="w-24 rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1"
            />
          </div>
        }
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tasks and steps…"
            className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-violet-600/40"
          />
          <button
            className="rounded-xl border border-slate-800 bg-violet-600/80 px-3 py-2 text-sm text-white hover:bg-violet-600 disabled:opacity-50"
            onClick={() => runSearch()}
            disabled={!canSearch || isLoading}
          >
            {isLoading ? 'Searching…' : 'Search'}
          </button>
        </div>
        {validationError && <p className="mt-2 text-xs text-amber-400">{validationError}</p>}
        {!validationError && error && <p className="mt-2 text-xs text-amber-300">{error}</p>}
      </GlassCard>

      <GlassCard title="Results" subtitle={hits ? `${hits.length} hits` : undefined}>
        {!hits ? (
          <div className="h-24 flex items-center justify-center text-sm text-slate-500">
            {isLoading ? 'Loading…' : 'Type at least 2 characters to search.'}
          </div>
        ) : hits.length === 0 ? (
          <div className="h-24 flex items-center justify-center text-sm text-slate-500">No results.</div>
        ) : (
          <ul className="space-y-3">
            {hits.map((h) => {
              const startedDate = parseDate(h.startedAt)
              const completedDate = parseDate(h.completedAt)
              const durationLabel = formatDurationMs(h.durationMs)
              return (
                <li key={h.taskId} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-slate-200 text-sm">
                        <span className="font-semibold">{h.taskType}</span>
                        <span className="ml-2 text-slate-400">{h.status}</span>
                      </p>
                      {h.taskDescription && (
                        <p className="text-xs text-slate-400 mt-1">{h.taskDescription}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2">
                        <span>Duration: {durationLabel}</span>
                        {startedDate && <span>Started: {startedDate.toLocaleString()}</span>}
                        {completedDate && <span>Completed: {completedDate.toLocaleString()}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/agent-results/${h.taskId}`)}
                        className="rounded-lg border border-violet-600/40 bg-violet-600/20 px-3 py-1 text-xs font-medium text-violet-200 transition hover:bg-violet-600/30"
                      >
                        View details
                      </button>
                      <span className="text-xs text-slate-400">rank {h.rank.toFixed(2)}</span>
                    </div>
                  </div>

                  {h.snippet && (
                    <div
                      className="prose prose-invert max-w-none mt-2 text-sm"
                      dangerouslySetInnerHTML={{ __html: h.snippet }}
                    />
                  )}

                  {h.steps.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Relevant steps</p>
                      <ul className="space-y-2">
                        {h.steps.map((s) => (
                          <li key={s.stepId} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 space-y-1">
                                <p className="text-sm text-slate-200">{s.action}</p>
                                {s.snippet && (
                                  <div
                                    className="prose prose-invert max-w-none text-xs text-slate-400"
                                    dangerouslySetInnerHTML={{ __html: s.snippet }}
                                  />
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <span className="text-xs text-slate-500">{s.status}</span>
                                <button
                                  type="button"
                                  onClick={() => navigate(`/agent-results/${h.taskId}#${s.stepId}`)}
                                  className="rounded-lg border border-violet-600/40 bg-violet-600/10 px-2 py-1 text-xs font-medium text-violet-200 transition hover:bg-violet-600/20"
                                >
                                  View step
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </GlassCard>
    </div>
  )
}
