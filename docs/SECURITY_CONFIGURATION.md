# Security Configuration Guide

This document provides comprehensive guidance on secure configuration management for the Andreas Vibe platform.

## Overview

The platform implements a multi-layered security configuration system that includes:

- **Secure Environment Variable Management**: Centralized, validated environment variable handling
- **Configuration Validation**: Automatic validation of all configuration values
- **Secrets Management**: Secure handling and rotation of sensitive data
- **Change Monitoring**: Audit trail for all configuration changes

## Environment Variables

### Required Variables

| Variable   | Description             | Example      | Validation                                |
| ---------- | ----------------------- | ------------ | ----------------------------------------- |
| `NODE_ENV` | Application environment | `production` | Must be: development, production, or test |
| `PORT`     | Server port             | `5000`       | Must be 1-65535                           |

### Optional Variables

| Variable             | Description                  | Example                             | Validation                              |
| -------------------- | ---------------------------- | ----------------------------------- | --------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string | `postgres://user:pass@host:5432/db` | Must be valid PostgreSQL URL            |
| `POSTGRES_URL`       | Alternative database URL     | `postgres://user:pass@host:5432/db` | Must be valid PostgreSQL URL            |
| `OPENAI_API_KEY`     | OpenAI API key               | `sk-...`                            | Must be valid OpenAI key or placeholder |
| `ADMIN_TOKEN`        | Admin authentication token   | `abc123...`                         | Min 32 alphanumeric characters          |
| `DEMO_SCENARIO`      | Demo data scenario           | `restaurant`                        | Any string                              |
| `DEMO_SEED`          | Demo data seed               | `12345`                             | Any number                              |
| `DEMO_DATE`          | Fixed demo date              | `2024-01-01`                        | Valid date string                       |
| `SMOKE_MODE`         | Enable smoke testing         | `1`                                 | Boolean (1/0, true/false)               |
| `OPERATIONS_WS_PORT` | WebSocket port               | `8080`                              | Must be 1-65535                         |
| `SKIP_RATE_LIMIT`    | Disable rate limiting        | `true`                              | Boolean                                 |
| `TEST_VERBOSE`       | Verbose test output          | `true`                              | Boolean                                 |

## Secure Configuration Usage

### Basic Usage

```typescript
import { getEnvVar, hasEnvVar, validateEnvConfig } from './lib/env-security'

// Get configuration values
const port = getEnvVar('PORT')
const nodeEnv = getEnvVar('NODE_ENV')

// Check if configuration exists
if (hasEnvVar('OPENAI_API_KEY')) {
  const apiKey = getEnvVar('OPENAI_API_KEY')
}

// Validate configuration
const validation = validateEnvConfig()
if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors)
}
```

### Advanced Configuration Management

```typescript
import { configManager, validateConfig, configureRotation, watchConfig } from './lib/config-manager'

// Validate all configuration
const validation = validateConfig()
console.log('Configuration valid:', validation.valid)

// Configure secret rotation
configureRotation({
  key: 'ADMIN_TOKEN',
  rotationIntervalHours: 24 * 7, // Weekly rotation
  rotationCallback: async (newToken) => {
    // Update external systems with new token
    await updateExternalSystems(newToken)
  }
})

// Watch for configuration changes
const unwatch = watchConfig('OPENAI_API_KEY', (newValue) => {
  console.log('OpenAI API key updated')
  // Reinitialize OpenAI client
})
```

## Security Features

### 1. Input Validation and Sanitization

All environment variables are automatically:

- **Validated** against type and format requirements
- **Sanitized** to remove control characters and normalize values
- **Checked** for security vulnerabilities

### 2. Sensitive Data Protection

Sensitive configuration values are:

- **Masked** in logs and error messages
- **Excluded** from safe configuration exports
- **Protected** from accidental exposure

### 3. Configuration Validation

The system validates:

