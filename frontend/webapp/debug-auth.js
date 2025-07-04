/**
 * 認証エラー詳細調査用デバッグスクリプト
 * 
 * 使用方法:
 * 1. https://portfolio-wise.com/ をブラウザで開く
 * 2. F12でDevToolsを開く
 * 3. Consoleタブに移動
 * 4. このスクリプトをコピー＆ペーストして実行
 */

console.log('%c=== 認証エラー詳細調査スクリプト ===', 'color: blue; font-weight: bold; font-size: 16px;');
console.log('開始時刻:', new Date().toISOString());

// ネットワークタブ監視の開始を促す
console.log('%c⚠️ ブラウザのNetworkタブを開いて、すべてのリクエストを監視してください', 'color: orange; font-weight: bold;');

// 環境情報の確認
console.log('\n%c=== 環境情報 ===', 'color: green; font-weight: bold;');
console.log('Current URL:', window.location.href);
console.log('Origin:', window.location.origin);
console.log('Protocol:', window.location.protocol);
console.log('Host:', window.location.host);
console.log('User Agent:', navigator.userAgent);

// Cookie情報の確認
console.log('\n%c=== Cookie情報 ===', 'color: green; font-weight: bold;');
const cookies = document.cookie.split(';').map(c => c.trim()).filter(c => c);
console.log('Raw Cookies:', document.cookie);
console.log('Cookie数:', cookies.length);
console.log('Cookie詳細:');
cookies.forEach(cookie => {
  const [name, value] = cookie.split('=');
  console.log(`  - ${name}: ${value ? value.substring(0, 30) + (value.length > 30 ? '...' : '') : 'empty'}`);
});

// 環境変数の確認
console.log('\n%c=== 環境変数 ===', 'color: green; font-weight: bold;');
console.log('NODE_ENV:', process?.env?.NODE_ENV || 'undefined');
console.log('API Base URL:', process?.env?.REACT_APP_API_BASE_URL || 'undefined');
console.log('Default Exchange Rate:', process?.env?.REACT_APP_DEFAULT_EXCHANGE_RATE || 'undefined');

// 認証API直接テスト関数の定義
window.testAuth = async () => {
  console.log('\n%c=== 認証API直接テスト (simple-login) ===', 'color: purple; font-weight: bold;');
  
  try {
    const apiUrl = 'https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod/auth/google/simple-login';
    console.log('API URL:', apiUrl);
    console.log('Request Details:');
    console.log('  Method: POST');
    console.log('  Headers: Content-Type: application/json, Accept: application/json');
    console.log('  Credentials: include');
    
    const requestBody = { 
      credential: 'test-credential-for-debugging',
      state: 'test-state' 
    };
    console.log('  Body:', JSON.stringify(requestBody, null, 2));
    
    console.log('\n⏳ リクエスト送信中...');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(requestBody)
    });
    
    console.log('\n%c📥 レスポンス受信', 'color: blue; font-weight: bold;');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('OK:', response.ok);
    console.log('Type:', response.type);
    console.log('URL:', response.url);
    console.log('Redirected:', response.redirected);
    
    // ヘッダー情報
    console.log('\n%c📋 レスポンスヘッダー', 'color: blue; font-weight: bold;');
    const headerObj = {};
    for (let [key, value] of response.headers.entries()) {
      headerObj[key] = value;
      console.log(`  ${key}: ${value}`);
    }
    
    // レスポンスボディ
    const responseText = await response.text();
    console.log('\n%c📄 レスポンスボディ (Raw)', 'color: blue; font-weight: bold;');
    console.log('Length:', responseText.length);
    console.log('Content:', responseText);
    
    // JSONパース試行
    try {
      const responseJson = JSON.parse(responseText);
      console.log('\n%c📊 レスポンスボディ (JSON)', 'color: blue; font-weight: bold;');
      console.log(JSON.stringify(responseJson, null, 2));
    } catch (e) {
      console.log('\n%c❌ レスポンスはJSONではありません', 'color: red;');
      console.log('Parse Error:', e.message);
    }
    
    // Cookie変更確認
    console.log('\n%c🍪 Cookie変更確認', 'color: blue; font-weight: bold;');
    const newCookies = document.cookie.split(';').map(c => c.trim()).filter(c => c);
    console.log('レスポンス後のCookie数:', newCookies.length);
    console.log('レスポンス後のCookie:', document.cookie);
    
  } catch (error) {
    console.log('\n%c❌ Fetchエラー', 'color: red; font-weight: bold;');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    
    // 追加のエラー情報
    if (error.cause) {
      console.error('Error Cause:', error.cause);
    }
    
    console.log('\n%c🔍 エラー分析', 'color: orange; font-weight: bold;');
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      console.log('⚠️ これはCORSエラーの可能性があります');
      console.log('⚠️ ネットワークタブでプリフライトリクエスト(OPTIONS)を確認してください');
    } else if (error.name === 'AbortError') {
      console.log('⚠️ リクエストがタイムアウトまたはキャンセルされました');
    }
  }
};

