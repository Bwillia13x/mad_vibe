import type { ReactNode } from 'react'

interface GlassCardProps {
  title?: string
  subtitle?: string
  right?: ReactNode
  children: ReactNode
  className?: string
  id?: string
  dataTestId?: string
}

export function GlassCard({
  title,
  subtitle,
  right,
  children,
  className = '',
  id,
  dataTestId
}: GlassCardProps) {
  const headingId = title && id ? `${id}-title` : undefined
  const regionProps = title
    ? ({ role: 'region', 'aria-labelledby': headingId } as React.HTMLAttributes<HTMLDivElement>)
    : ({} as React.HTMLAttributes<HTMLDivElement>)
  return (
    <div
      id={id}
      data-testid={dataTestId}
      {...regionProps}
      className={`rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 shadow-lg shadow-violet-900/5 backdrop-blur-xl transition-colors ${className}`}
    >
      {(title || subtitle || right) && (
        <div className="flex items-start justify-between mb-3">
          <div>
            {title && (
              <h3 id={headingId} className="text-slate-100 font-semibold leading-tight">
                {title}
              </h3>
            )}
            {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  )
}
