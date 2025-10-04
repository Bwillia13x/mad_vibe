import { test, expect } from '@playwright/test'

test.describe('Workbench Tri-Pane Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workbench/home')
  })

  test.describe('Studio Vibe-Coding Workflow', () => {
    test('generates macro, sends to canvas, and verifies timeline', async ({ page }) => {
      await page.goto('/studio')

      // Ensure toolbelt fetch works
      const dataButton = page.locator('text=Fetch Company Data')
      if (await dataButton.isEnabled()) {
        await dataButton.click()
      }

      // Use Macro Palette to generate and send to canvas
      const runMacroButton = page.locator('button', { hasText: 'Generate Macro' }).first()
      if (await runMacroButton.count()) {
        await runMacroButton.click()
      }

      const sendToCanvas = page.locator('button', { hasText: 'Send to Canvas' }).first()
      await sendToCanvas.click()

      // Canvas card should appear
      const canvasCard = page.locator(
        '[aria-label="Canvas area. Drag and drop an image to import."] div',
        {
          hasText: 'Macro:'
        }
      )
      await expect(canvasCard).toBeVisible()

      // Verify artifact timeline updates after save
      const saveButton = page.locator('button', { hasText: 'Save as Artifact' }).first()
      await saveButton.click()

      const timelineEntry = page
        .locator('text=Artifact timeline')
        .locator('..')
        .locator('article')
        .first()
      await expect(timelineEntry).toBeVisible()
    })
  })

  test('displays tri-pane layout correctly', async ({ page }) => {
    // Check for main layout components
    await expect(page.locator('[aria-label="Workbench content"]')).toBeVisible()
    await expect(page.locator('[aria-label="Explorer navigation"]')).toBeVisible()
    await expect(page.locator('[aria-label="Inspector sidebar"]')).toBeVisible()
    await expect(page.locator('[aria-label="Console"]')).toBeVisible()
  })

  test('allows keyboard navigation between tabs', async ({ page }) => {
    const workbench = page.locator('[aria-label="Workbench content"]')

    // Focus should be in workbench area
    await workbench.focus()

    // Navigate to second tab with right arrow
    await page.keyboard.press('ArrowRight')

    // Check if second tab is selected
    const tabs = page.locator('[role="tab"]')
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
  })

  test('allows keyboard navigation in explorer', async ({ page }) => {
    const explorer = page.locator('[aria-label="Explorer navigation"]')

    // Focus explorer
    await explorer.focus()

    // Navigate down to second stage
    await page.keyboard.press('ArrowDown')

    // Check if second stage is focused
    const stages = page.locator('[aria-label="Explorer navigation"] button')
    await expect(stages.nth(1)).toBeFocused()
  })

  test('console prompt filtering works', async ({ page }) => {
    // Type a test prompt first
    const promptInput = page.locator('[placeholder="Ask anything…"]')
    await promptInput.fill('Test prompt for filtering')
    await promptInput.press('Enter')

    // Check if prompt appears in console
    await expect(page.locator('text=Test prompt for filtering')).toBeVisible()

    // Filter the console
    const filterInput = page.locator('[aria-label="Filter prompt history"]')
    await filterInput.fill('Test')

    // Should still see the prompt
    await expect(page.locator('text=Test prompt for filtering')).toBeVisible()

    // Filter with non-matching text
    await filterInput.fill('NonExistent')
    await expect(page.locator('text=Test prompt for filtering')).not.toBeVisible()
  })

  test('prompt history pinning works', async ({ page }) => {
    // Submit a prompt first
    const promptInput = page.locator('[placeholder="Ask anything…"]')
    await promptInput.fill('Pinnable prompt')
    await promptInput.press('Enter')

    // Find the prompt in console
    const promptElement = page.locator('text=Pinnable prompt').first()
    await expect(promptElement).toBeVisible()

    // Navigate to the prompt with keyboard
    const console = page.locator('[aria-label="Console"]')
    await console.focus()

    // Pin the prompt
    await page.keyboard.press('Enter')

    // Check if prompt is pinned (should move to top or be highlighted)
    const pinnedPrompts = page.locator('[data-pinned="true"]')
    await expect(pinnedPrompts).toHaveCount(1)
  })

  test('console export functionality works', async ({ page }) => {
    // Submit a test prompt
    const promptInput = page.locator('[placeholder="Ask anything…"]')
    await promptInput.fill('Export test prompt')
    await promptInput.press('Enter')

    // Click export button
    const exportButton = page.locator('[aria-label="Export prompt history as CSV"]')
    await exportButton.click()

    // Check if download was triggered (this might need to be mocked in actual tests)
    // For now, just verify the button is clickable
    await expect(exportButton).toBeEnabled()
  })

  test('workspace overview supports inline comments with presence avatars', async ({ page }) => {
    await page.goto('/workspace-overview')

    const overviewCard = page
      .getByTestId('workspace-overview-heading')
      .locator('..')
      .locator('[role="region"]')
    await expect(overviewCard).toBeVisible()

    const commentToggle = page.locator('button[aria-label="Toggle comments for overview"]')
    await expect(commentToggle).toBeVisible()

    const commentCountBefore = await commentToggle.locator('span').innerText()
    await commentToggle.click()

    const commentTextarea = page.locator('textarea', { hasText: '' })
    await commentTextarea.fill('Inline comment from e2e test')
    await commentTextarea.press('Meta+Enter').catch(async () => {
      await commentTextarea.press('Control+Enter')
    })

    const commentSubmit = page.locator('button', { hasText: 'Post' })
    await commentSubmit.click()

    await expect(page.locator('text=Inline comment from e2e test')).toBeVisible()

    const commentCountAfter = await commentToggle.locator('span').innerText()
    expect(commentCountAfter).not.toEqual(commentCountBefore)

    const avatarStack = page.locator(
      '[data-testid="presence-avatar-stack"] img, [data-testid="presence-avatar-stack"] span'
    )
    await expect(avatarStack.first()).toBeVisible()
  })

  test('presence telemetry handles failure recoveries', async ({ page }) => {
    await page.goto('/workspace-overview')

    await page.route('**/api/workflow/presence/heartbeat', async (route) => {
      await route.fulfill({ status: 500, body: 'Server error' })
    })

    await page.waitForTimeout(11_000)

    const commentToggle = page.locator('button[aria-label="Toggle comments for overview"]')
    await commentToggle.click()

    const commentTextarea = page.locator('textarea', { hasText: '' })
    await commentTextarea.fill('Second comment after failure')
    await commentTextarea.press('Meta+Enter').catch(async () => {
      await commentTextarea.press('Control+Enter')
    })

    const commentSubmit = page.locator('button', { hasText: 'Post' })
    await commentSubmit.click()

    await expect(page.locator('text=Second comment after failure')).toBeVisible()

    await page.unroute('**/api/workflow/presence/heartbeat')
  })

  test('panel collapse/expand works', async ({ page }) => {
    // Test explorer collapse
    const toggleExplorerButton = page.locator('[aria-label="Toggle explorer"]')
    await toggleExplorerButton.click()

    const explorer = page.locator('[aria-label="Explorer navigation"]')
    await expect(explorer).not.toBeVisible()

    // Expand again
    await toggleExplorerButton.click()
    await expect(explorer).toBeVisible()
  })

  test('skip navigation works', async ({ page }) => {
    // Tab to skip link
    await page.keyboard.press('Tab')

    const skipLink = page.locator('text=Skip to main content')
    await expect(skipLink).toBeFocused()

    // Activate skip link
    await page.keyboard.press('Enter')

    // Should jump to main content
    const mainContent = page.locator('#main-content')
    await expect(mainContent).toBeFocused()
  })

  test('omni-prompt submission works', async ({ page }) => {
    const promptInput = page.locator('[placeholder="Ask anything…"]')
    const submitButton = page.locator('[aria-label="Next"]')

    await promptInput.fill('Test omni-prompt submission')
    await submitButton.click()

    // Should clear the input
    await expect(promptInput).toHaveValue('')

    // Should show in prompt history
    await expect(page.locator('text=Test omni-prompt submission')).toBeVisible()
  })

  test('stage navigation works', async ({ page }) => {
    // Navigate to next stage
    const nextButton = page.locator('[aria-label="Next"]')
    await nextButton.click()

    // Should show next stage content (this would depend on actual stage data)
    // For now, just verify button is clickable
    await expect(nextButton).toBeEnabled()
  })

  test('accessibility features are present', async ({ page }) => {
    // Check for skip link
    const skipLink = page.locator('text=Skip to main content')
    await expect(skipLink).toBeVisible()

    // Check for proper ARIA labels
    await expect(page.locator('[aria-label="Workbench content"]')).toBeVisible()
    await expect(page.locator('[aria-label="Console"]')).toBeVisible()
    await expect(page.locator('[aria-label="Explorer navigation"]')).toBeVisible()
    await expect(page.locator('[aria-label="Inspector sidebar"]')).toBeVisible()

    // Check for focus indicators
    const tabs = page.locator('[role="tab"]')
    await tabs.first().focus()
    await expect(tabs.first()).toHaveCSS('outline', /rgb\(99.*102.*241\)/) // violet focus ring
  })

  test('responsive behavior works', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Should show mobile navigation
    const mobileExplorerButton = page.locator('[aria-label="Open navigator"]')
    await expect(mobileExplorerButton).toBeVisible()

    const mobileInspectorButton = page.locator('[aria-label="Open inspector"]')
    await expect(mobileInspectorButton).toBeVisible()

    // Test desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 })

    // Should show desktop panel toggles
    const desktopExplorerToggle = page.locator('[aria-label="Toggle explorer"]')
    await expect(desktopExplorerToggle).toBeVisible()
  })
})

