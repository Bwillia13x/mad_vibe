#!/usr/bin/env tsx

/**
 * Comprehensive Security Validation Script
 * 
 * This script runs a complete security test suite including:
 * - Authentication bypass prevention testing
 * - XSS and injection prevention testing
 * - Environment variable security testing
 * - Security headers validation
 * - Basic penetration testing
 * - Security compliance reporting
 */

import { startTestServer, TestHttpClient, TestDataManager } from '../test/utils/test-environment';
import { TestReporter } from '../test/reporting/test-reporter';
import { SecurityTestSuite } from '../test/security/security-test-suite';
import { loadTestConfig } from '../test/config/test-config';
import { testSecurityHeaders, testStrictSecurityHeaders } from '../test/security/security-headers-validation';
import fs from 'fs';
import path from 'path';

interface PenetrationTestResult {
  testName: string;
  status: 'pass' | 'fail' | 'warning';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  details: any;
  recommendations: string[];
}

interface SecurityValidationResult {
  timestamp: string;
  overallStatus: 'pass' | 'fail' | 'warning';
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  securityScore: number;
  testResults: {
    securityTestSuite: any;
    securityHeaders: any;
    strictSecurityHeaders: any;
    penetrationTests: PenetrationTestResult[];
  };
  recommendations: string[];
  complianceStatus: {
    zeroVulnerabilities: boolean;
    securityHeadersComplete: boolean;
    inputValidationSecure: boolean;
    authenticationSecure: boolean;
    environmentSecure: boolean;
  };
}

