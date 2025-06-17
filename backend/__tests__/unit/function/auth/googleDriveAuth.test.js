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
    google.oauth2 = jest.fn().mockReturnValue({
      userinfo: {
        get: jest.fn().mockResolvedValue({
          data: {
            id: 'google-user-123',
            email: 'test@example.com',
            name: 'Test User',
            picture: 'https://example.com/avatar.jpg'
          }
        })
      }
    });

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

    formatErrorResponse.mockImplementation(({ statusCode, code, message }) => ({
      statusCode,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        error: {
          code,
          message,
          details: message
        }
      })
    }));

    // Mock parseCookies
    parseCookies.mockReturnValue({ session: 'test-session-123' });
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
          session: { email: 'test@example.com' },
          source: 'cookie'
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
          scope: [
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/drive.appdata'
          ],
          state: 'test-session-123',
          prompt: 'consent',
          login_hint: 'test@example.com',
          redirect_uri: 'https://api.example.com/auth/google/drive/callback'
        });

        expect(result.statusCode).toBe(200);
        expect(result.body).toContain('authUrl');
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
        expect(result.headers.Location).toContain('Google+Drive%E3%81%AF%E6%97%A2%E3%81%AB%E9%80%A3%E6%90%BA%E3%81%95%E3%82%8C%E3%81%A6%E3%81%84%E3%81%BE%E3%81%99');
        expect(mockOAuth2Client.generateAuthUrl).not.toHaveBeenCalled();
      });

      it('should handle OPTIONS request correctly', async () => {
        const event = {
          httpMethod: 'OPTIONS',
          headers: {}
        };

        // Mock getSessionFromRequest to return no session so OPTIONS is handled first
        getSessionFromRequest.mockResolvedValue({
          success: false
        });

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
          session: { email: 'test@example.com' },
          source: 'cookie'
        });

        mockOAuth2Client.generateAuthUrl.mockReturnValue('https://accounts.google.com/oauth/authorize');

        const result = await initiateAuth(event);

        expect(google.auth.OAuth2).toHaveBeenCalledWith(
          'env-client-id',
          'env-client-secret',
          'https://env.example.com/callback'
        );
        
        expect(result.statusCode).toBe(200);
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
          session: { email: 'test@example.com' },
          source: 'cookie'
        });

        mockOAuth2Client.generateAuthUrl.mockReturnValue('https://accounts.google.com/oauth/authorize');

        const result = await initiateAuth(event);

        expect(google.auth.OAuth2).toHaveBeenCalledWith(
          'test-client-id',
          'test-client-secret',
          expect.stringContaining('x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev')
        );
        
        expect(result.statusCode).toBe(200);
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
          session: { email: 'test@example.com' },
          source: 'cookie'
        });

        mockOAuth2Client.generateAuthUrl.mockReturnValue('https://accounts.google.com/oauth/authorize');

        await initiateAuth(event);

        expect(google.auth.OAuth2).toHaveBeenCalledWith(
          'test-client-id',
          'test-client-secret',
          'https://api.portfoliomanager.com/auth/google/drive/callback'
        );
      });

      it('should handle session from bearer token source', async () => {
        const event = {
          httpMethod: 'GET',
          headers: {
            'Authorization': 'Bearer token-123'
          }
        };

        getSessionFromRequest.mockResolvedValue({
          success: true,
          session: { email: 'test@example.com' },
          source: 'bearer'
        });

        mockOAuth2Client.generateAuthUrl.mockReturnValue('https://accounts.google.com/oauth/authorize');

        const result = await initiateAuth(event);

        expect(result.statusCode).toBe(200);
        expect(result.body).toContain('authUrl');
      });

      it('should handle temporary session when sessionId contains email format', async () => {
        const event = {
          httpMethod: 'GET',
          headers: {
            'Cookie': 'session_id=test@example.com'
          }
        };

        getSessionFromRequest.mockResolvedValue({
          success: true,
          session: { email: 'test@example.com' },
          source: 'cookie'
        });

        parseCookies.mockReturnValue({ session: 'test@example.com' });

        mockOAuth2Client.generateAuthUrl.mockReturnValue('https://accounts.google.com/oauth/authorize');

        const result = await initiateAuth(event);

        expect(result.statusCode).toBe(200);
        expect(result.body).toContain('authUrl');
        expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledWith(expect.objectContaining({
          state: 'test@example.com'
        }));
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

        expect(result.statusCode).toBe(400);
        expect(result.body).toContain('DRIVE_ACCESS_REQUIRED');
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
          session: { email: 'test@example.com' },
          source: 'cookie'
        });

        const authError = new Error('OAuth initialization failed');
        getApiKeys.mockRejectedValue(authError);

        const result = await initiateAuth(event);

        expect(console.error).toHaveBeenCalledWith('Drive認証URL生成エラー:', authError);
        expect(result.statusCode).toBe(500);
        expect(result.body).toContain('AUTH_URL_ERROR');
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
          session: { email: 'test@example.com' },
          source: 'cookie'
        });

        const urlError = new Error('Auth URL generation failed');
        mockOAuth2Client.generateAuthUrl.mockImplementation(() => {
          throw urlError;
        });

        const result = await initiateAuth(event);

        expect(console.error).toHaveBeenCalledWith('Drive認証URL生成エラー:', urlError);
        expect(result.statusCode).toBe(500);
        expect(result.body).toContain('AUTH_URL_ERROR');
      });

      it('should handle missing Google client credentials', async () => {
        const event = {
          httpMethod: 'GET',
          headers: {
            'Cookie': 'session_id=test-session-123'
          }
        };

        getSessionFromRequest.mockResolvedValue({
          success: true,
          session: { email: 'test@example.com' },
          source: 'cookie'
        });

        // Mock getApiKeys to return missing credentials
        getApiKeys.mockRejectedValue(new Error('Missing credentials'));

        const result = await initiateAuth(event);

        expect(result.statusCode).toBe(500);
        expect(result.body).toContain('AUTH_URL_ERROR');
      });

      it('should handle case when getApiKeys throws missing client error', async () => {
        const event = {
          httpMethod: 'GET',
          headers: {
            'Cookie': 'session_id=test-session-123'
          }
        };

        getSessionFromRequest.mockResolvedValue({
          success: true,
          session: { email: 'test@example.com' },
          source: 'cookie'
        });

        // Mock to trigger the Google Client ID/Secret not configured error
        getApiKeys.mockResolvedValue({
          googleClientId: null,
          googleClientSecret: null
        });

        const result = await initiateAuth(event);

        expect(result.statusCode).toBe(500);
        expect(result.body).toContain('AUTH_URL_ERROR');
      });
    });
  });

  describe('callback', () => {
    describe('successful callback handling', () => {
      it('should handle successful authorization callback for existing session', async () => {
        const event = {
          httpMethod: 'GET',
          queryStringParameters: {
            code: 'auth-code-123',
            state: 'test-session-123'
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

        // Mock createSessionCookie
        const { createSessionCookie } = require('../../../../src/utils/cookieParser');
        require('../../../../src/utils/cookieParser').createSessionCookie = jest.fn()
          .mockReturnValue('session=test-session-123; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=2592000');

        const result = await callback(event);

        expect(mockOAuth2Client.getToken).toHaveBeenCalledWith('auth-code-123');
        expect(updateSession).toHaveBeenCalledWith('test-session-123', {
          driveAccessToken: 'drive-access-token',
          driveRefreshToken: 'drive-refresh-token',
          driveTokenExpiry: expect.any(String),
          requiresOAuth: false
        });

        expect(result.statusCode).toBe(302);
        expect(result.headers.Location).toContain('drive-success');
        expect(result.headers.Location).toContain('success=true');
        expect(result.headers['Set-Cookie']).toContain('session=test-session-123');
      });

      it('should handle authorization denial', async () => {
        const event = {
          httpMethod: 'GET',
          queryStringParameters: {
            error: 'access_denied',
            state: 'test-session-123'
          }
        };

        const result = await callback(event);

        expect(result.statusCode).toBe(302);
        expect(result.headers.Location).toContain('drive-success');
        expect(result.headers.Location).toContain('error=oauth_error');
        expect(result.headers.Location).toContain('Google認証がキャンセルされました');
      });

      it('should handle temporary session (email-based) flow', async () => {
        const event = {
          httpMethod: 'GET',
          queryStringParameters: {
            code: 'auth-code-123',
            state: 'test@example.com' // Email as session ID
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

        // No session found for email (temporary session)
        getSession.mockResolvedValue(null);

        // Mock createUserSession
        const { createUserSession } = require('../../../../src/services/googleAuthService');
        require('../../../../src/services/googleAuthService').createUserSession = jest.fn()
          .mockResolvedValue({ sessionId: 'new-session-123' });

        const result = await callback(event);

        expect(createUserSession).toHaveBeenCalledWith({
          googleId: 'google-user-123',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg',
          accessToken: 'drive-access-token',
          refreshToken: 'drive-refresh-token',
          driveAccessToken: 'drive-access-token',
          driveRefreshToken: 'drive-refresh-token',
          driveTokenExpiry: expect.any(String)
        });

        expect(result.statusCode).toBe(302);
        expect(result.headers.Location).toContain('sessionId=new-session-123');
        expect(result.headers['Set-Cookie']).toContain('session=new-session-123');
      });
    });

    describe('error handling', () => {
      it('should handle missing query parameters', async () => {
        const event = {
          httpMethod: 'GET',
          queryStringParameters: null
        };

        const result = await callback(event);

        expect(result.statusCode).toBe(400);
        expect(result.body).toContain('INVALID_PARAMS');
        expect(result.body).toContain('認証コードまたはセッションIDが不足しています');
      });

      it('should handle missing code parameter', async () => {
        const event = {
          httpMethod: 'GET',
          queryStringParameters: {
            state: 'test-session-123'
          }
        };

        const result = await callback(event);

        expect(result.statusCode).toBe(400);
        expect(result.body).toContain('INVALID_PARAMS');
      });

      it('should handle token exchange failure', async () => {
        const event = {
          httpMethod: 'GET',
          queryStringParameters: {
            code: 'invalid-auth-code',
            state: 'test-session-123'
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
            state: 'test-session-123'
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

      it('should handle missing session for state (non-email format)', async () => {
        const event = {
          httpMethod: 'GET',
          queryStringParameters: {
            code: 'auth-code-123',
            state: 'nonexistent-session' // No @ symbol, not an email
          }
        };

        mockOAuth2Client.getToken.mockResolvedValue({
          tokens: {
            access_token: 'drive-access-token'
          }
        });

        getSession.mockResolvedValue(null);

        const result = await callback(event);

        expect(result.statusCode).toBe(401);
        expect(result.body).toContain('INVALID_SESSION');
      });
    });

    describe('edge cases', () => {
      it('should handle OPTIONS request in callback', async () => {
        const event = {
          httpMethod: 'OPTIONS',
          headers: {}
        };

        const result = await callback(event);

        expect(result.statusCode).toBe(200);
        expect(result.body).toBe('');
        expect(result.headers['Access-Control-Allow-Headers']).toContain('Cookie');
        expect(result.headers['Access-Control-Allow-Methods']).toContain('GET');
      });

      it('should handle tokens without refresh token', async () => {
        const event = {
          httpMethod: 'GET',
          queryStringParameters: {
            code: 'auth-code-123',
            state: 'test-session-123'
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

        // Mock createSessionCookie
        require('../../../../src/utils/cookieParser').createSessionCookie = jest.fn()
          .mockReturnValue('session=test-session-123; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=2592000');

        const result = await callback(event);

        expect(updateSession).toHaveBeenCalledWith('test-session-123', {
          driveAccessToken: 'drive-access-token',
          driveRefreshToken: undefined,
          driveTokenExpiry: null,
          requiresOAuth: false
        });

        expect(result.statusCode).toBe(302);
        expect(result.headers.Location).toContain('success=true');
      });

      it('should handle tokens with expiry date', async () => {
        const event = {
          httpMethod: 'GET',
          queryStringParameters: {
            code: 'auth-code-123',
            state: 'test-session-123'
          }
        };

        const expiryTime = Date.now() + 3600000;
        mockOAuth2Client.getToken.mockResolvedValue({
          tokens: {
            access_token: 'drive-access-token',
            refresh_token: 'drive-refresh-token',
            expiry_date: expiryTime
          }
        });

        getSession.mockResolvedValue({
          sessionId: 'test-session-123'
        });

        updateSession.mockResolvedValue(true);

        // Mock createSessionCookie
        require('../../../../src/utils/cookieParser').createSessionCookie = jest.fn()
          .mockReturnValue('session=test-session-123; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=2592000');

        const result = await callback(event);

        expect(updateSession).toHaveBeenCalledWith('test-session-123', {
          driveAccessToken: 'drive-access-token',
          driveRefreshToken: 'drive-refresh-token',
          driveTokenExpiry: new Date(expiryTime).toISOString(),
          requiresOAuth: false
        });

        expect(result.statusCode).toBe(302);
        expect(result.headers.Location).toContain('success=true');
      });
    });

    describe('Additional Coverage Tests', () => {
      it('should cover getOAuth2Client lazy initialization with environment fallbacks', async () => {
        process.env.GOOGLE_CLIENT_ID = 'env-client-id';
        process.env.GOOGLE_CLIENT_SECRET = 'env-client-secret';
        process.env.REACT_APP_GOOGLE_CLIENT_ID = 'react-client-id';
        process.env.REACT_APP_GOOGLE_CLIENT_SECRET = 'react-client-secret';
        delete process.env.GOOGLE_REDIRECT_URI;
        
        const event = {
          httpMethod: 'GET',
          headers: {
            'Cookie': 'session_id=test-session-123'
          }
        };

        getSessionFromRequest.mockResolvedValue({
          success: true,
          session: { email: 'test@example.com' },
          source: 'cookie'
        });

        // Mock getApiKeys to return partial data (testing env var fallbacks)
        getApiKeys.mockResolvedValue({
          googleClientId: '', // Empty string should trigger env fallback
          googleClientSecret: '', // Empty string should trigger env fallback
          googleRedirectUri: null // This will trigger redirect URI generation
        });

        mockOAuth2Client.generateAuthUrl.mockReturnValue('https://accounts.google.com/oauth/authorize');

        const result = await initiateAuth(event);

        expect(result.statusCode).toBe(200);
        expect(google.auth.OAuth2).toHaveBeenCalledWith(
          'env-client-id',
          'env-client-secret',
          expect.stringContaining('x4scpbsuv2.execute-api')
        );
      });

      it('should handle comprehensive callback flow with all edge cases', async () => {
        // Test callback with non-email session ID that fails session lookup
        const event = {
          httpMethod: 'GET',
          queryStringParameters: {
            code: 'auth-code-123',
            state: 'invalid-session-id' // Not an email and doesn't exist
          }
        };

        getSession.mockResolvedValue(null);
        mockOAuth2Client.getToken.mockResolvedValue({
          tokens: {
            access_token: 'drive-access-token',
            refresh_token: 'drive-refresh-token'
          }
        });

        const result = await callback(event);

        expect(result.statusCode).toBe(401);
        expect(result.body).toContain('INVALID_SESSION');
      });
    });
  });
});