import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuditTimeline } from '@/hooks/useReviewerWorkflow'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
import type { AuditEventFilters, AuditTimelineEvent } from '@shared/types'

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const statusBadge = (event: AuditTimelineEvent) => {
  if (event.acknowledgedAt) {
    return (
      <Badge className="bg-emerald-500/20 text-emerald-100 border border-emerald-500/40 text-xs">
        Acknowledged
      </Badge>
    )
  }
  return (
    <Badge className="bg-amber-500/20 text-amber-100 border border-amber-500/40 text-xs">
      Awaiting Review
    </Badge>
  )
}

export default function AuditTimelinePage() {
  const { currentWorkspace } = useWorkspaceContext()
  const [draftFilters, setDraftFilters] = useState<AuditEventFilters>({})

  const {
    events,
    loading,
    error,
    filters,
    setFilters,
    refresh,
    exportCsv,
    acknowledge
  } = useAuditTimeline(currentWorkspace?.id, { limit: 100 })

  const handleApplyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFilters(draftFilters)
  }

  const handleResetFilters = () => {
    setDraftFilters({})
    setFilters({})
  }

  const handleExportCsv = async () => {
    const csv = await exportCsv()
    if (!csv) return
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `workflow-${currentWorkspace?.id ?? 'timeline'}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleAcknowledge = async (event: AuditTimelineEvent) => {
    if (!currentWorkspace) return
    await acknowledge(event.id, {
      actorName: currentWorkspace.name,
      acknowledgementNote: 'Acknowledged via timeline'
    })
  }

  if (!currentWorkspace) {
    return (
      <div className="p-6 text-sm text-slate-400">
        Select a workspace to view the audit timeline.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <Card className="bg-slate-950/80 border-slate-800">
        <CardHeader>
          <CardTitle className="text-base text-slate-100">Audit Timeline</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Workspace activity, reviewer actions, reminders, and export history for {currentWorkspace.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleApplyFilters}
            className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 md:grid-cols-2 lg:grid-cols-3"
          >
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-slate-500">Stage</label>
              <Input
                value={draftFilters.stageSlug ?? ''}
                onChange={(e) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    stageSlug: e.target.value || undefined
                  }))
                }
                placeholder="memo"
                className="bg-slate-900 border-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-slate-500">Event Type</label>
              <Input
                value={draftFilters.eventType ?? ''}
                onChange={(e) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    eventType: e.target.value || undefined
                  }))
                }
                placeholder="assignment_created"
                className="bg-slate-900 border-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-slate-500">Acknowledged</label>
              <select
                value={
                  typeof draftFilters.acknowledged === 'boolean'
                    ? draftFilters.acknowledged
                      ? 'true'
                      : 'false'
                    : ''
                }
                onChange={(e) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    acknowledged:
                      e.target.value === ''
                        ? undefined
                        : e.target.value === 'true'
                  }))
                }
                className="h-9 rounded-md border border-slate-800 bg-slate-900 px-2 text-sm text-slate-200"
              >
                <option value="">All</option>
                <option value="true">Acknowledged</option>
                <option value="false">Unacknowledged</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-slate-500">Created After</label>
              <Input
                type="datetime-local"
                value={draftFilters.createdAfter ?? ''}
                onChange={(e) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    createdAfter: e.target.value || undefined
                  }))
                }
                className="bg-slate-900 border-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-slate-500">Created Before</label>
              <Input
                type="datetime-local"
                value={draftFilters.createdBefore ?? ''}
                onChange={(e) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    createdBefore: e.target.value || undefined
                  }))
                }
                className="bg-slate-900 border-slate-800"
              />
            </div>
            <div className="space-y-2 self-end">
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={loading}>
                  Apply
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={loading}
                  onClick={handleResetFilters}
                >
                  Reset
                </Button>
              </div>
              <div className="text-[11px] text-slate-500">
                Showing {events.length} events
                {filters?.stageSlug ? ` • Stage ${filters.stageSlug}` : ''}
              </div>
            </div>
          </form>
          <Separator className="my-4 bg-slate-800" />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <div>
              {loading
                ? 'Loading audit events…'
                : error
                  ? error
                  : `${events.length} event(s) loaded.`}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => void refresh()}>
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={() => void handleExportCsv()}>
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-950/80 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-100">Timeline Events</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Latest reviewer actions, reminders, exports, and audit signals
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="w-40">When</TableHead>
                <TableHead className="w-32">Stage</TableHead>
                <TableHead className="w-40">Event</TableHead>
                <TableHead className="w-48">Actor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => {
                return (
                  <TableRow key={event.id} className="border-slate-800">
                    <TableCell className="whitespace-nowrap text-xs text-slate-300">
                      {formatDate(event.createdAt)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {event.stageSlug ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-200">
                      {event.eventType}
                    </TableCell>
                    <TableCell className="space-y-1 text-xs text-slate-300">
                      <div>{event.actorName ?? '—'}</div>
                      {event.actorRole && (
                        <div className="text-[11px] text-slate-500">{event.actorRole}</div>
                      )}
                    </TableCell>
                    <TableCell>{statusBadge(event)}</TableCell>
                    <TableCell className="max-w-[320px] text-xs text-slate-300">
                      <pre className="whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-400">
                        {JSON.stringify(event.payload ?? {}, null, 2)}
                      </pre>
                    </TableCell>
                    <TableCell className="text-right">
                      {!event.acknowledgedAt ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-violet-300 hover:text-violet-200"
                          onClick={() => void handleAcknowledge(event)}
                        >
                          Mark Acknowledged
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-500">
                          Ack {formatDate(event.acknowledgedAt)}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {events.length === 0 && !loading && (
            <div className="py-6 text-center text-sm text-slate-500">
              No audit events recorded yet. Assign reviewers or trigger actions to populate the timeline.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
