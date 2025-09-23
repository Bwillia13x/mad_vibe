export type TriageDecision = 'Advance' | 'Park' | 'Reject'

export type Disqualifier =
  (typeof import('@/lib/idea-intake-constants').IDEA_INTAKE_DISQUALIFIERS)[number]

export interface PromptHistoryEntry {
  q: string
  t: string
}

export interface WhiteboardNote {
  id: number
  text: string
  x: number
  y: number
  tone: 'emerald' | 'amber' | 'rose'
}

export interface IdeaIntakeState {
  // Omni-Prompt
  prompt: string
  history: PromptHistoryEntry[]

  // Intake fields
  ticker: string
  source: string
  whyNow: string
  thesis: string
  disqualifiers: Disqualifier[]

  // Triage decision
  triageDecision: TriageDecision
}

export interface IdeaIntakeActions {
  setPrompt: (prompt: string) => void
  submitPrompt: () => void
  setTicker: (ticker: string) => void
  setSource: (source: string) => void
  setWhyNow: (whyNow: string) => void
  setThesis: (thesis: string) => void
  toggleDisqualifier: (disqualifier: Disqualifier) => void
  setTriageDecision: (decision: TriageDecision) => void
  submitNext: () => void
}
