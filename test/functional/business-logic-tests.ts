/**
 * Business Logic Validation Tests
 * Tests core business logic including POS calculations, inventory management,
 * scheduling, and loyalty program functionality
 */

import type {
  TestHttpClient,
  TestDataManager,
  PerformanceMonitor
} from '../utils/test-environment.js'

export interface BusinessLogicTestResult {
  testName: string
  status: 'pass' | 'fail' | 'skip'
  duration: number
  error?: string
  details?: any
}

/**
 * Business Logic Test Suite
 */
export class BusinessLogicTestSuite {
  private results: BusinessLogicTestResult[] = []

  constructor(
    private httpClient: TestHttpClient,
    private dataManager: TestDataManager,
    private performanceMonitor: PerformanceMonitor
  ) {}

  /**
   * Run all business logic tests
   */
  async runAllTests(): Promise<BusinessLogicTestResult[]> {
    console.log('\n=== Business Logic Validation Tests ===')

    this.results = []

    // Ensure clean test environment
    await this.dataManager.resetDemoData()

    // Run POS transaction calculation tests
    await this.testPosTransactionCalculations()

    // Run inventory management tests
    await this.testInventoryManagement()

    // Run scheduling and staff assignment tests
    await this.testSchedulingLogic()

    // Run loyalty program tests
    await this.testLoyaltyProgram()

    // Run marketing campaign tests
    await this.testMarketingCampaigns()

    // Print summary
    this.printSummary()

    return this.results
  }

