import { MessageCircle } from 'lucide-react'

import type { PresencePeer } from '@/hooks/usePresence'
import { PresenceAvatarStack } from '@/components/presence/PresenceAvatarStack'
import { cn } from '@/lib/utils'

export interface CardCollaborationControlsProps {
  sectionId: string
  commentCount: number
  isActive: boolean
  onToggle: (sectionId: string) => void
  peers: PresencePeer[]
  actorId?: string | null
  showPresence?: boolean
}

export function CardCollaborationControls({
  sectionId,
  commentCount,
  isActive,
  onToggle,
  peers,
  actorId,
  showPresence = true
}: CardCollaborationControlsProps) {
  const handleToggle = () => {
    onToggle(sectionId)
  }

  const hasPresence = showPresence && peers.length > 0

  return (
    <div className="flex items-center gap-2">
      {hasPresence && <PresenceAvatarStack peers={peers} actorId={actorId} size="sm" showCount />}
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'inline-flex items-center gap-1 rounded-lg border border-slate-700/70 px-2.5 py-1 text-xs font-medium transition',
          isActive
            ? 'bg-violet-600/80 text-white shadow-lg shadow-violet-900/20'
            : 'bg-slate-900/70 text-slate-200 hover:bg-slate-900/90 hover:text-white'
        )}
        aria-pressed={isActive ? 'true' : 'false'}
        aria-label={`Toggle comments for ${sectionId}`}
      >
        <MessageCircle className="h-3.5 w-3.5" />
        <span className="tabular-nums">{commentCount}</span>
      </button>
    </div>
  )
}
