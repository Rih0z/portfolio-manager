/**
 * Cookie Debug Utilities
 * Cookie送信問題のデバッグ用ユーティリティ
 */

// Cookieの詳細情報を取得
export const analyzeCookies = () => {
  const cookieString = document.cookie;
  const cookies = cookieString.split(';').map(c => c.trim()).filter(c => c);
  
  const cookieDetails = cookies.map(cookie => {
    const [name, value] = cookie.split('=');
    return {
      name: name?.trim(),
      value: value?.trim(),
      length: value?.length || 0,
      preview: value ? value.substring(0, 30) + (value.length > 30 ? '...' : '') : 'empty'
    };
  });

  return {
    cookieString,
    count: cookies.length,
    hasCookies: cookies.length > 0,
    cookies: cookieDetails,
    sessionCookies: cookieDetails.filter(c => 
      c.name?.includes('session') || 
      c.name?.includes('connect.sid') || 
      c.name?.includes('auth')
    )
  };
};

// Cookie送信状態をログ出力
export const logCookieStatus = (context = '') => {
  const analysis = analyzeCookies();
  
  console.group(`🍪 Cookie Status ${context ? `(${context})` : ''}`);
  console.log('Cookie count:', analysis.count);
  console.log('Has cookies:', analysis.hasCookies);
  console.log('Session cookies:', analysis.sessionCookies);
  console.log('All cookies:', analysis.cookies);
  console.log('Raw cookie string:', analysis.cookieString);
  console.groupEnd();
  
  return analysis;
};

// Google Drive認証デバッグヘルパー
export const debugDriveAuth = async (authFetch, getApiEndpoint) => {
  console.group('🔍 Google Drive Auth Debug');
  
  // 1. Cookie状態確認
  logCookieStatus('Before Drive Auth');
  
  // 2. テストリクエスト
  console.log('Testing Drive auth endpoint...');
  try {
    const testEndpoint = getApiEndpoint('auth/google/drive/initiate');
    console.log('Test endpoint:', testEndpoint);
    
    // XMLHttpRequestで直接テスト（比較用）
    console.log('Testing with XMLHttpRequest...');
    const xhr = new XMLHttpRequest();
    xhr.withCredentials = true;
    xhr.open('GET', testEndpoint, false); // 同期的に実行（デバッグ用）
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
    console.log('XHR settings:', {
      withCredentials: xhr.withCredentials,
      readyState: xhr.readyState
    });
    
    // 実際には送信しない（デバッグ情報の確認のみ）
    console.log('XHR would send with cookies:', document.cookie);
    
  } catch (error) {
    console.error('Debug test failed:', error);
  }
  
  console.groupEnd();
};

// Cookie設定テスト（開発環境用）
export const testCookieSettings = () => {
  console.group('🧪 Cookie Settings Test');
  
  // テスト用Cookieを設定
  const testCookieName = 'test_cookie_' + Date.now();
  document.cookie = `${testCookieName}=test_value; path=/`;
  
  // 設定確認
  const hasTestCookie = document.cookie.includes(testCookieName);
  console.log('Test cookie set successfully:', hasTestCookie);
  
  // クリーンアップ
  document.cookie = `${testCookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
  
  // SameSite属性のテスト
  console.log('Testing SameSite settings...');
  try {
    // SameSite=None; Secureのテスト（HTTPSが必要）
    if (window.location.protocol === 'https:') {
      document.cookie = 'test_samesite_none=value; SameSite=None; Secure; path=/';
      console.log('SameSite=None cookie set (HTTPS)');
    } else {
      console.warn('SameSite=None requires HTTPS');
    }
    
    // SameSite=Laxのテスト
    document.cookie = 'test_samesite_lax=value; SameSite=Lax; path=/';
    console.log('SameSite=Lax cookie set');
    
  } catch (error) {
    console.error('SameSite test failed:', error);
  }
  
  console.groupEnd();
};

// CORS設定確認用のテストリクエスト
export const testCorsSettings = async (apiEndpoint) => {
  console.group('🌐 CORS Settings Test');
  
  try {
    const response = await fetch(apiEndpoint, {
      method: 'OPTIONS',
      credentials: 'include',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type,x-requested-with'
      }
    });
    
    console.log('CORS preflight response:', {
      status: response.status,
      headers: {
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'access-control-allow-credentials': response.headers.get('access-control-allow-credentials'),
        'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
        'access-control-allow-headers': response.headers.get('access-control-allow-headers')
      }
    });
    
  } catch (error) {
    console.error('CORS test failed:', error);
  }
  
  console.groupEnd();
};

export default {
  analyzeCookies,
  logCookieStatus,
  debugDriveAuth,
  testCookieSettings,
  testCorsSettings
};