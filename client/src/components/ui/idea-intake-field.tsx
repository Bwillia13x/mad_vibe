import React from 'react'
import { cn } from '@/lib/utils'

interface IdeaIntakeFieldProps {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  className?: string
}

export function IdeaIntakeField({
  label,
  placeholder,
  value,
  onChange,
  required = false,
  className
}: IdeaIntakeFieldProps) {
  return (
    <label className={cn('block', className)}>
      <div className="text-xs text-slate-400 mb-1">
        {label} {required && <span className="text-violet-400">*</span>}
      </div>
      <input
        className={cn(
          'w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors'
        )}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </label>
  )
}
