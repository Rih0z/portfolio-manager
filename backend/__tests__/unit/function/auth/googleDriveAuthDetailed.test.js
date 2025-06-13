/**
 * Google Drive OAuth2認証ハンドラー - 詳細デバッグ版のテスト
 */
'use strict';

const { initiateAuth } = require('../../../../src/function/auth/googleDriveAuthDetailed');
const { getSessionFromRequest } = require('../../../../src/utils/sessionHelper');
const { parseCookies } = require('../../../../src/utils/cookieParser');
const { getApiKeys } = require('../../../../src/utils/secretsManager');
const { getCorsHeaders, getCorsOptionsHeaders } = require('../../../../src/utils/corsHeaders');
const { google } = require('googleapis');

// モック
jest.mock('../../../../src/utils/sessionHelper');
jest.mock('../../../../src/utils/cookieParser');
jest.mock('../../../../src/utils/secretsManager');
jest.mock('../../../../src/utils/corsHeaders');
jest.mock('googleapis');

describe('googleDriveAuthDetailed', () => {
  let mockOAuth2Client;
  
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    
    // OAuth2クライアントのモック
    mockOAuth2Client = {
      generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?redirect_uri=https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback&client_id=test-client-id&scope=drive.file&state=test-session')
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
    
    getCorsHeaders.mockReturnValue({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true'
    });
    
    getCorsOptionsHeaders.mockReturnValue({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true'
    });
  });
  
  describe('initiateAuth', () => {
    const mockEvent = {
      httpMethod: 'GET',
      path: '/auth/google/drive',
      headers: {
        Host: 'x4scpbsuv2.execute-api.us-west-2.amazonaws.com'
      }
    };
    
    it('OPTIONSリクエストに対してCORSヘッダーを返す', async () => {
      const optionsEvent = {
        ...mockEvent,
        httpMethod: 'OPTIONS'
      };
      
      const response = await initiateAuth(optionsEvent);
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('');
      expect(response.headers['Access-Control-Allow-Headers']).toBe('Content-Type, Accept, X-Requested-With, Cookie, Authorization');
      expect(response.headers['Access-Control-Allow-Methods']).toBe('GET, OPTIONS');
      expect(getCorsOptionsHeaders).toHaveBeenCalledWith(optionsEvent);
    });
    
    it('認証URLを正常に生成し、詳細なデバッグ情報を出力する', async () => {
      process.env.STAGE = 'dev';
      process.env.AWS_REGION = 'us-west-2';
      
      const response = await initiateAuth(mockEvent);
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(body.debug.redirectUri).toBe('https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback');
      expect(body.debug.message).toBe('Check CloudWatch logs for detailed OAuth configuration');
      
      // 詳細なログ出力を確認
      expect(console.log).toHaveBeenCalledWith('=== DETAILED OAUTH2 CONFIGURATION ===');
      expect(console.log).toHaveBeenCalledWith('Environment variables:');
      expect(console.log).toHaveBeenCalledWith('- STAGE:', 'dev');
      expect(console.log).toHaveBeenCalledWith('- AWS_REGION:', 'us-west-2');
      expect(console.log).toHaveBeenCalledWith('- Client ID source:', 'Secrets Manager');
      expect(console.log).toHaveBeenCalledWith('- Client Secret source:', 'Secrets Manager');
      expect(console.log).toHaveBeenCalledWith('\nRedirect URI calculation:');
      expect(console.log).toHaveBeenCalledWith('- Final redirect URI:', 'https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback');
      expect(console.log).toHaveBeenCalledWith('\n=== GENERATED AUTH URL ===');
      expect(console.log).toHaveBeenCalledWith('Full URL:', expect.any(String));
      expect(console.log).toHaveBeenCalledWith('\n=== IMPORTANT ===');
      expect(console.log).toHaveBeenCalledWith('The redirect_uri parameter above MUST be registered in Google Cloud Console');
      
      delete process.env.STAGE;
      delete process.env.AWS_REGION;
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
    
    it('環境変数のGOOGLE_REDIRECT_URIが優先される', async () => {
      process.env.GOOGLE_REDIRECT_URI = 'https://custom.example.com/callback';
      
      await initiateAuth(mockEvent);
      
      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        'test-client-id',
        'test-client-secret',
        'https://custom.example.com/callback'
      );
      
      delete process.env.GOOGLE_REDIRECT_URI;
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
      expect(console.log).toHaveBeenCalledWith('- GOOGLE_CLIENT_ID from env:', 'SET');
      expect(console.log).toHaveBeenCalledWith('- GOOGLE_CLIENT_SECRET from env:', 'SET');
      expect(console.log).toHaveBeenCalledWith('- Client ID source:', 'Environment');
      expect(console.log).toHaveBeenCalledWith('- Client Secret source:', 'Environment');
      
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
    });
    
    it('REACT_APP環境変数からもクライアントIDを取得できる', async () => {
      getApiKeys.mockResolvedValue({});
      process.env.REACT_APP_GOOGLE_CLIENT_ID = 'react-client-id';
      process.env.REACT_APP_GOOGLE_CLIENT_SECRET = 'react-client-secret';
      
      await initiateAuth(mockEvent);
      
      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        'react-client-id',
        'react-client-secret',
        expect.any(String)
      );
      
      delete process.env.REACT_APP_GOOGLE_CLIENT_ID;
      delete process.env.REACT_APP_GOOGLE_CLIENT_SECRET;
    });
    
    it('セッションが存在しない場合は401エラーを返す', async () => {
      getSessionFromRequest.mockResolvedValue({
        success: false,
        error: 'NO_SESSION',
        message: 'セッションが存在しません'
      });
      
      const response = await initiateAuth(mockEvent);
      
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NO_SESSION');
      expect(body.error.message).toBe('セッションが存在しません');
    });
    
    it('JWTトークンからセッションIDを使用する', async () => {
      getSessionFromRequest.mockResolvedValue({
        success: true,
        session: {
          email: 'jwt@example.com',
          requiresOAuth: true
        },
        source: 'jwt'
      });
      
      const response = await initiateAuth(mockEvent);
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.authUrl).toContain('state=jwt@example.com');
    });
    
    it('URLパラメータの詳細を正しく解析して表示する', async () => {
      const response = await initiateAuth(mockEvent);
      
      expect(response.statusCode).toBe(200);
      expect(console.log).toHaveBeenCalledWith('\nURL Components:');
      expect(console.log).toHaveBeenCalledWith('- redirect_uri parameter:', 'https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback');
      expect(console.log).toHaveBeenCalledWith('- client_id parameter:', 'test-client-id');
      expect(console.log).toHaveBeenCalledWith('- scope parameter:', 'drive.file');
      expect(console.log).toHaveBeenCalledWith('- state parameter:', 'test-session');
    });
    
    it('エラー発生時は500エラーを返す', async () => {
      getSessionFromRequest.mockRejectedValue(new Error('Unexpected error'));
      
      const response = await initiateAuth(mockEvent);
      
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('AUTH_URL_ERROR');
      expect(body.error.message).toBe('Unexpected error');
      expect(console.error).toHaveBeenCalledWith('Error in detailed auth:', expect.any(Error));
    });
    
    it('デフォルト値が正しく設定される', async () => {
      delete process.env.STAGE;
      delete process.env.AWS_REGION;
      delete process.env.GOOGLE_REDIRECT_URI;
      
      await initiateAuth(mockEvent);
      
      expect(console.log).toHaveBeenCalledWith('- Stage:', 'dev');
      expect(console.log).toHaveBeenCalledWith('- Region:', 'us-west-2');
      expect(console.log).toHaveBeenCalledWith('- Default redirect URI:', 'https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback');
    });
    
    it('環境変数が設定されていない場合の表示を確認', async () => {
      delete process.env.GOOGLE_REDIRECT_URI;
      getApiKeys.mockResolvedValue({});
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      
      await initiateAuth(mockEvent);
      
      expect(console.log).toHaveBeenCalledWith('- GOOGLE_REDIRECT_URI:', '(not set)');
      expect(console.log).toHaveBeenCalledWith('- GOOGLE_CLIENT_ID from env:', 'NOT SET');
      expect(console.log).toHaveBeenCalledWith('- GOOGLE_CLIENT_SECRET from env:', 'NOT SET');
    });
  });
});