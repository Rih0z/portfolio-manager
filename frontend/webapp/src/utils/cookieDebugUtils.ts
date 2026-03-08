/**
 * Cookie Debug Utilities
 * Cookie送信問題のデバッグ用ユーティリティ
 */
import logger from './logger';

interface CookieDetail {
  name: string | undefined;
  value: string | undefined;
  length: number;
  preview: string;
}

interface CookieAnalysis {
  cookieString: string;
  count: number;
  hasCookies: boolean;
  cookies: CookieDetail[];
  sessionCookies: CookieDetail[];
}

// Cookieの詳細情報を取得
export const analyzeCookies = (): CookieAnalysis => {
  const cookieString = document.cookie;
  const cookies = cookieString.split(';').map(c => c.trim()).filter(c => c);

  const cookieDetails: CookieDetail[] = cookies.map((cookie: string) => {
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
    sessionCookies: cookieDetails.filter((c: CookieDetail) =>
      c.name?.includes('session') ||
      c.name?.includes('connect.sid') ||
      c.name?.includes('auth')
    )
  };
};

// Cookie送信状態をログ出力
export const logCookieStatus = (context: string = ''): CookieAnalysis => {
  const analysis = analyzeCookies();

  console.group(`Cookie Status ${context ? `(${context})` : ''}`);
  logger.log('Cookie count:', analysis.count);
  logger.log('Has cookies:', analysis.hasCookies);
  logger.log('Session cookies:', analysis.sessionCookies);
  logger.log('All cookies:', analysis.cookies);
  logger.log('Raw cookie string:', analysis.cookieString);
  console.groupEnd();

  return analysis;
};

// Google Drive認証デバッグヘルパー
export const debugDriveAuth = async (
  authFetch: (...args: any[]) => Promise<any>,
  getApiEndpoint: (path: string) => string | Promise<string>
): Promise<void> => {
  console.group('Google Drive Auth Debug');

  // 1. Cookie状態確認
  logCookieStatus('Before Drive Auth');

  // 2. テストリクエスト
  logger.log('Testing Drive auth endpoint...');
  try {
    const testEndpoint = getApiEndpoint('auth/google/drive/initiate');
    logger.log('Test endpoint:', testEndpoint);

    // XMLHttpRequestで直接テスト（比較用）
    logger.log('Testing with XMLHttpRequest...');
    const xhr = new XMLHttpRequest();
    xhr.withCredentials = true;
    xhr.open('GET', testEndpoint as string, false); // 同期的に実行（デバッグ用）
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

    logger.log('XHR settings:', {
      withCredentials: xhr.withCredentials,
      readyState: xhr.readyState
    });

    // 実際には送信しない（デバッグ情報の確認のみ）
    logger.log('XHR would send with cookies:', document.cookie);

  } catch (error) {
    logger.error('Debug test failed:', error);
  }

  console.groupEnd();
};

// Cookie設定テスト（開発環境用）
export const testCookieSettings = (): void => {
  console.group('Cookie Settings Test');

  // テスト用Cookieを設定
  const testCookieName = 'test_cookie_' + Date.now();
  document.cookie = `${testCookieName}=test_value; path=/`;

  // 設定確認
  const hasTestCookie = document.cookie.includes(testCookieName);
  logger.log('Test cookie set successfully:', hasTestCookie);

  // クリーンアップ
  document.cookie = `${testCookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;

  // SameSite属性のテスト
  logger.log('Testing SameSite settings...');
  try {
    // SameSite=None; Secureのテスト（HTTPSが必要）
    if (window.location.protocol === 'https:') {
      document.cookie = 'test_samesite_none=value; SameSite=None; Secure; path=/';
      logger.log('SameSite=None cookie set (HTTPS)');
    } else {
      logger.warn('SameSite=None requires HTTPS');
    }

    // SameSite=Laxのテスト
    document.cookie = 'test_samesite_lax=value; SameSite=Lax; path=/';
    logger.log('SameSite=Lax cookie set');

  } catch (error) {
    logger.error('SameSite test failed:', error);
  }

  console.groupEnd();
};

// CORS設定確認用のテストリクエスト
export const testCorsSettings = async (apiEndpoint: string): Promise<void> => {
  console.group('CORS Settings Test');

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

    logger.log('CORS preflight response:', {
      status: response.status,
      headers: {
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'access-control-allow-credentials': response.headers.get('access-control-allow-credentials'),
        'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
        'access-control-allow-headers': response.headers.get('access-control-allow-headers')
      }
    });

  } catch (error) {
    logger.error('CORS test failed:', error);
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
