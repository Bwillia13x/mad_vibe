/**
 * Workspace utility functions
 * Formatting, sorting, and calculation helpers for workspace data
 */

import type { WorkspaceArtifact, IdeaWorkspace } from '@shared/types'

/**
 * Format ISO date string to readable date key (e.g., "Mon, Jan 15")
 */
export function formatDateKey(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format ISO date string to simple date (e.g., "Jan 15, 2025")
 */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Format ISO date string to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(iso: string): string {
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const date = new Date(iso)
  const diffMs = date.getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / 60000)

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, 'minute')
  }
  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, 'hour')
  }
  const diffDays = Math.round(diffHours / 24)
  if (Math.abs(diffDays) < 30) {
    return formatter.format(diffDays, 'day')
  }
  const diffMonths = Math.round(diffDays / 30)
  if (Math.abs(diffMonths) < 12) {
    return formatter.format(diffMonths, 'month')
  }
  const diffYears = Math.round(diffMonths / 12)
  return formatter.format(diffYears, 'year')
}

/**
 * Sort workspace artifacts by updatedAt descending
 */
export function sortByUpdatedAtDesc(a: WorkspaceArtifact, b: WorkspaceArtifact): number {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
}

/**
 * Format snapshot type for display
 */
export function formatSnapshotType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Format AI capability for display
 */
export function formatCapability(capability: string): string {
  const labels: Record<string, string> = {
    generate: 'Generate',
    critique: 'Critique',
    summarize: 'Summarize',
    extract: 'Extract',
    validate: 'Validate',
    plan: 'Plan',
    refine: 'Refine'
  }
  return labels[capability] || capability
}

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD'
  }).format(value)
}

/**
 * Format currency value in compact notation
 */
export function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value)
}

/**
 * Check if value is a finite number
 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Compute workspace metrics from workspace data
 */
export interface WorkspaceMetric {
  label: string
  value: string
  helper?: string
  trend?: string
}

export function computeWorkspaceMetrics(
  workspace: IdeaWorkspace | null | undefined
): WorkspaceMetric[] {
  if (!workspace) return []

  const settings = workspace.settings || {}

  const price = isFiniteNumber(settings.currentPrice)
    ? formatCurrency(Number(settings.currentPrice))
    : '—'
  const marketCap = isFiniteNumber(settings.marketCap)
    ? formatCompactCurrency(Number(settings.marketCap))
    : '—'
  const peRatio = isFiniteNumber(settings.peRatio) ? Number(settings.peRatio).toFixed(1) : '—'
  const debtToEquity = isFiniteNumber(settings.debtToEquity)
    ? `${Number(settings.debtToEquity).toFixed(2)}x`
    : '—'
  const lastRefresh = settings.lastDataRefresh
    ? formatRelativeTime(settings.lastDataRefresh)
    : 'Not refreshed'

  return [
    {
      label: 'Current Price',
      value: price,
      helper: workspace.ticker ? `Ticker ${workspace.ticker}` : undefined
    },
    { label: 'Market Cap', value: marketCap },
    { label: 'P/E Ratio', value: peRatio },
    { label: 'Debt / Equity', value: debtToEquity },
    {
      label: 'Last Data Refresh',
      value: lastRefresh,
      helper: settings.lastDataRefresh
        ? new Date(settings.lastDataRefresh).toLocaleString()
        : undefined
    },
    {
      label: 'Artifacts Saved',
      value: workspace.stageCompletions
        ? Object.keys(workspace.stageCompletions).length.toString()
        : '0'
    }
  ]
}
