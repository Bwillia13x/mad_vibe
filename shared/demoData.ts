import type { BusinessProfile, Service, Staff, Customer, Appointment, InventoryItem, AnalyticsSnapshot } from './schema';

// Generate stable UUIDs for consistent foreign key references
const CUSTOMER_IDS = {
  michael: "550e8400-e29b-41d4-a716-446655440001",
  james: "550e8400-e29b-41d4-a716-446655440002",
  robert: "550e8400-e29b-41d4-a716-446655440003",
  daniel: "550e8400-e29b-41d4-a716-446655440004",
  christopher: "550e8400-e29b-41d4-a716-446655440005",
  matthew: "550e8400-e29b-41d4-a716-446655440006",
  anthony: "550e8400-e29b-41d4-a716-446655440007",
  mark: "550e8400-e29b-41d4-a716-446655440008"
};

const STAFF_IDS = {
  andreas: "660e8400-e29b-41d4-a716-446655440001",
  marcus: "660e8400-e29b-41d4-a716-446655440002",
  sarah: "660e8400-e29b-41d4-a716-446655440003",
  ryan: "660e8400-e29b-41d4-a716-446655440004",
  david: "660e8400-e29b-41d4-a716-446655440005"
};

const SERVICE_IDS = {
  executiveCut: "770e8400-e29b-41d4-a716-446655440001",
  skinFade: "770e8400-e29b-41d4-a716-446655440002",
  beardSculpt: "770e8400-e29b-41d4-a716-446655440003",
  hotTowelShave: "770e8400-e29b-41d4-a716-446655440004",
  deluxePackage: "770e8400-e29b-41d4-a716-446655440005",
  colorHighlights: "770e8400-e29b-41d4-a716-446655440006",
  quickTrim: "770e8400-e29b-41d4-a716-446655440007"
};

// Business Profile Data
export const businessProfileData: Omit<BusinessProfile, 'id' | 'createdAt' | 'updatedAt'> = {
  name: "Andreas For Men",
  description: "Calgary's premier destination for sophisticated men's grooming. Established in Bridgeland, we blend traditional barbering techniques with modern style to deliver an unparalleled grooming experience.",
  address: "1234 1 Avenue NE, Bridgeland, Calgary, AB T2E 0B2",
  phone: "(403) 555-CUTS",
  email: "info@andreasformen.ca",
  website: "https://www.andreasformen.ca",
  hours: {
    monday: { open: "9:00", close: "18:00" },
    tuesday: { open: "9:00", close: "18:00" },
    wednesday: { open: "9:00", close: "18:00" },
    thursday: { open: "9:00", close: "20:00" },
    friday: { open: "9:00", close: "20:00" },
    saturday: { open: "8:00", close: "17:00" },
    sunday: { open: "10:00", close: "16:00" }
  },
  socialLinks: {
    instagram: "@andreasformen",
    facebook: "Andreas For Men Calgary",
    google: "Andreas For Men Calgary"
  }
};

// Services Data - Premium Calgary Pricing in CAD
export const servicesData: Array<Omit<Service, 'id' | 'createdAt' | 'updatedAt'> & { tempId: string }> = [
  {
    tempId: SERVICE_IDS.executiveCut,
    name: "Executive Cut",
    description: "Precision haircut with consultation, wash, cut, style, and hot towel finish. Perfect for the professional gentleman.",
    duration: 45,
    price: "65.00",
    category: "haircuts",
    isActive: true
  },
  {
    tempId: SERVICE_IDS.skinFade,
    name: "Classic Skin Fade",
    description: "Modern skin fade with scissors on top. Includes wash, cut, style, and styling product application.",
    duration: 50,
    price: "70.00",
    category: "haircuts",
    isActive: true
  },
  {
    tempId: SERVICE_IDS.beardSculpt,
    name: "Beard Sculpt & Trim",
    description: "Precision beard trimming and shaping with hot towel treatment and beard oil application.",
    duration: 30,
    price: "45.00",
    category: "grooming",
    isActive: true
  },
  {
    tempId: SERVICE_IDS.hotTowelShave,
    name: "Traditional Hot Towel Shave",
    description: "Classic straight razor shave with multiple hot towel applications and premium shaving cream.",
    duration: 40,
    price: "55.00",
    category: "shaving",
    isActive: true
  },
  {
    tempId: SERVICE_IDS.deluxePackage,
    name: "Deluxe Grooming Package",
    description: "Complete makeover: Executive cut, beard trim, hot towel shave, eyebrow trim, and styling.",
    duration: 90,
    price: "120.00",
    category: "packages",
    isActive: true
  },
  {
    tempId: SERVICE_IDS.colorHighlights,
    name: "Color & Highlights",
    description: "Professional hair coloring service with consultation and premium color products.",
    duration: 75,
    price: "95.00",
    category: "coloring",
    isActive: true
  },
  {
    tempId: SERVICE_IDS.quickTrim,
    name: "Quick Trim",
    description: "Fast precision trim for maintenance between full cuts. No wash included.",
    duration: 20,
    price: "35.00",
    category: "maintenance",
    isActive: true
  }
];

