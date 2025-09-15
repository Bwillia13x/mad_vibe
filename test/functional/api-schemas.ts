/**
 * API Response Schemas for Validation
 * Defines Zod schemas for validating API responses
 */

import { z } from 'zod';

// Health endpoint schema
export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  env: z.string(),
  timestamp: z.string(),
  aiDemoMode: z.boolean(),
  scenario: z.string(),
  seed: z.number().nullable(),
  freeze: z.object({
    frozen: z.boolean().optional(),
    date: z.string().optional()
  }).nullable()
});

// Business Profile schema
export const BusinessProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  hours: z.record(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

// Service schema
export const ServiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  duration: z.number(),
  price: z.number(),
  category: z.string().optional(),
  active: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

// Staff schema
export const StaffSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  role: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  schedule: z.record(z.any()).optional(),
  active: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

// Customer schema (limited for privacy)
export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().optional(),
  preferences: z.record(z.any()).optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

// Appointment schema
export const AppointmentSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  serviceId: z.string(),
  staffId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  status: z.enum(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show']),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

// Inventory Item schema
export const InventoryItemSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  quantity: z.number(),
  minQuantity: z.number().optional(),
  maxQuantity: z.number().optional(),
  unitPrice: z.number().optional(),
  supplier: z.string().optional(),
  status: z.enum(['in-stock', 'low-stock', 'out-of-stock']),
  createdAt: z.string(),
  updatedAt: z.string()
});

// Analytics schema
export const AnalyticsSchema = z.object({
  id: z.string(),
  date: z.string(),
  totalRevenue: z.number(),
  totalAppointments: z.number(),
  totalCustomers: z.number(),
  averageRating: z.number(),
  utilizationRate: z.number(),
  customerSatisfaction: z.number(),
  noShowRate: z.number(),
  repeatCustomerRate: z.number(),
  averageServiceDuration: z.number(),
  createdAt: z.string(),
  updatedAt: z.string()
});

// POS Sale Item schema
export const SaleItemSchema = z.object({
  kind: z.enum(['service', 'product']),
  id: z.string().optional(),
  name: z.string(),
  quantity: z.number(),
  unitPrice: z.number().optional(),
  total: z.number().optional()
});

// POS Sale schema
export const SaleSchema = z.object({
  id: z.string(),
  items: z.array(SaleItemSchema),
  subtotal: z.number().optional(),
  discount: z.number().optional(),
  discountPct: z.number().optional(),
  tax: z.number().optional(),
  taxPct: z.number().optional(),
  total: z.number(),
  createdAt: z.string(),
  updatedAt: z.string()
});

// Marketing Campaign schema
export const CampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  channel: z.enum(['email', 'sms', 'social', 'print', 'online']).optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

// Marketing Performance schema
export const MarketingPerformanceSchema = z.object({
  summary: z.object({
    impressions: z.number(),
    clicks: z.number(),
    conversions: z.number(),
    ctr: z.number(),
    convRate: z.number()
  }),
  campaigns: z.array(z.object({
    id: z.string(),
    name: z.string(),
    impressions: z.number(),
    clicks: z.number(),
    ctr: z.number(),
    conversions: z.number(),
    convRate: z.number()
  }))
});

// Loyalty Entry schema
export const LoyaltyEntrySchema = z.object({
  id: z.string(),
  customerId: z.string(),
  type: z.enum(['earned', 'redeemed', 'expired', 'bonus']),
  points: z.number(),
  note: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

// Chat Response schema
export const ChatResponseSchema = z.object({
  message: z.string(),
  timestamp: z.string().optional(),
  model: z.string().optional()
});

// Demo Response schemas
export const DemoSeedResponseSchema = z.object({
  ok: z.literal(true),
  scenario: z.string(),
  seed: z.number().nullable()
});

export const DemoTimeResponseSchema = z.object({
  ok: z.literal(true),
  freeze: z.object({
    frozen: z.boolean().optional(),
    date: z.string().optional()
  }).nullable()
});

export const DemoResetResponseSchema = z.object({
  ok: z.literal(true),
  scenario: z.string(),
  seed: z.number().nullable(),
  freeze: z.object({
    frozen: z.boolean().optional(),
    date: z.string().optional()
  }).nullable()
});

// Generic success response schema
export const SuccessResponseSchema = z.object({
  ok: z.literal(true)
});

// Error response schema
export const ErrorResponseSchema = z.object({
  message: z.string(),
  error: z.string().optional(),
  details: z.any().optional()
});

// Array schemas for list endpoints
export const ServicesArraySchema = z.array(ServiceSchema);
export const StaffArraySchema = z.array(StaffSchema);
export const CustomersArraySchema = z.array(CustomerSchema);
export const AppointmentsArraySchema = z.array(AppointmentSchema);
export const InventoryArraySchema = z.array(InventoryItemSchema);
export const AnalyticsArraySchema = z.array(AnalyticsSchema);
export const SalesArraySchema = z.array(SaleSchema);
export const CampaignsArraySchema = z.array(CampaignSchema);
export const LoyaltyEntriesArraySchema = z.array(LoyaltyEntrySchema);