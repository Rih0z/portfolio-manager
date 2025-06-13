/**
 * Test function to debug OAuth URL generationのテスト
 */
'use strict';

const { handler } = require('../../../../src/function/auth/testOAuthUrl');
const { getApiKeys } = require('../../../../src/utils/secretsManager');
const { google } = require('googleapis');

// モック
jest.mock('../../../../src/utils/secretsManager');
jest.mock('googleapis');

describe('testOAuthUrl', () => {
  let mockOAuth2Client;
  
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    
    // OAuth2クライアントのモック
    mockOAuth2Client = {
      generateAuthUrl: jest.fn()
    };
    
    google.auth = {
      OAuth2: jest.fn().mockReturnValue(mockOAuth2Client)
    };
    
    // デフォルトのモック設定
    getApiKeys.mockResolvedValue({
      googleClientId: 'test-client-id',
      googleClientSecret: 'test-client-secret'
    });
    
    // generateAuthUrlの実装 - redirect_uriを含むURLを返す
    mockOAuth2Client.generateAuthUrl.mockImplementation(function() {
      const oauth2Client = this;
      const redirectUri = google.auth.OAuth2.mock.calls.find(
        call => call[2] === oauth2Client._redirectUri
      )?.[2] || 'unknown';
      return `https://accounts.google.com/o/oauth2/v2/auth?redirect_uri=${encodeURIComponent(redirectUri)}&client_id=test-client-id`;
    });
  });
  
  afterEach(() => {
    // 環境変数をクリーンアップ
    delete process.env.STAGE;
    delete process.env.AWS_REGION;
    delete process.env.GOOGLE_REDIRECT_URI;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.REACT_APP_GOOGLE_CLIENT_ID;
    delete process.env.REACT_APP_GOOGLE_CLIENT_SECRET;
  });
  
  const mockEvent = {
    httpMethod: 'GET',
    path: '/auth/test-oauth-url',
    headers: {
      Host: 'x4scpbsuv2.execute-api.us-west-2.amazonaws.com',
      origin: 'https://example.com'
    },
    requestContext: {
      stage: 'dev',
      apiId: 'x4scpbsuv2',
      domainName: 'x4scpbsuv2.execute-api.us-west-2.amazonaws.com'
    }
  };
  
  it('OAuth設定のテスト結果を返す', async () => {
    process.env.STAGE = 'dev';
    process.env.AWS_REGION = 'us-west-2';
    
    // 各redirect URIでの呼び出しをモック
    let callCount = 0;
    google.auth.OAuth2.mockImplementation((clientId, clientSecret, redirectUri) => {
      const client = {
        _redirectUri: redirectUri,
        generateAuthUrl: jest.fn().mockReturnValue(
          `https://accounts.google.com/o/oauth2/v2/auth?redirect_uri=${encodeURIComponent(redirectUri)}&client_id=test-client-id`
        )
      };
      callCount++;
      return client;
    });
    
    const response = await handler(mockEvent);
    
    expect(response.statusCode).toBe(200);
    expect(response.headers['Content-Type']).toBe('application/json');
    expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
    
    const body = JSON.parse(response.body);
    
    // 環境変数情報を確認
    expect(body.environment).toEqual({
      STAGE: 'dev',
      AWS_REGION: 'us-west-2',
      GOOGLE_REDIRECT_URI: undefined,
      hasClientId: true,
      hasClientSecret: true
    });
    
    // リクエスト情報を確認
    expect(body.requestInfo).toEqual({
      method: 'GET',
      path: '/auth/test-oauth-url',
      host: 'x4scpbsuv2.execute-api.us-west-2.amazonaws.com',
      origin: 'https://example.com',
      stage: 'dev',
      apiId: 'x4scpbsuv2',
      domainName: 'x4scpbsuv2.execute-api.us-west-2.amazonaws.com',
      fullUrl: 'https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/auth/test-oauth-url'
    });
    
    // redirect URIテスト結果を確認
    expect(body.redirectUriTests.fromCode).toMatchObject({
      redirectUri: 'https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback',
      generatedUrl: expect.stringContaining('redirect_uri='),
      extractedRedirectUri: 'https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback',
      matches: true
    });
    
    // 推奨事項を確認
    expect(body.recommendation).toBe('Based on your request, the redirect URI should be: https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/auth/test-oauth-url');
    
    // Google Console手順を確認
    expect(body.googleConsoleInstructions).toEqual([
      'Go to https://console.cloud.google.com/apis/credentials',
      'Click on your OAuth 2.0 Client ID',
      'In "Authorized redirect URIs", add exactly:',
      'https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/auth/test-oauth-url'
    ]);
    
    // ログ出力を確認
    expect(console.log).toHaveBeenCalledWith('=== OAuth URL Test Function ===');
    expect(console.log).toHaveBeenCalledWith('Event:', expect.any(String));
    expect(console.log).toHaveBeenCalledWith('Redirect URI configurations:', expect.any(Object));
  });
  
  it('本番環境では異なるredirect URIを使用する', async () => {
    process.env.STAGE = 'prod';
    
    const response = await handler(mockEvent);
    
    const body = JSON.parse(response.body);
    expect(body.redirectUriTests.fromCode.redirectUri).toBe('https://api.portfoliomanager.com/auth/google/drive/callback');
  });
  
  it('環境変数のGOOGLE_REDIRECT_URIを使用する', async () => {
    process.env.GOOGLE_REDIRECT_URI = 'https://custom.example.com/callback';
    
    const response = await handler(mockEvent);
    
    const body = JSON.parse(response.body);
    expect(body.environment.GOOGLE_REDIRECT_URI).toBe('https://custom.example.com/callback');
    expect(body.redirectUriTests.fromEnv).toMatchObject({
      redirectUri: 'https://custom.example.com/callback',
      extractedRedirectUri: 'https://custom.example.com/callback',
      matches: true
    });
  });
  
  it('環境変数からクライアントIDとシークレットを取得する', async () => {
    getApiKeys.mockResolvedValue({});
    process.env.GOOGLE_CLIENT_ID = 'env-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'env-client-secret';
    
    const response = await handler(mockEvent);
    
    const body = JSON.parse(response.body);
    expect(body.environment.hasClientId).toBe(true);
    expect(body.environment.hasClientSecret).toBe(true);
  });
  
  it('REACT_APP環境変数からもクライアントIDを取得できる', async () => {
    getApiKeys.mockResolvedValue({});
    process.env.REACT_APP_GOOGLE_CLIENT_ID = 'react-client-id';
    process.env.REACT_APP_GOOGLE_CLIENT_SECRET = 'react-client-secret';
    
    const response = await handler(mockEvent);
    
    const body = JSON.parse(response.body);
    expect(body.environment.hasClientId).toBe(true);
    expect(body.environment.hasClientSecret).toBe(true);
  });
  
  it('OAuth2クライアント作成エラーを処理する', async () => {
    google.auth.OAuth2.mockImplementation(() => {
      throw new Error('OAuth2 initialization failed');
    });
    
    const response = await handler(mockEvent);
    
    const body = JSON.parse(response.body);
    expect(body.redirectUriTests.fromCode.error).toBe('OAuth2 initialization failed');
  });
  
  it('エラー発生時は500エラーを返す', async () => {
    getApiKeys.mockRejectedValue(new Error('Secrets Manager error'));
    
    const response = await handler(mockEvent);
    
    expect(response.statusCode).toBe(500);
    expect(response.headers['Content-Type']).toBe('application/json');
    expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
    
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Secrets Manager error');
    expect(body.stack).toBeDefined();
    expect(console.error).toHaveBeenCalledWith('Test function error:', expect.any(Error));
  });
  
  it('ヘッダーの大文字小文字を処理する', async () => {
    const eventWithMixedCase = {
      ...mockEvent,
      headers: {
        host: 'lowercase.example.com',
        Origin: 'https://uppercase.example.com'
      }
    };
    
    const response = await handler(eventWithMixedCase);
    
    const body = JSON.parse(response.body);
    expect(body.requestInfo.host).toBe('lowercase.example.com');
    expect(body.requestInfo.origin).toBe('https://uppercase.example.com');
  });
  
  it('requestContextがない場合を処理する', async () => {
    const eventWithoutContext = {
      ...mockEvent,
      requestContext: undefined
    };
    
    const response = await handler(eventWithoutContext);
    
    const body = JSON.parse(response.body);
    expect(body.requestInfo.stage).toBeUndefined();
    expect(body.requestInfo.apiId).toBeUndefined();
    expect(body.requestInfo.domainName).toBeUndefined();
    expect(body.requestInfo.fullUrl).toBe('https://undefined/auth/test-oauth-url');
  });
  
  it('すべてのredirect URI設定をテストする', async () => {
    process.env.GOOGLE_REDIRECT_URI = 'https://env.example.com/callback';
    
    const response = await handler(mockEvent);
    
    const body = JSON.parse(response.body);
    
    // fromCode, fromEnv, fromServerlessYmlの3つがテストされることを確認
    expect(Object.keys(body.redirectUriTests)).toContain('fromCode');
    expect(Object.keys(body.redirectUriTests)).toContain('fromEnv');
    expect(Object.keys(body.redirectUriTests)).toContain('fromServerlessYml');
    
    // それぞれが正しくテストされていることを確認
    expect(body.redirectUriTests.fromEnv.redirectUri).toBe('https://env.example.com/callback');
    expect(body.redirectUriTests.fromServerlessYml.redirectUri).toBe('https://env.example.com/callback');
  });
  
  it('デフォルト値が正しく設定される', async () => {
    delete process.env.STAGE;
    delete process.env.AWS_REGION;
    
    const response = await handler(mockEvent);
    
    const body = JSON.parse(response.body);
    expect(body.redirectUriTests.fromCode.redirectUri).toContain('/dev/');
    expect(body.redirectUriTests.fromCode.redirectUri).toContain('us-west-2');
  });
});