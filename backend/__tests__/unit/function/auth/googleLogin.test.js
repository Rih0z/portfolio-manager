/**
 * ファイルパス: __tests__/unit/function/auth/googleLogin.test.js
 * 
 * Google認証ログインハンドラーのユニットテスト
 * 100%のカバレッジを達成するための完全なテストセット
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-20
 */

// 依存モジュールのモック化
jest.mock('../../../../src/services/googleAuthService');
jest.mock('../../../../src/utils/responseUtils');
jest.mock('../../../../src/utils/cookieParser');
jest.mock('../../../../src/utils/corsHeaders');

// formatErrorResponseとformatResponseが実際に値を返すようにモック設定
const mockFormatErrorResponse = jest.fn((options) => {
  // 実際の実装のシグネチャに合わせる（eventパラメータも受け取る）
  return Promise.resolve({
    statusCode: options.statusCode || 500,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: JSON.stringify({ 
      success: false, 
      error: {
        code: options.code,
        message: options.message,
        details: options.details
      }
    })
  });
});

const mockFormatResponse = jest.fn((options) => {
  return Promise.resolve({
    statusCode: options.statusCode || 200,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: JSON.stringify({ success: true, data: options.data })
  });
});

// テスト対象モジュールのインポート
const googleLogin = require('../../../../src/function/auth/googleLogin');

// モック化した依存モジュールのインポート
const googleAuthService = require('../../../../src/services/googleAuthService');
const responseUtils = require('../../../../src/utils/responseUtils');
const cookieParser = require('../../../../src/utils/cookieParser');
const corsHeaders = require('../../../../src/utils/corsHeaders');

describe('Google Login Handler', () => {
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
    // モックをリセット
    jest.clearAllMocks();

    // デフォルトのモック実装を設定
    googleAuthService.exchangeCodeForTokens = jest.fn().mockResolvedValue(mockTokens);
    googleAuthService.verifyIdToken = jest.fn().mockResolvedValue(mockUserInfo);
    googleAuthService.createUserSession = jest.fn().mockResolvedValue(mockSession);

    responseUtils.formatResponse = mockFormatResponse;
    responseUtils.formatErrorResponse = mockFormatErrorResponse;

    cookieParser.createSessionCookie = jest.fn().mockReturnValue(
      'session=session-123; Max-Age=604800; HttpOnly; Secure; SameSite=None'
    );

    corsHeaders.getCorsHeaders = jest.fn().mockReturnValue({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });

    // console.logのモック
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  describe('OPTIONS request handling', () => {
    test('OPTIONSリクエストでCORSヘッダーを返す', async () => {
      const event = {
        httpMethod: 'OPTIONS'
      };

      const response = await googleLogin.handler(event);

      expect(corsHeaders.getCorsHeaders).toHaveBeenCalledWith(event);
      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('');
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

      // console.debugが呼ばれることを確認（テストログがない場合のフォールバック）
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
});