  /**
   * Test POS transaction calculations
   */
  private async testPosTransactionCalculations(): Promise<void> {
    console.log('\n--- POS Transaction Calculation Tests ---')

    // Test 1: Basic service sale calculation
    await this.runTest('Basic Service Sale Calculation', async () => {
      const services = await this.httpClient.getJson('/api/services')
      if (!Array.isArray(services) || services.length === 0) {
        throw new Error('No services available for testing')
      }

      const service = services[0]
      const servicePrice = parseFloat(service.price)

      const sale = await this.httpClient.postJson('/api/pos/sales', {
        items: [{ kind: 'service', id: service.id, quantity: 1 }]
      })

      // Verify basic calculation
      const expectedSubtotal = servicePrice
      const actualSubtotal = parseFloat(sale.subtotal)

      if (Math.abs(actualSubtotal - expectedSubtotal) > 0.01) {
        throw new Error(`Subtotal mismatch: expected ${expectedSubtotal}, got ${actualSubtotal}`)
      }

      // Verify total equals subtotal when no discount/tax
      const actualTotal = parseFloat(sale.total)
      if (Math.abs(actualTotal - expectedSubtotal) > 0.01) {
        throw new Error(`Total mismatch: expected ${expectedSubtotal}, got ${actualTotal}`)
      }

      return { saleId: sale.id, subtotal: actualSubtotal, total: actualTotal }
    })

    // Test 2: Multiple items calculation
    await this.runTest('Multiple Items Calculation', async () => {
      const services = await this.httpClient.getJson('/api/services')
      if (services.length < 2) {
        throw new Error('Need at least 2 services for multiple items test')
      }

      const service1 = services[0]
      const service2 = services[1]
      const price1 = parseFloat(service1.price)
      const price2 = parseFloat(service2.price)

      const sale = await this.httpClient.postJson('/api/pos/sales', {
        items: [
          { kind: 'service', id: service1.id, quantity: 1 },
          { kind: 'service', id: service2.id, quantity: 2 }
        ]
      })

      const expectedSubtotal = price1 + price2 * 2
      const actualSubtotal = parseFloat(sale.subtotal)

      if (Math.abs(actualSubtotal - expectedSubtotal) > 0.01) {
        throw new Error(
          `Multiple items subtotal mismatch: expected ${expectedSubtotal}, got ${actualSubtotal}`
        )
      }

      return { expectedSubtotal, actualSubtotal, items: sale.items }
    })

    // Test 3: Discount calculation
    await this.runTest('Discount Calculation', async () => {
      const services = await this.httpClient.getJson('/api/services')
      const service = services[0]
      const servicePrice = parseFloat(service.price)
      const discountPct = 15

      const sale = await this.httpClient.postJson('/api/pos/sales', {
        items: [{ kind: 'service', id: service.id, quantity: 1 }],
        discountPct: discountPct
      })

      const expectedSubtotal = servicePrice
      const expectedDiscount = servicePrice * (discountPct / 100)
      const expectedTotal = servicePrice - expectedDiscount

      const actualSubtotal = parseFloat(sale.subtotal)
      const actualDiscount = parseFloat(sale.discount)
      const actualTotal = parseFloat(sale.total)

      if (Math.abs(actualSubtotal - expectedSubtotal) > 0.01) {
        throw new Error(
          `Discount test subtotal mismatch: expected ${expectedSubtotal}, got ${actualSubtotal}`
        )
      }

      if (Math.abs(actualDiscount - expectedDiscount) > 0.01) {
        throw new Error(
          `Discount amount mismatch: expected ${expectedDiscount}, got ${actualDiscount}`
        )
      }

      if (Math.abs(actualTotal - expectedTotal) > 0.01) {
        throw new Error(
          `Discount test total mismatch: expected ${expectedTotal}, got ${actualTotal}`
        )
      }

      return { discountPct, expectedDiscount, actualDiscount }
    })

    // Test 4: Tax calculation
    await this.runTest('Tax Calculation', async () => {
      const services = await this.httpClient.getJson('/api/services')
      const service = services[0]
      const servicePrice = parseFloat(service.price)
      const taxPct = 8.5

      const sale = await this.httpClient.postJson('/api/pos/sales', {
        items: [{ kind: 'service', id: service.id, quantity: 1 }],
        taxPct: taxPct
      })

      const expectedSubtotal = servicePrice
      const expectedTax = servicePrice * (taxPct / 100)
      const expectedTotal = servicePrice + expectedTax

      const actualTax = parseFloat(sale.tax)
      const actualTotal = parseFloat(sale.total)

      if (Math.abs(actualTax - expectedTax) > 0.01) {
        throw new Error(`Tax amount mismatch: expected ${expectedTax}, got ${actualTax}`)
      }

      if (Math.abs(actualTotal - expectedTotal) > 0.01) {
        throw new Error(`Tax test total mismatch: expected ${expectedTotal}, got ${actualTotal}`)
      }

      return { taxPct, expectedTax, actualTax }
    })

    // Test 5: Combined discount and tax calculation
    await this.runTest('Combined Discount and Tax Calculation', async () => {
      const services = await this.httpClient.getJson('/api/services')
      const service = services[0]
      const servicePrice = parseFloat(service.price)
      const discountPct = 10
      const taxPct = 8.5

      const sale = await this.httpClient.postJson('/api/pos/sales', {
        items: [{ kind: 'service', id: service.id, quantity: 1 }],
        discountPct: discountPct,
        taxPct: taxPct
      })

      const expectedSubtotal = servicePrice
      const expectedDiscount = servicePrice * (discountPct / 100)
      const taxableAmount = servicePrice - expectedDiscount
      const expectedTax = taxableAmount * (taxPct / 100)
      const expectedTotal = taxableAmount + expectedTax

      const actualDiscount = parseFloat(sale.discount)
      const actualTax = parseFloat(sale.tax)
      const actualTotal = parseFloat(sale.total)

      if (Math.abs(actualDiscount - expectedDiscount) > 0.01) {
        throw new Error(
          `Combined test discount mismatch: expected ${expectedDiscount}, got ${actualDiscount}`
        )
      }

      if (Math.abs(actualTax - expectedTax) > 0.01) {
        throw new Error(`Combined test tax mismatch: expected ${expectedTax}, got ${actualTax}`)
      }

      if (Math.abs(actualTotal - expectedTotal) > 0.01) {
        throw new Error(
          `Combined test total mismatch: expected ${expectedTotal}, got ${actualTotal}`
        )
      }

      return {
        discountPct,
        taxPct,
        expectedDiscount,
        expectedTax,
        expectedTotal,
        actualTotal
      }
    })
  }

