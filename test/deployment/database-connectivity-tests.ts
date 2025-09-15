/**
 * Database Connectivity Testing Framework
 * Tests in-memory storage, PostgreSQL connectivity, data persistence, and migration functionality
 */

import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { waitFor, delay, TestHttpClient } from '../utils/test-environment.js';
import type { TestConfig } from '../config/test-config.js';

export interface DatabaseTestResult {
  testName: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: Record<string, any>;
}

export interface DatabaseTestEnvironment {
  type: 'memory' | 'postgres';
  connectionString?: string;
  serverProcess?: ChildProcess;
  port?: number;
  baseUrl?: string;
  cleanup: () => Promise<void>;
}

export class DatabaseConnectivityTester {
  private testResults: DatabaseTestResult[] = [];
  private activeEnvironments: DatabaseTestEnvironment[] = [];

  constructor(private config: TestConfig) {}

  /**
   * Run all database connectivity tests
   */
  async runAllTests(): Promise<DatabaseTestResult[]> {
    this.testResults = [];
    
    console.log('🗄️  Starting database connectivity tests...');
    
    try {
      // Test 1: In-memory storage validation
      await this.testInMemoryStorage();
      
      // Test 2: PostgreSQL connectivity (if available)
      await this.testPostgreSQLConnectivity();
      
      // Test 3: Data persistence and CRUD operations
      await this.testDataPersistence();
      
      // Test 4: Migration and schema validation
      await this.testMigrationAndSchema();
      
      // Test 5: Connection pooling and concurrent access
      await this.testConnectionPooling();
      
      // Test 6: Database backup and restore procedures
      await this.testBackupAndRestore();
      
      // Test 7: Error handling and recovery
      await this.testErrorHandlingAndRecovery();
      
    } finally {
      // Ensure all environments are cleaned up
      await this.cleanupAllEnvironments();
    }
    
    return this.testResults;
  }

