#!/usr/bin/env node

/**
 * バックエンドAPIの接続テストスクリプト
 */

const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

const API_URL = process.env.REACT_APP_MARKET_DATA_API_URL;
const API_STAGE = process.env.REACT_APP_API_STAGE || 'dev';

async function testBackendConnection() {
  console.log('🔍 バックエンドAPI接続テスト開始...\n');
  
  if (!API_URL || API_URL === 'YOUR_AWS_API_URL_HERE') {
    console.error('❌ エラー: REACT_APP_MARKET_DATA_API_URLが設定されていません');
    console.log('📝 .env.testファイルに実際のAPIのURLを設定してください\n');
    process.exit(1);
  }

  console.log(`📡 API URL: ${API_URL}`);
  console.log(`🏷️  API Stage: ${API_STAGE}\n`);

  const endpoints = [
    { name: 'Health Check', path: `/${API_STAGE}/health` },
    { name: 'Market Data (Exchange Rate)', path: `/${API_STAGE}/api/market-data`, params: { type: 'exchange-rate', base: 'USD', target: 'JPY' } },
    { name: 'Market Data (US Stock)', path: `/${API_STAGE}/api/market-data`, params: { type: 'us-stock', symbols: 'AAPL' } },
    { name: 'Market Data (JP Stock)', path: `/${API_STAGE}/api/market-data`, params: { type: 'jp-stock', symbols: '7203' } }
  ];

  let successCount = 0;
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔄 Testing: ${endpoint.name}`);
      console.log(`   URL: ${API_URL}${endpoint.path}`);
      
      const startTime = Date.now();
      const response = await axios.get(`${API_URL}${endpoint.path}`, {
        params: endpoint.params,
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const responseTime = Date.now() - startTime;
      
      console.log(`   ✅ Status: ${response.status}`);
      console.log(`   ⏱️  Response Time: ${responseTime}ms`);
      
      if (response.data) {
        console.log(`   📦 Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
      }
      
      successCount++;
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      if (error.response) {
        console.log(`   📄 Status: ${error.response.status}`);
        console.log(`   📄 Response: ${JSON.stringify(error.response.data)}`);
      }
    }
  }

  console.log(`\n\n📊 結果: ${successCount}/${endpoints.length} エンドポイントが成功しました`);
  
  if (successCount === endpoints.length) {
    console.log('✅ すべてのエンドポイントが正常に動作しています！\n');
  } else if (successCount > 0) {
    console.log('⚠️  一部のエンドポイントで問題が発生しています\n');
  } else {
    console.log('❌ すべてのエンドポイントで接続に失敗しました\n');
    process.exit(1);
  }
}

testBackendConnection().catch(error => {
  console.error('❌ テスト実行中にエラーが発生しました:', error.message);
  process.exit(1);
});