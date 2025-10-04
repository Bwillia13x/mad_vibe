import { useState, useEffect } from 'react'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
import { fetchArtifacts } from '@/lib/workspace-api'
import type { WorkspaceArtifact } from '@shared/types'
import { cn } from '@/lib/utils'
import {
  FileText,
  BarChart3,
  DollarSign,
  FileCode,
  StickyNote,
  ChevronRight,
  ChevronDown,
  Search,
  Loader2
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { workflowStages } from '@/lib/workflow'

const ARTIFACT_ICONS = {
  note: StickyNote,
  model: DollarSign,
  memo: FileText,
  screener: BarChart3,
  chart: BarChart3,
  analysis: FileCode,
  other: FileText
} as const

export function ExplorerPanel() {
  const { currentWorkspace } = useWorkspaceContext()
  const [artifacts, setArtifacts] = useState<WorkspaceArtifact[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set(['intake', 'screener']))

  useEffect(() => {
    if (currentWorkspace) {
      loadArtifacts()
    } else {
      setArtifacts([])
    }
  }, [currentWorkspace?.id])

  const loadArtifacts = async () => {
    if (!currentWorkspace) return

    setIsLoading(true)
    try {
      const data = await fetchArtifacts(currentWorkspace.id)
      setArtifacts(data)
    } catch (err) {
      console.error('Failed to load artifacts:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleStage = (stageSlug: string) => {
    setExpandedStages((prev) => {
      const next = new Set(prev)
      if (next.has(stageSlug)) {
        next.delete(stageSlug)
      } else {
        next.add(stageSlug)
      }
      return next
    })
  }

  // Group artifacts by stage
  const artifactsByStage = artifacts.reduce(
    (acc, artifact) => {
      if (!acc[artifact.stageSlug]) {
        acc[artifact.stageSlug] = []
      }
      acc[artifact.stageSlug].push(artifact)
      return acc
    },
    {} as Record<string, WorkspaceArtifact[]>
  )

  // Filter by search query
  const filteredStages = workflowStages.filter((stage) => {
    if (!searchQuery) return true

    const stageArtifacts = artifactsByStage[stage.slug] || []
    const stageMatches = stage.title.toLowerCase().includes(searchQuery.toLowerCase())
    const artifactMatches = stageArtifacts.some((a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return stageMatches || artifactMatches
  })

  if (!currentWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 p-4">
        <FileText className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm text-center">No workspace selected</p>
        <p className="text-xs text-center mt-1">Create or open a workspace to get started</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-slate-800">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Explorer
        </h3>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input
            placeholder="Search artifacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-sm bg-slate-900 border-slate-800"
          />
        </div>
      </div>

      {/* Artifacts tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : artifacts.length === 0 ? (
          <div className="py-8 px-3 text-center text-sm text-slate-500">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No artifacts yet</p>
            <p className="text-xs mt-1">Outputs will appear here as you work</p>
          </div>
        ) : (
          filteredStages.map((stage) => {
            const stageArtifacts = artifactsByStage[stage.slug] || []
            if (stageArtifacts.length === 0 && searchQuery) return null

            const isExpanded = expandedStages.has(stage.slug)

            return (
              <div key={stage.slug} className="space-y-0.5">
                {/* Stage header */}
                <button
                  onClick={() => toggleStage(stage.slug)}
                  className={cn(
                    'w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-sm',
                    'hover:bg-slate-800/50 transition-colors text-left',
                    stageArtifacts.length > 0 ? 'text-slate-300' : 'text-slate-500'
                  )}
                >
                  {stageArtifacts.length > 0 ? (
                    isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                    )
                  ) : (
                    <div className="w-3.5" />
                  )}
                  <span className="flex-1 truncate">{stage.shortTitle}</span>
                  {stageArtifacts.length > 0 && (
                    <span className="text-xs text-slate-500">{stageArtifacts.length}</span>
                  )}
                </button>

                {/* Stage artifacts */}
                {isExpanded && stageArtifacts.length > 0 && (
                  <div className="ml-5 space-y-0.5">
                    {stageArtifacts.map((artifact) => {
                      const Icon = ARTIFACT_ICONS[artifact.type] || FileText

                      return (
                        <button
                          key={artifact.id}
                          className={cn(
                            'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm',
                            'hover:bg-slate-800 transition-colors text-left',
                            'text-slate-400 hover:text-slate-200'
                          )}
                          onClick={() => {
                            // TODO: Open artifact viewer
                            console.log('Open artifact:', artifact)
                          }}
                        >
                          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="flex-1 truncate">{artifact.name}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer info */}
      <div className="flex-shrink-0 p-2 border-t border-slate-800 bg-slate-950">
        <div className="text-xs text-slate-500">
          <div className="truncate">
            <span className="font-medium text-slate-400">{currentWorkspace.name}</span>
            {currentWorkspace.ticker && <span className="ml-1">({currentWorkspace.ticker})</span>}
          </div>
          <div className="mt-0.5">
            {artifacts.length} artifact{artifacts.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  )
}