// Staff Data - Premium Barbers with Canadian Names
export const staffData: Array<Omit<Staff, 'id' | 'createdAt' | 'updatedAt'> & { tempId: string }> = [
  {
    tempId: STAFF_IDS.andreas,
    name: "Andreas Kowalski",
    email: "andreas@andreasformen.ca",
    role: "Master Barber & Owner",
    specialties: ["Executive Cuts", "Beard Sculpting", "Traditional Shaves", "Color Services"],
    experience: 15,
    rating: "4.9",
    bio: "Master barber with 15 years of experience. Trained in London and brings European techniques to Calgary. Specializes in executive cuts and traditional wet shaves.",
    avatar: "/images/staff/andreas.jpg",
    availability: {
      monday: { start: "9:00", end: "17:00" },
      tuesday: { start: "9:00", end: "17:00" },
      wednesday: { start: "9:00", end: "17:00" },
      thursday: { start: "9:00", end: "19:00" },
      friday: { start: "9:00", end: "19:00" },
      saturday: { start: "8:00", end: "16:00" },
      sunday: { start: "10:00", end: "15:00" }
    },
    isActive: true
  },
  {
    tempId: STAFF_IDS.marcus,
    name: "Marcus Chen",
    email: "marcus@andreasformen.ca",
    role: "Senior Barber",
    specialties: ["Modern Fades", "Skin Fades", "Styling", "Beard Trims"],
    experience: 8,
    rating: "4.8",
    bio: "Precision fade specialist with a modern approach. Marcus excels at contemporary cuts and has won multiple barbering competitions in Western Canada.",
    avatar: "/images/staff/marcus.jpg",
    availability: {
      monday: { start: "10:00", end: "18:00" },
      tuesday: { start: "10:00", end: "18:00" },
      wednesday: { start: "10:00", end: "18:00" },
      thursday: { start: "10:00", end: "20:00" },
      friday: { start: "10:00", end: "20:00" },
      saturday: { start: "8:00", end: "17:00" },
      sunday: "off"
    },
    isActive: true
  },
  {
    tempId: STAFF_IDS.sarah,
    name: "Sarah MacDonald",
    email: "sarah@andreasformen.ca",
    role: "Barber & Color Specialist",
    specialties: ["Color Services", "Highlights", "Classic Cuts", "Styling"],
    experience: 6,
    rating: "4.7",
    bio: "Color expert and precision cutter. Sarah brings creativity and technical expertise to every service, especially excelling in color transformations.",
    avatar: "/images/staff/sarah.jpg",
    availability: {
      monday: "off",
      tuesday: { start: "9:00", end: "17:00" },
      wednesday: { start: "9:00", end: "17:00" },
      thursday: { start: "9:00", end: "19:00" },
      friday: { start: "9:00", end: "19:00" },
      saturday: { start: "8:00", end: "17:00" },
      sunday: { start: "10:00", end: "16:00" }
    },
    isActive: true
  },
  {
    tempId: STAFF_IDS.ryan,
    name: "Ryan Thompson",
    email: "ryan@andreasformen.ca",
    role: "Barber",
    specialties: ["Traditional Cuts", "Hot Towel Shaves", "Beard Grooming"],
    experience: 4,
    rating: "4.6",
    bio: "Traditional barber with a passion for classic techniques. Ryan provides excellent service with attention to detail and customer comfort.",
    avatar: "/images/staff/ryan.jpg",
    availability: {
      monday: { start: "11:00", end: "18:00" },
      tuesday: { start: "11:00", end: "18:00" },
      wednesday: { start: "11:00", end: "18:00" },
      thursday: { start: "11:00", end: "20:00" },
      friday: { start: "11:00", end: "20:00" },
      saturday: { start: "9:00", end: "17:00" },
      sunday: { start: "11:00", end: "16:00" }
    },
    isActive: true
  },
  {
    tempId: STAFF_IDS.david,
    name: "David Walsh",
    email: "david@andreasformen.ca",
    role: "Junior Barber",
    specialties: ["Quick Trims", "Basic Cuts", "Styling"],
    experience: 2,
    rating: "4.6",
    bio: "Rising talent in the barbering world. David is eager, skilled, and provides great value with his attention to detail and customer service.",
    avatar: "/images/staff/david.jpg",
    availability: {
      monday: { start: "9:00", end: "17:00" },
      tuesday: { start: "9:00", end: "17:00" },
      wednesday: "off",
      thursday: { start: "9:00", end: "19:00" },
      friday: { start: "9:00", end: "19:00" },
      saturday: { start: "8:00", end: "16:00" },
      sunday: { start: "10:00", end: "15:00" }
    },
    isActive: true
  }
];

