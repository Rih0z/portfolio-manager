#!/usr/bin/env node

/**
 * APIエンドポイントの直接テスト（stageなし）
 */

const axios = require('axios');

async function testDirectAPI() {
  const API_URL = 'https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com';
  
  console.log('🔍 APIエンドポイントの直接テスト...\n');
  
  const endpoints = [
    { name: 'Root', path: '/' },
    { name: 'Health', path: '/health' },
    { name: 'API Root', path: '/api' },
    { name: 'Exchange Rate', path: '/api/exchange-rate' },
    { name: 'Exchange Rate (alt)', path: '/exchange-rate' },
    { name: 'US Stock', path: '/api/us-stock?ticker=AAPL' },
    { name: 'US Stock (alt)', path: '/us-stock?ticker=AAPL' }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔄 Testing: ${endpoint.name}`);
      console.log(`   URL: ${API_URL}${endpoint.path}`);
      
      const response = await axios.get(`${API_URL}${endpoint.path}`, {
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'PortfolioManager/1.0'
        },
        validateStatus: function (status) {
          return status < 500; // 500未満のステータスコードは成功とみなす
        }
      });
      
      console.log(`   📄 Status: ${response.status}`);
      if (response.data) {
        console.log(`   📦 Response: ${JSON.stringify(response.data).substring(0, 200)}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n\n📝 CORSヘッダーの確認...');
  try {
    const response = await axios.options(`${API_URL}/api/exchange-rate`, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    console.log('CORS Response Headers:', response.headers);
  } catch (error) {
    console.log('CORS check failed:', error.message);
  }
}

testDirectAPI().catch(console.error);