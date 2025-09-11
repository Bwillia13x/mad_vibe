// Core system types
export interface SystemHealth {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  services: {
    database: boolean
    websocket: boolean
    openai: boolean
  }
  metrics: {
    memory: number
    cpu: number
    responseTime: number
  }
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}

// Business domain types
export interface Appointment {
  id: string
  customerId: string
  customerName: string
  staffId: string
  serviceId: string
  serviceName: string
  duration: number // in minutes
  scheduledStart: Date
  scheduledEnd: Date
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show'
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  preferences?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface Staff {
  id: string
  name: string
  email: string
  role: string
  skills: string[]
  availability: WeeklySchedule
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Service {
  id: string
  name: string
  description: string
  duration: number // in minutes
  price: number
  category: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface InventoryItem {
  id: string
  name: string
  sku: string
  category: string
  supplier: string
  currentStock: number
  minStock: number
  maxStock: number
  unitCost: number
  status: 'in-stock' | 'low-stock' | 'out-of-stock'
  createdAt: Date
  updatedAt: Date
}

// Schedule and availability types
export interface TimeSlot {
  start: string // HH:MM format
  end: string   // HH:MM format
}

export interface DaySchedule {
  isAvailable: boolean
  slots: TimeSlot[]
}

export interface WeeklySchedule {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

// AI and analytics types
export interface AIInsight {
  id: string
  type: 'optimization' | 'prediction' | 'recommendation'
  category: 'scheduling' | 'inventory' | 'staff' | 'customer'
  title: string
  description: string
  confidence: number // 0-1
  actionable: boolean
  createdAt: Date
  appliedAt?: Date
}

export interface BusinessMetrics {
  revenue: {
    total: number
    change: number
    period: string
  }
  appointments: {
    total: number
    completed: number
    cancelled: number
    change: number
  }
  customers: {
    total: number
    new: number
    returning: number
  }
  staff: {
    utilization: number
    performance: Record<string, number>
  }
}

// WebSocket message types
export interface WSMessage {
  type: string
  payload?: Record<string, unknown>
  timestamp: string
}

export interface WSAppointmentUpdate extends WSMessage {
  type: 'appointment-update'
  payload: {
    appointmentId: string
    status: Appointment['status']
    changes: Partial<Appointment>
  }
}

export interface WSSystemUpdate extends WSMessage {
  type: 'system-update'
  payload: {
    component: string
    status: string
    details?: Record<string, unknown>
  }
}

// Email and communication types
export interface EmailTemplate {
  id: string
  name: string
  subject: string
  htmlContent: string
  textContent: string
  variables: string[]
}

export interface PurchaseOrder {
  id: string
  vendorEmail: string
  items: Array<{
    sku: string
    name: string
    quantity: number
    unitPrice: number
  }>
  totalAmount: number
  status: 'draft' | 'sent' | 'acknowledged' | 'fulfilled'
  createdAt: Date
  sentAt?: Date
}

// Environment and configuration types
export interface AppConfig {
  businessName: string
  operationsPort: number
  emailFrom: string
  backupSchedule: 'hourly' | 'daily' | 'weekly' | 'disabled'
  features: {
    aiInsights: boolean
    emailAutomation: boolean
    inventoryManagement: boolean
    staffPerformance: boolean
  }
}
