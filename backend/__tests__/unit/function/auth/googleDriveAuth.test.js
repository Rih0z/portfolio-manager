const { initiateAuth, callback } = require('../../../../src/function/auth/googleDriveAuth');
const { google } = require('googleapis');
const { formatResponse, formatErrorResponse } = require('../../../../src/utils/responseUtils');
const { getSession, updateSession } = require('../../../../src/services/googleAuthService');
const { parseCookies } = require('../../../../src/utils/cookieParser');
const { getCorsHeaders, getCorsOptionsHeaders } = require('../../../../src/utils/corsHeaders');
const { getSessionFromRequest } = require('../../../../src/utils/sessionHelper');
const { getApiKeys } = require('../../../../src/utils/secretsManager');

jest.mock('googleapis');
jest.mock('../../../../src/utils/responseUtils');
jest.mock('../../../../src/services/googleAuthService');
jest.mock('../../../../src/utils/cookieParser');
jest.mock('../../../../src/utils/corsHeaders');
jest.mock('../../../../src/utils/sessionHelper');
jest.mock('../../../../src/utils/secretsManager');

describe('googleDriveAuth', () => {
  let mockOAuth2Client;
  let originalConsole;
  let originalEnv;

  beforeEach(() => {
    originalConsole = {
      log: console.log,
      error: console.error
    };
    originalEnv = process.env;
    
    console.log = jest.fn();
    console.error = jest.fn();

    mockOAuth2Client = {
      generateAuthUrl: jest.fn(),
      getToken: jest.fn(),
      setCredentials: jest.fn(),
      credentials: {}
    };

    google.auth.OAuth2 = jest.fn().mockImplementation(() => mockOAuth2Client);

    // Default mocks
    getApiKeys.mockResolvedValue({
      googleClientId: 'test-client-id',
      googleClientSecret: 'test-client-secret',
      googleRedirectUri: 'https://api.example.com/auth/google/drive/callback'
    });

    getCorsHeaders.mockReturnValue({
      'Access-Control-Allow-Origin': 'https://example.com',
      'Access-Control-Allow-Credentials': 'true',
      'Content-Type': 'application/json'
    });

    getCorsOptionsHeaders.mockReturnValue({
      'Access-Control-Allow-Origin': 'https://example.com',
      'Access-Control-Allow-Credentials': 'true',
      'Content-Type': 'application/json',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    });

    formatResponse.mockImplementation((statusCode, data, headers) => ({
      statusCode,
      headers: headers || {},
      body: JSON.stringify(data)
    }));

    formatErrorResponse.mockImplementation((statusCode, message, headers) => ({
      statusCode,
      headers: headers || {},
      body: JSON.stringify({ error: message })
    }));
  });

  afterEach(() => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('initiateAuth', () => {
    describe('successful authentication initiation', () => {
      it('should initiate Drive authentication for new session', async () => {
        const event = {
          httpMethod: 'GET',
          headers: {
            'Cookie': 'session_id=test-session-123'
          }
        };

        getSessionFromRequest.mockResolvedValue({
          success: true,
          session: { sessionId: 'test-session-123' }
        });

        mockOAuth2Client.generateAuthUrl.mockReturnValue('https://accounts.google.com/oauth/authorize?auth_url');

        const result = await initiateAuth(event);

        expect(google.auth.OAuth2).toHaveBeenCalledWith(
          'test-client-id',
          'test-client-secret',
          'https://api.example.com/auth/google/drive/callback'
        );

        expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledWith({
          access_type: 'offline',
          scope: ['https://www.googleapis.com/auth/drive.file'],
          state: JSON.stringify({
            sessionId: 'test-session-123',
            purpose: 'drive'
          }),
          prompt: 'consent'
        });

        expect(result.statusCode).toBe(302);
        expect(result.headers.Location).toBe('https://accounts.google.com/oauth/authorize?auth_url');
      });

      it('should redirect to success page if Drive access already exists', async () => {
        const event = {
          httpMethod: 'GET',
          headers: {
            'Cookie': 'session_id=test-session-123'
          }
        };

        getSessionFromRequest.mockResolvedValue({
          success: true,
          session: { 
            sessionId: 'test-session-123',
            driveAccessToken: 'existing-drive-token'
          }
        });

        const result = await initiateAuth(event);

        expect(result.statusCode).toBe(302);
        expect(result.headers.Location).toContain('drive-success');
        expect(result.headers.Location).toContain('success=true');
        expect(result.headers.Location).toContain('Google Driveは既に連携されています');
        expect(mockOAuth2Client.generateAuthUrl).not.toHaveBeenCalled();
      });

      it('should handle OPTIONS request correctly', async () => {
        const event = {
          httpMethod: 'OPTIONS',
          headers: {}
        };

        const result = await initiateAuth(event);

        expect(result.statusCode).toBe(200);
        expect(result.body).toBe('');
        expect(getCorsOptionsHeaders).toHaveBeenCalledWith(event);
        expect(result.headers['Access-Control-Allow-Headers']).toContain('Cookie');
        expect(result.headers['Access-Control-Allow-Methods']).toContain('GET');
      });

      it('should use environment variables when secrets manager values are missing', async () => {
        process.env.GOOGLE_CLIENT_ID = 'env-client-id';
        process.env.GOOGLE_CLIENT_SECRET = 'env-client-secret';
        process.env.GOOGLE_REDIRECT_URI = 'https://env.example.com/callback';

        getApiKeys.mockResolvedValue({});

        const event = {
          httpMethod: 'GET',
          headers: {
            'Cookie': 'session_id=test-session-123'
          }
        };

        getSessionFromRequest.mockResolvedValue({
          success: true,
          session: { sessionId: 'test-session-123' }
        });

        mockOAuth2Client.generateAuthUrl.mockReturnValue('https://accounts.google.com/oauth/authorize');

        await initiateAuth(event);

        expect(google.auth.OAuth2).toHaveBeenCalledWith(
          'env-client-id',
          'env-client-secret',
          'https://env.example.com/callback'
        );
      });

      it('should generate default redirect URI based on stage', async () => {
        process.env.STAGE = 'dev';
        process.env.AWS_REGION = 'us-west-2';

        getApiKeys.mockResolvedValue({
          googleClientId: 'test-client-id',
          googleClientSecret: 'test-client-secret'
          // No googleRedirectUri
        });

        const event = {
          httpMethod: 'GET',
          headers: {
            'Cookie': 'session_id=test-session-123'
          }
        };

        getSessionFromRequest.mockResolvedValue({
          success: true,
          session: { sessionId: 'test-session-123' }
        });

        mockOAuth2Client.generateAuthUrl.mockReturnValue('https://accounts.google.com/oauth/authorize');

        await initiateAuth(event);

        expect(google.auth.OAuth2).toHaveBeenCalledWith(
          'test-client-id',
          'test-client-secret',
          expect.stringContaining('x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev')
        );
      });

      it('should generate production redirect URI for prod stage', async () => {
        process.env.STAGE = 'prod';

        getApiKeys.mockResolvedValue({
          googleClientId: 'test-client-id',
          googleClientSecret: 'test-client-secret'
        });

        const event = {
          httpMethod: 'GET',
          headers: {
            'Cookie': 'session_id=test-session-123'
          }
        };

        getSessionFromRequest.mockResolvedValue({
          success: true,
          session: { sessionId: 'test-session-123' }
        });

        mockOAuth2Client.generateAuthUrl.mockReturnValue('https://accounts.google.com/oauth/authorize');

        await initiateAuth(event);

        expect(google.auth.OAuth2).toHaveBeenCalledWith(
          'test-client-id',
          'test-client-secret',
          'https://api.portfoliomanager.com/auth/google/drive/callback'
        );
      });
    });

    describe('error handling', () => {
      it('should handle session retrieval failure', async () => {
        const event = {
          httpMethod: 'GET',
          headers: {}
        };

        getSessionFromRequest.mockResolvedValue({
          success: false,
          error: 'No valid session found'
        });

        const result = await initiateAuth(event);

        expect(formatErrorResponse).toHaveBeenCalledWith(
          401,
          'セッションが見つかりません',
          expect.any(Object)
        );
      });

      it('should handle OAuth client initialization failure', async () => {
        const event = {
          httpMethod: 'GET',
          headers: {
            'Cookie': 'session_id=test-session-123'
          }
        };

        getSessionFromRequest.mockResolvedValue({
          success: true,
          session: { sessionId: 'test-session-123' }
        });

        const authError = new Error('OAuth initialization failed');
        getApiKeys.mockRejectedValue(authError);

        const result = await initiateAuth(event);

        expect(console.error).toHaveBeenCalledWith('Drive認証開始エラー:', authError);
        expect(formatErrorResponse).toHaveBeenCalledWith(
          500,
          'Google Drive認証の開始に失敗しました',
          expect.any(Object)
        );
      });

      it('should handle auth URL generation failure', async () => {
        const event = {
          httpMethod: 'GET',
          headers: {
            'Cookie': 'session_id=test-session-123'
          }
        };

        getSessionFromRequest.mockResolvedValue({
          success: true,
          session: { sessionId: 'test-session-123' }
        });

        const urlError = new Error('Auth URL generation failed');
        mockOAuth2Client.generateAuthUrl.mockImplementation(() => {
          throw urlError;
        });

        const result = await initiateAuth(event);

        expect(console.error).toHaveBeenCalledWith('Drive認証開始エラー:', urlError);
        expect(formatErrorResponse).toHaveBeenCalledWith(
          500,
          'Google Drive認証の開始に失敗しました',
          expect.any(Object)
        );
      });

      it('should handle missing session ID', async () => {
        const event = {
          httpMethod: 'GET',
          headers: {
            'Cookie': 'session_id=test-session-123'
          }
        };

        getSessionFromRequest.mockResolvedValue({
          success: true,
          session: {} // No sessionId
        });

        const result = await initiateAuth(event);

        expect(formatErrorResponse).toHaveBeenCalledWith(
          400,
          'セッションIDが見つかりません',
          expect.any(Object)
        );
      });
    });
  });

  describe('callback', () => {
    describe('successful callback handling', () => {
      it('should handle successful authorization callback', async () => {
        const event = {
          httpMethod: 'GET',
          queryStringParameters: {
            code: 'auth-code-123',
            state: JSON.stringify({
              sessionId: 'test-session-123',
              purpose: 'drive'
            })
          }
        };

        const mockTokens = {
          access_token: 'drive-access-token',
          refresh_token: 'drive-refresh-token',
          expiry_date: Date.now() + 3600000
        };

        mockOAuth2Client.getToken.mockResolvedValue({
          tokens: mockTokens
        });

        getSession.mockResolvedValue({
          sessionId: 'test-session-123',
          userId: 'user-123'
        });

        updateSession.mockResolvedValue(true);

        const result = await callback(event);

        expect(mockOAuth2Client.getToken).toHaveBeenCalledWith('auth-code-123');
        expect(updateSession).toHaveBeenCalledWith('test-session-123', {
          driveAccessToken: 'drive-access-token',
          driveRefreshToken: 'drive-refresh-token',
          driveTokenExpiry: mockTokens.expiry_date
        });

        expect(result.statusCode).toBe(302);
        expect(result.headers.Location).toContain('drive-success');
        expect(result.headers.Location).toContain('success=true');
      });

      it('should handle authorization denial', async () => {
        const event = {
          httpMethod: 'GET',
          queryStringParameters: {
            error: 'access_denied',
            state: JSON.stringify({
              sessionId: 'test-session-123',
              purpose: 'drive'
            })
          }
        };

        const result = await callback(event);

        expect(result.statusCode).toBe(302);
        expect(result.headers.Location).toContain('drive-success');
        expect(result.headers.Location).toContain('error=auth_denied');
        expect(result.headers.Location).toContain('ユーザーによって認証が拒否されました');
      });

      it('should use custom success URL from environment', async () => {
        process.env.DRIVE_AUTH_SUCCESS_URL = 'https://custom.example.com/success';

        const event = {
          httpMethod: 'GET',
          queryStringParameters: {
            code: 'auth-code-123',
            state: JSON.stringify({
              sessionId: 'test-session-123',
              purpose: 'drive'
            })
          }
        };

        const mockTokens = {
          access_token: 'drive-access-token',
          refresh_token: 'drive-refresh-token'
        };

        mockOAuth2Client.getToken.mockResolvedValue({
          tokens: mockTokens
        });

        getSession.mockResolvedValue({
          sessionId: 'test-session-123'
        });

        updateSession.mockResolvedValue(true);

        const result = await callback(event);

        expect(result.headers.Location).toContain('https://custom.example.com/success');
      });
    });

    describe('error handling', () => {
      it('should handle missing query parameters', async () => {
        const event = {
          httpMethod: 'GET',
          queryStringParameters: null
        };

        const result = await callback(event);

        expect(result.statusCode).toBe(302);
        expect(result.headers.Location).toContain('error=invalid_request');
        expect(result.headers.Location).toContain('認証コードまたはstateパラメータが見つかりません');
      });

      it('should handle invalid state parameter', async () => {
        const event = {
          httpMethod: 'GET',
          queryStringParameters: {
            code: 'auth-code-123',
            state: 'invalid-json'
          }
        };

        const result = await callback(event);

        expect(result.statusCode).toBe(302);
        expect(result.headers.Location).toContain('error=invalid_state');
      });

      it('should handle token exchange failure', async () => {
        const event = {
          httpMethod: 'GET',
          queryStringParameters: {
            code: 'invalid-auth-code',
            state: JSON.stringify({
              sessionId: 'test-session-123',
              purpose: 'drive'
            })
          }
        };

        const tokenError = new Error('Invalid authorization code');
        mockOAuth2Client.getToken.mockRejectedValue(tokenError);

        const result = await callback(event);

        expect(console.error).toHaveBeenCalledWith('Drive認証コールバックエラー:', tokenError);
        expect(result.statusCode).toBe(302);
        expect(result.headers.Location).toContain('error=auth_failed');
      });

      it('should handle session update failure', async () => {
        const event = {
          httpMethod: 'GET',
          queryStringParameters: {
            code: 'auth-code-123',
            state: JSON.stringify({
              sessionId: 'test-session-123',
              purpose: 'drive'
            })
          }
        };

        const mockTokens = {
          access_token: 'drive-access-token',
          refresh_token: 'drive-refresh-token'
        };

        mockOAuth2Client.getToken.mockResolvedValue({
          tokens: mockTokens
        });

        getSession.mockResolvedValue({
          sessionId: 'test-session-123'
        });

        const updateError = new Error('Session update failed');
        updateSession.mockRejectedValue(updateError);

        const result = await callback(event);

        expect(console.error).toHaveBeenCalledWith('Drive認証コールバックエラー:', updateError);
        expect(result.statusCode).toBe(302);
        expect(result.headers.Location).toContain('error=auth_failed');
      });

      it('should handle missing session for state', async () => {
        const event = {
          httpMethod: 'GET',
          queryStringParameters: {
            code: 'auth-code-123',
            state: JSON.stringify({
              sessionId: 'nonexistent-session',
              purpose: 'drive'
            })
          }
        };

        mockOAuth2Client.getToken.mockResolvedValue({
          tokens: {
            access_token: 'drive-access-token'
          }
        });

        getSession.mockResolvedValue(null);

        const result = await callback(event);

        expect(result.statusCode).toBe(302);
        expect(result.headers.Location).toContain('error=auth_failed');
      });
    });

    describe('edge cases', () => {
      it('should handle missing authorization code', async () => {
        const event = {
          httpMethod: 'GET',
          queryStringParameters: {
            state: JSON.stringify({
              sessionId: 'test-session-123',
              purpose: 'drive'
            })
          }
        };

        const result = await callback(event);

        expect(result.statusCode).toBe(302);
        expect(result.headers.Location).toContain('error=invalid_request');
      });

      it('should handle empty state parameter', async () => {
        const event = {
          httpMethod: 'GET',
          queryStringParameters: {
            code: 'auth-code-123',
            state: ''
          }
        };

        const result = await callback(event);

        expect(result.statusCode).toBe(302);
        expect(result.headers.Location).toContain('error=invalid_state');
      });

      it('should handle tokens without refresh token', async () => {
        const event = {
          httpMethod: 'GET',
          queryStringParameters: {
            code: 'auth-code-123',
            state: JSON.stringify({
              sessionId: 'test-session-123',
              purpose: 'drive'
            })
          }
        };

        mockOAuth2Client.getToken.mockResolvedValue({
          tokens: {
            access_token: 'drive-access-token'
            // No refresh_token
          }
        });

        getSession.mockResolvedValue({
          sessionId: 'test-session-123'
        });

        updateSession.mockResolvedValue(true);

        const result = await callback(event);

        expect(updateSession).toHaveBeenCalledWith('test-session-123', {
          driveAccessToken: 'drive-access-token',
          driveRefreshToken: undefined,
          driveTokenExpiry: undefined
        });

        expect(result.statusCode).toBe(302);
        expect(result.headers.Location).toContain('success=true');
      });
    });
  });
});