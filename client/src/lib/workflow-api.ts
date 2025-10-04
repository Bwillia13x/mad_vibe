declare const process: { env?: Record<string, string | undefined> } | undefined

import type {
  MemoComposerStatePayload,
  MemoComposerStateInput,
  DataNormalizationStatePayload,
  DataNormalizationStateInput,
  ValuationStatePayload,
  ValuationStateInput,
  MonitoringStatePayload,
  MonitoringStateInput,
  ResearchLogEntry,
  ResearchLogInput,
  PresenceTelemetryEvent,
  PresenceConflictPayload,
  ReviewerAssignment,
  ReviewerAssignmentInput,
  ReviewerAssignmentUpdateInput,
  ReviewerAssignmentStatus,
  ReviewerSlaStatus,
  AuditTimelineEvent,
  AuditEventInput,
  AuditEventFilters,
  AuditExportSchedule,
  AuditExportScheduleInput,
  AuditExportScheduleUpdate,
  MemoSharedDraftPayload,
  MemoSharedDraftInput,
  MemoSuggestion,
  MemoSuggestionInput,
  MemoSuggestionUpdate,
  MemoSuggestionStatus
} from '@shared/types'

export interface PresencePeerPayload {
  actorId: string
  stageSlug: string
  updatedAt: string
  sessionId?: string
  revision?: number | null
  locked?: boolean
}

export interface PresenceHeartbeatResponse {
  actorId: string
  sessionId: string | null
  stageSlug: string
  peers: PresencePeerPayload[]
  revision: number | null
  lockOwner: string | null
  lockExpiresAt: string | null
  conflict: PresenceConflictPayload | null
}

const BASE_URL = '/api/workflow'

const resolveAdminToken = (): string | undefined => {
  try {
    const viteToken = (import.meta as unknown as { env?: Record<string, unknown> })?.env
      ?.VITE_ADMIN_TOKEN
    if (typeof viteToken === 'string' && viteToken.trim().length > 0) {
      return viteToken.trim()
    }
  } catch {
    // ignore
  }

  const globalToken =
    typeof globalThis !== 'undefined' &&
    (globalThis as { __ADMIN_TOKEN__?: unknown }).__ADMIN_TOKEN__
  if (typeof globalToken === 'string' && globalToken.trim().length > 0) {
    return globalToken.trim()
  }

  if (typeof process !== 'undefined') {
    const procToken = process.env?.ADMIN_TOKEN
    if (typeof procToken === 'string' && procToken.trim().length > 0) {
      return procToken.trim()
    }
  }

  return undefined
}

const ADMIN_BEARER = resolveAdminToken()

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text()
    const error = new Error(text || res.statusText) as Error & { status?: number }
    error.status = res.status
    throw error
  }
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

type SessionHeaders = {
  [key: string]: string
}

const buildHeaders = (sessionKey: string, extra?: SessionHeaders): HeadersInit => {
  const headers: Record<string, string> = {
    ...(extra ?? {}),
    'x-session-key': sessionKey
  }

  if (!headers.Authorization && ADMIN_BEARER) {
    headers.Authorization = `Bearer ${ADMIN_BEARER}`
  }

  return headers
}

export async function fetchMemoComposerState(
  sessionKey: string
): Promise<MemoComposerStatePayload | null> {
  const res = await fetch(`${BASE_URL}/memo-state`, {
    credentials: 'include',
    headers: buildHeaders(sessionKey)
  })
  return await handleResponse<MemoComposerStatePayload | null>(res)
}

