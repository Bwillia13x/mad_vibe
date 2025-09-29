import { useEffect, useMemo, useState } from 'react'
import { useSessionKey } from './useSessionKey'
import {
  fetchPresencePeers,
  sendPresenceHeartbeat,
  type PresenceHeartbeatResponse,
  type PresencePeerPayload
} from '@/lib/workflow-api'

export interface PresencePeer {
  actorId: string
  stageSlug: string
  updatedAt: string
}

interface PresenceState {
  actorId: string | null
  peers: PresencePeer[]
}

const HEARTBEAT_INTERVAL = 10_000

export function usePresence(stageSlug: string): PresenceState {
  const [actorId, setActorId] = useState<string | null>(null)
  const [peers, setPeers] = useState<PresencePeerPayload[]>([])
  const sessionKey = useSessionKey()

  useEffect(() => {
    if (!stageSlug || !sessionKey) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const runHeartbeat = async () => {
      if (cancelled) return
      try {
        const response: PresenceHeartbeatResponse = await sendPresenceHeartbeat(
          sessionKey,
          stageSlug
        )
        if (!cancelled) {
          setActorId(response.actorId)
          setPeers(response.peers)
        }
      } catch (error) {
        console.warn('Presence heartbeat failed', error)
      } finally {
        if (!cancelled) {
          timer = setTimeout(runHeartbeat, HEARTBEAT_INTERVAL)
        }
      }
    }

    runHeartbeat()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [stageSlug, sessionKey])

  useEffect(() => {
    if (!stageSlug || !sessionKey) return
    let cancelled = false
    let poller: ReturnType<typeof setInterval> | undefined

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

    poll()
    poller = setInterval(poll, HEARTBEAT_INTERVAL)

    return () => {
      cancelled = true
      if (poller) clearInterval(poller)
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
        updatedAt: new Date().toISOString()
      })
    }
    return Array.from(uniq.values())
  }, [actorId, peers, stageSlug])

  return {
    actorId,
    peers: peersWithActor
  }
}
