import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchReviewerAssignments,
  createReviewerAssignment,
  updateReviewerAssignment,
  batchUpdateReviewerAssignments,
  fetchAuditTimeline,
  exportAuditTimelineCsv,
  createAuditEvent,
  acknowledgeAuditEvent,
  type ReviewerAssignmentQuery
} from '@/lib/workflow-api'
import type {
  ReviewerAssignment,
  ReviewerAssignmentInput,
  ReviewerAssignmentUpdateInput,
  ReviewerAssignmentStatus,
  AuditTimelineEvent,
  AuditEventFilters,
  AuditEventInput
} from '@shared/types'
import { useSessionKey } from './useSessionKey'

interface ReviewerWorkflowOptions {
  stageSlug?: string
  includeCancelled?: boolean
}

interface UseReviewerWorkflowResult {
  assignments: ReviewerAssignment[]
  loading: boolean
  error: string | null
  creating: boolean
  updating: boolean
  refresh: () => Promise<void>
  createAssignment: (input: ReviewerAssignmentInput) => Promise<ReviewerAssignment | null>
  updateAssignment: (
    assignmentId: number,
    input: ReviewerAssignmentUpdateInput
  ) => Promise<ReviewerAssignment | null>
  setStatus: (
    assignmentId: number,
    status: ReviewerAssignmentStatus,
    extra?: ReviewerAssignmentUpdateInput
  ) => Promise<ReviewerAssignment | null>
  batchUpdate: (
    assignmentIds: number[],
    input: ReviewerAssignmentUpdateInput
  ) => Promise<ReviewerAssignment[]>
}

interface UseAuditTimelineResult {
  events: AuditTimelineEvent[]
  loading: boolean
  error: string | null
  filters: AuditEventFilters | undefined
  setFilters: (filters: AuditEventFilters) => void
  refresh: () => Promise<void>
  exportCsv: () => Promise<string | null>
  createEvent: (input: AuditEventInput) => Promise<AuditTimelineEvent | null>
  acknowledge: (
    eventId: number,
    input: {
      actorId?: number | null
      actorName?: string | null
      acknowledgementNote?: string | null
    }
  ) => Promise<AuditTimelineEvent | null>
}

export function useReviewerWorkflow(
  workflowId?: number,
  options?: ReviewerWorkflowOptions
): UseReviewerWorkflowResult {
  const sessionKey = useSessionKey()
  const [assignments, setAssignments] = useState<ReviewerAssignment[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const query: ReviewerAssignmentQuery | undefined = useMemo(() => {
    if (!options) return undefined
    const params: ReviewerAssignmentQuery = {}
    if (options.stageSlug) params.stageSlug = options.stageSlug
    if (options.includeCancelled) params.includeCancelled = true
    return params
  }, [options])

  const refresh = useCallback(async () => {
    if (!workflowId) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetchReviewerAssignments(workflowId, query, sessionKey ?? undefined)
      setAssignments(response.assignments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviewer assignments')
    } finally {
      setLoading(false)
    }
  }, [workflowId, query, sessionKey])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createAssignment = useCallback(
    async (input: ReviewerAssignmentInput) => {
      if (!workflowId) return null
      setCreating(true)
      setError(null)
      try {
        const created = await createReviewerAssignment(workflowId, input, sessionKey ?? undefined)
        setAssignments((prev) => [created, ...prev])
        return created
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create reviewer assignment'
        setError(message)
        return null
      } finally {
        setCreating(false)
      }
    },
    [sessionKey, workflowId]
  )

  const updateAssignment = useCallback(
    async (assignmentId: number, input: ReviewerAssignmentUpdateInput) => {
      if (!workflowId) return null
      setUpdating(true)
      setError(null)
      try {
        const updated = await updateReviewerAssignment(
          workflowId,
          assignmentId,
          input,
          sessionKey ?? undefined
        )
        setAssignments((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
        return updated
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update reviewer assignment'
        setError(message)
        return null
      } finally {
        setUpdating(false)
      }
    },
    [sessionKey, workflowId]
  )

  const setStatus = useCallback(
    async (
      assignmentId: number,
      status: ReviewerAssignmentStatus,
      extra?: ReviewerAssignmentUpdateInput
    ) => {
      return await updateAssignment(assignmentId, { ...extra, status })
    },
    [updateAssignment]
  )

  const batchUpdate = useCallback(
    async (assignmentIds: number[], input: ReviewerAssignmentUpdateInput) => {
      if (!workflowId || assignmentIds.length === 0) return []
      setUpdating(true)
      setError(null)
      try {
        const updated = await batchUpdateReviewerAssignments(
          workflowId,
          assignmentIds,
          input,
          sessionKey ?? undefined
        )
        setAssignments((prev) => {
          const map = new Map(prev.map((assignment) => [assignment.id, assignment]))
          for (const item of updated) {
            map.set(item.id, item)
          }
          return Array.from(map.values()).sort((a, b) => b.id - a.id)
        })
        return updated
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to batch update assignments'
        setError(message)
        return []
      } finally {
        setUpdating(false)
      }
    },
    [sessionKey, workflowId]
  )

  return {
    assignments,
    loading,
    error,
    creating,
    updating,
    refresh,
    createAssignment,
    updateAssignment,
    setStatus,
    batchUpdate
  }
}

export function useAuditTimeline(
  workflowId?: number,
  initialFilters?: AuditEventFilters
): UseAuditTimelineResult {
  const sessionKey = useSessionKey()
  const [events, setEvents] = useState<AuditTimelineEvent[]>([])
  const [filters, setFilters] = useState<AuditEventFilters | undefined>(initialFilters)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveFilters = useMemo(() => filters, [filters])

  const refresh = useCallback(async () => {
    if (!workflowId) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetchAuditTimeline(
        workflowId,
        effectiveFilters,
        sessionKey ?? undefined
      )
      setEvents(response.events)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit events')
    } finally {
      setLoading(false)
    }
  }, [effectiveFilters, sessionKey, workflowId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const exportCsv = useCallback(async () => {
    if (!workflowId) return null
    try {
      return await exportAuditTimelineCsv(workflowId, effectiveFilters, sessionKey ?? undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export audit events')
      return null
    }
  }, [effectiveFilters, sessionKey, workflowId])

  const createEvent = useCallback(
    async (input: AuditEventInput) => {
      if (!workflowId) return null
      try {
        const event = await createAuditEvent(workflowId, input, sessionKey ?? undefined)
        setEvents((prev) => [event, ...prev])
        return event
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create audit event')
        return null
      }
    },
    [sessionKey, workflowId]
  )

  const acknowledge = useCallback(
    async (
      eventId: number,
      input: {
        actorId?: number | null
        actorName?: string | null
        acknowledgementNote?: string | null
      }
    ) => {
      if (!workflowId) return null
      try {
        const updated = await acknowledgeAuditEvent(
          workflowId,
          eventId,
          input,
          sessionKey ?? undefined
        )
        setEvents((prev) => prev.map((event) => (event.id === updated.id ? updated : event)))
        return updated
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to acknowledge audit event')
        return null
      }
    },
    [sessionKey, workflowId]
  )

  return {
    events,
    loading,
    error,
    filters,
    setFilters,
    refresh,
    exportCsv,
    createEvent,
    acknowledge
  }
}
