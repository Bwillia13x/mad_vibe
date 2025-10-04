#!/usr/bin/env tsx
/**
 * Setup script for workspace feature
 * Run this after implementing the workspace feature to:
 * 1. Ensure database tables are created
 * 2. Create a default user if needed
 * 3. Seed initial workspace for testing
 */

import { db } from '../lib/db'
import { workflowUsers, workflows } from '../lib/db/schema'
import { eq } from 'drizzle-orm'

async function setupWorkspaces() {
  console.log('🚀 Setting up workspace feature...\n')

  try {
    // Check if we can connect to database
    console.log('1. Checking database connection...')
    try {
      await db.select().from(workflowUsers).limit(1)
      console.log('   ✅ Database connected\n')
    } catch (err) {
      console.error('   ❌ Database connection failed')
      console.error('   Make sure DATABASE_URL is set in .env')
      console.error('   Run: npm run db:push\n')
      process.exit(1)
    }

    // Check if default user exists
    console.log('2. Checking for default user...')
    const users = await db.select().from(workflowUsers).where(eq(workflowUsers.id, 1))

    if (users.length === 0) {
      console.log('   Creating default user...')
      await db.insert(workflowUsers).values({
        username: 'demo_user',
        role: 'analyst'
      })
      console.log('   ✅ Default user created (ID: 1)\n')
    } else {
      console.log('   ✅ Default user exists\n')
    }

    // Check for existing workspaces
    console.log('3. Checking for workspaces...')
    const workspaces = await db.select().from(workflows).where(eq(workflows.userId, 1))

    if (workspaces.length === 0) {
      console.log('   Creating sample workspace...')
      const [newWorkspace] = await db
        .insert(workflows)
        .values({
          userId: 1,
          name: 'Apple Deep Dive',
          ticker: 'AAPL',
          companyName: 'Apple Inc.',
          description: 'Sample workspace for testing',
          status: 'active',
          lastActiveStage: 'home',
          stageCompletions: {},
          settings: {
            defaultWACC: 0.08,
            taxRate: 0.21
          },
          tags: ['tech', 'FAANG']
        })
        .returning()

      console.log(`   ✅ Sample workspace created (ID: ${newWorkspace.id})\n`)
    } else {
      console.log(`   ✅ Found ${workspaces.length} existing workspace(s)\n`)
    }

    // Print summary
    console.log('🎉 Setup complete!\n')
    console.log('Next steps:')
    console.log('  1. Start the dev server: npm run dev')
    console.log('  2. Open http://localhost:5000')
    console.log('  3. You should see workspace tabs at the top')
    console.log('  4. Press Cmd+T to create a new workspace\n')
    console.log('API endpoints available:')
    console.log('  GET  /api/workspaces           - List workspaces')
    console.log('  POST /api/workspaces           - Create workspace')
    console.log('  GET  /api/workspaces/:id       - Get workspace')
    console.log('  PATCH /api/workspaces/:id      - Update workspace')
    console.log('  DELETE /api/workspaces/:id     - Delete workspace\n')
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

setupWorkspaces()
