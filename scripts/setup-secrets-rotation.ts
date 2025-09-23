#!/usr/bin/env tsx

/**
 * Secrets Rotation Setup Script
 *
 * This script demonstrates how to configure automatic secrets rotation
 * for production environments.
 */

import { configManager, configureRotation } from '../lib/config-manager'
import { log } from '../lib/log'

async function setupSecretsRotation() {
  console.log('🔄 Setting up secrets rotation...\n')

  try {
    // Configure admin token rotation (weekly)
    console.log('⚙️  Configuring ADMIN_TOKEN rotation...')
    configureRotation({
      key: 'ADMIN_TOKEN',
      rotationIntervalHours: 24 * 7, // Weekly
      rotationCallback: async (_newToken) => {
        console.log('🔑 Admin token rotated successfully')
        // In production, you would update external systems here
        // await updateLoadBalancerConfig(newToken);
        // await updateMonitoringSystem(newToken);
        log('Admin token rotated', { timestamp: new Date().toISOString() })
      }
    })

    // Configure API key rotation (monthly)
    console.log('⚙️  Configuring OPENAI_API_KEY rotation...')
    configureRotation({
      key: 'OPENAI_API_KEY',
      rotationIntervalHours: 24 * 30, // Monthly
      rotationCallback: async (_newKey) => {
        console.log('🔑 OpenAI API key rotated successfully')
        // In production, you would update the OpenAI client here
        // await reinitializeOpenAIClient(newKey);
        log('OpenAI API key rotated', { timestamp: new Date().toISOString() })
      }
    })

    // Display rotation status
    console.log('\n📊 Rotation Status:')
    const rotationStatus = configManager.getRotationStatus()

    for (const [key, config] of Object.entries(rotationStatus)) {
      console.log(`  🔄 ${key}:`)
      console.log(`    - Interval: ${config.rotationIntervalHours} hours`)
      console.log(`    - Next rotation: ${config.nextRotation}`)
      console.log(`    - Last rotated: ${config.lastRotated || 'Never'}`)
    }

    // Test rotation (for demonstration)
    if (process.argv.includes('--test-rotation')) {
      console.log('\n🧪 Testing rotation (demo mode)...')

      // This would normally be done automatically by the scheduler
      await configManager.checkSecretRotations()

      console.log('✅ Rotation test completed')
    }

    console.log('\n✅ Secrets rotation setup completed successfully!')
    console.log('\n💡 Next steps:')
    console.log('  1. Verify rotation callbacks work with your infrastructure')
    console.log('  2. Test rotation in staging environment')
    console.log('  3. Monitor rotation logs in production')
    console.log('  4. Set up alerts for rotation failures')
  } catch (error) {
    console.error('❌ Secrets rotation setup failed:', error)
    process.exit(1)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const help = args.includes('--help') || args.includes('-h')

  if (help) {
    console.log(`
Secrets Rotation Setup Script

Usage: tsx scripts/setup-secrets-rotation.ts [options]

Options:
  --test-rotation  Test the rotation mechanism (demo mode)
  --help, -h       Show this help message

Examples:
  tsx scripts/setup-secrets-rotation.ts
  tsx scripts/setup-secrets-rotation.ts --test-rotation

Note: This script configures automatic rotation schedules.
In production, ensure rotation callbacks are properly implemented.
`)
    process.exit(0)
  }

  await setupSecretsRotation()
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
