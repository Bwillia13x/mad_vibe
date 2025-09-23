import {
  pgTable,
  serial,
  varchar,
  text,
  jsonb,
  timestamp,
  uniqueIndex,
  index
} from 'drizzle-orm/pg-core'

// Users table for multi-user support
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

// Workflows table (parent for states)
export const workflows = pgTable('workflows', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdx: index('workflows_user_id_idx').on(table.userId)
  }
})

// Memo state table
export const workflowMemos = pgTable('workflow_memos', {
  id: serial('id').primaryKey(),
  workflowId: serial('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  sections: jsonb('sections').notNull(),
  exhibits: jsonb('exhibits').notNull().default({}),
  reviewerThreads: jsonb('reviewer_threads').notNull().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    workflowIdx: index('workflow_memos_workflow_id_idx').on(table.workflowId)
  }
})

// Normalization state table
export const workflowNormalizations = pgTable('workflow_normalizations', {
  id: serial('id').primaryKey(),
  workflowId: serial('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  reconciliationState: jsonb('reconciliation_state').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    workflowIdx: index('workflow_normalizations_workflow_id_idx').on(table.workflowId)
  }
})

// Valuation state table
export const workflowValuations = pgTable('workflow_valuations', {
  id: serial('id').primaryKey(),
  workflowId: serial('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  selections: jsonb('selections').notNull(),
  overrides: jsonb('overrides').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    workflowIdx: index('workflow_valuations_workflow_id_idx').on(table.workflowId)
  }
})

// Monitoring state table
export const workflowMonitorings = pgTable('workflow_monitorings', {
  id: serial('id').primaryKey(),
  workflowId: serial('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  acknowledgements: jsonb('acknowledgements').notNull().default({}),
  deltaOverrides: jsonb('delta_overrides').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    workflowIdx: index('workflow_monitorings_workflow_id_idx').on(table.workflowId)
  }
})

// Audit logs table for history
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').notNull().references(() => users.id, { onDelete: 'set null' }),
  workflowId: serial('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  tableName: varchar('table_name', { length: 50 }).notNull(),
  action: varchar('action', { length: 20 }).notNull(), // 'create', 'update', 'delete'
  oldState: jsonb('old_state'),
  newState: jsonb('new_state').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => {
  return {
    workflowIdx: index('audit_logs_workflow_id_idx').on(table.workflowId),
    userIdx: index('audit_logs_user_id_idx').on(table.userId),
    actionIdx: index('audit_logs_action_idx').on(table.action)
  }
})