/**
 * API Endpoint Testing Framework
 * Provides reusable utilities for comprehensive API testing with schema validation
 */

import type { TestHttpClient, PerformanceMonitor } from '../utils/test-environment.js';
import { z } from 'zod';

export interface ApiTestResult {
  endpoint: string;
  method: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  error?: string;
  validationErrors?: string[];
  responseData?: any;
}

export interface ApiEndpointTest {
  name: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  requestBody?: any;
  expectedStatus: number;
  responseSchema?: z.ZodSchema;
  skipIf?: () => boolean;
  setup?: () => Promise<void>;
  cleanup?: () => Promise<void>;
}

export interface ErrorScenarioTest {
  name: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  requestBody?: any;
  expectedStatus: number;
  expectedErrorPattern?: RegExp;
  description: string;
}

/**
 * API Testing Framework - Main class for testing API endpoints
 */
export class ApiTestingFramework {
  private results: ApiTestResult[] = [];

  constructor(
    private httpClient: TestHttpClient,
    private performanceMonitor: PerformanceMonitor
  ) {}

  /**
   * Execute a single API endpoint test
   */
  async executeTest(test: ApiEndpointTest): Promise<ApiTestResult> {
    const result: ApiTestResult = {
      endpoint: test.path,
      method: test.method,
      status: 'fail',
      duration: 0
    };

    try {
      // Check if test should be skipped
      if (test.skipIf && test.skipIf()) {
        result.status = 'skip';
        return result;
      }

      // Run setup if provided
      if (test.setup) {
        await test.setup();
      }

      // Execute the API request with performance monitoring
      const { result: response, metrics } = await this.performanceMonitor.measureRequest(
        `${test.method} ${test.path}`,
        async () => {
          switch (test.method) {
            case 'GET':
              return this.httpClient.get(test.path);
            case 'POST':
              return this.httpClient.post(test.path, test.requestBody);
            case 'PATCH':
              return this.httpClient.patch(test.path, test.requestBody);
            case 'DELETE':
              return this.httpClient.delete(test.path);
            default:
              throw new Error(`Unsupported method: ${test.method}`);
          }
        }
      );

      result.duration = metrics.duration;

      // Validate response status
      if (response.status !== test.expectedStatus) {
        result.error = `Expected status ${test.expectedStatus}, got ${response.status}`;
        return result;
      }

      // Parse response data if JSON
      let responseData: any;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          responseData = await response.json();
          result.responseData = responseData;
        } catch (error) {
          result.error = `Failed to parse JSON response: ${error}`;
          return result;
        }
      }

      // Validate response schema if provided
      if (test.responseSchema && responseData) {
        const validation = test.responseSchema.safeParse(responseData);
        if (!validation.success) {
          result.validationErrors = validation.error.errors.map(
            err => `${err.path.join('.')}: ${err.message}`
          );
          result.error = 'Response schema validation failed';
          return result;
        }
      }

      result.status = 'pass';
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
    } finally {
      // Run cleanup if provided
      if (test.cleanup) {
        try {
          await test.cleanup();
        } catch (cleanupError) {
          console.warn(`Cleanup failed for ${test.name}:`, cleanupError);
        }
      }
    }

    this.results.push(result);
    return result;
  }

  /**
   * Execute multiple API endpoint tests
   */
  async executeTests(tests: ApiEndpointTest[]): Promise<ApiTestResult[]> {
    const results: ApiTestResult[] = [];
    
    for (const test of tests) {
      console.log(`Running API test: ${test.name}`);
      const result = await this.executeTest(test);
      results.push(result);
      
      if (result.status === 'fail') {
        console.error(`❌ ${test.name}: ${result.error}`);
        if (result.validationErrors) {
          result.validationErrors.forEach(err => console.error(`   • ${err}`));
        }
      } else if (result.status === 'pass') {
        console.log(`✅ ${test.name} (${result.duration}ms)`);
      } else {
        console.log(`⏭️  ${test.name} (skipped)`);
      }
    }

    return results;
  }

  /**
   * Execute error scenario tests
   */
  async executeErrorScenarios(scenarios: ErrorScenarioTest[]): Promise<ApiTestResult[]> {
    const results: ApiTestResult[] = [];

    for (const scenario of scenarios) {
      console.log(`Running error scenario: ${scenario.name}`);
      
      const result: ApiTestResult = {
        endpoint: scenario.path,
        method: scenario.method,
        status: 'fail',
        duration: 0
      };

      try {
        const { result: response, metrics } = await this.performanceMonitor.measureRequest(
          `Error: ${scenario.method} ${scenario.path}`,
          async () => {
            switch (scenario.method) {
              case 'GET':
                return this.httpClient.get(scenario.path);
              case 'POST':
                return this.httpClient.post(scenario.path, scenario.requestBody);
              case 'PATCH':
                return this.httpClient.patch(scenario.path, scenario.requestBody);
              case 'DELETE':
                return this.httpClient.delete(scenario.path);
              default:
                throw new Error(`Unsupported method: ${scenario.method}`);
            }
          }
        );

        result.duration = metrics.duration;

        // Validate expected error status
        if (response.status !== scenario.expectedStatus) {
          result.error = `Expected error status ${scenario.expectedStatus}, got ${response.status}`;
        } else {
          // Validate error message pattern if provided
          if (scenario.expectedErrorPattern) {
            try {
              const errorText = await response.text();
              if (!scenario.expectedErrorPattern.test(errorText)) {
                result.error = `Error response doesn't match expected pattern`;
              } else {
                result.status = 'pass';
              }
            } catch {
              result.error = 'Failed to read error response';
            }
          } else {
            result.status = 'pass';
          }
        }
      } catch (error) {
        result.error = error instanceof Error ? error.message : String(error);
      }

      results.push(result);
      
      if (result.status === 'fail') {
        console.error(`❌ ${scenario.name}: ${result.error}`);
      } else {
        console.log(`✅ ${scenario.name} (${result.duration}ms)`);
      }
    }

    return results;
  }

  /**
   * Get all test results
   */
  getResults(): ApiTestResult[] {
    return [...this.results];
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.results = [];
  }

  /**
   * Generate test summary
   */
  generateSummary(): {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    averageResponseTime: number;
  } {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;
    const averageResponseTime = total > 0 
      ? this.results.reduce((sum, r) => sum + r.duration, 0) / total 
      : 0;

    return {
      total,
      passed,
      failed,
      skipped,
      averageResponseTime
    };
  }
}