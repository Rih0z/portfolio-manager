const axios = require('axios');

// テスト用の認証コード（実際には無効）
const testAuthCode = '4/0AcvDMrDnH_test_invalid_code';
const redirectUri = 'http://localhost:3001/auth/callback';

async function testGoogleAuth() {
  const endpoint = 'https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/login';
  
  console.log('認証エンドポイントをテスト中...');
  console.log('エンドポイント:', endpoint);
  console.log('リダイレクトURI:', redirectUri);
  
  try {
    const response = await axios.post(endpoint, {
      code: testAuthCode,
      redirectUri: redirectUri
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3001'
      }
    });
    
    console.log('成功レスポンス:', response.data);
  } catch (error) {
    if (error.response) {
      console.error('エラーレスポンス:');
      console.error('ステータス:', error.response.status);
      console.error('データ:', JSON.stringify(error.response.data, null, 2));
      console.error('ヘッダー:', error.response.headers);
    } else if (error.request) {
      console.error('リクエストエラー:', error.request);
    } else {
      console.error('エラー:', error.message);
    }
  }
}

testGoogleAuth();