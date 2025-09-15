/**
 * Comprehensive API Endpoint Tests
 * Tests all API endpoints with schema validation and error scenarios
 */

import type { ApiEndpointTest, ErrorScenarioTest } from './api-testing-framework.js';
import type { TestDataManager } from '../utils/test-environment.js';
import * as schemas from './api-schemas.js';

/**
 * Create comprehensive API endpoint tests
 */
export function createApiEndpointTests(dataManager: TestDataManager): ApiEndpointTest[] {
  return [
    // Health endpoint
    {
      name: 'Health Check',
      method: 'GET',
      path: '/api/health',
      expectedStatus: 200,
      responseSchema: schemas.HealthResponseSchema
    },

    // Business Profile endpoints
    {
      name: 'Get Business Profile',
      method: 'GET',
      path: '/api/profile',
      expectedStatus: 200,
      responseSchema: schemas.BusinessProfileSchema
    },

    // Services endpoints
    {
      name: 'Get All Services',
      method: 'GET',
      path: '/api/services',
      expectedStatus: 200,
      responseSchema: schemas.ServicesArraySchema
    },

    // Staff endpoints
    {
      name: 'Get All Staff',
      method: 'GET',
      path: '/api/staff',
      expectedStatus: 200,
      responseSchema: schemas.StaffArraySchema
    },

    // Customer endpoints
    {
      name: 'Get All Customers',
      method: 'GET',
      path: '/api/customers',
      expectedStatus: 200,
      responseSchema: schemas.CustomersArraySchema
    },

    // Appointments endpoints
    {
      name: 'Get All Appointments',
      method: 'GET',
      path: '/api/appointments',
      expectedStatus: 200,
      responseSchema: schemas.AppointmentsArraySchema
    },

    {
      name: 'Get Today Appointments',
      method: 'GET',
      path: '/api/appointments?day=today',
      expectedStatus: 200,
      responseSchema: schemas.AppointmentsArraySchema
    },

    {
      name: 'Get Appointments by Date',
      method: 'GET',
      path: '/api/appointments?date=2024-01-01',
      expectedStatus: 200,
      responseSchema: schemas.AppointmentsArraySchema
    },

    // Inventory endpoints
    {
      name: 'Get All Inventory',
      method: 'GET',
      path: '/api/inventory',
      expectedStatus: 200,
      responseSchema: schemas.InventoryArraySchema
    },

    // Analytics endpoints
    {
      name: 'Get All Analytics',
      method: 'GET',
      path: '/api/analytics',
      expectedStatus: 200,
      responseSchema: schemas.AnalyticsArraySchema
    },

    // POS endpoints
    {
      name: 'Get All Sales',
      method: 'GET',
      path: '/api/pos/sales',
      expectedStatus: 200,
      responseSchema: schemas.SalesArraySchema
    },

    {
      name: 'Create POS Sale',
      method: 'POST',
      path: '/api/pos/sales',
      requestBody: {
        items: [
          {
            kind: 'service',
            name: 'Test Service',
            quantity: 1,
            unitPrice: 50
          }
        ],
        discountPct: 10,
        taxPct: 8.5
      },
      expectedStatus: 200,
      responseSchema: schemas.SaleSchema
    },

    // Marketing endpoints
    {
      name: 'Get All Campaigns',
      method: 'GET',
      path: '/api/marketing/campaigns',
      expectedStatus: 200,
      responseSchema: schemas.CampaignsArraySchema
    },

    {
      name: 'Create Marketing Campaign',
      method: 'POST',
      path: '/api/marketing/campaigns',
      requestBody: {
        name: 'Test Campaign',
        description: 'Test Description',
        channel: 'email',
        status: 'draft'
      },
      expectedStatus: 200,
      responseSchema: schemas.CampaignSchema
    },

    {
      name: 'Get Marketing Performance',
      method: 'GET',
      path: '/api/marketing/performance',
      expectedStatus: 200,
      responseSchema: schemas.MarketingPerformanceSchema
    },

    // Loyalty endpoints
    {
      name: 'Get All Loyalty Entries',
      method: 'GET',
      path: '/api/loyalty/entries',
      expectedStatus: 200,
      responseSchema: schemas.LoyaltyEntriesArraySchema
    },

    // CSV Export endpoints
    {
      name: 'Analytics CSV Export',
      method: 'GET',
      path: '/api/analytics/export',
      expectedStatus: 200,
      responseSchema: undefined // CSV response, no JSON schema
    },

    {
      name: 'POS Sales CSV Export',
      method: 'GET',
      path: '/api/pos/sales/export',
      expectedStatus: 200,
      responseSchema: undefined // CSV response, no JSON schema
    },

    {
      name: 'Loyalty Entries CSV Export',
      method: 'GET',
      path: '/api/loyalty/entries/export',
      expectedStatus: 200,
      responseSchema: undefined // CSV response, no JSON schema
    },

    // Chat endpoints
    {
      name: 'Chat Non-Streaming',
      method: 'POST',
      path: '/api/chat',
      requestBody: {
        messages: [{ role: 'user', content: 'Hello' }],
        stream: false
      },
      expectedStatus: 200,
      responseSchema: schemas.ChatResponseSchema
    },

    // Demo endpoints
    {
      name: 'Demo Seed',
      method: 'POST',
      path: '/api/demo/seed?scenario=default&seed=123',
      expectedStatus: 200,
      responseSchema: schemas.DemoSeedResponseSchema
    },

    {
      name: 'Demo Time Freeze',
      method: 'POST',
      path: '/api/demo/time',
      requestBody: {
        date: new Date().toISOString()
      },
      expectedStatus: 200,
      responseSchema: schemas.DemoTimeResponseSchema
    },

    {
      name: 'Demo Reset',
      method: 'POST',
      path: '/api/demo/reset',
      expectedStatus: 200,
      responseSchema: schemas.DemoResetResponseSchema,
      cleanup: async () => {
        // Reset to clean state after test
        await dataManager.resetDemoData();
      }
    }
  ];
}

