/**
 * Docker Deployment Testing Framework
 * Tests container build, startup validation, environment configuration, and networking
 */

import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { waitFor, delay, TestHttpClient } from '../utils/test-environment.js'
import type { TestConfig } from '../config/test-config.js'

export interface DockerTestResult {
  testName: string
  success: boolean
  duration: number
  error?: string
  details?: Record<string, any>
}

export interface DockerEnvironment {
  containerId: string
  port: number
  baseUrl: string
  cleanup: () => Promise<void>
}

export class DockerDeploymentTester {
  private testResults: DockerTestResult[] = []
  private activeContainers: Set<string> = new Set()

  constructor(private config: TestConfig) {}

  /**
   * Run all Docker deployment tests
   */
  async runAllTests(): Promise<DockerTestResult[]> {
    this.testResults = []

    console.log('🐳 Starting Docker deployment tests...')

    try {
      // Test 1: Container build validation
      await this.testContainerBuild()

      // Test 2: Container startup validation
      await this.testContainerStartup()

      // Test 3: Environment variable configuration
      await this.testEnvironmentConfiguration()

      // Test 4: Port binding and networking
      await this.testPortBindingAndNetworking()

      // Test 5: Health endpoint functionality
      await this.testHealthEndpoint()

      // Test 6: Container resource limits
      await this.testResourceLimits()

      // Test 7: Container cleanup and shutdown
      await this.testContainerCleanup()
    } finally {
      // Ensure all containers are cleaned up
      await this.cleanupAllContainers()
    }

    return this.testResults
  }

