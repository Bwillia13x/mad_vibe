import React, { memo } from 'react'
import { IconSearch, IconClock } from '@/components/ui/idea-intake-icons'
import { IdeaIntakeTag } from '@/components/ui/idea-intake-tag'

interface IdeaIntakeHeaderProps {
  prompt: string
  currentTime: string
  onPromptChange: (value: string) => void
  onPromptSubmit: (e: React.FormEvent) => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

export const IdeaIntakeHeader = memo(function IdeaIntakeHeader({
  prompt,
  currentTime,
  onPromptChange,
  onPromptSubmit,
  onKeyDown
}: IdeaIntakeHeaderProps) {
  return (
    <div className="border-b border-slate-800 bg-slate-950/70 backdrop-blur px-4 py-3 flex items-center gap-3">
      <div className="text-sm text-slate-300 flex items-center gap-2 min-w-[260px]">
        <span className="text-slate-500">Intake /</span>
        <span className="font-medium text-slate-100">Whiteboard</span>
        <span className="text-slate-600">•</span>
        <span className="inline-flex items-center gap-1 text-slate-400">
          <IconClock /> <span>{currentTime} MT</span>
        </span>
      </div>
      <form onSubmit={onPromptSubmit} className="flex-1 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
          <span className="text-slate-500">
            <IconSearch />
          </span>
          <input
            className="bg-transparent outline-none text-sm text-slate-100 placeholder-slate-500 w-full"
            placeholder={
              "Ask the Pair Analyst… e.g., 'summarize last call; list 3 risks; ROIC>12% peers'"
            }
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Omni-Prompt input"
          />
          <IdeaIntakeTag tone="violet">Omni‑Prompt</IdeaIntakeTag>
        </div>
        <button
          type="submit"
          className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm"
        >
          Send
        </button>
      </form>
      <div className="flex items-center gap-2">
        <button className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs">
          Shortcuts
        </button>
        <button className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs">
          Settings
        </button>
      </div>
    </div>
  )
})
