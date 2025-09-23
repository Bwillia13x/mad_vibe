/**
 * Financial calculation utilities for value investing workflows
 */

export const formatCurrency = (value: number, options: Intl.NumberFormatOptions = {}): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options
  }).format(value)
}

export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`
}

export const formatRatio = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}x`
}

export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0
  return (value / total) * 100
}

export const calculateChange = (current: number, previous: number): number => {
  if (previous === 0) return 0
  return ((current - previous) / Math.abs(previous)) * 100
}

export const formatMetricValue = (
  value: number,
  type: 'currency' | 'percentage' | 'ratio' | 'number',
  options?: { decimals?: number }
): string => {
  const { decimals = 0 } = options || {}

  switch (type) {
    case 'currency':
      return formatCurrency(value, { maximumFractionDigits: decimals })
    case 'percentage':
      return formatPercentage(value, decimals)
    case 'ratio':
      return formatRatio(value, decimals)
    case 'number':
    default:
      return value.toLocaleString('en-US', { maximumFractionDigits: decimals })
  }
}

export const getStatusColor = (
  value: number,
  thresholds: { good: number; warning: number }
): 'good' | 'warning' | 'danger' => {
  if (value >= thresholds.good) return 'good'
  if (value >= thresholds.warning) return 'warning'
  return 'danger'
}

export const calculateWeightedAverage = (values: number[], weights: number[]): number => {
  if (values.length !== weights.length) {
    throw new Error('Values and weights arrays must have the same length')
  }

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  if (totalWeight === 0) return 0

  const weightedSum = values.reduce((sum, value, index) => sum + value * weights[index], 0)
  return weightedSum / totalWeight
}

export const calculateCompoundAnnualGrowthRate = (
  startValue: number,
  endValue: number,
  years: number
): number => {
  if (years <= 0) return 0
  if (startValue <= 0) return 0

  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100
}

export const formatNumberCompact = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value)
}

export const roundToDecimals = (value: number, decimals: number): number => {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max)
}

export const isValidPercentage = (value: number): boolean => {
  return value >= 0 && value <= 100
}

export const isValidCurrency = (value: number): boolean => {
  return value >= 0 && isFinite(value)
}
