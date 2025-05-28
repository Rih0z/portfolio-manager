const axios = require('axios');

// AWS Lambda エンドポイント
const BASE_URL = 'https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev';

// テスト用のAPIクライアントクラス
class PfwiseApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.sessionId = null;
  }

  // 市場データ取得テスト
  async getMarketData(symbols, type = 'us-stock') {
    try {
      const response = await axios.get(`${this.baseUrl}/api/market-data`, {
        params: { symbols, type },
        timeout: 30000
      });
      return response.data;
    } catch (error) {
      console.error('Market data error:', error.response?.data || error.message);
      throw error;
    }
  }

  // システムステータス取得テスト
  async getStatus() {
    try {
      const response = await axios.get(`${this.baseUrl}/admin/status`, {
        timeout: 30000
      });
      return response.data;
    } catch (error) {
      console.error('Status error:', error.response?.data || error.message);
      throw error;
    }
  }

  // セッション取得テスト
  async getSession() {
    try {
      const response = await axios.get(`${this.baseUrl}/auth/session`, {
        headers: this.sessionId ? { Cookie: `sessionId=${this.sessionId}` } : {},
        timeout: 30000
      });
      return response.data;
    } catch (error) {
      console.error('Session error:', error.response?.data || error.message);
      throw error;
    }
  }

  // ファイル一覧取得テスト
  async listFiles() {
    try {
      const response = await axios.get(`${this.baseUrl}/drive/files`, {
        headers: this.sessionId ? { Cookie: `sessionId=${this.sessionId}` } : {},
        timeout: 30000
      });
      return response.data;
    } catch (error) {
      console.error('List files error:', error.response?.data || error.message);
      throw error;
    }
  }
}

// メインテスト関数
async function testAwsEnvironment() {
  console.log('🚀 AWS Lambda 環境テスト開始');
  console.log(`Base URL: ${BASE_URL}`);
  
  const client = new PfwiseApiClient(BASE_URL);
  const testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // テスト1: 市場データ取得（パブリックAPI）
  console.log('\n1️⃣ 市場データ取得テスト (AAPL)');
  try {
    const marketData = await client.getMarketData('AAPL');
    console.log('✅ 市場データ取得成功:', marketData);
    testResults.passed++;
    testResults.tests.push({ name: '市場データ取得', status: 'PASS' });
  } catch (error) {
    console.log('❌ 市場データ取得失敗');
    testResults.failed++;
    testResults.tests.push({ name: '市場データ取得', status: 'FAIL', error: error.message });
  }

  // テスト2: 日本株データ取得
  console.log('\n2️⃣ 日本株データ取得テスト (7203)');
  try {
    const marketData = await client.getMarketData('7203', 'jp-stock');
    console.log('✅ 日本株データ取得成功:', marketData);
    testResults.passed++;
    testResults.tests.push({ name: '日本株データ取得', status: 'PASS' });
  } catch (error) {
    console.log('❌ 日本株データ取得失敗');
    testResults.failed++;
    testResults.tests.push({ name: '日本株データ取得', status: 'FAIL', error: error.message });
  }

  // テスト3: セッション確認（期待される失敗）
  console.log('\n3️⃣ セッション確認テスト（認証なしでの期待される失敗）');
  try {
    const session = await client.getSession();
    console.log('❌ セッション確認で予期しない成功:', session);
    testResults.failed++;
    testResults.tests.push({ name: 'セッション確認', status: 'FAIL', error: '認証なしで成功してしまった' });
  } catch (error) {
    console.log('✅ セッション確認が期待通り失敗（認証が必要）');
    testResults.passed++;
    testResults.tests.push({ name: 'セッション確認（認証必須）', status: 'PASS' });
  }

  // テスト結果サマリー
  console.log('\n📊 テスト結果サマリー');
  console.log('='.repeat(50));
  console.log(`✅ 成功: ${testResults.passed}`);
  console.log(`❌ 失敗: ${testResults.failed}`);
  console.log(`📝 合計: ${testResults.passed + testResults.failed}`);
  
  console.log('\n📋 詳細結果:');
  testResults.tests.forEach((test, index) => {
    const icon = test.status === 'PASS' ? '✅' : '❌';
    console.log(`${index + 1}. ${icon} ${test.name}: ${test.status}`);
    if (test.error) {
      console.log(`   エラー: ${test.error}`);
    }
  });

  if (testResults.failed === 0) {
    console.log('\n🎉 すべてのテストが成功しました！AWS環境は正常に動作しています。');
  } else {
    console.log('\n⚠️ 一部のテストが失敗しました。AWS環境の設定を確認してください。');
  }

  return testResults;
}

// スクリプト実行
if (require.main === module) {
  testAwsEnvironment()
    .then((results) => {
      process.exit(results.failed === 0 ? 0 : 1);
    })
    .catch((error) => {
      console.error('テスト実行エラー:', error);
      process.exit(1);
    });
}

module.exports = { PfwiseApiClient, testAwsEnvironment };