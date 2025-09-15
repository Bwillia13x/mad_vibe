import puppeteer from 'puppeteer';
import type { TestEnvironment } from '../utils/test-environment';
import { TestReporter } from '../reporting/test-reporter';

export interface UserWorkflowResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  error?: string;
  screenshots?: string[];
  workflow: Array<{
    step: string;
    status: 'pass' | 'fail';
    duration: number;
    error?: string;
    data?: any;
  }>;
}

export interface BusinessWorkflow {
  name: string;
  description: string;
  steps: Array<{
    name: string;
    module: string;
    actions: Array<{
      type: 'navigate' | 'click' | 'type' | 'select' | 'verify' | 'wait';
      selector?: string;
      value?: string;
      expected?: any;
      timeout?: number;
    }>;
    validations: Array<{
      name: string;
      selector?: string;
      expected?: any;
      type: 'exists' | 'text' | 'count' | 'value' | 'attribute';
    }>;
  }>;
}

export class UserWorkflowE2E {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private testEnv: TestEnvironment;
  private reporter: TestReporter;
  private baseUrl: string = '';

  // Define comprehensive business workflows
  private readonly businessWorkflows: BusinessWorkflow[] = [
    {
      name: 'Complete Customer Service Journey',
      description: 'End-to-end customer service from scheduling to checkout and loyalty',
      steps: [
        {
          name: 'Check today\'s schedule',
          module: 'scheduling',
          actions: [
            { type: 'navigate', value: '/scheduling' },
            { type: 'wait', selector: '[data-testid="heading-scheduling"]', timeout: 5000 },
            { type: 'verify', selector: '[data-testid="appointment"], .appointment-item' }
          ],
          validations: [
            { name: 'Appointments visible', selector: '[data-testid="appointment"], .appointment-item', type: 'exists' },
            { name: 'Schedule loaded', selector: '[data-testid="heading-scheduling"]', type: 'exists' }
          ]
        },
        {
          name: 'Process customer checkout',
          module: 'pos',
          actions: [
            { type: 'navigate', value: '/pos' },
            { type: 'wait', selector: '[data-testid="heading-pos"]', timeout: 5000 },
            { type: 'click', selector: 'button[aria-label*="Add service"]:first-of-type' },
            { type: 'wait', timeout: 1000 },
            { type: 'click', selector: 'button:has(.lucide-plus):first-of-type' },
            { type: 'wait', timeout: 1000 },
            { type: 'click', selector: 'button[aria-label="Set discount 10%"]' },
            { type: 'wait', timeout: 1000 },
            { type: 'click', selector: '[data-testid="button-pos-checkout"]' },
            { type: 'wait', selector: '.receipt, [data-testid="receipt"]', timeout: 5000 }
          ],
          validations: [
            { name: 'Service added to cart', selector: '.cart-item, [data-testid="cart-item"]', type: 'exists' },
            { name: 'Receipt generated', selector: '.receipt, [data-testid="receipt"]', type: 'exists' }
          ]
        },
        {
          name: 'Add loyalty points',
          module: 'loyalty',
          actions: [
            { type: 'navigate', value: '/loyalty' },
            { type: 'wait', selector: '[data-testid="heading-loyalty"]', timeout: 5000 },
            { type: 'click', selector: '#loyalty-customer-select, [data-testid="customer-select"]' },
            { type: 'wait', timeout: 1000 },
            { type: 'click', selector: '[data-value]:not([data-value="all"]):first-of-type' },
            { type: 'type', selector: '#loyalty-points-input, input[type="number"]', value: '50' },
            { type: 'click', selector: 'button:has-text("Add"):not(:has-text("Add Reward"))' }
          ],
          validations: [
            { name: 'Customer selected', selector: '#loyalty-customer-select, [data-testid="customer-select"]', type: 'exists' },
            { name: 'Points input available', selector: '#loyalty-points-input, input[type="number"]', type: 'exists' }
          ]
        },
        {
          name: 'Verify analytics update',
          module: 'analytics',
          actions: [
            { type: 'navigate', value: '/analytics' },
            { type: 'wait', selector: '[data-testid="heading-analytics"]', timeout: 5000 },
            { type: 'verify', selector: '[data-testid="kpi-card"], .kpi-card' }
          ],
          validations: [
            { name: 'KPI cards visible', selector: '[data-testid="kpi-card"], .kpi-card', type: 'exists' },
            { name: 'Revenue data displayed', selector: '.revenue, [data-testid="revenue"]', type: 'exists' }
          ]
        }
      ]
    },
    {
      name: 'Inventory Management Workflow',
      description: 'Complete inventory management from checking stock to identifying low inventory',
      steps: [
        {
          name: 'Review current inventory',
          module: 'inventory',
          actions: [
            { type: 'navigate', value: '/inventory' },
            { type: 'wait', selector: '[data-testid="heading-inventory"]', timeout: 5000 },
            { type: 'verify', selector: '[data-status], .status-indicator' }
          ],
          validations: [
            { name: 'Inventory items visible', selector: '[data-testid="inventory-item"], .inventory-item', type: 'exists' },
            { name: 'Stock status indicators', selector: '[data-status], .status-indicator', type: 'exists' }
          ]
        },
        {
          name: 'Identify low stock items',
          module: 'inventory',
          actions: [
            { type: 'verify', selector: '[data-status="low-stock"], .status-low-stock, .text-red-600' }
          ],
          validations: [
            { name: 'Low stock items identified', selector: '[data-status="low-stock"], .status-low-stock, .text-red-600', type: 'exists' }
          ]
        },
        {
          name: 'Check analytics for inventory insights',
          module: 'analytics',
          actions: [
            { type: 'navigate', value: '/analytics' },
            { type: 'wait', selector: '[data-testid="heading-analytics"]', timeout: 5000 }
          ],
          validations: [
            { name: 'Analytics loaded', selector: '[data-testid="heading-analytics"]', type: 'exists' }
          ]
        }
      ]
    },
    {
      name: 'Marketing Campaign Management',
      description: 'Create, activate, and monitor marketing campaigns',
      steps: [
        {
          name: 'Review existing campaigns',
          module: 'marketing',
          actions: [
            { type: 'navigate', value: '/marketing' },
            { type: 'wait', selector: '[data-testid="heading-marketing"]', timeout: 5000 },
            { type: 'verify', selector: 'table, [data-testid="campaign-list"]' }
          ],
          validations: [
            { name: 'Campaign list visible', selector: 'table, [data-testid="campaign-list"]', type: 'exists' },
            { name: 'Campaign metrics available', selector: '[data-testid="campaign-metrics"], .campaign-metrics', type: 'exists' }
          ]
        },
        {
          name: 'Filter campaigns by status',
          module: 'marketing',
          actions: [
            { type: 'click', selector: '[data-testid="campaign-status-filter"], select' },
            { type: 'wait', timeout: 500 },
            { type: 'click', selector: 'option[value="active"], [data-value="active"]' }
          ],
          validations: [
            { name: 'Filter applied', selector: '[data-testid="campaign-status-filter"], select', type: 'exists' }
          ]
        },
        {
          name: 'View campaign performance',
          module: 'marketing',
          actions: [
            { type: 'verify', selector: '.chart, canvas, svg' }
          ],
          validations: [
            { name: 'Performance charts visible', selector: '.chart, canvas, svg', type: 'exists' }
          ]
        }
      ]
    },
    {
      name: 'Staff Scheduling and Management',
      description: 'Manage staff schedules and appointments',
      steps: [
        {
          name: 'Review staff schedules',
          module: 'scheduling',
          actions: [
            { type: 'navigate', value: '/scheduling' },
            { type: 'wait', selector: '[data-testid="heading-scheduling"]', timeout: 5000 },
            { type: 'verify', selector: '[data-testid="appointment"], .appointment-item' }
          ],
          validations: [
            { name: 'Appointments displayed', selector: '[data-testid="appointment"], .appointment-item', type: 'exists' },
            { name: 'Staff assignments visible', selector: '.staff-name, [data-testid="staff-name"]', type: 'exists' }
          ]
        },
        {
          name: 'Check staff performance',
          module: 'staff',
          actions: [
            { type: 'navigate', value: '/staff' },
            { type: 'wait', selector: '[data-testid="heading-staff"]', timeout: 5000 }
          ],
          validations: [
            { name: 'Staff page loaded', selector: '[data-testid="heading-staff"]', type: 'exists' }
          ]
        },
        {
          name: 'View staff analytics',
          module: 'analytics',
          actions: [
            { type: 'navigate', value: '/analytics' },
            { type: 'wait', selector: '[data-testid="heading-analytics"]', timeout: 5000 },
            { type: 'verify', selector: '.staff-performance, [data-testid="staff-performance"]' }
          ],
          validations: [
            { name: 'Staff performance data', selector: '.staff-performance, [data-testid="staff-performance"]', type: 'exists' }
          ]
        }
      ]
    },
    {
      name: 'Business Intelligence and Reporting',
      description: 'Generate reports and analyze business performance',
      steps: [
        {
          name: 'Review key performance indicators',
          module: 'analytics',
          actions: [
            { type: 'navigate', value: '/analytics' },
            { type: 'wait', selector: '[data-testid="heading-analytics"]', timeout: 5000 },
            { type: 'verify', selector: '[data-testid="kpi-card"], .kpi-card' }
          ],
          validations: [
            { name: 'KPI cards loaded', selector: '[data-testid="kpi-card"], .kpi-card', type: 'count', expected: { min: 3 } },
            { name: 'Revenue metrics visible', selector: '.revenue, [data-testid="revenue"]', type: 'exists' }
          ]
        },
        {
          name: 'Export sales data',
          module: 'pos',
          actions: [
            { type: 'navigate', value: '/pos' },
            { type: 'wait', selector: '[data-testid="heading-pos"]', timeout: 5000 },
            { type: 'verify', selector: 'button:has-text("Export"), button[aria-label*="Export"]' }
          ],
          validations: [
            { name: 'Export functionality available', selector: 'button:has-text("Export"), button[aria-label*="Export"]', type: 'exists' }
          ]
        },
        {
          name: 'Export loyalty data',
          module: 'loyalty',
          actions: [
            { type: 'navigate', value: '/loyalty' },
            { type: 'wait', selector: '[data-testid="heading-loyalty"]', timeout: 5000 },
            { type: 'verify', selector: 'button:has-text("Export"), button[aria-label*="Export"]' }
          ],
          validations: [
            { name: 'Loyalty export available', selector: 'button:has-text("Export"), button[aria-label*="Export"]', type: 'exists' }
          ]
        }
      ]
    }
  ];

