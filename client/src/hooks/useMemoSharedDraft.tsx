import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchSharedMemoDraft,
  saveSharedMemoDraft,
  fetchMemoSuggestions,
  updateMemoSuggestion,
  deleteMemoSuggestions
} from '@/lib/workflow-api'
import type {
  MemoSharedDraftPayload,
  MemoSharedDraftInput,
  MemoSuggestion,
  MemoSuggestionUpdate
} from '@shared/types'
import { useSessionKey } from './useSessionKey'

const emptyDraft: MemoSharedDraftPayload = {
  sections: {},
  reviewChecklist: {},
  attachments: {},
  commentThreads: {},
  updatedAt: '',
  version: 0,
  updatedBy: null,
  lockSessionId: null,
  lockExpiresAt: null
}

interface UseMemoSharedDraftResult {
  draft: MemoSharedDraftPayload
  suggestions: MemoSuggestion[]
  loading: boolean
  saving: boolean
  suggestionLoading: boolean
  error: string | null
  suggestionError: string | null
  refresh: () => Promise<void>
  refreshSuggestions: () => Promise<void>
  saveDraft: (input: MemoSharedDraftInput) => Promise<MemoSharedDraftPayload | null>
  updateSuggestion: (
    suggestionId: number,
    update: MemoSuggestionUpdate
  ) => Promise<MemoSuggestion | null>
  clearSuggestions: (ids: number[]) => Promise<void>
}

export function useMemoSharedDraft(workflowId?: number): UseMemoSharedDraftResult {
  const sessionKey = useSessionKey()
  const [draft, setDraft] = useState<MemoSharedDraftPayload>(emptyDraft)
  const [suggestions, setSuggestions] = useState<MemoSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestionError, setSuggestionError] = useState<string | null>(null)

  const canOperate = useMemo(() => Boolean(workflowId && sessionKey), [workflowId, sessionKey])

  const refresh = useCallback(async () => {
    if (!workflowId || !sessionKey) {
      setDraft(emptyDraft)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSharedMemoDraft(workflowId, sessionKey)
      setDraft({
        ...emptyDraft,
        ...data
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch shared draft'
      setError(message)
      setDraft(emptyDraft)
    } finally {
      setLoading(false)
    }
  }, [workflowId, sessionKey])

  const refreshSuggestions = useCallback(async () => {
    if (!workflowId || !sessionKey) {
      setSuggestions([])
      return
    }
    setSuggestionLoading(true)
    setSuggestionError(null)
    try {
      const data = await fetchMemoSuggestions(workflowId, { status: 'pending' }, sessionKey)
      setSuggestions(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load suggestions'
      setSuggestionError(message)
      setSuggestions([])
    } finally {
      setSuggestionLoading(false)
    }
  }, [workflowId, sessionKey])

  useEffect(() => {
    if (!canOperate) {
      setDraft(emptyDraft)
      setSuggestions([])
      return
    }
    void refresh()
    void refreshSuggestions()
  }, [canOperate, refresh, refreshSuggestions])

  const saveDraft = useCallback(
    async (input: MemoSharedDraftInput) => {
      if (!workflowId || !sessionKey) return null
      setSaving(true)
      setError(null)
      try {
        const saved = await saveSharedMemoDraft(workflowId, input, sessionKey)
        setDraft({ ...saved })
        return saved
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save shared draft'
        setError(message)
        return null
      } finally {
        setSaving(false)
      }
    },
    [workflowId, sessionKey]
  )

  const updateSuggestion = useCallback(
    async (suggestionId: number, update: MemoSuggestionUpdate) => {
      if (!workflowId || !sessionKey) return null
      setSuggestionError(null)
      try {
        const updated = await updateMemoSuggestion(workflowId, suggestionId, update, sessionKey)
        setSuggestions((prev) => {
          if (updated.status !== 'pending') {
            return prev.filter((item) => item.id !== updated.id)
          }
          return prev.map((item) => (item.id === updated.id ? updated : item))
        })
        return updated
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update suggestion'
        setSuggestionError(message)
        return null
      }
    },
    [workflowId, sessionKey]
  )

  const clearSuggestions = useCallback(
    async (ids: number[]) => {
      if (!workflowId || !sessionKey || ids.length === 0) return
      setSuggestionError(null)
      try {
        await deleteMemoSuggestions(workflowId, ids, sessionKey)
        setSuggestions((prev) => prev.filter((item) => !ids.includes(item.id)))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to clear suggestions'
        setSuggestionError(message)
      }
    },
    [workflowId, sessionKey]
  )

  return {
    draft,
    suggestions,
    loading,
    saving,
    suggestionLoading,
    error,
    suggestionError,
    refresh,
    refreshSuggestions,
    saveDraft,
    updateSuggestion,
    clearSuggestions
  }
}
