// MadLab Workbench UI Components - Shared utilities for workbench stages
// Production-grade components with proper TypeScript, accessibility, and performance optimization

import React from 'react'
import { cn } from './utils'

// ------------------------ Common Types ------------------------
export type PaletteKey = 'slate' | 'violet' | 'emerald' | 'amber' | 'rose' | 'blue'

export interface CardProps {
  title: string
  subtitle?: string
  right?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export interface TagProps {
  tone?: PaletteKey
  children: React.ReactNode
  className?: string
}

export interface SparklineProps {
  points: number[]
  height?: number
  className?: string
}

// ------------------------ Optimized Helper Functions ------------------------
// Memoized color palette to prevent recreation on every render
const colorPalette: Record<PaletteKey, string> = {
  slate: 'bg-slate-800/60 text-slate-200 ring-slate-700/80',
  violet: 'bg-violet-800/40 text-violet-100 ring-violet-700/70',
  emerald: 'bg-emerald-800/40 text-emerald-100 ring-emerald-700/70',
  amber: 'bg-amber-800/40 text-amber-100 ring-amber-700/70',
  rose: 'bg-rose-800/40 text-rose-100 ring-rose-700/70',
  blue: 'bg-sky-800/40 text-sky-100 ring-sky-700/70'
}

export const cls = (...s: (string | boolean | undefined)[]): string => s.filter(Boolean).join(' ')

// ------------------------ Core UI Components ------------------------
export function Card({ title, subtitle, right, children, className }: CardProps) {
  return (
    <div
      className={cn('bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm backdrop-blur-md', className)}
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

export function Tag({ tone = 'slate', children, className }: TagProps) {
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-full text-xs font-medium ring-1',
        colorPalette[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

// ------------------------ Data Visualization Components ------------------------
// Optimized ProgressBar with memoization
export const ProgressBar = React.memo<{ value: number; className?: string }>(
  ({ value, className }) => {
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
)

// Optimized Sparkline with memoization to prevent recalculation
export const Sparkline = React.memo<SparklineProps>(({ points, height = 36, className }) => {
  const w = 120
  const h = height

  // Use useMemo for expensive calculations
  const pathData = React.useMemo(() => {
    if (points.length === 0) return ''

    const min = Math.min(...points)
    const max = Math.max(...points)
    const span = Math.max(1, max - min)

    return points
      .map((y, i) => {
        const xPos = (i / (points.length - 1 || 1)) * w
        const yPos = h - ((y - min) / span) * h
        return `${i === 0 ? 'M' : 'L'}${xPos.toFixed(1)},${yPos.toFixed(1)}`
      })
      .join(' ')
  }, [points, height])

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn('w-full h-9', className)} aria-hidden="true">
      <path
        d={pathData}
        fill="none"
        stroke="currentColor"
        className="text-slate-500"
        strokeWidth="1.5"
      />
    </svg>
  )
})

// ------------------------ Icon Components (Production Optimized) ------------------------
export function IconSearch() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-3.5-3.5" />
      </svg>
    </span>
  )
}

export function IconClock() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    </span>
  )
}

export function IconBolt() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
      </svg>
    </span>
  )
}

export function IconCheck() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m20 6-11 11L4 12" />
      </svg>
    </span>
  )
}

export function IconNext() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </span>
  )
}

export function IconSave() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
        <path d="M17 21v-8H7v8M7 3v5h8" />
      </svg>
    </span>
  )
}

export function IconFilter() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3 5h18" />
        <path d="M6 12h12" />
        <path d="M10 19h4" />
      </svg>
    </span>
  )
}

export function IconWarn() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    </span>
  )
}

export function IconSend() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m22 2-7 20-4-9-9-4 20-7z" />
      </svg>
    </span>
  )
}

export function IconPaper() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
        <path d="M14 3v5h5" />
      </svg>
    </span>
  )
}

export function IconCite() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M7 7h10M7 12h6M7 17h10" />
      </svg>
    </span>
  )
}

