export interface ResearchLogEntry {
  id: string
  stageSlug: string
  stageTitle: string
  action: string
  details?: string
  timestamp: string
}

export interface ResearchLogInput {
  stageSlug: string
  stageTitle: string
  action: string
  details?: string
  timestamp?: string
}

export type MemoCommentStatus = 'open' | 'resolved'

export interface MemoComment {
  id: string
  author: string
  message: string
  status: MemoCommentStatus
  createdAt: string
}

export interface MemoCommentThread {
  sectionId: string
  comments: MemoComment[]
}

export interface MemoAttachmentState {
  include: boolean
  caption?: string
}

export interface MemoComposerStatePayload {
  sections: Record<string, string>
  reviewChecklist: Record<string, boolean>
  attachments: Record<string, MemoAttachmentState>
  commentThreads: Record<string, MemoComment[]>
  updatedAt: string
  version: number
}

export type MemoComposerStateInput = Omit<MemoComposerStatePayload, 'updatedAt'>

export interface DataNormalizationStatePayload {
  reconciledSources: Record<string, boolean>
  appliedAdjustments: Record<string, boolean>
  updatedAt: string
  version: number
}

export type DataNormalizationStateInput = Omit<DataNormalizationStatePayload, 'updatedAt'>

export interface ValuationStatePayload {
  selectedScenario: string
  assumptionOverrides: Record<string, number>
  updatedAt: string
  version: number
}

export type ValuationStateInput = Omit<ValuationStatePayload, 'updatedAt'>

export interface MonitoringStatePayload {
  acknowledgedAlerts: Record<string, boolean>
  deltaOverrides: Record<string, string>
  updatedAt: string
  version: number
}

export type MonitoringStateInput = Omit<MonitoringStatePayload, 'updatedAt'>

export interface Row {
  t: string
  side: 'Buy' | 'Sell'
  px: number
  adv: number
  curW: number
  tgtW: number
  deltaW?: number
  notional?: number
  shares?: number
  days?: number
  participation?: number
  bps?: number
  cost?: number
  limitPx?: number | null
}

export interface ScenarioLabStatePayload {
  driverValues: Record<string, number>
  iterations: number
  updatedAt: string
  version: number
}

export type ScenarioLabStateInput = Omit<ScenarioLabStatePayload, 'updatedAt'>

export interface ExecutionPlannerStatePayload {
  rows: Row[]
  portfolioNotional: number
  maxPart: number
  algo: string
  limitBps: number
  tif: string
  daysHorizon: number
  updatedAt: string
  version: number
}

export type ExecutionPlannerStateInput = Omit<ExecutionPlannerStatePayload, 'updatedAt'>

export interface Critique {
  id: number
  playbook: string
  severity: 'High' | 'Med' | 'Low'
  claim: string
  rationale: string
  action: string
  decided: boolean | null
}

export interface ScanHit {
  id: string
  src: string
  excerpt: string
}

export interface VulnerabilityItem {
  id: string
  label: string
  completed: boolean
  playbook?: string
}

export interface RedTeamStatePayload {
  artifact: string
  scope: string[]
  activePlaybooks: string[]
  critiques: Critique[]
  scanQuery: string
  scanHits: ScanHit[]
  vulnerabilityChecklist: VulnerabilityItem[]
  updatedAt: string
  version: number
}

export type RedTeamStateInput = Omit<RedTeamStatePayload, 'updatedAt'>