  /**
   * Test inventory management workflow
   */
  private async testInventoryManagement(): Promise<void> {
    console.log('\n--- Inventory Management Tests ---')

    // Test 1: Inventory status calculation
    await this.runTest('Inventory Status Calculation', async () => {
      const inventory = await this.httpClient.getJson('/api/inventory')
      if (!Array.isArray(inventory) || inventory.length === 0) {
        throw new Error('No inventory items available for testing')
      }

      const statusCounts = {
        'in-stock': 0,
        'low-stock': 0,
        'out-of-stock': 0
      }

      const validationErrors: string[] = []

      for (const item of inventory) {
        statusCounts[item.status as keyof typeof statusCounts]++

        // Validate status logic
        if (item.currentStock === 0 && item.status !== 'out-of-stock') {
          validationErrors.push(`Item ${item.name}: currentStock is 0 but status is ${item.status}`)
        } else if (
          item.currentStock > 0 &&
          item.currentStock <= item.minStock &&
          item.status !== 'low-stock'
        ) {
          validationErrors.push(
            `Item ${item.name}: currentStock (${item.currentStock}) <= minStock (${item.minStock}) but status is ${item.status}`
          )
        } else if (item.currentStock > item.minStock && item.status !== 'in-stock') {
          validationErrors.push(
            `Item ${item.name}: currentStock (${item.currentStock}) > minStock (${item.minStock}) but status is ${item.status}`
          )
        }
      }

      if (validationErrors.length > 0) {
        throw new Error(`Inventory status validation failed:\n${validationErrors.join('\n')}`)
      }

      return { statusCounts, totalItems: inventory.length }
    })

    // Test 2: Low inventory scenario validation
    await this.runTest('Low Inventory Scenario Validation', async () => {
      // Seed with low inventory scenario
      await this.httpClient.postJson('/api/demo/seed?scenario=low_inventory&seed=123')

      const inventory = await this.httpClient.getJson('/api/inventory')
      const outOfStockItems = inventory.filter((item: any) => item.status === 'out-of-stock')
      const lowStockItems = inventory.filter((item: any) => item.status === 'low-stock')

      if (outOfStockItems.length === 0 && lowStockItems.length === 0) {
        throw new Error(
          'Low inventory scenario should produce some out-of-stock or low-stock items'
        )
      }

      // Verify deterministic behavior with same seed
      await this.httpClient.postJson('/api/demo/seed?scenario=low_inventory&seed=123')
      const inventory2 = await this.httpClient.getJson('/api/inventory')
      const outOfStockItems2 = inventory2.filter((item: any) => item.status === 'out-of-stock')

      const outOfStockSkus1 = outOfStockItems.map((item: any) => item.sku).sort()
      const outOfStockSkus2 = outOfStockItems2.map((item: any) => item.sku).sort()

      if (JSON.stringify(outOfStockSkus1) !== JSON.stringify(outOfStockSkus2)) {
        throw new Error('Low inventory scenario should be deterministic with same seed')
      }

      return {
        outOfStockCount: outOfStockItems.length,
        lowStockCount: lowStockItems.length,
        outOfStockSkus: outOfStockSkus1
      }
    })

    // Test 3: Product sale inventory deduction (if products are available)
    await this.runTest('Product Sale Inventory Deduction', async () => {
      // Reset to default scenario first
      await this.httpClient.postJson('/api/demo/reset')

      const inventory = await this.httpClient.getJson('/api/inventory')
      const inStockProducts = inventory.filter(
        (item: any) => item.status === 'in-stock' && item.currentStock > 0 && item.retailPrice
      )

      if (inStockProducts.length === 0) {
        return { skipped: true, reason: 'No in-stock products with retail price available' }
      }

      const product = inStockProducts[0]
      const initialStock = product.currentStock
      const saleQuantity = Math.min(2, initialStock) // Don't oversell

      // Create sale with product
      const sale = await this.httpClient.postJson('/api/pos/sales', {
        items: [{ kind: 'product', id: product.id, quantity: saleQuantity }]
      })

      // Check inventory after sale
      const updatedInventory = await this.httpClient.getJson('/api/inventory')
      const updatedProduct = updatedInventory.find((item: any) => item.id === product.id)

      if (!updatedProduct) {
        throw new Error('Product not found after sale')
      }

      const expectedStock = initialStock - saleQuantity
      if (updatedProduct.currentStock !== expectedStock) {
        throw new Error(
          `Stock deduction failed: expected ${expectedStock}, got ${updatedProduct.currentStock}`
        )
      }

      // Verify status update if stock went to zero
      if (expectedStock === 0 && updatedProduct.status !== 'out-of-stock') {
        throw new Error(`Product should be out-of-stock when currentStock is 0`)
      }

      // Clean up by deleting the sale (should restore stock)
      await this.httpClient.delete(`/api/pos/sales/${sale.id}`)

      const restoredInventory = await this.httpClient.getJson('/api/inventory')
      const restoredProduct = restoredInventory.find((item: any) => item.id === product.id)

      if (restoredProduct.currentStock !== initialStock) {
        throw new Error(
          `Stock restoration failed: expected ${initialStock}, got ${restoredProduct.currentStock}`
        )
      }

      return {
        productName: product.name,
        initialStock,
        saleQuantity,
        finalStock: expectedStock,
        stockRestored: restoredProduct.currentStock === initialStock
      }
    })
  }