// Customer Data - Calgary Clientele
export const customersData: Array<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { tempId: string }> = [
  {
    tempId: CUSTOMER_IDS.michael,
    name: "Michael Johnson",
    email: "m.johnson@gmail.com",
    phone: "(403) 555-0123",
    preferences: { preferredBarber: "Andreas Kowalski", preferredTime: "morning", allergies: [], notes: "Prefers classic style" }
  },
  {
    tempId: CUSTOMER_IDS.james,
    name: "James Wilson",
    email: "james.wilson@gmail.com",
    phone: "(403) 555-0124",
    preferences: { preferredBarber: "Marcus Chen", preferredTime: "afternoon", allergies: [], notes: "Modern fade regular" }
  },
  {
    tempId: CUSTOMER_IDS.robert,
    name: "Robert Brown",
    email: "rob.brown@outlook.com",
    phone: "(403) 555-0125",
    preferences: { preferredBarber: "Sarah MacDonald", preferredTime: "evening", allergies: [], notes: "Color touch-ups monthly" }
  },
  {
    tempId: CUSTOMER_IDS.daniel,
    name: "Daniel Smith",
    email: "d.smith@yahoo.com",
    phone: "(403) 555-0126",
    preferences: { preferredBarber: "Ryan Thompson", preferredTime: "morning", allergies: [], notes: "Traditional shave enthusiast" }
  },
  {
    tempId: CUSTOMER_IDS.christopher,
    name: "Christopher Davis",
    email: "chris.davis@gmail.com",
    phone: "(403) 555-0127",
    preferences: { preferredBarber: "David Walsh", preferredTime: "afternoon", allergies: [], notes: "Quick trim regular" }
  },
  {
    tempId: CUSTOMER_IDS.matthew,
    name: "Matthew Taylor",
    email: "matt.taylor@gmail.com",
    phone: "(403) 555-0128",
    preferences: { preferredBarber: "Andreas Kowalski", preferredTime: "morning", allergies: [], notes: "Executive package monthly" }
  },
  {
    tempId: CUSTOMER_IDS.anthony,
    name: "Anthony Miller",
    email: "anthony.m@hotmail.com",
    phone: "(403) 555-0129",
    preferences: { preferredBarber: "Marcus Chen", preferredTime: "evening", allergies: [], notes: "Skin fade specialist" }
  },
  {
    tempId: CUSTOMER_IDS.mark,
    name: "Mark Anderson",
    email: "mark.anderson@gmail.com",
    phone: "(403) 555-0130",
    preferences: { preferredBarber: "Sarah MacDonald", preferredTime: "afternoon", allergies: [], notes: "Beard sculpting" }
  }
];

