import {
  type User,
  type InsertUser,
  type BusinessProfile,
  type InsertBusinessProfile,
  type Service,
  type InsertService,
  type Staff,
  type InsertStaff,
  type Customer,
  type InsertCustomer,
  type Appointment,
  type InsertAppointment,
  type InventoryItem,
  type InsertInventoryItem,
  type AnalyticsSnapshot,
  type InsertAnalyticsSnapshot,
  type PosSale,
  type InsertPosSale,
  type Campaign,
  type InsertCampaign,
  type LoyaltyEntry,
  type InsertLoyaltyEntry,
  researchLogEntries
} from '@shared/schema'
import { randomUUID } from 'crypto'
import { getEnvVar } from '../lib/env-security'
import { db } from '../lib/db'

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>
  getUserByUsername(username: string): Promise<User | undefined>
  createUser(user: InsertUser): Promise<User>

  // Business Profile methods (singleton)
  getBusinessProfile(): Promise<BusinessProfile | undefined>
  setBusinessProfile(profile: InsertBusinessProfile): Promise<BusinessProfile>

  // Services methods
  getAllServices(): Promise<Service[]>
  getService(id: string): Promise<Service | undefined>
  createService(service: InsertService): Promise<Service>
  updateService(id: string, service: Partial<InsertService>): Promise<Service | undefined>
  deleteService(id: string): Promise<boolean>

  // Staff methods
  getAllStaff(): Promise<Staff[]>
  getStaff(id: string): Promise<Staff | undefined>
  createStaff(staff: InsertStaff): Promise<Staff>
  updateStaff(id: string, staff: Partial<InsertStaff>): Promise<Staff | undefined>
  deleteStaff(id: string): Promise<boolean>

  // Customer methods
  getAllCustomers(): Promise<Customer[]>
  getCustomer(id: string): Promise<Customer | undefined>
  createCustomer(customer: InsertCustomer): Promise<Customer>
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>
  deleteCustomer(id: string): Promise<boolean>

  // Appointment methods
  getAllAppointments(): Promise<Appointment[]>
  getAppointment(id: string): Promise<Appointment | undefined>
  getAppointmentsByDay(date: Date): Promise<Appointment[]>
  createAppointment(appointment: InsertAppointment): Promise<Appointment>
  updateAppointment(
    id: string,
    appointment: Partial<InsertAppointment>
  ): Promise<Appointment | undefined>
  deleteAppointment(id: string): Promise<boolean>

  // Inventory methods
  getAllInventoryItems(): Promise<InventoryItem[]>
  getInventoryItem(id: string): Promise<InventoryItem | undefined>
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>
  updateInventoryItem(
    id: string,
    item: Partial<InsertInventoryItem>
  ): Promise<InventoryItem | undefined>
  deleteInventoryItem(id: string): Promise<boolean>

  // Analytics methods
  getAllAnalytics(): Promise<AnalyticsSnapshot[]>
  getAnalytics(id: string): Promise<AnalyticsSnapshot | undefined>
  createAnalytics(analytics: InsertAnalyticsSnapshot): Promise<AnalyticsSnapshot>

  // POS
  getAllSales(): Promise<PosSale[]>
  createSale(sale: InsertPosSale): Promise<PosSale>
  deleteSale(id: string): Promise<boolean>

  // Marketing
  getAllCampaigns(): Promise<Campaign[]>
  createCampaign(campaign: InsertCampaign): Promise<Campaign>
  updateCampaign(id: string, patch: Partial<InsertCampaign>): Promise<Campaign | undefined>

  // Loyalty
  getLoyaltyEntries(customerId?: string): Promise<LoyaltyEntry[]>
  createLoyaltyEntry(entry: InsertLoyaltyEntry): Promise<LoyaltyEntry>

  // Seed method
  seedDemoData(scenario?: string): Promise<void>
  getCurrentScenario?(): string
}

export class MemStorage implements IStorage {
  private users: Map<string, User>
  private businessProfile: BusinessProfile | undefined
  private services: Map<string, Service>
  private staff: Map<string, Staff>
  private customers: Map<string, Customer>
  private appointments: Map<string, Appointment>
  private inventoryItems: Map<string, InventoryItem>
  private analytics: Map<string, AnalyticsSnapshot>
  private sales: Map<string, PosSale>
  private campaigns: Map<string, Campaign>
  private loyaltyEntries: Map<string, LoyaltyEntry>
  private scenario: string = 'default'
  private seed: number = 12345
  private rng: (() => number) | null = null