  /**
   * Test scheduling and staff assignment logic
   */
  private async testSchedulingLogic(): Promise<void> {
    console.log('\n--- Scheduling and Staff Assignment Tests ---')

    // Test 1: Appointment time validation
    await this.runTest('Appointment Time Validation', async () => {
      const appointments = await this.httpClient.getJson('/api/appointments')
      if (!Array.isArray(appointments) || appointments.length === 0) {
        throw new Error('No appointments available for testing')
      }

      const validationErrors: string[] = []

      for (const appointment of appointments) {
        const startTime = new Date(appointment.scheduledStart)
        const endTime = new Date(appointment.scheduledEnd)

        // Validate start time is before end time
        if (startTime >= endTime) {
          validationErrors.push(
            `Appointment ${appointment.id}: start time (${startTime}) is not before end time (${endTime})`
          )
        }

        // Validate appointment duration is reasonable (5 minutes to 4 hours)
        const durationMs = endTime.getTime() - startTime.getTime()
        const durationMinutes = durationMs / (1000 * 60)

        if (durationMinutes < 5 || durationMinutes > 240) {
          validationErrors.push(
            `Appointment ${appointment.id}: duration (${durationMinutes} minutes) is unreasonable`
          )
        }
      }

      if (validationErrors.length > 0) {
        throw new Error(`Appointment time validation failed:\n${validationErrors.join('\n')}`)
      }

      return { totalAppointments: appointments.length, validationsPassed: true }
    })

    // Test 2: Staff assignment validation
    await this.runTest('Staff Assignment Validation', async () => {
      const appointments = await this.httpClient.getJson('/api/appointments')
      const staff = await this.httpClient.getJson('/api/staff')

      const staffIds = new Set(staff.map((s: any) => s.id))
      const validationErrors: string[] = []

      for (const appointment of appointments) {
        if (!staffIds.has(appointment.staffId)) {
          validationErrors.push(
            `Appointment ${appointment.id}: assigned to non-existent staff ${appointment.staffId}`
          )
        }
      }

      if (validationErrors.length > 0) {
        throw new Error(`Staff assignment validation failed:\n${validationErrors.join('\n')}`)
      }

      // Check for staff workload distribution
      const staffWorkload = new Map<string, number>()
      for (const appointment of appointments) {
        const count = staffWorkload.get(appointment.staffId) || 0
        staffWorkload.set(appointment.staffId, count + 1)
      }

      const workloadStats = Array.from(staffWorkload.entries()).map(([staffId, count]) => {
        const staffMember = staff.find((s: any) => s.id === staffId)
        return { staffName: staffMember?.name || 'Unknown', appointmentCount: count }
      })

      return {
        validStaffAssignments: true,
        workloadDistribution: workloadStats
      }
    })

    // Test 3: Service assignment validation
    await this.runTest('Service Assignment Validation', async () => {
      const appointments = await this.httpClient.getJson('/api/appointments')
      const services = await this.httpClient.getJson('/api/services')

      const serviceIds = new Set(services.map((s: any) => s.id))
      const validationErrors: string[] = []

      for (const appointment of appointments) {
        if (!serviceIds.has(appointment.serviceId)) {
          validationErrors.push(
            `Appointment ${appointment.id}: assigned to non-existent service ${appointment.serviceId}`
          )
        }
      }

      if (validationErrors.length > 0) {
        throw new Error(`Service assignment validation failed:\n${validationErrors.join('\n')}`)
      }

      return { validServiceAssignments: true }
    })

    // Test 4: Busy day scenario validation
    await this.runTest('Busy Day Scenario Validation', async () => {
      // Test default scenario first
      await this.httpClient.postJson('/api/demo/seed?scenario=default&seed=123')
      const defaultAppointments = await this.httpClient.getJson('/api/appointments?day=today')

      // Test busy day scenario
      await this.httpClient.postJson('/api/demo/seed?scenario=busy_day&seed=123')
      const busyAppointments = await this.httpClient.getJson('/api/appointments?day=today')

      if (busyAppointments.length <= defaultAppointments.length) {
        throw new Error('Busy day scenario should have more appointments than default')
      }

      // Verify no scheduling conflicts (overlapping appointments for same staff)
      const staffSchedules = new Map<string, Array<{ start: Date; end: Date }>>()

      for (const appointment of busyAppointments) {
        const staffId = appointment.staffId
        const start = new Date(appointment.scheduledStart)
        const end = new Date(appointment.scheduledEnd)

        if (!staffSchedules.has(staffId)) {
          staffSchedules.set(staffId, [])
        }

        const schedule = staffSchedules.get(staffId)!

        // Check for overlaps with existing appointments
        for (const existing of schedule) {
          if (start < existing.end && end > existing.start) {
            throw new Error(
              `Scheduling conflict detected for staff ${staffId}: ${start} - ${end} overlaps with ${existing.start} - ${existing.end}`
            )
          }
        }

        schedule.push({ start, end })
      }

      return {
        defaultAppointmentCount: defaultAppointments.length,
        busyAppointmentCount: busyAppointments.length,
        noSchedulingConflicts: true
      }
    })

    // Test 5: Appointment gaps scenario validation
    await this.runTest('Appointment Gaps Scenario Validation', async () => {
      await this.httpClient.postJson('/api/demo/seed?scenario=appointment_gaps&seed=123')
      const gapAppointments = await this.httpClient.getJson('/api/appointments?day=today')

      // Reset to default for comparison
      await this.httpClient.postJson('/api/demo/seed?scenario=default&seed=123')
      const defaultAppointments = await this.httpClient.getJson('/api/appointments?day=today')

      if (gapAppointments.length >= defaultAppointments.length) {
        throw new Error('Appointment gaps scenario should have fewer appointments than default')
      }

      // Calculate average gap between appointments
      if (gapAppointments.length > 1) {
        const sortedAppointments = gapAppointments.sort(
          (a: any, b: any) =>
            new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
        )

        let totalGapMinutes = 0
        for (let i = 1; i < sortedAppointments.length; i++) {
          const prevEnd = new Date(sortedAppointments[i - 1].scheduledEnd)
          const currentStart = new Date(sortedAppointments[i].scheduledStart)
          const gapMinutes = (currentStart.getTime() - prevEnd.getTime()) / (1000 * 60)
          totalGapMinutes += Math.max(0, gapMinutes)
        }

        const averageGap = totalGapMinutes / (sortedAppointments.length - 1)

        return {
          defaultAppointmentCount: defaultAppointments.length,
          gapAppointmentCount: gapAppointments.length,
          averageGapMinutes: Math.round(averageGap)
        }
      }

      return {
        defaultAppointmentCount: defaultAppointments.length,
        gapAppointmentCount: gapAppointments.length,
        averageGapMinutes: 0
      }
    })
  }

