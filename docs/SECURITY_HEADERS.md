# Security Headers Middleware

This document describes the security headers middleware implementation for the Andreas Vibe business management platform.

## Overview

The security headers middleware provides comprehensive HTTP security headers to protect against various web vulnerabilities including XSS, clickjacking, MIME type sniffing, and other common attacks.

## Features

### Essential Security Headers

1. **X-Content-Type-Options: nosniff**
   - Prevents MIME type sniffing attacks
   - Forces browsers to respect declared content types

2. **X-Frame-Options: DENY**
   - Prevents clickjacking attacks
   - Configurable to SAMEORIGIN or ALLOW-FROM specific origins

3. **Strict-Transport-Security (HSTS)**
   - Enforces HTTPS connections
   - Includes subdomains and preload directives
   - Automatically enabled in production environments

4. **Content Security Policy (CSP)**
   - Comprehensive XSS protection
   - Configurable directives for different content types
   - Supports upgrade-insecure-requests directive

### Additional Security Headers

- **X-XSS-Protection**: Legacy XSS protection for older browsers
- **Referrer-Policy**: Controls referrer information sent with requests
- **Permissions-Policy**: Restricts access to browser features
- **Cache-Control**: Prevents caching of sensitive API responses

## Usage

### Basic Usage

```typescript
import { securityHeaders } from './middleware/security-headers';
import express from 'express';

const app = express();

// Apply security headers to all routes
app.use(securityHeaders);
```

### Strict Security Headers

For sensitive endpoints requiring stricter security:

```typescript
import { strictSecurityHeaders } from './middleware/security-headers';

// Apply strict headers to admin routes
app.use('/admin', strictSecurityHeaders);
```

### Custom Configuration

```typescript
import { createSecurityHeadersMiddleware } from './middleware/security-headers';

const customHeaders = createSecurityHeadersMiddleware({
  frameOptions: 'SAMEORIGIN',
  hsts: {
    enabled: true,
    maxAge: 86400, // 1 day
    includeSubDomains: false
  },
  csp: {
    enabled: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://trusted-cdn.com"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
});

app.use(customHeaders);
```

## Configuration Options

### SecurityHeadersConfig Interface

```typescript
interface SecurityHeadersConfig {
  // X-Content-Type-Options
  contentTypeOptions?: boolean;
  
  // X-Frame-Options
  frameOptions?: 'DENY' | 'SAMEORIGIN' | string;
  
  // Strict-Transport-Security
  hsts?: {
    enabled: boolean;
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  
  // Content Security Policy
  csp?: {
    enabled: boolean;
    directives?: {
      defaultSrc?: string[];
      scriptSrc?: string[];
      styleSrc?: string[];
      imgSrc?: string[];
      fontSrc?: string[];
      connectSrc?: string[];
      frameAncestors?: string[];
      objectSrc?: string[];
      mediaSrc?: string[];
      childSrc?: string[];
      formAction?: string[];
      baseUri?: string[];
      upgradeInsecureRequests?: boolean;
    };
  };
  
  // Additional headers
  xssProtection?: boolean;
  referrerPolicy?: string;
  permissionsPolicy?: string;
  
  // Environment-specific settings
  productionOnly?: string[];
  developmentOnly?: string[];
}
```

### Default Configuration

```typescript
const DEFAULT_CONFIG: SecurityHeadersConfig = {
  contentTypeOptions: true,
  frameOptions: 'DENY',
  hsts: {
    enabled: true,
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  csp: {
    enabled: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: true
    }
  },
  xssProtection: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: 'camera=(), microphone=(), geolocation=(), payment=()'
};
```

## Environment Configuration

### Environment Variables

Configure security headers using the `SECURITY_HEADERS_CONFIG` environment variable:

```bash
export SECURITY_HEADERS_CONFIG='{"frameOptions":"SAMEORIGIN","referrerPolicy":"no-referrer"}'
```

### Production vs Development

- **HSTS**: Automatically enabled in production, disabled in development
- **Logging**: Detailed header logging in development mode
- **Error Handling**: Graceful fallback to minimal headers on configuration errors

## Content Security Policy (CSP)

### CSP Directives

The middleware supports all standard CSP directives:

