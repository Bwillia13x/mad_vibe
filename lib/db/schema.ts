import {
  pgTable,
  serial,
  integer,
  varchar,
  jsonb,
  timestamp,
  index,
  date,
  text
} from 'drizzle-orm/pg-core'

// Users table for multi-user support within workflow module
export const workflowUsers = pgTable('workflow_users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull()
})


// Workflows table (parent for states) - Extended for IDE workspace concept
export const workflows = pgTable(
  'workflows',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => workflowUsers.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    ticker: varchar('ticker', { length: 20 }), // Company ticker (optional)
    companyName: varchar('company_name', { length: 255 }), // Full company name
    description: varchar('description', { length: 500 }), // Brief thesis or notes
    status: varchar('status', { length: 50 }).notNull().default('active'), // active, archived, completed
    lastActiveStage: varchar('last_active_stage', { length: 50 }).default('home'), // Current workflow position
    stageCompletions: jsonb('stage_completions').notNull().default({}), // { stageSlug: completedAt }
    settings: jsonb('settings').notNull().default({}), // Workspace-specific settings (WACC, tax rate, etc.)
    tags: jsonb('tags').notNull().default([]), // Categorization tags
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    lastAccessedAt: timestamp('last_accessed_at').defaultNow().notNull() // For recent list
  },
  (table) => {
    return {
      userIdx: index('workflows_user_id_idx').on(table.userId),
      statusIdx: index('workflows_status_idx').on(table.status),
      lastAccessedIdx: index('workflows_last_accessed_idx').on(table.lastAccessedAt)
    }
  }
)

// Market data snapshots captured from external providers
export const marketSnapshots = pgTable(
  'market_snapshots',
  {
    id: serial('id').primaryKey(),
    ticker: varchar('ticker', { length: 20 }).notNull(),
    provider: varchar('provider', { length: 50 }).notNull(),
    capturedAt: timestamp('captured_at').defaultNow().notNull(),
    rawPayload: jsonb('raw_payload').notNull(),
    normalizedMetrics: jsonb('normalized_metrics').notNull().default({}),
    sourceMetadata: jsonb('source_metadata').notNull().default({})
  },
  (table) => {
    return {
      tickerIdx: index('market_snapshots_ticker_idx').on(table.ticker),
      providerIdx: index('market_snapshots_provider_idx').on(table.provider),
      capturedIdx: index('market_snapshots_captured_at_idx').on(table.capturedAt)
    }
  }
)

// Financial statements normalized for analysis
export const financialStatements = pgTable(
  'financial_statements',
  {
    id: serial('id').primaryKey(),
    ticker: varchar('ticker', { length: 20 }).notNull(),
    statementType: varchar('statement_type', { length: 30 }).notNull(), // income, balance, cashflow
    fiscalYear: integer('fiscal_year'),
    fiscalQuarter: integer('fiscal_quarter'),
    periodStart: date('period_start'),
    periodEnd: date('period_end'),
    currency: varchar('currency', { length: 10 }).default('USD'),
    data: jsonb('data').notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    capturedAt: timestamp('captured_at').defaultNow().notNull()
  },
  (table) => {
    return {
      tickerIdx: index('financial_statements_ticker_idx').on(table.ticker),
      statementIdx: index('financial_statements_type_idx').on(table.statementType),
      periodIdx: index('financial_statements_period_idx').on(table.fiscalYear, table.fiscalQuarter)
    }
  }
)