export async function persistMemoComposerState(
  sessionKey: string,
  state: MemoComposerStateInput
): Promise<MemoComposerStatePayload> {
  const res = await fetch(`${BASE_URL}/memo-state`, {
    method: 'PUT',
    credentials: 'include',
    headers: buildHeaders(sessionKey, {
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify(state)
  })
  return await handleResponse<MemoComposerStatePayload>(res)
}

export async function fetchNormalizationState(
  sessionKey: string
): Promise<DataNormalizationStatePayload | null> {
  const res = await fetch(`${BASE_URL}/normalization-state`, {
    credentials: 'include',
    headers: buildHeaders(sessionKey)
  })
  return await handleResponse<DataNormalizationStatePayload | null>(res)
}

export async function persistNormalizationState(
  sessionKey: string,
  state: DataNormalizationStateInput
): Promise<DataNormalizationStatePayload> {
  const res = await fetch(`${BASE_URL}/normalization-state`, {
    method: 'PUT',
    credentials: 'include',
    headers: buildHeaders(sessionKey, {
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify(state)
  })
  return await handleResponse<DataNormalizationStatePayload>(res)
}

export async function fetchValuationState(
  sessionKey: string
): Promise<ValuationStatePayload | null> {
  const res = await fetch(`${BASE_URL}/valuation-state`, {
    credentials: 'include',
    headers: buildHeaders(sessionKey)
  })
  return await handleResponse<ValuationStatePayload | null>(res)
}

export async function persistValuationState(
  sessionKey: string,
  state: ValuationStateInput
): Promise<ValuationStatePayload> {
  const res = await fetch(`${BASE_URL}/valuation-state`, {
    method: 'PUT',
    credentials: 'include',
    headers: buildHeaders(sessionKey, {
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify(state)
  })
  return await handleResponse<ValuationStatePayload>(res)
}

export async function fetchMonitoringState(
  sessionKey: string
): Promise<MonitoringStatePayload | null> {
  const res = await fetch(`${BASE_URL}/monitoring-state`, {
    credentials: 'include',
    headers: buildHeaders(sessionKey)
  })
  return await handleResponse<MonitoringStatePayload | null>(res)
}

export async function persistMonitoringState(
  sessionKey: string,
  state: MonitoringStateInput
): Promise<MonitoringStatePayload> {
  const res = await fetch(`${BASE_URL}/monitoring-state`, {
    method: 'PUT',
    credentials: 'include',
    headers: buildHeaders(sessionKey, {
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify(state)
  })
  return await handleResponse<MonitoringStatePayload>(res)
}

export async function fetchResearchLog(): Promise<ResearchLogEntry[]> {
  const res = await fetch(`${BASE_URL}/research-log`, {
    credentials: 'include',
    headers: buildAdminHeaders(undefined)
  })
  return await handleResponse<ResearchLogEntry[]>(res)
}

export async function persistResearchLogEntry(
  entry: ResearchLogInput & { timestamp?: string }
): Promise<ResearchLogEntry> {
  const res = await fetch(`${BASE_URL}/research-log`, {
    method: 'POST',
    credentials: 'include',
    headers: buildAdminHeaders(undefined, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(entry)
  })
  return await handleResponse<ResearchLogEntry>(res)
}

type PresenceHeartbeatOptions = {
  actorId?: string
  revision?: number
  lock?: boolean
}

export async function sendPresenceHeartbeat(
  sessionKey: string,
  stageSlug: string,
  options?: string | PresenceHeartbeatOptions
): Promise<PresenceHeartbeatResponse> {
  const actorId = typeof options === 'string' ? options : options?.actorId
  const revision = typeof options === 'object' && options ? options.revision : undefined
  const lockRequest = typeof options === 'object' && options ? options.lock === true : false

  const headers = buildHeaders(sessionKey, {
    'Content-Type': 'application/json',
    ...(actorId ? { 'x-actor-id': actorId } : {})
  })

  const body: Record<string, unknown> = { stageSlug }
  if (typeof revision === 'number' && Number.isFinite(revision)) {
    body.revision = revision
  }
  if (lockRequest) {
    body.lockRequest = true
  }

  const res = await fetch(`${BASE_URL}/presence/heartbeat`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(body)
  })
  return await handleResponse<PresenceHeartbeatResponse>(res)
}

export async function fetchPresencePeers(
  sessionKey: string,
  stageSlug: string
): Promise<PresencePeerPayload[]> {
  const res = await fetch(`${BASE_URL}/presence?stage=${encodeURIComponent(stageSlug)}`, {
    credentials: 'include',
    headers: buildHeaders(sessionKey)
  })
  return await handleResponse<PresencePeerPayload[]>(res)
}

export async function sendPresenceTelemetry(
  sessionKey: string,
  event: PresenceTelemetryEvent
): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/presence/telemetry`, {
    method: 'POST',
    credentials: 'include',
    headers: buildHeaders(sessionKey, {
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify(event)
  })
  const result = await handleResponse<{ success: boolean }>(res)
  return Boolean(result?.success)
}

export interface ReviewerAssignmentQuery {
  stageSlug?: string
  status?: ReviewerAssignmentStatus | ReviewerAssignmentStatus[]
  reviewerId?: number
  includeCancelled?: boolean
  limit?: number
  offset?: number
  dueBefore?: string
  dueAfter?: string
  slaStatus?: ReviewerSlaStatus | ReviewerSlaStatus[]
}

const ADMIN_HEADERS = ADMIN_BEARER ? { Authorization: `Bearer ${ADMIN_BEARER}` } : undefined

const buildAdminHeaders = (sessionKey?: string, extra?: Record<string, string>): HeadersInit => {
  if (sessionKey) {
    return buildHeaders(sessionKey, extra)
  }
  return {
    ...(extra ?? {}),
    ...(ADMIN_HEADERS ?? {})
  }
}

export async function fetchReviewerAssignments(
  workflowId: number,
  params?: ReviewerAssignmentQuery,
  sessionKey?: string
): Promise<{ assignments: ReviewerAssignment[]; limit: number; offset: number }> {
  const search = new URLSearchParams()
  if (params?.stageSlug) search.set('stageSlug', params.stageSlug)
  if (params?.status) {
    const statusParam = Array.isArray(params.status) ? params.status.join(',') : params.status
    search.set('status', statusParam)
  }
  if (params?.slaStatus) {
    const slaParam = Array.isArray(params.slaStatus) ? params.slaStatus.join(',') : params.slaStatus
    search.set('slaStatus', slaParam)
  }
  if (params?.reviewerId) search.set('reviewerId', String(params.reviewerId))
  if (params?.includeCancelled) search.set('includeCancelled', 'true')
  if (params?.limit) search.set('limit', String(params.limit))
  if (params?.offset) search.set('offset', String(params.offset))
  if (params?.dueBefore) search.set('dueBefore', params.dueBefore)
  if (params?.dueAfter) search.set('dueAfter', params.dueAfter)

  const query = search.toString()
  const res = await fetch(
    `${BASE_URL}/${workflowId}/reviewer-assignments${query ? `?${query}` : ''}`,
    {
      credentials: 'include',
      headers: buildAdminHeaders(sessionKey)
    }
  )
  if (!res.ok) throw new Error('Failed to fetch reviewer assignments')
  return await handleResponse<{ assignments: ReviewerAssignment[]; limit: number; offset: number }>(
    res
  )
}

export async function createReviewerAssignment(
  workflowId: number,
  input: ReviewerAssignmentInput,
  sessionKey?: string
): Promise<ReviewerAssignment> {
  const res = await fetch(`${BASE_URL}/${workflowId}/reviewer-assignments`, {
    method: 'POST',
    credentials: 'include',
    headers: buildAdminHeaders(sessionKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(input)
  })
  if (!res.ok) throw new Error('Failed to create reviewer assignment')
  const data = await handleResponse<{ assignment: ReviewerAssignment }>(res)
  return data.assignment
}

export async function updateReviewerAssignment(
  workflowId: number,
  assignmentId: number,
  input: ReviewerAssignmentUpdateInput,
  sessionKey?: string
): Promise<ReviewerAssignment> {
  const res = await fetch(`${BASE_URL}/${workflowId}/reviewer-assignments/${assignmentId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: buildAdminHeaders(sessionKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(input)
  })
  if (!res.ok) throw new Error('Failed to update reviewer assignment')
  const data = await handleResponse<{ assignment: ReviewerAssignment }>(res)
  return data.assignment
}

export async function batchUpdateReviewerAssignments(
  workflowId: number,
  assignmentIds: number[],
  input: ReviewerAssignmentUpdateInput,
  sessionKey?: string
): Promise<ReviewerAssignment[]> {
  const payload = { ...input, assignmentIds }
  const res = await fetch(`${BASE_URL}/${workflowId}/reviewer-assignments/batch`, {
    method: 'POST',
    credentials: 'include',
    headers: buildAdminHeaders(sessionKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Failed to batch update reviewer assignments')
  const data = await handleResponse<{ assignments: ReviewerAssignment[] }>(res)
  return data.assignments
}

export async function fetchAuditTimeline(
  workflowId: number,
  filters?: AuditEventFilters,
  sessionKey?: string
): Promise<{ events: AuditTimelineEvent[]; limit: number; offset: number }> {
  const search = new URLSearchParams()
  if (filters?.stageSlug) search.set('stageSlug', filters.stageSlug)
  if (filters?.eventType) search.set('eventType', filters.eventType)
  if (filters?.reviewerAssignmentId)
    search.set('reviewerAssignmentId', String(filters.reviewerAssignmentId))
  if (typeof filters?.acknowledged === 'boolean')
    search.set('acknowledged', filters.acknowledged ? 'true' : 'false')
  if (filters?.createdAfter) search.set('createdAfter', filters.createdAfter)
  if (filters?.createdBefore) search.set('createdBefore', filters.createdBefore)
  if (filters?.actorRole) search.set('actorRole', filters.actorRole)
  if (filters?.visibleToRole) search.set('visibleToRole', filters.visibleToRole)
  if (filters?.limit) search.set('limit', String(filters.limit))
  if (filters?.offset) search.set('offset', String(filters.offset))

  const res = await fetch(
    `${BASE_URL}/${workflowId}/audit/events${search.toString() ? `?${search}` : ''}`,
    {
      credentials: 'include',
      headers: buildAdminHeaders(sessionKey)
    }
  )
  if (!res.ok) throw new Error('Failed to fetch audit events')
  return await handleResponse<{ events: AuditTimelineEvent[]; limit: number; offset: number }>(res)
}

export async function exportAuditTimelineCsv(
  workflowId: number,
  filters?: AuditEventFilters,
  sessionKey?: string
): Promise<string> {
  const search = new URLSearchParams()
  if (filters?.stageSlug) search.set('stageSlug', filters.stageSlug)
  if (filters?.eventType) search.set('eventType', filters.eventType)
  if (filters?.reviewerAssignmentId)
    search.set('reviewerAssignmentId', String(filters.reviewerAssignmentId))
  if (typeof filters?.acknowledged === 'boolean')
    search.set('acknowledged', filters.acknowledged ? 'true' : 'false')
  if (filters?.createdAfter) search.set('createdAfter', filters.createdAfter)
  if (filters?.createdBefore) search.set('createdBefore', filters.createdBefore)
  if (filters?.actorRole) search.set('actorRole', filters.actorRole)
  if (filters?.visibleToRole) search.set('visibleToRole', filters.visibleToRole)
  search.set('export', 'csv')

  const res = await fetch(`${BASE_URL}/${workflowId}/audit/events?${search.toString()}`, {
    credentials: 'include',
    headers: buildAdminHeaders(sessionKey)
  })
  if (!res.ok) throw new Error('Failed to export audit events')
  return await res.text()
}

export async function fetchAuditExportSchedules(
  workflowId: number,
  sessionKey?: string
): Promise<AuditExportSchedule[]> {
  const res = await fetch(`${BASE_URL}/${workflowId}/audit/export-schedules`, {
    credentials: 'include',
    headers: buildAdminHeaders(sessionKey)
  })
  if (!res.ok) throw new Error('Failed to fetch audit export schedules')
  const data = await handleResponse<{ schedules: AuditExportSchedule[] }>(res)
  return data.schedules
}

export async function createAuditExportSchedule(
  workflowId: number,
  input: AuditExportScheduleInput,
  sessionKey?: string
): Promise<AuditExportSchedule> {
  const res = await fetch(`${BASE_URL}/${workflowId}/audit/export-schedules`, {
    method: 'POST',
    credentials: 'include',
    headers: buildAdminHeaders(sessionKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(input)
  })
  if (!res.ok) throw new Error('Failed to create audit export schedule')
  const data = await handleResponse<{ schedule: AuditExportSchedule }>(res)
  return data.schedule
}

export async function updateAuditExportSchedule(
  workflowId: number,
  scheduleId: number,
  input: AuditExportScheduleUpdate,
  sessionKey?: string
): Promise<AuditExportSchedule> {
  const res = await fetch(`${BASE_URL}/${workflowId}/audit/export-schedules/${scheduleId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: buildAdminHeaders(sessionKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(input)
  })
  if (!res.ok) throw new Error('Failed to update audit export schedule')
  const data = await handleResponse<{ schedule: AuditExportSchedule }>(res)
  return data.schedule
}

export async function deactivateAuditExportSchedule(
  workflowId: number,
  scheduleId: number,
  sessionKey?: string
): Promise<AuditExportSchedule> {
  const res = await fetch(`${BASE_URL}/${workflowId}/audit/export-schedules/${scheduleId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAdminHeaders(sessionKey)
  })
  if (!res.ok) throw new Error('Failed to deactivate audit export schedule')
  const data = await handleResponse<{ schedule: AuditExportSchedule }>(res)
  return data.schedule
}

export async function fetchSharedMemoDraft(
  workflowId: number,
  sessionKey?: string
): Promise<MemoSharedDraftPayload> {
  const res = await fetch(`${BASE_URL}/memo/${workflowId}/shared-draft`, {
    credentials: 'include',
    headers: buildAdminHeaders(sessionKey)
  })
  if (!res.ok) throw new Error('Failed to fetch shared memo draft')
  const data = await handleResponse<{ draft: MemoSharedDraftPayload }>(res)
  return data.draft
}

export async function saveSharedMemoDraft(
  workflowId: number,
  input: MemoSharedDraftInput,
  sessionKey?: string
): Promise<MemoSharedDraftPayload> {
  const res = await fetch(`${BASE_URL}/memo/${workflowId}/shared-draft`, {
    method: 'PUT',
    credentials: 'include',
    headers: buildAdminHeaders(sessionKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(input)
  })
  if (!res.ok) throw new Error('Failed to persist shared memo draft')
  const data = await handleResponse<{ draft: MemoSharedDraftPayload }>(res)
  return data.draft
}

export async function fetchMemoSuggestions(
  workflowId: number,
  options?: { status?: MemoSuggestionStatus },
  sessionKey?: string
): Promise<MemoSuggestion[]> {
  const search = new URLSearchParams()
  if (options?.status) search.set('status', options.status)
  const res = await fetch(
    `${BASE_URL}/memo/${workflowId}/suggestions${search.toString() ? `?${search}` : ''}`,
    {
      credentials: 'include',
      headers: buildAdminHeaders(sessionKey)
    }
  )
  if (!res.ok) throw new Error('Failed to fetch memo suggestions')
  const data = await handleResponse<{ suggestions: MemoSuggestion[] }>(res)
  return data.suggestions
}

export async function createMemoSuggestion(
  workflowId: number,
  input: MemoSuggestionInput,
  sessionKey?: string
): Promise<MemoSuggestion> {
  const res = await fetch(`${BASE_URL}/memo/${workflowId}/suggestions`, {
    method: 'POST',
    credentials: 'include',
    headers: buildAdminHeaders(sessionKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(input)
  })
  if (!res.ok) throw new Error('Failed to create memo suggestion')
  const data = await handleResponse<{ suggestion: MemoSuggestion }>(res)
  return data.suggestion
}

export async function updateMemoSuggestion(
  workflowId: number,
  suggestionId: number,
  input: MemoSuggestionUpdate,
  sessionKey?: string
): Promise<MemoSuggestion> {
  const res = await fetch(`${BASE_URL}/memo/${workflowId}/suggestions/${suggestionId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: buildAdminHeaders(sessionKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(input)
  })
  if (!res.ok) throw new Error('Failed to update memo suggestion')
  const data = await handleResponse<{ suggestion: MemoSuggestion }>(res)
  return data.suggestion
}

export async function deleteMemoSuggestions(
  workflowId: number,
  ids: number[],
  sessionKey?: string
): Promise<void> {
  const res = await fetch(`${BASE_URL}/memo/${workflowId}/suggestions`, {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAdminHeaders(sessionKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ ids })
  })
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete memo suggestions')
}

export async function createAuditEvent(
  workflowId: number,
  input: AuditEventInput,
  sessionKey?: string
): Promise<AuditTimelineEvent> {
  const res = await fetch(`${BASE_URL}/${workflowId}/audit/events`, {
    method: 'POST',
    credentials: 'include',
    headers: buildAdminHeaders(sessionKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(input)
  })
  if (!res.ok) throw new Error('Failed to create audit event')
  const data = await handleResponse<{ event: AuditTimelineEvent }>(res)
  return data.event
}

export async function acknowledgeAuditEvent(
  workflowId: number,
  eventId: number,
  input: {
    actorId?: number | null
    actorName?: string | null
    acknowledgementNote?: string | null
  },
  sessionKey?: string
): Promise<AuditTimelineEvent> {
  const res = await fetch(`${BASE_URL}/${workflowId}/audit/events/${eventId}/acknowledge`, {
    method: 'POST',
    credentials: 'include',
    headers: buildAdminHeaders(sessionKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(input)
  })
  if (!res.ok) throw new Error('Failed to acknowledge audit event')
  const data = await handleResponse<{ event: AuditTimelineEvent }>(res)
  return data.event
}
