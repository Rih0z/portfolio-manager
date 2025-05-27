const axios = require('axios');

const API_BASE_URL = 'https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev';

async function testEndpoints() {
  console.log('🔍 認証エンドポイントのテストを開始します...\n');

  // 1. セッションエンドポイントのテスト
  console.log('1️⃣ セッションエンドポイントのテスト');
  try {
    const sessionResponse = await axios.get(`${API_BASE_URL}/auth/session`, {
      headers: {
        'Origin': 'http://localhost:3001'
      }
    });
    console.log('✅ セッションエンドポイント正常:', sessionResponse.data);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ セッションエンドポイント正常 (401: 認証なし):', error.response.data);
    } else {
      console.error('❌ セッションエンドポイントエラー:', error.message);
    }
  }

  // 2. Google認証エンドポイントのCORSテスト
  console.log('\n2️⃣ Google認証エンドポイントのCORSテスト');
  try {
    const corsResponse = await axios.options(`${API_BASE_URL}/auth/google/login`, {
      headers: {
        'Origin': 'http://localhost:3001',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
      }
    });
    console.log('✅ CORS設定正常:');
    console.log('  - Status:', corsResponse.status);
    console.log('  - Allow-Origin:', corsResponse.headers['access-control-allow-origin']);
    console.log('  - Allow-Methods:', corsResponse.headers['access-control-allow-methods']);
    console.log('  - Allow-Headers:', corsResponse.headers['access-control-allow-headers']);
    console.log('  - Allow-Credentials:', corsResponse.headers['access-control-allow-credentials']);
  } catch (error) {
    console.error('❌ CORSエラー:', error.message);
  }

  // 3. Google認証エンドポイントのテスト（無効なコード）
  console.log('\n3️⃣ Google認証エンドポイントのテスト');
  try {
    const authResponse = await axios.post(`${API_BASE_URL}/auth/google/login`, {
      code: 'invalid_test_code',
      redirectUri: 'http://localhost:3001/auth/callback'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3001'
      }
    });
    console.log('認証レスポンス:', authResponse.data);
  } catch (error) {
    if (error.response && (error.response.status === 400 || error.response.status === 401)) {
      console.log('✅ 認証エンドポイント正常 (エラーレスポンス):', error.response.data);
    } else {
      console.error('❌ 認証エンドポイントエラー:', error.message);
    }
  }

  // 4. ログアウトエンドポイントのテスト
  console.log('\n4️⃣ ログアウトエンドポイントのテスト');
  try {
    const logoutResponse = await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
      headers: {
        'Origin': 'http://localhost:3001'
      }
    });
    console.log('✅ ログアウトエンドポイント正常:', logoutResponse.data);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ ログアウトエンドポイント正常 (401: 認証なし):', error.response.data);
    } else {
      console.error('❌ ログアウトエンドポイントエラー:', error.message);
    }
  }

  console.log('\n✨ テスト完了');
}

testEndpoints();