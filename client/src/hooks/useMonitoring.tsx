import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  monitoringDeltas,
  monitoringAlerts,
  monitoringLessons,
  type MonitoringThesisDelta,
  type MonitoringAlert
} from '@/lib/workflow-data'
import { fetchMonitoringState, persistMonitoringState } from '@/lib/workflow-api'
import type { MonitoringStateInput } from '@shared/types'

const MONITORING_STATUSES: MonitoringThesisDelta['status'][] = ['on-track', 'warning', 'breach']

interface MonitoringState {
  acknowledgedAlerts: Record<string, boolean>
  deltaOverrides: Partial<Record<string, MonitoringThesisDelta['status']>>
}

interface SyncStatus {
  hydrated: boolean
  isSyncing: boolean
  lastSavedAt: string | null
  error: string | null
}

interface MonitoringContextValue {
  deltas: MonitoringThesisDelta[]
  alerts: MonitoringAlert[]
  lessons: typeof monitoringLessons
  state: MonitoringState
  acknowledgeAlert: (id: string) => void
  setDeltaStatus: (id: string, status: MonitoringThesisDelta['status']) => void
  syncStatus: SyncStatus
}

const defaultState: MonitoringState = {
  acknowledgedAlerts: Object.fromEntries(
    monitoringAlerts.map((alert) => [alert.id, alert.acknowledged])
  ),
  deltaOverrides: {}
}

const MonitoringContext = createContext<MonitoringContextValue | undefined>(undefined)

const normalizeStatus = (value: string | undefined): MonitoringThesisDelta['status'] | undefined =>
  MONITORING_STATUSES.includes(value as MonitoringThesisDelta['status'])
    ? (value as MonitoringThesisDelta['status'])
    : undefined

export function MonitoringProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MonitoringState>(defaultState)
  const [version, setVersion] = useState(0)
  const [hydrated, setHydrated] = useState(false)
  const [isSyncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  const applyRemoteState = useCallback(
    (remote: Awaited<ReturnType<typeof fetchMonitoringState>>) => {
      if (!remote) {
        setState(defaultState)
        setVersion(0)
        return
      }

      const mergedAcknowledgements = {
        ...defaultState.acknowledgedAlerts,
        ...remote.acknowledgedAlerts
      }

      const mergedOverrides: MonitoringState['deltaOverrides'] = {}
      for (const [key, value] of Object.entries(remote.deltaOverrides ?? {})) {
        const status = normalizeStatus(value)
        if (status) mergedOverrides[key] = status
      }

      setState({
        acknowledgedAlerts: mergedAcknowledgements,
        deltaOverrides: mergedOverrides
      })
      setVersion(remote.version ?? 0)
      setLastSavedAt(remote.updatedAt ?? null)
    },
    []
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const remote = await fetchMonitoringState()
        if (cancelled) return
        applyRemoteState(remote)
        setSyncError(null)
      } catch (error) {
        if (!cancelled) {
          console.warn('Failed to hydrate monitoring state', error)
          setSyncError(error instanceof Error ? error.message : 'Unknown hydration error')
        }
      } finally {
        if (!cancelled) setHydrated(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [applyRemoteState])

  useEffect(() => {
    if (!hydrated) return

    let cancelled = false
    const timeout = setTimeout(() => {
      void (async () => {
        setSyncing(true)
        try {
          const deltaOverridesPayload: Record<string, MonitoringThesisDelta['status']> = {}
          for (const [key, value] of Object.entries(state.deltaOverrides)) {
            if (!value) continue
            deltaOverridesPayload[key] = value
          }

          const payload: MonitoringStateInput = {
            acknowledgedAlerts: state.acknowledgedAlerts,
            deltaOverrides: deltaOverridesPayload,
            version
          }
          const saved = await persistMonitoringState(payload)
          if (!cancelled) {
            setVersion(saved.version ?? version)
            setLastSavedAt(saved.updatedAt ?? new Date().toISOString())
            setSyncError(null)
          }
        } catch (error) {
          if (!cancelled) {
            const status = (error as any)?.status as number | undefined
            if (status === 409) {
              try {
                const remote = await fetchMonitoringState()
                if (!cancelled) {
                  applyRemoteState(remote)
                  setSyncError('Monitoring state refreshed due to concurrent edits.')
                }
              } catch (refreshError) {
                const message =
                  refreshError instanceof Error ? refreshError.message : 'Unknown persistence error'
                setSyncError(message)
              }
            } else {
              const message = error instanceof Error ? error.message : 'Unknown persistence error'
              setSyncError(message)
            }
          }
        } finally {
          if (!cancelled) setSyncing(false)
        }
      })()
    }, 500)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [state, version, hydrated, applyRemoteState])

  const acknowledgeAlert = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      acknowledgedAlerts: {
        ...prev.acknowledgedAlerts,
        [id]: true
      }
    }))
  }, [])

  const setDeltaStatus = useCallback((id: string, status: MonitoringThesisDelta['status']) => {
    setState((prev) => ({
      ...prev,
      deltaOverrides: {
        ...prev.deltaOverrides,
        [id]: status
      }
    }))
  }, [])

  const deltasWithOverrides = useMemo(() => {
    return monitoringDeltas.map((delta) => ({
      ...delta,
      status: state.deltaOverrides[delta.id] ?? delta.status
    }))
  }, [state.deltaOverrides])

  const alertsWithAck = useMemo(() => {
    return monitoringAlerts.map((alert) => ({
      ...alert,
      acknowledged: state.acknowledgedAlerts[alert.id] ?? alert.acknowledged
    }))
  }, [state.acknowledgedAlerts])

  const value: MonitoringContextValue = {
    deltas: deltasWithOverrides,
    alerts: alertsWithAck,
    lessons: monitoringLessons,
    state,
    acknowledgeAlert,
    setDeltaStatus,
    syncStatus: {
      hydrated,
      isSyncing,
      lastSavedAt,
      error: syncError
    }
  }

  return <MonitoringContext.Provider value={value}>{children}</MonitoringContext.Provider>
}

export function useMonitoring() {
  const ctx = useContext(MonitoringContext)
  if (!ctx) throw new Error('useMonitoring must be used within MonitoringProvider')
  return ctx
}