- **Required variables** are present
- **Data types** match expectations
- **Format requirements** are met (e.g., API key format)
- **Security constraints** are satisfied

### 4. Secrets Rotation

Automatic rotation capabilities for:

- **Admin tokens** with configurable intervals
- **API keys** with callback notifications
- **Database credentials** with zero-downtime updates

## Production Deployment

### Environment Setup

1. **Set required variables**:

   ```bash
   export NODE_ENV=production
   export PORT=5000
   export DATABASE_URL=postgres://...
   ```

2. **Configure secrets**:

   ```bash
   export ADMIN_TOKEN=$(openssl rand -hex 32)
   export OPENAI_API_KEY=sk-your-actual-key
   ```

3. **Validate configuration**:
   ```bash
   npm run validate-config
   ```

### Security Checklist

- [ ] All required environment variables are set
- [ ] Sensitive values use strong, unique secrets
- [ ] Database connections use encrypted connections
- [ ] API keys are valid and have appropriate permissions
- [ ] Admin tokens are at least 32 characters
- [ ] Configuration validation passes
- [ ] Secrets rotation is configured for production

### Monitoring and Auditing

The system provides:

1. **Configuration Summary**:

   ```typescript
   const summary = configManager.getConfigurationSummary()
   console.log('Config status:', summary)
   ```

2. **Change History**:

   ```typescript
   const changes = configManager.getChangeHistory()
   console.log('Recent changes:', changes)
   ```

3. **Rotation Status**:
   ```typescript
   const rotations = configManager.getRotationStatus()
   console.log('Rotation schedule:', rotations)
   ```

## Security Best Practices

### 1. Environment Variable Security

- **Never commit** `.env` files to version control
- **Use strong secrets** for all sensitive values
- **Rotate secrets regularly** in production
- **Limit access** to environment configuration
- **Monitor changes** to configuration values

### 2. Configuration Management

- **Validate configuration** on application startup
- **Use centralized management** for all environment variables
- **Implement change auditing** for security compliance
- **Test configuration** in staging environments
- **Document all variables** and their purposes

### 3. Secrets Management

- **Generate strong secrets** using cryptographic methods
- **Store secrets securely** using environment variables or secret managers
- **Rotate secrets regularly** based on security policies
- **Monitor secret usage** for unauthorized access
- **Implement emergency rotation** procedures

### 4. Production Security

- **Use HTTPS** for all external communications
- **Enable security headers** for web applications
- **Implement rate limiting** to prevent abuse
- **Monitor security events** and configuration changes
- **Maintain security documentation** and procedures

## Troubleshooting

### Common Issues

1. **Configuration Validation Errors**:
   - Check variable names and values
   - Verify format requirements
   - Ensure required variables are set

2. **Secret Rotation Failures**:
   - Check rotation callback implementations
   - Verify external system connectivity
   - Review rotation schedules and intervals

3. **Environment Variable Issues**:
   - Verify variable names (case-sensitive)
   - Check for special characters or encoding issues
   - Ensure proper escaping in shell environments

### Debugging

Enable verbose logging:

```bash
export TEST_VERBOSE=true
```

Check configuration status:

```typescript
import { configManager } from './lib/config-manager'
console.log(configManager.getConfigurationSummary())
```

Validate specific variables:

```typescript
import { validateEnvConfig } from './lib/env-security'
const result = validateEnvConfig()
console.log('Validation result:', result)
```

## Security Compliance

This configuration system helps meet security compliance requirements:

- **SOC 2**: Configuration change auditing and access controls
- **ISO 27001**: Information security management practices
- **GDPR**: Data protection through secure configuration
- **HIPAA**: Administrative safeguards for sensitive data

## Support

For security configuration support:

1. Review this documentation
2. Check the troubleshooting section
3. Examine configuration validation results
4. Contact the security team for sensitive issues

---

**Note**: This document contains security-sensitive information. Ensure proper access controls are in place and follow your organization's security policies when implementing these configurations.
