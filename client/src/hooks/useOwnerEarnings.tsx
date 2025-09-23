import { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react'
import {
  OWNER_EARNINGS_STORAGE_KEY,
  defaultOwnerEarningsState,
  type OwnerEarningsState,
  ownerEarningsBridge,
  historicalOwnerEarnings
} from '@/lib/workflow-data'

interface OwnerEarningsContextValue {
  state: OwnerEarningsState
  toggleSegment: (id: string) => void
  bridge: typeof ownerEarningsBridge
  historical: typeof historicalOwnerEarnings
  currentOwnerEarnings: number
}

const OwnerEarningsContext = createContext<OwnerEarningsContextValue | undefined>(undefined)

const loadState = (): OwnerEarningsState => {
  if (typeof window === 'undefined') return defaultOwnerEarningsState
  try {
    const raw = window.localStorage.getItem(OWNER_EARNINGS_STORAGE_KEY)
    if (!raw) return defaultOwnerEarningsState
    const parsed = JSON.parse(raw) as OwnerEarningsState
    return {
      includeBridgeSegments: {
        ...defaultOwnerEarningsState.includeBridgeSegments,
        ...parsed.includeBridgeSegments
      }
    }
  } catch {
    return defaultOwnerEarningsState
  }
}

export function OwnerEarningsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OwnerEarningsState>(() => loadState())

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(OWNER_EARNINGS_STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.warn('Failed to persist owner earnings state', error)
    }
  }, [state])

  const toggleSegment = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      includeBridgeSegments: {
        ...prev.includeBridgeSegments,
        [id]: !prev.includeBridgeSegments[id]
      }
    }))
  }, [])

  const currentOwnerEarnings = useMemo(() => {
    return ownerEarningsBridge.reduce((sum, segment) => {
      if (!state.includeBridgeSegments[segment.id]) return sum
      return sum + segment.amount
    }, 0)
  }, [state.includeBridgeSegments])

  const value = useMemo(
    () => ({
      state,
      toggleSegment,
      bridge: ownerEarningsBridge,
      historical: historicalOwnerEarnings,
      currentOwnerEarnings
    }),
    [state, toggleSegment, currentOwnerEarnings]
  )

  return <OwnerEarningsContext.Provider value={value}>{children}</OwnerEarningsContext.Provider>
}

export function useOwnerEarnings() {
  const ctx = useContext(OwnerEarningsContext)
  if (!ctx) throw new Error('useOwnerEarnings must be used within OwnerEarningsProvider')
  return ctx
}
