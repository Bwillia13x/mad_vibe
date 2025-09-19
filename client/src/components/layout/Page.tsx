import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10', className)}>
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  badge,
  actions
}: {
  title: string
  subtitle?: string
  badge?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="space-y-2">
        {badge}
        <h1 className="text-3xl font-semibold text-slate-50">{title}</h1>
        {subtitle && <p className="max-w-2xl text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

export function GlassCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-slate-800 bg-slate-900/60 shadow-[0_0_24px_rgba(15,23,42,0.45)]', className)}>
      {children}
    </div>
  )
}