// Today's Appointment Data - Realistic Daily Schedule
export const appointmentsData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Morning appointments
  {
    customerId: CUSTOMER_IDS.michael, // Michael Johnson
    staffId: STAFF_IDS.andreas, // Andreas
    serviceId: SERVICE_IDS.executiveCut, // Executive Cut
    scheduledStart: new Date(new Date().setHours(9, 0, 0, 0)),
    scheduledEnd: new Date(new Date().setHours(9, 45, 0, 0)),
    status: "completed",
    notes: "Regular client, prefers side part"
  },
  {
    customerId: CUSTOMER_IDS.james, // James Wilson
    staffId: STAFF_IDS.marcus, // Marcus
    serviceId: SERVICE_IDS.skinFade, // Skin Fade
    scheduledStart: new Date(new Date().setHours(10, 0, 0, 0)),
    scheduledEnd: new Date(new Date().setHours(10, 50, 0, 0)),
    status: "completed",
    notes: "High skin fade, #2 on top"
  },
  {
    customerId: CUSTOMER_IDS.robert, // Robert Brown
    staffId: STAFF_IDS.sarah, // Sarah
    serviceId: SERVICE_IDS.colorHighlights, // Color & Highlights
    scheduledStart: new Date(new Date().setHours(10, 30, 0, 0)),
    scheduledEnd: new Date(new Date().setHours(11, 45, 0, 0)),
    status: "in-progress",
    notes: "Touch up gray roots"
  },
  // Afternoon appointments
  {
    customerId: CUSTOMER_IDS.daniel, // Daniel Smith
    staffId: STAFF_IDS.ryan, // Ryan
    serviceId: SERVICE_IDS.hotTowelShave, // Hot Towel Shave
    scheduledStart: new Date(new Date().setHours(13, 0, 0, 0)),
    scheduledEnd: new Date(new Date().setHours(13, 40, 0, 0)),
    status: "scheduled",
    notes: "First time traditional shave"
  },
  {
    customerId: CUSTOMER_IDS.christopher, // Christopher Davis
    staffId: STAFF_IDS.david, // David
    serviceId: SERVICE_IDS.quickTrim, // Quick Trim
    scheduledStart: new Date(new Date().setHours(14, 0, 0, 0)),
    scheduledEnd: new Date(new Date().setHours(14, 20, 0, 0)),
    status: "scheduled",
    notes: "Maintenance trim"
  },
  {
    customerId: CUSTOMER_IDS.matthew, // Matthew Taylor
    staffId: STAFF_IDS.andreas, // Andreas
    serviceId: SERVICE_IDS.deluxePackage, // Deluxe Package
    scheduledStart: new Date(new Date().setHours(15, 0, 0, 0)),
    scheduledEnd: new Date(new Date().setHours(16, 30, 0, 0)),
    status: "scheduled",
    notes: "VIP client, full service"
  },
  // Evening appointments
  {
    customerId: CUSTOMER_IDS.anthony, // Anthony Miller
    staffId: STAFF_IDS.marcus, // Marcus
    serviceId: SERVICE_IDS.skinFade, // Skin Fade
    scheduledStart: new Date(new Date().setHours(17, 0, 0, 0)),
    scheduledEnd: new Date(new Date().setHours(17, 50, 0, 0)),
    status: "scheduled",
    notes: "Mid skin fade, styling gel"
  },
  {
    customerId: CUSTOMER_IDS.mark, // Mark Anderson
    staffId: STAFF_IDS.sarah, // Sarah
    serviceId: SERVICE_IDS.beardSculpt, // Beard Sculpt
    scheduledStart: new Date(new Date().setHours(18, 0, 0, 0)),
    scheduledEnd: new Date(new Date().setHours(18, 30, 0, 0)),
    status: "scheduled",
    notes: "Beard trim and shape"
  }
];

