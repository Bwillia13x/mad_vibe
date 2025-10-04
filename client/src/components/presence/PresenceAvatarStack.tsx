import type { PresencePeer } from '@/hooks/usePresence'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface PresenceAvatarStackProps {
  peers: PresencePeer[]
  actorId?: string | null
  maxVisible?: number
  size?: 'sm' | 'md'
  showCount?: boolean
}

const sizeClassMap: Record<'sm' | 'md', string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm'
}

const fallbackTone = 'bg-violet-600/70 text-violet-50'

function buildDisplayList(peers: PresencePeer[], actorId?: string | null) {
  const unique = new Map<string, PresencePeer>()
  for (const peer of peers) {
    if (!peer.actorId) continue
    if (!unique.has(peer.actorId)) {
      unique.set(peer.actorId, peer)
    }
  }

  if (actorId && !unique.has(actorId)) {
    unique.set(actorId, {
      actorId,
      stageSlug: peers[0]?.stageSlug ?? 'workspace',
      updatedAt: new Date().toISOString()
    })
  }

  const prioritized: PresencePeer[] = []
  if (actorId && unique.has(actorId)) {
    const self = unique.get(actorId)
    if (self) {
      prioritized.push(self)
    }
  }
  for (const peer of unique.values()) {
    if (actorId && peer.actorId === actorId) continue
    prioritized.push(peer)
  }

  return prioritized
}

function getInitials(actorId: string) {
  const tokens = actorId.split(/[^a-zA-Z0-9]+/).filter(Boolean)
  if (tokens.length === 0) return actorId.slice(0, 2).toUpperCase()
  const initials = tokens.slice(0, 2).map((token) => token.charAt(0).toUpperCase())
  return initials.join('')
}

export function PresenceAvatarStack({
  peers,
  actorId,
  maxVisible = 4,
  size = 'md',
  showCount = false
}: PresenceAvatarStackProps) {
  const displayList = buildDisplayList(peers, actorId)

  const sizeClass = sizeClassMap[size]
  const visible = displayList.slice(0, maxVisible)
  const extraCount = Math.max(displayList.length - visible.length, 0)

  return (
    <div className="flex items-center gap-2" data-testid="presence-avatar-stack">
      <div className="flex -space-x-2">
        {visible.length === 0 ? (
          <Avatar
            className={cn(
              'border border-slate-950/60 bg-slate-900/70 shadow-lg shadow-violet-900/10',
              sizeClass
            )}
          >
            <AvatarFallback className={cn('font-semibold uppercase', fallbackTone)}>
              ??
            </AvatarFallback>
          </Avatar>
        ) : (
          visible.map((peer, index) => {
            const isSelf = actorId && peer.actorId === actorId
            return (
              <Avatar
                key={`${peer.actorId}-${index}`}
                className={cn(
                  'border border-slate-950/60 bg-slate-900/70 shadow-lg shadow-violet-900/10',
                  sizeClass,
                  index > 0 && 'ring-2 ring-slate-950/40',
                  isSelf && 'ring-2 ring-violet-500/70 ring-offset-2 ring-offset-slate-950'
                )}
              >
                <AvatarFallback className={cn('font-semibold uppercase', fallbackTone)}>
                  {getInitials(peer.actorId)}
                </AvatarFallback>
              </Avatar>
            )
          })
        )}
      </div>
      {showCount && extraCount > 0 && <span className="text-xs text-slate-400">+{extraCount}</span>}
    </div>
  )
}
