import { useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useReviewerWorkflow } from '@/hooks/useReviewerWorkflow'
import type {
  ReviewerAssignment,
  ReviewerAssignmentInput,
  ReviewerAssignmentStatus,
  ReviewerSlaStatus
} from '@shared/types'

interface ReviewerAssignmentPanelProps {
  workspaceId: number
  stageSlug?: string
}

const STATUS_COPY: Record<ReviewerAssignmentStatus, { label: string; tone: string }> = {
  pending: { label: 'Pending', tone: 'bg-slate-800/60 text-slate-200' },
  in_review: {
    label: 'In Review',
    tone: 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
  },
  approved: {
    label: 'Approved',
    tone: 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/40'
  },
  rejected: { label: 'Rejected', tone: 'bg-rose-500/20 text-rose-100 border border-rose-500/40' },
  cancelled: { label: 'Cancelled', tone: 'bg-slate-900/60 text-slate-400' }
}

const SLA_COPY: Record<ReviewerSlaStatus, { label: string; tone: string }> = {
  on_track: {
    label: 'On Track',
    tone: 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/40'
  },
  due_soon: {
    label: 'Due Soon',
    tone: 'bg-amber-500/20 text-amber-100 border border-amber-500/40'
  },
  overdue: {
    label: 'Overdue',
    tone: 'bg-rose-500/20 text-rose-100 border border-rose-500/40'
  },
  escalated: {
    label: 'Escalated',
    tone: 'bg-violet-500/20 text-violet-100 border border-violet-500/40'
  }
}

const statusOrder: ReviewerAssignmentStatus[] = [
  'pending',
  'in_review',
  'approved',
  'rejected',
  'cancelled'
]

function formatDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function formatDueTiming(value: string | null): string | null {
  if (!value) return null
  const due = new Date(value)
  if (Number.isNaN(due.getTime())) return null
  const diffMs = due.getTime() - Date.now()
  const diffHours = Math.round(diffMs / (1000 * 60 * 60))
  if (diffHours >= 48) {
    const days = Math.round(diffHours / 24)
    return `Due in ${days}d`
  }
  if (diffHours >= 2) {
    return `Due in ${diffHours}h`
  }
  if (diffHours >= 0) {
    return 'Due soon'
  }
  const overdueHours = Math.abs(diffHours)
  if (overdueHours >= 48) {
    const days = Math.round(overdueHours / 24)
    return `Overdue ${days}d`
  }
  return `Overdue ${overdueHours}h`
}

function buildInitialForm(stageSlug?: string): ReviewerAssignmentInput {
  return {
    stageSlug: stageSlug ?? 'memo',
    reviewerName: '',
    reviewerEmail: '',
    dueAt: '',
    notes: ''
  }
}

