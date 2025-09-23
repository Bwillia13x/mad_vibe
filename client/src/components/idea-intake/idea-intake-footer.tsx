import React, { memo } from 'react'
import { IconBolt } from '@/components/ui/idea-intake-icons'
import { KEYBOARD_SHORTCUTS } from '@/lib/idea-intake-constants'
import type { PromptHistoryEntry } from '@/types/idea-intake'

interface IdeaIntakeFooterProps {
  history: PromptHistoryEntry[]
}

export const IdeaIntakeFooter = memo(function IdeaIntakeFooter({ history }: IdeaIntakeFooterProps) {
  return (
    <div className="h-40 border-top border-t border-slate-800 bg-slate-950/80 p-2 flex gap-2">
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 overflow-y-auto">
        <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Prompt History</div>
        <div className="space-y-1 text-sm">
          {history.length === 0 && <div className="text-slate-500">No prompts yet.</div>}
          {history.map((h, i) => (
            <div key={i} className="flex items-start gap-2 bg-slate-950/50 rounded-md p-2">
              <span className="text-violet-300 mt-0.5">
                <IconBolt />
              </span>
              <div className="flex-1">
                <div className="text-slate-200">{h.q}</div>
                <div className="text-xs text-slate-500 mt-0.5">{h.t}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="w-72 bg-slate-900 border border-slate-800 rounded-lg p-2 overflow-y-auto">
        <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Shortcuts</div>
        <ul className="text-sm text-slate-300 space-y-1">
          {KEYBOARD_SHORTCUTS.map((shortcut) => (
            <li key={shortcut.key}>
              <span className="text-slate-500">{shortcut.key}</span> {shortcut.description}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
})
