import { log } from '../log'

export type PresenceConflictType = 'lock_denied' | 'stale_revision' | 'explicit'

export interface RegisterConflictInput {
  stageSlug: string
  sessionId: string
  actorId?: string | null
  type: PresenceConflictType
  message?: string
  latestRevision?: number | null
  blockingSessionId?: string
  blockingActorId?: string | null
}

export interface PresenceConflictSnapshot {
  type: PresenceConflictType
  detectedAt: string
  message?: string
  latestRevision?: number | null
  blockingSessionId?: string
  blockingActorId?: string | null
}

export interface PresencePeerSnapshot {
  sessionId: string
  actorId: string
  stageSlug: string
  updatedAt: string
  revision: number | null
  locked: boolean
}

export interface HeartbeatInput {
  stageSlug: string
  sessionId: string
  actorId: string
  revision?: number | null
  lockRequest?: boolean
}

export interface HeartbeatResult {
  sessionId: string
  actorId: string
  stageSlug: string
  revision: number | null
  peers: PresencePeerSnapshot[]
  lockOwner: string | null
  lockExpiresAt: string | null
  conflict: PresenceConflictSnapshot | null
}

export interface StagePresenceSnapshot {
  stageSlug: string
  latestRevision: number | null
  lockOwner: string | null
  lockExpiresAt: string | null
  peers: PresencePeerSnapshot[]
}

interface StagePresenceSession {
  sessionId: string
  actorId: string
  stageSlug: string
  updatedAt: number
  revision: number | null
  locked: boolean
}

interface StagePresenceConflict {
  type: PresenceConflictType
  detectedAt: number
  message?: string
  latestRevision?: number | null
  blockingSessionId?: string
  blockingActorId?: string | null
}

interface StagePresenceState {
  stageSlug: string
  latestRevision: number | null
  lockedBy: string | null
  lockExpiresAt: number | null
  sessions: Map<string, StagePresenceSession>
  conflicts: Map<string, StagePresenceConflict>
}

interface SessionPresenceOptions {
  presenceTtlMs?: number
  lockTtlMs?: number
}

const DEFAULT_PRESENCE_TTL_MS = 60_000
const DEFAULT_LOCK_TTL_MS = 20_000

export class SessionPresenceService {
  private readonly presenceTtlMs: number
  private readonly lockTtlMs: number
  private readonly stages = new Map<string, StagePresenceState>()

  constructor(options: SessionPresenceOptions = {}) {
    this.presenceTtlMs = options.presenceTtlMs ?? DEFAULT_PRESENCE_TTL_MS
    this.lockTtlMs = options.lockTtlMs ?? DEFAULT_LOCK_TTL_MS
  }

  heartbeat(input: HeartbeatInput): HeartbeatResult {
    const { stageSlug, sessionId } = input
    const now = Date.now()

    const stage = this.ensureStage(stageSlug)
    this.pruneStage(stage, now)
    this.reconcileLock(stage, now)

    const session = this.ensureSession(stage, {
      sessionId,
      actorId: input.actorId,
      stageSlug,
      revision: input.revision ?? null,
      updatedAt: now,
      locked: false
    })

    session.actorId = input.actorId
    session.updatedAt = now
    session.revision = input.revision ?? session.revision

    if (typeof session.revision === 'number') {
      if (stage.latestRevision === null || session.revision > stage.latestRevision) {
        stage.latestRevision = session.revision
      }
    }

    let conflict: StagePresenceConflict | null = null

    if (input.lockRequest) {
      conflict = this.handleLockRequest(stage, session, now)
    } else if (stage.lockedBy === session.sessionId) {
      stage.lockExpiresAt = now + this.lockTtlMs
      session.locked = true
    }

    const staleConflict = this.detectStaleRevision(stage, session)
    if (staleConflict) {
      conflict = staleConflict
      stage.conflicts.set(session.sessionId, staleConflict)
    } else if (!conflict) {
      const existingConflict = stage.conflicts.get(session.sessionId)
      conflict = existingConflict ?? null
      if (existingConflict && this.shouldClearConflict(existingConflict, session, stage)) {
        stage.conflicts.delete(session.sessionId)
        conflict = null
      }
    }

    const peers = this.buildPeers(stage)

    const snapshot = this.toConflictSnapshot(conflict)

    return {
      sessionId: session.sessionId,
      actorId: session.actorId,
      stageSlug: session.stageSlug,
      revision: session.revision ?? null,
      peers,
      lockOwner: stage.lockedBy,
      lockExpiresAt: stage.lockExpiresAt ? new Date(stage.lockExpiresAt).toISOString() : null,
      conflict: snapshot
    }
  }

