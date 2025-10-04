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

export type PresenceTelemetryEventType = 'heartbeat' | 'failure'

export interface PresenceTelemetryEvent {
  actorId: string | null
  stageSlug: string
  event: PresenceTelemetryEventType
  latencyMs?: number | null
  failureCount?: number
  timestamp: string
}

export type PresenceConflictType = 'lock_denied' | 'stale_revision' | 'explicit'

export interface PresenceConflictPayload {
  type: PresenceConflictType
  detectedAt: string
  message?: string
  latestRevision?: number | null
  blockingSessionId?: string
  blockingActorId?: string | null
}

export type ReviewerAssignmentStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'cancelled'

export type ReviewerSlaStatus = 'on_track' | 'due_soon' | 'overdue' | 'escalated'

export interface ReviewerAssignment {
  id: number
  workflowId: number
  stageSlug: string
  reviewerId: number | null
  reviewerEmail: string | null
  reviewerName: string | null
  status: ReviewerAssignmentStatus
  assignedBy: number | null
  assignedByName: string | null
  assignedAt: string | null
  dueAt: string | null
  acknowledgedAt: string | null
  acknowledgedBy: number | null
  completedAt: string | null
  reminderCount: number
  lastReminderAt: string | null
  slaStatus: ReviewerSlaStatus
  escalationLevel: number
  escalatedAt: string | null
  escalatedTo: number | null
  escalationNotes: string | null
  batchId: string | null
  notes: string | null
  metadata: Record<string, unknown>
}

export interface ReviewerAssignmentInput {
  stageSlug: string
  reviewerId?: number | null
  reviewerEmail?: string | null
  reviewerName?: string | null
  status?: ReviewerAssignmentStatus
  dueAt?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
  assignedBy?: number | null
  assignedByName?: string | null
  slaStatus?: ReviewerSlaStatus
  escalationLevel?: number | null
  escalatedTo?: number | null
  escalationNotes?: string | null
  batchId?: string | null
}

export interface ReviewerAssignmentUpdateInput {
  status?: ReviewerAssignmentStatus
  reviewerId?: number | null
  reviewerEmail?: string | null
  reviewerName?: string | null
  dueAt?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
  acknowledged?: boolean
  actorId?: number | null
  actorName?: string | null
  sendReminder?: boolean
  slaStatus?: ReviewerSlaStatus
  escalationLevel?: number | null
  escalatedTo?: number | null
  escalationNotes?: string | null
  batchId?: string | null
}

export interface AuditTimelineEvent {
  id: number
  workflowId: number
  stageSlug: string | null
  eventType: string
  actorId: number | null
  actorName: string | null
  actorRole: string | null
  payload: Record<string, unknown>
  reviewerAssignmentId: number | null
  createdAt: string | null
  acknowledgedAt: string | null
  acknowledgedBy: number | null
  acknowledgementNote: string | null
  visibleToRoles: string[] | null
  metadata: Record<string, unknown>
}

export interface AuditEventInput {
  eventType: string
  stageSlug?: string
  actorId?: number | null
  actorName?: string | null
  actorRole?: string | null
  payload?: Record<string, unknown>
  reviewerAssignmentId?: number | null
  metadata?: Record<string, unknown>
}

export interface AuditEventFilters {
  stageSlug?: string
  eventType?: string
  reviewerAssignmentId?: number
  acknowledged?: boolean
  createdAfter?: string
  createdBefore?: string
  actorRole?: string
  visibleToRole?: string
  limit?: number
  offset?: number
}

export interface AuditExportRecipient {
  channel: 'email' | 'slack' | 'webhook' | string
  target: string
  metadata?: Record<string, unknown>
}

export interface AuditExportSchedule {
  id: number
  workflowId: number
  name: string
  frequency: string
  intervalMinutes: number | null
  cronExpression: string | null
  format: string
  filters: AuditEventFilters
  actorRoles: string[]
  recipients: AuditExportRecipient[]
  active: boolean
  nextRunAt: string | null
  lastRunAt: string | null
  lastStatus: string | null
  createdAt: string
  updatedAt: string
  metadata: Record<string, unknown>
}

export interface AuditExportScheduleInput {
  name: string
  frequency: string
  intervalMinutes?: number | null
  cronExpression?: string | null
  format?: string
  filters?: AuditEventFilters
  actorRoles?: string[]
  recipients?: AuditExportRecipient[]
  active?: boolean
  nextRunAt?: string | null
  metadata?: Record<string, unknown>
}

