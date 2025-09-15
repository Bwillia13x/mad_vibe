#!/usr/bin/env tsx
/**
 * Quick test to verify authentication and validation fixes
 */

import { TestHttpClient, startTestServer } from '../test/utils/test-environment.js';
import { loadTestConfig } from '../test/config/test-config.js';

async function testAuthFix(): Promise<void> {
  console.log('🔧 Testing authentication and validation fixes...');
  
  const config = loadTestConfig();
  const testEnv = await startTestServer(config);
  
  try {
    console.log(`✅ Test server started on ${testEnv.baseUrl}`);
    
    // Test with authentication
    const authToken = process.env.ADMIN_TOKEN || 'test-admin-token-12345-secure';
    const httpClient = new TestHttpClient(testEnv.baseUrl, authToken);
    
    console.log('\n🔍 Testing authenticated endpoints...');
    
    // Test POS sales endpoint
    console.log('Testing POST /api/pos/sales...');
    try {
      const saleResponse = await httpClient.post('/api/pos/sales', {
        items: [{ kind: 'service', id: '770e8400-e29b-41d4-a716-446655440001', name: 'Executive Cut', quantity: 1 }],
        discountPct: 0,
        taxPct: 8.5
      });
      
      if (saleResponse.ok) {
        console.log('  ✅ POS sales endpoint working');
        const saleData = await saleResponse.json();
        console.log(`  📊 Created sale: ${saleData.id}`);
      } else {
        console.log(`  ❌ POS sales failed: ${saleResponse.status}`);
        const errorData = await saleResponse.json().catch(() => ({}));
        console.log(`  📝 Error: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.log(`  ❌ POS sales error: ${error}`);
    }
    
    // Test marketing campaigns endpoint
    console.log('Testing POST /api/marketing/campaigns...');
    try {
      const campaignResponse = await httpClient.post('/api/marketing/campaigns', {
        name: 'Test Campaign',
        description: 'Generated during auth test',
        channel: 'email',
        status: 'draft'
      });
      
      if (campaignResponse.ok) {
        console.log('  ✅ Marketing campaigns endpoint working');
        const campaignData = await campaignResponse.json();
        console.log(`  📊 Created campaign: ${campaignData.id}`);
      } else {
        console.log(`  ❌ Marketing campaigns failed: ${campaignResponse.status}`);
        const errorData = await campaignResponse.json().catch(() => ({}));
        console.log(`  📝 Error: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.log(`  ❌ Marketing campaigns error: ${error}`);
    }
    
    // Test without authentication
    console.log('\n🚫 Testing without authentication...');
    const noAuthClient = new TestHttpClient(testEnv.baseUrl);
    
    try {
      const noAuthResponse = await noAuthClient.post('/api/pos/sales', {
        items: [{ kind: 'service', id: '770e8400-e29b-41d4-a716-446655440001', name: 'Executive Cut', quantity: 1 }],
        discountPct: 0,
        taxPct: 8.5
      });
      
      console.log(`  Status without auth: ${noAuthResponse.status} (should be 401)`);
    } catch (error) {
      console.log(`  ❌ No auth test error: ${error}`);
    }
    
    // Test health endpoint
    console.log('\n❤️ Testing health endpoint...');
    try {
      const healthResponse = await httpClient.get('/api/health');
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('  ✅ Health endpoint working');
        console.log(`  📊 System status: ${healthData.status}`);
        if (healthData.system) {
          console.log(`  💾 Memory: ${healthData.system.memory.used}MB used`);
          console.log(`  ⏱️ Uptime: ${healthData.system.uptime}s`);
        }
      } else {
        console.log(`  ❌ Health endpoint failed: ${healthResponse.status}`);
      }
    } catch (error) {
      console.log(`  ❌ Health endpoint error: ${error}`);
    }
    
    console.log('\n✅ Authentication and validation test completed');
    
  } finally {
    await testEnv.cleanup();
  }
}

testAuthFix().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});