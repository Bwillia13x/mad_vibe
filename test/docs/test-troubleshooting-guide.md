# Test Troubleshooting Guide

## Overview

This guide helps diagnose and resolve common issues encountered during test execution in the Andreas Vibe platform testing framework.

## Common Issues and Solutions

### 1. Server Startup Issues

#### Problem: "Server failed to start within timeout"

**Symptoms**:
- Tests fail with timeout errors
- Server startup takes longer than expected
- Port binding failures

**Diagnosis**:
```bash
# Check if port is already in use
lsof -i :3000

# Check server logs
npm run dev 2>&1 | tee server.log

# Verify environment variables
env | grep -E "(NODE_ENV|PORT|OPENAI_API_KEY)"
```

**Solutions**:

1. **Kill existing processes**:
```bash
# Kill processes on port 3000
kill -9 $(lsof -t -i:3000)

# Or use the cleanup script
npm run test:cleanup
```

2. **Increase timeout**:
```bash
# Temporary fix - increase timeout
export TEST_STARTUP_TIMEOUT=60000
npm run test
```

3. **Use dynamic port allocation**:
```bash
# Let the system choose an available port
npm run test -- --dynamic-port
```

4. **Check dependencies**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Problem: "Database connection failed"

**Symptoms**:
- Database-related tests fail
- Connection timeout errors
- Authentication failures

**Solutions**:

1. **Verify database configuration**:
```bash
# Check if PostgreSQL is running (if using external DB)
pg_isready -h localhost -p 5432

# Test connection
psql -h localhost -p 5432 -U username -d database_name
```

2. **Use in-memory storage** (default):
```bash
# Ensure no DATABASE_URL is set for in-memory mode
unset DATABASE_URL
npm run test
```

3. **Reset database state**:
```bash
# Reset to clean state
npm run db:reset
npm run test
```

### 2. Test Execution Failures

#### Problem: "Test timeout exceeded"

**Symptoms**:
- Individual tests timeout
- Long-running operations fail
- Network request timeouts

**Diagnosis**:
```bash
# Run with verbose logging
npm run test -- --verbose --grep "failing-test-name"

# Check network connectivity
curl -I http://localhost:3000/api/health

# Monitor resource usage
top -p $(pgrep node)
```

**Solutions**:

1. **Increase test timeout**:
```bash
# For specific test
npm run test -- --timeout 60000

# Or set environment variable
export TEST_TIMEOUT=60000
npm run test
```

2. **Check system resources**:
```bash
# Monitor memory usage
free -h

# Check disk space
df -h

# Monitor CPU usage
htop
```

3. **Optimize test execution**:
```bash
# Run tests sequentially instead of parallel
npm run test -- --no-parallel

# Reduce concurrent users in performance tests
npm run test:performance -- --users=10
```

#### Problem: "Flaky test failures"

**Symptoms**:
- Tests pass sometimes, fail other times
- Inconsistent results across runs
- Race conditions

**Diagnosis**:
```bash
# Run test multiple times to identify flakiness
for i in {1..10}; do npm run test -- --grep "flaky-test" || echo "Failed on run $i"; done

# Run with different timing
npm run test -- --slow-mo=100
```

**Solutions**:

1. **Add proper waits**:
```javascript
// Instead of fixed delays
await new Promise(resolve => setTimeout(resolve, 1000));

// Use proper waiting
await waitForElement('.loading-spinner', { hidden: true });
await waitForResponse('/api/data');
```

2. **Increase retry attempts**:
```bash
# Retry flaky tests
npm run test -- --retries=3
```

3. **Isolate test data**:
```javascript
// Use unique test data for each test
const testData = generateUniqueTestData();
```

### 3. Performance Test Issues

#### Problem: "Performance thresholds exceeded"

**Symptoms**:
- Response times higher than expected
- Memory usage warnings
- CPU utilization alerts

**Diagnosis**:
```bash
# Profile performance
npm run test:performance -- --profile

# Monitor system resources during test
npm run test:performance & 
watch -n 1 'ps aux | grep node'
```

**Solutions**:

1. **Adjust thresholds temporarily**:
```bash
# Increase response time threshold
export MAX_RESPONSE_TIME=500
npm run test:performance
```

2. **Optimize system resources**:
```bash
# Close unnecessary applications
# Ensure adequate RAM (8GB+ recommended)
# Use SSD storage for better I/O performance
```

3. **Scale down test load**:
```bash
# Reduce concurrent users
npm run test:performance -- --users=25 --duration=60

# Run shorter duration tests
npm run test:performance -- --duration=30
```

#### Problem: "Memory leaks detected"

**Symptoms**:
- Memory usage continuously increases
- Out of memory errors
- System becomes unresponsive

**Diagnosis**:
```bash
# Monitor memory usage over time
npm run test:performance -- --memory-profile

# Use Node.js memory profiling
node --inspect npm run test:performance
```

**Solutions**:

1. **Increase Node.js memory limit**:
```bash
# Increase heap size
node --max-old-space-size=8192 npm run test:performance
```

2. **Check for memory leaks in code**:
```bash
# Run memory leak detection
npm run test:memory-leaks

# Profile with clinic.js
npx clinic doctor -- npm run test:performance
```

### 4. Security Test Issues

#### Problem: "Security tests failing"

**Symptoms**:
- Authentication tests fail
- CORS errors
- Security headers missing

**Diagnosis**:
```bash
# Check security configuration
curl -I http://localhost:3000/api/health

# Verify authentication flow
npm run test:security:auth -- --verbose
```

**Solutions**:

1. **Verify security configuration**:
```bash
# Check environment variables
echo $OPENAI_API_KEY | wc -c  # Should be > 0

# Verify CORS settings
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS http://localhost:3000/api/chat
```

