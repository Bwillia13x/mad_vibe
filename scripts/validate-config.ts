#!/usr/bin/env tsx

/**
 * Configuration Validation Script
 * 
 * This script validates the application configuration and provides
 * detailed feedback on any issues or security concerns.
 */

import { validateEnvConfig, envSecurity } from '../lib/env-security';
import { configManager, validateConfig } from '../lib/config-manager';

interface ValidationReport {
  timestamp: string;
  environment: string;
  overallStatus: 'PASS' | 'FAIL' | 'WARNING';
  basicValidation: {
    valid: boolean;
    errors: string[];
  };
  advancedValidation: {
    valid: boolean;
    errors: string[];
  };
  securityAudit: {
    configuredKeys: string[];
    sensitiveKeys: string[];
    missingRecommended: string[];
    weakConfigurations: string[];
  };
  configurationSummary: {
    totalKeys: number;
    validatedKeys: number;
    rotatingSecrets: number;
    lastValidation: string;
    validationStatus: { valid: boolean; errors: string[] };
  };
  recommendations: string[];
}

async function validateConfiguration(): Promise<ValidationReport> {
  console.log('🔍 Starting configuration validation...\n');

  // Basic environment validation
  console.log('📋 Basic Environment Validation:');
  const basicValidation = validateEnvConfig();
  
  if (basicValidation.isValid) {
    console.log('  ✅ Basic validation passed');
  } else {
    console.log('  ❌ Basic validation failed:');
    basicValidation.errors.forEach(error => console.log(`    - ${error}`));
  }

  // Advanced configuration validation
  console.log('\n🔧 Advanced Configuration Validation:');
  const advancedValidation = validateConfig();
  
  if (advancedValidation.valid) {
    console.log('  ✅ Advanced validation passed');
  } else {
    console.log('  ❌ Advanced validation failed:');
    advancedValidation.errors.forEach(error => console.log(`    - ${error}`));
  }

  // Security audit
  console.log('\n🔒 Security Audit:');
  const securityAudit = envSecurity.getSecurityAudit();
  
  console.log(`  📊 Configuration Summary:`);
  console.log(`    - Total keys configured: ${securityAudit.configuredKeys.length}`);
  console.log(`    - Sensitive keys: ${securityAudit.sensitiveKeys.length}`);
  console.log(`    - Missing recommended: ${securityAudit.missingRecommended.length}`);
  console.log(`    - Weak configurations: ${securityAudit.weakConfigurations.length}`);

  if (securityAudit.missingRecommended.length > 0) {
    console.log('  ⚠️  Missing recommended configurations:');
    securityAudit.missingRecommended.forEach(key => console.log(`    - ${key}`));
  }

  if (securityAudit.weakConfigurations.length > 0) {
    console.log('  ⚠️  Weak configurations found:');
    securityAudit.weakConfigurations.forEach(issue => console.log(`    - ${issue}`));
  }

  // Configuration management summary
  console.log('\n⚙️  Configuration Management:');
  const configSummary = configManager.getConfigurationSummary();
  
  console.log(`  📈 Management Summary:`);
  console.log(`    - Total keys: ${configSummary.totalKeys}`);
  console.log(`    - Validated keys: ${configSummary.validatedKeys}`);
  console.log(`    - Rotating secrets: ${configSummary.rotatingSecrets}`);

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (!basicValidation.isValid) {
    recommendations.push('Fix basic configuration validation errors');
  }
  
  if (!advancedValidation.valid) {
    recommendations.push('Address advanced configuration validation issues');
  }
  
  if (securityAudit.missingRecommended.length > 0) {
    recommendations.push('Configure missing recommended environment variables');
  }
  
  if (securityAudit.weakConfigurations.length > 0) {
    recommendations.push('Strengthen weak configuration values');
  }

  const nodeEnv = envSecurity.get('NODE_ENV');
  if (nodeEnv === 'production') {
    if (!envSecurity.has('DATABASE_URL') && !envSecurity.has('POSTGRES_URL')) {
      recommendations.push('Configure database URL for production deployment');
    }
    
    if (configSummary.rotatingSecrets === 0) {
      recommendations.push('Configure secret rotation for production security');
    }
  }

  // Determine overall status
  let overallStatus: 'PASS' | 'FAIL' | 'WARNING' = 'PASS';
  
  if (!basicValidation.isValid || !advancedValidation.valid) {
    overallStatus = 'FAIL';
  } else if (securityAudit.weakConfigurations.length > 0 || securityAudit.missingRecommended.length > 0) {
    overallStatus = 'WARNING';
  }

  // Display final status
  console.log('\n📊 Validation Summary:');
  console.log(`  Status: ${overallStatus === 'PASS' ? '✅ PASS' : overallStatus === 'WARNING' ? '⚠️  WARNING' : '❌ FAIL'}`);
  console.log(`  Environment: ${nodeEnv || 'unknown'}`);
  console.log(`  Timestamp: ${new Date().toISOString()}`);

  if (recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    recommendations.forEach(rec => console.log(`  - ${rec}`));
  }

  return {
    timestamp: new Date().toISOString(),
    environment: nodeEnv || 'unknown',
    overallStatus,
    basicValidation,
    advancedValidation,
    securityAudit,
    configurationSummary: configSummary,
    recommendations
  };
}

async function main() {
  try {
    const report = await validateConfiguration();
    
    // Save report to file
    const fs = await import('fs/promises');
    const reportPath = `config-validation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Validation report saved to: ${reportPath}`);
    
    // Exit with appropriate code
    if (report.overallStatus === 'FAIL') {
      console.log('\n❌ Configuration validation failed!');
      process.exit(1);
    } else if (report.overallStatus === 'WARNING') {
      console.log('\n⚠️  Configuration validation completed with warnings.');
      process.exit(0);
    } else {
      console.log('\n✅ Configuration validation passed!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Configuration validation error:', error);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const help = args.includes('--help') || args.includes('-h');

if (help) {
  console.log(`
Configuration Validation Script

Usage: tsx scripts/validate-config.ts [options]

Options:
  --verbose, -v    Enable verbose output
  --help, -h       Show this help message

Examples:
  tsx scripts/validate-config.ts
  tsx scripts/validate-config.ts --verbose
  npm run validate-config
`);
  process.exit(0);
}

if (verbose) {
  console.log('🔍 Verbose mode enabled\n');
}

// Run validation
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});