export function ReviewerAssignmentPanel({ workspaceId, stageSlug }: ReviewerAssignmentPanelProps) {
  const [, navigate] = useLocation()
  const [form, setForm] = useState<ReviewerAssignmentInput>(() => buildInitialForm(stageSlug))
  const [showForm, setShowForm] = useState(false)
  const buildBatchForm = () => ({
    reviewerName: '',
    reviewerEmail: '',
    dueAt: '',
    slaStatus: 'inherit' as 'inherit' | ReviewerSlaStatus
  })
  const [batchForm, setBatchForm] = useState(buildBatchForm())
  const [showBatchForm, setShowBatchForm] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const {
    assignments,
    loading,
    creating,
    updating,
    error,
    refresh,
    createAssignment,
    setStatus,
    updateAssignment,
    batchUpdate
  } = useReviewerWorkflow(workspaceId, { stageSlug })

  const groupedAssignments = useMemo(() => {
    const groups: Partial<Record<ReviewerAssignmentStatus, ReviewerAssignment[]>> = {}
    for (const assignment of assignments) {
      const bucket = groups[assignment.status] ?? []
      bucket.push(assignment)
      groups[assignment.status] = bucket
    }
    return groups
  }, [assignments])

  const slaSummary = useMemo(() => {
    const summary: Record<ReviewerSlaStatus, number> = {
      on_track: 0,
      due_soon: 0,
      overdue: 0,
      escalated: 0
    }
    for (const assignment of assignments) {
      summary[assignment.slaStatus] = (summary[assignment.slaStatus] ?? 0) + 1
    }
    return summary
  }, [assignments])

  const selectedAssignments = useMemo(
    () => assignments.filter((assignment) => selectedIds.includes(assignment.id)),
    [assignments, selectedIds]
  )

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.stageSlug.trim()) return
    const payload: ReviewerAssignmentInput = {
      stageSlug: form.stageSlug,
      reviewerName: form.reviewerName?.trim() || undefined,
      reviewerEmail: form.reviewerEmail?.trim() || undefined,
      dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
      notes: form.notes?.trim() || undefined
    }
    const created = await createAssignment(payload)
    if (created) {
      setForm(buildInitialForm(stageSlug))
      setShowForm(false)
    }
  }

  const handleReminder = async (assignment: ReviewerAssignment) => {
    await updateAssignment(assignment.id, { sendReminder: true })
  }

  const handleEscalate = async (assignment: ReviewerAssignment) => {
    await updateAssignment(assignment.id, {
      slaStatus: 'escalated',
      escalationLevel: (assignment.escalationLevel ?? 0) + 1
    })
  }

  const toggleSelection = (assignmentId: number, next?: boolean) => {
    setSelectedIds((prev) => {
      const set = new Set(prev)
      const shouldSelect = typeof next === 'boolean' ? next : !set.has(assignmentId)
      if (shouldSelect) {
        set.add(assignmentId)
      } else {
        set.delete(assignmentId)
      }
      return Array.from(set.values())
    })
  }

  const clearSelection = () => {
    setSelectedIds([])
    setShowBatchForm(false)
    setBatchForm(buildBatchForm())
  }

  const handleBatchSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (selectedIds.length === 0) return
    const payload: ReviewerAssignmentUpdateInput = {}
    if (batchForm.reviewerName.trim()) payload.reviewerName = batchForm.reviewerName.trim()
    if (batchForm.reviewerEmail.trim()) payload.reviewerEmail = batchForm.reviewerEmail.trim()
    if (batchForm.dueAt) {
      const due = new Date(batchForm.dueAt)
      if (!Number.isNaN(due.getTime())) {
        payload.dueAt = due.toISOString()
      }
    }
    if (batchForm.slaStatus !== 'inherit') {
      payload.slaStatus = batchForm.slaStatus
    }
    if (Object.keys(payload).length === 0) {
      return
    }
    payload.batchId = `batch-${Date.now()}`
    await batchUpdate(selectedIds, payload)
    clearSelection()
  }

  const handleReminderSelected = async () => {
    for (const assignment of selectedAssignments) {
      await updateAssignment(assignment.id, { sendReminder: true })
    }
  }

  const handleEscalateSelected = async () => {
    for (const assignment of selectedAssignments) {
      await updateAssignment(assignment.id, {
        slaStatus: 'escalated',
        escalationLevel: (assignment.escalationLevel ?? 0) + 1
      })
    }
    clearSelection()
  }

  const allSelected = selectedIds.length > 0 && selectedIds.length === assignments.length

  const disableActions = creating || updating

  return (
    <Card className="bg-slate-950/80 border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-base text-slate-100">Reviewer Workflow</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Assign reviewers, track status, and send reminders for {stageSlug ?? 'stages'}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 text-xs"
            onClick={() => navigate('/audit-timeline')}
          >
            Audit Timeline
          </Button>
          <Button
            variant={showForm ? 'secondary' : 'default'}
            size="sm"
            onClick={() => setShowForm((prev) => !prev)}
          >
            {showForm ? 'Close' : 'Assign Reviewer'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="reviewer-name">Reviewer Name</Label>
                <Input
                  id="reviewer-name"
                  value={form.reviewerName ?? ''}
                  placeholder="Taylor Smith"
                  onChange={(e) => setForm((prev) => ({ ...prev, reviewerName: e.target.value }))}
                  className="bg-slate-900 border-slate-800"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reviewer-email">Email</Label>
                <Input
                  id="reviewer-email"
                  type="email"
                  value={form.reviewerEmail ?? ''}
                  placeholder="taylor@example.com"
                  onChange={(e) => setForm((prev) => ({ ...prev, reviewerEmail: e.target.value }))}
                  className="bg-slate-900 border-slate-800"
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="stage-slug">Stage</Label>
                <Input
                  id="stage-slug"
                  value={form.stageSlug}
                  onChange={(e) => setForm((prev) => ({ ...prev, stageSlug: e.target.value }))}
                  className="bg-slate-900 border-slate-800"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="due-at">Due Date</Label>
                <Input
                  id="due-at"
                  type="datetime-local"
                  value={form.dueAt ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, dueAt: e.target.value }))}
                  className="bg-slate-900 border-slate-800"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="bg-slate-900 border-slate-800 text-sm"
                placeholder="Remind reviewer of focus areas, deadlines, or deliverables."
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={creating}>
                {creating ? 'Assigning…' : 'Create Assignment'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={creating}
                onClick={() => {
                  setShowForm(false)
                  setForm(buildInitialForm(stageSlug))
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              SLA Overview
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {(Object.keys(SLA_COPY) as ReviewerSlaStatus[]).map((status) => (
                <Badge key={status} className={cn('px-2 py-1', SLA_COPY[status].tone)}>
                  {SLA_COPY[status].label}: {slaSummary[status] ?? 0}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="space-y-3 rounded-xl border border-violet-700/50 bg-violet-950/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-violet-200">
                {selectedIds.length} assignment(s) selected
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-violet-600 text-violet-200"
                  onClick={() => setSelectedIds(assignments.map((assignment) => assignment.id))}
                  disabled={assignments.length === 0}
                >
                  Select All
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-violet-200"
                  onClick={clearSelection}
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={updating}
                onClick={() => setShowBatchForm((prev) => !prev)}
              >
                {showBatchForm ? 'Close Batch Form' : 'Reassign Selected'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleReminderSelected()}
                disabled={updating}
              >
                Send Reminder
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleEscalateSelected()}
                disabled={updating}
              >
                Escalate
              </Button>
            </div>
            {showBatchForm && (
              <form
                onSubmit={handleBatchSubmit}
                className="grid gap-3 rounded-lg border border-violet-700/40 bg-slate-950/60 p-4 md:grid-cols-2"
              >
                <div className="space-y-1">
                  <Label htmlFor="batch-reviewer-name">Reviewer Name</Label>
                  <Input
                    id="batch-reviewer-name"
                    value={batchForm.reviewerName}
                    onChange={(e) =>
                      setBatchForm((prev) => ({ ...prev, reviewerName: e.target.value }))
                    }
                    placeholder="Taylor Smith"
                    className="bg-slate-900 border-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="batch-reviewer-email">Email</Label>
                  <Input
                    id="batch-reviewer-email"
                    type="email"
                    value={batchForm.reviewerEmail}
                    onChange={(e) =>
                      setBatchForm((prev) => ({ ...prev, reviewerEmail: e.target.value }))
                    }
                    placeholder="reviewer@example.com"
                    className="bg-slate-900 border-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="batch-due-at">Due Date</Label>
                  <Input
                    id="batch-due-at"
                    type="datetime-local"
                    value={batchForm.dueAt}
                    onChange={(e) => setBatchForm((prev) => ({ ...prev, dueAt: e.target.value }))}
                    className="bg-slate-900 border-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <Label>SLA Status</Label>
                  <Select
                    value={batchForm.slaStatus}
                    onValueChange={(value) =>
                      setBatchForm((prev) => ({
                        ...prev,
                        slaStatus: value as 'inherit' | ReviewerSlaStatus
                      }))
                    }
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-800 text-left">
                      <SelectValue placeholder="Keep existing" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                      <SelectItem value="inherit">Keep existing</SelectItem>
                      {(Object.keys(SLA_COPY) as ReviewerSlaStatus[]).map((status) => (
                        <SelectItem key={status} value={status}>
                          {SLA_COPY[status].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                  <Button type="submit" size="sm" disabled={updating}>
                    Apply Changes
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBatchForm(buildBatchForm())
                      setShowBatchForm(false)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-400">
          <div>
            {loading
              ? 'Loading reviewer assignments…'
              : `${assignments.length} assignment(s) tracked.`}
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="text-violet-300 hover:text-violet-200"
          >
            Refresh
          </button>
        </div>

        {statusOrder.map((status) => {
          const items = groupedAssignments[status]
          if (!items || items.length === 0) return null
          return (
            <div key={status} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {STATUS_COPY[status].label}
                </span>
                <span className="text-[11px] text-slate-500">{items.length} reviewer(s)</span>
              </div>
              <div className="space-y-3">
                {items.map((assignment) => {
                  const isSelected = selectedIds.includes(assignment.id)
                  const dueLabel = formatDate(assignment.dueAt)
                  const dueTiming = formatDueTiming(assignment.dueAt)
                  const lastReminder = formatDate(assignment.lastReminderAt)
                  const escalationLevel = assignment.escalationLevel ?? 0
                  return (
                    <div
                      key={assignment.id}
                      className={cn(
                        'rounded-xl border bg-slate-950/60 p-3 text-sm shadow-sm transition-colors',
                        isSelected ? 'border-violet-600/60 bg-violet-900/20' : 'border-slate-800'
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              toggleSelection(assignment.id, Boolean(checked))
                            }
                          />
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2 text-slate-100 font-medium">
                              <span>
                                {assignment.reviewerName ||
                                  assignment.reviewerEmail ||
                                  'Unassigned Reviewer'}
                              </span>
                              {assignment.reviewerEmail && assignment.reviewerName && (
                                <span className="text-xs text-slate-500">
                                  {assignment.reviewerEmail}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span>Stage • {assignment.stageSlug}</span>
                              {dueTiming && <span>{dueTiming}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={cn('text-xs', STATUS_COPY[assignment.status].tone)}>
                            {STATUS_COPY[assignment.status].label}
                          </Badge>
                          <Badge className={cn('text-xs', SLA_COPY[assignment.slaStatus].tone)}>
                            {SLA_COPY[assignment.slaStatus].label}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
                        <div>
                          <span className="text-slate-500">Due </span>
                          {dueLabel ?? '—'}
                        </div>
                        <div>
                          <span className="text-slate-500">Assigned </span>
                          {formatDate(assignment.assignedAt) ?? '—'}
                        </div>
                        <div>
                          <span className="text-slate-500">Reminders </span>
                          {assignment.reminderCount}
                          {lastReminder ? ` • Last ${lastReminder}` : ''}
                        </div>
                        <div>
                          <span className="text-slate-500">Escalation </span>
                          {escalationLevel > 0 ? `Level ${escalationLevel}` : 'None'}
                        </div>
                        <div>
                          <span className="text-slate-500">Assigned By </span>
                          {assignment.assignedByName ?? '—'}
                        </div>
                      </div>

                      {assignment.notes && (
                        <div className="mt-2 rounded border border-slate-800 bg-slate-950/80 p-2 text-xs text-slate-300">
                          {assignment.notes}
                        </div>
                      )}

                      <Separator className="my-3 bg-slate-800" />

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {assignment.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={disableActions}
                            onClick={() => void setStatus(assignment.id, 'in_review')}
                          >
                            Start Review
                          </Button>
                        )}
                        {(assignment.status === 'pending' || assignment.status === 'in_review') && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={disableActions}
                            onClick={() => void setStatus(assignment.id, 'approved')}
                          >
                            Approve
                          </Button>
                        )}
                        {(assignment.status === 'pending' || assignment.status === 'in_review') && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-rose-500/40 text-rose-200 hover:bg-rose-500/20"
                            disabled={disableActions}
                            onClick={() => void setStatus(assignment.id, 'rejected')}
                          >
                            Reject
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-violet-300 hover:text-violet-200"
                          disabled={disableActions}
                          onClick={() => void handleReminder(assignment)}
                        >
                          Send Reminder
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-violet-300 hover:text-violet-200"
                          disabled={disableActions}
                          onClick={() => void handleEscalate(assignment)}
                        >
                          Escalate
                        </Button>
                        <div className="ml-auto text-[11px] text-slate-500">
                          Updated{' '}
                          {formatDate(assignment.lastReminderAt ?? assignment.assignedAt) ?? '—'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {assignments.length === 0 && !loading && (
          <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/50 px-4 py-6 text-center text-sm text-slate-500">
            No reviewer assignments yet. Create one to start tracking approvals.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
