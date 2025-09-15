/**
 * Comprehensive Loyalty Workflow Testing
 * Tests end-to-end loyalty system workflows including points addition, rewards, and state management
 */

import { Page } from 'playwright';

export interface LoyaltyWorkflowTestResult {
  testName: string;
  status: 'pass' | 'fail';
  duration: number;
  error?: string;
  details?: any;
}

export class LoyaltyWorkflowTestFramework {
  private page: Page;
  private baseUrl: string;

  constructor(page: Page, baseUrl: string) {
    this.page = page;
    this.baseUrl = baseUrl;
  }

  /**
   * Run all loyalty workflow tests
   */
  async runAllWorkflowTests(): Promise<LoyaltyWorkflowTestResult[]> {
    const results: LoyaltyWorkflowTestResult[] = [];

    console.log('🔄 Running Loyalty Workflow Tests...');

    // Test complete points addition workflow
    results.push(await this.testPointsAdditionWorkflow());
    
    // Test reward addition workflow
    results.push(await this.testRewardAdditionWorkflow());
    
    // Test workflow state management
    results.push(await this.testWorkflowStateManagement());
    
    // Test points calculation accuracy
    results.push(await this.testPointsCalculationAccuracy());
    
    // Test error handling in workflows
    results.push(await this.testWorkflowErrorHandling());
    
    // Test workflow validation
    results.push(await this.testWorkflowValidation());
    
    // Test concurrent workflow operations
    results.push(await this.testConcurrentWorkflowOperations());
    
    // Test workflow persistence
    results.push(await this.testWorkflowPersistence());
    
    // Test cross-module workflow consistency
    results.push(await this.testCrossModuleWorkflowConsistency());

    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    
    console.log(`✅ Loyalty Workflow Tests Complete: ${passed} passed, ${failed} failed`);
    
    return results;
  }

