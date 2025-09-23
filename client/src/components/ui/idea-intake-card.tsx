import React from 'react'
import { cn } from '@/lib/utils'

interface IdeaIntakeCardProps {
  title: string
  subtitle?: string
  right?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function IdeaIntakeCard({
  title,
  subtitle,
  right,
  children,
  className
}: IdeaIntakeCardProps) {
  return (
    <div
      className={cn('bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm', className)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-slate-100 font-semibold leading-tight">{title}</h3>
          {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}