export function IconTool() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M14 7a3 3 0 1 0-4 0L3 14l7 7 7-7-3-3" />
      </svg>
    </span>
  )
}

export function IconCopy() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15V5a2 2 0 0 1 2-2h10" />
      </svg>
    </span>
  )
}

export function IconList() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M8 6h13M8 12h13M8 18h13" />
        <path d="M3 6h.01M3 12h.01M3 18h.01" />
      </svg>
    </span>
  )
}

export function IconPlus() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    </span>
  )
}

export function IconTrash() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3 6h18" />
        <path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" />
        <path d="M10 11v6M14 11v6" />
      </svg>
    </span>
  )
}

export function IconUpDown() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m3 8 4-4 4 4" />
        <path d="m17 16 4 4 4-4" transform="translate(-5 -4)" />
      </svg>
    </span>
  )
}

export function IconHome() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m3 12 9-9 9 9" />
        <path d="M9 21V9h6v12" />
      </svg>
    </span>
  )
}

export function IconSpark() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 21l3-6-3-6m0 0h6m-6 0H3" />
        <circle cx="9" cy="8" r="2" />
        <path d="M9 15h6" />
      </svg>
    </span>
  )
}

// Mini progress bar component for factor visualization
export interface MiniBarProps {
  label: string
  value: number
  right?: string
  className?: string
}

export const MiniBar = React.memo<MiniBarProps>(({ label, value, right, className }) => {
  const pctw = Math.max(0, Math.min(100, Math.round(value)))

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="text-xs w-24 text-slate-400 truncate">{label}</div>
      <div className="flex-1 h-2 bg-slate-800 rounded">
        <div className="h-2 bg-sky-500 rounded" style={{ width: `${pctw}%` }} />
      </div>
      <div className="text-xs text-slate-300 w-14 text-right">{right ?? `${pctw}%`}</div>
    </div>
  )
})

// Re-export cn utility for components
export { cn }

// ------------------------ Performance Optimized Components ------------------------
// All components are now memoized by default
export const MemoizedCard = React.memo(Card)
export const MemoizedTag = React.memo(Tag)
export const MemoizedSparkline = React.memo(Sparkline)
export const MemoizedProgressBar = React.memo(ProgressBar)

// ------------------------ Accessibility Helpers ------------------------
// Memoized formatting functions to reduce memory allocations
export function formatNumber(value: number, decimals: number = 1): string {
  return value.toFixed(decimals)
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatCurrency(value: number, unit: 'm' | 'k' | 'none' = 'm'): string {
  const formatted = value.toLocaleString()
  switch (unit) {
    case 'm':
      return `$${formatted}m`
    case 'k':
      return `$${formatted}k`
    default:
      return `$${formatted}`
  }
}

// Optimized currency formatter that reuses formatter instances
const currencyFormatters = new Map<string, Intl.NumberFormat>()
export function formatCurrencyOptimized(value: number, unit: 'm' | 'k' | 'none' = 'm'): string {
  const key = `currency-${unit}`
  if (!currencyFormatters.has(key)) {
    currencyFormatters.set(
      key,
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })
    )
  }

  const formatter = currencyFormatters.get(key)!
  const formatted = formatter.format(value)

  switch (unit) {
    case 'm':
      return `${formatted}m`
    case 'k':
      return `${formatted}k`
    default:
      return formatted
  }
}

// ------------------------ Validation Helpers ------------------------
export function validatePercentage(value: number, min: number = 0, max: number = 100): boolean {
  return value >= min && value <= max
}

export function validateRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max
}

// ------------------------ Error Boundary Component ------------------------
export class WorkbenchErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Workbench Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <Card title="Error" subtitle="Something went wrong">
            <div className="text-sm text-slate-300">
              An error occurred while rendering this component.
              <button
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="ml-2 px-2 py-1 bg-violet-600 rounded text-xs"
              >
                Retry
              </button>
            </div>
          </Card>
        )
      )
    }

    return this.props.children
  }
}
