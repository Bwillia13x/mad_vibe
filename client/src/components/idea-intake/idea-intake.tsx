import React from 'react'
import { useLocation } from 'wouter'
import { useIdeaIntake } from '@/hooks/useIdeaIntake'
import { InputsSection } from './inputs-section'
import type { IntakeQuickAction } from './quick-actions'
import { DisqualifiersSection } from './disqualifiers-section'
import { WorkSection } from './work-section'
import { OutputsSection } from './outputs-section'
import { IdeaIntakeHeader } from './idea-intake-header'
import { IdeaIntakeFooter } from './idea-intake-footer'
import { QUALITY_HINTS } from '@/lib/idea-intake-constants'
import { IdeaIntakeCard } from '@/components/ui/idea-intake-card'

export function IdeaIntake() {
  const [, navigate] = useLocation()
  const {
    // State
    prompt,
    history,
    ticker,
    source,
    whyNow,
    thesis,
    disqualifiers,
    triageDecision,

    // Computed
    whiteboardNotes,
    currentTime,
    gatePassed,
    aiDraft,
    isGenerating,
    aiError,
    runQuickAction,
    insertCopilotDraftIntoThesis,
    recentLog,

    // Actions
    setPrompt,
    submitPrompt,
    setTicker,
    setSource,
    setWhyNow,
    setThesis,
    toggleDisqualifier,
    setTriageDecision,
    submitNext,
    handleKeyDown
  } = useIdeaIntake()

  return (
    <div className="w-full bg-slate-950 text-slate-100 rounded-xl ring-1 ring-slate-800">
      <IdeaIntakeHeader
        prompt={prompt}
        currentTime={currentTime}
        onPromptChange={setPrompt}
        onPromptSubmit={(event) => {
          event.preventDefault()
          void submitPrompt()
        }}
        onKeyDown={handleKeyDown}
      />

      {/* Body grid */}
      <div className="p-4 grid grid-cols-12 gap-4">
        {/* Left: Inputs */}
        <div className="col-span-12 xl:col-span-4 space-y-4">
          <InputsSection
            ticker={ticker}
            source={source}
            whyNow={whyNow}
            thesis={thesis}
            onTickerChange={setTicker}
            onSourceChange={setSource}
            onWhyNowChange={setWhyNow}
            onThesisChange={setThesis}
            quickActions={quickActions}
            onQuickActionSelect={(prompt) => void runQuickAction(prompt)}
            isGenerating={isGenerating}
          />

          <DisqualifiersSection
            disqualifiers={disqualifiers}
            onToggleDisqualifier={toggleDisqualifier}
          />

          <IdeaIntakeCard title="Quality Hints" subtitle="Signals to watch">
            <ul className="text-sm text-slate-200 list-disc pl-5 space-y-1">
              {QUALITY_HINTS.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </IdeaIntakeCard>
        </div>

        {/* Center: Work */}
        <div className="col-span-12 xl:col-span-5">
          <WorkSection
            whiteboardNotes={whiteboardNotes}
            aiDraft={aiDraft}
            isGenerating={isGenerating}
            aiError={aiError}
            onInsertDraft={insertCopilotDraftIntoThesis}
          />
        </div>

        {/* Right: Outputs */}
        <div className="col-span-12 xl:col-span-3">
          <OutputsSection
            triageDecision={triageDecision}
            gatePassed={gatePassed}
            onTriageDecisionChange={setTriageDecision}
            onNext={submitNext}
            disqualifiers={disqualifiers}
            ticker={ticker}
            recentLog={recentLog}
            onViewFullLog={() => navigate('/workbench/intake')}
          />
        </div>
      </div>

      <IdeaIntakeFooter history={history} />

      {/* Dev Test (render-only) */}
      <div className="hidden">
        <IdeaIntakeCard
          title="Parser Test — Symbols and Icons"
          subtitle="Ensures '>' and icons render without parse errors"
        >
          <div className="text-sm text-slate-300 space-y-2">
            <div>Edge text: {'ROIC > 12%'}</div>
            <div className="inline-flex items-center gap-2">Icons: Search, Bolt, Clock</div>
          </div>
        </IdeaIntakeCard>
      </div>
    </div>
  )
}

const quickActions: IntakeQuickAction[] = [
  {
    id: 'triage-summary',
    label: 'Summarize key factors',
    prompt:
      'Provide a concise summary of the idea intake fields (ticker, why now, thesis stub) and list the top 3 factors to confirm before advancing.'
  },
  {
    id: 'risks',
    label: 'Surface blind spots',
    prompt:
      'Given the current idea intake details, identify the top 3 potential blind spots or disqualifiers we should investigate.'
  },
  {
    id: 'diligence',
    label: 'Suggest diligence next',
    prompt: 'Recommend the next three diligence tasks, citing why each task matters for this idea.'
  },
  {
    id: 'compare',
    label: 'Compare to watchlist',
    prompt:
      'Compare this idea to the existing watchlist and note whether it should be prioritized, deferred, or dropped.'
  }
]
