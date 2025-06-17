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

describe('googleDriveAuth Complete Coverage', () => {
  let mockOAuth2Client;
  let originalConsole;
  let originalEnv;

  beforeEach(() => {
    // Clear module cache to reset oauth2Client variable
    jest.resetModules();
    
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

    parseCookies.mockReturnValue({ session: 'test-session-123' });
  });

  afterEach(() => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('initiateAuth complete coverage', () => {
    it('should handle session already having Drive access', async () => {
      const { initiateAuth } = require('../../../../src/function/auth/googleDriveAuth');
      
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
    });

    it('should handle OPTIONS request', async () => {
      const { initiateAuth } = require('../../../../src/function/auth/googleDriveAuth');
      
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

    it('should fail when session not found', async () => {
      const { initiateAuth } = require('../../../../src/function/auth/googleDriveAuth');
      
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

    it('should succeed with normal OAuth flow', async () => {
      const { initiateAuth } = require('../../../../src/function/auth/googleDriveAuth');
      
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

      expect(result.statusCode).toBe(200);
      expect(result.body).toContain('authUrl');
      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        'test-client-id',
        'test-client-secret',
        'https://api.example.com/auth/google/drive/callback'
      );
    });

    it('should use environment variables when secrets manager returns empty', async () => {
      const { initiateAuth } = require('../../../../src/function/auth/googleDriveAuth');
      
      process.env.GOOGLE_CLIENT_ID = 'env-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'env-client-secret';
      process.env.GOOGLE_REDIRECT_URI = 'https://env.example.com/callback';

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

      getApiKeys.mockResolvedValue({});
      mockOAuth2Client.generateAuthUrl.mockReturnValue('https://accounts.google.com/oauth/authorize');

      const result = await initiateAuth(event);

      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        'env-client-id',
        'env-client-secret',
        'https://env.example.com/callback'
      );
      expect(result.statusCode).toBe(200);
    });

    it('should generate dev redirect URI when no redirect URI configured', async () => {
      const { initiateAuth } = require('../../../../src/function/auth/googleDriveAuth');
      
      process.env.STAGE = 'dev';
      process.env.AWS_REGION = 'us-west-2';

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

      getApiKeys.mockResolvedValue({
        googleClientId: 'test-client-id',
        googleClientSecret: 'test-client-secret'
        // No googleRedirectUri
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

    it('should generate prod redirect URI for prod stage', async () => {
      const { initiateAuth } = require('../../../../src/function/auth/googleDriveAuth');
      
      process.env.STAGE = 'prod';

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

      getApiKeys.mockResolvedValue({
        googleClientId: 'test-client-id',
        googleClientSecret: 'test-client-secret'
      });

      mockOAuth2Client.generateAuthUrl.mockReturnValue('https://accounts.google.com/oauth/authorize');

      const result = await initiateAuth(event);

      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        'test-client-id',
        'test-client-secret',
        'https://api.portfoliomanager.com/auth/google/drive/callback'
      );
      expect(result.statusCode).toBe(200);
    });

    it('should handle REACT_APP environment variables fallback', async () => {
      const { initiateAuth } = require('../../../../src/function/auth/googleDriveAuth');
      
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      process.env.REACT_APP_GOOGLE_CLIENT_ID = 'react-client-id';
      process.env.REACT_APP_GOOGLE_CLIENT_SECRET = 'react-client-secret';

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

      getApiKeys.mockResolvedValue({});
      mockOAuth2Client.generateAuthUrl.mockReturnValue('https://accounts.google.com/oauth/authorize');

      const result = await initiateAuth(event);

      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        'react-client-id',
        'react-client-secret',
        expect.any(String)
      );
      expect(result.statusCode).toBe(200);
    });

    it('should handle default AWS region', async () => {
      const { initiateAuth } = require('../../../../src/function/auth/googleDriveAuth');
      
      delete process.env.AWS_REGION;
      process.env.STAGE = 'dev';

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

      getApiKeys.mockResolvedValue({
        googleClientId: 'test-client-id',
        googleClientSecret: 'test-client-secret'
      });

      mockOAuth2Client.generateAuthUrl.mockReturnValue('https://accounts.google.com/oauth/authorize');

      const result = await initiateAuth(event);

      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        'test-client-id',
        'test-client-secret',
        expect.stringContaining('us-west-2') // Default region
      );
      expect(result.statusCode).toBe(200);
    });

    it('should handle email as session ID', async () => {
      const { initiateAuth } = require('../../../../src/function/auth/googleDriveAuth');
      
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
      expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledWith(expect.objectContaining({
        state: 'test@example.com'
      }));
    });

    it('should handle missing client credentials error', async () => {
      const { initiateAuth } = require('../../../../src/function/auth/googleDriveAuth');
      
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

      getApiKeys.mockResolvedValue({});

      const result = await initiateAuth(event);

      expect(result.statusCode).toBe(500);
      expect(result.body).toContain('AUTH_URL_ERROR');
    });

    it('should handle getApiKeys error', async () => {
      const { initiateAuth } = require('../../../../src/function/auth/googleDriveAuth');
      
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

      getApiKeys.mockRejectedValue(new Error('API Keys error'));

      const result = await initiateAuth(event);

      expect(result.statusCode).toBe(500);
      expect(result.body).toContain('AUTH_URL_ERROR');
    });

    it('should handle generateAuthUrl error', async () => {
      const { initiateAuth } = require('../../../../src/function/auth/googleDriveAuth');
      
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

      mockOAuth2Client.generateAuthUrl.mockImplementation(() => {
        throw new Error('URL generation failed');
      });

      const result = await initiateAuth(event);

      expect(result.statusCode).toBe(500);
      expect(result.body).toContain('AUTH_URL_ERROR');
    });
  });

  describe('callback complete coverage', () => {
    it('should handle OPTIONS request', async () => {
      const { callback } = require('../../../../src/function/auth/googleDriveAuth');
      
      const event = {
        httpMethod: 'OPTIONS',
        headers: {}
      };

      const result = await callback(event);

      expect(result.statusCode).toBe(200);
      expect(result.body).toBe('');
      expect(result.headers['Access-Control-Allow-Headers']).toContain('Cookie');
    });

    it('should handle OAuth error parameter', async () => {
      const { callback } = require('../../../../src/function/auth/googleDriveAuth');
      
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          error: 'access_denied',
          state: 'test-session-123'
        }
      };

      const result = await callback(event);

      expect(result.statusCode).toBe(302);
      expect(result.headers.Location).toContain('error=oauth_error');
      expect(result.headers.Location).toContain('Google%E8%AA%8D%E8%A8%BC%E3%81%8C%E3%82%AD%E3%83%A3%E3%83%B3%E3%82%BB%E3%83%AB%E3%81%95%E3%82%8C%E3%81%BE%E3%81%97%E3%81%9F');
    });

    it('should handle missing query parameters', async () => {
      const { callback } = require('../../../../src/function/auth/googleDriveAuth');
      
      const event = {
        httpMethod: 'GET',
        queryStringParameters: null
      };

      const result = await callback(event);

      expect(result.statusCode).toBe(400);
      expect(result.body).toContain('INVALID_PARAMS');
    });

    it('should handle missing code or sessionId', async () => {
      const { callback } = require('../../../../src/function/auth/googleDriveAuth');
      
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

    it('should handle existing session update successfully', async () => {
      const { callback } = require('../../../../src/function/auth/googleDriveAuth');
      
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
      createSessionCookie.mockReturnValue('session=test-session-123; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=2592000');

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

    it('should handle temporary session (email-based) flow', async () => {
      const { callback } = require('../../../../src/function/auth/googleDriveAuth');
      
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
      createUserSession.mockResolvedValue({ sessionId: 'new-session-123' });

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

    it('should handle non-email session ID that does not exist', async () => {
      const { callback } = require('../../../../src/function/auth/googleDriveAuth');
      
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

    it('should handle getToken error', async () => {
      const { callback } = require('../../../../src/function/auth/googleDriveAuth');
      
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          code: 'invalid-auth-code',
          state: 'test-session-123'
        }
      };

      mockOAuth2Client.getToken.mockRejectedValue(new Error('Invalid authorization code'));

      const result = await callback(event);

      expect(result.statusCode).toBe(302);
      expect(result.headers.Location).toContain('error=auth_failed');
    });

    it('should handle session update error', async () => {
      const { callback } = require('../../../../src/function/auth/googleDriveAuth');
      
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          code: 'auth-code-123',
          state: 'test-session-123'
        }
      };

      mockOAuth2Client.getToken.mockResolvedValue({
        tokens: {
          access_token: 'drive-access-token',
          refresh_token: 'drive-refresh-token'
        }
      });

      getSession.mockResolvedValue({
        sessionId: 'test-session-123'
      });

      updateSession.mockRejectedValue(new Error('Session update failed'));

      const result = await callback(event);

      expect(result.statusCode).toBe(302);
      expect(result.headers.Location).toContain('error=auth_failed');
    });

    it('should handle tokens without refresh token', async () => {
      const { callback } = require('../../../../src/function/auth/googleDriveAuth');
      
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
      const { createSessionCookie } = require('../../../../src/utils/cookieParser');
      createSessionCookie.mockReturnValue('session=test-session-123; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=2592000');

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
      const { callback } = require('../../../../src/function/auth/googleDriveAuth');
      
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
      const { createSessionCookie } = require('../../../../src/utils/cookieParser');
      createSessionCookie.mockReturnValue('session=test-session-123; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=2592000');

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

    it('should handle general error in callback', async () => {
      const { callback } = require('../../../../src/function/auth/googleDriveAuth');
      
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          code: 'auth-code-123',
          state: 'test-session-123'
        }
      };

      // Force an error by making getSession throw
      getSession.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await callback(event);

      expect(result.statusCode).toBe(302);
      expect(result.headers.Location).toContain('error=auth_failed');
    });
  });
});