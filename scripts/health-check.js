#!/usr/bin/env node

/**
 * ヘルスチェックスクリプト
 * AWS APIの動作確認とバックエンドチームへの通知
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 環境変数の読み込み
require('dotenv').config({ path: '.env.development' });

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

if (!API_BASE_URL) {
  console.error('❌ エラー: REACT_APP_API_BASE_URL が設定されていません');
  process.exit(1);
}

// ヘルスチェック結果を格納
const results = {
  timestamp: new Date().toISOString(),
  apiBaseUrl: API_BASE_URL,
  checks: [],
  issues: [],
  recommendations: []
};

// 1. 設定エンドポイントの確認
async function checkConfigEndpoint() {
  console.log('\n📋 設定エンドポイントの確認...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/dev/config/client`, {
      timeout: 10000
    });
    
    if (response.data && response.data.success) {
      console.log('✅ 設定エンドポイント: 正常');
      results.checks.push({
        endpoint: '/dev/config/client',
        status: 'OK',
        hasGoogleClientId: !!response.data.config?.googleClientId
      });
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('❌ 設定エンドポイント: エラー');
    console.error(`   詳細: ${error.message}`);
    results.checks.push({
      endpoint: '/dev/config/client',
      status: 'ERROR',
      error: error.message
    });
    results.issues.push('設定エンドポイントにアクセスできません');
  }
}

// 2. 認証エンドポイントの確認（CORS設定の確認）
async function checkAuthEndpoint() {
  console.log('\n🔐 認証エンドポイントの確認...');
  
  try {
    // OPTIONSリクエストでCORS確認
    const response = await axios.options(`${API_BASE_URL}/dev/auth/google/login`, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
      },
      timeout: 10000
    });
    
    const corsHeaders = {
      'access-control-allow-origin': response.headers['access-control-allow-origin'],
      'access-control-allow-credentials': response.headers['access-control-allow-credentials'],
      'access-control-allow-methods': response.headers['access-control-allow-methods']
    };
    
    console.log('✅ CORS設定: 確認完了');
    console.log(`   Allow-Origin: ${corsHeaders['access-control-allow-origin'] || '未設定'}`);
    console.log(`   Allow-Credentials: ${corsHeaders['access-control-allow-credentials'] || '未設定'}`);
    
    results.checks.push({
      endpoint: '/dev/auth/google/login',
      status: 'OK',
      cors: corsHeaders
    });
    
    // CORS設定の問題をチェック
    if (!corsHeaders['access-control-allow-credentials']) {
      results.issues.push('認証エンドポイントで Allow-Credentials が設定されていません');
      results.recommendations.push('Lambda関数のレスポンスヘッダーに "Access-Control-Allow-Credentials": "true" を追加してください');
    }
    
  } catch (error) {
    console.error('❌ 認証エンドポイント: エラー');
    console.error(`   詳細: ${error.message}`);
    results.checks.push({
      endpoint: '/dev/auth/google/login',
      status: 'ERROR',
      error: error.message
    });
  }
}

// 3. 市場データエンドポイントの確認
async function checkMarketDataEndpoint() {
  console.log('\n📈 市場データエンドポイントの確認...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/dev/api/market-data`, {
      params: {
        type: 'exchange-rate',
        base: 'USD',
        target: 'JPY'
      },
      timeout: 10000
    });
    
    if (response.data) {
      console.log('✅ 市場データエンドポイント: 正常');
      console.log(`   為替レート: 1 USD = ${response.data.rate || '取得失敗'} JPY`);
      results.checks.push({
        endpoint: '/dev/api/market-data',
        status: 'OK',
        exchangeRate: response.data.rate
      });
    }
  } catch (error) {
    console.error('❌ 市場データエンドポイント: エラー');
    console.error(`   詳細: ${error.message}`);
    results.checks.push({
      endpoint: '/dev/api/market-data',
      status: 'ERROR',
      error: error.message
    });
    
    if (error.response?.status === 429) {
      results.issues.push('市場データAPIのレート制限に達しています');
      results.recommendations.push('API Gateway のスロットリング設定を確認してください');
    }
  }
}

// 4. レポート生成
function generateReport() {
  console.log('\n📊 ヘルスチェックレポート');
  console.log('========================');
  console.log(`実行日時: ${results.timestamp}`);
  console.log(`API URL: ${results.apiBaseUrl}`);
  
  // チェック結果のサマリー
  const okCount = results.checks.filter(c => c.status === 'OK').length;
  const errorCount = results.checks.filter(c => c.status === 'ERROR').length;
  
  console.log(`\n結果: ${okCount} 成功 / ${errorCount} エラー`);
  
  // 問題点
  if (results.issues.length > 0) {
    console.log('\n⚠️  検出された問題:');
    results.issues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue}`);
    });
  }
  
  // 推奨事項
  if (results.recommendations.length > 0) {
    console.log('\n💡 推奨される対応:');
    results.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
  }
  
  // 認証トークンの問題
  console.log('\n🔑 認証トークンについて:');
  console.log('現在、バックエンドが認証成功時にJWTトークンを返していません。');
  console.log('フロントエンドは以下のいずれかのフィールドでトークンを期待しています:');
  console.log('- response.token');
  console.log('- response.accessToken');
  console.log('- response.data.token');
  
  // レポートファイルの保存
  const messageDir = path.join(__dirname, '..', 'document', 'message');
  if (!fs.existsSync(messageDir)) {
    fs.mkdirSync(messageDir, { recursive: true });
  }
  
  const reportPath = path.join(messageDir, 'health-check-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 詳細レポートを保存しました: ${reportPath}`);
}

// 5. バックエンドチームへのメッセージ生成
function generateBackendMessage() {
  // document/messageフォルダが存在することを確認
  const messageDir = path.join(__dirname, '..', 'document', 'message');
  if (!fs.existsSync(messageDir)) {
    fs.mkdirSync(messageDir, { recursive: true });
  }
  
  const messagePath = path.join(messageDir, 'BACKEND_HEALTH_CHECK_MESSAGE.md');
  
  const message = `# バックエンドAPIヘルスチェック結果

実行日時: ${results.timestamp}

## 確認したエンドポイント

${results.checks.map(check => 
`- **${check.endpoint}**: ${check.status === 'OK' ? '✅ 正常' : '❌ エラー'}
  ${check.error ? `  - エラー: ${check.error}` : ''}
  ${check.cors ? `  - CORS設定: ${JSON.stringify(check.cors, null, 2)}` : ''}`
).join('\n')}

## 検出された問題

${results.issues.length > 0 ? results.issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n') : '問題は検出されませんでした。'}

## 推奨される対応

${results.recommendations.length > 0 ? results.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n') : '特にありません。'}

## 重要: 認証トークンの実装について

現在、\`/dev/auth/google/login\` エンドポイントが認証成功時にJWTトークンを返していません。

**期待されるレスポンス形式:**
\`\`\`json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // これが必要
  "user": {
    "id": "...",
    "email": "...",
    "name": "..."
  }
}
\`\`\`

フロントエンドは以下のフィールドのいずれかでトークンを探しています:
- \`response.token\`
- \`response.accessToken\`
- \`response.access_token\`
- \`response.data.token\`

よろしくお願いいたします。
`;

  fs.writeFileSync(messagePath, message);
  console.log(`\n📨 バックエンドチームへのメッセージを生成しました: ${messagePath}`);
}

// メイン実行
async function main() {
  console.log('🏥 Portfolio Manager ヘルスチェック');
  console.log('=====================================');
  
  await checkConfigEndpoint();
  await checkAuthEndpoint();
  await checkMarketDataEndpoint();
  
  generateReport();
  generateBackendMessage();
  
  console.log('\n✨ ヘルスチェック完了！');
  
  // エラーがある場合は非ゼロで終了
  const hasErrors = results.checks.some(c => c.status === 'ERROR');
  process.exit(hasErrors ? 1 : 0);
}

// 実行
main().catch(error => {
  console.error('予期しないエラー:', error);
  process.exit(1);
});