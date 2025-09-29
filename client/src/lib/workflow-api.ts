declare const process: { env?: Record<string, string | undefined> } | undefined

import type {
  MemoComposerStatePayload,
  MemoComposerStateInput,
  DataNormalizationStatePayload,
  DataNormalizationStateInput,
  ValuationStatePayload,
  ValuationStateInput,
  MonitoringStatePayload,
  MonitoringStateInput
} from '@shared/types'

export interface PresencePeerPayload {
  actorId: string
  stageSlug: string
  updatedAt: string
}

export interface PresenceHeartbeatResponse {
  actorId: string
  stageSlug: string
  peers: PresencePeerPayload[]
}

const BASE_URL = '/api/workflow'

const resolveAdminToken = (): string | undefined => {
  try {
    const viteToken = (import.meta as unknown as { env?: Record<string, unknown> })?.env?.VITE_ADMIN_TOKEN
    if (typeof viteToken === 'string' && viteToken.trim().length > 0) {
      return viteToken.trim()
    }
  } catch {
    // ignore
  }

  const globalToken = (typeof globalThis !== 'undefined' && (globalThis as { __ADMIN_TOKEN__?: unknown }).__ADMIN_TOKEN__)
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

export async function sendPresenceHeartbeat(
  sessionKey: string,
  stageSlug: string,
  actorId?: string
): Promise<PresenceHeartbeatResponse> {
  const headers = buildHeaders(sessionKey, {
    'Content-Type': 'application/json',
    ...(actorId ? { 'x-actor-id': actorId } : {})
  })
  const res = await fetch(`${BASE_URL}/presence/heartbeat`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ stageSlug })
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