  constructor() {
    this.users = new Map()
    this.services = new Map()
    this.staff = new Map()
    this.customers = new Map()
    this.appointments = new Map()
    this.inventoryItems = new Map()
    this.analytics = new Map()
    this.sales = new Map()
    this.campaigns = new Map()
    this.loyaltyEntries = new Map()
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id)
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.username === username)
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID()
    const now = new Date()
    const user: User = {
      ...insertUser,
      id,
      role: insertUser.role || 'admin',
      createdAt: now,
      updatedAt: now
    }
    this.users.set(id, user)
    return user
  }

  // Business Profile methods
  async getBusinessProfile(): Promise<BusinessProfile | undefined> {
    return this.businessProfile
  }

  async setBusinessProfile(profile: InsertBusinessProfile): Promise<BusinessProfile> {
    const id = randomUUID()
    const now = new Date()
    const businessProfile: BusinessProfile = {
      name: profile.name,
      description: profile.description ?? null,
      address: profile.address,
      phone: profile.phone,
      email: profile.email,
      website: profile.website ?? null,
      hours: profile.hours,
      socialLinks: profile.socialLinks,
      id,
      createdAt: now,
      updatedAt: now
    }
    this.businessProfile = businessProfile
    return businessProfile
  }

  // Service methods
  async getAllServices(): Promise<Service[]> {
    return Array.from(this.services.values())
  }

  async getService(id: string): Promise<Service | undefined> {
    return this.services.get(id)
  }

  async createService(service: InsertService): Promise<Service> {
    const id = randomUUID()
    const newService: Service = {
      name: service.name,
      description: service.description,
      duration: service.duration,
      price: service.price,
      category: service.category,
      id
    }
    this.services.set(id, newService)
    return newService
  }

  async updateService(id: string, service: Partial<InsertService>): Promise<Service | undefined> {
    const existing = this.services.get(id)
    if (!existing) return undefined

    const updated: Service = {
      ...existing,
      ...service
    }
    this.services.set(id, updated)
    return updated
  }

  async deleteService(id: string): Promise<boolean> {
    return this.services.delete(id)
  }

  // Staff methods
  async getAllStaff(): Promise<Staff[]> {
    return Array.from(this.staff.values())
  }

  async getStaff(id: string): Promise<Staff | undefined> {
    return this.staff.get(id)
  }

  async createStaff(staff: InsertStaff): Promise<Staff> {
    const id = randomUUID()
    const staffWithStatus = staff as InsertStaff & { isActive?: boolean }
    const newStaff: Staff = {
      name: staff.name,
      email: staff.email,
      role: staff.role,
      specialties: staff.specialties ?? [],
      experience: staff.experience,
      rating: staff.rating ?? '4.5',
      bio: staff.bio ?? null,
      avatar: staff.avatar ?? null,
      availability: staff.availability ?? null,
      isActive: staffWithStatus.isActive ?? true,
      id
    }
    this.staff.set(id, newStaff)
    return newStaff
  }

  async updateStaff(id: string, staff: Partial<InsertStaff>): Promise<Staff | undefined> {
    const existing = this.staff.get(id)
    if (!existing) return undefined

    const staffWithStatus = staff as Partial<InsertStaff & { isActive?: boolean }>
    const updated: Staff = {
      ...existing,
      ...staff,
      ...(staffWithStatus.isActive !== undefined ? { isActive: staffWithStatus.isActive } : {})
    }
    this.staff.set(id, updated)
    return updated
  }

  async deleteStaff(id: string): Promise<boolean> {
    return this.staff.delete(id)
  }

  // Customer methods
  async getAllCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values())
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.get(id)
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = randomUUID()
    const now = new Date()
    const newCustomer: Customer = {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      preferences: customer.preferences ?? null,
      id,
      createdAt: now,
      updatedAt: now
    }
    this.customers.set(id, newCustomer)
    return newCustomer
  }

  async updateCustomer(
    id: string,
    customer: Partial<InsertCustomer>
  ): Promise<Customer | undefined> {
    const existing = this.customers.get(id)
    if (!existing) return undefined

    const updated: Customer = {
      ...existing,
      ...customer,
      updatedAt: new Date()
    }
    this.customers.set(id, updated)
    return updated
  }

  async deleteCustomer(id: string): Promise<boolean> {
    return this.customers.delete(id)
  }

  // Appointment methods
  async getAllAppointments(): Promise<Appointment[]> {
    return Array.from(this.appointments.values())
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    return this.appointments.get(id)
  }

  async getAppointmentsByDay(date: Date): Promise<Appointment[]> {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    return Array.from(this.appointments.values()).filter((appointment) => {
      const appointmentDate = new Date(appointment.scheduledStart)
      return appointmentDate >= startOfDay && appointmentDate <= endOfDay
    })
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const id = randomUUID()
    const newAppointment: Appointment = {
      customerId: appointment.customerId,
      staffId: appointment.staffId,
      serviceId: appointment.serviceId,
      scheduledStart: appointment.scheduledStart,
      scheduledEnd: appointment.scheduledEnd,
      status: appointment.status ?? 'scheduled',
      notes: appointment.notes ?? undefined,
      id
    }
    this.appointments.set(id, newAppointment)
    return newAppointment
  }

  async updateAppointment(
    id: string,
    appointment: Partial<InsertAppointment>
  ): Promise<Appointment | undefined> {
    const existing = this.appointments.get(id)
    if (!existing) return undefined

    const updated: Appointment = {
      ...existing,
      ...appointment
    }
    this.appointments.set(id, updated)
    return updated
  }

  async deleteAppointment(id: string): Promise<boolean> {
    return this.appointments.delete(id)
  }

  // Inventory methods
  async getAllInventoryItems(): Promise<InventoryItem[]> {
    return Array.from(this.inventoryItems.values())
  }

  async getInventoryItem(id: string): Promise<InventoryItem | undefined> {
    return this.inventoryItems.get(id)
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const id = randomUUID()
    const stock = item.currentStock ?? 0
    const min = item.minStock ?? 0
    let computedStatus: InventoryItem['status'] = 'in-stock'
    if (stock === 0) computedStatus = 'out-of-stock'
    else if (stock <= min) computedStatus = 'low'
    const newItem: InventoryItem = {
      name: item.name,
      sku: item.sku,
      category: item.category,
      supplier: item.supplier,
      quantity: item.quantity ?? 0,
      currentStock: item.currentStock ?? 0,
      minStock: item.minStock ?? 0,
      reorderLevel: item.reorderLevel,
      unitCost: item.unitCost,
      sellPrice: item.sellPrice,
      retailPrice: item.retailPrice,
      status: computedStatus,
      description: item.description,
      id
    }
    this.inventoryItems.set(id, newItem)
    return newItem
  }

  async updateInventoryItem(
    id: string,
    item: Partial<InsertInventoryItem>
  ): Promise<InventoryItem | undefined> {
    const existing = this.inventoryItems.get(id)
    if (!existing) return undefined

    const updated: InventoryItem = {
      ...existing,
      ...item
    }
    this.inventoryItems.set(id, updated)
    return updated
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    return this.inventoryItems.delete(id)
  }

  // Analytics methods
  async getAllAnalytics(): Promise<AnalyticsSnapshot[]> {
    return Array.from(this.analytics.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }

  async getAnalytics(id: string): Promise<AnalyticsSnapshot | undefined> {
    return this.analytics.get(id)
  }

  async createAnalytics(analytics: InsertAnalyticsSnapshot): Promise<AnalyticsSnapshot> {
    const id = randomUUID()
    const newAnalytics: AnalyticsSnapshot = {
      date: analytics.date,
      totalRevenue: analytics.totalRevenue,
      totalAppointments: analytics.totalAppointments,
      totalCustomers: analytics.totalCustomers,
      averageRating: analytics.averageRating,
      utilizationRate: analytics.utilizationRate,
      customerSatisfaction: analytics.customerSatisfaction,
      noShowRate: analytics.noShowRate,
      repeatCustomerRate: analytics.repeatCustomerRate,
      averageServiceDuration: analytics.averageServiceDuration,
      topServices: analytics.topServices ?? [],
      staffPerformance: analytics.staffPerformance ?? [],
      revenue: analytics.revenue,
      appointments: analytics.appointments,
      newCustomers: analytics.newCustomers,
      avgTicket: analytics.avgTicket,
      id
    }
    this.analytics.set(id, newAnalytics)
    return newAnalytics
  }

  // POS methods
  async getAllSales(): Promise<PosSale[]> {
    return Array.from(this.sales.values()).sort((a, b) => +b.completedAt - +a.completedAt)
  }

  async createSale(sale: InsertPosSale): Promise<PosSale> {
    const id = randomUUID()
    const now = new Date()
    const completedAt = sale.completedAt ? new Date(sale.completedAt) : now
    const lineItems: import('@shared/schema').PosLineItem[] = (sale.lineItems ?? []).map(
      (item) => ({
        id: item.id || randomUUID(),
        name: item.name,
        quantity: item.quantity ?? 1,
        price: item.price ?? 0,
        kind: item.kind,
        sourceId: item.sourceId
      })
    )

    const lineSubtotal = lineItems.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
      0
    )

    const subtotal = sale.subtotal ?? lineSubtotal
    const discount = sale.discount ?? 0
    const tax = sale.tax ?? 0

    const computedTotal = subtotal - discount + tax
    const total = sale.total ?? computedTotal

    const createdAt = sale.createdAt ? new Date(sale.createdAt) : now
    const updatedAt = sale.updatedAt ? new Date(sale.updatedAt) : createdAt

    const items = sale.items
      ? sale.items.map((item) => ({ ...item }))
      : lineItems.map((item) => {
          const itemSubtotal = (Number(item.price) || 0) * (Number(item.quantity) || 0)
          return {
            kind: item.kind ?? 'service',
            id: item.sourceId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
            subtotal: itemSubtotal,
            total: itemSubtotal
          }
        })

    const record: PosSale = {
      id,
      customerId: sale.customerId,
      staffId: sale.staffId,
      total,
      paymentMethod: sale.paymentMethod,
      completedAt,
      lineItems,
      items,
      subtotal,
      discount,
      discountPct: sale.discountPct,
      tax,
      taxPct: sale.taxPct,
      createdAt,
      updatedAt
    }
    this.sales.set(id, record)
    return record
  }

  async deleteSale(id: string): Promise<boolean> {
    return this.sales.delete(id)
  }

  // Marketing methods
  async getAllCampaigns(): Promise<Campaign[]> {
    return Array.from(this.campaigns.values()).sort((a, b) => +b.startDate - +a.startDate)
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const id = randomUUID()
    const rec: Campaign = {
      id,
      name: campaign.name,
      description: campaign.description,
      type: campaign.type,
      status: campaign.status,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      targetAudience: campaign.targetAudience
    }
    this.campaigns.set(id, rec)
    return rec
  }

  async updateCampaign(id: string, patch: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const existing = this.campaigns.get(id)
    if (!existing) return undefined
    const updated: Campaign = {
      ...existing,
      ...patch
    } as Campaign
    this.campaigns.set(id, updated)
    return updated
  }

  // Loyalty methods
  async getLoyaltyEntries(customerId?: string): Promise<LoyaltyEntry[]> {
    const all = Array.from(this.loyaltyEntries.values()).sort((a, b) => +b.createdAt - +a.createdAt)
    return customerId ? all.filter((e) => e.customerId === customerId) : all
  }

  async createLoyaltyEntry(entry: InsertLoyaltyEntry): Promise<LoyaltyEntry> {
    const id = randomUUID()
    const createdAt = new Date()
    const customer = await this.getCustomer(entry.customerId)
    if (!customer) throw new Error('Customer not found')
    const rec: LoyaltyEntry = {
      id,
      customerId: entry.customerId,
      points: entry.points,
      reason: entry.reason,
      createdAt
    }
    this.loyaltyEntries.set(id, rec)
    return rec
  }

  getCurrentScenario() {
    return this.scenario
  }
  getCurrentSeed() {
    return this.seed
  }

  // Seed method
  async seedDemoData(scenario?: string, seedArg?: number): Promise<void> {
    this.scenario = scenario || getEnvVar('DEMO_SCENARIO') || 'default'
    const envSeed = getEnvVar('DEMO_SEED')
    this.seed = Number.isFinite(seedArg as number)
      ? (seedArg as number)
      : Number.isFinite(envSeed)
        ? (envSeed as number)
        : 12345
    const { createRng } = await import('./lib/rng.js')
    this.rng = createRng(this.seed)
    const demoData = await import('@shared/demoData')

    // Clear existing data
    this.services.clear()
    this.staff.clear()
    this.customers.clear()
    this.appointments.clear()
    this.inventoryItems.clear()
    this.analytics.clear()
    this.businessProfile = undefined

    // Create ID mappings for demo data relationships
    const tempIdToRealId = new Map<string, string>()

    const databaseUrl = getEnvVar('DATABASE_URL')
    if (databaseUrl && db) {
      try {
        await db.delete(researchLogEntries)
        const now = new Date()
        const minutesAgo = (mins: number) => new Date(now.getTime() - mins * 60 * 1000)
        const logEntries = [
          {
            stageSlug: 'home',
            stageTitle: 'Home / Daily Brief',
            action: 'Stage opened',
            details: 'Reviewed overnight alerts and resumed latest session',
            timestamp: minutesAgo(45)
          },
          {
            stageSlug: 'intake',
            stageTitle: 'Idea Intake (Triage)',
            action: 'Stage marked ready',
            details: 'Thesis stub documented and disqualifier logged',
            timestamp: minutesAgo(35)
          },
          {
            stageSlug: 'one-pager',
            stageTitle: 'One-Pager (Quick Look)',
            action: 'Stage opened',
            details: 'Running forensic checks before promoting to Dossier',
            timestamp: minutesAgo(20)
          },
          {
            stageSlug: 'dossier',
            stageTitle: 'Company Dossier (Business Map)',
            action: 'Stage opened',
            details: 'Mapping segments and attaching first citations',
            timestamp: minutesAgo(10)
          }
        ]

        await db.insert(researchLogEntries).values(logEntries)
      } catch (error) {
        console.warn('Failed to seed research log entries', error)
      }
    }

    // Seed business profile
    if (demoData.businessProfileData) {
      this.businessProfile = await this.setBusinessProfile(demoData.businessProfileData)
    }

    // Seed services and create tempId mappings
    for (const serviceData of demoData.servicesData) {
      const { tempId, ...serviceFields } = serviceData
      const service = await this.createService(serviceFields)
      tempIdToRealId.set(tempId, service.id)
    }

    // Seed staff and create tempId mappings
    for (const staffData of demoData.staffData) {
      const { tempId, ...staffFields } = staffData
      const staff = await this.createStaff(staffFields)
      tempIdToRealId.set(tempId, staff.id)
    }

    // Seed customers and create tempId mappings
    for (const customerData of demoData.customersData) {
      const { tempId, ...customerFields } = customerData
      const customer = await this.createCustomer(customerFields)
      tempIdToRealId.set(tempId, customer.id)
    }

    const toDate = (value: unknown): Date => {
      if (value instanceof Date) return new Date(value.getTime())
      if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value)
        if (!Number.isNaN(parsed.getTime())) return parsed
      }
      return new Date()
    }

    // Determine appointments based on scenario
    let appointmentSource = demoData.appointmentsData
    if (this.scenario === 'busy_day') {
      // Duplicate appointments to simulate a crowded schedule without overlaps
      appointmentSource = [
        ...demoData.appointmentsData,
        ...demoData.appointmentsData.map((a) => {
          const start = toDate(a.scheduledStart)
          const end = toDate(a.scheduledEnd)
          const durationMs =
            Math.max(15, (end.getTime() - start.getTime()) / (1000 * 60)) * 60 * 1000 // minutes -> ms
          const shiftedStart = new Date(end.getTime() + 5 * 60 * 1000) // start 5 minutes after original end
          const shiftedEnd = new Date(shiftedStart.getTime() + durationMs)
          return {
            ...a,
            scheduledStart: shiftedStart,
            scheduledEnd: shiftedEnd,
            status: 'scheduled'
          }
        })
      ]
    } else if (this.scenario === 'appointment_gaps') {
      // create gaps: only every other appointment kept
      appointmentSource = demoData.appointmentsData.filter((_, idx) => idx % 2 === 0)
    }

    // Align appointments to the current demo day
    const { getNow } = await import('./lib/clock.js')
    const now = getNow()
    const alignToCurrentDay = (d: Date): Date => {
      const base = new Date(now)
      base.setHours(d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds())
      return base
    }

    // Seed appointments with mapped IDs
    for (const appointmentData of appointmentSource) {
      const mappedAppointment = {
        ...appointmentData,
        scheduledStart: alignToCurrentDay(toDate(appointmentData.scheduledStart)),
        scheduledEnd: alignToCurrentDay(toDate(appointmentData.scheduledEnd)),
        customerId: tempIdToRealId.get(appointmentData.customerId) || appointmentData.customerId,
        staffId: tempIdToRealId.get(appointmentData.staffId) || appointmentData.staffId,
        serviceId: tempIdToRealId.get(appointmentData.serviceId) || appointmentData.serviceId
      }
      await this.createAppointment(mappedAppointment)
    }

    // Seed inventory items (with scenario variations)
    for (const inventoryData of demoData.inventoryData) {
      const item = { ...inventoryData } as InsertInventoryItem
      if (this.scenario === 'low_inventory') {
        const r = this.rng ? this.rng() : Math.random()
        if (r < 0.4) {
          item.currentStock = 0
          item.status = 'out-of-stock'
        } else if (r < 0.7) {
          const minStock = inventoryData.minStock ?? 0
          const newStock = Math.max(0, minStock) - 1
          item.currentStock = newStock
          item.status = 'low'
        }
      }
      await this.createInventoryItem(item)
    }

    // Seed analytics
    for (const analyticsData of demoData.analyticsData) {
      await this.createAnalytics(analyticsData)
    }

    console.log('Demo data seeded successfully')
  }
}

export const storage = new MemStorage()
