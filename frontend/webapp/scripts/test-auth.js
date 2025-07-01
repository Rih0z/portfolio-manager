#!/usr/bin/env node

/**
 * 認証システムの包括的テストスクリプト
 * 本番環境とプレビュー環境の両方で認証システムをテスト
 */

const https = require('https');
const axios = require('axios');

// テスト対象のURL
const PRODUCTION_URL = 'https://portfolio-wise.com';
const PREVIEW_URL = 'https://2e7581dc.pfwise-portfolio-manager.pages.dev';
const API_BASE_URL = 'https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod';

// テストレポート
const testResults = {
  production: {},
  preview: {},
  api: {},
  timestamp: new Date().toISOString()
};

// テスト実行関数
async function runTests() {
  console.log('🔍 Google認証システムの包括的テストを開始します...\n');
  
  // 1. API バックエンドテスト
  console.log('📡 バックエンドAPIテスト:');
  await testBackendAPI();
  
  // 2. プロキシ設定テスト
  console.log('\n🔄 プロキシ設定テスト:');
  await testProxyConfiguration();
  
  // 3. 本番環境テスト
  console.log('\n🌍 本番環境テスト:');
  await testEnvironment(PRODUCTION_URL, 'production');
  
  // 4. プレビュー環境テスト
  console.log('\n🚀 プレビュー環境テスト:');
  await testEnvironment(PREVIEW_URL, 'preview');
  
  // 5. テスト結果のサマリー
  console.log('\n📊 テスト結果サマリー:');
  printTestSummary();
}

// バックエンドAPIテスト
async function testBackendAPI() {
  const tests = [
    {
      name: 'Config エンドポイント',
      url: `${API_BASE_URL}/config/public`,
      expected: { success: true }
    },
    {
      name: 'Auth ログインエンドポイント (POST)',
      url: `${API_BASE_URL}/auth/google/login`,
      method: 'POST',
      data: { test: 'connectivity' },
      expectError: true // 502はGoogle認証なしでは正常
    }
  ];
  
  for (const test of tests) {
    try {
      const config = {
        method: test.method || 'GET',
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Portfolio-Manager-Test-Script'
        }
      };
      
      if (test.data) {
        config.data = test.data;
      }
      
      const response = await axios(test.url, config);
      
      console.log(`  ✅ ${test.name}: ${response.status} ${response.statusText}`);
      testResults.api[test.name] = {
        status: 'success',
        statusCode: response.status,
        data: response.data
      };
      
    } catch (error) {
      const status = error.response?.status || 'no response';
      const statusText = error.response?.statusText || error.message;
      
      if (test.expectError && (status === 502 || status === 500)) {
        console.log(`  ⚠️  ${test.name}: ${status} ${statusText} (予期される動作)`);
        testResults.api[test.name] = {
          status: 'expected_error',
          statusCode: status,
          message: statusText
        };
      } else {
        console.log(`  ❌ ${test.name}: ${status} ${statusText}`);
        testResults.api[test.name] = {
          status: 'error',
          statusCode: status,
          message: statusText
        };
      }
    }
  }
}

// プロキシ設定テスト
async function testProxyConfiguration() {
  const proxyTests = [
    {
      name: '本番環境 プロキシ設定',
      url: `${PRODUCTION_URL}/api-proxy/config/public`
    },
    {
      name: 'プレビュー環境 プロキシ設定',
      url: `${PREVIEW_URL}/api-proxy/config/public`
    }
  ];
  
  for (const test of proxyTests) {
    try {
      const response = await axios.get(test.url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Portfolio-Manager-Test-Script'
        }
      });
      
      console.log(`  ✅ ${test.name}: ${response.status} - プロキシ動作中`);
      
      if (response.data?.success && response.data?.data?.googleClientId) {
        console.log(`    📋 Google Client ID: ${response.data.data.googleClientId.substring(0, 20)}...`);
      }
      
    } catch (error) {
      const status = error.response?.status || 'no response';
      console.log(`  ❌ ${test.name}: ${status} - プロキシエラー`);
    }
  }
}