  /**
   * Test loyalty program point calculations
   */
  private async testLoyaltyProgram(): Promise<void> {
    console.log('\n--- Loyalty Program Tests ---')

    // Test 1: Loyalty entry creation and validation
    await this.runTest('Loyalty Entry Creation', async () => {
      const customers = await this.httpClient.getJson('/api/customers')
      if (!Array.isArray(customers) || customers.length === 0) {
        throw new Error('No customers available for loyalty testing')
      }

      const customer = customers[0]
      const pointsToEarn = 100

      const loyaltyEntry = await this.httpClient.postJson('/api/loyalty/entries', {
        customerId: customer.id,
        type: 'earned',
        points: pointsToEarn,
        note: 'Test loyalty points'
      })

      if (!loyaltyEntry.id) {
        throw new Error('Loyalty entry creation failed')
      }

      if (loyaltyEntry.points !== pointsToEarn) {
        throw new Error(`Points mismatch: expected ${pointsToEarn}, got ${loyaltyEntry.points}`)
      }

      if (loyaltyEntry.customerId !== customer.id) {
        throw new Error(
          `Customer ID mismatch: expected ${customer.id}, got ${loyaltyEntry.customerId}`
        )
      }

      return {
        entryId: loyaltyEntry.id,
        customerId: customer.id,
        points: pointsToEarn
      }
    })

    // Test 2: Customer loyalty filtering
    await this.runTest('Customer Loyalty Filtering', async () => {
      const customers = await this.httpClient.getJson('/api/customers')
      if (customers.length === 0) {
        throw new Error('No customers available for filtering test')
      }

      const customer = customers[0]

      // Create multiple loyalty entries for the customer
      const entries = []
      for (let i = 0; i < 3; i++) {
        const entry = await this.httpClient.postJson('/api/loyalty/entries', {
          customerId: customer.id,
          type: i % 2 === 0 ? 'earned' : 'redeemed',
          points: (i + 1) * 50,
          note: `Test entry ${i + 1}`
        })
        entries.push(entry)
      }

      // Get all loyalty entries
      const allEntries = await this.httpClient.getJson('/api/loyalty/entries')

      // Get filtered entries for this customer
      const customerEntries = await this.httpClient.getJson(
        `/api/loyalty/entries?customerId=${customer.id}`
      )

      // Verify filtering works
      const expectedCount = entries.length
      if (customerEntries.length < expectedCount) {
        throw new Error(
          `Customer filtering failed: expected at least ${expectedCount} entries, got ${customerEntries.length}`
        )
      }

      // Verify all returned entries belong to the customer
      const invalidEntries = customerEntries.filter(
        (entry: any) => entry.customerId !== customer.id
      )
      if (invalidEntries.length > 0) {
        throw new Error(
          `Customer filtering returned entries for other customers: ${invalidEntries.length} invalid entries`
        )
      }

      return {
        customerId: customer.id,
        totalEntries: allEntries.length,
        customerEntries: customerEntries.length
      }
    })

    // Test 3: Loyalty entry types validation
    await this.runTest('Loyalty Entry Types Validation', async () => {
      const customers = await this.httpClient.getJson('/api/customers')
      const customer = customers[0]

      const entryTypes = ['earned', 'redeemed', 'expired', 'bonus']
      const createdEntries = []

      for (const type of entryTypes) {
        try {
          const entry = await this.httpClient.postJson('/api/loyalty/entries', {
            customerId: customer.id,
            type: type,
            points: 50,
            note: `Test ${type} entry`
          })
          createdEntries.push({ type, success: true, entryId: entry.id })
        } catch (error) {
          createdEntries.push({ type, success: false, error: String(error) })
        }
      }

      const successfulEntries = createdEntries.filter((e) => e.success)
      if (successfulEntries.length !== entryTypes.length) {
        const failedTypes = createdEntries.filter((e) => !e.success).map((e) => e.type)
        throw new Error(`Some loyalty entry types failed: ${failedTypes.join(', ')}`)
      }

      return { supportedTypes: entryTypes, createdEntries: successfulEntries.length }
    })

    // Test 4: Invalid loyalty entry validation
    await this.runTest('Invalid Loyalty Entry Validation', async () => {
      const invalidScenarios = [
        {
          name: 'Missing customer ID',
          data: { type: 'earned', points: 100 },
          expectedError: /customerId.*required/i
        },
        {
          name: 'Missing type',
          data: { customerId: 'valid-id', points: 100 },
          expectedError: /type.*required/i
        },
        {
          name: 'Non-existent customer',
          data: { customerId: 'non-existent-id', type: 'earned', points: 100 },
          expectedError: /customer.*not found/i
        }
      ]

      const results = []
      for (const scenario of invalidScenarios) {
        try {
          await this.httpClient.postJson('/api/loyalty/entries', scenario.data)
          results.push({
            scenario: scenario.name,
            success: false,
            error: 'Should have failed but succeeded'
          })
        } catch (error) {
          const errorMessage = String(error)
          const matchesExpected = scenario.expectedError.test(errorMessage)
          results.push({
            scenario: scenario.name,
            success: matchesExpected,
            error: matchesExpected ? null : `Unexpected error: ${errorMessage}`
          })
        }
      }

      const failedValidations = results.filter((r) => !r.success)
      if (failedValidations.length > 0) {
        throw new Error(`Validation failures: ${failedValidations.map((f) => f.error).join('; ')}`)
      }

      return { validationScenarios: results.length, allPassed: true }
    })
  }

