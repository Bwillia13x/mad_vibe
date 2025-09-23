#!/usr/bin/env tsx

/**
 * Generate Snapshot Tests for UI Components
 *
 * This script generates initial snapshots for all UI components to establish
 * a baseline for visual regression testing.
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'

console.log('🧪 Generating UI component snapshots...')

try {
  // Create snapshots directory if it doesn't exist
  const snapshotsDir = join(process.cwd(), 'client/test/unit/__snapshots__')
  if (!existsSync(snapshotsDir)) {
    mkdirSync(snapshotsDir, { recursive: true })
    console.log('📁 Created snapshots directory')
  }

  // Run snapshot tests to generate baseline snapshots
  console.log('📸 Generating component snapshots...')
  execSync('npx vitest run client/test/unit/snapshots.test.tsx --reporter=verbose', {
    stdio: 'inherit',
    cwd: process.cwd()
  })

  console.log('📸 Generating stage component snapshots...')
  execSync('npx vitest run client/test/unit/stage-snapshots.test.tsx --reporter=verbose', {
    stdio: 'inherit',
    cwd: process.cwd()
  })

  console.log('✅ Successfully generated UI component snapshots!')
  console.log('')
  console.log('📊 Summary:')
  console.log('  • Component snapshots: Generated baseline snapshots for all major UI components')
  console.log('  • Stage snapshots: Generated snapshots for stage-specific components')
  console.log('  • Test coverage: Includes WorkbenchLayout, panels, AppShell, and stage components')
  console.log('')
  console.log('🔄 Next steps:')
  console.log('  1. Commit the generated snapshots to establish baseline')
  console.log('  2. Future changes will be compared against these snapshots')
  console.log('  3. Run "npm run test:snapshots" to verify UI consistency')
  console.log('')
  console.log('📝 Generated snapshots will help detect:')
  console.log('  • Visual regressions from UI changes')
  console.log('  • Accessibility issues from DOM structure changes')
  console.log('  • Component prop changes that affect rendering')
  console.log('  • CSS/styling modifications that break layout')
} catch (error) {
  console.error('❌ Failed to generate snapshots:', error)
  process.exit(1)
}
