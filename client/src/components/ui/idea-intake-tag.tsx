import React from 'react'
import { cn } from '@/lib/utils'

type TagTone = 'slate' | 'violet' | 'emerald' | 'amber' | 'rose' | 'blue'

interface IdeaIntakeTagProps {
  tone?: TagTone
  children: React.ReactNode
  className?: string
}

const tagPalettes: Record<TagTone, string> = {
  slate: 'bg-slate-800/60 text-slate-200 ring-slate-700/80',
  violet: 'bg-violet-800/40 text-violet-100 ring-violet-700/70',
  emerald: 'bg-emerald-800/40 text-emerald-100 ring-emerald-700/70',
  amber: 'bg-amber-800/40 text-amber-100 ring-amber-700/70',
  rose: 'bg-rose-800/40 text-rose-100 ring-rose-700/70',
  blue: 'bg-sky-800/40 text-sky-100 ring-sky-700/70'
}

export function IdeaIntakeTag({ tone = 'slate', children, className }: IdeaIntakeTagProps) {
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-full text-xs font-medium ring-1',
        tagPalettes[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