  /**
   * Test marketing campaign logic
   */
  private async testMarketingCampaigns(): Promise<void> {
    console.log('\n--- Marketing Campaign Tests ---')

    // Test 1: Campaign creation and status management
    await this.runTest('Campaign Creation and Status Management', async () => {
      const campaign = await this.httpClient.postJson('/api/marketing/campaigns', {
        name: 'Test Campaign Logic',
        description: 'Testing campaign business logic',
        channel: 'email',
        status: 'draft'
      })

      if (!campaign.id) {
        throw new Error('Campaign creation failed')
      }

      if (campaign.status !== 'draft') {
        throw new Error(`Expected draft status, got ${campaign.status}`)
      }

      // Update campaign to active
      const updateResponse = await this.httpClient.patch(
        `/api/marketing/campaigns/${campaign.id}`,
        {
          status: 'active'
        }
      )

      if (!updateResponse.ok) {
        throw new Error('Campaign update failed')
      }

      const updatedCampaign = await updateResponse.json()
      if (updatedCampaign.status !== 'active') {
        throw new Error(`Status update failed: expected active, got ${updatedCampaign.status}`)
      }

      return { campaignId: campaign.id, statusTransition: 'draft -> active' }
    })

    // Test 2: Marketing performance calculation
    await this.runTest('Marketing Performance Calculation', async () => {
      const performance = await this.httpClient.getJson('/api/marketing/performance')

      if (!performance.summary || !Array.isArray(performance.campaigns)) {
        throw new Error('Performance data structure invalid')
      }

      const { summary, campaigns } = performance

      // Validate summary calculations
      const calculatedImpressions = campaigns.reduce(
        (sum: number, c: any) => sum + c.impressions,
        0
      )
      const calculatedClicks = campaigns.reduce((sum: number, c: any) => sum + c.clicks, 0)
      const calculatedConversions = campaigns.reduce(
        (sum: number, c: any) => sum + c.conversions,
        0
      )

      if (Math.abs(summary.impressions - calculatedImpressions) > 1) {
        throw new Error(
          `Summary impressions mismatch: expected ${calculatedImpressions}, got ${summary.impressions}`
        )
      }

      if (Math.abs(summary.clicks - calculatedClicks) > 1) {
        throw new Error(
          `Summary clicks mismatch: expected ${calculatedClicks}, got ${summary.clicks}`
        )
      }

      if (Math.abs(summary.conversions - calculatedConversions) > 1) {
        throw new Error(
          `Summary conversions mismatch: expected ${calculatedConversions}, got ${summary.conversions}`
        )
      }

      // Validate CTR calculation
      const expectedCTR =
        calculatedImpressions > 0 ? (calculatedClicks / calculatedImpressions) * 100 : 0
      if (Math.abs(summary.ctr - expectedCTR) > 0.1) {
        throw new Error(
          `Summary CTR mismatch: expected ${expectedCTR.toFixed(2)}, got ${summary.ctr}`
        )
      }

      // Validate conversion rate calculation
      const expectedConvRate =
        calculatedClicks > 0 ? (calculatedConversions / calculatedClicks) * 100 : 0
      if (Math.abs(summary.convRate - expectedConvRate) > 0.1) {
        throw new Error(
          `Summary conversion rate mismatch: expected ${expectedConvRate.toFixed(2)}, got ${summary.convRate}`
        )
      }

      return {
        campaignCount: campaigns.length,
        totalImpressions: summary.impressions,
        totalClicks: summary.clicks,
        ctr: summary.ctr,
        conversionRate: summary.convRate
      }
    })

    // Test 3: Campaign performance determinism
    await this.runTest('Campaign Performance Determinism', async () => {
      // Get performance data twice and verify it's the same (deterministic)
      const performance1 = await this.httpClient.getJson('/api/marketing/performance')
      const performance2 = await this.httpClient.getJson('/api/marketing/performance')

      if (performance1.summary.impressions !== performance2.summary.impressions) {
        throw new Error('Performance data is not deterministic - impressions differ')
      }

      if (performance1.summary.clicks !== performance2.summary.clicks) {
        throw new Error('Performance data is not deterministic - clicks differ')
      }

      // Verify individual campaign metrics are also deterministic
      for (let i = 0; i < performance1.campaigns.length; i++) {
        const camp1 = performance1.campaigns[i]
        const camp2 = performance2.campaigns.find((c: any) => c.id === camp1.id)

        if (!camp2) {
          throw new Error(`Campaign ${camp1.id} missing in second request`)
        }

        if (camp1.impressions !== camp2.impressions || camp1.clicks !== camp2.clicks) {
          throw new Error(`Campaign ${camp1.id} metrics are not deterministic`)
        }
      }

      return { deterministicMetrics: true, campaignCount: performance1.campaigns.length }
    })
  }