// 環境別テスト
async function testEnvironment(baseUrl, envName) {
  const tests = [
    {
      name: 'ページ読み込み',
      path: '/'
    },
    {
      name: 'API プロキシ (Config)',
      path: '/api-proxy/config/public'
    }
  ];
  
  for (const test of tests) {
    try {
      const url = baseUrl + test.path;
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Portfolio-Manager-Test-Script'
        }
      });
      
      console.log(`  ✅ ${test.name}: ${response.status} ${response.statusText}`);
      
      if (test.path === '/' && response.data?.includes('You need to enable JavaScript')) {
        console.log(`    ℹ️  JavaScript必須のReactアプリ (正常)`);
      }
      
      if (test.path.includes('config') && response.data?.success) {
        console.log(`    ✅ API設定取得成功`);
        if (response.data.data?.googleClientId) {
          console.log(`    📋 Google Client ID取得済み`);
        }
      }
      
      testResults[envName][test.name] = {
        status: 'success',
        statusCode: response.status
      };
      
    } catch (error) {
      const status = error.response?.status || 'no response';
      console.log(`  ❌ ${test.name}: ${status} ${error.message}`);
      
      testResults[envName][test.name] = {
        status: 'error',
        statusCode: status,
        message: error.message
      };
    }
  }
}

// テスト結果サマリー
function printTestSummary() {
  console.log('\n🔍 詳細分析:');
  
  // API状況
  const apiSuccess = Object.values(testResults.api).filter(r => r.status === 'success').length;
  const apiTotal = Object.keys(testResults.api).length;
  console.log(`  📡 バックエンドAPI: ${apiSuccess}/${apiTotal} 成功`);
  
  // 本番環境状況
  const prodSuccess = Object.values(testResults.production).filter(r => r.status === 'success').length;
  const prodTotal = Object.keys(testResults.production).length;
  console.log(`  🌍 本番環境: ${prodSuccess}/${prodTotal} 成功`);
  
  // プレビュー環境状況
  const prevSuccess = Object.values(testResults.preview).filter(r => r.status === 'success').length;
  const prevTotal = Object.keys(testResults.preview).length;
  console.log(`  🚀 プレビュー環境: ${prevSuccess}/${prevTotal} 成功`);
  
  console.log('\n🎯 推奨アクション:');
  
  if (apiSuccess === apiTotal && prodSuccess === prodTotal && prevSuccess === prevTotal) {
    console.log('  ✅ すべてのテストが成功しました！');
    console.log('  📱 ブラウザでhttps://portfolio-wise.com/にアクセスして手動テストを実行してください。');
    console.log('  🔐 Google認証ボタンが表示されるか確認してください。');
  } else {
    if (apiSuccess < apiTotal) {
      console.log('  ⚠️  バックエンドAPIに問題があります。AWS Lambda関数を確認してください。');
    }
    if (prodSuccess < prodTotal) {
      console.log('  ⚠️  本番環境に問題があります。Cloudflare Pagesの設定を確認してください。');
    }
    if (prevSuccess < prevTotal) {
      console.log('  ⚠️  プレビュー環境に問題があります。デプロイ設定を確認してください。');
    }
  }
  
  console.log('\n📋 次のステップ:');
  console.log('  1. ブラウザのDevToolsでConsoleエラーを確認');
  console.log('  2. Network tabでAPI通信状況を確認');
  console.log('  3. Google OAuth設定を確認');
  console.log('  4. CORS設定を確認');
  
  // JSONレポート生成
  console.log(`\n📄 詳細レポート: ${JSON.stringify(testResults, null, 2)}`);
}

// テスト実行
runTests().catch(error => {
  console.error('🚨 テスト実行エラー:', error.message);
  process.exit(1);
});