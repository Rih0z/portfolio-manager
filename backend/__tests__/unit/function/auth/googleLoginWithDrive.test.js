/**
 * Google統合認証ハンドラー - ログインとDrive連携を1回の認証で実行のテスト
 */
'use strict';

const { initiateAuth, callback } = require('../../../../src/function/auth/googleLoginWithDrive');
const { createUserSession } = require('../../../../src/services/googleAuthService');
const { createSessionCookie } = require('../../../../src/utils/cookieParser');
const { getApiKeys } = require('../../../../src/utils/secretsManager');
const { getCorsHeaders, getCorsOptionsHeaders } = require('../../../../src/utils/corsHeaders');
const { formatErrorResponse } = require('../../../../src/utils/responseUtils');
const { google } = require('googleapis');

// モック
jest.mock('../../../../src/services/googleAuthService');
jest.mock('../../../../src/utils/cookieParser');
jest.mock('../../../../src/utils/secretsManager');
jest.mock('../../../../src/utils/corsHeaders');
jest.mock('../../../../src/utils/responseUtils');
jest.mock('googleapis');

describe('googleLoginWithDrive', () => {
  let mockOAuth2Client;
  let mockOAuth2Service;
  let mockUserInfoGet;
  
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    
    // OAuth2クライアントのモック
    mockOAuth2Client = {
      generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?test=1'),
      getToken: jest.fn().mockResolvedValue({
        tokens: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          id_token: 'test-id-token',
          expiry_date: Date.now() + 3600000
        }
      }),
      setCredentials: jest.fn()
    };
    
    // userinfo APIのモック
    mockUserInfoGet = jest.fn().mockResolvedValue({
      data: {
        id: 'google-user-id',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/picture.jpg'
      }
    });
    
    mockOAuth2Service = {
      userinfo: {
        get: mockUserInfoGet
      }
    };
    
    google.auth = {
      OAuth2: jest.fn().mockReturnValue(mockOAuth2Client)
    };
    
    google.oauth2 = jest.fn().mockReturnValue(mockOAuth2Service);
    
    // デフォルトのモック設定
    getApiKeys.mockResolvedValue({
      googleClientId: 'test-client-id',
      googleClientSecret: 'test-client-secret'
    });
    
    getCorsHeaders.mockReturnValue({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true'
    });
    
    getCorsOptionsHeaders.mockReturnValue({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true'
    });
    
    createUserSession.mockResolvedValue({
      sessionId: 'new-session-id',
      email: 'test@example.com'
    });
    
    createSessionCookie.mockReturnValue('session=new-session-id; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=2592000');
    
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
      path: '/auth/google/login-with-drive',
      queryStringParameters: {}
    };
    
    it('OPTIONSリクエストを処理する', async () => {
      const optionsEvent = {
        ...mockEvent,
        httpMethod: 'OPTIONS'
      };
      
      const response = await initiateAuth(optionsEvent);
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('');
      expect(getCorsOptionsHeaders).toHaveBeenCalledWith(optionsEvent);
    });
    
    it('統合認証URLを正常に生成する', async () => {
      const response = await initiateAuth(mockEvent);
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.authUrl).toBe('https://accounts.google.com/o/oauth2/v2/auth?test=1');
      expect(body.message).toBe('Googleアカウントでログインし、同時にDrive連携を行います');
      
      // OAuth2クライアントの初期化を確認
      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        'test-client-id',
        'test-client-secret',
        'https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/callback'
      );
      
      // 統合スコープを確認
      expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: [
          'openid',
          'email',
          'profile',
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive.appdata'
        ],
        prompt: 'select_account consent',
        include_granted_scopes: true
      });
      
      expect(console.log).toHaveBeenCalledWith('Google Login with Drive initiate request');
      expect(console.log).toHaveBeenCalledWith('Generated unified auth URL');
    });
    
    it('直接リダイレクトモードで302レスポンスを返す', async () => {
      const redirectEvent = {
        ...mockEvent,
        queryStringParameters: {
          redirect: 'true'
        }
      };
      
      const response = await initiateAuth(redirectEvent);
      
      expect(response.statusCode).toBe(302);
      expect(response.headers.Location).toBe('https://accounts.google.com/o/oauth2/v2/auth?test=1');
      expect(response.body).toBe('');
    });
    
    it('本番環境では異なるredirect URIを使用する', async () => {
      process.env.STAGE = 'prod';
      
      await initiateAuth(mockEvent);
      
      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        'test-client-id',
        'test-client-secret',
        'https://api.portfoliomanager.com/auth/google/callback'
      );
      
      delete process.env.STAGE;
    });
    
    it('APIキーからredirect URIを取得する', async () => {
      getApiKeys.mockResolvedValue({
        googleClientId: 'test-client-id',
        googleClientSecret: 'test-client-secret',
        googleRedirectUri: 'https://custom.example.com/callback'
      });
      
      await initiateAuth(mockEvent);
      
      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        'test-client-id',
        'test-client-secret',
        'https://custom.example.com/callback'
      );
    });
    
    it('環境変数からクライアントIDとシークレットを取得する', async () => {
      getApiKeys.mockResolvedValue({});
      process.env.GOOGLE_CLIENT_ID = 'env-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'env-client-secret';
      
      await initiateAuth(mockEvent);
      
      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        'env-client-id',
        'env-client-secret',
        expect.any(String)
      );
      
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
    });
    
    it('エラー発生時は500エラーを返す', async () => {
      google.auth.OAuth2.mockImplementation(() => {
        throw new Error('OAuth initialization failed');
      });
      
      const response = await initiateAuth(mockEvent);
      
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('AUTH_URL_ERROR');
      expect(body.error.message).toBe('認証URLの生成に失敗しました');
      expect(body.error.details).toBe('OAuth initialization failed');
      expect(console.error).toHaveBeenCalledWith('統合認証URL生成エラー:', expect.any(Error));
    });
  });
  
  describe('callback', () => {
    const mockEvent = {
      httpMethod: 'GET',
      path: '/auth/google/callback',
      queryStringParameters: {
        code: 'test-auth-code'
      }
    };
    
    it('認証コードを正常に処理してユーザーセッションを作成する', async () => {
      process.env.DRIVE_AUTH_SUCCESS_URL = 'https://example.com/success';
      
      const response = await callback(mockEvent);
      
      expect(response.statusCode).toBe(302);
      expect(response.headers.Location).toBe('https://example.com/success?success=true&message=ログインとGoogle%20Drive連携が完了しました&unified=true');
      expect(response.headers['Set-Cookie']).toBe('session=new-session-id; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=2592000');
      expect(response.body).toBe('');
      
      // トークン交換を確認
      expect(mockOAuth2Client.getToken).toHaveBeenCalledWith('test-auth-code');
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        id_token: 'test-id-token',
        expiry_date: expect.any(Number)
      });
      
      // ユーザー情報取得を確認
      expect(google.oauth2).toHaveBeenCalledWith({
        auth: mockOAuth2Client,
        version: 'v2'
      });
      expect(mockUserInfoGet).toHaveBeenCalled();
      
      // セッション作成を確認
      expect(createUserSession).toHaveBeenCalledWith({
        googleId: 'google-user-id',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/picture.jpg',
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        tokenExpiry: expect.any(String),
        driveAccessToken: 'test-access-token',
        driveRefreshToken: 'test-refresh-token',
        driveTokenExpiry: expect.any(String),
        requiresOAuth: false
      });
      
      // セッションCookie作成を確認
      expect(createSessionCookie).toHaveBeenCalledWith('new-session-id', 2592000);
      
      expect(console.log).toHaveBeenCalledWith('Unified auth tokens obtained:', expect.objectContaining({
        hasAccessToken: true,
        hasRefreshToken: true,
        hasIdToken: true,
        expiryDate: expect.any(Number)
      }));
      
      delete process.env.DRIVE_AUTH_SUCCESS_URL;
    });
    
    it('OAuthエラーを処理してリダイレクトする', async () => {
      const errorEvent = {
        ...mockEvent,
        queryStringParameters: {
          error: 'access_denied'
        }
      };
      
      process.env.DRIVE_AUTH_SUCCESS_URL = 'https://example.com/success';
      
      const response = await callback(errorEvent);
      
      expect(response.statusCode).toBe(302);
      expect(response.headers.Location).toBe('https://example.com/success?error=oauth_error&message=Google認証がキャンセルされました&details=access_denied');
      expect(response.body).toBe('');
      expect(console.error).toHaveBeenCalledWith('OAuth認証エラー:', 'access_denied');
      
      delete process.env.DRIVE_AUTH_SUCCESS_URL;
    });
    
    it('認証コードがない場合はエラーを返す', async () => {
      const invalidEvent = {
        ...mockEvent,
        queryStringParameters: {}
      };
      
      const response = await callback(invalidEvent);
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_PARAMS');
      expect(body.error.message).toBe('認証コードが不足しています');
    });
    
    it('トークン交換エラーをリダイレクトで処理する', async () => {
      mockOAuth2Client.getToken.mockRejectedValue(new Error('Invalid grant'));
      process.env.DRIVE_AUTH_SUCCESS_URL = 'https://example.com/success';
      
      const response = await callback(mockEvent);
      
      expect(response.statusCode).toBe(302);
      expect(response.headers.Location).toBe('https://example.com/success?error=auth_failed&message=認証処理に失敗しました&details=Invalid%20grant');
      expect(response.body).toBe('');
      expect(console.error).toHaveBeenCalledWith('統合認証コールバックエラー:', expect.any(Error));
      
      delete process.env.DRIVE_AUTH_SUCCESS_URL;
    });
    
    it('ユーザー情報取得エラーをリダイレクトで処理する', async () => {
      mockUserInfoGet.mockRejectedValue(new Error('API error'));
      process.env.DRIVE_AUTH_SUCCESS_URL = 'https://example.com/success';
      
      const response = await callback(mockEvent);
      
      expect(response.statusCode).toBe(302);
      expect(response.headers.Location).toBe('https://example.com/success?error=auth_failed&message=認証処理に失敗しました&details=API%20error');
      expect(response.body).toBe('');
      
      delete process.env.DRIVE_AUTH_SUCCESS_URL;
    });
    
    it('デフォルトのリダイレクトURLを使用する', async () => {
      delete process.env.DRIVE_AUTH_SUCCESS_URL;
      
      const response = await callback(mockEvent);
      
      expect(response.statusCode).toBe(302);
      expect(response.headers.Location).toContain('http://localhost:3001/drive-success');
    });
    
    it('queryStringParametersがない場合を処理する', async () => {
      const invalidEvent = {
        ...mockEvent,
        queryStringParameters: null
      };
      
      const response = await callback(invalidEvent);
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_PARAMS');
    });
    
    it('エラー詳細がない場合のフォールバック', async () => {
      const error = new Error();
      error.message = undefined;
      mockOAuth2Client.getToken.mockRejectedValue(error);
      
      const response = await callback(mockEvent);
      
      expect(response.statusCode).toBe(302);
      expect(response.headers.Location).toContain('details=Unknown%20error');
    });
    
    it('トークンの有効期限がない場合はnullを設定する', async () => {
      mockOAuth2Client.getToken.mockResolvedValue({
        tokens: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          id_token: 'test-id-token'
          // expiry_dateがない
        }
      });
      
      await callback(mockEvent);
      
      expect(createUserSession).toHaveBeenCalledWith(expect.objectContaining({
        tokenExpiry: null,
        driveTokenExpiry: null
      }));
    });
  });
});