// Inventory Data - Professional Barbershop Products
export const inventoryData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: "Feather Artist Club SS Blade",
    sku: "FEATH-AC-SS",
    category: "Blades & Razors",
    brand: "Feather",
    supplier: "Professional Beauty Supply Co.",
    currentStock: 5,
    minStock: 10,
    maxStock: 50,
    unitCost: "8.50",
    retailPrice: "12.99",
    status: "low-stock",
    description: "Premium Japanese razor blades for professional straight razor shaving"
  },
  {
    name: "Proraso Pre-Shave Cream - Eucalyptus",
    sku: "PROR-PSC-EUC",
    category: "Shaving Products",
    brand: "Proraso",
    supplier: "Italian Barber Supplies",
    currentStock: 12,
    minStock: 8,
    maxStock: 25,
    unitCost: "6.25",
    retailPrice: "9.99",
    status: "in-stock",
    description: "Professional pre-shave cream with eucalyptus and menthol"
  },
  {
    name: "Schwarzkopf Professional IGORA Royal Hair Color",
    sku: "SCHW-IGOR-5-0",
    category: "Hair Color",
    brand: "Schwarzkopf Professional",
    supplier: "Sally Beauty Professional",
    currentStock: 8,
    minStock: 5,
    maxStock: 20,
    unitCost: "12.75",
    retailPrice: "18.99",
    status: "in-stock",
    description: "Professional permanent hair color - Light Brown 5-0"
  },
  {
    name: "Barbicide Disinfectant Concentrate",
    sku: "BARB-DISINF-473",
    category: "Sanitation",
    brand: "Barbicide",
    supplier: "Professional Beauty Supply Co.",
    currentStock: 0,
    minStock: 3,
    maxStock: 12,
    unitCost: "15.50",
    retailPrice: "22.99",
    status: "out-of-stock",
    description: "EPA registered hospital-grade disinfectant for tools and surfaces"
  },
  {
    name: "Wahl Professional Magic Clip",
    sku: "WAHL-MAGIC-CLIP",
    category: "Clippers",
    brand: "Wahl",
    supplier: "Barber Depot Canada",
    currentStock: 2,
    minStock: 1,
    maxStock: 4,
    unitCost: "125.00",
    retailPrice: "179.99",
    status: "in-stock",
    description: "Professional cordless clipper with 90-minute run time"
  },
  {
    name: "Layrite Original Pomade",
    sku: "LAYR-ORIG-4OZ",
    category: "Styling Products",
    brand: "Layrite",
    supplier: "Modern Barber Supply",
    currentStock: 15,
    minStock: 10,
    maxStock: 30,
    unitCost: "8.75",
    retailPrice: "14.99",
    status: "in-stock",
    description: "Water-based pomade with strong hold and high shine"
  },
  {
    name: "Hot Towel Cabinet - Professional",
    sku: "HTC-PRO-18",
    category: "Equipment",
    brand: "Elite Spa Equipment",
    supplier: "Spa & Salon Equipment Ltd.",
    currentStock: 1,
    minStock: 1,
    maxStock: 2,
    unitCost: "450.00",
    retailPrice: "649.99",
    status: "in-stock",
    description: "18-towel capacity hot towel cabinet with UV sterilization"
  },
  {
    name: "Kamisori Shear - 6 inch",
    sku: "KAMI-SHEAR-6",
    category: "Scissors & Shears",
    brand: "Kamisori",
    supplier: "Japanese Steel Imports",
    currentStock: 3,
    minStock: 2,
    maxStock: 6,
    unitCost: "220.00",
    retailPrice: "329.99",
    status: "in-stock",
    description: "Premium Japanese steel cutting shears with ergonomic design"
  },
  {
    name: "Clubman Pinaud Bay Rum Aftershave",
    sku: "CLUB-BAYRUM-177",
    category: "Aftercare",
    brand: "Clubman Pinaud",
    supplier: "Classic Barber Products",
    currentStock: 6,
    minStock: 8,
    maxStock: 20,
    unitCost: "4.50",
    retailPrice: "7.99",
    status: "low-stock",
    description: "Classic bay rum aftershave lotion with traditional scent"
  },
  {
    name: "Disposable Neck Strips - 100ct",
    sku: "DISP-NECK-100",
    category: "Sanitation",
    brand: "Professional Disposables",
    supplier: "Hygiene Supplies Canada",
    currentStock: 25,
    minStock: 15,
    maxStock: 50,
    unitCost: "3.25",
    retailPrice: "5.99",
    status: "in-stock",
    description: "Hygienic disposable neck strips for professional use"
  }
];