  getPeers(stageSlug: string): PresencePeerSnapshot[] {
    const stage = this.stages.get(stageSlug)
    if (!stage) return []
    this.pruneStage(stage, Date.now())
    return this.buildPeers(stage)
  }

  getStageSnapshot(stageSlug: string): StagePresenceSnapshot | null {
    const stage = this.stages.get(stageSlug)
    if (!stage) return null
    const now = Date.now()
    this.pruneStage(stage, now)
    this.reconcileLock(stage, now)
    return {
      stageSlug,
      latestRevision: stage.latestRevision,
      lockOwner: stage.lockedBy,
      lockExpiresAt: stage.lockExpiresAt ? new Date(stage.lockExpiresAt).toISOString() : null,
      peers: this.buildPeers(stage)
    }
  }

  registerRevision(stageSlug: string, revision: number, sessionId?: string): void {
    const stage = this.ensureStage(stageSlug)
    const now = Date.now()
    this.pruneStage(stage, now)

    if (stage.latestRevision === null || revision > stage.latestRevision) {
      stage.latestRevision = revision
    }

    if (sessionId && stage.lockedBy === sessionId) {
      stage.lockExpiresAt = now + this.lockTtlMs
      const ownerSession = stage.sessions.get(sessionId)
      if (ownerSession) {
        ownerSession.locked = true
      }
    }

    for (const [key, value] of stage.conflicts.entries()) {
      if (value.type !== 'stale_revision') continue
      const latestRevision = value.latestRevision
      if (typeof latestRevision === 'number' && revision >= latestRevision) {
        stage.conflicts.delete(key)
      }
    }
  }

  registerConflict(input: RegisterConflictInput): PresenceConflictSnapshot | null {
    const stage = this.ensureStage(input.stageSlug)
    const conflict: StagePresenceConflict = {
      type: input.type,
      detectedAt: Date.now(),
      message: input.message,
      latestRevision: input.latestRevision ?? stage.latestRevision,
      blockingSessionId: input.blockingSessionId,
      blockingActorId: input.blockingActorId ?? null
    }

    stage.conflicts.set(input.sessionId, conflict)

    if (input.type === 'lock_denied' && input.blockingSessionId) {
      log('session-presence:lock-denied', {
        stageSlug: input.stageSlug,
        sessionId: input.sessionId,
        blockingSessionId: input.blockingSessionId
      })
    }

    return this.toConflictSnapshot(conflict)
  }

  clearSession(stageSlug: string, sessionId: string): void {
    const stage = this.stages.get(stageSlug)
    if (!stage) return
    stage.sessions.delete(sessionId)
    stage.conflicts.delete(sessionId)
    if (stage.lockedBy === sessionId) {
      stage.lockedBy = null
      stage.lockExpiresAt = null
    }
    if (stage.sessions.size === 0) {
      this.stages.delete(stageSlug)
    }
  }

  reset(): void {
    this.stages.clear()
  }

  private resolveActiveLockOwner(stage: StagePresenceState): string | null {
    if (stage.lockedBy) return stage.lockedBy
    for (const record of stage.sessions.values()) {
      if (record.locked) {
        stage.lockedBy = record.sessionId
        return record.sessionId
      }
    }
    return null
  }

  private ensureStage(stageSlug: string): StagePresenceState {
    let stage = this.stages.get(stageSlug)
    if (!stage) {
      stage = {
        stageSlug,
        latestRevision: null,
        lockedBy: null,
        lockExpiresAt: null,
        sessions: new Map(),
        conflicts: new Map()
      }
      this.stages.set(stageSlug, stage)
    }
    return stage
  }

  private ensureSession(stage: StagePresenceState, session: StagePresenceSession): StagePresenceSession {
    const existing = stage.sessions.get(session.sessionId)
    if (existing) {
      return existing
    }
    stage.sessions.set(session.sessionId, session)
    return session
  }

