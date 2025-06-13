/**
 * ファイルパス: __tests__/unit/function/auth/googleLogin.enhanced.test.js
 * 
 * Google認証ログインハンドラーの改良されたユニットテスト
 * 100%のカバレッジを達成するための完全なテストセット
 * 
 * @author Portfolio Manager Team
 * @created 2025-12-06
 */

// テスト対象モジュールを最初にインポート（モックよりも前に）
const googleLogin = require('../../../../src/function/auth/googleLogin');

// 依存モジュールのモック化
jest.mock('../../../../src/services/googleAuthService', () => ({
  exchangeCodeForTokens: jest.fn(),
  verifyIdToken: jest.fn(),
  createUserSession: jest.fn()
}));

jest.mock('../../../../src/utils/responseUtils', () => ({
  formatResponse: jest.fn(),
  formatErrorResponse: jest.fn()
}));

jest.mock('../../../../src/utils/cookieParser', () => ({
  createSessionCookie: jest.fn()
}));

jest.mock('../../../../src/utils/corsHeaders', () => ({
  getCorsHeaders: jest.fn()
}));

// モック化した依存モジュールのインポート
const googleAuthService = require('../../../../src/services/googleAuthService');
const responseUtils = require('../../../../src/utils/responseUtils');
const cookieParser = require('../../../../src/utils/cookieParser');
const corsHeaders = require('../../../../src/utils/corsHeaders');

