import React, { memo } from 'react'
import { IdeaIntakeCard } from '@/components/ui/idea-intake-card'
import { IdeaIntakeTag } from '@/components/ui/idea-intake-tag'
import { cn } from '@/lib/utils'
import type { WhiteboardNote } from '@/types/idea-intake'

interface WorkSectionProps {
  whiteboardNotes: WhiteboardNote[]
  aiDraft: string
  isGenerating: boolean
  aiError: string | null
  onInsertDraft: () => void
}

export const WorkSection = memo(function WorkSection({
  whiteboardNotes,
  aiDraft,
  isGenerating,
  aiError,
  onInsertDraft
}: WorkSectionProps) {
  return (
    <div className="space-y-4">
      <IdeaIntakeCard
        title="Draft One‑Pager Snapshot"
        subtitle="Copilot generated summary from the latest prompt"
        right={<IdeaIntakeTag tone="violet">Copilot</IdeaIntakeTag>}
      >
        <div className="text-sm text-slate-300 space-y-3">
          {aiError ? (
            <div className="rounded-lg border border-rose-700 bg-rose-900/20 px-3 py-2 text-rose-200">
              {aiError}
            </div>
          ) : (
            <div className="min-h-[140px] rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 whitespace-pre-wrap">
              {isGenerating
                ? 'Generating updated summary…'
                : aiDraft ||
                  'Use the Omni-Prompt to generate a summary of filings, key drivers, and diligence gaps.'}
            </div>
          )}
          <div className="grid sm:grid-cols-3 gap-3 text-xs text-slate-400">
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
              <div className="text-[11px] uppercase text-slate-500">Status</div>
              <div className="text-sm text-slate-200">
                {isGenerating
                  ? 'Working…'
                  : aiDraft
                    ? 'Updated from latest prompt'
                    : 'Awaiting prompt'}
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
              <div className="text-[11px] uppercase text-slate-500">Recommended use</div>
              <div className="text-sm text-slate-200">Paste into memo draft / dossier intro</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
              <div className="text-[11px] uppercase text-slate-500">Tip</div>
              <div className="text-sm text-slate-200">
                Ask for gaps, risks, or follow-up diligence
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isGenerating || !aiDraft.trim()}
              onClick={() => void onInsertDraft()}
              className="px-3 py-1.5 rounded-lg border border-violet-500 text-xs text-violet-200 bg-violet-500/10 hover:bg-violet-500/20 transition-colors disabled:opacity-50"
            >
              Insert into thesis stub
            </button>
            <span className="text-[11px] uppercase text-slate-500 self-center">
              Adds the draft below the existing thesis field
            </span>
          </div>
        </div>
      </IdeaIntakeCard>

      <IdeaIntakeCard
        title="Whiteboard Canvas"
        subtitle="Free‑form notes; drag to arrange (static demo)"
        right={<IdeaIntakeTag tone="slate">Canvas</IdeaIntakeTag>}
      >
        <div className="relative h-72 rounded-xl border border-slate-800 bg-[linear-gradient(to_right,rgba(100,116,139,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(100,116,139,0.08)_1px,transparent_1px)] bg-[length:20px_20px] overflow-hidden p-2">
          {whiteboardNotes.map((note) => (
            <div
              key={note.id}
              className={cn(
                'absolute w-48 rounded-lg p-3 text-sm shadow-md border',
                note.tone === 'emerald' && 'bg-emerald-900/30 border-emerald-700 text-emerald-100',
                note.tone === 'amber' && 'bg-amber-900/30 border-amber-700 text-amber-100',
                note.tone === 'rose' && 'bg-rose-900/30 border-rose-700 text-rose-100'
              )}
              style={{ left: `${note.x}%`, top: `${note.y}%` }}
            >
              {note.text}
            </div>
          ))}
          <div className="absolute bottom-2 right-2 text-xs text-slate-500">Static preview</div>
        </div>
        <div className="mt-2 flex gap-2">
          <button
            className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs hover:bg-slate-800 transition-colors"
            title="Add a new note to the whiteboard"
          >
            Add note
          </button>
          <button
            className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs hover:bg-slate-800 transition-colors"
            title="Attach evidence from filings or transcripts"
          >
            Attach evidence
          </button>
        </div>
      </IdeaIntakeCard>

      <IdeaIntakeCard
        title="Evidence Capture"
        subtitle="Link to filings / transcripts / notes"
        right={<IdeaIntakeTag tone="emerald">3 cited</IdeaIntakeTag>}
      >
        <ul className="text-sm text-slate-200 space-y-1 list-disc pl-5">
          <li>10‑K FY2024 (pp. 13–18)</li>
          <li>Q2 call transcript — CFO margin commentary</li>
          <li>Competitor filing — segment economics</li>
        </ul>
      </IdeaIntakeCard>
    </div>
  )
})
