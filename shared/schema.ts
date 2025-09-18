import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, decimal, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Business Profile table
export const businessProfile = pgTable("business_profile", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  website: text("website"),
  hours: jsonb("hours").notNull(),
  socialLinks: jsonb("social_links"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Users table for admin authentication
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Customers table
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  preferences: jsonb("preferences"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Staff table
export const staff = pgTable("staff", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  specialties: text("specialties").array().notNull().default(sql`ARRAY[]::text[]`),
  experience: integer("experience").notNull(), // years of experience
  rating: decimal("rating", { precision: 2, scale: 1 }).notNull().default('4.5'),
  bio: text("bio"),
  avatar: text("avatar"),
  availability: jsonb("availability").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Services table
export const services = pgTable("services", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  duration: integer("duration").notNull(), // in minutes
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Appointments table
export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  staffId: uuid("staff_id").notNull().references(() => staff.id),
  serviceId: uuid("service_id").notNull().references(() => services.id),
  scheduledStart: timestamp("scheduled_start").notNull(),
  scheduledEnd: timestamp("scheduled_end").notNull(),
  status: text("status").notNull().default("scheduled"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Inventory Items table
export const inventoryItem = pgTable("inventory_item", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  category: text("category").notNull(),
  brand: text("brand").notNull(),
  supplier: text("supplier").notNull(),
  currentStock: integer("current_stock").notNull().default(0),
  minStock: integer("min_stock").notNull().default(0),
  maxStock: integer("max_stock").notNull().default(100),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull(),
  retailPrice: decimal("retail_price", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("in-stock"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AI Insights table
export const aiInsights = pgTable("ai_insights", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  confidence: decimal("confidence", { precision: 3, scale: 2 }).notNull(),
  actionable: boolean("actionable").notNull().default(true),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  appliedAt: timestamp("applied_at"),
});

// Purchase Orders table
export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorEmail: text("vendor_email").notNull(),
  items: jsonb("items").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  sentAt: timestamp("sent_at"),
});

// Analytics Snapshot table
export const analyticsSnapshot = pgTable("analytics_snapshot", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).notNull(),
  totalAppointments: integer("total_appointments").notNull(),
  totalCustomers: integer("total_customers").notNull(),
  averageRating: decimal("average_rating", { precision: 2, scale: 1 }).notNull(),
  utilizationRate: decimal("utilization_rate", { precision: 3, scale: 2 }).notNull(),
  customerSatisfaction: decimal("customer_satisfaction", { precision: 3, scale: 2 }).notNull(),
  noShowRate: decimal("no_show_rate", { precision: 3, scale: 2 }).notNull(),
  repeatCustomerRate: decimal("repeat_customer_rate", { precision: 3, scale: 2 }).notNull(),
  averageServiceDuration: integer("average_service_duration").notNull(), // minutes
  topServices: jsonb("top_services"),
  staffPerformance: jsonb("staff_performance"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// System logs table
export const systemLogs = pgTable("system_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  level: text("level").notNull(),
  message: text("message").notNull(),
  context: jsonb("context"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const researchLogEntries = pgTable("research_log_entries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  stageSlug: text("stage_slug").notNull(),
  stageTitle: text("stage_title").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow().notNull()
});

export const memoComposerStates = pgTable(
  "memo_composer_states",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    sessionId: text("session_id").notNull(),
    state: jsonb("state").notNull(),
    version: integer("version").notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    sessionIdx: uniqueIndex("memo_composer_states_session_id_idx").on(table.sessionId)
  })
)

export const dataNormalizationStates = pgTable(
  "data_normalization_states",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    sessionId: text("session_id").notNull(),
    state: jsonb("state").notNull(),
    version: integer("version").notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    sessionIdx: uniqueIndex("data_normalization_states_session_id_idx").on(table.sessionId)
  })
)

export const valuationStates = pgTable(
  "valuation_states",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    sessionId: text("session_id").notNull(),
    state: jsonb("state").notNull(),
    version: integer("version").notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    sessionIdx: uniqueIndex("valuation_states_session_id_idx").on(table.sessionId)
  })
)

export const monitoringStates = pgTable(
  "monitoring_states",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    sessionId: text("session_id").notNull(),
    state: jsonb("state").notNull(),
    version: integer("version").notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    sessionIdx: uniqueIndex("monitoring_states_session_id_idx").on(table.sessionId)
  })
)

