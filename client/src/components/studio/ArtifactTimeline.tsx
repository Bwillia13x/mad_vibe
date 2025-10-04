import { useEffect, useMemo, useState } from 'react'
import type { WorkspaceArtifact } from '@shared/types'
import { GlassCard } from '@/components/layout/GlassCard'
import { Button } from '@/components/ui/button'
import { fetchArtifacts } from '@/lib/workspace-api'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'

interface ArtifactTimelineProps {
  limit?: number
  className?: string
}

interface TimelineGroup {
  bucket: string
  items: WorkspaceArtifact[]
}

const DEFAULT_LIMIT = 15

export function ArtifactTimeline({ limit = DEFAULT_LIMIT, className }: ArtifactTimelineProps) {
  const { currentWorkspace } = useWorkspaceContext()
  const [artifacts, setArtifacts] = useState<WorkspaceArtifact[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!currentWorkspace?.id) return
      setIsLoading(true)
      setError(null)
      try {
        const results = await fetchArtifacts(currentWorkspace.id)
        if (!cancelled) {
          setArtifacts(results.slice(0, limit))
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load artifacts'
          setError(message)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()
    const interval = setInterval(load, 60_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [currentWorkspace?.id, limit])

  const groups: TimelineGroup[] = useMemo(() => {
    const map = new Map<string, WorkspaceArtifact[]>()
    for (const artifact of artifacts) {
      const bucket = formatDateKey(artifact.updatedAt)
      const list = map.get(bucket) ?? []
      list.push(artifact)
      map.set(bucket, list)
    }
    return Array.from(map.entries())
      .map(([bucket, items]) => ({ bucket, items: items.sort(sortByUpdatedAtDesc) }))
      .sort((a, b) => (a.bucket > b.bucket ? -1 : 1))
  }, [artifacts])

  return (
    <GlassCard
      title="Recent artifacts"
      subtitle="Latest canvas saves, macros, and exports"
      className={className}
    >
      {error && <p className="text-sm text-amber-400">{error}</p>}

      {isLoading && groups.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-sm text-slate-400">
          Loading artifacts…
        </div>
      ) : groups.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-sm text-slate-500">
          Nothing saved yet. Run tools in Studio to capture progress.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.bucket}>
              <header className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">{group.bucket}</p>
                {currentWorkspace?.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() =>
                      window.open(`/studio?workspace=${currentWorkspace.id}`, '_blank')
                    }
                  >
                    Open Studio
                  </Button>
                )}
              </header>
              <div className="space-y-2">
                {group.items.map((artifact) => (
                  <article
                    key={artifact.id}
                    className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm text-slate-100">{artifact.name}</p>
                        <p className="text-xs text-slate-400">
                          {artifact.type} • {artifact.stageSlug} •{' '}
                          {formatRelativeTime(artifact.updatedAt)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => downloadArtifact(artifact)}
                      >
                        Export JSON
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </GlassCard>
  )
}

function downloadArtifact(artifact: WorkspaceArtifact) {
  const blob = new Blob([JSON.stringify(artifact, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${artifact.name.replace(/\s+/g, '-')}-${artifact.id}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function formatDateKey(iso: string) {
  const date = new Date(iso)
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

function formatRelativeTime(iso: string) {
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const date = new Date(iso)
  const diffMs = date.getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / 60000)

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, 'minute')
  }
  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, 'hour')
  }
  const diffDays = Math.round(diffHours / 24)
  if (Math.abs(diffDays) < 30) {
    return formatter.format(diffDays, 'day')
  }
  const diffMonths = Math.round(diffDays / 30)
  if (Math.abs(diffMonths) < 12) {
    return formatter.format(diffMonths, 'month')
  }
  const diffYears = Math.round(diffMonths / 12)
  return formatter.format(diffYears, 'year')
}

function sortByUpdatedAtDesc(a: WorkspaceArtifact, b: WorkspaceArtifact) {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
}
