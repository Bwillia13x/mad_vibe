import React, { memo } from 'react'
import { IdeaIntakeCard } from '@/components/ui/idea-intake-card'
import { IdeaIntakeTag } from '@/components/ui/idea-intake-tag'
import { cn } from '@/lib/utils'
import type { WhiteboardNote } from '@/types/idea-intake'

interface WorkSectionProps {
  whiteboardNotes: WhiteboardNote[]
}

export const WorkSection = memo(function WorkSection({ whiteboardNotes }: WorkSectionProps) {
  return (
    <div className="space-y-4">
      <IdeaIntakeCard
        title="Auto‑Draft One‑Pager (preview)"
        subtitle="AI summary from filings/transcripts; you can edit later"
        right={<IdeaIntakeTag tone="violet">Draft</IdeaIntakeTag>}
      >
        <div className="text-sm text-slate-300">
          <p className="mb-2">
            Business gist, drivers, quick flags, and a rough EPV will appear here. Use the prompt to
            refine sections or request citations.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { k: 'ROIC (10y)', v: '18%' },
              { k: 'FCF Yield', v: '7.2%' },
              { k: 'Leverage', v: 'Net cash' }
            ].map(({ k, v }, i) => (
              <div key={k} className="bg-slate-950/50 rounded-xl p-3 border border-slate-800">
                <div className="text-xs text-slate-400 mb-1">{k}</div>
                <div className="text-lg text-slate-100">{v}</div>
              </div>
            ))}
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
