import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useSessionKey } from './useSessionKey'
import {
  fetchPresencePeers,
  sendPresenceHeartbeat,
  sendPresenceTelemetry,
  type PresenceHeartbeatResponse,
  type PresencePeerPayload
} from '@/lib/workflow-api'
import type { PresenceTelemetryEvent, PresenceConflictPayload } from '@shared/types'

export interface PresencePeer {
  actorId: string
  stageSlug: string
  updatedAt: string
  sessionId?: string
  revision?: number | null
  locked?: boolean
}

interface PresenceState {
  actorId: string | null
  sessionId: string | null
  peers: PresencePeer[]
  isFocused: boolean
  lastHeartbeatAt: string | null
  latencyMs: number | null
  failureCount: number
  lockOwner: string | null
  lockExpiresAt: string | null
  conflict: PresenceConflictPayload | null
}

const HEARTBEAT_INTERVAL = 10_000
const MAX_FAILURES = 3

export function usePresence(stageSlug: string): PresenceState {
  const [actorId, setActorId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [peers, setPeers] = useState<PresencePeerPayload[]>([])
  const [isFocused, setIsFocused] = useState<boolean>(() => {
    if (typeof document === 'undefined') return true
    return document.visibilityState === 'visible'
  })
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<string | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [failureCount, setFailureCount] = useState(0)
  const [lockOwner, setLockOwner] = useState<string | null>(null)
  const [lockExpiresAt, setLockExpiresAt] = useState<string | null>(null)
  const [conflict, setConflict] = useState<PresenceConflictPayload | null>(null)
  const failureStreakRef = useRef(0)
  const actorIdRef = useRef<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const sessionKey = useSessionKey()

  useEffect(() => {
    actorIdRef.current = actorId
  }, [actorId])

  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  const pushTelemetry = useCallback(
    async (partial: Omit<PresenceTelemetryEvent, 'stageSlug' | 'timestamp'>) => {
      if (!sessionKey) return
      const payload: PresenceTelemetryEvent = {
        stageSlug,
        timestamp: new Date().toISOString(),
        actorId: partial.actorId ?? actorIdRef.current ?? null,
        event: partial.event,
        latencyMs: partial.latencyMs ?? null,
        failureCount: partial.failureCount
      }
      try {
        await sendPresenceTelemetry(sessionKey, payload)
      } catch (telemetryError) {
        console.warn('Presence telemetry emit failed', telemetryError)
      }
    },
    [sessionKey, stageSlug]
  )

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const onVisibility = () => {
      setIsFocused(document.visibilityState === 'visible')
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (!stageSlug || !sessionKey) return undefined
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const heartbeat = async () => {
      if (cancelled) return
      try {
        const start = performance.now()
        const response: PresenceHeartbeatResponse = await sendPresenceHeartbeat(
          sessionKey,
          stageSlug
        )
        if (cancelled) return
        setActorId(response.actorId ?? null)
        setSessionId(response.sessionId ?? null)
        setPeers(response.peers)
        setLockOwner(response.lockOwner ?? null)
        setLockExpiresAt(response.lockExpiresAt ?? null)
        setConflict(response.conflict ?? null)
        setLastHeartbeatAt(new Date().toISOString())
        const elapsed = performance.now() - start
        const rounded = Math.round(elapsed)
        setLatencyMs(rounded)
        failureStreakRef.current = 0
        setFailureCount(0)
        void pushTelemetry({
          actorId: response.actorId ?? null,
          event: 'heartbeat',
          latencyMs: rounded,
          failureCount: 0
        })
      } catch (error) {
        console.warn('Presence heartbeat failed', error)
        failureStreakRef.current += 1
        const nextFailureCount = failureStreakRef.current
        setFailureCount(nextFailureCount)
        void pushTelemetry({
          actorId: actorIdRef.current,
          event: 'failure',
          failureCount: nextFailureCount
        })
        if (nextFailureCount >= MAX_FAILURES) {
          setPeers([])
          setLockOwner(null)
          setLockExpiresAt(null)
          setConflict(null)
        }
      } finally {
        if (!cancelled) {
          timer = setTimeout(heartbeat, HEARTBEAT_INTERVAL)
        }
      }
    }

    void heartbeat()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [stageSlug, sessionKey, pushTelemetry])

  useEffect(() => {
    if (!stageSlug || !sessionKey) return undefined
    let cancelled = false

    const poll = async () => {
      try {
        const results = await fetchPresencePeers(sessionKey, stageSlug)
        if (!cancelled) {
          setPeers(results)
        }
      } catch (error) {
        console.warn('Presence poll failed', error)
      }
    }

    void poll()
    const poller = setInterval(() => {
      void poll()
    }, HEARTBEAT_INTERVAL)

    return () => {
      cancelled = true
      clearInterval(poller)
    }
  }, [stageSlug, sessionKey])

  const peersWithActor = useMemo(() => {
    if (!actorId) return peers
    const uniq = new Map<string, PresencePeerPayload>()
    for (const peer of peers) {
      uniq.set(peer.actorId, peer)
    }
    if (!uniq.has(actorId)) {
      uniq.set(actorId, {
        actorId,
        stageSlug,
        updatedAt: new Date().toISOString(),
        sessionId: sessionIdRef.current ?? undefined,
        revision: null,
        locked: lockOwner === sessionIdRef.current && !!lockOwner
      })
    }
    return Array.from(uniq.values())
  }, [actorId, peers, stageSlug, lockOwner])

  return {
    actorId,
    sessionId,
    peers: peersWithActor,
    isFocused,
    lastHeartbeatAt,
    latencyMs,
    failureCount,
    lockOwner,
    lockExpiresAt,
    conflict
  }
}
