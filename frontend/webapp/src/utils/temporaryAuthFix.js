/**
 * 一時的な認証修正
 * CORSエラーを回避するための開発用コード
 */

export const testGoogleAuth = async () => {
  console.log('=== Google認証テスト開始 ===');
  
  // 1. OPTIONS プリフライトテスト
  console.log('1. OPTIONS プリフライトテスト...');
  try {
    const optionsResponse = await fetch('https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod/auth/google/login', {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
      }
    });
    
    console.log('OPTIONS Status:', optionsResponse.status);
    console.log('CORS Headers:', {
      'Allow-Origin': optionsResponse.headers.get('access-control-allow-origin'),
      'Allow-Methods': optionsResponse.headers.get('access-control-allow-methods'),
      'Allow-Headers': optionsResponse.headers.get('access-control-allow-headers'),
      'Allow-Credentials': optionsResponse.headers.get('access-control-allow-credentials')
    });
  } catch (error) {
    console.error('OPTIONS Error:', error);
  }
  
  // 2. 実際のPOSTリクエストテスト
  console.log('\n2. POST リクエストテスト...');
  try {
    const postResponse = await fetch('https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod/auth/google/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        credential: 'test.credential',
        test: true
      })
    });
    
    console.log('POST Status:', postResponse.status);
    const data = await postResponse.json();
    console.log('Response Data:', data);
  } catch (error) {
    console.error('POST Error:', error);
  }
  
  console.log('=== テスト完了 ===');
};

// ブラウザコンソールで実行可能にする
window.testGoogleAuth = testGoogleAuth;