export const memoComposerStateEvents = pgTable("memo_composer_state_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  actorId: text("actor_id").notNull(),
  version: integer("version").notNull(),
  state: jsonb("state").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export const dataNormalizationStateEvents = pgTable("data_normalization_state_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  actorId: text("actor_id").notNull(),
  version: integer("version").notNull(),
  state: jsonb("state").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export const valuationStateEvents = pgTable("valuation_state_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  actorId: text("actor_id").notNull(),
  version: integer("version").notNull(),
  state: jsonb("state").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export const monitoringStateEvents = pgTable("monitoring_state_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  actorId: text("actor_id").notNull(),
  version: integer("version").notNull(),
  state: jsonb("state").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
})

// Relations
export const customersRelations = relations(customers, ({ many }) => ({
  appointments: many(appointments),
}));

export const staffRelations = relations(staff, ({ many }) => ({
  appointments: many(appointments),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  appointments: many(appointments),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  customer: one(customers, {
    fields: [appointments.customerId],
    references: [customers.id],
  }),
  staff: one(staff, {
    fields: [appointments.staffId],
    references: [staff.id],
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
}));

// Schema definitions for validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  role: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStaffSchema = createInsertSchema(staff).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBusinessProfileSchema = createInsertSchema(businessProfile).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItem).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnalyticsSnapshotSchema = createInsertSchema(analyticsSnapshot).omit({
  id: true,
  createdAt: true,
});

export const insertAiInsightSchema = createInsertSchema(aiInsights).omit({
  id: true,
  createdAt: true,
  appliedAt: true,
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
  sentAt: true,
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type Staff = typeof staff.$inferSelect;

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export type InsertBusinessProfile = z.infer<typeof insertBusinessProfileSchema>;
export type BusinessProfile = typeof businessProfile.$inferSelect;

export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItem.$inferSelect;

export type InsertAnalyticsSnapshot = z.infer<typeof insertAnalyticsSnapshotSchema>;
export type AnalyticsSnapshot = typeof analyticsSnapshot.$inferSelect;

export type InsertAiInsight = z.infer<typeof insertAiInsightSchema>;
export type AiInsight = typeof aiInsights.$inferSelect;

export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;

// Lightweight demo-only types (not persisted via Drizzle in this demo)
export type PosLineItem = {
  kind: 'service' | 'product'
  id: string
  name: string
  quantity: number
  unitPrice: string
  subtotal: string
}

export type InsertPosSale = {
  items: Array<{ kind: 'service' | 'product'; id: string; quantity: number }>
  discountPct?: number | null
  taxPct?: number | null
}

export type PosSale = {
  id: string
  items: PosLineItem[]
  subtotal: string
  discount: string
  tax: string
  total: string
  createdAt: Date
}

export type InsertCampaign = {
  name: string
  description?: string | null
  channel?: 'email' | 'social' | 'sms' | 'in-store' | null
  status?: 'draft' | 'active' | 'paused'
}

export type Campaign = {
  id: string
  name: string
  description: string | null
  channel: 'email' | 'social' | 'sms' | 'in-store' | null
  status: 'draft' | 'active' | 'paused'
  createdAt: Date
}

export type InsertLoyaltyEntry = {
  customerId: string
  type: 'points' | 'reward'
  points?: number
  note?: string
}

export type LoyaltyEntry = {
  id: string
  customerId: string
  type: 'points' | 'reward'
  points: number | null
  note: string | null
  createdAt: Date
}