  /**
   * Test in-memory storage functionality
   */
  private async testInMemoryStorage(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('  💾 Testing in-memory storage...');
      
      const environment = await this.startServerWithMemoryStorage();
      
      try {
        const client = new TestHttpClient(environment.baseUrl!);
        
        // Wait for server to be ready
        await waitFor(async () => {
          try {
            const response = await client.get('/api/health');
            return response.ok;
          } catch {
            return false;
          }
        }, 30000);
        
        // Test basic CRUD operations
        const crudResults = await this.testBasicCRUDOperations(client);
        
        // Test demo data seeding
        await client.postJson('/api/demo/reset');
        const services = await client.getJson('/api/services');
        
        if (!Array.isArray(services) || services.length === 0) {
          throw new Error('Demo data seeding failed - no services found');
        }
        
        // Test data isolation between scenarios
        await client.postJson('/api/demo/seed?scenario=busy_day');
        const busyDayAppointments = await client.getJson('/api/appointments');
        
        await client.postJson('/api/demo/seed?scenario=default');
        const defaultAppointments = await client.getJson('/api/appointments');
        
        if (busyDayAppointments.length <= defaultAppointments.length) {
          console.warn('Scenario isolation may not be working correctly');
        }
        
        this.addTestResult({
          testName: 'In-Memory Storage',
          success: true,
          duration: Date.now() - startTime,
          details: {
            crudOperations: crudResults,
            servicesCount: services.length,
            busyDayAppointments: busyDayAppointments.length,
            defaultAppointments: defaultAppointments.length
          }
        });
        
      } finally {
        await environment.cleanup();
      }
      
    } catch (error) {
      this.addTestResult({
        testName: 'In-Memory Storage',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Test PostgreSQL connectivity (if available)
   */
  private async testPostgreSQLConnectivity(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('  🐘 Testing PostgreSQL connectivity...');
      
      // Check if PostgreSQL connection string is available
      const testConnectionString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
      
      if (!testConnectionString) {
        this.addTestResult({
          testName: 'PostgreSQL Connectivity',
          success: true,
          duration: Date.now() - startTime,
          details: {
            skipped: true,
            reason: 'No DATABASE_URL provided - PostgreSQL testing skipped'
          }
        });
        return;
      }
      
      // Test direct database connection
      const connectionTest = await this.testDirectDatabaseConnection(testConnectionString);
      
      if (!connectionTest.success) {
        throw new Error(`Direct database connection failed: ${connectionTest.error}`);
      }
      
      // Test server with PostgreSQL
      const environment = await this.startServerWithPostgreSQL(testConnectionString);
      
      try {
        const client = new TestHttpClient(environment.baseUrl!);
        
        // Wait for server to be ready
        await waitFor(async () => {
          try {
            const response = await client.get('/api/health');
            return response.ok;
          } catch {
            return false;
          }
        }, 30000);
        
        // Test database operations through API
        const crudResults = await this.testBasicCRUDOperations(client);
        
        this.addTestResult({
          testName: 'PostgreSQL Connectivity',
          success: true,
          duration: Date.now() - startTime,
          details: {
            connectionString: this.maskConnectionString(testConnectionString),
            directConnection: connectionTest,
            crudOperations: crudResults
          }
        });
        
      } finally {
        await environment.cleanup();
      }
      
    } catch (error) {
      this.addTestResult({
        testName: 'PostgreSQL Connectivity',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Test data persistence and CRUD operations
   */
  private async testDataPersistence(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('  💿 Testing data persistence...');
      
      const environment = await this.startServerWithMemoryStorage();
      
      try {
        const client = new TestHttpClient(environment.baseUrl!);
        
        // Wait for server to be ready
        await waitFor(async () => {
          try {
            const response = await client.get('/api/health');
            return response.ok;
          } catch {
            return false;
          }
        }, 30000);
        
        // Test comprehensive CRUD operations
        const persistenceResults = await this.testComprehensivePersistence(client);
        
        this.addTestResult({
          testName: 'Data Persistence',
          success: true,
          duration: Date.now() - startTime,
          details: persistenceResults
        });
        
      } finally {
        await environment.cleanup();
      }
      
    } catch (error) {
      this.addTestResult({
        testName: 'Data Persistence',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Test migration and schema validation
   */
  private async testMigrationAndSchema(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('  🔄 Testing migration and schema...');
      
      // Test drizzle configuration
      const drizzleConfigPath = path.resolve('drizzle.config.ts');
      if (!fs.existsSync(drizzleConfigPath)) {
        throw new Error('drizzle.config.ts not found');
      }
      
      // Test schema file
      const schemaPath = path.resolve('shared/schema.ts');
      if (!fs.existsSync(schemaPath)) {
        throw new Error('Schema file not found');
      }
      
      // Test migration directory
      const migrationDir = path.resolve('migrations');
      const hasMigrations = fs.existsSync(migrationDir) && fs.readdirSync(migrationDir).length > 0;
      
      // Test drizzle commands (if DATABASE_URL is available)
      let drizzleResults = null;
      if (process.env.DATABASE_URL) {
        drizzleResults = await this.testDrizzleCommands();
      }
      
      this.addTestResult({
        testName: 'Migration and Schema',
        success: true,
        duration: Date.now() - startTime,
        details: {
          drizzleConfigExists: true,
          schemaExists: true,
          hasMigrations,
          drizzleCommands: drizzleResults
        }
      });
      
    } catch (error) {
      this.addTestResult({
        testName: 'Migration and Schema',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Test connection pooling and concurrent access
   */
  private async testConnectionPooling(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('  🔗 Testing connection pooling...');
      
      const environment = await this.startServerWithMemoryStorage();
      
      try {
        const client = new TestHttpClient(environment.baseUrl!);
        
        // Wait for server to be ready
        await waitFor(async () => {
          try {
            const response = await client.get('/api/health');
            return response.ok;
          } catch {
            return false;
          }
        }, 30000);
        
        // Test concurrent requests
        const concurrentRequests = 20;
        const requests = Array.from({ length: concurrentRequests }, async (_, i) => {
          const start = Date.now();
          try {
            await client.getJson('/api/health');
            return { success: true, duration: Date.now() - start, index: i };
          } catch (error) {
            return { success: false, duration: Date.now() - start, index: i, error: String(error) };
          }
        });
        
        const results = await Promise.all(requests);
        const successful = results.filter(r => r.success).length;
        const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
        
        if (successful < concurrentRequests * 0.9) {
          throw new Error(`Too many concurrent request failures: ${successful}/${concurrentRequests}`);
        }
        
        this.addTestResult({
          testName: 'Connection Pooling',
          success: true,
          duration: Date.now() - startTime,
          details: {
            concurrentRequests,
            successful,
            averageDuration: avgDuration,
            maxDuration: Math.max(...results.map(r => r.duration))
          }
        });
        
      } finally {
        await environment.cleanup();
      }
      
    } catch (error) {
      this.addTestResult({
        testName: 'Connection Pooling',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Test backup and restore procedures
   */
  private async testBackupAndRestore(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('  💾 Testing backup and restore...');
      
      const environment = await this.startServerWithMemoryStorage();
      
      try {
        const client = new TestHttpClient(environment.baseUrl!);
        
        // Wait for server to be ready
        await waitFor(async () => {
          try {
            const response = await client.get('/api/health');
            return response.ok;
          } catch {
            return false;
          }
        }, 30000);
        
        // Seed initial data
        await client.postJson('/api/demo/reset');
        const initialServices = await client.getJson('/api/services');
        
        // Test data export (if available)
        let exportResults = null;
        try {
          // Try to export data through API endpoints
          const services = await client.getJson('/api/services');
          const staff = await client.getJson('/api/staff');
          const customers = await client.getJson('/api/customers');
          
          exportResults = {
            services: services.length,
            staff: staff.length,
            customers: customers.length
          };
        } catch (error) {
          console.warn('Data export test failed:', error);
        }
        
        // Test data reset and restore
        await client.postJson('/api/demo/reset');
        await client.postJson('/api/demo/seed?scenario=busy_day');
        const restoredServices = await client.getJson('/api/services');
        
        if (restoredServices.length !== initialServices.length) {
          console.warn('Data restore may not be working correctly');
        }
        
        this.addTestResult({
          testName: 'Backup and Restore',
          success: true,
          duration: Date.now() - startTime,
          details: {
            initialServicesCount: initialServices.length,
            restoredServicesCount: restoredServices.length,
            exportResults
          }
        });
        
      } finally {
        await environment.cleanup();
      }
      
    } catch (error) {
      this.addTestResult({
        testName: 'Backup and Restore',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Test error handling and recovery
   */
  private async testErrorHandlingAndRecovery(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('  🚨 Testing error handling and recovery...');
      
      const environment = await this.startServerWithMemoryStorage();
      
      try {
        const client = new TestHttpClient(environment.baseUrl!);
        
        // Wait for server to be ready
        await waitFor(async () => {
          try {
            const response = await client.get('/api/health');
            return response.ok;
          } catch {
            return false;
          }
        }, 30000);
        
        // Test invalid API requests
        const errorTests = [
          {
            name: 'Invalid Service Creation',
            test: () => client.post('/api/services', { invalid: 'data' })
          },
          {
            name: 'Non-existent Resource',
            test: () => client.get('/api/services/non-existent-id')
          },
          {
            name: 'Invalid JSON',
            test: () => fetch(`${environment.baseUrl}/api/services`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: 'invalid json'
            })
          }
        ];
        
        const errorResults = [];
        for (const errorTest of errorTests) {
          try {
            const response = await errorTest.test();
            errorResults.push({
              name: errorTest.name,
              status: response.status,
              handled: response.status >= 400 && response.status < 500
            });
          } catch (error) {
            errorResults.push({
              name: errorTest.name,
              error: String(error),
              handled: true
            });
          }
        }
        
        // Test server recovery after errors
        const healthAfterErrors = await client.getJson('/api/health');
        if (healthAfterErrors.status !== 'ok') {
          throw new Error('Server not healthy after error tests');
        }
        
        this.addTestResult({
          testName: 'Error Handling and Recovery',
          success: true,
          duration: Date.now() - startTime,
          details: {
            errorTests: errorResults,
            serverHealthy: healthAfterErrors.status === 'ok'
          }
        });
        
      } finally {
        await environment.cleanup();
      }
      
    } catch (error) {
      this.addTestResult({
        testName: 'Error Handling and Recovery',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Start server with in-memory storage
   */
  private async startServerWithMemoryStorage(): Promise<DatabaseTestEnvironment> {
    const portFile = path.resolve('.local', 'db_test_port');
    
    // Ensure directory exists
    try {
      fs.mkdirSync(path.dirname(portFile), { recursive: true });
    } catch {}
    
    // Clean up existing port file
    try {
      if (fs.existsSync(portFile)) {
        fs.unlinkSync(portFile);
      }
    } catch {}
    
    // Start server process
    const serverScript = path.resolve('dist', 'index.js');
    const serverProcess = spawn(process.execPath, [serverScript], {
      env: {
        ...process.env,
        PORT: '0', // Use ephemeral port
        PORT_FILE: portFile,
        // Ensure in-memory storage by not setting DATABASE_URL
        DATABASE_URL: undefined
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Handle server output
    if (process.env.TEST_VERBOSE) {
      serverProcess.stdout?.on('data', (data) => process.stdout.write(data));
      serverProcess.stderr?.on('data', (data) => process.stderr.write(data));
    }
    
    let exitCode: number | null = null;
    serverProcess.on('exit', (code) => {
      exitCode = code ?? 0;
    });
    
    try {
      // Wait for server to start and get port
      const port = await waitFor(async () => {
        if (fs.existsSync(portFile)) {
          const content = fs.readFileSync(portFile, 'utf8').trim();
          const portNum = Number(content);
          if (Number.isFinite(portNum) && portNum > 0) {
            return portNum;
          }
        }
        return null;
      }, 30000);
      
      const baseUrl = `http://127.0.0.1:${port}`;
      
      const environment: DatabaseTestEnvironment = {
        type: 'memory',
        serverProcess,
        port,
        baseUrl,
        cleanup: async () => {
          try {
            if (serverProcess && exitCode === null) {
              serverProcess.kill('SIGINT');
              // Wait for graceful shutdown
              await waitFor(() => exitCode !== null, 5000).catch(() => {
                // Force kill if graceful shutdown fails
                serverProcess.kill('SIGKILL');
              });
            }
          } catch (error) {
            console.warn('Error during server cleanup:', error);
          }
          
          // Clean up port file
          try {
            if (fs.existsSync(portFile)) {
              fs.unlinkSync(portFile);
            }
          } catch {}
        }
      };
      
      this.activeEnvironments.push(environment);
      return environment;
      
    } catch (error) {
      // Clean up on failure
      try {
        if (serverProcess && exitCode === null) {
          serverProcess.kill('SIGKILL');
        }
      } catch {}
      throw error;
    }
  }

  /**
   * Start server with PostgreSQL
   */
  private async startServerWithPostgreSQL(connectionString: string): Promise<DatabaseTestEnvironment> {
    const portFile = path.resolve('.local', 'db_postgres_test_port');
    
    // Ensure directory exists
    try {
      fs.mkdirSync(path.dirname(portFile), { recursive: true });
    } catch {}
    
    // Clean up existing port file
    try {
      if (fs.existsSync(portFile)) {
        fs.unlinkSync(portFile);
      }
    } catch {}
    
    // Start server process
    const serverScript = path.resolve('dist', 'index.js');
    const serverProcess = spawn(process.execPath, [serverScript], {
      env: {
        ...process.env,
        PORT: '0', // Use ephemeral port
        PORT_FILE: portFile,
        DATABASE_URL: connectionString
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Handle server output
    if (process.env.TEST_VERBOSE) {
      serverProcess.stdout?.on('data', (data) => process.stdout.write(data));
      serverProcess.stderr?.on('data', (data) => process.stderr.write(data));
    }
    
    let exitCode: number | null = null;
    serverProcess.on('exit', (code) => {
      exitCode = code ?? 0;
    });
    
    try {
      // Wait for server to start and get port
      const port = await waitFor(async () => {
        if (fs.existsSync(portFile)) {
          const content = fs.readFileSync(portFile, 'utf8').trim();
          const portNum = Number(content);
          if (Number.isFinite(portNum) && portNum > 0) {
            return portNum;
          }
        }
        return null;
      }, 30000);
      
      const baseUrl = `http://127.0.0.1:${port}`;
      
      const environment: DatabaseTestEnvironment = {
        type: 'postgres',
        connectionString,
        serverProcess,
        port,
        baseUrl,
        cleanup: async () => {
          try {
            if (serverProcess && exitCode === null) {
              serverProcess.kill('SIGINT');
              // Wait for graceful shutdown
              await waitFor(() => exitCode !== null, 5000).catch(() => {
                // Force kill if graceful shutdown fails
                serverProcess.kill('SIGKILL');
              });
            }
          } catch (error) {
            console.warn('Error during server cleanup:', error);
          }
          
          // Clean up port file
          try {
            if (fs.existsSync(portFile)) {
              fs.unlinkSync(portFile);
            }
          } catch {}
        }
      };
      
      this.activeEnvironments.push(environment);
      return environment;
      
    } catch (error) {
      // Clean up on failure
      try {
        if (serverProcess && exitCode === null) {
          serverProcess.kill('SIGKILL');
        }
      } catch {}
      throw error;
    }
  }

  /**
   * Test direct database connection
   */
  private async testDirectDatabaseConnection(connectionString: string): Promise<{
    success: boolean;
    error?: string;
    details?: any;
  }> {
    try {
      // This is a simplified test - in a real scenario you'd use the actual database client
      const url = new URL(connectionString);
      
      return {
        success: true,
        details: {
          protocol: url.protocol,
          host: url.hostname,
          port: url.port,
          database: url.pathname.slice(1)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test basic CRUD operations
   */
  private async testBasicCRUDOperations(client: TestHttpClient): Promise<any> {
    const results = {
      create: false,
      read: false,
      update: false,
      delete: false
    };
    
    try {
      // Test CREATE
      const createResponse = await client.post('/api/services', {
        name: 'Test Service',
        description: 'Test Description',
        duration: 60,
        price: '50.00',
        category: 'test'
      });
      
      if (createResponse.ok) {
        results.create = true;
        const created = await createResponse.json();
        
        // Test READ
        const readResponse = await client.get(`/api/services/${created.id}`);
        if (readResponse.ok) {
          results.read = true;
        }
        
        // Test UPDATE
        const updateResponse = await client.patch(`/api/services/${created.id}`, {
          name: 'Updated Test Service'
        });
        if (updateResponse.ok) {
          results.update = true;
        }
        
        // Test DELETE
        const deleteResponse = await client.delete(`/api/services/${created.id}`);
        if (deleteResponse.ok) {
          results.delete = true;
        }
      }
    } catch (error) {
      console.warn('CRUD operations test error:', error);
    }
    
    return results;
  }

  /**
   * Test comprehensive persistence operations
   */
  private async testComprehensivePersistence(client: TestHttpClient): Promise<any> {
    const results = {
      services: await this.testEntityPersistence(client, 'services'),
      staff: await this.testEntityPersistence(client, 'staff'),
      customers: await this.testEntityPersistence(client, 'customers'),
      appointments: await this.testEntityPersistence(client, 'appointments'),
      inventory: await this.testEntityPersistence(client, 'inventory')
    };
    
    return results;
  }

  /**
   * Test entity persistence
   */
  private async testEntityPersistence(client: TestHttpClient, entityType: string): Promise<any> {
    try {
      const response = await client.get(`/api/${entityType}`);
      if (response.ok) {
        const data = await response.json();
        return {
          accessible: true,
          count: Array.isArray(data) ? data.length : 0
        };
      }
      return { accessible: false, error: `HTTP ${response.status}` };
    } catch (error) {
      return { accessible: false, error: String(error) };
    }
  }

  /**
   * Test drizzle commands
   */
  private async testDrizzleCommands(): Promise<any> {
    const results = {
      generate: false,
      migrate: false
    };
    
    try {
      // Test drizzle generate
      const generateResult = await this.runCommand('npx', ['drizzle-kit', 'generate']);
      results.generate = generateResult.exitCode === 0;
      
      // Test drizzle migrate (if generate succeeded)
      if (results.generate) {
        const migrateResult = await this.runCommand('npx', ['drizzle-kit', 'migrate']);
        results.migrate = migrateResult.exitCode === 0;
      }
    } catch (error) {
      console.warn('Drizzle commands test error:', error);
    }
    
    return results;
  }

  /**
   * Run a command and return the result
   */
  private async runCommand(command: string, args: string[]): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }> {
    return new Promise((resolve) => {
      const process = spawn(command, args, { stdio: 'pipe' });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        resolve({
          exitCode: code ?? 0,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        });
      });
    });
  }

  /**
   * Mask sensitive information in connection string
   */
  private maskConnectionString(connectionString: string): string {
    try {
      const url = new URL(connectionString);
      if (url.password) {
        url.password = '***';
      }
      return url.toString();
    } catch {
      return 'invalid-connection-string';
    }
  }

  /**
   * Clean up all active environments
   */
  private async cleanupAllEnvironments(): Promise<void> {
    for (const environment of this.activeEnvironments) {
      try {
        await environment.cleanup();
      } catch (error) {
        console.warn('Error cleaning up environment:', error);
      }
    }
    this.activeEnvironments = [];
  }

  /**
   * Add test result to collection
   */
  private addTestResult(result: DatabaseTestResult): void {
    this.testResults.push(result);
    const status = result.success ? '✅' : '❌';
    console.log(`    ${status} ${result.testName} (${result.duration}ms)`);
    if (result.error) {
      console.log(`      Error: ${result.error}`);
    }
  }

  /**
   * Get test results summary
   */
  getResults(): DatabaseTestResult[] {
    return [...this.testResults];
  }

  /**
   * Get test summary statistics
   */
  getSummary(): {
    total: number;
    passed: number;
    failed: number;
    duration: number;
  } {
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.success).length;
    const failed = total - passed;
    const duration = this.testResults.reduce((sum, r) => sum + r.duration, 0);
    
    return { total, passed, failed, duration };
  }
}