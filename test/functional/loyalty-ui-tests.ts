/**
 * Loyalty System UI Testing Framework
 * Tests loyalty system UI components, accessibility, and user interactions
 */

import { Page } from 'playwright'

export interface LoyaltyUITestResult {
  testName: string
  status: 'pass' | 'fail'
  duration: number
  error?: string
  details?: any
}

export class LoyaltyUITestFramework {
  private page: Page
  private baseUrl: string

  constructor(page: Page, baseUrl: string) {
    this.page = page
    this.baseUrl = baseUrl
  }

  /**
   * Run all loyalty UI tests
   */
  async runAllTests(): Promise<LoyaltyUITestResult[]> {
    const results: LoyaltyUITestResult[] = []

    console.log('🧪 Running Loyalty System UI Tests...')

    // Test customer selection dropdown
    results.push(await this.testCustomerSelectionDropdown())

    // Test customer filter dropdown
    results.push(await this.testCustomerFilterDropdown())

    // Test entry type filter
    results.push(await this.testEntryTypeFilter())

    // Test customer sort functionality
    results.push(await this.testCustomerSort())

    // Test points input validation
    results.push(await this.testPointsInputValidation())

    // Test add points button accessibility
    results.push(await this.testAddPointsButtonAccessibility())

    // Test add reward button accessibility
    results.push(await this.testAddRewardButtonAccessibility())

    // Test keyboard navigation
    results.push(await this.testKeyboardNavigation())

    // Test screen reader compatibility
    results.push(await this.testScreenReaderCompatibility())

    const passed = results.filter((r) => r.status === 'pass').length
    const failed = results.filter((r) => r.status === 'fail').length

    console.log(`✅ Loyalty UI Tests Complete: ${passed} passed, ${failed} failed`)

    return results
  }