- `default-src`: Default policy for loading content
- `script-src`: Valid sources for JavaScript
- `style-src`: Valid sources for stylesheets
- `img-src`: Valid sources for images
- `font-src`: Valid sources for fonts
- `connect-src`: Valid sources for XMLHttpRequest, WebSocket, etc.
- `frame-ancestors`: Valid parents for embedding frames
- `object-src`: Valid sources for plugins
- `media-src`: Valid sources for audio/video
- `child-src`: Valid sources for web workers and nested frames
- `form-action`: Valid endpoints for form submissions
- `base-uri`: Valid sources for base element href

### CSP Examples

#### Basic CSP
```typescript
csp: {
  enabled: true,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'"],
    imgSrc: ["'self'", "data:"]
  }
}
```

#### CSP with External Resources
```typescript
csp: {
  enabled: true,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
    styleSrc: ["'self'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "https:"],
    upgradeInsecureRequests: true
  }
}
```

## Security Considerations

### HSTS Configuration

- **Max-Age**: Recommended minimum 1 year (31536000 seconds)
- **includeSubDomains**: Include if all subdomains support HTTPS
- **preload**: Only enable if domain is in HSTS preload list

### CSP Best Practices

1. **Avoid 'unsafe-inline'**: Use nonces or hashes instead
2. **Avoid 'unsafe-eval'**: Prevents eval() and similar functions
3. **Use 'self' for trusted content**: Restricts to same origin
4. **Whitelist specific domains**: Avoid wildcards when possible
5. **Test thoroughly**: CSP can break functionality if too restrictive

### Frame Options

- **DENY**: Prevents all framing (most secure)
- **SAMEORIGIN**: Allows framing from same origin
- **ALLOW-FROM**: Allows framing from specific origin (deprecated)

## Testing

### Running Security Header Tests

```bash
npm test test/security/security-headers-tests.ts
```

### Manual Testing

Test security headers using browser developer tools or command line:

```bash
curl -I http://localhost:5000/api/health
```

Expected headers:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ...
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

### Security Testing Tools

1. **Mozilla Observatory**: https://observatory.mozilla.org/
2. **Security Headers**: https://securityheaders.com/
3. **CSP Evaluator**: https://csp-evaluator.withgoogle.com/

## Troubleshooting

### Common Issues

1. **CSP Blocking Resources**
   - Check browser console for CSP violations
   - Add necessary domains to appropriate directives
   - Use report-uri for monitoring violations

2. **HSTS Not Working**
   - Ensure HTTPS is properly configured
   - Check that NODE_ENV is set to 'production'
   - Verify max-age is sufficient

3. **Frame Options Conflicts**
   - Check if content needs to be embedded
   - Consider using CSP frame-ancestors instead
   - Verify ALLOW-FROM syntax if used

### Debug Mode

Enable debug logging in development:

```typescript
process.env.NODE_ENV = 'development';
// Detailed header logging will be enabled
```

### Configuration Validation

Use the validation utility to check configuration:

```typescript
import { validateSecurityConfig } from './middleware/security-headers';

const config = { /* your config */ };
const result = validateSecurityConfig(config);

if (!result.valid) {
  console.error('Configuration errors:', result.errors);
}
```

## Migration Guide

### From Legacy Implementation

If migrating from the previous auth.ts security headers:

1. Remove old `securityHeaders` import from auth.ts
2. Import new middleware: `import { securityHeaders } from './middleware/security-headers'`
3. Apply middleware in routes.ts: `app.use(securityHeaders)`
4. Test all endpoints to ensure headers are applied correctly

### Updating Configuration

When updating security configuration:

1. Test in development environment first
2. Validate configuration using `validateSecurityConfig()`
3. Monitor for CSP violations after deployment
4. Have rollback plan ready for production issues

## Security Compliance

This implementation helps achieve compliance with:

- **OWASP Top 10**: Protection against injection, XSS, and other vulnerabilities
- **NIST Cybersecurity Framework**: Protective controls implementation
- **PCI DSS**: Security requirements for payment processing
- **GDPR**: Data protection through security headers

## References

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN Security Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [HSTS Specification](https://tools.ietf.org/html/rfc6797)