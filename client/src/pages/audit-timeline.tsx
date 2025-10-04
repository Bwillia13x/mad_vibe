import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useAuditTimeline } from '@/hooks/useReviewerWorkflow'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
import type {
  AuditEventFilters,
  AuditTimelineEvent,
  AuditExportSchedule,
  AuditExportScheduleInput
} from '@shared/types'
import {
  fetchAuditExportSchedules,
  createAuditExportSchedule,
  updateAuditExportSchedule,
  deactivateAuditExportSchedule
} from '@/lib/workflow-api'
import { cn } from '@/lib/utils'

interface ScheduleFormState {
  name: string
  frequency: string
  format: string
  actorRoles: string
  recipients: string
  nextRunAt: string
}

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

const visibilityLabel = (event: AuditTimelineEvent) => {
  if (!event.visibleToRoles || event.visibleToRoles.length === 0) return 'All roles'
  return event.visibleToRoles.join(', ')
}

export default function AuditTimelinePage() {
  const { currentWorkspace } = useWorkspaceContext()
  const [draftFilters, setDraftFilters] = useState<AuditEventFilters>({})
  const defaultScheduleForm: ScheduleFormState = {
    name: '',
    frequency: 'daily',
    format: 'csv',
    actorRoles: 'analyst,reviewer',
    recipients: '',
    nextRunAt: ''
  }
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>(defaultScheduleForm)
  const [schedules, setSchedules] = useState<AuditExportSchedule[]>([])
  const [schedulesLoading, setSchedulesLoading] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [creatingSchedule, setCreatingSchedule] = useState(false)
  const [updatingScheduleId, setUpdatingScheduleId] = useState<number | null>(null)

  const { events, loading, error, filters, setFilters, refresh, exportCsv, acknowledge } =
    useAuditTimeline(currentWorkspace?.id, { limit: 100 })

  const fetchSchedules = useCallback(async () => {
    if (!currentWorkspace?.id) {
      setSchedules([])
      return
    }
    setSchedulesLoading(true)
    setScheduleError(null)
    try {
      const data = await fetchAuditExportSchedules(currentWorkspace.id)
      setSchedules(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load schedules'
      setScheduleError(message)
    } finally {
      setSchedulesLoading(false)
    }
  }, [currentWorkspace?.id])

  useEffect(() => {
    void fetchSchedules()
  }, [fetchSchedules])

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

  const handleCreateSchedule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!currentWorkspace?.id) return

    const name = scheduleForm.name.trim()
    if (!name) {
      setScheduleError('Schedule name is required')
      return
    }

    const actorRoles = scheduleForm.actorRoles
      .split(',')
      .map((role) => role.trim())
      .filter((role) => role.length > 0)
    const recipients = scheduleForm.recipients
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .map((target) => ({ channel: 'email', target }))

    const payload: AuditExportScheduleInput = {
      name,
      frequency: scheduleForm.frequency,
      format: scheduleForm.format,
      actorRoles,
      recipients,
      nextRunAt: scheduleForm.nextRunAt ? new Date(scheduleForm.nextRunAt).toISOString() : undefined
    }

    setCreatingSchedule(true)
    setScheduleError(null)
    try {
      const created = await createAuditExportSchedule(currentWorkspace.id, payload)
      setSchedules((prev) => [created, ...prev])
      setScheduleForm(defaultScheduleForm)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create schedule'
      setScheduleError(message)
    } finally {
      setCreatingSchedule(false)
    }
  }

  const handleDeactivateSchedule = async (schedule: AuditExportSchedule) => {
    if (!currentWorkspace?.id) return
    setUpdatingScheduleId(schedule.id)
    setScheduleError(null)
    try {
      const updated = await deactivateAuditExportSchedule(currentWorkspace.id, schedule.id)
      setSchedules((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update schedule'
      setScheduleError(message)
    } finally {
      setUpdatingScheduleId(null)
    }
  }

  const handleReactivateSchedule = async (schedule: AuditExportSchedule) => {
    if (!currentWorkspace?.id) return
    setUpdatingScheduleId(schedule.id)
    setScheduleError(null)
    try {
      const updated = await updateAuditExportSchedule(currentWorkspace.id, schedule.id, {
        active: true,
        nextRunAt: schedule.nextRunAt ?? undefined
      })
      setSchedules((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update schedule'
      setScheduleError(message)
    } finally {
      setUpdatingScheduleId(null)
    }
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
            Workspace activity, reviewer actions, reminders, and export history for{' '}
            {currentWorkspace.name}
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
              <label className="text-xs uppercase tracking-wide text-slate-500">Actor Role</label>
              <Input
                value={draftFilters.actorRole ?? ''}
                onChange={(e) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    actorRole: e.target.value || undefined
                  }))
                }
                placeholder="reviewer"
                className="bg-slate-900 border-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-slate-500">
                Visible To Role
              </label>
              <Input
                value={draftFilters.visibleToRole ?? ''}
                onChange={(e) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    visibleToRole: e.target.value || undefined
                  }))
                }
                placeholder="analyst"
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
                    acknowledged: e.target.value === '' ? undefined : e.target.value === 'true'
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
              <label className="text-xs uppercase tracking-wide text-slate-500">
                Created After
              </label>
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
              <label className="text-xs uppercase tracking-wide text-slate-500">
                Created Before
              </label>
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
        <CardHeader>
          <CardTitle className="text-base text-slate-100">Scheduled Exports</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Automate audit timeline exports with role-aware visibility and delivery targets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {scheduleError && (
            <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {scheduleError}
            </div>
          )}

          <form
            onSubmit={handleCreateSchedule}
            className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 md:grid-cols-2 lg:grid-cols-3"
          >
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-slate-500">Name</label>
              <Input
                value={scheduleForm.name}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Overdue reviewer report"
                className="bg-slate-900 border-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-slate-500">Frequency</label>
              <Select
                value={scheduleForm.frequency}
                onValueChange={(value) =>
                  setScheduleForm((prev) => ({
                    ...prev,
                    frequency: value
                  }))
                }
              >
                <SelectTrigger className="bg-slate-900 border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-slate-500">Format</label>
              <Select
                value={scheduleForm.format}
                onValueChange={(value) =>
                  setScheduleForm((prev) => ({
                    ...prev,
                    format: value
                  }))
                }
              >
                <SelectTrigger className="bg-slate-900 border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs uppercase tracking-wide text-slate-500">Actor Roles</label>
              <Input
                value={scheduleForm.actorRoles}
                onChange={(e) =>
                  setScheduleForm((prev) => ({ ...prev, actorRoles: e.target.value }))
                }
                placeholder="analyst,reviewer"
                className="bg-slate-900 border-slate-800"
              />
              <p className="text-[11px] text-slate-500">
                Comma-separated roles allowed to view the export.
              </p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs uppercase tracking-wide text-slate-500">
                Recipients (email)
              </label>
              <Input
                value={scheduleForm.recipients}
                onChange={(e) =>
                  setScheduleForm((prev) => ({ ...prev, recipients: e.target.value }))
                }
                placeholder="ops@example.com, reviewer@example.com"
                className="bg-slate-900 border-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-slate-500">Next Run</label>
              <Input
                type="datetime-local"
                value={scheduleForm.nextRunAt}
                onChange={(e) =>
                  setScheduleForm((prev) => ({ ...prev, nextRunAt: e.target.value }))
                }
                className="bg-slate-900 border-slate-800"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex items-center gap-2">
              <Button type="submit" size="sm" disabled={creatingSchedule}>
                {creatingSchedule ? 'Creating…' : 'Create Schedule'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setScheduleForm(defaultScheduleForm)}
              >
                Reset
              </Button>
            </div>
          </form>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <div>
              {schedulesLoading
                ? 'Loading schedules…'
                : `${schedules.length} schedule(s) configured.`}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void fetchSchedules()}
              disabled={schedulesLoading}
            >
              Refresh
            </Button>
          </div>

          <div className="space-y-3">
            {schedules.map((schedule) => {
              const nextRun = formatDate(schedule.nextRunAt)
              const lastRun = formatDate(schedule.lastRunAt)
              const recipientList = schedule.recipients.map((entry) => entry.target).join(', ')
              return (
                <div
                  key={schedule.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-slate-100 font-medium">{schedule.name}</div>
                      <div className="text-xs text-slate-500">
                        {schedule.frequency} • {schedule.format.toUpperCase()}
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        'text-xs',
                        schedule.active
                          ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/40'
                          : 'bg-slate-800/60 text-slate-300'
                      )}
                    >
                      {schedule.active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>

                  <div className="mt-2 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
                    <div>
                      <span className="text-slate-500">Next Run </span>
                      {nextRun ?? '—'}
                    </div>
                    <div>
                      <span className="text-slate-500">Last Run </span>
                      {lastRun ?? '—'}
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-slate-500">Recipients </span>
                      {recipientList || '—'}
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-slate-500">Actor Roles </span>
                      {schedule.actorRoles.length ? schedule.actorRoles.join(', ') : '—'}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs">
                    {schedule.active ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingScheduleId === schedule.id}
                        onClick={() => void handleDeactivateSchedule(schedule)}
                      >
                        {updatingScheduleId === schedule.id ? 'Updating…' : 'Deactivate'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingScheduleId === schedule.id}
                        onClick={() => void handleReactivateSchedule(schedule)}
                      >
                        {updatingScheduleId === schedule.id ? 'Updating…' : 'Reactivate'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}

            {!schedulesLoading && schedules.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/50 px-4 py-6 text-center text-sm text-slate-500">
                No scheduled exports yet. Create one to automate audit distribution.
              </div>
            )}
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
                <TableHead className="w-40">Visibility</TableHead>
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
                    <TableCell className="text-xs text-slate-400">
                      {visibilityLabel(event)}
                    </TableCell>
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
              No audit events recorded yet. Assign reviewers or trigger actions to populate the
              timeline.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
