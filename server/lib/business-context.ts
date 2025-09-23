import { storage } from '../storage'
import { getNow } from './clock'

export interface BusinessContext {
  todaysAppointments: any[]
  staffSchedules: any[]
  inventoryAlerts: any[]
  recentAnalytics: any
  businessProfile: any
}

export async function getBusinessContext(): Promise<string> {
  try {
    // Fetch all relevant business data concurrently
    const [
      todaysAppointments,
      allStaff,
      allServices,
      inventoryItems,
      recentAnalytics,
      allCustomers
    ] = await Promise.all([
      storage.getAppointmentsByDay(new Date()),
      storage.getAllStaff(),
      storage.getAllServices(),
      storage.getAllInventoryItems(),
      storage.getAllAnalytics(),
      storage.getAllCustomers()
    ])

    // Process inventory alerts
    const lowStockItems = inventoryItems.filter(
      (item) => item.currentStock <= item.minStock && item.status !== 'out-of-stock'
    )
    const outOfStockItems = inventoryItems.filter((item) => item.status === 'out-of-stock')

    // Process today's schedule
    const currentTime = getNow()
    const upcomingAppointments = todaysAppointments.filter(
      (apt) => new Date(apt.scheduledStart) > currentTime
    )
    const inProgressAppointments = todaysAppointments.filter((apt) => apt.status === 'in-progress')
    const completedToday = todaysAppointments.filter((apt) => apt.status === 'completed')

    // Get latest analytics
    const latestAnalytics = recentAnalytics.length > 0 ? recentAnalytics[0] : null

    // Build context summary
    const contextSummary = `
**TODAY'S SCHEDULE (${currentTime.toLocaleDateString()}):**
- Total appointments: ${todaysAppointments.length}
- Completed: ${completedToday.length}
- In progress: ${inProgressAppointments.length}
- Upcoming: ${upcomingAppointments.length}

**ACTIVE STAFF TODAY:**
${allStaff
  .filter((staff) => staff.isActive)
  .map(
    (staff) => `- ${staff.name} (${staff.role}) - Specializes in: ${staff.specialties.join(', ')}`
  )
  .join('\n')}

**INVENTORY ALERTS:**
${
  lowStockItems.length > 0
    ? `LOW STOCK (${lowStockItems.length} items):
${lowStockItems.map((item) => `- ${item.name}: ${item.currentStock}/${item.minStock} units`).join('\n')}`
    : ''
}
${
  outOfStockItems.length > 0
    ? `OUT OF STOCK (${outOfStockItems.length} items):
${outOfStockItems.map((item) => `- ${item.name} - ${item.supplier}`).join('\n')}`
    : ''
}
${lowStockItems.length === 0 && outOfStockItems.length === 0 ? 'All inventory levels are healthy.' : ''}

**SERVICES AVAILABLE:**
${allServices
  .filter((service) => service.isActive)
  .map((service) => `- ${service.name} ($${service.price}) - ${service.duration}min`)
  .join('\n')}

**RECENT BUSINESS PERFORMANCE:**
${
  latestAnalytics
    ? `- Monthly Revenue: $${latestAnalytics.totalRevenue}
- Total Appointments: ${latestAnalytics.totalAppointments}
- Customer Satisfaction: ${(parseFloat(latestAnalytics.customerSatisfaction) * 100).toFixed(1)}%
- Average Rating: ${latestAnalytics.averageRating}/5.0
- Staff Utilization: ${(parseFloat(latestAnalytics.utilizationRate) * 100).toFixed(1)}%
- No-Show Rate: ${(parseFloat(latestAnalytics.noShowRate) * 100).toFixed(1)}%`
    : 'No recent analytics available'
}

**KEY INSIGHTS:**
- Total active customers: ${allCustomers.length}
- Popular services: ${
      latestAnalytics?.topServices && Array.isArray(latestAnalytics.topServices)
        ? latestAnalytics.topServices
            .slice(0, 3)
            .map((s: any) => s.serviceName)
            .join(', ')
        : 'Executive Cut, Skin Fade, Beard Sculpt'
    }
- Business hours: Mon-Wed 9-6, Thu-Fri 9-8, Sat 8-5, Sun 10-4
`

    return contextSummary.trim()
  } catch (error) {
    console.error('Error generating business context:', error)
    return 'Unable to fetch current business data. Operating with basic business information only.'
  }
}

export async function getSpecificContext(contextType: string): Promise<string> {
  try {
    switch (contextType.toLowerCase()) {
      case 'appointments':
      case 'schedule':
        const appointments = await storage.getAppointmentsByDay(getNow())
        const staff = await storage.getAllStaff()
        const services = await storage.getAllServices()

        // Create lookup maps
        const staffMap = new Map(staff.map((s) => [s.id, s]))
        const serviceMap = new Map(services.map((s) => [s.id, s]))

        return `TODAY'S APPOINTMENTS (${appointments.length} total):
${appointments
  .map((apt) => {
    const staffMember = staffMap.get(apt.staffId)
    const service = serviceMap.get(apt.serviceId)
    const time = new Date(apt.scheduledStart).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
    return `- ${time}: ${service?.name || 'Service'} with ${staffMember?.name || 'Staff'} (${apt.status})`
  })
  .join('\n')}`

      case 'inventory':
        const inventory = await storage.getAllInventoryItems()
        const alerts = inventory.filter(
          (item) => item.currentStock <= item.minStock || item.status === 'out-of-stock'
        )

        return `INVENTORY STATUS:
Total Items: ${inventory.length}
Alerts: ${alerts.length}
${alerts
  .map((item) => `- ${item.name}: ${item.currentStock}/${item.minStock} units (${item.status})`)
  .join('\n')}`

      case 'staff':
        const allStaff = await storage.getAllStaff()
        return `STAFF INFORMATION:
${allStaff
  .filter((s) => s.isActive)
  .map(
    (staff) =>
      `- ${staff.name} (${staff.role}): ${staff.specialties.join(', ')} - ${staff.experience} years experience`
  )
  .join('\n')}`

      case 'analytics':
        const analytics = await storage.getAllAnalytics()
        const latest = analytics[0]
        return latest
          ? `RECENT PERFORMANCE:
- Revenue: $${latest.totalRevenue}
- Appointments: ${latest.totalAppointments}
- Customer Satisfaction: ${(parseFloat(latest.customerSatisfaction) * 100).toFixed(1)}%
- Average Rating: ${latest.averageRating}/5.0`
          : 'No analytics available'

      default:
        return await getBusinessContext()
    }
  } catch (error) {
    console.error(`Error generating ${contextType} context:`, error)
    return `Unable to fetch ${contextType} data at this time.`
  }
}