  private pruneStage(stage: StagePresenceState, now: number): void {
    for (const [key, record] of stage.sessions.entries()) {
      if (now - record.updatedAt > this.presenceTtlMs) {
        if (record.locked && stage.lockedBy === record.sessionId) {
          record.locked = false
          stage.lockedBy = null
          stage.lockExpiresAt = null
        }
        stage.sessions.delete(key)
        stage.conflicts.delete(key)
      }
    }

    if (stage.sessions.size === 0 && stage.lockedBy === null) {
      this.stages.delete(stage.stageSlug)
    }
  }

  private reconcileLock(stage: StagePresenceState, now: number): void {
    if (!stage.lockExpiresAt) return
    if (stage.lockExpiresAt <= now) {
      if (stage.lockedBy) {
        const owner = stage.sessions.get(stage.lockedBy)
        if (owner) {
          owner.locked = false
        }
      }
      stage.lockExpiresAt = null
      stage.lockedBy = null
    }
  }

  private handleLockRequest(
    stage: StagePresenceState,
    session: StagePresenceSession,
    now: number
  ): StagePresenceConflict | null {
    const activeOwner = this.resolveActiveLockOwner(stage)
    if (!activeOwner || activeOwner === session.sessionId) {
      if (activeOwner && activeOwner !== session.sessionId) {
        const previousOwner = stage.sessions.get(activeOwner)
        if (previousOwner) {
          previousOwner.locked = false
        }
      }
      stage.lockedBy = session.sessionId
      stage.lockExpiresAt = now + this.lockTtlMs
      stage.conflicts.delete(session.sessionId)
      session.locked = true
      return null
    }

    const blockingSession = stage.sessions.get(activeOwner)
    const conflict: StagePresenceConflict = {
      type: 'lock_denied',
      detectedAt: now,
      message: 'Stage currently locked by another session',
      latestRevision: stage.latestRevision,
      blockingSessionId: activeOwner,
      blockingActorId: blockingSession?.actorId ?? null
    }

    stage.conflicts.set(session.sessionId, conflict)
    session.locked = false
    return conflict
  }

  private detectStaleRevision(
    stage: StagePresenceState,
    session: StagePresenceSession
  ): StagePresenceConflict | null {
    if (stage.latestRevision === null || session.revision === null) {
      return null
    }
    if (session.revision >= stage.latestRevision) {
      return null
    }
    return {
      type: 'stale_revision',
      detectedAt: Date.now(),
      message: 'Local state is stale compared to the latest revision',
      latestRevision: stage.latestRevision,
      blockingSessionId: stage.lockedBy ?? undefined,
      blockingActorId: stage.lockedBy
        ? stage.sessions.get(stage.lockedBy)?.actorId ?? null
        : null
    }
  }

  private shouldClearConflict(
    conflict: StagePresenceConflict,
    session: StagePresenceSession,
    stage: StagePresenceState
  ): boolean {
    if (conflict.type === 'stale_revision' && stage.latestRevision !== null) {
      if (session.revision !== null && session.revision >= stage.latestRevision) {
        return true
      }
    }

    if (conflict.type === 'lock_denied' && stage.lockedBy === session.sessionId) {
      return true
    }

    return false
  }

  private buildPeers(stage: StagePresenceState): PresencePeerSnapshot[] {
    const now = Date.now()
    const peers: PresencePeerSnapshot[] = []
    for (const session of stage.sessions.values()) {
      peers.push({
        sessionId: session.sessionId,
        actorId: session.actorId,
        stageSlug: session.stageSlug,
        updatedAt: new Date(session.updatedAt).toISOString(),
        revision: session.revision ?? null,
        locked: stage.lockedBy === session.sessionId && !!stage.lockExpiresAt && stage.lockExpiresAt > now
      })
    }
    return peers.sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1))
  }

  private toConflictSnapshot(conflict: StagePresenceConflict | null): PresenceConflictSnapshot | null {
    if (!conflict) return null
    return {
      type: conflict.type,
      detectedAt: new Date(conflict.detectedAt).toISOString(),
      message: conflict.message,
      latestRevision: conflict.latestRevision ?? null,
      blockingSessionId: conflict.blockingSessionId,
      blockingActorId: conflict.blockingActorId ?? null
    }
  }
}

export const sessionPresenceService = new SessionPresenceService()
