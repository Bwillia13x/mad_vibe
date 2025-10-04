import { test, expect } from '@playwright/test'

const dashboardPages = {
  overview: {
    path: '/workspace-overview',
    headingTestId: 'workspace-overview-heading',
    headingText: 'Workspace overview'
  },
  performance: {
    path: '/performance-dashboard',
    headingTestId: 'heading-performance',
    headingText: 'Performance Dashboard'
  },
  audit: {
    path: '/ai-audit',
    headingTestId: 'heading-ai-audit',
    headingText: 'AI audit telemetry'
  }
} as const

test.describe('BI Dashboard navigation smoke', () => {
  test('deep links render expected dashboards', async ({ page }) => {
    for (const { path, headingTestId, headingText } of Object.values(dashboardPages)) {
      await page.goto(path)

      const heading = page.getByTestId(headingTestId)
      await expect(heading).toBeVisible()
      await expect(heading).toHaveText(headingText)
    }
  })

  test('workspace overview anchor links focus sections', async ({ page }) => {
    await page.goto('/workspace-overview#workspace-snapshots')

    const snapshotsCard = page.locator('#workspace-snapshots')
    await expect(snapshotsCard).toBeVisible()
    await expect(snapshotsCard).toHaveClass(/ring-violet-500/)
  })

  test('performance dashboard handles loading and retry states', async ({ page }) => {
    await page.route('/api/performance/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: null })
      })
    })

    await page.goto('/performance-dashboard')

    const emptyState = page.locator('text=No performance data available')
    await expect(emptyState).toBeVisible()

    await page.unroute('/api/performance/dashboard')
    await page.goto('/performance-dashboard')

    const heading = page.getByTestId('heading-performance')
    await expect(heading).toBeVisible()
  })
})
