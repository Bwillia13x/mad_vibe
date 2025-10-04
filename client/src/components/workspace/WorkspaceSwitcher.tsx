import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
import { cn } from '@/lib/utils'
import { Plus, X, ChevronDown, Folder, Archive } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface WorkspaceSwitcherProps {
  onCreateNew: () => void
}

export function WorkspaceSwitcher({ onCreateNew }: WorkspaceSwitcherProps) {
  const { currentWorkspace, recentWorkspaces, switchWorkspace, archiveWorkspace } =
    useWorkspaceContext()
  const [hoveredId, setHoveredId] = useState<number | null>(null)

  const handleSwitch = async (id: number) => {
    if (id !== currentWorkspace?.id) {
      try {
        await switchWorkspace(id)
      } catch (err) {
        console.error('Failed to switch workspace:', err)
      }
    }
  }

  const handleArchive = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Archive this workspace? You can restore it later from archived workspaces.')) {
      try {
        await archiveWorkspace(id)
      } catch (err) {
        console.error('Failed to archive workspace:', err)
      }
    }
  }

  // Show current workspace and up to 4 recent ones in tabs
  const visibleWorkspaces = recentWorkspaces.slice(0, 5)
  const hasMore = recentWorkspaces.length > 5

  return (
    <div className="flex items-center gap-1 bg-slate-900 border-b border-slate-800 px-2 py-1.5">
      {/* Workspace tabs */}
      {visibleWorkspaces.map((workspace) => {
        const isActive = workspace.id === currentWorkspace?.id
        const isHovered = workspace.id === hoveredId

        return (
          <button
            key={workspace.id}
            onClick={() => handleSwitch(workspace.id)}
            onMouseEnter={() => setHoveredId(workspace.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={cn(
              'group relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
              'min-w-[120px] max-w-[200px]',
              isActive
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            )}
          >
            <Folder className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate flex-1 text-left">
              {workspace.name}
              {workspace.ticker && (
                <span className="ml-1 text-xs opacity-70">({workspace.ticker})</span>
              )}
            </span>

            {/* Close button */}
            {isHovered && (
              <button
                onClick={(e) => handleArchive(workspace.id, e)}
                className="flex-shrink-0 p-0.5 rounded hover:bg-slate-700 transition-colors"
                aria-label="Archive workspace"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </button>
        )
      })}

      {/* More workspaces dropdown */}
      {hasMore && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-slate-400 hover:text-slate-200"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {recentWorkspaces.slice(5).map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => handleSwitch(workspace.id)}
                className="flex items-center gap-2"
              >
                <Folder className="w-3.5 h-3.5" />
                <span className="flex-1 truncate">{workspace.name}</span>
                {workspace.ticker && (
                  <span className="text-xs text-slate-500">{workspace.ticker}</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* New workspace button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onCreateNew}
        className="h-8 px-2 text-slate-400 hover:text-slate-200"
        title="New workspace (Cmd+T)"
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  )
}
