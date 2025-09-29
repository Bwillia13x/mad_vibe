#!/usr/bin/env tsx
/**
 * Get actual service IDs from the running server
 */

import { TestHttpClient, startTestServer } from '../test/utils/test-environment.js'
import { loadTestConfig } from '../test/config/test-config.js'

interface ServiceSummary {
  id: string
  name: string
  price?: number
  duration?: number
}

async function getServiceIds(): Promise<void> {
  console.log('🔍 Getting actual service IDs from server...')

  const config = loadTestConfig()
  const testEnv = await startTestServer(config)

  try {
    const httpClient = new TestHttpClient(testEnv.baseUrl)

    // Get services
    const services = await httpClient.getJson<ServiceSummary[]>('/api/services')
    console.log('\n📋 Available Services:')
    services.forEach((service, index) => {
      const price = typeof service.price === 'number' ? `$${service.price}` : 'N/A'
      const duration = typeof service.duration === 'number' ? `${service.duration}min` : 'N/A'
      console.log(`  ${index + 1}. ${service.name} (ID: ${service.id})`)
      console.log(`     Price: ${price}, Duration: ${duration}`)
    })

    if (services.length > 0) {
      console.log(`\n💡 Use this service ID for load testing: ${services[0].id}`)
    }
  } finally {
    await testEnv.cleanup()
  }
}

getServiceIds().catch((error) => {
  console.error('Failed to get service IDs:', error)
  process.exit(1)
})