2. **Update security test expectations**:
```javascript
// If security headers changed, update tests
expect(response.headers['x-frame-options']).toBe('DENY');
```

### 5. E2E Test Issues

#### Problem: "Browser automation failures"

**Symptoms**:
- Browser fails to launch
- Element not found errors
- Screenshot capture failures

**Diagnosis**:
```bash
# Run in headed mode to see what's happening
npm run test:e2e -- --headed

# Check browser installation
npx playwright install --dry-run
```

**Solutions**:

1. **Install browser dependencies**:
```bash
# Install Playwright browsers
npx playwright install

# Install system dependencies (Linux)
npx playwright install-deps
```

2. **Update selectors**:
```javascript
// Use more robust selectors
await page.waitForSelector('[data-testid="submit-button"]');
// Instead of
await page.waitForSelector('.btn-primary');
```

3. **Add proper waits**:
```javascript
// Wait for network requests to complete
await page.waitForLoadState('networkidle');

// Wait for specific elements
await page.waitForSelector('.content', { state: 'visible' });
```

#### Problem: "Screenshot comparison failures"

**Symptoms**:
- Visual regression test failures
- Screenshot differences
- Inconsistent rendering

**Solutions**:

1. **Update baseline screenshots**:
```bash
# Update all screenshots
npm run test:e2e -- --update-snapshots

# Update specific test screenshots
npm run test:e2e -- --update-snapshots --grep "specific-test"
```

2. **Configure screenshot settings**:
```javascript
// Disable animations for consistent screenshots
await page.addStyleTag({
  content: '*, *::before, *::after { animation-duration: 0s !important; }'
});
```

### 6. CI/CD Issues

#### Problem: "Tests pass locally but fail in CI"

**Symptoms**:
- Different behavior in CI environment
- Environment-specific failures
- Resource constraints in CI

**Diagnosis**:
```bash
# Simulate CI environment locally
docker run -it --rm -v $(pwd):/app -w /app node:18 npm test

# Check CI logs for specific errors
# Review GitHub Actions logs or CI platform logs
```

**Solutions**:

1. **Match CI environment**:
```bash
# Use same Node.js version as CI
nvm use 18

# Install exact dependencies
npm ci
```

2. **Adjust CI-specific settings**:
```yaml
# In GitHub Actions
- name: Run tests
  run: npm run test:ci
  env:
    CI: true
    TEST_HEADLESS: true
    TEST_TIMEOUT: 60000
```

3. **Add CI-specific configuration**:
```javascript
// In test configuration
if (process.env.CI) {
  config.timeout = 60000;
  config.retries = 2;
  config.headless = true;
}
```

## Diagnostic Commands

### System Information

```bash
# Node.js and npm versions
node --version
npm --version

# System resources
free -h
df -h
nproc

# Network connectivity
ping -c 3 google.com
curl -I http://localhost:3000/api/health
```

### Test Environment

```bash
# List running processes
ps aux | grep node

# Check port usage
netstat -tulpn | grep :3000

# Environment variables
env | grep -E "(NODE_ENV|TEST_|PORT)"

# Test configuration
cat test/config/test-config.ts
```

### Log Analysis

```bash
# View recent test logs
tail -f test-results/test-execution.log

# Search for specific errors
grep -r "ERROR" test-results/

# Analyze performance logs
grep "PERFORMANCE" test-results/*.log | sort -k3 -n
```

## Performance Monitoring

### Real-time Monitoring

```bash
# Monitor test execution
npm run test:monitor

# Watch resource usage during tests
watch -n 1 'ps aux | grep node | head -5'

# Monitor network activity
netstat -i 1
```

### Performance Profiling

```bash
# Profile CPU usage
npm run test -- --cpu-profile

# Profile memory usage
npm run test -- --heap-profile

# Generate performance report
npm run test:performance -- --report
```

## Getting Help

### Debug Information Collection

When reporting issues, collect this information:

```bash
# System information
uname -a
node --version
npm --version

# Test configuration
cat test/config/test-config.ts

# Recent logs
tail -100 test-results/test-execution.log

# Environment variables (sanitized)
env | grep -E "(NODE_ENV|TEST_)" | sed 's/=.*/=***/'
```

### Log Levels

Adjust logging verbosity for debugging:

```bash
# Minimal logging
npm run test -- --silent

# Normal logging (default)
npm run test

# Verbose logging
npm run test -- --verbose

# Debug logging
npm run test -- --debug

# Trace logging (very detailed)
npm run test -- --trace
```

### Support Channels

1. **Documentation**: Check `/test/docs/` for additional guides
2. **Configuration Examples**: Review `/test/config/` for working configurations
3. **Issue Tracking**: Report bugs with full diagnostic information
4. **Community**: Share solutions and ask questions

## Prevention Strategies

### Regular Maintenance

```bash
# Weekly maintenance
npm run test:cleanup
npm run test:health-check
npm audit fix

# Monthly maintenance
npm update
npm run test:full-suite
npm run test:performance-baseline
```

### Monitoring Setup

```bash
# Set up continuous monitoring
npm run test:monitor:setup

# Configure alerts
npm run test:alerts:configure

# Schedule regular health checks
crontab -e
# Add: 0 */6 * * * cd /path/to/project && npm run test:health-check
```

### Best Practices

1. **Run tests regularly** to catch issues early
2. **Monitor performance trends** to identify degradation
3. **Keep dependencies updated** to avoid security issues
4. **Use consistent environments** across development and CI
5. **Document known issues** and their solutions
6. **Implement proper error handling** in tests
7. **Use appropriate test data** that doesn't cause conflicts
8. **Clean up resources** after test execution