export interface AuditExportScheduleUpdate extends Partial<AuditExportScheduleInput> {
  lastRunAt?: string | null
  lastStatus?: string | null
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

export interface MemoSharedDraftPayload extends MemoComposerStatePayload {
  updatedBy: number | null
  lockSessionId: string | null
  lockExpiresAt: string | null
}

export type MemoSharedDraftInput = Omit<MemoSharedDraftPayload, 'updatedAt' | 'updatedBy'> & {
  updatedBy?: number | null
}

export type MemoSuggestionStatus = 'pending' | 'accepted' | 'rejected'

export interface MemoSuggestion {
  id: number
  workflowId: number
  sectionId: string
  authorId: number | null
  authorName: string | null
  summary: string | null
  beforeText: string | null
  afterText: string | null
  status: MemoSuggestionStatus
  createdAt: string
  resolvedAt: string | null
  resolvedBy: number | null
  metadata: Record<string, unknown>
}

export interface MemoSuggestionInput {
  sectionId: string
  summary?: string | null
  beforeText?: string | null
  afterText?: string | null
  authorId?: number | null
  authorName?: string | null
  metadata?: Record<string, unknown>
}

export interface MemoSuggestionUpdate {
  status?: MemoSuggestionStatus
  resolvedBy?: number | null
  resolvedAt?: string | null
  metadata?: Record<string, unknown>
}

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

// Workspace / IdeaWorkspace types
export interface IdeaWorkspace {
  id: number
  userId: number
  name: string
  ticker?: string | null
  companyName?: string | null
  description?: string | null
  status: 'active' | 'archived' | 'completed'
  lastActiveStage: string
  stageCompletions: Record<string, string> // { stageSlug: ISO timestamp }
  settings: WorkspaceSettings
  tags: string[]
  createdAt: string
  updatedAt: string
  lastAccessedAt: string
}

export interface WorkspaceSettings {
  defaultWACC?: number
  taxRate?: number
  discountRate?: number
  terminalGrowthRate?: number
  customFields?: Record<string, unknown>
  // Market data enrichment (optional)
  currentPrice?: number
  marketCap?: number
  peRatio?: number | null
  debtToEquity?: number | null
  sector?: string
  industry?: string
  latestFilings?: {
    tenK: string | null
    tenQ: string | null
  }
  lastDataRefresh?: string
  // Studio preferences
  preferredTargetApp?: 'excel' | 'sheets'
}

export interface CreateWorkspaceInput {
  name: string
  ticker?: string
  companyName?: string
  description?: string
  tags?: string[]
}

export interface UpdateWorkspaceInput {
  name?: string
  ticker?: string
  companyName?: string
  description?: string
  status?: 'active' | 'archived' | 'completed'
  lastActiveStage?: string
  stageCompletions?: Record<string, string>
  settings?: Partial<WorkspaceSettings>
  tags?: string[]
}

// Artifact types
export interface WorkspaceArtifact {
  id: number
  workflowId: number
  stageSlug: string
  type: 'note' | 'model' | 'memo' | 'screener' | 'chart' | 'analysis' | 'other'
  name: string
  data: unknown
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CreateArtifactInput {
  workflowId: number
  stageSlug: string
  type: string
  name: string
  data: unknown
  metadata?: Record<string, unknown>
}

// Market data + AI provenance types
export interface MarketSnapshot {
  id: number
  ticker: string
  provider: string
  capturedAt: string
  rawPayload: Record<string, unknown>
  normalizedMetrics: Record<string, unknown>
  sourceMetadata: Record<string, unknown>
}

export interface FinancialStatement {
  id: number
  ticker: string
  statementType: 'income' | 'balance' | 'cashflow'
  fiscalYear?: number | null
  fiscalQuarter?: number | null
  periodStart?: string | null
  periodEnd?: string | null
  currency?: string | null
  data: Record<string, unknown>
  metadata: Record<string, unknown>
  capturedAt: string
}

export interface WorkspaceDataSnapshot {
  id: number
  workflowId: number
  snapshotType: string
  marketSnapshotId?: number | null
  financialStatementId?: number | null
  artifactId?: number | null
  data: Record<string, unknown>
  metadata: Record<string, unknown>
  createdAt: string
}

export interface AiAuditLogEntry {
  id: number
  workflowId: number
  userId?: number | null
  provider: string
  capability?: string | null
  prompt: Record<string, unknown>
  response: Record<string, unknown>
  verification: Record<string, unknown>
  createdAt: string
}

export interface AiAuditSummary {
  totalInteractions: number
  uniqueWorkspaces: number
  lastInteractionAt: string | null
  capabilityBreakdown: Record<string, number>
  dailyCounts: Array<{ date: string; count: number }>
}

// AI Conversation types
export interface ConversationMessage {
  id: number
  workflowId: number
  role: 'user' | 'assistant'
  content: string
  context: {
    stageSlug?: string
    stageTitle?: string
    activeTab?: string
    [key: string]: unknown
  }
  createdAt: string
}

export interface CreateMessageInput {
  workflowId: number
  role: 'user' | 'assistant'
  content: string
  context?: Record<string, unknown>
}

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