// Analytics Data - Premium Business Performance Metrics
export const analyticsData: Omit<AnalyticsSnapshot, 'id' | 'createdAt'>[] = [
  // Last 6 months of business analytics
  {
    date: new Date('2025-09-01'),
    totalRevenue: "28500.00",
    totalAppointments: 485,
    totalCustomers: 312,
    averageRating: "4.8",
    utilizationRate: "0.87",
    customerSatisfaction: "0.94",
    noShowRate: "0.06",
    repeatCustomerRate: "0.78",
    averageServiceDuration: 52,
    topServices: [
      { serviceName: "Executive Cut", count: 142, revenue: "9230.00" },
      { serviceName: "Classic Skin Fade", count: 118, revenue: "8260.00" },
      { serviceName: "Deluxe Grooming Package", count: 67, revenue: "8040.00" }
    ],
    staffPerformance: [
      { staffName: "Andreas Kowalski", appointments: 98, revenue: "7850.00", rating: "4.9" },
      { staffName: "Marcus Chen", appointments: 112, revenue: "7560.00", rating: "4.8" },
      { staffName: "Sarah MacDonald", appointments: 89, revenue: "6890.00", rating: "4.7" }
    ]
  },
  {
    date: new Date('2025-08-01'),
    totalRevenue: "26750.00",
    totalAppointments: 456,
    totalCustomers: 298,
    averageRating: "4.7",
    utilizationRate: "0.84",
    customerSatisfaction: "0.92",
    noShowRate: "0.08",
    repeatCustomerRate: "0.75",
    averageServiceDuration: 54,
    topServices: [
      { serviceName: "Executive Cut", count: 134, revenue: "8710.00" },
      { serviceName: "Classic Skin Fade", count: 108, revenue: "7560.00" },
      { serviceName: "Traditional Hot Towel Shave", count: 89, revenue: "4895.00" }
    ],
    staffPerformance: [
      { staffName: "Andreas Kowalski", appointments: 92, revenue: "7360.00", rating: "4.8" },
      { staffName: "Marcus Chen", appointments: 106, revenue: "7210.00", rating: "4.7" },
      { staffName: "Sarah MacDonald", appointments: 85, revenue: "6450.00", rating: "4.6" }
    ]
  },
  {
    date: new Date('2025-07-01'),
    totalRevenue: "25200.00",
    totalAppointments: 428,
    totalCustomers: 285,
    averageRating: "4.6",
    utilizationRate: "0.81",
    customerSatisfaction: "0.90",
    noShowRate: "0.09",
    repeatCustomerRate: "0.72",
    averageServiceDuration: 55,
    topServices: [
      { serviceName: "Executive Cut", count: 125, revenue: "8125.00" },
      { serviceName: "Classic Skin Fade", count: 98, revenue: "6860.00" },
      { serviceName: "Color & Highlights", count: 72, revenue: "6840.00" }
    ],
    staffPerformance: [
      { staffName: "Andreas Kowalski", appointments: 86, revenue: "6890.00", rating: "4.7" },
      { staffName: "Marcus Chen", appointments: 98, revenue: "6720.00", rating: "4.6" },
      { staffName: "Sarah MacDonald", appointments: 82, revenue: "6190.00", rating: "4.5" }
    ]
  }
];

// Export all demo data
export const demoData = {
  businessProfile: businessProfileData,
  services: servicesData,
  staff: staffData,
  customers: customersData,
  appointments: appointmentsData,
  inventoryItems: inventoryData,
  analytics: analyticsData
};

export default demoData;