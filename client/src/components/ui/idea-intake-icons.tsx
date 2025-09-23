import React from 'react'
import { cn } from '@/lib/utils'

interface IconProps {
  className?: string
}

export function IconSearch({ className }: IconProps) {
  return (
    <span aria-hidden className={cn('inline-block', className)}>
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

export function IconClock({ className }: IconProps) {
  return (
    <span aria-hidden className={cn('inline-block', className)}>
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

export function IconBolt({ className }: IconProps) {
  return (
    <span aria-hidden className={cn('inline-block', className)}>
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

export function IconCheck({ className }: IconProps) {
  return (
    <span aria-hidden className={cn('inline-block', className)}>
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

export function IconNext({ className }: IconProps) {
  return (
    <span aria-hidden className={cn('inline-block', className)}>
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
