import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { IdeaWorkspace, CreateWorkspaceInput, UpdateWorkspaceInput } from '@shared/types'
import {
  fetchWorkspaces,
  fetchWorkspace,
  createWorkspace as apiCreateWorkspace,
  updateWorkspace as apiUpdateWorkspace,
  deleteWorkspace as apiDeleteWorkspace
} from '@/lib/workspace-api'

interface WorkspaceContextValue {
  currentWorkspace: IdeaWorkspace | null
  allWorkspaces: IdeaWorkspace[]
  recentWorkspaces: IdeaWorkspace[]
  isLoading: boolean
  error: string | null
  createWorkspace: (input: CreateWorkspaceInput) => Promise<IdeaWorkspace>
  switchWorkspace: (id: number) => Promise<void>
  updateWorkspace: (id: number, input: UpdateWorkspaceInput) => Promise<void>
  deleteWorkspace: (id: number) => Promise<void>
  archiveWorkspace: (id: number) => Promise<void>
  refreshWorkspaces: () => Promise<void>
  clearError: () => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined)

const STORAGE_KEY = 'mad-vibe-current-workspace-id'
const MAX_RECENT = 10

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [currentWorkspace, setCurrentWorkspace] = useState<IdeaWorkspace | null>(null)
  const [allWorkspaces, setAllWorkspaces] = useState<IdeaWorkspace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load workspaces on mount
  useEffect(() => {
    loadWorkspaces()
  }, [])

  const loadWorkspaces = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const workspaces = await fetchWorkspaces('active')
      setAllWorkspaces(workspaces)

      // Try to restore last workspace from localStorage
      const savedId = localStorage.getItem(STORAGE_KEY)
      if (savedId) {
        const id = parseInt(savedId, 10)
        const workspace = workspaces.find((w) => w.id === id)
        if (workspace) {
          setCurrentWorkspace(workspace)
        } else if (workspaces.length > 0) {
          // Fallback to first workspace if saved one doesn't exist
          setCurrentWorkspace(workspaces[0])
          localStorage.setItem(STORAGE_KEY, workspaces[0].id.toString())
        }
      } else if (workspaces.length > 0) {
        // No saved workspace, use first one
        setCurrentWorkspace(workspaces[0])
        localStorage.setItem(STORAGE_KEY, workspaces[0].id.toString())
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces')
      console.error('Failed to load workspaces:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createWorkspace = useCallback(
    async (input: CreateWorkspaceInput): Promise<IdeaWorkspace> => {
      try {
        setError(null)
        const newWorkspace = await apiCreateWorkspace(input)

        setAllWorkspaces((prev) => [newWorkspace, ...prev])
        setCurrentWorkspace(newWorkspace)
        localStorage.setItem(STORAGE_KEY, newWorkspace.id.toString())

        return newWorkspace
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create workspace'
        setError(message)
        throw err
      }
    },
    []
  )

  const switchWorkspace = useCallback(async (id: number) => {
    try {
      setError(null)
      const workspace = await fetchWorkspace(id)

      setCurrentWorkspace(workspace)
      localStorage.setItem(STORAGE_KEY, id.toString())

      // Update in list to reflect lastAccessedAt change
      setAllWorkspaces((prev) =>
        prev
          .map((w) => (w.id === id ? workspace : w))
          .sort(
            (a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime()
          )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch workspace')
      throw err
    }
  }, [])

  const updateWorkspace = useCallback(
    async (id: number, input: UpdateWorkspaceInput) => {
      try {
        setError(null)
        const updated = await apiUpdateWorkspace(id, input)

        setAllWorkspaces((prev) => prev.map((w) => (w.id === id ? updated : w)))

        if (currentWorkspace?.id === id) {
          setCurrentWorkspace(updated)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update workspace')
        throw err
      }
    },
    [currentWorkspace?.id]
  )

  const deleteWorkspace = useCallback(
    async (id: number) => {
      try {
        setError(null)
        await apiDeleteWorkspace(id)

        setAllWorkspaces((prev) => prev.filter((w) => w.id !== id))

        // If deleting current workspace, switch to another one
        if (currentWorkspace?.id === id) {
          const remaining = allWorkspaces.filter((w) => w.id !== id)
          if (remaining.length > 0) {
            await switchWorkspace(remaining[0].id)
          } else {
            setCurrentWorkspace(null)
            localStorage.removeItem(STORAGE_KEY)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete workspace')
        throw err
      }
    },
    [currentWorkspace?.id, allWorkspaces, switchWorkspace]
  )

  const archiveWorkspace = useCallback(
    async (id: number) => {
      await updateWorkspace(id, { status: 'archived' })
      // Remove from active list
      setAllWorkspaces((prev) => prev.filter((w) => w.id !== id))

      if (currentWorkspace?.id === id) {
        const remaining = allWorkspaces.filter((w) => w.id !== id)
        if (remaining.length > 0) {
          await switchWorkspace(remaining[0].id)
        } else {
          setCurrentWorkspace(null)
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    },
    [currentWorkspace?.id, allWorkspaces, updateWorkspace, switchWorkspace]
  )

  const refreshWorkspaces = useCallback(async () => {
    await loadWorkspaces()
  }, [loadWorkspaces])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Recent workspaces (sorted by lastAccessedAt, limited)
  const recentWorkspaces = allWorkspaces
    .slice()
    .sort((a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime())
    .slice(0, MAX_RECENT)

  const value: WorkspaceContextValue = {
    currentWorkspace,
    allWorkspaces,
    recentWorkspaces,
    isLoading,
    error,
    createWorkspace,
    switchWorkspace,
    updateWorkspace,
    deleteWorkspace,
    archiveWorkspace,
    refreshWorkspaces,
    clearError
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspaceContext must be used within WorkspaceProvider')
  }
  return context
}