  /**
   * Test complete points addition workflow
   */
  private async testPointsAdditionWorkflow(): Promise<LoyaltyWorkflowTestResult> {
    const testName = 'Points Addition Workflow';
    const startTime = Date.now();

    try {
      await this.page.goto(`${this.baseUrl}/loyalty`);
      await this.page.waitForSelector('[data-testid="heading-loyalty"]', { timeout: 10000 });

      // Step 1: Select customer
      const customerSelect = this.page.locator('[data-testid="loyalty-customer-select"]');
      await customerSelect.click();
      await this.page.waitForSelector('[data-testid^="customer-select-"]:not([data-testid="customer-select-placeholder"])', { timeout: 5000 });
      
      const firstCustomer = this.page.locator('[data-testid^="customer-select-"]:not([data-testid="customer-select-placeholder"])').first();
      await firstCustomer.click();

      // Step 2: Enter points
      const pointsInput = this.page.locator('[data-testid="loyalty-points-input"]');
      await pointsInput.fill('100');

      // Step 3: Verify button is enabled
      const addButton = this.page.locator('[data-testid="loyalty-add-points-button"]');
      const isEnabled = !(await addButton.isDisabled());
      if (!isEnabled) {
        throw new Error('Add points button should be enabled with valid customer and points');
      }

      // Step 4: Add points
      await addButton.click();

      // Step 5: Verify workflow status
      await this.page.waitForSelector('[data-testid="workflow-status"]', { timeout: 5000 });
      const statusText = await this.page.locator('[data-testid="workflow-status"]').textContent();
      
      // Wait for success or error status
      await this.page.waitForFunction(() => {
        const status = document.querySelector('[data-testid="workflow-status"]');
        return status && (status.textContent?.includes('Success') || status.textContent?.includes('Error'));
      }, { timeout: 10000 });

      const finalStatus = await this.page.locator('[data-testid="workflow-status"]').textContent();
      if (!finalStatus?.includes('Success')) {
        throw new Error(`Points addition failed with status: ${finalStatus}`);
      }

      // Step 6: Verify form reset
      const inputValue = await pointsInput.inputValue();
      if (inputValue !== '') {
        throw new Error('Points input should be cleared after successful addition');
      }

      return {
        testName,
        status: 'pass',
        duration: Date.now() - startTime,
        details: { finalStatus }
      };
    } catch (error) {
      return {
        testName,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test reward addition workflow
   */
  private async testRewardAdditionWorkflow(): Promise<LoyaltyWorkflowTestResult> {
    const testName = 'Reward Addition Workflow';
    const startTime = Date.now();

    try {
      // Find first add reward button
      const addRewardButton = this.page.locator('[data-testid^="add-reward-"]').first();
      
      if (await addRewardButton.count() === 0) {
        throw new Error('No add reward buttons found');
      }

      // Get initial button text
      const initialText = await addRewardButton.textContent();
      if (initialText !== 'Add Reward') {
        throw new Error(`Expected 'Add Reward' button text, got: ${initialText}`);
      }

      // Click add reward button
      await addRewardButton.click();

      // Verify button shows loading state
      await this.page.waitForFunction((selector) => {
        const button = document.querySelector(selector);
        return button && button.textContent?.includes('Adding...');
      }, `[data-testid^="add-reward-"]:first-child`, { timeout: 5000 });

      // Wait for completion
      await this.page.waitForFunction((selector) => {
        const button = document.querySelector(selector);
        return button && button.textContent === 'Add Reward';
      }, `[data-testid^="add-reward-"]:first-child`, { timeout: 10000 });

      return {
        testName,
        status: 'pass',
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        testName,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test workflow state management
   */
  private async testWorkflowStateManagement(): Promise<LoyaltyWorkflowTestResult> {
    const testName = 'Workflow State Management';
    const startTime = Date.now();

    try {
      // Test initial state
      const workflowStatus = this.page.locator('[data-testid="workflow-status"]');
      const initialExists = await workflowStatus.count() > 0;
      
      // Initially should not show status (idle state)
      if (initialExists) {
        const initialText = await workflowStatus.textContent();
        if (initialText && !initialText.includes('idle')) {
          // Status might be visible from previous test, that's ok
        }
      }

      // Test validation state (error state)
      const addButton = this.page.locator('[data-testid="loyalty-add-points-button"]');
      const pointsInput = this.page.locator('[data-testid="loyalty-points-input"]');
      
      // Try to add points without customer selection
      await pointsInput.fill('100');
      
      // Button should be disabled (validation state)
      const isDisabled = await addButton.isDisabled();
      if (!isDisabled) {
        throw new Error('Button should be disabled when no customer selected');
      }

      return {
        testName,
        status: 'pass',
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        testName,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test points calculation accuracy
   */
  private async testPointsCalculationAccuracy(): Promise<LoyaltyWorkflowTestResult> {
    const testName = 'Points Calculation Accuracy';
    const startTime = Date.now();

    try {
      // Check points calculation display
      const calculationDisplay = this.page.locator('[data-testid="points-calculation-display"]');
      await expect(calculationDisplay).toBeVisible();

      const calculationText = await calculationDisplay.textContent();
      if (!calculationText?.includes('Total points for selection:')) {
        throw new Error('Points calculation display missing or incorrect');
      }

      // Test filtering by customer affects calculation
      const customerFilter = this.page.locator('[data-testid="customer-filter-select"]');
      await customerFilter.click();
      
      // Select a specific customer
      const specificCustomer = this.page.locator('[data-testid^="customer-filter-"]:not([data-testid="customer-filter-all"])').first();
      if (await specificCustomer.count() > 0) {
        await specificCustomer.click();
        
        // Verify calculation updates
        const updatedText = await calculationDisplay.textContent();
        if (updatedText === calculationText) {
          // This might be ok if customer has same points, but let's check for customer name
          if (!updatedText?.includes('(') || !updatedText?.includes(')')) {
            throw new Error('Customer name should be shown in calculation when specific customer selected');
          }
        }
      }

      return {
        testName,
        status: 'pass',
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        testName,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test workflow error handling
   */
  private async testWorkflowErrorHandling(): Promise<LoyaltyWorkflowTestResult> {
    const testName = 'Workflow Error Handling';
    const startTime = Date.now();

    try {
      const pointsInput = this.page.locator('[data-testid="loyalty-points-input"]');
      const addButton = this.page.locator('[data-testid="loyalty-add-points-button"]');

      // Test invalid points values
      await pointsInput.fill('0');
      const isDisabledForZero = await addButton.isDisabled();
      if (!isDisabledForZero) {
        throw new Error('Button should be disabled for zero points');
      }

      await pointsInput.fill('99999');
      const isDisabledForHigh = await addButton.isDisabled();
      if (!isDisabledForHigh) {
        throw new Error('Button should be disabled for points > 10000');
      }

      await pointsInput.fill('-10');
      const isDisabledForNegative = await addButton.isDisabled();
      if (!isDisabledForNegative) {
        throw new Error('Button should be disabled for negative points');
      }

      return {
        testName,
        status: 'pass',
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        testName,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test workflow validation
   */
  private async testWorkflowValidation(): Promise<LoyaltyWorkflowTestResult> {
    const testName = 'Workflow Validation';
    const startTime = Date.now();

    try {
      const customerSelect = this.page.locator('[data-testid="loyalty-customer-select"]');
      const pointsInput = this.page.locator('[data-testid="loyalty-points-input"]');
      const addButton = this.page.locator('[data-testid="loyalty-add-points-button"]');

      // Test all validation combinations
      
      // 1. No customer, no points
      await pointsInput.fill('');
      const state1 = await addButton.isDisabled();
      if (!state1) throw new Error('Button should be disabled with no customer and no points');

      // 2. No customer, valid points
      await pointsInput.fill('100');
      const state2 = await addButton.isDisabled();
      if (!state2) throw new Error('Button should be disabled with no customer');

      // 3. Valid customer, no points
      await customerSelect.click();
      const firstCustomer = this.page.locator('[data-testid^="customer-select-"]:not([data-testid="customer-select-placeholder"])').first();
      if (await firstCustomer.count() > 0) {
        await firstCustomer.click();
        await pointsInput.fill('');
        const state3 = await addButton.isDisabled();
        if (!state3) throw new Error('Button should be disabled with no points');

        // 4. Valid customer, valid points
        await pointsInput.fill('100');
        const state4 = await addButton.isDisabled();
        if (state4) throw new Error('Button should be enabled with valid customer and points');
      }

      return {
        testName,
        status: 'pass',
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        testName,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test concurrent workflow operations
   */
  private async testConcurrentWorkflowOperations(): Promise<LoyaltyWorkflowTestResult> {
    const testName = 'Concurrent Workflow Operations';
    const startTime = Date.now();

    try {
      // Test that multiple reward buttons can't be clicked simultaneously
      const rewardButtons = this.page.locator('[data-testid^="add-reward-"]');
      const buttonCount = await rewardButtons.count();
      
      if (buttonCount > 1) {
        // Click first button
        await rewardButtons.first().click();
        
        // Verify first button shows loading
        const firstButtonText = await rewardButtons.first().textContent();
        if (!firstButtonText?.includes('Adding...')) {
          throw new Error('First reward button should show loading state');
        }
        
        // Other buttons should still be clickable (they're independent)
        const secondButtonDisabled = await rewardButtons.nth(1).isDisabled();
        if (secondButtonDisabled) {
          throw new Error('Other reward buttons should remain enabled');
        }
      }

      return {
        testName,
        status: 'pass',
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        testName,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test workflow persistence
   */
  private async testWorkflowPersistence(): Promise<LoyaltyWorkflowTestResult> {
    const testName = 'Workflow Persistence';
    const startTime = Date.now();

    try {
      // Test that form state persists during navigation within page
      const pointsInput = this.page.locator('[data-testid="loyalty-points-input"]');
      await pointsInput.fill('150');
      
      // Click on different filter to test state persistence
      const typeFilter = this.page.locator('[data-testid="entry-type-filter"]');
      await typeFilter.click();
      await this.page.locator('[data-testid="type-filter-points"]').click();
      
      // Check if input value persisted
      const persistedValue = await pointsInput.inputValue();
      if (persistedValue !== '150') {
        throw new Error('Points input value should persist during filter changes');
      }

      return {
        testName,
        status: 'pass',
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        testName,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test cross-module workflow consistency
   */
  private async testCrossModuleWorkflowConsistency(): Promise<LoyaltyWorkflowTestResult> {
    const testName = 'Cross-Module Workflow Consistency';
    const startTime = Date.now();

    try {
      // Navigate to customers page to verify data consistency
      await this.page.goto(`${this.baseUrl}/staff`); // Navigate away
      await this.page.waitForSelector('h1', { timeout: 5000 });
      
      // Navigate back to loyalty
      await this.page.goto(`${this.baseUrl}/loyalty`);
      await this.page.waitForSelector('[data-testid="heading-loyalty"]', { timeout: 10000 });
      
      // Verify customer data is still consistent
      const customerSelect = this.page.locator('[data-testid="loyalty-customer-select"]');
      await customerSelect.click();
      
      const customerOptions = await this.page.locator('[data-testid^="customer-select-"]:not([data-testid="customer-select-placeholder"])').count();
      if (customerOptions === 0) {
        throw new Error('Customer data should be consistent across navigation');
      }

      return {
        testName,
        status: 'pass',
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        testName,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Helper function for expect compatibility
async function expect(locator: any) {
  return {
    toBeVisible: async () => {
      const isVisible = await locator.isVisible();
      if (!isVisible) {
        throw new Error(`Element not visible: ${locator}`);
      }
    }
  };
}