  constructor(testEnv: TestEnvironment, reporter: TestReporter) {
    this.testEnv = testEnv;
    this.reporter = reporter;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async setup(): Promise<void> {
    this.browser = await puppeteer.launch({ 
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 800 });
    
    this.baseUrl = this.testEnv.baseUrl;
  }

  async teardown(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runAllWorkflows(): Promise<UserWorkflowResult[]> {
    const results: UserWorkflowResult[] = [];

    for (const workflow of this.businessWorkflows) {
      console.log(`🔄 Running workflow: ${workflow.name}`);
      const result = await this.runWorkflow(workflow);
      results.push(result);
    }

    return results;
  }

  async runWorkflow(workflow: BusinessWorkflow): Promise<UserWorkflowResult> {
    const startTime = Date.now();
    const workflowSteps: UserWorkflowResult['workflow'] = [];

    try {
      if (!this.page) throw new Error('Page not initialized');

      // Reset to default scenario for consistent testing
      await this.page.goto(`${this.baseUrl}/?scenario=default&seed=123`);
      await this.page.waitForSelector('[data-testid="heading-main"]', { timeout: 10000 });
      await this.delay(2000); // Allow scenario to load

      // Execute each step in the workflow
      for (const step of workflow.steps) {
        console.log(`  📋 Executing step: ${step.name}`);
        const stepResult = await this.executeWorkflowStep(step);
        workflowSteps.push(stepResult);
      }

      const failedSteps = workflowSteps.filter(s => s.status === 'fail').length;
      const totalSteps = workflowSteps.length;

      return {
        name: workflow.name,
        status: failedSteps === 0 ? 'pass' : 'fail',
        duration: Date.now() - startTime,
        workflow: workflowSteps
      };

    } catch (error) {
      workflowSteps.push({
        step: 'Workflow execution error',
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        name: workflow.name,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        workflow: workflowSteps
      };
    }
  }

  private async executeWorkflowStep(step: BusinessWorkflow['steps'][0]): Promise<UserWorkflowResult['workflow'][0]> {
    const startTime = Date.now();

    try {
      if (!this.page) throw new Error('Page not initialized');

      // Execute actions
      for (const action of step.actions) {
        await this.executeAction(action);
      }

      // Run validations
      const validationResults = [];
      for (const validation of step.validations) {
        const result = await this.runValidation(validation);
        validationResults.push(result);
      }

      const failedValidations = validationResults.filter(v => !v.success).length;
      const totalValidations = validationResults.length;

      return {
        step: step.name,
        status: failedValidations === 0 ? 'pass' : 'fail',
        duration: Date.now() - startTime,
        data: {
          module: step.module,
          validations: validationResults,
          successful: totalValidations - failedValidations,
          total: totalValidations
        },
        error: failedValidations > 0 ? 
          `${failedValidations}/${totalValidations} validations failed` : undefined
      };

    } catch (error) {
      return {
        step: step.name,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async executeAction(action: BusinessWorkflow['steps'][0]['actions'][0]): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    switch (action.type) {
      case 'navigate':
        if (action.value) {
          await this.page.goto(`${this.baseUrl}${action.value}`);
        }
        break;

      case 'click':
        if (action.selector) {
          try {
            await this.page.waitForSelector(action.selector, { timeout: 3000 });
            const element = await this.page.$(action.selector);
            if (element) {
              await element.click();
            }
          } catch (error) {
            // Try alternative selectors or continue
            console.warn(`Click failed for ${action.selector}:`, error);
          }
        }
        break;

      case 'type':
        if (action.selector && action.value) {
          try {
            await this.page.waitForSelector(action.selector, { timeout: 3000 });
            await this.page.type(action.selector, action.value);
          } catch (error) {
            console.warn(`Type failed for ${action.selector}:`, error);
          }
        }
        break;

      case 'select':
        if (action.selector && action.value) {
          try {
            await this.page.waitForSelector(action.selector, { timeout: 3000 });
            await this.page.select(action.selector, action.value);
          } catch (error) {
            console.warn(`Select failed for ${action.selector}:`, error);
          }
        }
        break;

      case 'wait':
        if (action.selector) {
          await this.page.waitForSelector(action.selector, { 
            timeout: action.timeout || 5000 
          });
        } else if (action.timeout) {
          await this.delay(action.timeout);
        }
        break;

      case 'verify':
        if (action.selector) {
          const element = await this.page.$(action.selector);
          if (!element) {
            throw new Error(`Verification failed: Element not found - ${action.selector}`);
          }
        }
        break;
    }

    // Small delay between actions
    await this.delay(300);
  }

  private async runValidation(validation: BusinessWorkflow['steps'][0]['validations'][0]): Promise<{ name: string; success: boolean; error?: string; details?: any }> {
    if (!this.page) throw new Error('Page not initialized');

    try {
      switch (validation.type) {
        case 'exists':
          if (validation.selector) {
            const element = await this.page.$(validation.selector);
            return {
              name: validation.name,
              success: !!element,
              error: !element ? `Element not found: ${validation.selector}` : undefined
            };
          }
          break;

        case 'text':
          if (validation.selector && validation.expected) {
            const element = await this.page.$(validation.selector);
            if (element) {
              const text = await element.evaluate(el => el.textContent);
              const matches = text?.includes(validation.expected);
              return {
                name: validation.name,
                success: !!matches,
                details: { expected: validation.expected, actual: text },
                error: !matches ? `Text mismatch: expected "${validation.expected}", got "${text}"` : undefined
              };
            }
          }
          break;

        case 'count':
          if (validation.selector && validation.expected) {
            const elements = await this.page.$$(validation.selector);
            const count = elements.length;
            const expected = validation.expected as { min?: number; max?: number; exact?: number };
            
            let success = true;
            if (expected.exact !== undefined) {
              success = count === expected.exact;
            } else {
              if (expected.min !== undefined) success = success && count >= expected.min;
              if (expected.max !== undefined) success = success && count <= expected.max;
            }

            return {
              name: validation.name,
              success,
              details: { count, expected },
              error: !success ? `Count validation failed: got ${count}, expected ${JSON.stringify(expected)}` : undefined
            };
          }
          break;

        case 'value':
          if (validation.selector && validation.expected) {
            const element = await this.page.$(validation.selector);
            if (element) {
              const value = await element.evaluate(el => (el as HTMLInputElement).value);
              const matches = value === validation.expected;
              return {
                name: validation.name,
                success: matches,
                details: { expected: validation.expected, actual: value },
                error: !matches ? `Value mismatch: expected "${validation.expected}", got "${value}"` : undefined
              };
            }
          }
          break;

        case 'attribute':
          if (validation.selector && validation.expected) {
            const element = await this.page.$(validation.selector);
            if (element) {
              const attr = validation.expected.attribute;
              const expectedValue = validation.expected.value;
              const actualValue = await element.evaluate((el, attribute) => el.getAttribute(attribute), attr);
              const matches = actualValue === expectedValue;
              return {
                name: validation.name,
                success: matches,
                details: { attribute: attr, expected: expectedValue, actual: actualValue },
                error: !matches ? `Attribute mismatch: ${attr} expected "${expectedValue}", got "${actualValue}"` : undefined
              };
            }
          }
          break;
      }

      return {
        name: validation.name,
        success: false,
        error: `Invalid validation configuration: ${JSON.stringify(validation)}`
      };

    } catch (error) {
      return {
        name: validation.name,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Keyboard shortcuts testing
  async testKeyboardShortcuts(): Promise<UserWorkflowResult> {
    const startTime = Date.now();
    const shortcuts = [
      { keys: 'gh', expected: '[data-testid="heading-main"]', name: 'Go to Home/Chat' },
      { keys: 'gs', expected: '[data-testid="heading-scheduling"]', name: 'Go to Scheduling' },
      { keys: 'gi', expected: '[data-testid="heading-inventory"]', name: 'Go to Inventory' },
      { keys: 'gf', expected: '[data-testid="heading-staff"]', name: 'Go to Staff' },
      { keys: 'ga', expected: '[data-testid="heading-analytics"]', name: 'Go to Analytics' }
    ];

    const workflowSteps: UserWorkflowResult['workflow'] = [];

    try {
      if (!this.page) throw new Error('Page not initialized');

      await this.page.goto(`${this.baseUrl}/`);
      await this.page.waitForSelector('[data-testid="heading-main"]', { timeout: 10000 });

      for (const shortcut of shortcuts) {
        const stepStart = Date.now();
        try {
          await this.page.keyboard.type(shortcut.keys);
          await this.page.waitForSelector(shortcut.expected, { timeout: 3000 });
          
          workflowSteps.push({
            step: shortcut.name,
            status: 'pass',
            duration: Date.now() - stepStart,
            data: { keys: shortcut.keys, selector: shortcut.expected }
          });
        } catch (error) {
          workflowSteps.push({
            step: shortcut.name,
            status: 'fail',
            duration: Date.now() - stepStart,
            error: error instanceof Error ? error.message : String(error),
            data: { keys: shortcut.keys, selector: shortcut.expected }
          });
        }
      }

      const failedSteps = workflowSteps.filter(s => s.status === 'fail').length;

      return {
        name: 'Keyboard Shortcuts Test',
        status: failedSteps === 0 ? 'pass' : 'fail',
        duration: Date.now() - startTime,
        workflow: workflowSteps
      };

    } catch (error) {
      return {
        name: 'Keyboard Shortcuts Test',
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        workflow: workflowSteps
      };
    }
  }
}