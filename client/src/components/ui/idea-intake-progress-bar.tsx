import React from 'react'
import { cn } from '@/lib/utils'

interface IdeaIntakeProgressBarProps {
  value: number
  className?: string
}

export function IdeaIntakeProgressBar({ value, className }: IdeaIntakeProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value))

  return (
    <div className={cn('w-full h-2 rounded-full bg-slate-800 overflow-hidden', className)}>
      <div
        className="h-full bg-violet-500 transition-all duration-300 ease-out"
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  )
}
