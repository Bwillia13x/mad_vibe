import type {
  ResearchLogEntry,
  ResearchLogInput,
  MemoComposerStatePayload,
  MemoComposerStateInput,
  DataNormalizationStatePayload,
  DataNormalizationStateInput,
  ValuationStatePayload,
  ValuationStateInput,
  MonitoringStatePayload,
  MonitoringStateInput
} from '@shared/types'

const BASE_URL = '/api/workflow'

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

export async function fetchResearchLog(): Promise<ResearchLogEntry[]> {
  const res = await fetch(`${BASE_URL}/research-log`, {
    credentials: 'include'
  })
  return await handleResponse<ResearchLogEntry[]>(res)
}

export async function createResearchLogEntry(
  entry: ResearchLogInput
): Promise<ResearchLogEntry> {
  const res = await fetch(`${BASE_URL}/research-log`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(entry)
  })
  return await handleResponse<ResearchLogEntry>(res)
}

export async function fetchMemoComposerState(): Promise<MemoComposerStatePayload | null> {
  const res = await fetch(`${BASE_URL}/memo-state`, {
    credentials: 'include'
  })
  return await handleResponse<MemoComposerStatePayload | null>(res)
}

export async function persistMemoComposerState(
  state: MemoComposerStateInput
): Promise<MemoComposerStatePayload> {
  const res = await fetch(`${BASE_URL}/memo-state`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(state)
  })
  return await handleResponse<MemoComposerStatePayload>(res)
}

export async function fetchNormalizationState(): Promise<DataNormalizationStatePayload | null> {
  const res = await fetch(`${BASE_URL}/normalization-state`, {
    credentials: 'include'
  })
  return await handleResponse<DataNormalizationStatePayload | null>(res)
}

export async function persistNormalizationState(
  state: DataNormalizationStateInput
): Promise<DataNormalizationStatePayload> {
  const res = await fetch(`${BASE_URL}/normalization-state`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(state)
  })
  return await handleResponse<DataNormalizationStatePayload>(res)
}

export async function fetchValuationState(): Promise<ValuationStatePayload | null> {
  const res = await fetch(`${BASE_URL}/valuation-state`, {
    credentials: 'include'
  })
  return await handleResponse<ValuationStatePayload | null>(res)
}

export async function persistValuationState(
  state: ValuationStateInput
): Promise<ValuationStatePayload> {
  const res = await fetch(`${BASE_URL}/valuation-state`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(state)
  })
  return await handleResponse<ValuationStatePayload>(res)
}

export async function fetchMonitoringState(): Promise<MonitoringStatePayload | null> {
  const res = await fetch(`${BASE_URL}/monitoring-state`, {
    credentials: 'include'
  })
  return await handleResponse<MonitoringStatePayload | null>(res)
}

export async function persistMonitoringState(
  state: MonitoringStateInput
): Promise<MonitoringStatePayload> {
  const res = await fetch(`${BASE_URL}/monitoring-state`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(state)
  })
  return await handleResponse<MonitoringStatePayload>(res)
}

export type WorkflowHistoryContext = 'memo' | 'normalization' | 'valuation' | 'monitoring'

export interface WorkflowHistoryEvent<State = Record<string, unknown>> {
  id: string
  actorId: string
  version: number
  state: State
  createdAt: string
}

export async function fetchWorkflowHistory<State = Record<string, unknown>>(
  context: WorkflowHistoryContext,
  limit = 20
): Promise<WorkflowHistoryEvent<State>[]> {
  const res = await fetch(`${BASE_URL}/history/${context}?limit=${limit}`, {
    credentials: 'include'
  })
  return await handleResponse<WorkflowHistoryEvent<State>[]>(res)
}

export interface PresencePeer {
  actorId: string
  stageSlug: string
  updatedAt: string
}

export interface PresenceHeartbeatResponse {
  actorId: string
  stageSlug: string
  updatedAt: string
  peers: PresencePeer[]
}

export async function sendPresenceHeartbeat(stageSlug: string): Promise<PresenceHeartbeatResponse> {
  const res = await fetch(`${BASE_URL}/presence/heartbeat`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ stageSlug })
  })
  return await handleResponse<PresenceHeartbeatResponse>(res)
}

export async function fetchPresence(stageSlug: string): Promise<PresencePeer[]> {
  const res = await fetch(`${BASE_URL}/presence?stage=${encodeURIComponent(stageSlug)}`, {
    credentials: 'include'
  })
  return await handleResponse<PresencePeer[]>(res)
}
