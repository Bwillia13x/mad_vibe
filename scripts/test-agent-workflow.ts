#!/usr/bin/env tsx
/**
 * Test Agent Workflow End-to-End
 * Tests real agent execution with SEC API, market data, and AI
 */

import { agentOrchestrator } from '../lib/agents/orchestrator'

async function testAgentWorkflow() {
  console.log('🤖 Testing Agent Workflow\n')

  // Create a test task
  console.log('1. Creating "Analyze 10-K" task for AAPL...')
  const task = await agentOrchestrator.createTask(
    1, // workspace ID
    'analyze-10k',
    { ticker: 'AAPL' }
  )

  console.log(`✅ Task created: ${task.id}`)
  console.log(`   Description: ${task.description}`)
  console.log(`   Steps: ${task.steps.length}\n`)

  // Listen for progress
  agentOrchestrator.on('step:started', ({ step }) => {
    console.log(`▶️  Step started: ${step.name}`)
  })

  agentOrchestrator.on('step:completed', ({ step }) => {
    console.log(`✅ Step completed: ${step.name}`)
    if (step.result) {
      console.log(`   Result:`, JSON.stringify(step.result, null, 2).slice(0, 200), '...')
    }
  })

  agentOrchestrator.on('step:failed', ({ step }) => {
    console.error(`❌ Step failed: ${step.name}`)
    console.error(`   Error: ${step.error}`)
  })

  agentOrchestrator.on('task:completed', (t) => {
    console.log(`\n✅ Task completed: ${t.id}`)
    console.log(`   Duration: ${(t.completedAt!.getTime() - t.startedAt!.getTime()) / 1000}s`)
  })

  agentOrchestrator.on('task:failed', (t) => {
    console.error(`\n❌ Task failed: ${t.id}`)
    console.error(`   Error: ${t.error}`)
  })

  // Start execution
  console.log('2. Starting task execution...\n')
  try {
    await agentOrchestrator.startTask(task.id)

    console.log('\n🎉 Agent workflow completed successfully!')
    console.log('\nFinal Results:')
    const completedTask = agentOrchestrator.getTask(task.id)

    completedTask?.steps.forEach((step, i) => {
      console.log(`\nStep ${i + 1}: ${step.name}`)
      console.log(`  Status: ${step.status}`)
      if (step.result) {
        console.log(`  Result keys:`, Object.keys(step.result))
      }
    })
  } catch (error) {
    console.error('\n❌ Agent workflow failed:', error)
    process.exit(1)
  }
}

// Run test
testAgentWorkflow()
  .then(() => {
    console.log('\n✅ Test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
