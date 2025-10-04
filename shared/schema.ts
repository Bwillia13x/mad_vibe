import { sql } from 'drizzle-orm'
import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  boolean,
  jsonb,
  decimal,
  uuid,
  uniqueIndex
} from 'drizzle-orm/pg-core'
import { createInsertSchema } from 'drizzle-zod'
import { z } from 'zod'
import { relations } from 'drizzle-orm'

// Business Profile table
export const businessProfile = pgTable('business_profile', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  description: text('description'),
  address: text('address').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  website: text('website'),
  hours: jsonb('hours').notNull(),
  socialLinks: jsonb('social_links'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

// Users table for admin authentication
export const users = pgTable('users', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').notNull().default('admin'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

// Customers table
export const customers = pgTable('customers', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  preferences: jsonb('preferences'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

// Staff table
export const staff = pgTable('staff', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull(),
  specialties: text('specialties')
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  experience: integer('experience').notNull(), // years of experience
  rating: decimal('rating', { precision: 2, scale: 1 }).notNull().default('4.5'),
  bio: text('bio'),
  avatar: text('avatar'),
  availability: jsonb('availability').$defaultFn(() => ({}))
})

export const scenarioLabStates = pgTable('scenario_lab_states', {
  sessionId: varchar('session_id', { length: 255 }).primaryKey(),
  state: jsonb('state').notNull(),
  version: integer('version').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const scenarioLabStateEvents = pgTable('scenario_lab_state_events', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  actorId: varchar('actor_id', { length: 255 }).notNull(),
  version: integer('version').notNull(),
  state: jsonb('state').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

export const executionPlannerStates = pgTable('execution_planner_states', {
  sessionId: varchar('session_id', { length: 255 }).primaryKey(),
  state: jsonb('state').notNull(),
  version: integer('version').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const executionPlannerStateEvents = pgTable('execution_planner_state_events', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  actorId: varchar('actor_id', { length: 255 }).notNull(),
  version: integer('version').notNull(),
  state: jsonb('state').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

export const redTeamStates = pgTable('red_team_states', {
  sessionId: varchar('session_id', { length: 255 }).primaryKey(),
  state: jsonb('state').notNull(),
  version: integer('version').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const redTeamStateEvents = pgTable('red_team_state_events', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  actorId: varchar('actor_id', { length: 255 }).notNull(),
  version: integer('version').notNull(),
  state: jsonb('state').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

export const researchLogEntries = pgTable('research_log_entries', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  stageSlug: text('stage_slug').notNull(),
  stageTitle: text('stage_title').notNull(),
  action: text('action').notNull(),
  details: text('details'),
  timestamp: timestamp('timestamp').notNull()
})

// Type exports for convenience
export type User = typeof users.$inferSelect
export type InsertUser = typeof users.$inferInsert
export type BusinessProfile = typeof businessProfile.$inferSelect
export type InsertBusinessProfile = typeof businessProfile.$inferInsert
export type Customer = typeof customers.$inferSelect
export type InsertCustomer = typeof customers.$inferInsert
export type Staff = typeof staff.$inferSelect & {
  isActive?: boolean
}
export type InsertStaff = typeof staff.$inferInsert

// Placeholder types for missing tables (to be defined later)
export type Service = {
  id: string
  name: string
  description?: string
  duration: number
  price: number
  category?: string
  isActive?: boolean
}

export type InsertService = Omit<Service, 'id'>

export type Appointment = {
  id: string
  customerId: string
  staffId: string
  serviceId: string
  scheduledStart: Date | string
  scheduledEnd: Date | string
  status: string
  notes?: string
}

export type InsertAppointment = Omit<Appointment, 'id'>

// Extended appointment type with details
export type AppointmentWithDetails = Appointment & {
  customer?: Customer
  staff?: Staff
  service?: Service
}

// Extended staff type with metrics
export type StaffWithMetrics = Staff & {
  id: string
  name: string
  role: string
  rating: number
}

export type InventoryItem = {
  id: string
  name: string
  description?: string
  quantity: number
  unitCost: number
  sellPrice: number
  category?: string
  supplier?: string
  reorderLevel?: number
  currentStock: number
  minStock: number
  sku: string
  status?: string
  retailPrice?: number
}

export type InsertInventoryItem = Omit<InventoryItem, 'id'>

export type TopService = {
  serviceName: string
  count: number
  revenue: string
}

export type StaffPerformance = {
  staffName: string
  appointments: number
  revenue: string
  rating: string
}

export type AnalyticsSnapshot = {
  id: string
  date: Date
  revenue: number
  totalRevenue: string
  appointments: number
  totalAppointments: number
  newCustomers: number
  topServices: TopService[] | string[]
  avgTicket: number
  customerSatisfaction: string
  utilizationRate: string
  staffPerformance?: StaffPerformance[]
  totalCustomers?: number
  averageRating?: string
  noShowRate?: string
  repeatCustomerRate?: string
  averageServiceDuration?: number
}

export type InsertAnalyticsSnapshot = Omit<AnalyticsSnapshot, 'id'>

export type PosLineItem = {
  id: string
  name: string
  quantity: number
  price: number
  kind?: 'service' | 'product'
  sourceId?: string
}

export type PosSaleItem = {
  kind: 'service' | 'product'
  id?: string
  name: string
  quantity: number
  unitPrice?: number
  subtotal?: number
  total?: number
}

export type PosSale = {
  id: string
  customerId?: string
  staffId: string
  total: number
  paymentMethod: string
  completedAt: Date
  lineItems: PosLineItem[]
  items?: PosSaleItem[]
  subtotal?: number
  discount?: number
  discountPct?: number
  tax?: number
  taxPct?: number
  createdAt?: Date
  updatedAt?: Date
}

export type InsertPosSale = Omit<PosSale, 'id'>

export type Campaign = {
  id: string
  name: string
  description?: string
  type: string
  status: string
  startDate: Date
  endDate?: Date
  targetAudience?: string
}

export type InsertCampaign = Omit<Campaign, 'id'>

export type LoyaltyEntry = {
  id: string
  customerId: string
  points: number
  reason: string
  createdAt: Date
}

export type InsertLoyaltyEntry = Omit<LoyaltyEntry, 'id' | 'createdAt'>

export type ResearchLogInput = {
  stageSlug: string
  stageTitle: string
  action: string
  details?: string
  timestamp?: string
}
