/**
 * Google Drive Cookie送信テストスクリプト
 * 
 * 使用方法:
 * 1. npm start でアプリを起動
 * 2. ブラウザのコンソールでこのスクリプトを実行
 */

// Cookie分析関数
function analyzeCookies() {
  const cookies = document.cookie.split(';').map(c => c.trim()).filter(c => c);
  console.log('=== Cookie Analysis ===');
  console.log('Total cookies:', cookies.length);
  console.log('Cookie list:');
  cookies.forEach(cookie => {
    const [name, value] = cookie.split('=');
    console.log(`  - ${name}: ${value ? value.substring(0, 30) + '...' : 'empty'}`);
  });
  return cookies;
}

// Google Drive認証フローのテスト
async function testGoogleDriveAuth() {
  console.log('\n🧪 Google Drive認証フローテスト開始\n');
  
  // Step 1: 現在のCookie状態を確認
  console.log('Step 1: 初期Cookie状態');
  analyzeCookies();
  
  // Step 2: ログイン状態を確認
  console.log('\nStep 2: 認証状態確認');
  const authToken = localStorage.getItem('authToken');
  console.log('Auth token exists:', !!authToken);
  
  // Step 3: Google Drive認証エンドポイントをテスト
  console.log('\nStep 3: Drive認証エンドポイントテスト');
  
  const apiUrl = process.env.REACT_APP_API_BASE_URL || 
                 process.env.REACT_APP_MARKET_DATA_API_URL || 
                 'http://localhost:3000/dev';
  const driveInitUrl = `${apiUrl}/auth/google/drive/initiate`;
  
  console.log('API URL:', apiUrl);
  console.log('Drive Init URL:', driveInitUrl);
  
  // XMLHttpRequestでテスト
  console.log('\n--- XMLHttpRequest Test ---');
  try {
    const xhr = new XMLHttpRequest();
    xhr.withCredentials = true;
    xhr.open('GET', driveInitUrl, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
    // Authorizationヘッダーを追加（もしトークンがあれば）
    if (authToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    }
    
    xhr.onload = function() {
      console.log('XHR Response:', {
        status: xhr.status,
        response: xhr.responseText,
        headers: xhr.getAllResponseHeaders()
      });
    };
    
    xhr.onerror = function() {
      console.error('XHR Error:', xhr.statusText);
    };
    
    console.log('Sending XHR with cookies:', document.cookie);
    xhr.send();
    
  } catch (error) {
    console.error('XHR test failed:', error);
  }
  
  // Fetch APIでテスト
  console.log('\n--- Fetch API Test ---');
  try {
    const headers = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    console.log('Sending fetch with credentials: include');
    const response = await fetch(driveInitUrl, {
      method: 'GET',
      credentials: 'include',
      headers: headers
    });
    
    console.log('Fetch Response:', {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    const data = await response.json();
    console.log('Response data:', data);
    
  } catch (error) {
    console.error('Fetch test failed:', error);
  }
  
  // Step 4: Cookie状態の最終確認
  console.log('\nStep 4: 最終Cookie状態');
  analyzeCookies();
  
  console.log('\n✅ テスト完了\n');
}

// CORSヘッダーの確認
async function checkCorsHeaders() {
  console.log('\n🌐 CORS設定確認\n');
  
  const apiUrl = process.env.REACT_APP_API_BASE_URL || 
                 process.env.REACT_APP_MARKET_DATA_API_URL || 
                 'http://localhost:3000/dev';
  
  try {
    // プリフライトリクエスト
    const response = await fetch(apiUrl + '/auth/google/drive/initiate', {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type,authorization,x-requested-with'
      }
    });
    
    console.log('CORS Preflight Response:', {
      status: response.status,
      'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials'),
      'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
    });
    
  } catch (error) {
    console.error('CORS check failed:', error);
  }
}

// デバッグ情報の収集
function collectDebugInfo() {
  console.log('\n📋 デバッグ情報収集\n');
  
  const info = {
    browser: {
      userAgent: navigator.userAgent,
      cookieEnabled: navigator.cookieEnabled,
      protocol: window.location.protocol,
      host: window.location.host,
      origin: window.location.origin
    },
    cookies: {
      all: document.cookie,
      count: document.cookie.split(';').filter(c => c.trim()).length,
      sessionCookie: document.cookie.includes('session'),
      connectSid: document.cookie.includes('connect.sid'),
      authCookie: document.cookie.includes('auth')
    },
    localStorage: {
      hasAuthToken: !!localStorage.getItem('authToken'),
      keys: Object.keys(localStorage)
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      apiUrl: process.env.REACT_APP_MARKET_DATA_API_URL
    }
  };
  
  console.log('Debug Info:', JSON.stringify(info, null, 2));
  return info;
}

// メイン実行関数
async function runAllTests() {
  console.clear();
  console.log('🚀 Google Drive Cookie送信問題デバッグ開始');
  console.log('=====================================\n');
  
  // デバッグ情報収集
  collectDebugInfo();
  
  // CORS設定確認
  await checkCorsHeaders();
  
  // Google Drive認証テスト
  await testGoogleDriveAuth();
  
  console.log('\n=====================================');
  console.log('📊 デバッグ完了！');
  console.log('\n次のステップ:');
  console.log('1. Network タブで実際のリクエストヘッダーを確認');
  console.log('2. Set-Cookie レスポンスヘッダーの存在を確認');
  console.log('3. Cookie が送信されているか確認');
}

// 実行
runAllTests();