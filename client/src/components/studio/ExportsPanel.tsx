import { GlassCard } from '@/components/layout/GlassCard'
import { Button } from '@/components/ui/button'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
import { fetchArtifacts } from '@/lib/workspace-api'

export function ExportsPanel({ className = '' }: { className?: string }) {
  const { currentWorkspace } = useWorkspaceContext()

  const exportArtifactsCsv = async () => {
    if (!currentWorkspace?.id) return
    try {
      const arts = await fetchArtifacts(currentWorkspace.id, { stageSlug: 'studio' })
      const header = ['id', 'workflowId', 'stageSlug', 'type', 'name', 'createdAt', 'updatedAt']
      const rows = arts.map((a) => [
        a.id,
        a.workflowId,
        a.stageSlug,
        a.type,
        a.name.replaceAll(',', ' '),
        a.createdAt,
        a.updatedAt
      ])
      const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `studio-artifacts-${currentWorkspace.name}-${Date.now()}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      // silent fail; keep UI minimal
    }
  }

  const exportLatestSnapshotPng = async () => {
    if (!currentWorkspace?.id) return
    try {
      const arts = await fetchArtifacts(currentWorkspace.id, { stageSlug: 'studio', type: 'note' })
      if (!Array.isArray(arts) || arts.length === 0) return
      const first = arts[0]
      const img = (first.data as { image?: string } | null | undefined)?.image
      if (!img || typeof img !== 'string') return
      const link = document.createElement('a')
      link.href = img
      const ext = img.startsWith('data:image/jpeg') ? 'jpg' : 'png'
      link.download = `studio-snapshot-${first.id}.${ext}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch {
      // silent
    }
  }

  const exportLatestSnapshotMeta = async () => {
    if (!currentWorkspace?.id) return
    try {
      const arts = await fetchArtifacts(currentWorkspace.id, { stageSlug: 'studio', type: 'note' })
      if (!Array.isArray(arts) || arts.length === 0) return
      const first = arts[0]
      const data = first.data as Record<string, unknown> | null | undefined
      const metaOnly = { ...(data || {}) }
      // do not embed the base64 image in metadata file
      if ('image' in (metaOnly as Record<string, unknown>))
        delete (metaOnly as Record<string, unknown>)['image']
      const meta = {
        id: first.id,
        workflowId: first.workflowId,
        name: first.name,
        stageSlug: first.stageSlug,
        type: first.type,
        createdAt: first.createdAt,
        updatedAt: first.updatedAt,
        metadata: first.metadata,
        canvas: metaOnly
      }
      const blob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `studio-snapshot-${first.id}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      // silent
    }
  }

  return (
    <GlassCard title="Exports" subtitle="Download your work" className={className}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={exportArtifactsCsv} disabled={!currentWorkspace?.id}>
            Export Studio Artifacts (CSV)
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={exportLatestSnapshotPng}
            disabled={!currentWorkspace?.id}
          >
            Download Latest Snapshot (PNG)
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={exportLatestSnapshotMeta}
            disabled={!currentWorkspace?.id}
          >
            Download Snapshot Metadata (JSON)
          </Button>
        </div>
      </div>
    </GlassCard>
  )
}
