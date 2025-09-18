import { useEffect, useMemo, useState } from 'react'
import { fetchPresence, sendPresenceHeartbeat, type PresencePeer } from '@/lib/workflow-api'

interface PresenceState {
  actorId: string | null
  peers: PresencePeer[]
}

const HEARTBEAT_INTERVAL = 10_000
const POLL_INTERVAL = 20_000

export function usePresence(stageSlug: string): PresenceState {
  const [actorId, setActorId] = useState<string | null>(null)
  const [peers, setPeers] = useState<PresencePeer[]>([])

  useEffect(() => {
    if (!stageSlug) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const heartbeat = async () => {
      try {
        const response = await sendPresenceHeartbeat(stageSlug)
        if (!cancelled) {
          setActorId(response.actorId)
          setPeers(response.peers)
        }
      } catch (error) {
        if (!cancelled) {
          // Ignore heartbeat errors; next interval will retry
        }
      } finally {
        if (!cancelled) {
          timer = setTimeout(heartbeat, HEARTBEAT_INTERVAL)
        }
      }
    }

    heartbeat()

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [stageSlug])

  useEffect(() => {
    if (!stageSlug) return
    let cancelled = false
    const poll = async () => {
      try {
        const presence = await fetchPresence(stageSlug)
        if (!cancelled) setPeers(presence)
      } catch (error) {
        // Swallow errors; heartbeat continues to keep us in sync
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL)
    void poll()

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [stageSlug])

  const peersWithActor = useMemo(() => {
    if (!actorId) return peers
    const uniq = new Map<string, PresencePeer>()
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
