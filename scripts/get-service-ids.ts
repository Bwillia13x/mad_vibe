#!/usr/bin/env tsx
/**
 * Get actual service IDs from the running server
 */

import { TestHttpClient, startTestServer } from '../test/utils/test-environment.js'
import { loadTestConfig } from '../test/config/test-config.js'

async function getServiceIds(): Promise<void> {
  console.log('🔍 Getting actual service IDs from server...')

  const config = loadTestConfig()
  const testEnv = await startTestServer(config)

  try {
    const httpClient = new TestHttpClient(testEnv.baseUrl)

    // Get services
    const servicesResponse = await httpClient.get('/api/services')
    if (servicesResponse.ok) {
      const services = await servicesResponse.json()
      console.log('\n📋 Available Services:')
      services.forEach((service: any, index: number) => {
        console.log(`  ${index + 1}. ${service.name} (ID: ${service.id})`)
        console.log(`     Price: $${service.price}, Duration: ${service.duration}min`)
      })

      if (services.length > 0) {
        console.log(`\n💡 Use this service ID for load testing: ${services[0].id}`)
      }
    } else {
      console.log('❌ Failed to get services')
    }
  } finally {
    await testEnv.cleanup()
  }
}

getServiceIds().catch((error) => {
  console.error('Failed to get service IDs:', error)
  process.exit(1)
})