// CORS プリフライトテスト関数
window.testCORS = async () => {
  console.log('\n%c=== CORS プリフライトテスト ===', 'color: purple; font-weight: bold;');
  
  try {
    const apiUrl = 'https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod/auth/google/simple-login';
    console.log('API URL:', apiUrl);
    console.log('⏳ OPTIONSリクエスト送信中...');
    
    const response = await fetch(apiUrl, {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Accept',
        'Origin': window.location.origin
      }
    });
    
    console.log('\n%c📥 OPTIONSレスポンス', 'color: blue; font-weight: bold;');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    // CORSヘッダーの確認
    console.log('\n%c🔒 CORSヘッダー確認', 'color: blue; font-weight: bold;');
    const corsHeaders = [
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Methods',
      'Access-Control-Allow-Headers',
      'Access-Control-Allow-Credentials',
      'Access-Control-Max-Age'
    ];
    
    corsHeaders.forEach(header => {
      const value = response.headers.get(header);
      console.log(`  ${header}: ${value || '(設定なし)'}`);
    });
    
  } catch (error) {
    console.log('\n%c❌ CORS Preflight エラー', 'color: red; font-weight: bold;');
    console.error('Error:', error.message);
  }
};

// Google認証ボタンクリックテスト
window.testGoogleAuth = () => {
  console.log('\n%c=== Google認証ボタンテスト ===', 'color: purple; font-weight: bold;');
  
  // Google認証ボタンを探す
  const googleButton = document.querySelector('button');
  if (googleButton) {
    console.log('✅ Google認証ボタンが見つかりました');
    console.log('Button Text:', googleButton.textContent);
    console.log('Button Disabled:', googleButton.disabled);
    console.log('Button Classes:', googleButton.className);
    
    // クリックイベントをシミュレート
    console.log('⏳ ボタンクリックをシミュレート中...');
    googleButton.click();
    
    // クリック後の状態確認
    setTimeout(() => {
      console.log('Button Text After Click:', googleButton.textContent);
      console.log('Button Disabled After Click:', googleButton.disabled);
      console.log('Current URL After Click:', window.location.href);
    }, 1000);
    
  } else {
    console.log('❌ Google認証ボタンが見つかりません');
    console.log('ページ上のすべてのボタン:');
    document.querySelectorAll('button').forEach((btn, index) => {
      console.log(`  Button ${index + 1}: "${btn.textContent}" (${btn.className})`);
    });
  }
};

// エラーオブジェクト詳細表示関数
window.debugErrorObject = (errorObj) => {
  console.log('\n%c=== エラーオブジェクト詳細分析 ===', 'color: purple; font-weight: bold;');
  
  if (!errorObj) {
    console.log('❌ エラーオブジェクトが提供されていません');
    return;
  }
  
  console.log('Error Type:', typeof errorObj);
  console.log('Error Constructor:', errorObj.constructor?.name);
  
  // オブジェクトのすべてのプロパティを表示
  console.log('\n📋 すべてのプロパティ:');
  for (let key in errorObj) {
    console.log(`  ${key}:`, errorObj[key]);
  }
  
  // Object.keysを使用
  console.log('\n🔑 Object.keys:');
  Object.keys(errorObj).forEach(key => {
    console.log(`  ${key}:`, errorObj[key]);
  });
  
  // JSON.stringify試行
  try {
    console.log('\n📄 JSON.stringify:');
    console.log(JSON.stringify(errorObj, null, 2));
  } catch (e) {
    console.log('❌ JSON.stringifyできません:', e.message);
  }
  
  // Object.getOwnPropertyNamesを使用
  console.log('\n🏷️ Own Property Names:');
  Object.getOwnPropertyNames(errorObj).forEach(prop => {
    console.log(`  ${prop}:`, errorObj[prop]);
  });
};

// 使用方法の表示
console.log('\n%c=== 使用可能な関数 ===', 'color: green; font-weight: bold;');
console.log('📞 testAuth() - 認証API直接テスト');
console.log('📞 testCORS() - CORS プリフライトテスト');
console.log('📞 testGoogleAuth() - Google認証ボタンクリックテスト');
console.log('📞 debugErrorObject(error) - エラーオブジェクト詳細分析');

console.log('\n%c=== 実行手順 ===', 'color: blue; font-weight: bold;');
console.log('1. Networkタブを開いて監視を開始');
console.log('2. testCORS() を実行してプリフライトをテスト');
console.log('3. testAuth() を実行してAPI直接テスト');
console.log('4. testGoogleAuth() を実行してボタンテスト');
console.log('5. 実際にGoogle認証ボタンをクリックしてエラーを観察');
console.log('6. エラーが発生したら debugErrorObject(エラー) で詳細分析');

console.log('\n%c✅ デバッグスクリプト準備完了', 'color: green; font-weight: bold;');
console.log('まず testCORS() を実行してください');