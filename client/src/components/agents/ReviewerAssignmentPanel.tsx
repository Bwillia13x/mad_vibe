import { useState, useMemo } from 'react'
import { useLocation } from 'wouter'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useReviewerWorkflow } from '@/hooks/useReviewerWorkflow'
import type {
  ReviewerAssignment,
  ReviewerAssignmentInput,
  ReviewerAssignmentStatus
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

  const {
    assignments,
    loading,
    creating,
    updating,
    error,
    refresh,
    createAssignment,
    setStatus,
    updateAssignment
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
                  const dueLabel = formatDate(assignment.dueAt)
                  const lastReminder = formatDate(assignment.lastReminderAt)
                  return (
                    <div
                      key={assignment.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="text-slate-100 font-medium">
                            {assignment.reviewerName ||
                              assignment.reviewerEmail ||
                              'Unassigned Reviewer'}
                          </span>
                          <span className="text-xs text-slate-500">
                            Stage • {assignment.stageSlug}
                          </span>
                        </div>
                        <Badge className={cn('text-xs', STATUS_COPY[assignment.status].tone)}>
                          {STATUS_COPY[assignment.status].label}
                        </Badge>
                      </div>

                      <div className="mt-2 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
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