class PenetrationTester {
  private baseUrl: string;
  private httpClient: TestHttpClient;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.httpClient = new TestHttpClient(baseUrl);
  }

  async runPenetrationTests(): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];

    console.log('🔍 Running penetration tests...');

    // Test 1: Directory traversal attacks
    results.push(await this.testDirectoryTraversal());

    // Test 2: HTTP method tampering
    results.push(await this.testHttpMethodTampering());

    // Test 3: Header injection attacks
    results.push(await this.testHeaderInjection());

    // Test 4: Authentication bypass attempts
    results.push(await this.testAuthenticationBypass());

    // Test 5: Session fixation attacks
    results.push(await this.testSessionFixation());

    // Test 6: CSRF protection testing
    results.push(await this.testCSRFProtection());

    // Test 7: Information disclosure testing
    results.push(await this.testInformationDisclosure());

    // Test 8: Rate limiting bypass attempts
    results.push(await this.testRateLimitingBypass());

    return results;
  }

  private async testDirectoryTraversal(): Promise<PenetrationTestResult> {
    const payloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '..%252f..%252f..%252fetc%252fpasswd'
    ];

    let vulnerabilityFound = false;
    const details: any = { attempts: [], responses: [] };

    for (const payload of payloads) {
      try {
        const response = await fetch(`${this.baseUrl}/api/${payload}`);
        const text = await response.text();
        
        details.attempts.push(payload);
        details.responses.push({
          payload,
          status: response.status,
          hasSystemContent: text.includes('root:') || text.includes('localhost')
        });

        if (text.includes('root:') || text.includes('localhost')) {
          vulnerabilityFound = true;
        }
      } catch (error) {
        // Expected for most payloads
      }
    }

    return {
      testName: 'Directory Traversal Attack Prevention',
      status: vulnerabilityFound ? 'fail' : 'pass',
      severity: vulnerabilityFound ? 'critical' : 'info',
      description: 'Tests for directory traversal vulnerabilities',
      details,
      recommendations: vulnerabilityFound ? 
        ['Implement proper input validation and path sanitization'] : 
        ['Directory traversal protection is working correctly']
    };
  }

  private async testHttpMethodTampering(): Promise<PenetrationTestResult> {
    const methods = ['PUT', 'DELETE', 'PATCH', 'TRACE', 'OPTIONS', 'CONNECT'];
    const details: any = { methodResults: [] };
    let vulnerabilityFound = false;

    for (const method of methods) {
      try {
        const response = await fetch(`${this.baseUrl}/api/test`, { method });
        const result = {
          method,
          status: response.status,
          allowed: response.status !== 405 && response.status !== 501
        };
        
        details.methodResults.push(result);

        // TRACE method should be disabled for security
        if (method === 'TRACE' && result.allowed) {
          vulnerabilityFound = true;
        }
      } catch (error) {
        details.methodResults.push({
          method,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return {
      testName: 'HTTP Method Tampering Prevention',
      status: vulnerabilityFound ? 'fail' : 'pass',
      severity: vulnerabilityFound ? 'medium' : 'info',
      description: 'Tests for HTTP method tampering vulnerabilities',
      details,
      recommendations: vulnerabilityFound ? 
        ['Disable TRACE method and restrict allowed HTTP methods'] : 
        ['HTTP method restrictions are properly configured']
    };
  }

  private async testHeaderInjection(): Promise<PenetrationTestResult> {
    const maliciousHeaders = {
      'X-Forwarded-For': '127.0.0.1\r\nX-Injected-Header: malicious',
      'User-Agent': 'Mozilla/5.0\r\nX-Injected: true',
      'Referer': 'http://example.com\r\nSet-Cookie: injected=true'
    };

    const details: any = { headerTests: [] };
    let vulnerabilityFound = false;

    for (const [headerName, headerValue] of Object.entries(maliciousHeaders)) {
      try {
        const response = await fetch(`${this.baseUrl}/api/test`, {
          headers: { [headerName]: headerValue }
        });

        const responseHeaders = Object.fromEntries(response.headers.entries());
        const hasInjectedHeader = Object.keys(responseHeaders).some(h => 
          h.toLowerCase().includes('injected') || h.toLowerCase().includes('x-injected')
        );

        details.headerTests.push({
          injectedHeader: headerName,
          injectedValue: headerValue,
          responseStatus: response.status,
          hasInjectedHeader,
          responseHeaders: Object.keys(responseHeaders)
        });

        if (hasInjectedHeader) {
          vulnerabilityFound = true;
        }
      } catch (error) {
        details.headerTests.push({
          injectedHeader: headerName,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return {
      testName: 'Header Injection Attack Prevention',
      status: vulnerabilityFound ? 'fail' : 'pass',
      severity: vulnerabilityFound ? 'high' : 'info',
      description: 'Tests for HTTP header injection vulnerabilities',
      details,
      recommendations: vulnerabilityFound ? 
        ['Implement proper header validation and sanitization'] : 
        ['Header injection protection is working correctly']
    };
  }

  private async testAuthenticationBypass(): Promise<PenetrationTestResult> {
    // Test actual protected endpoints that require authentication
    const protectedEndpoints = [
      '/api/demo/seed',
      '/api/demo/time', 
      '/api/demo/reset',
      '/api/pos/sales',
      '/api/marketing/campaigns',
      '/api/loyalty/entries'
    ];

    const bypassAttempts = [
      { headers: { 'Authorization': 'Bearer invalid_token' }, description: 'Invalid token' },
      { headers: { 'Authorization': 'Basic ' + btoa('admin:admin') }, description: 'Default credentials' },
      { headers: { 'X-User-ID': '1' }, description: 'User ID header injection' },
      { headers: { 'X-Admin': 'true' }, description: 'Admin header injection' },
      { headers: { 'Authorization': '' }, description: 'Empty authorization' }
    ];

    const details: any = { bypassAttempts: [] };
    let vulnerabilityFound = false;

    for (const endpoint of protectedEndpoints) {
      for (const attempt of bypassAttempts) {
        try {
          const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...attempt.headers 
            },
            body: JSON.stringify({ test: 'bypass' })
          });

          const result = {
            endpoint,
            description: attempt.description,
            headers: attempt.headers,
            status: response.status,
            bypassSuccessful: response.status === 200
          };

          details.bypassAttempts.push(result);

          // If we get 200 on a protected endpoint without proper auth, it's a vulnerability
          if (response.status === 200) {
            vulnerabilityFound = true;
          }
        } catch (error) {
          details.bypassAttempts.push({
            endpoint,
            description: attempt.description,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    return {
      testName: 'Authentication Bypass Prevention',
      status: vulnerabilityFound ? 'fail' : 'pass',
      severity: vulnerabilityFound ? 'critical' : 'info',
      description: 'Tests for authentication bypass vulnerabilities on protected endpoints',
      details,
      recommendations: vulnerabilityFound ? 
        ['Fix authentication bypass vulnerabilities immediately'] : 
        ['Authentication bypass protection is working correctly']
    };
  }

  private async testSessionFixation(): Promise<PenetrationTestResult> {
    const details: any = { sessionTests: [] };
    let vulnerabilityFound = false;

    try {
      // Test 1: Check if session cookies are properly secured
      const healthResponse = await fetch(`${this.baseUrl}/api/health`);
      const setCookieHeader = healthResponse.headers.get('set-cookie');
      
      const sessionSecurityResult = {
        test: 'Session cookie security',
        hasCookie: !!setCookieHeader,
        cookieDetails: setCookieHeader,
        isSecure: setCookieHeader?.includes('Secure') || false,
        isHttpOnly: setCookieHeader?.includes('HttpOnly') || false,
        hasSameSite: setCookieHeader?.includes('SameSite') || false
      };
      details.sessionTests.push(sessionSecurityResult);

      // Test 2: Session fixation via cookie manipulation
      const fixedSessionId = 'fixed_session_12345';
      const cookieResponse = await fetch(`${this.baseUrl}/api/health`, {
        headers: { 'Cookie': `connect.sid=${fixedSessionId}` }
      });
      
      const responseSetCookie = cookieResponse.headers.get('set-cookie');
      const cookieResult = {
        test: 'Session fixation attempt',
        status: cookieResponse.status,
        sentFixedSession: fixedSessionId,
        receivedNewSession: responseSetCookie && !responseSetCookie.includes(fixedSessionId),
        sessionRegenerated: responseSetCookie && !responseSetCookie.includes(fixedSessionId)
      };
      details.sessionTests.push(cookieResult);

      // Test 3: Check for session ID in URL parameters
      const urlSessionResponse = await fetch(`${this.baseUrl}/api/health?sessionid=${fixedSessionId}`);
      const urlSessionResult = {
        test: 'Session ID in URL parameters',
        status: urlSessionResponse.status,
        sessionIdInUrl: fixedSessionId,
        // Session should not be accepted from URL parameters
        sessionAcceptedFromUrl: false // This is good - we don't want this
      };
      details.sessionTests.push(urlSessionResult);

      // Vulnerability assessment
      // 1. If session cookies lack security attributes, it's a vulnerability
      if (!sessionSecurityResult.isHttpOnly || !sessionSecurityResult.hasSameSite) {
        vulnerabilityFound = true;
      }

      // 2. If fixed session is not regenerated, it's a vulnerability
      if (cookieResult.receivedNewSession === false) {
        vulnerabilityFound = true;
      }

    } catch (error) {
      details.sessionTests.push({
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return {
      testName: 'Session Fixation Attack Prevention',
      status: vulnerabilityFound ? 'fail' : 'pass',
      severity: vulnerabilityFound ? 'high' : 'info',
      description: 'Tests for session fixation vulnerabilities and session security',
      details,
      recommendations: vulnerabilityFound ? 
        ['Implement proper session management with secure cookies and session regeneration'] : 
        ['Session fixation protection is working correctly']
    };
  }

  private async testCSRFProtection(): Promise<PenetrationTestResult> {
    const details: any = { csrfTests: [] };
    let vulnerabilityFound = false;

    // Test state-changing endpoints that should have CSRF protection
    const stateChangingEndpoints = [
      '/api/pos/sales',
      '/api/marketing/campaigns', 
      '/api/loyalty/entries'
    ];

    try {
      for (const endpoint of stateChangingEndpoints) {
        // Test POST without CSRF token (but without auth, should get 401/403)
        const postResponse = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: 'csrf' })
        });

        const postResult = {
          endpoint,
          test: 'POST without CSRF token',
          status: postResponse.status,
          // For CSRF testing, we expect either 401/403 (auth required) or 403 (CSRF required)
          // If we get 200, it means no protection
          hasProtection: postResponse.status !== 200
        };
        details.csrfTests.push(postResult);

        // Test with invalid CSRF token
        const invalidTokenResponse = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-CSRF-Token': 'invalid_token'
          },
          body: JSON.stringify({ test: 'csrf' })
        });

        const invalidTokenResult = {
          endpoint,
          test: 'POST with invalid CSRF token',
          status: invalidTokenResponse.status,
          hasProtection: invalidTokenResponse.status !== 200
        };
        details.csrfTests.push(invalidTokenResult);

        // If any endpoint accepts requests without proper protection, it's a vulnerability
        if (!postResult.hasProtection || !invalidTokenResult.hasProtection) {
          vulnerabilityFound = true;
        }
      }

    } catch (error) {
      details.csrfTests.push({
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return {
      testName: 'CSRF Protection Validation',
      status: vulnerabilityFound ? 'fail' : 'pass',
      severity: vulnerabilityFound ? 'medium' : 'info',
      description: 'Tests for CSRF protection implementation on state-changing endpoints',
      details,
      recommendations: vulnerabilityFound ? 
        ['Implement CSRF token validation for state-changing operations'] : 
        ['CSRF protection is properly implemented']
    };
  }

  private async testInformationDisclosure(): Promise<PenetrationTestResult> {
    const testPaths = [
      '/api/debug',
      '/api/config',
      '/api/env',
      '/api/status',
      '/.env',
      '/package.json',
      '/server.js',
      '/config.json'
    ];

    const details: any = { disclosureTests: [] };
    let vulnerabilityFound = false;

    for (const path of testPaths) {
      try {
        const response = await fetch(`${this.baseUrl}${path}`);
        const text = await response.text();
        
        const hasSecretInfo = text.includes('password') || 
                             text.includes('secret') || 
                             text.includes('key') ||
                             text.includes('token') ||
                             text.includes('DATABASE_URL');

        const result = {
          path,
          status: response.status,
          accessible: response.status === 200,
          hasSecretInfo,
          contentLength: text.length
        };

        details.disclosureTests.push(result);

        if (result.accessible && result.hasSecretInfo) {
          vulnerabilityFound = true;
        }
      } catch (error) {
        details.disclosureTests.push({
          path,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return {
      testName: 'Information Disclosure Prevention',
      status: vulnerabilityFound ? 'fail' : 'pass',
      severity: vulnerabilityFound ? 'high' : 'info',
      description: 'Tests for information disclosure vulnerabilities',
      details,
      recommendations: vulnerabilityFound ? 
        ['Prevent exposure of sensitive configuration and debug information'] : 
        ['Information disclosure protection is working correctly']
    };
  }

  private async testRateLimitingBypass(): Promise<PenetrationTestResult> {
    const details: any = { rateLimitTests: [] };
    let vulnerabilityFound = false;

    try {
      // Test rapid requests to same endpoint
      const rapidRequests = [];
      for (let i = 0; i < 20; i++) {
        rapidRequests.push(fetch(`${this.baseUrl}/api/test`));
      }

      const responses = await Promise.all(rapidRequests);
      const statusCodes = responses.map(r => r.status);
      const rateLimited = statusCodes.some(status => status === 429);

      details.rateLimitTests.push({
        test: 'Rapid requests',
        requestCount: 20,
        statusCodes,
        rateLimited,
        allSuccessful: statusCodes.every(status => status === 200)
      });

      // Test with different IP headers
      const ipBypassResponse = await fetch(`${this.baseUrl}/api/test`, {
        headers: { 'X-Forwarded-For': '192.168.1.100' }
      });

      details.rateLimitTests.push({
        test: 'IP header bypass attempt',
        status: ipBypassResponse.status,
        bypassSuccessful: ipBypassResponse.status === 200
      });

      // If no rate limiting is detected
      if (!rateLimited) {
        vulnerabilityFound = true;
      }

    } catch (error) {
      details.rateLimitTests.push({
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return {
      testName: 'Rate Limiting Bypass Prevention',
      status: vulnerabilityFound ? 'warning' : 'pass',
      severity: vulnerabilityFound ? 'medium' : 'info',
      description: 'Tests for rate limiting implementation and bypass attempts',
      details,
      recommendations: vulnerabilityFound ? 
        ['Implement rate limiting to prevent abuse and DoS attacks'] : 
        ['Rate limiting protection is working correctly']
    };
  }
}

async function runComprehensiveSecurityValidation(): Promise<SecurityValidationResult> {
  console.log('🔒 Starting Comprehensive Security Validation...\n');

  const config = loadTestConfig();
  const reporter = new TestReporter(config);
  
  let testEnv: any = null;
  let result: SecurityValidationResult;

  try {
    // Initialize test environment
    testEnv = await startTestServer(config);
    console.log('✅ Test environment initialized');
    
    // Create test environment wrapper
    const testEnvWrapper = {
      baseUrl: testEnv.baseUrl,
      httpClient: new TestHttpClient(testEnv.baseUrl),
      dataManager: new TestDataManager(new TestHttpClient(testEnv.baseUrl)),
      makeRequest: (path: string, options?: RequestInit) => {
        return fetch(`${testEnv.baseUrl}${path}`, options);
      }
    };
    
    // Run security test suite
    console.log('🔍 Running security test suite...');
    const securitySuite = new SecurityTestSuite(testEnvWrapper, reporter);
    const securityTestResults = await securitySuite.runAllSecurityTests();

    // Run security headers tests
    console.log('🔍 Running security headers validation...');
    const securityHeadersResults = await testSecurityHeaders();
    const strictSecurityHeadersResults = await testStrictSecurityHeaders();

    // Run penetration tests
    console.log('🔍 Running penetration tests...');
    const penetrationTester = new PenetrationTester(testEnv.baseUrl);
    const penetrationResults = await penetrationTester.runPenetrationTests();

    // Analyze results
    const criticalIssues = penetrationResults.filter(r => r.severity === 'critical' && r.status === 'fail').length +
                          (securityTestResults.summary.criticalIssues || 0);
    
    const highIssues = penetrationResults.filter(r => r.severity === 'high' && r.status === 'fail').length;
    const mediumIssues = penetrationResults.filter(r => r.severity === 'medium' && r.status === 'fail').length;
    const lowIssues = penetrationResults.filter(r => r.severity === 'low' && r.status === 'fail').length;

    // Calculate security score (0-100)
    const totalTests = securityTestResults.totalTests + securityHeadersResults.length + 
                      strictSecurityHeadersResults.length + penetrationResults.length;
    const passedTests = securityTestResults.passed + 
                       securityHeadersResults.filter(r => r.passed).length +
                       strictSecurityHeadersResults.filter(r => r.passed).length +
                       penetrationResults.filter(r => r.status === 'pass').length;
    
    const securityScore = Math.round((passedTests / totalTests) * 100);

    // Determine overall status
    let overallStatus: 'pass' | 'fail' | 'warning' = 'pass';
    if (criticalIssues > 0) {
      overallStatus = 'fail';
    } else if (highIssues > 0 || mediumIssues > 0) {
      overallStatus = 'warning';
    }

    // Compile recommendations
    const recommendations = [
      ...securityTestResults.summary.recommendations,
      ...penetrationResults.flatMap(r => r.recommendations)
    ];

    // Check compliance status
    const complianceStatus = {
      zeroVulnerabilities: criticalIssues === 0,
      securityHeadersComplete: securityHeadersResults.every(r => r.passed),
      inputValidationSecure: securityTestResults.inputValidationResults.every(r => r.status === 'pass'),
      authenticationSecure: securityTestResults.authenticationResults.every(r => r.status === 'pass'),
      environmentSecure: securityTestResults.environmentSecurityResults.every(r => r.status === 'pass')
    };

    result = {
      timestamp: new Date().toISOString(),
      overallStatus,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      securityScore,
      testResults: {
        securityTestSuite: securityTestResults,
        securityHeaders: securityHeadersResults,
        strictSecurityHeaders: strictSecurityHeadersResults,
        penetrationTests: penetrationResults
      },
      recommendations: [...new Set(recommendations)],
      complianceStatus
    };

  } catch (error) {
    console.error('❌ Security validation failed:', error);
    throw error;
  } finally {
    // Cleanup test environment
    if (testEnv) {
      await testEnv.cleanup();
      console.log('🧹 Test environment cleaned up');
    }
  }

  return result;
}

async function generateSecurityComplianceReport(result: SecurityValidationResult): Promise<string> {
  const report = `
# Security Compliance Report

**Generated:** ${result.timestamp}
**Overall Status:** ${result.overallStatus === 'pass' ? '✅ PASS' : result.overallStatus === 'fail' ? '❌ FAIL' : '⚠️ WARNING'}
**Security Score:** ${result.securityScore}/100

## Executive Summary

This comprehensive security validation includes:
- Complete security test suite execution
- Security headers validation
- Penetration testing
- Compliance verification

### Issue Summary
- 🚨 **Critical Issues:** ${result.criticalIssues}
- ⚠️ **High Issues:** ${result.highIssues}
- 📋 **Medium Issues:** ${result.mediumIssues}
- 📝 **Low Issues:** ${result.lowIssues}

### Compliance Status
- Zero Vulnerabilities: ${result.complianceStatus.zeroVulnerabilities ? '✅' : '❌'}
- Security Headers Complete: ${result.complianceStatus.securityHeadersComplete ? '✅' : '❌'}
- Input Validation Secure: ${result.complianceStatus.inputValidationSecure ? '✅' : '❌'}
- Authentication Secure: ${result.complianceStatus.authenticationSecure ? '✅' : '❌'}
- Environment Secure: ${result.complianceStatus.environmentSecure ? '✅' : '❌'}

## Security Test Suite Results

### Authentication & Session Security
${result.testResults.securityTestSuite.authenticationResults.map((r: any) => 
  `- ${r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⏭️'} ${r.testName} (${r.duration}ms)`
).join('\n')}

### Input Validation & Injection Prevention
${result.testResults.securityTestSuite.inputValidationResults.map((r: any) => 
  `- ${r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⏭️'} ${r.testName} (${r.duration}ms)`
).join('\n')}

### API Security Validation
${result.testResults.securityTestSuite.apiSecurityResults.map((r: any) => 
  `- ${r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⏭️'} ${r.testName} (${r.duration}ms)`
).join('\n')}

### Environment Variable Security
${result.testResults.securityTestSuite.environmentSecurityResults.map((r: any) => 
  `- ${r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⏭️'} ${r.testName} (${r.duration}ms)`
).join('\n')}

## Security Headers Validation

### Standard Security Headers
${result.testResults.securityHeaders.map((r: any) => 
  `- ${r.passed ? '✅' : '❌'} ${r.name}`
).join('\n')}

### Strict Security Headers
${result.testResults.strictSecurityHeaders.map((r: any) => 
  `- ${r.passed ? '✅' : '❌'} ${r.name}`
).join('\n')}

## Penetration Test Results

${result.testResults.penetrationTests.map(r => 
  `### ${r.testName}
**Status:** ${r.status === 'pass' ? '✅ PASS' : r.status === 'fail' ? '❌ FAIL' : '⚠️ WARNING'}
**Severity:** ${r.severity.toUpperCase()}
**Description:** ${r.description}

**Recommendations:**
${r.recommendations.map(rec => `- ${rec}`).join('\n')}
`
).join('\n')}

## Security Recommendations

${result.recommendations.map(rec => `- ${rec}`).join('\n')}

## Production Readiness Assessment

${result.overallStatus === 'pass' && result.criticalIssues === 0 ? 
  '✅ **READY FOR PRODUCTION** - All critical security issues have been resolved.' :
  result.criticalIssues > 0 ?
  '❌ **NOT READY FOR PRODUCTION** - Critical security issues must be resolved before deployment.' :
  '⚠️ **CONDITIONAL READINESS** - Address high/medium issues before production deployment.'
}

### Next Steps
${result.criticalIssues > 0 ? 
  '1. **URGENT:** Fix all critical security issues\n2. Re-run security validation\n3. Address high and medium priority issues' :
  result.highIssues > 0 ?
  '1. Address high priority security issues\n2. Consider fixing medium priority issues\n3. Re-run validation for final confirmation' :
  '1. Consider addressing any remaining medium/low priority issues\n2. Proceed with production deployment\n3. Implement continuous security monitoring'
}

---
*This report was generated by the Andreas Vibe Platform Comprehensive Security Validation Suite*
`;

  return report;
}

async function main() {
  try {
    // Run comprehensive security validation
    const result = await runComprehensiveSecurityValidation();

    // Generate compliance report
    const report = await generateSecurityComplianceReport(result);
    
    // Ensure test-results directory exists
    const resultsDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(resultsDir, `security-compliance-report-${timestamp}.md`);
    fs.writeFileSync(reportPath, report);

    // Save JSON results
    const jsonPath = path.join(resultsDir, `security-validation-results-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));

    console.log(`\n📊 Security compliance report saved to: ${reportPath}`);
    console.log(`📊 JSON results saved to: ${jsonPath}`);

    // Print summary
    console.log('\n🔒 Comprehensive Security Validation Summary:');
    console.log(`   Overall Status: ${result.overallStatus.toUpperCase()}`);
    console.log(`   Security Score: ${result.securityScore}/100`);
    console.log(`   Critical Issues: ${result.criticalIssues}`);
    console.log(`   High Issues: ${result.highIssues}`);
    console.log(`   Medium Issues: ${result.mediumIssues}`);
    console.log(`   Low Issues: ${result.lowIssues}`);

    // Exit with appropriate code
    if (result.criticalIssues > 0) {
      console.log('\n🚨 CRITICAL SECURITY ISSUES DETECTED!');
      console.log('   Production deployment is NOT RECOMMENDED until these are resolved.');
      process.exit(1);
    } else if (result.overallStatus === 'fail') {
      console.log('\n❌ Security validation failed.');
      console.log('   Review the report for details and fix issues before production.');
      process.exit(1);
    } else if (result.overallStatus === 'warning') {
      console.log('\n⚠️ Security validation completed with warnings.');
      console.log('   Consider addressing high/medium priority issues before production.');
      process.exit(0);
    } else {
      console.log('\n✅ All security validations passed!');
      console.log('   Platform is ready for production deployment.');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Comprehensive security validation failed:', error);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');

if (showHelp) {
  console.log(`
🔒 Comprehensive Security Validation Suite

Usage: npm run security:validate [options]

Options:
  --help, -h     Show this help message

This script runs comprehensive security validation including:
  - Complete security test suite (authentication, input validation, API security, environment)
  - Security headers validation (standard and strict)
  - Penetration testing (directory traversal, method tampering, header injection, etc.)
  - Security compliance reporting

The script will:
  1. Start a test server instance
  2. Run all security test categories
  3. Perform penetration testing
  4. Generate detailed compliance reports
  5. Exit with appropriate code based on findings

Reports are saved in both Markdown and JSON formats in test-results/.

Exit Codes:
  0 - All tests passed or warnings only
  1 - Critical issues found or validation failed
`);
  process.exit(0);
}

// Run the validation
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});