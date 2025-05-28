// 認証エンドポイントのテストスクリプト
import { getApiEndpoint } from './envUtils';

const testAuthEndpoint = async () => {
  const endpoint = getApiEndpoint('auth/google/login');
  console.log('認証エンドポイント:', endpoint);
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        code: 'test_code',
        redirectUri: 'http://localhost:3001/auth/callback'
      })
    });
    
    console.log('レスポンスステータス:', response.status);
    const data = await response.json();
    console.log('レスポンスデータ:', data);
  } catch (error) {
    console.error('テストエラー:', error);
  }
};

export { testAuthEndpoint };