  /**
   * Run a single test with error handling and timing
   */
  private async runTest(testName: string, testFunction: () => Promise<any>): Promise<void> {
    const startTime = Date.now()

    try {
      const result = await testFunction()
      const duration = Date.now() - startTime

      this.results.push({
        testName,
        status: 'pass',
        duration,
        details: result
      })

      console.log(`✅ ${testName} (${duration}ms)`)
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      this.results.push({
        testName,
        status: 'fail',
        duration,
        error: errorMessage
      })

      console.error(`❌ ${testName}: ${errorMessage}`)
    }
  }

  /**
   * Print test summary
   */
  private printSummary(): void {
    const total = this.results.length
    const passed = this.results.filter((r) => r.status === 'pass').length
    const failed = this.results.filter((r) => r.status === 'fail').length
    const avgDuration = total > 0 ? this.results.reduce((sum, r) => sum + r.duration, 0) / total : 0

    console.log('\n=== Business Logic Test Summary ===')
    console.log(`Total Tests: ${total}`)
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`⏱️  Average Duration: ${avgDuration.toFixed(2)}ms`)

    if (failed > 0) {
      console.log('\n❌ Failed Tests:')
      this.results
        .filter((r) => r.status === 'fail')
        .forEach((r) => console.log(`   • ${r.testName}: ${r.error}`))
    }

    console.log(
      `\n${failed === 0 ? '✅' : '❌'} Business Logic Tests ${failed === 0 ? 'PASSED' : 'FAILED'}`
    )
  }

  /**
   * Get test results
   */
  getResults(): BusinessLogicTestResult[] {
    return [...this.results]
  }
}
