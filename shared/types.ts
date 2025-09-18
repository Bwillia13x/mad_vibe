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
