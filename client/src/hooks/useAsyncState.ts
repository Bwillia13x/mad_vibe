import { useState, useCallback, useRef } from 'react'
import { LoadingState, ErrorState } from '@/types/valuation'

export interface AsyncState extends LoadingState, ErrorState {
  execute: () => Promise<void>
  reset: () => void
}

export function useAsyncState<T extends any[]>(
  asyncFunction: (...args: T) => Promise<any>,
  dependencies: React.DependencyList = []
): AsyncState {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false
  })

  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false
  })

  const abortControllerRef = useRef<AbortController | null>(null)

  const execute = useCallback(async (...args: T) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setLoadingState({ isLoading: true, progress: 0 })
    setErrorState({ hasError: false })

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setLoadingState((prev) => ({
          ...prev,
          progress: Math.min((prev.progress || 0) + 10, 90)
        }))
      }, 100)

      await asyncFunction(...args)

      clearInterval(progressInterval)
      setLoadingState({ isLoading: false, progress: 100 })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return // Request was cancelled
      }

      setErrorState({
        hasError: true,
        error: error instanceof Error ? error : new Error('Unknown error occurred')
      })
    } finally {
      setLoadingState((prev) => ({ ...prev, isLoading: false }))
      abortControllerRef.current = null
    }
  }, dependencies)

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setLoadingState({ isLoading: false })
    setErrorState({ hasError: false })
  }, [])

  const retry = useCallback(() => {
    setErrorState({ hasError: false })
  }, [])

  return {
    ...loadingState,
    ...errorState,
    execute,
    reset,
    retry
  }
}

export default useAsyncState