describe('Google Login Handler - Enhanced Tests', () => {
  // テスト用データ
  const mockUserInfo = {
    sub: 'google-123',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/picture.jpg'
  };

  const mockTokens = {
    access_token: 'access-token-123',
    id_token: 'id-token-123',
    refresh_token: 'refresh-token-123',
    expires_in: 3600,
    scope: 'openid email profile drive.file'
  };

  const mockSession = {
    sessionId: 'session-123',
    userId: 'google-123'
  };

  beforeEach(() => {
    // すべてのモックをリセット
    jest.clearAllMocks();
    
    // console.logのモック（実際のコードがconsole.logを使用しているため）
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();

    // モックのデフォルト実装を設定
    googleAuthService.exchangeCodeForTokens.mockResolvedValue(mockTokens);
    googleAuthService.verifyIdToken.mockResolvedValue(mockUserInfo);
    googleAuthService.createUserSession.mockResolvedValue(mockSession);

    responseUtils.formatResponse.mockImplementation((options) => 
      Promise.resolve({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', ...options.headers },
        body: JSON.stringify({ success: true, data: options.data })
      })
    );

    responseUtils.formatErrorResponse.mockImplementation((options) => 
      Promise.resolve({
        statusCode: options.statusCode || 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: {
            code: options.code,
            message: options.message,
            details: options.details
          }
        })
      })
    );

    cookieParser.createSessionCookie.mockReturnValue(
      'session=session-123; Max-Age=604800; HttpOnly; Secure; SameSite=None'
    );

    corsHeaders.getCorsHeaders.mockReturnValue({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
  });

  describe('OPTIONS request handling', () => {
    test('OPTIONSリクエストでCORSヘッダーを返す', async () => {
      const event = {
        httpMethod: 'OPTIONS'
      };

      const result = await googleLogin.handler(event);

      expect(corsHeaders.getCorsHeaders).toHaveBeenCalledWith(event);
      expect(result.statusCode).toBe(200);
      expect(result.body).toBe('');
    });
  });

  describe('Request body parsing', () => {
    test('有効なJSONボディを正常に解析する', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ code: 'auth-code-123', redirectUri: 'http://localhost:3000' })
      };

      await googleLogin.handler(event);

      expect(googleAuthService.exchangeCodeForTokens).toHaveBeenCalledWith(
        'auth-code-123',
        'http://localhost:3000'
      );
    });

    test('空のボディを空オブジェクトとして扱う', async () => {
      const event = {
        httpMethod: 'POST',
        body: null
      };

      await googleLogin.handler(event);

      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          code: 'INVALID_PARAMS',
          message: '認証コードが不足しています'
        })
      );
    });

    test('無効なJSONでパースエラーを返す', async () => {
      const event = {
        httpMethod: 'POST',
        body: 'invalid json'
      };

      await googleLogin.handler(event);

      expect(console.error).toHaveBeenCalledWith('JSON parse error:', expect.any(String));
      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          code: 'INVALID_JSON',
          message: 'リクエストボディの解析に失敗しました'
        })
      );
    });

    test('undefinedボディを空オブジェクトとして扱う', async () => {
      const event = {
        httpMethod: 'POST',
        body: undefined
      };

      await googleLogin.handler(event);

      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          code: 'INVALID_PARAMS'
        })
      );
    });
  });

  describe('Parameter validation', () => {
    test('認証コードもクレデンシャルもない場合エラー', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ redirectUri: 'http://localhost:3000' })
      };

      await googleLogin.handler(event);

      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          code: 'INVALID_PARAMS',
          message: '認証コードが不足しています'
        })
      );
    });

    test('テストフックでエラーレスポンス', async () => {
      const formatErrorResponseHook = jest.fn();
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ redirectUri: 'http://localhost:3000' }),
        _formatErrorResponse: formatErrorResponseHook
      };

      await googleLogin.handler(event);

      expect(formatErrorResponseHook).toHaveBeenCalledWith({
        statusCode: 400,
        code: 'INVALID_PARAMS',
        message: '認証コードが不足しています'
      });
    });
  });

  describe('Google One Tap authentication', () => {
    test('Google One Tapは非サポートエラーを返す', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ credential: 'one-tap-token-123' })
      };

      await googleLogin.handler(event);

      expect(googleAuthService.verifyIdToken).toHaveBeenCalledWith('one-tap-token-123');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Google One Tap login detected')
      );
      expect(console.error).toHaveBeenCalledWith(
        'Google One Tap does not support Drive scopes'
      );
      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          code: 'ONE_TAP_NOT_SUPPORTED',
          message: expect.stringContaining('Google One Tap認証では')
        })
      );
    });

    test('テストモードでデバッグ情報を出力', async () => {
      const testLogger = {
        debug: jest.fn()
      };

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ credential: 'one-tap-token-123' }),
        _testMode: true,
        _testLogger: testLogger
      };

      await googleLogin.handler(event);

      expect(testLogger.debug).toHaveBeenCalledWith(
        'Login request received:',
        expect.objectContaining({
          credential: '[REDACTED]'
        })
      );
    });
  });

  describe('OAuth2 flow authentication', () => {
    test('OAuth2フローで正常にログイン', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'auth-code-123', 
          redirectUri: 'http://localhost:3000' 
        })
      };

      await googleLogin.handler(event);

      expect(googleAuthService.exchangeCodeForTokens).toHaveBeenCalledWith(
        'auth-code-123',
        'http://localhost:3000'
      );
      expect(googleAuthService.verifyIdToken).toHaveBeenCalledWith(mockTokens.id_token);
      expect(googleAuthService.createUserSession).toHaveBeenCalledWith(
        expect.objectContaining({
          googleId: mockUserInfo.sub,
          email: mockUserInfo.email,
          name: mockUserInfo.name,
          picture: mockUserInfo.picture,
          accessToken: mockTokens.access_token,
          driveAccessToken: mockTokens.access_token
        })
      );
    });

    test('Driveスコープがない場合エラー', async () => {
      const tokensWithoutDrive = {
        ...mockTokens,
        scope: 'openid email profile'
      };
      googleAuthService.exchangeCodeForTokens.mockResolvedValue(tokensWithoutDrive);

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'auth-code-123', 
          redirectUri: 'http://localhost:3000' 
        })
      };

      await googleLogin.handler(event);

      expect(console.error).toHaveBeenCalledWith('Drive scope not included in OAuth flow');
      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          code: 'MISSING_DRIVE_SCOPE',
          message: expect.stringContaining('Google Driveのアクセス権限が含まれていません')
        })
      );
    });

    test('Driveスコープでdrive.appdataを検出', async () => {
      const tokensWithAppdata = {
        ...mockTokens,
        scope: 'openid email profile drive.appdata'
      };
      googleAuthService.exchangeCodeForTokens.mockResolvedValue(tokensWithAppdata);

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'auth-code-123', 
          redirectUri: 'http://localhost:3000' 
        })
      };

      await googleLogin.handler(event);

      expect(googleAuthService.createUserSession).toHaveBeenCalledWith(
        expect.objectContaining({
          driveAccessToken: tokensWithAppdata.access_token
        })
      );
    });

    test('スコープがundefinedの場合の処理', async () => {
      const tokensWithoutScope = {
        ...mockTokens,
        scope: undefined
      };
      googleAuthService.exchangeCodeForTokens.mockResolvedValue(tokensWithoutScope);

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'auth-code-123', 
          redirectUri: 'http://localhost:3000' 
        })
      };

      await googleLogin.handler(event);

      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MISSING_DRIVE_SCOPE'
        })
      );
    });

    test('expires_inがない場合のトークン有効期限処理', async () => {
      const tokensWithoutExpiry = {
        ...mockTokens,
        expires_in: undefined
      };
      googleAuthService.exchangeCodeForTokens.mockResolvedValue(tokensWithoutExpiry);

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'auth-code-123', 
          redirectUri: 'http://localhost:3000' 
        })
      };

      await googleLogin.handler(event);

      expect(googleAuthService.createUserSession).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenExpiry: null
        })
      );
    });

    test('requires_oauthフラグの処理', async () => {
      const tokensWithOAuth = {
        ...mockTokens,
        requires_oauth: true
      };
      googleAuthService.exchangeCodeForTokens.mockResolvedValue(tokensWithOAuth);

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'auth-code-123', 
          redirectUri: 'http://localhost:3000' 
        })
      };

      await googleLogin.handler(event);

      expect(googleAuthService.createUserSession).toHaveBeenCalledWith(
        expect.objectContaining({
          requiresOAuth: true
        })
      );
    });
  });

  describe('Session creation and response', () => {
    test('セッションCookieが正しく作成される', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'auth-code-123', 
          redirectUri: 'http://localhost:3000' 
        })
      };

      await googleLogin.handler(event);

      expect(cookieParser.createSessionCookie).toHaveBeenCalledWith(
        mockSession.sessionId,
        604800 // 7日間
      );
    });

    test('レスポンスに正しいユーザー情報が含まれる', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'auth-code-123', 
          redirectUri: 'http://localhost:3000' 
        })
      };

      await googleLogin.handler(event);

      expect(responseUtils.formatResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 200,
          data: expect.objectContaining({
            success: true,
            isAuthenticated: true,
            user: {
              id: mockUserInfo.sub,
              email: mockUserInfo.email,
              name: mockUserInfo.name,
              picture: mockUserInfo.picture
            },
            sessionId: mockSession.sessionId,
            token: mockSession.sessionId,
            hasDriveAccess: true,
            requiresOAuth: false
          }),
          headers: expect.objectContaining({
            'Set-Cookie': expect.any(String)
          })
        })
      );
    });

    test('テストフックでレスポンス', async () => {
      const formatResponseHook = jest.fn();
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'auth-code-123', 
          redirectUri: 'http://localhost:3000' 
        }),
        _formatResponse: formatResponseHook
      };

      await googleLogin.handler(event);

      expect(formatResponseHook).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          isAuthenticated: true,
          user: expect.any(Object)
        }),
        expect.objectContaining({
          'Set-Cookie': expect.any(String)
        })
      );
    });
  });

  describe('Error handling', () => {
    test('認証コード無効エラーの処理', async () => {
      const error = new Error('認証コードが無効です');
      googleAuthService.exchangeCodeForTokens.mockRejectedValue(error);

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'invalid-code', 
          redirectUri: 'http://localhost:3000' 
        })
      };

      await googleLogin.handler(event);

      expect(console.error).toHaveBeenCalledWith(
        'Google認証エラー詳細:',
        expect.objectContaining({
          message: '認証コードが無効です'
        })
      );
      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          code: 'INVALID_AUTH_CODE',
          message: '認証コードが無効または期限切れです'
        })
      );
    });

    test('リダイレクトURIエラーの処理', async () => {
      const error = new Error('リダイレクトURIが一致しません');
      googleAuthService.exchangeCodeForTokens.mockRejectedValue(error);

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'auth-code-123', 
          redirectUri: 'http://wrong-uri.com' 
        })
      };

      await googleLogin.handler(event);

      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          code: 'REDIRECT_URI_MISMATCH',
          message: 'リダイレクトURIが一致しません'
        })
      );
    });

    test('Google Client設定エラーの処理', async () => {
      const error = new Error('Google Client設定エラー');
      googleAuthService.exchangeCodeForTokens.mockRejectedValue(error);

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'auth-code-123', 
          redirectUri: 'http://localhost:3000' 
        })
      };

      await googleLogin.handler(event);

      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          code: 'CONFIG_ERROR',
          message: 'サーバー設定エラー'
        })
      );
    });

    test('一般的なエラーの処理', async () => {
      const error = new Error('Unknown error');
      googleAuthService.exchangeCodeForTokens.mockRejectedValue(error);

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'auth-code-123', 
          redirectUri: 'http://localhost:3000' 
        })
      };

      await googleLogin.handler(event);

      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'AUTH_ERROR',
          message: '認証に失敗しました'
        })
      );
    });

    test('エラー時のテストフック', async () => {
      const formatErrorResponseHook = jest.fn();
      const error = new Error('Test error');
      googleAuthService.exchangeCodeForTokens.mockRejectedValue(error);

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'auth-code-123', 
          redirectUri: 'http://localhost:3000' 
        }),
        _formatErrorResponse: formatErrorResponseHook
      };

      await googleLogin.handler(event);

      expect(formatErrorResponseHook).toHaveBeenCalledWith({
        statusCode: 401,
        code: 'AUTH_ERROR',
        message: '認証に失敗しました',
        details: 'Test error'
      });
    });

    test('IDトークン検証エラーの処理', async () => {
      const error = new Error('Invalid ID token');
      googleAuthService.verifyIdToken.mockRejectedValue(error);

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ credential: 'invalid-token' })
      };

      await googleLogin.handler(event);

      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'AUTH_ERROR'
        })
      );
    });

    test('セッション作成エラーの処理', async () => {
      const error = new Error('Session creation failed');
      googleAuthService.createUserSession.mockRejectedValue(error);

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'auth-code-123', 
          redirectUri: 'http://localhost:3000' 
        })
      };

      await googleLogin.handler(event);

      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'AUTH_ERROR'
        })
      );
    });
  });

  describe('Logging and debugging', () => {
    test('リクエスト情報がログ出力される', async () => {
      const event = {
        httpMethod: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'test-agent'
        },
        body: JSON.stringify({ code: 'auth-code-123' }),
        requestContext: {
          identity: {
            sourceIp: '192.168.1.1'
          }
        }
      };

      await googleLogin.handler(event);

      expect(console.log).toHaveBeenCalledWith(
        'Google Login request received:',
        expect.objectContaining({
          httpMethod: 'POST',
          clientIP: '192.168.1.1'
        })
      );
    });

    test('ボディ解析の詳細ログ', async () => {
      const bodyContent = JSON.stringify({ code: 'auth-code-123' });
      const event = {
        httpMethod: 'POST',
        body: bodyContent
      };

      await googleLogin.handler(event);

      expect(console.log).toHaveBeenCalledWith('Body type:', 'string');
      expect(console.log).toHaveBeenCalledWith('Body length:', bodyContent.length);
      expect(console.log).toHaveBeenCalledWith(
        'Body first 100 chars:', 
        bodyContent.substring(0, 100)
      );
      expect(console.log).toHaveBeenCalledWith('Parsed successfully, keys:', ['code']);
    });

    test('認証処理のログ出力', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'auth-code-123', 
          redirectUri: 'http://localhost:3000' 
        })
      };

      await googleLogin.handler(event);

      expect(console.log).toHaveBeenCalledWith(
        'Processing Google authentication:',
        expect.objectContaining({
          code: 'auth-code-...',
          credential: 'missing',
          redirectUri: 'http://localhost:3000'
        })
      );

      expect(console.log).toHaveBeenCalledWith(
        'Using OAuth authorization code flow with Drive scopes'
      );

      expect(console.log).toHaveBeenCalledWith(
        'Token exchange successful, tokens received:',
        expect.objectContaining({
          hasAccessToken: true,
          hasIdToken: true,
          hasRefreshToken: true,
          scope: expect.any(String)
        })
      );
    });

    test('ヘッダーがない場合のログ', async () => {
      const event = {
        httpMethod: 'POST',
        headers: null,
        body: JSON.stringify({ code: 'auth-code-123' })
      };

      await googleLogin.handler(event);

      expect(console.log).toHaveBeenCalledWith(
        'Google Login request received:',
        expect.objectContaining({
          headers: 'none'
        })
      );
    });

    test('requestContextがない場合のログ', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ code: 'auth-code-123' }),
        requestContext: null
      };

      await googleLogin.handler(event);

      expect(console.log).toHaveBeenCalledWith(
        'Google Login request received:',
        expect.objectContaining({
          clientIP: 'unknown'
        })
      );
    });

    test('nullボディの場合のログ', async () => {
      const event = {
        httpMethod: 'POST',
        body: null
      };

      await googleLogin.handler(event);

      expect(console.log).toHaveBeenCalledWith('Body type:', 'object');
      expect(console.log).toHaveBeenCalledWith('Body length:', 0);
      expect(console.log).toHaveBeenCalledWith('Body first 100 chars:', 'null');
    });
  });

  describe('Edge cases', () => {
    test('_testLoggerがない場合のフォールバック', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ credential: 'one-tap-token' }),
        _testMode: true
      };

      // console.debugのモックを設定
      console.debug = jest.fn();

      await googleLogin.handler(event);

      // エラーは発生せず、正常に処理される
      expect(responseUtils.formatErrorResponse).toHaveBeenCalled();
    });

    test('credentialの長さがログ出力される', async () => {
      const credential = 'test-credential-123';
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ credential })
      };

      await googleLogin.handler(event);

      expect(console.log).toHaveBeenCalledWith(
        'Extracted fields:',
        expect.objectContaining({
          hasCredential: true,
          credentialLength: credential.length
        })
      );
    });

    test('codeの長さがログ出力される', async () => {
      const code = 'test-auth-code-123';
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ code, redirectUri: 'http://localhost:3000' })
      };

      await googleLogin.handler(event);

      expect(console.log).toHaveBeenCalledWith(
        'Extracted fields:',
        expect.objectContaining({
          hasCode: true,
          credentialLength: 0
        })
      );
    });

    test('Drive access scopeのログ出力', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'auth-code-123', 
          redirectUri: 'http://localhost:3000' 
        })
      };

      await googleLogin.handler(event);

      expect(console.log).toHaveBeenCalledWith(
        'Google Drive access granted during login'
      );
    });

    test('エラーオブジェクトの完全なログ出力', async () => {
      const customError = new Error('Custom error');
      customError.code = 'CUSTOM_CODE';
      customError.name = 'CustomError';
      googleAuthService.exchangeCodeForTokens.mockRejectedValue(customError);

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'auth-code-123', 
          redirectUri: 'http://localhost:3000' 
        })
      };

      await googleLogin.handler(event);

      expect(console.error).toHaveBeenCalledWith(
        'Google認証エラー詳細:',
        expect.objectContaining({
          message: 'Custom error',
          code: 'CUSTOM_CODE',
          name: 'CustomError',
          errorType: 'Error'
        })
      );
    });
  });

  describe('Branch coverage completion tests', () => {
    test('Test mode with both code and credential fields', async () => {
      const testLogger = { debug: jest.fn() };
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'auth-code-123', 
          credential: 'credential-123',
          redirectUri: 'http://localhost:3000' 
        }),
        _testMode: true,
        _testLogger: testLogger
      };

      await googleLogin.handler(event);

      expect(testLogger.debug).toHaveBeenCalledWith(
        'Login request received:',
        expect.objectContaining({
          code: '[REDACTED]',
          credential: '[REDACTED]'
        })
      );
    });

    test('Test mode with neither code nor credential fields', async () => {
      const testLogger = { debug: jest.fn() };
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ redirectUri: 'http://localhost:3000' }),
        _testMode: true,
        _testLogger: testLogger
      };

      await googleLogin.handler(event);

      expect(testLogger.debug).toHaveBeenCalledWith(
        'Login request received:',
        expect.objectContaining({
          code: undefined,
          credential: undefined
        })
      );
    });

    test('Drive scope true but no access token', async () => {
      const tokensWithoutAccessToken = {
        ...mockTokens,
        access_token: null,
        scope: 'openid email profile drive.file'
      };
      googleAuthService.exchangeCodeForTokens.mockResolvedValue(tokensWithoutAccessToken);

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'auth-code-123', 
          redirectUri: 'http://localhost:3000' 
        })
      };

      await googleLogin.handler(event);

      expect(googleAuthService.createUserSession).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: null
        })
      );
    });

    test('No Drive scope results in hasDriveAccess false', async () => {
      const tokensWithoutDriveScope = {
        ...mockTokens,
        scope: 'openid email profile'
      };
      googleAuthService.exchangeCodeForTokens.mockResolvedValue(tokensWithoutDriveScope);

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'auth-code-123', 
          redirectUri: 'http://localhost:3000' 
        })
      };

      await googleLogin.handler(event);

      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MISSING_DRIVE_SCOPE'
        })
      );
    });

    test('Google One Tap with hasDriveAccess false branch', async () => {
      // Google One Tapでは常にhasDriveScopeがfalseになるため、
      // hasDriveScope || falseの右側のブランチがテストされる
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ credential: 'one-tap-token-123' })
      };

      await googleLogin.handler(event);

      // One Tapではエラーになるが、内部的にhasDriveAccess: falseのブランチが実行される
      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'ONE_TAP_NOT_SUPPORTED'
        })
      );
    });
  });

  describe('Uncovered lines coverage tests', () => {
    test('Use Google One Tap credential log', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ credential: 'one-tap-token-123' })
      };

      await googleLogin.handler(event);

      expect(console.log).toHaveBeenCalledWith('Using Google One Tap credential (ID token)');
    });

    test('ID token verification successful log', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'auth-code-123', 
          redirectUri: 'http://localhost:3000' 
        })
      };

      await googleLogin.handler(event);

      expect(console.log).toHaveBeenCalledWith(
        'ID token verification successful:',
        expect.objectContaining({
          sub: mockUserInfo.sub,
          email: mockUserInfo.email,
          name: mockUserInfo.name
        })
      );
    });

    test('Drive refresh token assignment', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'auth-code-123', 
          redirectUri: 'http://localhost:3000' 
        })
      };

      await googleLogin.handler(event);

      expect(googleAuthService.createUserSession).toHaveBeenCalledWith(
        expect.objectContaining({
          driveRefreshToken: mockTokens.refresh_token,
          driveTokenExpiry: expect.any(String)
        })
      );
    });

    test('Complete OAuth flow with all logs', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'auth-code-123', 
          redirectUri: 'http://localhost:3000' 
        })
      };

      await googleLogin.handler(event);

      // すべての重要なログが出力されることを確認
      expect(console.log).toHaveBeenCalledWith('Using OAuth authorization code flow with Drive scopes');
      expect(console.log).toHaveBeenCalledWith('Google Drive access granted during login');
      expect(console.log).toHaveBeenCalledWith(
        'ID token verification successful:',
        expect.objectContaining({
          sub: mockUserInfo.sub,
          email: mockUserInfo.email,
          name: mockUserInfo.name
        })
      );
    });

    test('Error stack and name logging', async () => {
      const customError = new Error('Test error with stack');
      customError.stack = 'Error: Test error\n    at Function.test';
      customError.name = 'TestError';
      customError.code = 'TEST_CODE';
      
      googleAuthService.exchangeCodeForTokens.mockRejectedValue(customError);

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ 
          code: 'auth-code-123', 
          redirectUri: 'http://localhost:3000' 
        })
      };

      await googleLogin.handler(event);

      expect(console.error).toHaveBeenCalledWith(
        'Google認証エラー詳細:',
        expect.objectContaining({
          message: 'Test error with stack',
          stack: expect.any(String),
          name: 'TestError',
          code: 'TEST_CODE',
          errorType: 'Error'
        })
      );
    });

    test('Test logger debug method called', async () => {
      const testLogger = {
        debug: jest.fn()
      };

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ credential: 'one-tap-token-123' }),
        _testMode: true,
        _testLogger: testLogger
      };

      await googleLogin.handler(event);

      expect(testLogger.debug).toHaveBeenCalledWith(
        'Login request received:',
        expect.objectContaining({
          credential: '[REDACTED]'
        })
      );
    });
  });
});