// Workspace-aligned snapshot references for provenance tracking
export const workspaceDataSnapshots = pgTable(
  'workspace_data_snapshots',
  {
    id: serial('id').primaryKey(),
    workflowId: integer('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    snapshotType: varchar('snapshot_type', { length: 50 }).notNull(),
    marketSnapshotId: integer('market_snapshot_id').references(() => marketSnapshots.id, {
      onDelete: 'set null'
    }),
    financialStatementId: integer('financial_statement_id').references(() => financialStatements.id, {
      onDelete: 'set null'
    }),
    artifactId: integer('artifact_id').references(() => workflowArtifacts.id, {
      onDelete: 'set null'
    }),
    data: jsonb('data').notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => {
    return {
      workflowIdx: index('workspace_data_snapshots_workflow_id_idx').on(table.workflowId),
      typeIdx: index('workspace_data_snapshots_type_idx').on(table.snapshotType)
    }
  }
)

// AI prompt/response audit log to support guardrails and compliance
export const aiAuditLogs = pgTable(
  'ai_audit_logs',
  {
    id: serial('id').primaryKey(),
    workflowId: integer('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    userId: integer('user_id').references(() => workflowUsers.id, { onDelete: 'set null' }),
    provider: varchar('provider', { length: 50 }).notNull().default('openai'),
    capability: varchar('capability', { length: 50 }),
    prompt: jsonb('prompt').notNull(),
    response: jsonb('response').notNull(),
    verification: jsonb('verification').notNull().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => {
    return {
      workflowIdx: index('ai_audit_logs_workflow_id_idx').on(table.workflowId),
      userIdx: index('ai_audit_logs_user_id_idx').on(table.userId),
      providerIdx: index('ai_audit_logs_provider_idx').on(table.provider)
    }
  }
)
// Memo state table
export const workflowMemos = pgTable(
  'workflow_memos',
  {
    id: serial('id').primaryKey(),
    workflowId: integer('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    sections: jsonb('sections').notNull(),
    exhibits: jsonb('exhibits').notNull().default({}),
    reviewerThreads: jsonb('reviewer_threads').notNull().default([]),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
  },
  (table) => {
    return {
      workflowIdx: index('workflow_memos_workflow_id_idx').on(table.workflowId)
    }
  }
)

// Normalization state table
export const workflowNormalizations = pgTable(
  'workflow_normalizations',
  {
    id: serial('id').primaryKey(),
    workflowId: integer('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    reconciliationState: jsonb('reconciliation_state').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
  },
  (table) => {
    return {
      workflowIdx: index('workflow_normalizations_workflow_id_idx').on(table.workflowId)
    }
  }
)

// Valuation state table
export const workflowValuations = pgTable(
  'workflow_valuations',
  {
    id: serial('id').primaryKey(),
    workflowId: integer('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    selections: jsonb('selections').notNull(),
    overrides: jsonb('overrides').notNull().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
  },
  (table) => {
    return {
      workflowIdx: index('workflow_valuations_workflow_id_idx').on(table.workflowId)
    }
  }
)

// Monitoring state table
export const workflowMonitorings = pgTable(
  'workflow_monitorings',
  {
    id: serial('id').primaryKey(),
    workflowId: integer('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    acknowledgements: jsonb('acknowledgements').notNull().default({}),
    deltaOverrides: jsonb('delta_overrides').notNull().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
  },
  (table) => {
    return {
      workflowIdx: index('workflow_monitorings_workflow_id_idx').on(table.workflowId)
    }
  }
)

// Audit logs table for history
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => workflowUsers.id, { onDelete: 'set null' }),
    workflowId: integer('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    tableName: varchar('table_name', { length: 50 }).notNull(),
    action: varchar('action', { length: 20 }).notNull(), // 'create', 'update', 'delete'
    oldState: jsonb('old_state'),
    newState: jsonb('new_state').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => {
    return {
      workflowIdx: index('audit_logs_workflow_id_idx').on(table.workflowId),
      userIdx: index('audit_logs_user_id_idx').on(table.userId),
      actionIdx: index('audit_logs_action_idx').on(table.action)
    }
  }
)

// Session-scoped memo composer state
export const workflowMemoStates = pgTable('workflow_memo_states', {
  sessionId: varchar('session_id', { length: 255 }).primaryKey(),
  state: jsonb('state').notNull().default({}),
  version: integer('version').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

// Session-scoped normalization state
export const workflowNormalizationStates = pgTable('workflow_normalization_states', {
  sessionId: varchar('session_id', { length: 255 }).primaryKey(),
  state: jsonb('state').notNull().default({}),
  version: integer('version').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

// Session-scoped valuation state
export const workflowValuationStates = pgTable('workflow_valuation_states', {
  sessionId: varchar('session_id', { length: 255 }).primaryKey(),
  state: jsonb('state').notNull().default({}),
  version: integer('version').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

// Session-scoped monitoring state
export const workflowMonitoringStates = pgTable('workflow_monitoring_states', {
  sessionId: varchar('session_id', { length: 255 }).primaryKey(),
  state: jsonb('state').notNull().default({}),
  version: integer('version').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

// Placeholder companies table for screener (TODO: implement full schema)
export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),
  ticker: varchar('ticker', { length: 10 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  sector: varchar('sector', { length: 100 }),
  geo: varchar('geo', { length: 100 }),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

// Placeholder financial metrics table for screener (TODO: implement full schema)
export const financialMetrics = pgTable('financial_metrics', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  roic: integer('roic'),
  fcfYield: integer('fcf_yield'),
  leverage: integer('leverage'),
  growthDurability: integer('growth_durability'),
  insiderOwnership: integer('insider_ownership'),
  moat: varchar('moat', { length: 100 }),
  accruals: integer('accruals'),
  selected: integer('selected').default(0),
  matchReason: varchar('match_reason', { length: 255 }),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

// Artifacts table - stores outputs/files created in each workspace stage
export const workflowArtifacts = pgTable(
  'workflow_artifacts',
  {
    id: serial('id').primaryKey(),
    workflowId: integer('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    stageSlug: varchar('stage_slug', { length: 50 }).notNull(), // Which stage created this
    type: varchar('type', { length: 50 }).notNull(), // 'note', 'model', 'memo', 'screener', 'chart', etc.
    name: varchar('name', { length: 255 }).notNull(), // Display name
    data: jsonb('data').notNull(), // Artifact content/state
    metadata: jsonb('metadata').default({}), // Additional info (file size, last editor, etc.)
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
  },
  (table) => {
    return {
      workflowIdx: index('workflow_artifacts_workflow_id_idx').on(table.workflowId),
      stageIdx: index('workflow_artifacts_stage_slug_idx').on(table.stageSlug),
      typeIdx: index('workflow_artifacts_type_idx').on(table.type)
    }
  }
)

// AI conversation history - persistent chat per workspace
export const workflowConversations = pgTable(
  'workflow_conversations',
  {
    id: serial('id').primaryKey(),
    workflowId: integer('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull(), // 'user' or 'assistant'
    content: varchar('content', { length: 5000 }).notNull(),
    context: jsonb('context').default({}), // Stage, tab, selected text, etc.
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => {
    return {
      workflowIdx: index('workflow_conversations_workflow_id_idx').on(table.workflowId),
      createdIdx: index('workflow_conversations_created_idx').on(table.createdAt)
    }
  }
)

export const workflowReviewerAssignments = pgTable(
  'workflow_reviewer_assignments',
  {
    id: serial('id').primaryKey(),
    workflowId: integer('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    stageSlug: varchar('stage_slug', { length: 50 }).notNull(),
    reviewerId: integer('reviewer_id').references(() => workflowUsers.id, { onDelete: 'set null' }),
    reviewerEmail: varchar('reviewer_email', { length: 255 }),
    reviewerName: varchar('reviewer_name', { length: 255 }),
    status: varchar('status', { length: 30 }).notNull().default('pending'),
    assignedBy: integer('assigned_by').references(() => workflowUsers.id, { onDelete: 'set null' }),
    assignedByName: varchar('assigned_by_name', { length: 255 }),
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
    dueAt: timestamp('due_at'),
    acknowledgedAt: timestamp('acknowledged_at'),
    acknowledgedBy: integer('acknowledged_by').references(() => workflowUsers.id, {
      onDelete: 'set null'
    }),
    completedAt: timestamp('completed_at'),
    reminderCount: integer('reminder_count').notNull().default(0),
    lastReminderAt: timestamp('last_reminder_at'),
    notes: text('notes'),
    metadata: jsonb('metadata').notNull().default({})
  },
  (table) => {
    return {
      workflowIdx: index('workflow_reviewer_assignments_workflow_id_idx').on(
        table.workflowId,
        table.stageSlug
      ),
      statusIdx: index('workflow_reviewer_assignments_status_idx').on(table.status),
      reviewerIdx: index('workflow_reviewer_assignments_reviewer_idx').on(table.reviewerId)
    }
  }
)

export const workflowAuditEvents = pgTable(
  'workflow_audit_events',
  {
    id: serial('id').primaryKey(),
    workflowId: integer('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    stageSlug: varchar('stage_slug', { length: 50 }),
    eventType: varchar('event_type', { length: 50 }).notNull(),
    actorId: integer('actor_id').references(() => workflowUsers.id, { onDelete: 'set null' }),
    actorName: varchar('actor_name', { length: 255 }),
    actorRole: varchar('actor_role', { length: 100 }),
    payload: jsonb('payload').notNull().default({}),
    reviewerAssignmentId: integer('reviewer_assignment_id').references(
      () => workflowReviewerAssignments.id,
      { onDelete: 'set null' }
    ),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    acknowledgedAt: timestamp('acknowledged_at'),
    acknowledgedBy: integer('acknowledged_by').references(() => workflowUsers.id, {
      onDelete: 'set null'
    }),
    acknowledgementNote: text('acknowledgement_note'),
    metadata: jsonb('metadata').notNull().default({})
  },
  (table) => {
    return {
      workflowIdx: index('workflow_audit_events_workflow_idx').on(table.workflowId, table.createdAt),
      stageIdx: index('workflow_audit_events_stage_idx').on(table.stageSlug),
      typeIdx: index('workflow_audit_events_type_idx').on(table.eventType)
    }
  }
)
