import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'valor-session-key'

function generateKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function useSessionKey(): string {
  const [key, setKey] = useState<string>('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const existing = window.localStorage.getItem(STORAGE_KEY)
      if (existing && existing.trim().length > 0) {
        setKey(existing)
        return
      }
      const created = generateKey()
      window.localStorage.setItem(STORAGE_KEY, created)
      setKey(created)
    } catch {
      // Fallback if localStorage unavailable
      setKey((prev) => (prev && prev.length ? prev : generateKey()))
    }
  }, [])

  // Freeze the value for consumers once available
  const value = useMemo(() => key, [key])
  return value
}
