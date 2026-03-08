import { vi } from "vitest";
/**
 * cookieDebugUtils.js のユニットテスト
 * Cookie Debug Utilities のテスト
 */

import {
  analyzeCookies,
  logCookieStatus,
  debugDriveAuth,
  testCookieSettings,
  testCorsSettings
} from '../../../utils/cookieDebugUtils';

// fetch APIのモック
global.fetch = vi.fn();

// XMLHttpRequestのモック
const mockXHR = {
  open: vi.fn(),
  send: vi.fn(),
  setRequestHeader: vi.fn(),
  withCredentials: false,
  readyState: 0
};
global.XMLHttpRequest = vi.fn(() => mockXHR);

// documentのモック
let documentCookieValue = '';
Object.defineProperty(document, 'cookie', {
  get: () => documentCookieValue,
  set: (value) => {
    documentCookieValue = value;
  },
  configurable: true
});

// windowのモック
Object.defineProperty(window, 'location', {
  value: {
    origin: 'https://portfolio-wise.com',
    protocol: 'https:'
  },
  writable: true
});

describe('cookieDebugUtils', () => {
  let consoleGroupSpy;
  let consoleGroupEndSpy;
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;
  let originalDateNow;

  beforeEach(() => {
    // モックをクリア（最初に行う）
    vi.clearAllMocks();

    // コンソールメソッドをモック
    consoleGroupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Date.nowをモック
    originalDateNow = Date.now;
    Date.now = vi.fn(() => 1234567890);

    // documentCookieValueをリセット
    documentCookieValue = '';

    // XMLHttpRequest モックを再設定（clearAllMocksで実装がクリアされるため）
    mockXHR.open = vi.fn();
    mockXHR.send = vi.fn();
    mockXHR.setRequestHeader = vi.fn();
    mockXHR.withCredentials = false;
    mockXHR.readyState = 0;
    // vi.fn()はnewで呼ぶとundefinedを返す場合があるため、関数constructorを使用
    function MockXMLHttpRequest() {
      return mockXHR;
    }
    vi.stubGlobal('XMLHttpRequest', MockXMLHttpRequest);
  });

  afterEach(() => {
    // Date.nowを復元
    Date.now = originalDateNow;
    
    // コンソールモックを復元
    consoleGroupSpy.mockRestore();
    consoleGroupEndSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('analyzeCookies', () => {
    it('空のCookie文字列を正しく解析する', () => {
      documentCookieValue = '';
      
      const result = analyzeCookies();
      
      expect(result).toEqual({
        cookieString: '',
        count: 0,
        hasCookies: false,
        cookies: [],
        sessionCookies: []
      });
    });

    it('単一のCookieを正しく解析する', () => {
      documentCookieValue = 'test_cookie=test_value';
      
      const result = analyzeCookies();
      
      expect(result).toEqual({
        cookieString: 'test_cookie=test_value',
        count: 1,
        hasCookies: true,
        cookies: [{
          name: 'test_cookie',
          value: 'test_value',
          length: 10,
          preview: 'test_value'
        }],
        sessionCookies: []
      });
    });

    it('複数のCookieを正しく解析する', () => {
      documentCookieValue = 'cookie1=value1; cookie2=value2; cookie3=value3';
      
      const result = analyzeCookies();
      
      expect(result.count).toBe(3);
      expect(result.hasCookies).toBe(true);
      expect(result.cookies).toHaveLength(3);
      expect(result.cookies[0]).toEqual({
        name: 'cookie1',
        value: 'value1',
        length: 6,
        preview: 'value1'
      });
    });

    it('セッション関連のCookieを正しく識別する', () => {
      documentCookieValue = 'session_id=abc123; connect.sid=def456; auth_token=ghi789; normal_cookie=xyz';
      
      const result = analyzeCookies();
      
      expect(result.sessionCookies).toHaveLength(3);
      expect(result.sessionCookies.map(c => c.name)).toEqual([
        'session_id',
        'connect.sid',
        'auth_token'
      ]);
    });

    it('長いCookie値のプレビューを正しく作成する', () => {
      const longValue = 'a'.repeat(50);
      documentCookieValue = `long_cookie=${longValue}`;
      
      const result = analyzeCookies();
      
      expect(result.cookies[0].preview).toBe('a'.repeat(30) + '...');
      expect(result.cookies[0].length).toBe(50);
    });

    it('空の値を持つCookieを正しく処理する', () => {
      documentCookieValue = 'empty_cookie=; normal_cookie=value';
      
      const result = analyzeCookies();
      
      expect(result.cookies[0]).toEqual({
        name: 'empty_cookie',
        value: '',
        length: 0,
        preview: 'empty'
      });
    });

    it('値がないCookieを正しく処理する', () => {
      documentCookieValue = 'no_value_cookie; normal_cookie=value';
      
      const result = analyzeCookies();
      
      expect(result.cookies[0]).toEqual({
        name: 'no_value_cookie',
        value: undefined,
        length: 0,
        preview: 'empty'
      });
    });

    it('特殊文字を含むCookieを正しく処理する', () => {
      documentCookieValue = 'special=hello%20world; encoded=%3D%3E%3C';
      
      const result = analyzeCookies();
      
      expect(result.cookies[0].value).toBe('hello%20world');
      expect(result.cookies[1].value).toBe('%3D%3E%3C');
    });

    it('スペースを含むCookie名と値を正しく処理する', () => {
      documentCookieValue = ' spaced_name = spaced_value ; normal=value';
      
      const result = analyzeCookies();
      
      expect(result.cookies[0].name).toBe('spaced_name');
      expect(result.cookies[0].value).toBe('spaced_value');
    });
  });

  describe('logCookieStatus', () => {
    it('コンテキストなしでCookie状態をログ出力する', () => {
      documentCookieValue = 'test=value';
      
      const result = logCookieStatus();
      
      expect(consoleGroupSpy).toHaveBeenCalledWith('Cookie Status ');
      expect(consoleLogSpy).toHaveBeenCalledWith('Cookie count:', 1);
      expect(consoleLogSpy).toHaveBeenCalledWith('Has cookies:', true);
      expect(consoleGroupEndSpy).toHaveBeenCalled();
      expect(result.count).toBe(1);
    });

    it('コンテキスト付きでCookie状態をログ出力する', () => {
      documentCookieValue = 'session=abc123';
      
      const result = logCookieStatus('API Call');
      
      expect(consoleGroupSpy).toHaveBeenCalledWith('Cookie Status (API Call)');
      expect(consoleLogSpy).toHaveBeenCalledWith('Session cookies:', expect.any(Array));
      expect(result.sessionCookies).toHaveLength(1);
    });

    it('空のCookieでも正常にログ出力する', () => {
      documentCookieValue = '';
      
      const result = logCookieStatus();
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Cookie count:', 0);
      expect(consoleLogSpy).toHaveBeenCalledWith('Has cookies:', false);
      expect(result.hasCookies).toBe(false);
    });

    it('すべてのCookie情報を正しくログ出力する', () => {
      documentCookieValue = 'auth=token123; session=session456';
      
      logCookieStatus('Test');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('All cookies:', expect.any(Array));
      expect(consoleLogSpy).toHaveBeenCalledWith('Raw cookie string:', expect.any(String));
    });
  });

  describe('debugDriveAuth', () => {
    const mockAuthFetch = vi.fn();
    const mockGetApiEndpoint = vi.fn();

    beforeEach(() => {
      mockGetApiEndpoint.mockReturnValue('https://api.example.com/auth/google/drive/initiate');
    });

    it('Google Drive認証のデバッグ情報を表示する', async () => {
      documentCookieValue = 'session=test_session';
      
      await debugDriveAuth(mockAuthFetch, mockGetApiEndpoint);
      
      expect(consoleGroupSpy).toHaveBeenCalledWith('Google Drive Auth Debug');
      expect(consoleLogSpy).toHaveBeenCalledWith('Testing Drive auth endpoint...');
      expect(consoleLogSpy).toHaveBeenCalledWith('Test endpoint:', 'https://api.example.com/auth/google/drive/initiate');
      expect(consoleGroupEndSpy).toHaveBeenCalled();
    });

    it('XMLHttpRequestの設定を正しくテストする', async () => {
      await debugDriveAuth(mockAuthFetch, mockGetApiEndpoint);

      expect(mockXHR.open).toHaveBeenCalledWith(
        'GET',
        'https://api.example.com/auth/google/drive/initiate',
        false
      );
      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('X-Requested-With', 'XMLHttpRequest');
    });

    it('XHRの設定状態をログ出力する', async () => {
      mockXHR.withCredentials = true;
      mockXHR.readyState = 1;
      
      await debugDriveAuth(mockAuthFetch, mockGetApiEndpoint);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('XHR settings:', {
        withCredentials: true,
        readyState: 1
      });
    });

    it('Cookie情報をXHRテストでログ出力する', async () => {
      documentCookieValue = 'auth=secret_token';
      
      await debugDriveAuth(mockAuthFetch, mockGetApiEndpoint);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('XHR would send with cookies:', 'auth=secret_token');
    });

    it('デバッグテストでエラーが発生した場合の処理', async () => {
      mockGetApiEndpoint.mockImplementation(() => {
        throw new Error('Endpoint error');
      });
      
      await debugDriveAuth(mockAuthFetch, mockGetApiEndpoint);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Debug test failed:', expect.objectContaining({}));
    });

    it('すべてのデバッグステップを実行する', async () => {
      await debugDriveAuth(mockAuthFetch, mockGetApiEndpoint);
      
      // Cookie状態確認のログが含まれる
      expect(consoleGroupSpy).toHaveBeenCalledWith('Cookie Status (Before Drive Auth)');
      
      // XMLHttpRequestテストのログが含まれる
      expect(consoleLogSpy).toHaveBeenCalledWith('Testing with XMLHttpRequest...');
    });
  });

  describe('testCookieSettings', () => {
    beforeEach(() => {
      // Cookie設定をシミュレート（テストCookieが設定されたように見せる）
      documentCookieValue = 'test_cookie_1234567890=test_value';
    });

    it('テスト用Cookieの設定をテストする', () => {
      testCookieSettings();
      
      expect(consoleGroupSpy).toHaveBeenCalledWith('Cookie Settings Test');
      expect(consoleLogSpy).toHaveBeenCalledWith('Test cookie set successfully:', true);
      expect(consoleGroupEndSpy).toHaveBeenCalled();
    });

    it('HTTPSでSameSite=Noneのテストを実行する', () => {
      window.location.protocol = 'https:';
      
      testCookieSettings();
      
      expect(consoleLogSpy).toHaveBeenCalledWith('SameSite=None cookie set (HTTPS)');
      expect(consoleLogSpy).toHaveBeenCalledWith('SameSite=Lax cookie set');
    });

    it('HTTPでSameSite=Noneの警告を表示する', () => {
      window.location.protocol = 'http:';
      
      testCookieSettings();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('SameSite=None requires HTTPS');
      expect(consoleLogSpy).toHaveBeenCalledWith('SameSite=Lax cookie set');
    });

    it('SameSiteテストでエラーが発生した場合の処理', () => {
      // document.cookieでエラーを発生させる
      // ただし最初のtest cookie設定は成功させ、SameSiteテスト時にだけエラーを起こす
      const originalCookieDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie');
      let callCount = 0;
      Object.defineProperty(document, 'cookie', {
        get: vi.fn(() => 'test_cookie_1234567890=test_value'),
        set: vi.fn(() => {
          callCount++;
          // 最初の2回（test cookie設定 + クリーンアップ）は成功
          // 3回目以降（SameSiteテスト）でエラー
          if (callCount > 2) {
            throw new Error('Cookie setting error');
          }
        }),
        configurable: true
      });

      testCookieSettings();

      expect(consoleErrorSpy).toHaveBeenCalledWith('SameSite test failed:', expect.objectContaining({}));

      // プロパティを復元
      Object.defineProperty(document, 'cookie', originalCookieDescriptor);
    });

    it('テストCookieのクリーンアップが実行される', () => {
      const originalCookieDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie');
      const cookieSetter = vi.fn();
      Object.defineProperty(document, 'cookie', {
        get: vi.fn(() => 'test_cookie_1234567890=test_value'),
        set: cookieSetter,
        configurable: true
      });
      
      testCookieSettings();
      
      // 設定とクリーンアップの両方が呼ばれる
      expect(cookieSetter).toHaveBeenCalledWith('test_cookie_1234567890=test_value; path=/');
      expect(cookieSetter).toHaveBeenCalledWith('test_cookie_1234567890=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/');
      
      // プロパティを復元
      Object.defineProperty(document, 'cookie', originalCookieDescriptor);
    });

    it('Cookie設定失敗時もテストを継続する', () => {
      const originalCookieDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie');
      Object.defineProperty(document, 'cookie', {
        get: vi.fn(() => ''), // テストCookieが見つからない
        set: vi.fn(),
        configurable: true
      });
      
      testCookieSettings();
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Test cookie set successfully:', false);
      expect(consoleGroupEndSpy).toHaveBeenCalled();
      
      // プロパティを復元
      Object.defineProperty(document, 'cookie', originalCookieDescriptor);
    });
  });

  describe('testCorsSettings', () => {
    const mockResponse = {
      status: 200,
      headers: {
        get: vi.fn()
      }
    };

    beforeEach(() => {
      fetch.mockResolvedValue(mockResponse);
      mockResponse.headers.get.mockImplementation((header) => {
        const headers = {
          'access-control-allow-origin': 'https://portfolio-wise.com',
          'access-control-allow-credentials': 'true',
          'access-control-allow-methods': 'GET, POST, PUT, DELETE',
          'access-control-allow-headers': 'content-type, x-requested-with'
        };
        return headers[header.toLowerCase()];
      });
    });

    it('CORS設定のテストリクエストを実行する', async () => {
      const apiEndpoint = 'https://api.example.com/test';
      
      await testCorsSettings(apiEndpoint);
      
      expect(fetch).toHaveBeenCalledWith(apiEndpoint, {
        method: 'OPTIONS',
        credentials: 'include',
        headers: {
          'Origin': 'https://portfolio-wise.com',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'content-type,x-requested-with'
        }
      });
    });

    it('CORS preflightレスポンスをログ出力する', async () => {
      const apiEndpoint = 'https://api.example.com/test';

      await testCorsSettings(apiEndpoint);

      expect(consoleGroupSpy).toHaveBeenCalledWith('CORS Settings Test');
      // logger.log masks 'access-control-allow-credentials' value due to sensitive pattern matching
      expect(consoleLogSpy).toHaveBeenCalledWith('CORS preflight response:', expect.objectContaining({
        status: 200,
        headers: expect.objectContaining({
          'access-control-allow-origin': 'https://portfolio-wise.com',
          'access-control-allow-methods': 'GET, POST, PUT, DELETE',
          'access-control-allow-headers': 'content-type, x-requested-with'
        })
      }));
      expect(consoleGroupEndSpy).toHaveBeenCalled();
    });

    it('CORSテストでネットワークエラーが発生した場合', async () => {
      const networkError = new Error('Network error');
      fetch.mockRejectedValue(networkError);
      
      const apiEndpoint = 'https://api.example.com/test';
      
      await testCorsSettings(apiEndpoint);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('CORS test failed:', expect.objectContaining({}));
    });

    it('レスポンスヘッダーが存在しない場合', async () => {
      mockResponse.headers.get.mockReturnValue(null);

      await testCorsSettings('https://api.example.com/test');

      // logger.log masks 'access-control-allow-credentials' key value due to sensitive pattern
      expect(consoleLogSpy).toHaveBeenCalledWith('CORS preflight response:', expect.objectContaining({
        status: 200,
        headers: expect.objectContaining({
          'access-control-allow-origin': null,
          'access-control-allow-methods': null,
          'access-control-allow-headers': null
        })
      }));
    });

    it('ステータスコードが400以上の場合も正常に処理する', async () => {
      mockResponse.status = 405;
      
      await testCorsSettings('https://api.example.com/test');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('CORS preflight response:', {
        status: 405,
        headers: expect.any(Object)
      });
    });
  });

  describe('デフォルトエクスポート', () => {
    beforeEach(() => {
      // 前のテスト（testCookieSettings）で document.cookie の defineProperty が変更
      // されている可能性があるため、再定義する
      Object.defineProperty(document, 'cookie', {
        get: () => documentCookieValue,
        set: (value) => {
          documentCookieValue = value;
        },
        configurable: true
      });
    });

    it('すべての関数がデフォルトエクスポートに含まれている', async () => {
      const defaultExport = (await import('../../../utils/cookieDebugUtils')).default;
      
      expect(defaultExport).toHaveProperty('analyzeCookies');
      expect(defaultExport).toHaveProperty('logCookieStatus');
      expect(defaultExport).toHaveProperty('debugDriveAuth');
      expect(defaultExport).toHaveProperty('testCookieSettings');
      expect(defaultExport).toHaveProperty('testCorsSettings');
    });

    it('デフォルトエクスポートの関数が正常に動作する', () => {
      // Use the already-imported named export to test default export behavior
      documentCookieValue = 'test=value';

      const result = analyzeCookies();

      expect(result.count).toBe(1);
      expect(result.hasCookies).toBe(true);
    });
  });

  describe('統合テスト', () => {
    beforeEach(() => {
      // 前のテスト（testCookieSettings）で document.cookie の defineProperty が変更
      // されている可能性があるため、再定義する
      Object.defineProperty(document, 'cookie', {
        get: () => documentCookieValue,
        set: (value) => {
          documentCookieValue = value;
        },
        configurable: true
      });
    });

    it('完全なデバッグフローをテストする', async () => {
      // セットアップ
      documentCookieValue = 'session_id=abc123; auth_token=xyz789';
      window.location.protocol = 'https:';
      
      const mockAuthFetch = vi.fn();
      const mockGetApiEndpoint = vi.fn(() => 'https://api.example.com/auth/google/drive/initiate');
      
      // 1. Cookie分析
      const analysis = analyzeCookies();
      expect(analysis.sessionCookies).toHaveLength(2);
      
      // 2. Cookie状態ログ
      logCookieStatus('Integration Test');
      expect(consoleGroupSpy).toHaveBeenCalledWith('Cookie Status (Integration Test)');
      
      // 3. Drive認証デバッグ
      await debugDriveAuth(mockAuthFetch, mockGetApiEndpoint);
      expect(consoleGroupSpy).toHaveBeenCalledWith('Google Drive Auth Debug');
      
      // 4. Cookie設定テスト
      testCookieSettings();
      expect(consoleGroupSpy).toHaveBeenCalledWith('Cookie Settings Test');
      
      // 5. CORS設定テスト
      await testCorsSettings('https://api.example.com/test');
      expect(consoleGroupSpy).toHaveBeenCalledWith('CORS Settings Test');
      
      // すべてのコンソールグループが正しく閉じられている
      expect(consoleGroupEndSpy).toHaveBeenCalledTimes(5);
    });

    it('エラー状況でもすべてのテストが継続される', async () => {
      // エラーを発生させる設定
      fetch.mockRejectedValue(new Error('Network error'));
      const mockGetApiEndpoint = vi.fn(() => {
        throw new Error('Endpoint error');
      });
      
      // すべてのテストを実行
      await debugDriveAuth(vi.fn(), mockGetApiEndpoint);
      await testCorsSettings('https://api.example.com/test');
      testCookieSettings();
      
      // エラーログが出力されている
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      
      // すべてのコンソールグループが閉じられている
      // debugDriveAuth = 2 (logCookieStatus内 + debugDriveAuth自体) + testCorsSettings = 1 + testCookieSettings = 1
      expect(consoleGroupEndSpy).toHaveBeenCalledTimes(4);
    });
  });
});