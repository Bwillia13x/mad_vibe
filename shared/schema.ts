
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
  availability: jsonb('availability').default(sql`{}::jsonb`)
})

export const scenarioLabStates = pgTable('scenario_lab_states', {
  sessionId: varchar('session_id', { length: 255 }).primaryKey(),
  state: jsonb('state').notNull(),
  version: integer('version').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const scenarioLabStateEvents = pgTable('scenario_lab_state_events', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
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
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
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
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
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