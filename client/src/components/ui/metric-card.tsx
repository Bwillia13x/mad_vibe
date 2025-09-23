import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  }

  const titleSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const valueSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  }

  const subtitleSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  return (
    <Card className={cn('border-slate-800 bg-slate-950/50', className)}>
      <CardContent className={cn(sizeClasses[size])}>
        <div className={cn('text-slate-500 mb-1', titleSizeClasses[size])}>{title}</div>
        <div className={cn('font-bold text-slate-100 mb-1', valueSizeClasses[size])}>{value}</div>
        {subtitle && (
          <div className={cn('text-slate-500', subtitleSizeClasses[size])}>{subtitle}</div>
        )}
      </CardContent>
    </Card>
  )
}

export default MetricCard