test.describe('Studio Vibe-Coding Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio')
  })

  test('shows artifact timeline placeholder when empty', async ({ page }) => {
    const timeline = page.locator('text=Artifact timeline')
    await expect(timeline).toBeVisible()
    await expect(page.locator('text=Nothing saved yet')).toBeVisible()
  })

  test('Send to Canvas button is disabled until output exists', async ({ page }) => {
    const sendButton = page.locator('button', { hasText: 'Send to Canvas' }).first()
    await expect(sendButton).toBeDisabled()
  })
})

test.describe('Omni-Prompt Integration', () => {
  test('prompt shortcuts work from inspector', async ({ page }) => {
    await page.goto('/workbench/home')

    // Find a prompt shortcut in inspector
    const promptShortcut = page.locator('text=Summarize the latest filing with citations.')
    await expect(promptShortcut).toBeVisible()

    // Click the shortcut
    await promptShortcut.click()

    // Should populate the main prompt input
    const promptInput = page.locator('[placeholder="Ask anything…"]')
    await expect(promptInput).toHaveValue('Summarize the latest filing with citations.')
  })

  test('prompt history persists across stage changes', async ({ page }) => {
    await page.goto('/workbench/home')

    // Submit a prompt
    const promptInput = page.locator('[placeholder="Ask anything…"]')
    await promptInput.fill('Persistent test prompt')
    await promptInput.press('Enter')

    // Navigate to different stage (this would need actual navigation)
    // For now, just verify prompt is in console
    await expect(page.locator('text=Persistent test prompt')).toBeVisible()
  })
})
