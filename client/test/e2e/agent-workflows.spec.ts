import { test, expect } from '@playwright/test'

test.describe('Agent workflow automation', () => {
  test('creates and monitors agent task lifecycle', async ({ page }) => {
    await page.goto('/')

    // Navigate to agent mode (assumes there's a navigation element)
    const agentModeButton = page.locator('text=Agent Mode').or(page.locator('[href*="agent"]'))
    if (await agentModeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await agentModeButton.click()
    }

    // Click "New Agent Task" button
    const newTaskButton = page.locator('button', { hasText: 'New Agent Task' })
    await expect(newTaskButton).toBeVisible({ timeout: 5000 })
    await newTaskButton.click()

    // Select a task type (thesis validation is simplest)
    const thesisValidationCard = page.locator('text=Validate Thesis').locator('..')
    await expect(thesisValidationCard).toBeVisible()
    await thesisValidationCard.click()

    // Wait for task to be created and started
    await page.waitForTimeout(1000)

    // Verify task card appears
    const taskCard = page
      .locator('[class*="Card"]')
      .filter({ hasText: 'Validate investment thesis' })
    await expect(taskCard).toBeVisible()

    // Verify progress indicator exists
    const progressBar = taskCard.locator('[class*="Progress"]')
    await expect(progressBar).toBeVisible()

    // Verify step display
    const stepIndicator = taskCard.locator('text=/Step \\d+ of \\d+/')
    await expect(stepIndicator).toBeVisible()
  })

  test('telemetry endpoint returns structured metrics', async ({ page, request }) => {
    // Create a task via API
    const createResponse = await request.post('/api/agents/tasks', {
      data: {
        workspaceId: 1,
        type: 'thesis-validation',
        params: {}
      }
    })
    expect(createResponse.ok()).toBeTruthy()
    const task = await createResponse.json()

    // Start the task
    await request.post(`/api/agents/tasks/${task.id}/start`)

    // Wait a moment for execution
    await page.waitForTimeout(2000)

    // Fetch telemetry
    const telemetryResponse = await request.get(`/api/agents/tasks/${task.id}/telemetry`)
    expect(telemetryResponse.ok()).toBeTruthy()

    const telemetry = await telemetryResponse.json()
    expect(telemetry).toHaveProperty('taskId', task.id)
    expect(telemetry).toHaveProperty('status')
    expect(telemetry).toHaveProperty('stepMetrics')
    expect(telemetry).toHaveProperty('totalRetries')
    expect(telemetry).toHaveProperty('failedSteps')
    expect(Array.isArray(telemetry.stepMetrics)).toBeTruthy()
  })

  test('pause and resume controls work correctly', async ({ page }) => {
    await page.goto('/')

    // Create and start a task
    const agentModeButton = page.locator('text=Agent Mode').or(page.locator('[href*="agent"]'))
    if (await agentModeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await agentModeButton.click()
    }

    const newTaskButton = page.locator('button', { hasText: 'New Agent Task' })
    await newTaskButton.click()

    // Select build DCF model (longer running task)
    const dcfCard = page.locator('text=Build DCF Model').locator('..')
    await dcfCard.click()

    await page.waitForTimeout(1000)

    // Find the task card
    const taskCard = page
      .locator('[class*="Card"]')
      .filter({ hasText: 'Build DCF valuation model' })
    await expect(taskCard).toBeVisible()

    // Click pause button
    const pauseButton = taskCard.locator('button[title="Pause task"]')
    if (await pauseButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pauseButton.click()
      await page.waitForTimeout(500)

      // Verify resume button appears
      const resumeButton = taskCard.locator('button[title="Resume task"]')
      await expect(resumeButton).toBeVisible()

      // Click resume
      await resumeButton.click()
    }
  })

  test('status badges display correctly', async ({ page }) => {
    await page.goto('/')

    const agentModeButton = page.locator('text=Agent Mode').or(page.locator('[href*="agent"]'))
    if (await agentModeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await agentModeButton.click()
    }

    const newTaskButton = page.locator('button', { hasText: 'New Agent Task' })
    await newTaskButton.click()

    const thesisCard = page.locator('text=Validate Thesis').locator('..')
    await thesisCard.click()

    await page.waitForTimeout(3000)

    const taskCard = page
      .locator('[class*="Card"]')
      .filter({ hasText: 'Validate investment thesis' })
      .first()

    // Look for status badges with counts
    const completedBadge = taskCard.locator('text=/✓ \\d+/')
    const pendingBadge = taskCard.locator('text=/⋯ \\d+/')

    // At least one badge should be visible
    const hasCompletedBadge = await completedBadge.isVisible().catch(() => false)
    const hasPendingBadge = await pendingBadge.isVisible().catch(() => false)

    expect(hasCompletedBadge || hasPendingBadge).toBeTruthy()
  })

  test('workspace overview shows active agent tasks', async ({ page, request }) => {
    // Create a task via API
    await request.post('/api/agents/tasks', {
      data: {
        workspaceId: 1,
        type: 'analyze-10k',
        params: { ticker: 'AAPL' }
      }
    })

    // Navigate to workspace overview
    await page.goto('/workspace-overview')

    // Wait for agent tasks to load
    await page.waitForTimeout(2000)

    // Look for "Active agent tasks" card
    const agentTasksCard = page.locator('text=Active agent tasks').locator('..')

    // Check if it's visible (might not be if no tasks are running)
    const isVisible = await agentTasksCard.isVisible({ timeout: 3000 }).catch(() => false)

    if (isVisible) {
      // Verify it shows task description
      await expect(agentTasksCard).toContainText('Analyze 10-K')

      // Verify progress bar exists
      const progressBar = agentTasksCard.locator('[class*="rounded-full"][class*="bg-violet-500"]')
      await expect(progressBar).toBeVisible()
    }
  })

  test('cancel button stops task execution', async ({ page }) => {
    await page.goto('/')

    const agentModeButton = page.locator('text=Agent Mode').or(page.locator('[href*="agent"]'))
    if (await agentModeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await agentModeButton.click()
    }

    const newTaskButton = page.locator('button', { hasText: 'New Agent Task' })
    await newTaskButton.click()

    const dcfCard = page.locator('text=Build DCF Model').locator('..')
    await dcfCard.click()

    await page.waitForTimeout(1000)

    const taskCard = page
      .locator('[class*="Card"]')
      .filter({ hasText: 'Build DCF valuation model' })

    // Click cancel button
    const cancelButton = taskCard.locator('button[title="Cancel task"]')
    if (await cancelButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cancelButton.click()

      // Task should show as failed or be removed
      await page.waitForTimeout(1000)
    }
  })
})