/**
 * Create tests for individual resource endpoints (requires existing data)
 */
export function createIndividualResourceTests(): ApiEndpointTest[] {
  let serviceId: string;
  let staffId: string;
  let appointmentId: string;
  let inventoryId: string;
  let analyticsId: string;
  let customerId: string;
  let campaignId: string;
  let saleId: string;

  return [
    // Get individual service
    {
      name: 'Get Individual Service',
      method: 'GET',
      path: '/api/services/placeholder',
      expectedStatus: 200,
      responseSchema: schemas.ServiceSchema,
      setup: async function() {
        // This will be replaced with actual ID during test execution
        const services = await fetch(this.httpClient.baseUrl + '/api/services').then(r => r.json());
        if (services.length > 0) {
          serviceId = services[0].id;
          this.path = `/api/services/${serviceId}`;
        }
      },
      skipIf: () => !serviceId
    },

    // Get individual staff member
    {
      name: 'Get Individual Staff Member',
      method: 'GET',
      path: '/api/staff/placeholder',
      expectedStatus: 200,
      responseSchema: schemas.StaffSchema,
      setup: async function() {
        const staff = await fetch(this.httpClient.baseUrl + '/api/staff').then(r => r.json());
        if (staff.length > 0) {
          staffId = staff[0].id;
          this.path = `/api/staff/${staffId}`;
        }
      },
      skipIf: () => !staffId
    },

    // Get individual appointment
    {
      name: 'Get Individual Appointment',
      method: 'GET',
      path: '/api/appointments/placeholder',
      expectedStatus: 200,
      responseSchema: schemas.AppointmentSchema,
      setup: async function() {
        const appointments = await fetch(this.httpClient.baseUrl + '/api/appointments').then(r => r.json());
        if (appointments.length > 0) {
          appointmentId = appointments[0].id;
          this.path = `/api/appointments/${appointmentId}`;
        }
      },
      skipIf: () => !appointmentId
    },

    // Get individual inventory item
    {
      name: 'Get Individual Inventory Item',
      method: 'GET',
      path: '/api/inventory/placeholder',
      expectedStatus: 200,
      responseSchema: schemas.InventoryItemSchema,
      setup: async function() {
        const inventory = await fetch(this.httpClient.baseUrl + '/api/inventory').then(r => r.json());
        if (inventory.length > 0) {
          inventoryId = inventory[0].id;
          this.path = `/api/inventory/${inventoryId}`;
        }
      },
      skipIf: () => !inventoryId
    },

    // Get individual analytics
    {
      name: 'Get Individual Analytics',
      method: 'GET',
      path: '/api/analytics/placeholder',
      expectedStatus: 200,
      responseSchema: schemas.AnalyticsSchema,
      setup: async function() {
        const analytics = await fetch(this.httpClient.baseUrl + '/api/analytics').then(r => r.json());
        if (analytics.length > 0) {
          analyticsId = analytics[0].id;
          this.path = `/api/analytics/${analyticsId}`;
        }
      },
      skipIf: () => !analyticsId
    }
  ];
}

/**
 * Create comprehensive error scenario tests
 */
