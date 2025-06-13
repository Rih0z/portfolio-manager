/**
 * Google Drive OAuth2認証ハンドラー（デバッグ版）のテスト
 */
'use strict';

// モック
jest.mock('../../../../src/services/googleAuthService');
jest.mock('../../../../src/utils/cookieParser');
jest.mock('../../../../src/utils/secretsManager');
jest.mock('../../../../src/utils/responseUtils');
jest.mock('googleapis');

const { getSession, updateSession } = require('../../../../src/services/googleAuthService');
const { parseCookies } = require('../../../../src/utils/cookieParser');
const { getApiKeys } = require('../../../../src/utils/secretsManager');
const { formatResponse, formatErrorResponse } = require('../../../../src/utils/responseUtils');
const { google } = require('googleapis');

describe('googleDriveAuthDebug', () => {
  let mockOAuth2Client;
  let initiateAuth;
  
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    
    // 各テストごとに新しいモジュールを取得
    const module = require('../../../../src/function/auth/googleDriveAuthDebug');
    initiateAuth = module.initiateAuth;
    
    // OAuth2クライアントのモック
    mockOAuth2Client = {
      generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?test=1')
    };
    
    google.auth = {
      OAuth2: jest.fn().mockReturnValue(mockOAuth2Client)
    };
    
    // デフォルトのモック設定
    getApiKeys.mockResolvedValue({
      googleClientId: 'test-client-id',
      googleClientSecret: 'test-client-secret'
    });
    
    parseCookies.mockReturnValue({ session: 'test-session-id' });
    
    getSession.mockResolvedValue({
      email: 'test@example.com',
      requiresOAuth: true,
      driveAccessToken: null,
      expiresAt: '2025-12-31T00:00:00Z'
    });
    
    // formatResponse/formatErrorResponseのモック
    formatResponse.mockImplementation((config) => ({
      statusCode: config.statusCode || 200,
      headers: config.headers || {},
      body: JSON.stringify(config.body)
    }));
    
    formatErrorResponse.mockImplementation((config) => ({
      statusCode: config.statusCode,
      body: JSON.stringify({
        error: {
          code: config.code,
          message: config.message,
          details: config.details
        }
      })
    }));
  });
  
  describe('initiateAuth', () => {
    const mockEvent = {
      httpMethod: 'GET',
      path: '/auth/google/drive',
      headers: {
        Cookie: 'session=test-session-id',
        'Content-Type': 'application/json'
      },
      queryStringParameters: {},
      requestContext: {
        identity: { sourceIp: '127.0.0.1' },
        authorizer: {}
      }
    };
    
    it('認証URLを正常に生成する', async () => {
      const response = await initiateAuth(mockEvent);
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.authUrl).toBe('https://accounts.google.com/o/oauth2/v2/auth?test=1');
      expect(body.message).toBe('Google Drive認証のためにこのURLにアクセスしてください');
      expect(body.debug.sessionId).toBe('test-ses...');
      expect(body.debug.userEmail).toBe('test@example.com');
      
      // OAuth2クライアントの初期化を確認
      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        'test-client-id',
        'test-client-secret',
        'http://localhost:3000/api/auth/google/drive/callback'
      );
      
      // 認証URLの生成パラメータを確認
      expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive.appdata'
        ],
        state: 'test-session-id',
        prompt: 'consent'
      });
    });
    
    it('環境変数からクライアントIDとシークレットを取得する', async () => {
      getApiKeys.mockResolvedValue({});
      process.env.GOOGLE_CLIENT_ID = 'env-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'env-client-secret';
      process.env.GOOGLE_REDIRECT_URI = 'https://example.com/callback';
      
      await initiateAuth(mockEvent);
      
      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        'env-client-id',
        'env-client-secret',
        'https://example.com/callback'
      );
      
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.GOOGLE_REDIRECT_URI;
    });
    
    it('REACT_APP環境変数からもクライアントIDを取得できる', async () => {
      getApiKeys.mockResolvedValue({});
      process.env.REACT_APP_GOOGLE_CLIENT_ID = 'react-client-id';
      process.env.REACT_APP_GOOGLE_CLIENT_SECRET = 'react-client-secret';
      
      await initiateAuth(mockEvent);
      
      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        'react-client-id',
        'react-client-secret',
        'http://localhost:3000/api/auth/google/drive/callback'
      );
      
      delete process.env.REACT_APP_GOOGLE_CLIENT_ID;
      delete process.env.REACT_APP_GOOGLE_CLIENT_SECRET;
    });
    
    it('Cookieヘッダーが小文字の場合も処理できる', async () => {
      const eventWithLowerCase = {
        ...mockEvent,
        headers: {
          cookie: 'session=test-session-id-lower'
        }
      };
      
      parseCookies.mockReturnValue({ session: 'test-session-id-lower' });
      
      const response = await initiateAuth(eventWithLowerCase);
      
      expect(response.statusCode).toBe(200);
      expect(parseCookies).toHaveBeenCalledWith(eventWithLowerCase.headers);
    });
    
    it('セッションIDがない場合はエラーを返す', async () => {
      parseCookies.mockReturnValue({});
      
      const response = await initiateAuth(mockEvent);
      
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NO_SESSION');
      expect(body.error.message).toBe('セッションが存在しません');
      expect(body.error.details.message).toBe('Cookieにセッション情報が含まれていません');
      expect(body.error.details.hasCookie).toBe(true);
    });
    
    it('セッション取得エラーの場合は500エラーを返す', async () => {
      getSession.mockRejectedValue(new Error('DynamoDB error'));
      
      const response = await initiateAuth(mockEvent);
      
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('SESSION_LOOKUP_ERROR');
      expect(body.error.message).toBe('セッション取得エラー');
      expect(body.error.details).toBe('DynamoDB error');
    });
    
    it('セッションが見つからない場合は401エラーを返す', async () => {
      getSession.mockResolvedValue(null);
      
      const response = await initiateAuth(mockEvent);
      
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_SESSION');
      expect(body.error.message).toBe('セッションが無効です');
      expect(body.error.details).toBe('セッションが見つからないか期限切れです');
    });
    
    it('Google Client IDが設定されていない場合はエラーを返す', async () => {
      getApiKeys.mockResolvedValue({});
      
      const response = await initiateAuth(mockEvent);
      
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('AUTH_URL_ERROR');
      expect(body.error.message).toBe('Drive認証URLの生成に失敗しました');
      expect(body.error.details.error).toBe('Google Client ID/Secret not configured');
    });
    
    it('OAuth2クライアントの遅延初期化が正しく動作する', async () => {
      // 新しいモジュールインスタンスで1回目の呼び出し
      const { initiateAuth: initiateAuth1 } = require('../../../../src/function/auth/googleDriveAuthDebug');
      await initiateAuth1(mockEvent);
      expect(google.auth.OAuth2).toHaveBeenCalledTimes(1);
      
      // 同じモジュールインスタンスで2回目の呼び出し（キャッシュされたクライアントを使用）
      await initiateAuth1(mockEvent);
      expect(google.auth.OAuth2).toHaveBeenCalledTimes(1); // 増えない
    });
    
    it('デバッグ情報が正しくログ出力される', async () => {
      await initiateAuth(mockEvent);
      
      // デバッグ情報の出力を確認
      expect(console.log).toHaveBeenCalledWith('=== Drive Auth Debug Info ===');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Event object:'), expect.any(String));
      expect(console.log).toHaveBeenCalledWith('Headers analysis:', expect.objectContaining({
        allHeaders: expect.any(Array),
        cookie: 'session=test-session-id',
        authorization: 'NOT_FOUND',
        contentType: 'application/json'
      }));
      expect(console.log).toHaveBeenCalledWith('Parsed cookies:', { session: 'test-session-id' });
      expect(console.log).toHaveBeenCalledWith('Looking up session:', 'test-session-id');
      expect(console.log).toHaveBeenCalledWith('Session lookup result:', expect.objectContaining({
        found: true,
        email: 'test@example.com',
        requiresOAuth: true,
        hasDriveToken: false,
        expiresAt: '2025-12-31T00:00:00Z'
      }));
    });
    
    it('予期しないエラーの場合は詳細なスタックトレースを含める', async () => {
      const testError = new Error('Unexpected error');
      testError.stack = 'Error: Unexpected error\n    at test.js:123';
      getSession.mockRejectedValue(testError);
      
      const response = await initiateAuth(mockEvent);
      
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.details).toBe('Unexpected error');
    });
    
    it('ヘッダーがない場合でも処理を続行する', async () => {
      const eventWithoutHeaders = {
        ...mockEvent,
        headers: undefined
      };
      
      parseCookies.mockReturnValue({});
      
      const response = await initiateAuth(eventWithoutHeaders);
      
      expect(response.statusCode).toBe(401);
      expect(parseCookies).toHaveBeenCalledWith({});
    });
  });
});