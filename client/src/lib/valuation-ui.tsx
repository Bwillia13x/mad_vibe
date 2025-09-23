// Valuation Workbench UI Helpers
// Custom components and utilities for the artistic render alignment
// No external libs; pure React + Tailwind

import React from 'react'

const cls = (...s: (string | false | null | undefined)[]) => s.filter(Boolean).join(' ')
const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 })
const fmt2 = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 })

interface CardProps {
  title: string
  subtitle?: string
  right?: React.ReactNode
  children: React.ReactNode
}

export function Card({ title, subtitle, right, children }: CardProps) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm">
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

interface TagProps {
  tone?: 'slate' | 'violet' | 'emerald' | 'amber' | 'rose' | 'blue'
  children: React.ReactNode
}

export function Tag({ tone = 'slate', children }: TagProps) {
  const palette = {
    slate: 'bg-slate-800/60 text-slate-200 ring-slate-700/80',
    violet: 'bg-violet-800/40 text-violet-100 ring-violet-700/70',
    emerald: 'bg-emerald-800/40 text-emerald-100 ring-emerald-700/70',
    amber: 'bg-amber-800/40 text-amber-100 ring-amber-700/70',
    rose: 'bg-rose-800/40 text-rose-100 ring-rose-700/70',
    blue: 'bg-sky-800/40 text-sky-100 ring-sky-700/70'
  }
  return (
    <span className={cls('px-2 py-0.5 rounded-full text-xs font-medium ring-1', palette[tone])}>
      {children}
    </span>
  )
}

interface RowProps {
  left: string
  right: string
  badge?: React.ReactNode
}

export function Row({ left, right, badge }: RowProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        {badge}
        <div className="truncate text-sm text-slate-200">{left}</div>
      </div>
      <div className="text-sm text-slate-300">{right}</div>
    </div>
  )
}

interface SparklineProps {
  points?: number[]
  height?: number
}

export function Sparkline({ points = [], height = 40 }: SparklineProps) {
  const w = 160
  const h = height
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = Math.max(1, max - min)
  const d = points
    .map((y, i) => {
      const xPos = (i / (points.length - 1 || 1)) * w
      const yPos = h - ((y - min) / span) * h
      return `${i === 0 ? 'M' : 'L'}${xPos.toFixed(1)},${yPos.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" className="text-slate-400" strokeWidth="1.6" />
    </svg>
  )
}

// Icons
export function IconCalc() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 7h8" />
        <path d="M8 11h8" />
        <path d="M8 15h2" />
        <path d="M12 15h4" />
      </svg>
    </span>
  )
}

export function IconMethod() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3 3h7v7H3z" />
        <path d="M14 3h7v7h-7z" />
        <path d="M14 14h7v7h-7z" />
        <path d="M3 14h7v7H3z" />
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

export { cls, fmt, fmt2 }
