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
  type InsertAnalyticsSnapshot
} from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Business Profile methods (singleton)
  getBusinessProfile(): Promise<BusinessProfile | undefined>;
  setBusinessProfile(profile: InsertBusinessProfile): Promise<BusinessProfile>;
  
  // Services methods
  getAllServices(): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: string): Promise<boolean>;
  
  // Staff methods
  getAllStaff(): Promise<Staff[]>;
  getStaff(id: string): Promise<Staff | undefined>;
  createStaff(staff: InsertStaff): Promise<Staff>;
  updateStaff(id: string, staff: Partial<InsertStaff>): Promise<Staff | undefined>;
  deleteStaff(id: string): Promise<boolean>;
  
  // Customer methods
  getAllCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;
  
  // Appointment methods
  getAllAppointments(): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAppointmentsByDay(date: Date): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: string): Promise<boolean>;
  
  // Inventory methods
  getAllInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItem(id: string): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined>;
  deleteInventoryItem(id: string): Promise<boolean>;
  
  // Analytics methods
  getAllAnalytics(): Promise<AnalyticsSnapshot[]>;
  getAnalytics(id: string): Promise<AnalyticsSnapshot | undefined>;
  createAnalytics(analytics: InsertAnalyticsSnapshot): Promise<AnalyticsSnapshot>;
  
  // Seed method
  seedDemoData(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private businessProfile: BusinessProfile | undefined;
  private services: Map<string, Service>;
  private staff: Map<string, Staff>;
  private customers: Map<string, Customer>;
  private appointments: Map<string, Appointment>;
  private inventoryItems: Map<string, InventoryItem>;
  private analytics: Map<string, AnalyticsSnapshot>;

  constructor() {
    this.users = new Map();
    this.services = new Map();
    this.staff = new Map();
    this.customers = new Map();
    this.appointments = new Map();
    this.inventoryItems = new Map();
    this.analytics = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      role: insertUser.role || 'admin',
      createdAt: now,
      updatedAt: now
    };
    this.users.set(id, user);
    return user;
  }

  // Business Profile methods
  async getBusinessProfile(): Promise<BusinessProfile | undefined> {
    return this.businessProfile;
  }

  async setBusinessProfile(profile: InsertBusinessProfile): Promise<BusinessProfile> {
    const id = randomUUID();
    const now = new Date();
    const businessProfile: BusinessProfile = {
      name: profile.name,
      description: profile.description ?? null,
      address: profile.address,
      phone: profile.phone,
      email: profile.email,
      website: profile.website ?? null,
      hours: profile.hours as any,
      socialLinks: profile.socialLinks as any,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.businessProfile = businessProfile;
    return businessProfile;
  }

  // Service methods
  async getAllServices(): Promise<Service[]> {
    return Array.from(this.services.values());
  }

  async getService(id: string): Promise<Service | undefined> {
    return this.services.get(id);
  }

  async createService(service: InsertService): Promise<Service> {
    const id = randomUUID();
    const now = new Date();
    const newService: Service = {
      name: service.name,
      description: service.description,
      duration: service.duration,
      price: service.price,
      category: service.category,
      isActive: service.isActive ?? true,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.services.set(id, newService);
    return newService;
  }

  async updateService(id: string, service: Partial<InsertService>): Promise<Service | undefined> {
    const existing = this.services.get(id);
    if (!existing) return undefined;
    
    const updated: Service = {
      ...existing,
      ...service,
      updatedAt: new Date()
    };
    this.services.set(id, updated);
    return updated;
  }

  async deleteService(id: string): Promise<boolean> {
    return this.services.delete(id);
  }

  // Staff methods
  async getAllStaff(): Promise<Staff[]> {
    return Array.from(this.staff.values());
  }

  async getStaff(id: string): Promise<Staff | undefined> {
    return this.staff.get(id);
  }

  async createStaff(staff: InsertStaff): Promise<Staff> {
    const id = randomUUID();
    const now = new Date();
    const newStaff: Staff = {
      name: staff.name,
      email: staff.email,
      role: staff.role,
      specialties: staff.specialties ?? [],
      experience: staff.experience,
      rating: staff.rating ?? '4.5',
      bio: staff.bio ?? null,
      avatar: staff.avatar ?? null,
      availability: staff.availability as any,
      isActive: staff.isActive ?? true,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.staff.set(id, newStaff);
    return newStaff;
  }

  async updateStaff(id: string, staff: Partial<InsertStaff>): Promise<Staff | undefined> {
    const existing = this.staff.get(id);
    if (!existing) return undefined;
    
    const updated: Staff = {
      ...existing,
      ...staff,
      updatedAt: new Date()
    };
    this.staff.set(id, updated);
    return updated;
  }

  async deleteStaff(id: string): Promise<boolean> {
    return this.staff.delete(id);
  }

  // Customer methods
  async getAllCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const now = new Date();
    const newCustomer: Customer = {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      preferences: customer.preferences as any,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.customers.set(id, newCustomer);
    return newCustomer;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const existing = this.customers.get(id);
    if (!existing) return undefined;
    
    const updated: Customer = {
      ...existing,
      ...customer,
      updatedAt: new Date()
    };
    this.customers.set(id, updated);
    return updated;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    return this.customers.delete(id);
  }

  // Appointment methods
  async getAllAppointments(): Promise<Appointment[]> {
    return Array.from(this.appointments.values());
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async getAppointmentsByDay(date: Date): Promise<Appointment[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return Array.from(this.appointments.values()).filter(appointment => {
      const appointmentDate = new Date(appointment.scheduledStart);
      return appointmentDate >= startOfDay && appointmentDate <= endOfDay;
    });
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const id = randomUUID();
    const now = new Date();
    const newAppointment: Appointment = {
      customerId: appointment.customerId,
      staffId: appointment.staffId,
      serviceId: appointment.serviceId,
      scheduledStart: appointment.scheduledStart,
      scheduledEnd: appointment.scheduledEnd,
      status: appointment.status ?? 'scheduled',
      notes: appointment.notes ?? null,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.appointments.set(id, newAppointment);
    return newAppointment;
  }

  async updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const existing = this.appointments.get(id);
    if (!existing) return undefined;
    
    const updated: Appointment = {
      ...existing,
      ...appointment,
      updatedAt: new Date()
    };
    this.appointments.set(id, updated);
    return updated;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    return this.appointments.delete(id);
  }

  // Inventory methods
  async getAllInventoryItems(): Promise<InventoryItem[]> {
    return Array.from(this.inventoryItems.values());
  }

  async getInventoryItem(id: string): Promise<InventoryItem | undefined> {
    return this.inventoryItems.get(id);
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const id = randomUUID();
    const now = new Date();
    const newItem: InventoryItem = {
      name: item.name,
      sku: item.sku,
      category: item.category,
      brand: item.brand,
      supplier: item.supplier,
      currentStock: item.currentStock ?? 0,
      minStock: item.minStock ?? 0,
      maxStock: item.maxStock ?? 100,
      unitCost: item.unitCost,
      retailPrice: item.retailPrice ?? null,
      status: item.status ?? 'in-stock',
      description: item.description ?? null,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.inventoryItems.set(id, newItem);
    return newItem;
  }

  async updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined> {
    const existing = this.inventoryItems.get(id);
    if (!existing) return undefined;
    
    const updated: InventoryItem = {
      ...existing,
      ...item,
      updatedAt: new Date()
    };
    this.inventoryItems.set(id, updated);
    return updated;
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    return this.inventoryItems.delete(id);
  }

  // Analytics methods
  async getAllAnalytics(): Promise<AnalyticsSnapshot[]> {
    return Array.from(this.analytics.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async getAnalytics(id: string): Promise<AnalyticsSnapshot | undefined> {
    return this.analytics.get(id);
  }

  async createAnalytics(analytics: InsertAnalyticsSnapshot): Promise<AnalyticsSnapshot> {
    const id = randomUUID();
    const now = new Date();
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
      topServices: analytics.topServices as any,
      staffPerformance: analytics.staffPerformance as any,
      id,
      createdAt: now
    };
    this.analytics.set(id, newAnalytics);
    return newAnalytics;
  }

  // Seed method
  async seedDemoData(): Promise<void> {
    const demoData = await import("@shared/demoData");
    
    // Clear existing data
    this.services.clear();
    this.staff.clear();
    this.customers.clear();
    this.appointments.clear();
    this.inventoryItems.clear();
    this.analytics.clear();
    this.businessProfile = undefined;

    // Create ID mappings for demo data relationships
    const tempIdToRealId = new Map<string, string>();

    // Seed business profile
    if (demoData.businessProfileData) {
      this.businessProfile = await this.setBusinessProfile({
        ...demoData.businessProfileData,
        hours: demoData.businessProfileData.hours as any,
        socialLinks: demoData.businessProfileData.socialLinks as any
      });
    }

    // Seed services and create tempId mappings
    for (const serviceData of demoData.servicesData) {
      const { tempId, ...serviceFields } = serviceData;
      const service = await this.createService(serviceFields);
      tempIdToRealId.set(tempId, service.id);
    }

    // Seed staff and create tempId mappings
    for (const staffData of demoData.staffData) {
      const { tempId, ...staffFields } = staffData;
      const staff = await this.createStaff({
        ...staffFields,
        availability: staffFields.availability as any
      });
      tempIdToRealId.set(tempId, staff.id);
    }

    // Seed customers and create tempId mappings
    for (const customerData of demoData.customersData) {
      const { tempId, ...customerFields } = customerData;
      const customer = await this.createCustomer({
        ...customerFields,
        preferences: customerFields.preferences as any
      });
      tempIdToRealId.set(tempId, customer.id);
    }

    // Seed appointments with mapped IDs
    for (const appointmentData of demoData.appointmentsData) {
      const mappedAppointment = {
        ...appointmentData,
        customerId: tempIdToRealId.get(appointmentData.customerId) || appointmentData.customerId,
        staffId: tempIdToRealId.get(appointmentData.staffId) || appointmentData.staffId,
        serviceId: tempIdToRealId.get(appointmentData.serviceId) || appointmentData.serviceId
      };
      await this.createAppointment(mappedAppointment);
    }

    // Seed inventory items
    for (const inventoryData of demoData.inventoryData) {
      await this.createInventoryItem(inventoryData);
    }

    // Seed analytics
    for (const analyticsData of demoData.analyticsData) {
      await this.createAnalytics({
        ...analyticsData,
        topServices: analyticsData.topServices as any,
        staffPerformance: analyticsData.staffPerformance as any
      });
    }

    console.log('Demo data seeded successfully');
  }
}

export const storage = new MemStorage();
