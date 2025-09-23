import puppeteer from 'puppeteer'
import type { TestEnvironment } from '../utils/test-environment'
import { TestReporter } from '../reporting/test-reporter'

export interface BrowserTestResult {
  name: string
  browser: string
  version: string
  status: 'pass' | 'fail' | 'skip'
  duration: number
  error?: string
  features: {
    basicFunctionality: boolean
    responsiveDesign: boolean
    jsFeatures: boolean
    cssFeatures: boolean
    formSubmission: boolean
    navigation: boolean
  }
  performance: {
    loadTime: number
    renderTime: number
    interactionTime: number
  }
  screenshots?: string[]
}

export interface ResponsiveTestResult {
  name: string
  viewport: { width: number; height: number }
  status: 'pass' | 'fail' | 'skip'
  duration: number
  error?: string
  layout: {
    sidebarAdapts: boolean
    contentFits: boolean
    navigationWorks: boolean
    formsUsable: boolean
  }
}

export class BrowserCompatibilityTests {
  private testEnv: TestEnvironment
  private reporter: TestReporter
  private baseUrl: string = ''

  constructor(testEnv: TestEnvironment, reporter: TestReporter) {
    this.testEnv = testEnv
    this.reporter = reporter
  }

  async setup(): Promise<void> {
    this.baseUrl = this.testEnv.baseUrl
  }

  async teardown(): Promise<void> {
    // TestEnvironment cleanup is handled by the caller
  }