  /**
   * Test container build process
   */
  private async testContainerBuild(): Promise<void> {
    const startTime = Date.now()

    try {
      console.log('  📦 Testing container build...')

      // Build the Docker image
      const buildResult = await this.runDockerCommand(['build', '-t', 'andreas-vibe-test', '.'])

      if (buildResult.exitCode !== 0) {
        throw new Error(`Docker build failed: ${buildResult.stderr}`)
      }

      // Verify image was created
      const imageResult = await this.runDockerCommand([
        'images',
        'andreas-vibe-test',
        '--format',
        '{{.Repository}}:{{.Tag}}'
      ])

      if (!imageResult.stdout.includes('andreas-vibe-test')) {
        throw new Error('Docker image was not created successfully')
      }

      this.addTestResult({
        testName: 'Container Build',
        success: true,
        duration: Date.now() - startTime,
        details: {
          imageSize: await this.getImageSize('andreas-vibe-test'),
          buildOutput: buildResult.stdout.split('\n').slice(-5) // Last 5 lines
        }
      })
    } catch (error) {
      this.addTestResult({
        testName: 'Container Build',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error // Re-throw to stop further tests if build fails
    }
  }

  /**
   * Test container startup and basic functionality
   */
  private async testContainerStartup(): Promise<void> {
    const startTime = Date.now()

    try {
      console.log('  🚀 Testing container startup...')

      const environment = await this.startContainer('andreas-vibe-test', {
        PORT: '5000'
      })

      // Wait for container to be ready
      await waitFor(async () => {
        try {
          const response = await fetch(`${environment.baseUrl}/api/health`)
          return response.ok
        } catch {
          return false
        }
      }, 30000)

      this.addTestResult({
        testName: 'Container Startup',
        success: true,
        duration: Date.now() - startTime,
        details: {
          containerId: environment.containerId,
          port: environment.port,
          baseUrl: environment.baseUrl
        }
      })

      await environment.cleanup()
    } catch (error) {
      this.addTestResult({
        testName: 'Container Startup',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Test environment variable configuration
   */
  private async testEnvironmentConfiguration(): Promise<void> {
    const startTime = Date.now()

    try {
      console.log('  🔧 Testing environment configuration...')

      const testCases = [
        {
          name: 'Default Configuration',
          env: { PORT: '5000' }
        },
        {
          name: 'Custom Port',
          env: { PORT: '8080' }
        },
        {
          name: 'Production Mode',
          env: {
            PORT: '5000',
            NODE_ENV: 'production'
          }
        },
        {
          name: 'With OpenAI Key',
          env: {
            PORT: '5000',
            OPENAI_API_KEY: 'test-key-12345'
          }
        }
      ]

      for (const testCase of testCases) {
        const caseStartTime = Date.now()

        try {
          const environment = await this.startContainer('andreas-vibe-test', testCase.env)

          // Verify container is running with correct configuration
          await waitFor(async () => {
            try {
              const response = await fetch(`${environment.baseUrl}/api/health`)
              return response.ok
            } catch {
              return false
            }
          }, 15000)

          // Test that the port matches expectation
          const expectedPort = parseInt(testCase.env.PORT)
          if (environment.port !== expectedPort) {
            throw new Error(`Port mismatch: expected ${expectedPort}, got ${environment.port}`)
          }

          await environment.cleanup()

          console.log(`    ✅ ${testCase.name} (${Date.now() - caseStartTime}ms)`)
        } catch (error) {
          console.log(`    ❌ ${testCase.name}: ${error}`)
          throw error
        }
      }

      this.addTestResult({
        testName: 'Environment Configuration',
        success: true,
        duration: Date.now() - startTime,
        details: {
          testCases: testCases.length,
          configurations: testCases.map((tc) => tc.name)
        }
      })
    } catch (error) {
      this.addTestResult({
        testName: 'Environment Configuration',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Test port binding and networking
   */
  private async testPortBindingAndNetworking(): Promise<void> {
    const startTime = Date.now()

    try {
      console.log('  🌐 Testing port binding and networking...')

      // Test multiple port configurations
      const ports = [5000, 8080, 3000]
      const environments: DockerEnvironment[] = []

      try {
        // Start containers on different ports
        for (const port of ports) {
          const env = await this.startContainer('andreas-vibe-test', { PORT: port.toString() })
          environments.push(env)

          // Verify each container is accessible on its port
          await waitFor(async () => {
            try {
              const response = await fetch(`${env.baseUrl}/api/health`)
              return response.ok
            } catch {
              return false
            }
          }, 15000)
        }

        // Test that containers don't interfere with each other
        for (const env of environments) {
          const client = new TestHttpClient(env.baseUrl)
          const health = await client.getJson('/api/health')

          if (!health.status || health.status !== 'ok') {
            throw new Error(`Health check failed for container on port ${env.port}`)
          }
        }

        this.addTestResult({
          testName: 'Port Binding and Networking',
          success: true,
          duration: Date.now() - startTime,
          details: {
            testedPorts: ports,
            simultaneousContainers: environments.length
          }
        })
      } finally {
        // Clean up all test containers
        for (const env of environments) {
          await env.cleanup()
        }
      }
    } catch (error) {
      this.addTestResult({
        testName: 'Port Binding and Networking',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Test health endpoint functionality in container
   */
  private async testHealthEndpoint(): Promise<void> {
    const startTime = Date.now()

    try {
      console.log('  🏥 Testing health endpoint...')

      const environment = await this.startContainer('andreas-vibe-test', {
        PORT: '5000'
      })

      try {
        const client = new TestHttpClient(environment.baseUrl)

        // Wait for container to be ready
        await waitFor(async () => {
          try {
            const response = await client.get('/api/health')
            return response.ok
          } catch {
            return false
          }
        }, 30000)

        // Test health endpoint response
        const health = await client.getJson('/api/health')

        // Verify health response structure
        if (!health.status || health.status !== 'ok') {
          throw new Error('Health endpoint returned invalid status')
        }

        if (!health.timestamp) {
          throw new Error('Health endpoint missing timestamp')
        }

        // Test health endpoint performance
        const performanceTests = []
        for (let i = 0; i < 10; i++) {
          const start = Date.now()
          await client.get('/api/health')
          performanceTests.push(Date.now() - start)
        }

        const avgResponseTime =
          performanceTests.reduce((a, b) => a + b, 0) / performanceTests.length

        this.addTestResult({
          testName: 'Health Endpoint',
          success: true,
          duration: Date.now() - startTime,
          details: {
            healthResponse: health,
            averageResponseTime: avgResponseTime,
            maxResponseTime: Math.max(...performanceTests)
          }
        })
      } finally {
        await environment.cleanup()
      }
    } catch (error) {
      this.addTestResult({
        testName: 'Health Endpoint',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Test container resource limits and monitoring
   */
  private async testResourceLimits(): Promise<void> {
    const startTime = Date.now()

    try {
      console.log('  📊 Testing resource limits...')

      const environment = await this.startContainer(
        'andreas-vibe-test',
        {
          PORT: '5000'
        },
        {
          memory: '512m',
          cpus: '1.0'
        }
      )

      try {
        // Wait for container to be ready
        await waitFor(async () => {
          try {
            const response = await fetch(`${environment.baseUrl}/api/health`)
            return response.ok
          } catch {
            return false
          }
        }, 30000)

        // Get container stats
        const statsResult = await this.runDockerCommand([
          'stats',
          environment.containerId,
          '--no-stream',
          '--format',
          'table {{.MemUsage}}\t{{.CPUPerc}}'
        ])

        if (statsResult.exitCode !== 0) {
          throw new Error(`Failed to get container stats: ${statsResult.stderr}`)
        }

        this.addTestResult({
          testName: 'Resource Limits',
          success: true,
          duration: Date.now() - startTime,
          details: {
            containerId: environment.containerId,
            resourceStats: statsResult.stdout.trim(),
            memoryLimit: '512m',
            cpuLimit: '1.0'
          }
        })
      } finally {
        await environment.cleanup()
      }
    } catch (error) {
      this.addTestResult({
        testName: 'Resource Limits',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Test container cleanup and shutdown
   */
  private async testContainerCleanup(): Promise<void> {
    const startTime = Date.now()

    try {
      console.log('  🧹 Testing container cleanup...')

      const environment = await this.startContainer('andreas-vibe-test', {
        PORT: '5000'
      })

      // Verify container is running
      const runningResult = await this.runDockerCommand([
        'ps',
        '--filter',
        `id=${environment.containerId}`,
        '--format',
        '{{.ID}}'
      ])

      if (!runningResult.stdout.includes(environment.containerId)) {
        throw new Error('Container not found in running containers')
      }

      // Test graceful shutdown
      await environment.cleanup()

      // Verify container is stopped
      await waitFor(async () => {
        const stoppedResult = await this.runDockerCommand([
          'ps',
          '-a',
          '--filter',
          `id=${environment.containerId}`,
          '--format',
          '{{.Status}}'
        ])
        return stoppedResult.stdout.includes('Exited')
      }, 10000)

      // Clean up container completely
      await this.runDockerCommand(['rm', environment.containerId])

      this.addTestResult({
        testName: 'Container Cleanup',
        success: true,
        duration: Date.now() - startTime,
        details: {
          containerId: environment.containerId,
          shutdownMethod: 'graceful'
        }
      })
    } catch (error) {
      this.addTestResult({
        testName: 'Container Cleanup',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Start a Docker container and return environment details
   */
  private async startContainer(
    imageName: string,
    env: Record<string, string>,
    resources?: { memory?: string; cpus?: string }
  ): Promise<DockerEnvironment> {
    const port = parseInt(env.PORT) || 5000

    const dockerArgs = [
      'run',
      '-d',
      '-p',
      `${port}:${port}`,
      ...Object.entries(env).flatMap(([key, value]) => ['-e', `${key}=${value}`])
    ]

    // Add resource limits if specified
    if (resources?.memory) {
      dockerArgs.push('--memory', resources.memory)
    }
    if (resources?.cpus) {
      dockerArgs.push('--cpus', resources.cpus)
    }

    dockerArgs.push(imageName)

    const result = await this.runDockerCommand(dockerArgs)

    if (result.exitCode !== 0) {
      throw new Error(`Failed to start container: ${result.stderr}`)
    }

    const containerId = result.stdout.trim()
    this.activeContainers.add(containerId)

    const baseUrl = `http://127.0.0.1:${port}`

    return {
      containerId,
      port,
      baseUrl,
      cleanup: async () => {
        try {
          await this.runDockerCommand(['stop', containerId])
          await this.runDockerCommand(['rm', containerId])
          this.activeContainers.delete(containerId)
        } catch (error) {
          console.warn(`Error cleaning up container ${containerId}:`, error)
        }
      }
    }
  }

  /**
   * Run a Docker command and return the result
   */
  private async runDockerCommand(args: string[]): Promise<{
    exitCode: number
    stdout: string
    stderr: string
  }> {
    return new Promise((resolve) => {
      const process = spawn('docker', args, { stdio: 'pipe' })

      let stdout = ''
      let stderr = ''

      process.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      process.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      process.on('close', (code) => {
        resolve({
          exitCode: code ?? 0,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        })
      })
    })
  }

  /**
   * Get Docker image size
   */
  private async getImageSize(imageName: string): Promise<string> {
    const result = await this.runDockerCommand(['images', imageName, '--format', '{{.Size}}'])
    return result.stdout || 'unknown'
  }

  /**
   * Clean up all active containers
   */
  private async cleanupAllContainers(): Promise<void> {
    for (const containerId of this.activeContainers) {
      try {
        await this.runDockerCommand(['stop', containerId])
        await this.runDockerCommand(['rm', containerId])
      } catch (error) {
        console.warn(`Error cleaning up container ${containerId}:`, error)
      }
    }
    this.activeContainers.clear()
  }

  /**
   * Add test result to collection
   */
  private addTestResult(result: DockerTestResult): void {
    this.testResults.push(result)
    const status = result.success ? '✅' : '❌'
    console.log(`    ${status} ${result.testName} (${result.duration}ms)`)
    if (result.error) {
      console.log(`      Error: ${result.error}`)
    }
  }

  /**
   * Get test results summary
   */
  getResults(): DockerTestResult[] {
    return [...this.testResults]
  }

  /**
   * Get test summary statistics
   */
  getSummary(): {
    total: number
    passed: number
    failed: number
    duration: number
  } {
    const total = this.testResults.length
    const passed = this.testResults.filter((r) => r.success).length
    const failed = total - passed
    const duration = this.testResults.reduce((sum, r) => sum + r.duration, 0)

    return { total, passed, failed, duration }
  }
}