  /**
   * Test customer selection dropdown for points addition
   */
  private async testCustomerSelectionDropdown(): Promise<LoyaltyUITestResult> {
    const testName = 'Customer Selection Dropdown'
    const startTime = Date.now()

    try {
      await this.page.goto(`${this.baseUrl}/loyalty`)
      await this.page.waitForSelector('[data-testid="heading-loyalty"]', { timeout: 10000 })

      // Test dropdown trigger accessibility
      const customerSelect = await this.page.locator('[data-testid="loyalty-customer-select"]')
      await expect(customerSelect).toBeVisible()

      // Check ARIA attributes
      const ariaLabel = await customerSelect.getAttribute('aria-label')
      if (!ariaLabel || !ariaLabel.includes('customer')) {
        throw new Error('Customer selection dropdown missing proper aria-label')
      }

      // Test dropdown functionality
      await customerSelect.click()
      await this.page.waitForSelector('[data-testid="customer-select-placeholder"]', {
        timeout: 5000
      })

      // Check if customer options are present
      const customerOptions = await this.page.locator('[data-testid^="customer-select-"]').count()
      if (customerOptions === 0) {
        throw new Error('No customer options found in dropdown')
      }

      // Test selecting a customer
      const firstCustomerOption = this.page
        .locator(
          '[data-testid^="customer-select-"]:not([data-testid="customer-select-placeholder"])'
        )
        .first()
      if ((await firstCustomerOption.count()) > 0) {
        await firstCustomerOption.click()

        // Verify selection worked
        const selectedValue = await customerSelect.inputValue()
        if (!selectedValue || selectedValue === 'all') {
          throw new Error('Customer selection did not work properly')
        }
      }

      return {
        testName,
        status: 'pass',
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        testName,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Test customer filter dropdown for entries
   */
  private async testCustomerFilterDropdown(): Promise<LoyaltyUITestResult> {
    const testName = 'Customer Filter Dropdown'
    const startTime = Date.now()

    try {
      const customerFilter = await this.page.locator('[data-testid="customer-filter-select"]')
      await expect(customerFilter).toBeVisible()

      // Check ARIA attributes
      const ariaLabel = await customerFilter.getAttribute('aria-label')
      if (!ariaLabel || !ariaLabel.includes('Filter')) {
        throw new Error('Customer filter dropdown missing proper aria-label')
      }

      // Test filter functionality
      await customerFilter.click()
      await this.page.waitForSelector('[data-testid="customer-filter-all"]', { timeout: 5000 })

      // Test selecting "All Customers"
      await this.page.locator('[data-testid="customer-filter-all"]').click()

      return {
        testName,
        status: 'pass',
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        testName,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Test entry type filter dropdown
   */
  private async testEntryTypeFilter(): Promise<LoyaltyUITestResult> {
    const testName = 'Entry Type Filter'
    const startTime = Date.now()

    try {
      const typeFilter = await this.page.locator('[data-testid="entry-type-filter"]')
      await expect(typeFilter).toBeVisible()

      // Check ARIA attributes
      const ariaLabel = await typeFilter.getAttribute('aria-label')
      if (!ariaLabel || !ariaLabel.includes('type')) {
        throw new Error('Entry type filter missing proper aria-label')
      }

      // Test filter options
      await typeFilter.click()
      await this.page.waitForSelector('[data-testid="type-filter-all"]', { timeout: 5000 })

      // Check all filter options exist
      await expect(this.page.locator('[data-testid="type-filter-all"]')).toBeVisible()
      await expect(this.page.locator('[data-testid="type-filter-points"]')).toBeVisible()
      await expect(this.page.locator('[data-testid="type-filter-reward"]')).toBeVisible()

      // Test selecting points filter
      await this.page.locator('[data-testid="type-filter-points"]').click()

      return {
        testName,
        status: 'pass',
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        testName,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Test customer sort functionality
   */
  private async testCustomerSort(): Promise<LoyaltyUITestResult> {
    const testName = 'Customer Sort'
    const startTime = Date.now()

    try {
      const sortSelect = await this.page.locator('[data-testid="customer-sort"]')
      await expect(sortSelect).toBeVisible()

      // Check ARIA attributes
      const ariaLabel = await sortSelect.getAttribute('aria-label')
      if (!ariaLabel || !ariaLabel.includes('Sort')) {
        throw new Error('Customer sort dropdown missing proper aria-label')
      }

      // Test sort options
      await sortSelect.click()
      await this.page.waitForSelector('[data-testid="sort-by-name"]', { timeout: 5000 })

      // Check sort options exist
      await expect(this.page.locator('[data-testid="sort-by-name"]')).toBeVisible()
      await expect(this.page.locator('[data-testid="sort-by-points"]')).toBeVisible()

      // Test selecting points sort
      await this.page.locator('[data-testid="sort-by-points"]').click()

      return {
        testName,
        status: 'pass',
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        testName,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Test points input validation
   */
  private async testPointsInputValidation(): Promise<LoyaltyUITestResult> {
    const testName = 'Points Input Validation'
    const startTime = Date.now()

    try {
      const pointsInput = await this.page.locator('[data-testid="loyalty-points-input"]')
      await expect(pointsInput).toBeVisible()

      // Check input attributes
      const ariaLabel = await pointsInput.getAttribute('aria-label')
      if (!ariaLabel || !ariaLabel.includes('points')) {
        throw new Error('Points input missing proper aria-label')
      }

      const minValue = await pointsInput.getAttribute('min')
      const maxValue = await pointsInput.getAttribute('max')
      if (minValue !== '1' || maxValue !== '10000') {
        throw new Error('Points input missing proper min/max validation')
      }

      // Test input validation
      await pointsInput.fill('0')
      const addButton = this.page.locator('[data-testid="loyalty-add-points-button"]')
      const isDisabled = await addButton.isDisabled()
      if (!isDisabled) {
        throw new Error('Add button should be disabled for invalid points')
      }

      // Test valid input
      await pointsInput.fill('100')
      // Button should still be disabled if no customer selected
      const stillDisabled = await addButton.isDisabled()
      if (!stillDisabled) {
        throw new Error('Add button should be disabled when no customer selected')
      }

      return {
        testName,
        status: 'pass',
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        testName,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Test add points button accessibility
   */
  private async testAddPointsButtonAccessibility(): Promise<LoyaltyUITestResult> {
    const testName = 'Add Points Button Accessibility'
    const startTime = Date.now()

    try {
      const addButton = await this.page.locator('[data-testid="loyalty-add-points-button"]')
      await expect(addButton).toBeVisible()

      // Check ARIA attributes
      const ariaLabel = await addButton.getAttribute('aria-label')
      if (!ariaLabel || !ariaLabel.includes('Add points')) {
        throw new Error('Add points button missing proper aria-label')
      }

      // Check button is properly disabled when no customer/points
      const isDisabled = await addButton.isDisabled()
      if (!isDisabled) {
        throw new Error('Add points button should be disabled initially')
      }

      return {
        testName,
        status: 'pass',
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        testName,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Test add reward button accessibility
   */
  private async testAddRewardButtonAccessibility(): Promise<LoyaltyUITestResult> {
    const testName = 'Add Reward Button Accessibility'
    const startTime = Date.now()

    try {
      // Find first add reward button
      const addRewardButton = await this.page.locator('[data-testid^="add-reward-"]').first()

      if ((await addRewardButton.count()) > 0) {
        await expect(addRewardButton).toBeVisible()

        // Check ARIA attributes
        const ariaLabel = await addRewardButton.getAttribute('aria-label')
        if (!ariaLabel || !ariaLabel.includes('Add reward')) {
          throw new Error('Add reward button missing proper aria-label')
        }
      }

      return {
        testName,
        status: 'pass',
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        testName,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Test keyboard navigation
   */
  private async testKeyboardNavigation(): Promise<LoyaltyUITestResult> {
    const testName = 'Keyboard Navigation'
    const startTime = Date.now()

    try {
      // Test tab navigation through key elements
      await this.page.keyboard.press('Tab')
      await this.page.keyboard.press('Tab')

      // Test Enter key on dropdown
      const customerSelect = this.page.locator('[data-testid="loyalty-customer-select"]')
      await customerSelect.focus()
      await this.page.keyboard.press('Enter')

      // Test Escape key to close dropdown
      await this.page.keyboard.press('Escape')

      return {
        testName,
        status: 'pass',
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        testName,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Test screen reader compatibility
   */
  private async testScreenReaderCompatibility(): Promise<LoyaltyUITestResult> {
    const testName = 'Screen Reader Compatibility'
    const startTime = Date.now()

    try {
      // Check for proper heading structure
      const heading = await this.page.locator('[data-testid="heading-loyalty"]')
      const tagName = await heading.evaluate((el) => el.tagName)
      if (tagName !== 'H1') {
        throw new Error('Main heading should be H1 for screen readers')
      }

      // Check for proper form labels
      const pointsInput = this.page.locator('[data-testid="loyalty-points-input"]')
      const hasAriaLabel = await pointsInput.getAttribute('aria-label')
      if (!hasAriaLabel) {
        throw new Error('Points input missing aria-label for screen readers')
      }

      return {
        testName,
        status: 'pass',
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        testName,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Helper method to wait for element
   */
  private async waitForElement(selector: string, timeout: number = 5000): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout })
      return true
    } catch {
      return false
    }
  }
}

// Helper function to expect (for compatibility)
async function expect(locator: any) {
  return {
    toBeVisible: async () => {
      const isVisible = await locator.isVisible()
      if (!isVisible) {
        throw new Error(`Element not visible: ${locator}`)
      }
    }
  }
}