export function createErrorScenarioTests(): ErrorScenarioTest[] {
  return [
    // 404 Not Found scenarios
    {
      name: 'Service Not Found',
      method: 'GET',
      path: '/api/services/nonexistent-id',
      expectedStatus: 404,
      expectedErrorPattern: /not found/i,
      description: 'Should return 404 for non-existent service'
    },

    {
      name: 'Staff Not Found',
      method: 'GET',
      path: '/api/staff/nonexistent-id',
      expectedStatus: 404,
      expectedErrorPattern: /not found/i,
      description: 'Should return 404 for non-existent staff member'
    },

    {
      name: 'Appointment Not Found',
      method: 'GET',
      path: '/api/appointments/nonexistent-id',
      expectedStatus: 404,
      expectedErrorPattern: /not found/i,
      description: 'Should return 404 for non-existent appointment'
    },

    {
      name: 'Inventory Item Not Found',
      method: 'GET',
      path: '/api/inventory/nonexistent-id',
      expectedStatus: 404,
      expectedErrorPattern: /not found/i,
      description: 'Should return 404 for non-existent inventory item'
    },

    {
      name: 'Analytics Not Found',
      method: 'GET',
      path: '/api/analytics/nonexistent-id',
      expectedStatus: 404,
      expectedErrorPattern: /not found/i,
      description: 'Should return 404 for non-existent analytics data'
    },

    {
      name: 'Campaign Not Found',
      method: 'PATCH',
      path: '/api/marketing/campaigns/nonexistent-id',
      requestBody: { status: 'active' },
      expectedStatus: 404,
      expectedErrorPattern: /not found/i,
      description: 'Should return 404 when updating non-existent campaign'
    },

    {
      name: 'Sale Not Found',
      method: 'DELETE',
      path: '/api/pos/sales/nonexistent-id',
      expectedStatus: 404,
      expectedErrorPattern: /not found/i,
      description: 'Should return 404 when deleting non-existent sale'
    },

    // 400 Bad Request scenarios
    {
      name: 'Invalid Date Format',
      method: 'GET',
      path: '/api/appointments?date=invalid-date',
      expectedStatus: 400,
      expectedErrorPattern: /invalid date/i,
      description: 'Should return 400 for invalid date format'
    },

    {
      name: 'Missing Required Fields - Campaign',
      method: 'POST',
      path: '/api/marketing/campaigns',
      requestBody: {
        description: 'Missing name field'
      },
      expectedStatus: 400,
      expectedErrorPattern: /name.*required/i,
      description: 'Should return 400 when required campaign name is missing'
    },

    {
      name: 'Missing Required Fields - Sale',
      method: 'POST',
      path: '/api/pos/sales',
      requestBody: {
        // Missing items array
        discountPct: 10
      },
      expectedStatus: 400,
      expectedErrorPattern: /items.*required|no items/i,
      description: 'Should return 400 when sale items are missing'
    },

    {
      name: 'Empty Items Array - Sale',
      method: 'POST',
      path: '/api/pos/sales',
      requestBody: {
        items: [], // Empty array
        discountPct: 10
      },
      expectedStatus: 400,
      expectedErrorPattern: /no items/i,
      description: 'Should return 400 when sale items array is empty'
    },

    {
      name: 'Missing Required Fields - Loyalty Entry',
      method: 'POST',
      path: '/api/loyalty/entries',
      requestBody: {
        points: 100
        // Missing customerId and type
      },
      expectedStatus: 400,
      expectedErrorPattern: /customerId.*required|type.*required/i,
      description: 'Should return 400 when loyalty entry required fields are missing'
    },

    // Invalid JSON scenarios
    {
      name: 'Invalid JSON - Campaign',
      method: 'POST',
      path: '/api/marketing/campaigns',
      requestBody: '{"invalid": json}', // This will be sent as string, not parsed
      expectedStatus: 400,
      description: 'Should return 400 for invalid JSON in campaign creation'
    },

    // Malicious input scenarios
    {
      name: 'XSS Attempt in Campaign Name',
      method: 'POST',
      path: '/api/marketing/campaigns',
      requestBody: {
        name: '<script>alert("xss")</script>',
        description: 'XSS test',
        channel: 'email',
        status: 'draft'
      },
      expectedStatus: 200, // Should succeed but sanitize input
      description: 'Should handle XSS attempts in campaign name'
    },

    {
      name: 'SQL Injection Attempt in Date Filter',
      method: 'GET',
      path: "/api/appointments?date='; DROP TABLE appointments; --",
      expectedStatus: 400,
      description: 'Should reject SQL injection attempts in date parameter'
    },

    {
      name: 'Oversized Payload - Campaign',
      method: 'POST',
      path: '/api/marketing/campaigns',
      requestBody: {
        name: 'x'.repeat(10000), // 10KB name
        description: 'Test oversized payload',
        channel: 'email',
        status: 'draft'
      },
      expectedStatus: 400, // Should reject or handle gracefully
      description: 'Should handle oversized payloads appropriately'
    },

    // Nonexistent endpoint
    {
      name: 'Nonexistent Endpoint',
      method: 'GET',
      path: '/api/nonexistent-endpoint',
      expectedStatus: 404,
      description: 'Should return 404 for nonexistent endpoints'
    }
  ];
}