  async runAllBrowserTests(): Promise<BrowserTestResult[]> {
    const results: BrowserTestResult[] = []

    // Test different browser configurations
    const browserConfigs = [
      { name: 'Chrome Desktop', args: ['--no-sandbox', '--disable-setuid-sandbox'] },
      {
        name: 'Chrome Mobile',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
        ]
      },
      {
        name: 'Chrome Tablet',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--user-agent=Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
        ]
      }
    ]

    for (const config of browserConfigs) {
      results.push(await this.testBrowserCompatibility(config.name, config.args))
    }

    return results
  }

  private async testBrowserCompatibility(
    browserName: string,
    launchArgs: string[]
  ): Promise<BrowserTestResult> {
    const startTime = Date.now()
    let browser: puppeteer.Browser | null = null
    let page: puppeteer.Page | null = null

    try {
      browser = await puppeteer.launch({
        args: launchArgs,
        headless: true
      })

      page = await browser.newPage()

      // Set appropriate viewport based on browser type
      if (browserName.includes('Mobile')) {
        await page.setViewport({ width: 375, height: 667 })
      } else if (browserName.includes('Tablet')) {
        await page.setViewport({ width: 768, height: 1024 })
      } else {
        await page.setViewport({ width: 1280, height: 800 })
      }

      // Get browser version
      const version = await browser.version()

      // Test basic functionality
      const basicFunctionality = await this.testBasicFunctionality(page)

      // Test responsive design
      const responsiveDesign = await this.testResponsiveDesign(page)

      // Test JavaScript features
      const jsFeatures = await this.testJavaScriptFeatures(page)

      // Test CSS features
      const cssFeatures = await this.testCSSFeatures(page)

      // Test form submission
      const formSubmission = await this.testFormSubmission(page)

      // Test navigation
      const navigation = await this.testNavigation(page)

      // Measure performance
      const performance = await this.measurePerformance(page)

      const allTestsPassed =
        basicFunctionality &&
        responsiveDesign &&
        jsFeatures &&
        cssFeatures &&
        formSubmission &&
        navigation

      return {
        name: `Browser Compatibility - ${browserName}`,
        browser: browserName,
        version,
        status: allTestsPassed ? 'pass' : 'fail',
        duration: Date.now() - startTime,
        features: {
          basicFunctionality,
          responsiveDesign,
          jsFeatures,
          cssFeatures,
          formSubmission,
          navigation
        },
        performance
      }
    } catch (error) {
      return {
        name: `Browser Compatibility - ${browserName}`,
        browser: browserName,
        version: 'unknown',
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        features: {
          basicFunctionality: false,
          responsiveDesign: false,
          jsFeatures: false,
          cssFeatures: false,
          formSubmission: false,
          navigation: false
        },
        performance: {
          loadTime: 0,
          renderTime: 0,
          interactionTime: 0
        }
      }
    } finally {
      if (browser) {
        await browser.close()
      }
    }
  }

  private async testBasicFunctionality(page: puppeteer.Page): Promise<boolean> {
    try {
      // Navigate to home page
      await page.goto(`${this.baseUrl}/`)
      await page.waitForSelector('[data-testid="heading-main"]', { timeout: 10000 })

      // Check if main elements are present
      const mainHeading = await page.$('[data-testid="heading-main"]')
      const sidebar = await page.$('[data-testid="sidebar"]')

      return !!(mainHeading && sidebar)
    } catch {
      return false
    }
  }

  private async testResponsiveDesign(page: puppeteer.Page): Promise<boolean> {
    try {
      const viewport = page.viewport()
      if (!viewport) return false

      // Check if content fits viewport
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = viewport.width

      // Allow small tolerance for scrollbars
      const fitsViewport = bodyWidth <= viewportWidth + 20

      // Check if sidebar adapts on mobile
      if (viewport.width < 768) {
        const sidebarWidth = await page.evaluate(() => {
          const sidebar = document.querySelector('[data-testid="sidebar"]')
          return sidebar ? sidebar.getBoundingClientRect().width : 0
        })

        // On mobile, sidebar should be collapsed or overlay
        return fitsViewport && sidebarWidth < 200
      }

      return fitsViewport
    } catch {
      return false
    }
  }

  private async testJavaScriptFeatures(page: puppeteer.Page): Promise<boolean> {
    try {
      // Test modern JavaScript features
      const jsSupport = await page.evaluate(() => {
        try {
          // Test ES6+ features
          const arrow = () => true
          const [a, b] = [1, 2]
          const obj = { a, b }
          const { a: x } = obj

          // Test async/await (basic check)
          const asyncSupported = typeof Promise !== 'undefined'

          // Test fetch API
          const fetchSupported = typeof fetch !== 'undefined'

          // Test modern DOM APIs
          const domSupported = typeof document.querySelector !== 'undefined'

          return arrow() && asyncSupported && fetchSupported && domSupported
        } catch {
          return false
        }
      })

      // Test React functionality by checking if components render
      await page.waitForSelector('[data-testid="sidebar"]', { timeout: 5000 })

      // Test interactive features
      await page.click('[data-testid="button-tool-pos"]')
      await page.waitForSelector('[data-testid="heading-pos"]', { timeout: 5000 })

      return jsSupport
    } catch {
      return false
    }
  }

  private async testCSSFeatures(page: puppeteer.Page): Promise<boolean> {
    try {
      // Test CSS Grid and Flexbox support
      const cssSupport = await page.evaluate(() => {
        const testEl = document.createElement('div')
        testEl.style.display = 'grid'
        const gridSupported = testEl.style.display === 'grid'

        testEl.style.display = 'flex'
        const flexSupported = testEl.style.display === 'flex'

        // Test CSS custom properties
        testEl.style.setProperty('--test-var', 'test')
        const customPropsSupported = testEl.style.getPropertyValue('--test-var') === 'test'

        return gridSupported && flexSupported && customPropsSupported
      })

      // Test if styles are applied correctly
      const stylesApplied = await page.evaluate(() => {
        const sidebar = document.querySelector('[data-testid="sidebar"]')
        if (!sidebar) return false

        const style = window.getComputedStyle(sidebar)
        return style.display !== 'none' && style.visibility !== 'hidden'
      })

      return cssSupport && stylesApplied
    } catch {
      return false
    }
  }

  private async testFormSubmission(page: puppeteer.Page): Promise<boolean> {
    try {
      // Navigate to POS page to test form functionality
      await page.goto(`${this.baseUrl}/pos`)
      await page.waitForSelector('[data-testid="heading-pos"]', { timeout: 5000 })

      // Test adding items to cart (form-like interaction)
      const serviceButton = await page.$('button[aria-label*="Add service"]')
      if (serviceButton) {
        await serviceButton.click()

        // Check if cart updates
        const cartItems = await page.$$('.cart-item, [data-testid="cart-item"]')
        if (cartItems.length === 0) {
          // Try alternative selector for cart content
          const cartContent = await page.$eval('*', () => {
            return document.body.textContent?.includes('Cart') || false
          })
          return cartContent
        }
        return true
      }

      return false
    } catch {
      return false
    }
  }

  private async testNavigation(page: puppeteer.Page): Promise<boolean> {
    try {
      // Test sidebar navigation
      await page.goto(`${this.baseUrl}/`)
      await page.waitForSelector('[data-testid="sidebar"]', { timeout: 5000 })

      // Test clicking different navigation items
      const navItems = [
        {
          button: '[data-testid="button-tool-scheduling"]',
          heading: '[data-testid="heading-scheduling"]'
        },
        {
          button: '[data-testid="button-tool-inventory"]',
          heading: '[data-testid="heading-inventory"]'
        },
        {
          button: '[data-testid="button-tool-analytics"]',
          heading: '[data-testid="heading-analytics"]'
        }
      ]

      for (const item of navItems) {
        const button = await page.$(item.button)
        if (button) {
          await button.click()
          await page.waitForSelector(item.heading, { timeout: 3000 })
        } else {
          return false
        }
      }

      // Test keyboard navigation
      await page.keyboard.type('gh') // Go to home
      await page.waitForSelector('[data-testid="heading-main"]', { timeout: 3000 })

      return true
    } catch {
      return false
    }
  }

  private async measurePerformance(
    page: puppeteer.Page
  ): Promise<BrowserTestResult['performance']> {
    try {
      // Measure load time
      const loadStartTime = Date.now()
      await page.goto(`${this.baseUrl}/`)
      await page.waitForSelector('[data-testid="heading-main"]', { timeout: 10000 })
      const loadTime = Date.now() - loadStartTime

      // Measure render time
      const renderStartTime = Date.now()
      await page.waitForFunction(() => {
        return document.readyState === 'complete'
      })
      const renderTime = Date.now() - renderStartTime

      // Measure interaction time
      const interactionStartTime = Date.now()
      await page.click('[data-testid="button-tool-pos"]')
      await page.waitForSelector('[data-testid="heading-pos"]', { timeout: 5000 })
      const interactionTime = Date.now() - interactionStartTime

      return {
        loadTime,
        renderTime,
        interactionTime
      }
    } catch {
      return {
        loadTime: 0,
        renderTime: 0,
        interactionTime: 0
      }
    }
  }

  async runResponsiveDesignTests(): Promise<ResponsiveTestResult[]> {
    const results: ResponsiveTestResult[] = []

    const viewports = [
      { name: 'Mobile Portrait', width: 375, height: 667 },
      { name: 'Mobile Landscape', width: 667, height: 375 },
      { name: 'Tablet Portrait', width: 768, height: 1024 },
      { name: 'Tablet Landscape', width: 1024, height: 768 },
      { name: 'Desktop Small', width: 1280, height: 800 },
      { name: 'Desktop Large', width: 1920, height: 1080 }
    ]

    for (const viewport of viewports) {
      results.push(await this.testResponsiveViewport(viewport))
    }

    return results
  }

  private async testResponsiveViewport(viewport: {
    name: string
    width: number
    height: number
  }): Promise<ResponsiveTestResult> {
    const startTime = Date.now()
    let browser: puppeteer.Browser | null = null
    let page: puppeteer.Page | null = null

    try {
      browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true
      })

      page = await browser.newPage()
      await page.setViewport({ width: viewport.width, height: viewport.height })

      // Navigate to home page
      await page.goto(`${this.baseUrl}/`)
      await page.waitForSelector('[data-testid="heading-main"]', { timeout: 10000 })

      // Test sidebar adaptation
      const sidebarAdapts = await this.testSidebarAdaptation(page, viewport.width)

      // Test content fits
      const contentFits = await this.testContentFits(page, viewport.width)

      // Test navigation works
      const navigationWorks = await this.testNavigationWorks(page)

      // Test forms are usable
      const formsUsable = await this.testFormsUsable(page, viewport.width)

      const allTestsPassed = sidebarAdapts && contentFits && navigationWorks && formsUsable

      return {
        name: `Responsive Design - ${viewport.name}`,
        viewport: { width: viewport.width, height: viewport.height },
        status: allTestsPassed ? 'pass' : 'fail',
        duration: Date.now() - startTime,
        layout: {
          sidebarAdapts,
          contentFits,
          navigationWorks,
          formsUsable
        }
      }
    } catch (error) {
      return {
        name: `Responsive Design - ${viewport.name}`,
        viewport: { width: viewport.width, height: viewport.height },
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        layout: {
          sidebarAdapts: false,
          contentFits: false,
          navigationWorks: false,
          formsUsable: false
        }
      }
    } finally {
      if (browser) {
        await browser.close()
      }
    }
  }

  private async testSidebarAdaptation(
    page: puppeteer.Page,
    viewportWidth: number
  ): Promise<boolean> {
    try {
      const sidebarInfo = await page.evaluate(() => {
        const sidebar = document.querySelector('[data-testid="sidebar"]')
        if (!sidebar) return null

        const rect = sidebar.getBoundingClientRect()
        const style = window.getComputedStyle(sidebar)

        return {
          width: rect.width,
          display: style.display,
          position: style.position
        }
      })

      if (!sidebarInfo) return false

      // On mobile (< 768px), sidebar should be collapsed or overlay
      if (viewportWidth < 768) {
        return (
          sidebarInfo.width < 100 ||
          sidebarInfo.position === 'fixed' ||
          sidebarInfo.position === 'absolute'
        )
      }

      // On larger screens, sidebar should be visible
      return sidebarInfo.display !== 'none' && sidebarInfo.width > 100
    } catch {
      return false
    }
  }

  private async testContentFits(page: puppeteer.Page, viewportWidth: number): Promise<boolean> {
    try {
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)

      // Allow small tolerance for scrollbars
      return bodyWidth <= viewportWidth + 20
    } catch {
      return false
    }
  }

  private async testNavigationWorks(page: puppeteer.Page): Promise<boolean> {
    try {
      // Test navigation to different pages
      await page.click('[data-testid="button-tool-pos"]')
      await page.waitForSelector('[data-testid="heading-pos"]', { timeout: 3000 })

      await page.click('[data-testid="button-tool-inventory"]')
      await page.waitForSelector('[data-testid="heading-inventory"]', { timeout: 3000 })

      return true
    } catch {
      return false
    }
  }

  private async testFormsUsable(page: puppeteer.Page, viewportWidth: number): Promise<boolean> {
    try {
      // Navigate to POS to test form elements
      await page.goto(`${this.baseUrl}/pos`)
      await page.waitForSelector('[data-testid="heading-pos"]', { timeout: 5000 })

      // Check if form elements are appropriately sized
      const formElements = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input, button, select')
        let allUsable = true

        inputs.forEach((el) => {
          const rect = el.getBoundingClientRect()
          // Minimum touch target size should be 44px on mobile
          if (rect.width < 30 || rect.height < 30) {
            allUsable = false
          }
        })

        return allUsable
      })

      return formElements
    } catch {
      return false
    }
  }
}
