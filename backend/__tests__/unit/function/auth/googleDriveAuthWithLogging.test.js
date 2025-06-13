/**
 * Google Drive OAuth2認証ハンドラー - Enhanced with detailed loggingのテスト
 */
'use strict';

const { initiateAuth, callback } = require('../../../../src/function/auth/googleDriveAuthWithLogging');
const { getSession, updateSession } = require('../../../../src/services/googleAuthService');
const { getSessionFromRequest } = require('../../../../src/utils/sessionHelper');
const { parseCookies } = require('../../../../src/utils/cookieParser');
const { getApiKeys } = require('../../../../src/utils/secretsManager');
const { getCorsHeaders, getCorsOptionsHeaders } = require('../../../../src/utils/corsHeaders');
const { formatResponse, formatErrorResponse } = require('../../../../src/utils/responseUtils');
const { google } = require('googleapis');

// モック
jest.mock('../../../../src/services/googleAuthService');
jest.mock('../../../../src/utils/sessionHelper');
jest.mock('../../../../src/utils/cookieParser');
jest.mock('../../../../src/utils/secretsManager');
jest.mock('../../../../src/utils/corsHeaders');
jest.mock('../../../../src/utils/responseUtils');
jest.mock('googleapis');

describe('googleDriveAuthWithLogging', () => {
  let mockOAuth2Client;
  
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    
    // OAuth2クライアントのモック
    mockOAuth2Client = {
      generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?redirect_uri=https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback&client_id=test-client-id'),
      getToken: jest.fn().mockResolvedValue({
        tokens: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expiry_date: Date.now() + 3600000
        }
      }),
      setCredentials: jest.fn()
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
    
    getSessionFromRequest.mockResolvedValue({
      success: true,
      session: {
        email: 'test@example.com',
        requiresOAuth: true
      },
      source: 'cookie'
    });
    
    getSession.mockResolvedValue({
      email: 'test@example.com',
      requiresOAuth: true
    });
    
    getCorsHeaders.mockReturnValue({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true'
    });
    
    getCorsOptionsHeaders.mockReturnValue({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true'
    });
    
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
        Host: 'x4scpbsuv2.execute-api.us-west-2.amazonaws.com'
      },
      requestContext: {
        stage: 'dev',
        apiId: 'x4scpbsuv2',
        domainName: 'x4scpbsuv2.execute-api.us-west-2.amazonaws.com'
      }
    };
    
    it('OPTIONSリクエストを処理する', async () => {
      const optionsEvent = {
        ...mockEvent,
        httpMethod: 'OPTIONS'
      };
      
      const response = await initiateAuth(optionsEvent);
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('');
      expect(response.headers['Access-Control-Allow-Headers']).toBe('Content-Type, Accept, X-Requested-With, Cookie, Authorization');
      expect(response.headers['Access-Control-Allow-Methods']).toBe('GET, OPTIONS');
      expect(console.log).toHaveBeenCalledWith('Handling OPTIONS request');
    });
    
    it('認証URLを正常に生成し、詳細なログを出力する', async () => {
      process.env.STAGE = 'dev';
      process.env.AWS_REGION = 'us-west-2';
      
      const response = await initiateAuth(mockEvent);
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(body.message).toBe('Google Drive認証のためにこのURLにアクセスしてください');
      expect(body.debug.redirectUri).toBe('https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback');
      expect(body.debug.stage).toBe('dev');
      expect(body.debug.apiGatewayUrl).toBe('https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/auth/google/drive');
      
      // ログ出力を確認
      expect(console.log).toHaveBeenCalledWith('=== Drive Auth Request with Enhanced Logging ===');
      expect(console.log).toHaveBeenCalledWith('Request details:', expect.objectContaining({
        httpMethod: 'GET',
        path: '/auth/google/drive',
        host: 'x4scpbsuv2.execute-api.us-west-2.amazonaws.com',
        stage: 'dev',
        apiId: 'x4scpbsuv2',
        domainName: 'x4scpbsuv2.execute-api.us-west-2.amazonaws.com'
      }));
      expect(console.log).toHaveBeenCalledWith('Building redirect URI:', expect.any(Object));
      expect(console.log).toHaveBeenCalledWith('OAuth configuration details:', expect.any(Object));
      expect(console.log).toHaveBeenCalledWith('Generated auth URL analysis:', expect.any(Object));
      
      delete process.env.STAGE;
      delete process.env.AWS_REGION;
    });
    
    it('redirect URIの末尾スラッシュを警告する', async () => {
      process.env.GOOGLE_REDIRECT_URI = 'https://example.com/callback/';
      
      await initiateAuth(mockEvent);
      
      expect(console.warn).toHaveBeenCalledWith('WARNING: Redirect URI ends with a trailing slash!');
      
      delete process.env.GOOGLE_REDIRECT_URI;
    });
    
    it('redirect URIのスペースを警告する', async () => {
      process.env.GOOGLE_REDIRECT_URI = 'https://example.com/callback test';
      
      await initiateAuth(mockEvent);
      
      expect(console.warn).toHaveBeenCalledWith('WARNING: Redirect URI contains whitespace!');
      
      delete process.env.GOOGLE_REDIRECT_URI;
    });
    
    it('redirect URIがhttpで始まらない場合を警告する', async () => {
      process.env.GOOGLE_REDIRECT_URI = 'example.com/callback';
      
      await initiateAuth(mockEvent);
      
      expect(console.warn).toHaveBeenCalledWith('WARNING: Redirect URI does not start with http:// or https://');
      
      delete process.env.GOOGLE_REDIRECT_URI;
    });
    
    it('本番環境では異なるredirect URIを使用する', async () => {
      process.env.STAGE = 'prod';
      
      await initiateAuth(mockEvent);
      
      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        'test-client-id',
        'test-client-secret',
        'https://api.portfoliomanager.com/auth/google/drive/callback'
      );
      
      delete process.env.STAGE;
    });
    
    it('セッションが見つからない場合は401エラーを返す', async () => {
      getSessionFromRequest.mockResolvedValue({
        success: false,
        error: 'NO_SESSION',
        message: 'セッションが存在しません',
        details: 'No cookie found'
      });
      
      const response = await initiateAuth(mockEvent);
      
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NO_SESSION');
      expect(body.error.message).toBe('セッションが存在しません');
      expect(body.error.details).toBe('No cookie found');
      expect(console.error).toHaveBeenCalledWith('Session not found:', expect.any(Object));
    });
    
    it('エラー発生時は500エラーを返す', async () => {
      getSessionFromRequest.mockRejectedValue(new Error('Database error'));
      
      const response = await initiateAuth(mockEvent);
      
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('AUTH_URL_ERROR');
      expect(body.error.message).toBe('Drive認証URLの生成に失敗しました');
      expect(body.error.details).toBe('Database error');
    });
    
    it('OAuth2クライアントの初期化テストURLを生成する', async () => {
      await initiateAuth(mockEvent);
      
      expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledTimes(2); // テスト用 + 実際の生成
      expect(console.log).toHaveBeenCalledWith('Test auth URL redirect_uri parameter:', 'https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback');
    });
    
    it('OAuth2クライアントが再利用される', async () => {
      // 1回目の呼び出し
      await initiateAuth(mockEvent);
      expect(google.auth.OAuth2).toHaveBeenCalledTimes(1);
      
      // 2回目の呼び出し
      await initiateAuth(mockEvent);
      expect(google.auth.OAuth2).toHaveBeenCalledTimes(1); // 増えない
    });
  });
  
  describe('callback', () => {
    const mockEvent = {
      httpMethod: 'GET',
      path: '/auth/google/drive/callback',
      queryStringParameters: {
        code: 'test-auth-code',
        state: 'test-session-id'
      },
      requestContext: {
        domainName: 'x4scpbsuv2.execute-api.us-west-2.amazonaws.com'
      }
    };
    
    it('OPTIONSリクエストを処理する', async () => {
      const optionsEvent = {
        ...mockEvent,
        httpMethod: 'OPTIONS'
      };
      
      const response = await callback(optionsEvent);
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('');
      expect(response.headers['Access-Control-Allow-Headers']).toBe('Content-Type, Accept, X-Requested-With, Cookie, Authorization');
      expect(response.headers['Access-Control-Allow-Methods']).toBe('GET, OPTIONS');
      expect(console.log).toHaveBeenCalledWith('Handling OPTIONS request for callback');
    });
    
    it('認証コードを正常に処理してトークンを取得する', async () => {
      process.env.DRIVE_AUTH_SUCCESS_URL = 'https://example.com/success';
      
      const response = await callback(mockEvent);
      
      expect(response.statusCode).toBe(302);
      expect(response.headers.Location).toBe('https://example.com/success');
      expect(response.body).toBe(JSON.stringify({
        success: true,
        message: 'Google Drive認証が完了しました'
      }));
      
      // トークン交換を確認
      expect(mockOAuth2Client.getToken).toHaveBeenCalledWith('test-auth-code');
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: expect.any(Number)
      });
      
      // セッション更新を確認
      expect(updateSession).toHaveBeenCalledWith('test-session-id', {
        driveAccessToken: 'test-access-token',
        driveRefreshToken: 'test-refresh-token',
        driveTokenExpiry: expect.any(String),
        requiresOAuth: false
      });
      
      // ログ出力を確認
      expect(console.log).toHaveBeenCalledWith('=== Drive Auth Callback with Enhanced Logging ===');
      expect(console.log).toHaveBeenCalledWith('Callback request:', expect.objectContaining({
        hasCode: true,
        hasState: true,
        hasError: false
      }));
      expect(console.log).toHaveBeenCalledWith('Exchanging code for tokens...');
      expect(console.log).toHaveBeenCalledWith('Tokens obtained successfully:', expect.objectContaining({
        hasAccessToken: true,
        hasRefreshToken: true
      }));
      
      delete process.env.DRIVE_AUTH_SUCCESS_URL;
    });
    
    it('OAuthエラーを処理する', async () => {
      const errorEvent = {
        ...mockEvent,
        queryStringParameters: {
          error: 'access_denied',
          error_description: 'User denied access'
        }
      };
      
      const response = await callback(errorEvent);
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('OAUTH_ERROR');
      expect(body.error.message).toBe('OAuth認証エラー');
      expect(body.error.details.error).toBe('access_denied');
      expect(body.error.details.error_description).toBe('User denied access');
    });
    
    it('redirect_uri_mismatchエラーに特別なヒントを提供する', async () => {
      const errorEvent = {
        ...mockEvent,
        queryStringParameters: {
          error: 'redirect_uri_mismatch',
          error_description: 'The redirect URI does not match'
        }
      };
      
      const response = await callback(errorEvent);
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.details.hint).toBe('The redirect URI in the request does not match the authorized redirect URIs in Google Cloud Console');
    });
    
    it('認証コードがない場合はエラーを返す', async () => {
      const invalidEvent = {
        ...mockEvent,
        queryStringParameters: {
          state: 'test-session-id'
        }
      };
      
      const response = await callback(invalidEvent);
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_PARAMS');
      expect(body.error.message).toBe('認証コードまたはセッションIDが不足しています');
    });
    
    it('セッションIDがない場合はエラーを返す', async () => {
      const invalidEvent = {
        ...mockEvent,
        queryStringParameters: {
          code: 'test-auth-code'
        }
      };
      
      const response = await callback(invalidEvent);
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_PARAMS');
      expect(body.error.message).toBe('認証コードまたはセッションIDが不足しています');
    });
    
    it('セッションが無効な場合はエラーを返す', async () => {
      getSession.mockResolvedValue(null);
      
      const response = await callback(mockEvent);
      
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_SESSION');
      expect(body.error.message).toBe('セッションが無効です');
    });
    
    it('トークン交換エラーを詳細にログ出力する', async () => {
      const tokenError = new Error('Invalid grant');
      tokenError.response = {
        data: { error: 'invalid_grant', error_description: 'Token has been expired' }
      };
      tokenError.config = {
        url: 'https://oauth2.googleapis.com/token',
        method: 'POST',
        data: 'grant_type=authorization_code&code=test-auth-code'
      };
      
      mockOAuth2Client.getToken.mockRejectedValue(tokenError);
      
      const response = await callback(mockEvent);
      
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('CALLBACK_ERROR');
      expect(body.error.message).toBe('Drive認証の処理に失敗しました');
      expect(body.error.details).toBe('Invalid grant');
      
      expect(console.error).toHaveBeenCalledWith('Token exchange error:', expect.objectContaining({
        error: 'Invalid grant',
        response: expect.objectContaining({
          error: 'invalid_grant',
          error_description: 'Token has been expired'
        }),
        config: expect.objectContaining({
          url: 'https://oauth2.googleapis.com/token',
          method: 'POST',
          data: 'grant_type=authorization_code&code=test-auth-code'
        })
      }));
    });
    
    it('デフォルトのリダイレクトURLを使用する', async () => {
      delete process.env.DRIVE_AUTH_SUCCESS_URL;
      
      const response = await callback(mockEvent);
      
      expect(response.statusCode).toBe(302);
      expect(response.headers.Location).toBe('http://localhost:3001/drive-success');
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
    
    it('refererヘッダーをログに記録する', async () => {
      const errorEvent = {
        ...mockEvent,
        headers: {
          referer: 'https://accounts.google.com/o/oauth2/auth'
        },
        queryStringParameters: {
          error: 'access_denied'
        }
      };
      
      await callback(errorEvent);
      
      expect(console.error).toHaveBeenCalledWith('OAuth error received:', expect.objectContaining({
        fullUrl: 'https://accounts.google.com/o/oauth2/auth'
      }));
    });
  });
});