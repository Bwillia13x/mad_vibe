import React from 'react'
import { cn } from '@/lib/utils'

interface IdeaIntakePillProps {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  className?: string
}

export function IdeaIntakePill({ children, active, onClick, className }: IdeaIntakePillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2 py-1 rounded-full text-xs border transition-colors',
        active
          ? 'bg-emerald-700/30 border-emerald-700 text-emerald-100'
          : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-900',
        className
      )}
    >
      {children}
    </button>
  )
}
