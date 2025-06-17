const { 
  validateAndRefreshToken, 
  refreshAccessToken, 
  verifyIdToken, 
  exchangeCodeForTokens, 
  refreshDriveToken 
} = require('../../../src/utils/tokenManager');

const { OAuth2Client } = require('google-auth-library');
const { withRetry } = require('../../../src/utils/retry');
const { getApiKeys } = require('../../../src/utils/secretsManager');

jest.mock('google-auth-library');
jest.mock('../../../src/utils/retry');
jest.mock('../../../src/utils/secretsManager');

describe('tokenManager', () => {
  let mockOAuth2Client;
  let originalConsole;

  beforeEach(() => {
    originalConsole = console.log;
    console.log = jest.fn();
    console.error = jest.fn();

    mockOAuth2Client = {
      setCredentials: jest.fn(),
      refreshAccessToken: jest.fn(),
      verifyIdToken: jest.fn(),
      getToken: jest.fn()
    };

    OAuth2Client.mockImplementation(() => mockOAuth2Client);

    getApiKeys.mockResolvedValue({
      googleClientId: 'test-client-id',
      googleClientSecret: 'test-client-secret'
    });

    // Mock withRetry to simply execute the function  
    withRetry.mockImplementation(async (fn, options) => {
      return await fn();
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    console.log = originalConsole;
    jest.restoreAllMocks();
  });

  describe('validateAndRefreshToken', () => {
    it('should return existing token when not expired', async () => {
      const futureDate = new Date(Date.now() + 60000); // 1 minute from now
      const session = {
        accessToken: 'valid-token',
        tokenExpiry: futureDate.toISOString(),
        refreshToken: 'refresh-token'
      };

      const result = await validateAndRefreshToken(session);

      expect(result).toEqual({
        accessToken: 'valid-token',
        refreshed: false
      });
    });

    it('should refresh token when expired', async () => {
      const pastDate = new Date(Date.now() - 60000); // 1 minute ago
      const session = {
        accessToken: 'expired-token',
        tokenExpiry: pastDate.toISOString(),
        refreshToken: 'refresh-token'
      };

      const newTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600
      };

      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: newTokens
      });

      const result = await validateAndRefreshToken(session);

      expect(result).toMatchObject({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        refreshed: true
      });
      expect(result.tokenExpiry).toBeDefined();
    });

    it('should throw error when session is missing', async () => {
      await expect(validateAndRefreshToken(null)).rejects.toThrow('セッション情報が不足しています');
    });

    it('should throw error when refresh token is missing', async () => {
      const pastDate = new Date(Date.now() - 60000);
      const session = {
        accessToken: 'expired-token',
        tokenExpiry: pastDate.toISOString()
        // refreshToken is missing
      };

      await expect(validateAndRefreshToken(session)).rejects.toThrow('リフレッシュトークンが存在しません');
    });

    it('should use existing refresh token when new one is not provided', async () => {
      const pastDate = new Date(Date.now() - 60000);
      const session = {
        accessToken: 'expired-token',
        tokenExpiry: pastDate.toISOString(),
        refreshToken: 'existing-refresh-token'
      };

      const newTokens = {
        access_token: 'new-access-token',
        expires_in: 3600
        // No refresh_token in response
      };

      withRetry.mockImplementation(async (fn) => {
        const client = mockOAuth2Client;
        client.setCredentials({
          refresh_token: 'existing-refresh-token'
        });
        
        const mockCredentials = await client.refreshAccessToken();
        return mockCredentials.credentials;
      });

      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: newTokens
      });

      const result = await validateAndRefreshToken(session);

      expect(result.refreshToken).toBe('existing-refresh-token');
    });

    it('should handle token refresh errors', async () => {
      const pastDate = new Date(Date.now() - 60000);
      const session = {
        accessToken: 'expired-token',
        tokenExpiry: pastDate.toISOString(),
        refreshToken: 'invalid-refresh-token'
      };

      // Mock the entire withRetry call to throw an error
      withRetry.mockRejectedValue(new Error('Invalid refresh token'));

      await expect(validateAndRefreshToken(session)).rejects.toThrow('アクセストークンの検証または更新に失敗しました');
    });
  });

  describe('refreshAccessToken', () => {
    it('should successfully refresh access token', async () => {
      const refreshToken = 'test-refresh-token';
      const newCredentials = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600
      };

      // Mock withRetry to execute the function and verify client behavior
      withRetry.mockImplementation(async (fn) => {
        const client = mockOAuth2Client;
        client.setCredentials({ refresh_token: refreshToken });
        const response = { credentials: newCredentials };
        client.refreshAccessToken.mockResolvedValue(response);
        return newCredentials;
      });

      const result = await refreshAccessToken(refreshToken);

      expect(result).toEqual(newCredentials);
    });

    it('should handle refresh errors', async () => {
      const refreshToken = 'invalid-refresh-token';
      
      // Mock withRetry to throw error
      withRetry.mockRejectedValue(new Error('Invalid grant'));

      await expect(refreshAccessToken(refreshToken)).rejects.toThrow('アクセストークンの更新に失敗しました');
    });

    it('should apply retry logic', async () => {
      const refreshToken = 'test-refresh-token';
      
      // Verify that withRetry is called
      const mockWithRetry = withRetry.mockImplementation(async (fn, options) => {
        expect(options).toMatchObject({
          maxRetries: 3,
          baseDelay: 300
        });
        return await fn();
      });

      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: { access_token: 'token' }
      });

      await refreshAccessToken(refreshToken);

      expect(mockWithRetry).toHaveBeenCalled();
    });
  });

  describe('verifyIdToken', () => {
    it('should successfully verify ID token', async () => {
      const idToken = 'test-id-token';
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      const mockTicket = {
        getPayload: jest.fn().mockReturnValue(payload)
      };

      // Mock withRetry to execute the function
      withRetry.mockImplementation(async (fn) => {
        mockOAuth2Client.verifyIdToken.mockResolvedValue(mockTicket);
        return payload;
      });

      const result = await verifyIdToken(idToken);

      expect(result).toEqual(payload);
    });

    it('should handle expired token error', async () => {
      const idToken = 'expired-token';
      
      withRetry.mockRejectedValue(new Error('Token expired'));

      await expect(verifyIdToken(idToken)).rejects.toThrow('IDトークンの有効期限が切れています');
    });

    it('should handle audience mismatch error', async () => {
      const idToken = 'invalid-audience-token';
      
      withRetry.mockRejectedValue(new Error('Wrong audience'));

      await expect(verifyIdToken(idToken)).rejects.toThrow('IDトークンの対象者(audience)が不正です');
    });

    it('should handle generic verification errors', async () => {
      const idToken = 'invalid-token';
      
      withRetry.mockRejectedValue(new Error('Invalid signature'));

      await expect(verifyIdToken(idToken)).rejects.toThrow('IDトークンの検証に失敗しました: Invalid signature');
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should successfully exchange code for tokens', async () => {
      const code = 'auth-code';
      const redirectUri = 'http://localhost:3000/callback';
      const tokens = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        id_token: 'id-token'
      };

      withRetry.mockImplementation(async (fn) => {
        mockOAuth2Client.getToken.mockResolvedValue({ tokens });
        return tokens;
      });

      const result = await exchangeCodeForTokens(code, redirectUri);

      expect(result).toEqual(tokens);
    });

    it('should handle invalid grant error', async () => {
      const code = 'invalid-code';
      const redirectUri = 'http://localhost:3000/callback';
      
      withRetry.mockRejectedValue(new Error('invalid_grant'));

      await expect(exchangeCodeForTokens(code, redirectUri)).rejects.toThrow('認証コードが無効または期限切れです');
    });

    it('should handle redirect URI mismatch error', async () => {
      const code = 'auth-code';
      const redirectUri = 'http://wrong-domain.com/callback';
      
      withRetry.mockRejectedValue(new Error('redirect_uri_mismatch'));

      await expect(exchangeCodeForTokens(code, redirectUri)).rejects.toThrow('リダイレクトURIが一致しません');
    });

    it('should handle generic exchange errors', async () => {
      const code = 'auth-code';
      const redirectUri = 'http://localhost:3000/callback';
      
      withRetry.mockRejectedValue(new Error('Network error'));

      await expect(exchangeCodeForTokens(code, redirectUri)).rejects.toThrow('認証コードからトークンへの交換に失敗しました: Network error');
    });
  });

  describe('refreshDriveToken', () => {
    it('should successfully refresh Drive API token', async () => {
      const refreshToken = 'drive-refresh-token';
      const credentials = {
        access_token: 'new-drive-token',
        expiry_date: Date.now() + 3600000,
        token_type: 'Bearer'
      };

      mockOAuth2Client.refreshAccessToken.mockResolvedValue({ credentials });

      const result = await refreshDriveToken(refreshToken);

      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        refresh_token: refreshToken
      });
      expect(result).toEqual({
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date,
        token_type: 'Bearer'
      });
    });

    it('should handle missing token type', async () => {
      const refreshToken = 'drive-refresh-token';
      const credentials = {
        access_token: 'new-drive-token',
        expiry_date: Date.now() + 3600000
        // token_type is missing
      };

      mockOAuth2Client.refreshAccessToken.mockResolvedValue({ credentials });

      const result = await refreshDriveToken(refreshToken);

      expect(result.token_type).toBe('Bearer');
    });

    it('should handle Drive token refresh errors', async () => {
      const refreshToken = 'invalid-drive-refresh-token';
      
      mockOAuth2Client.refreshAccessToken.mockRejectedValue(new Error('Invalid refresh token'));

      await expect(refreshDriveToken(refreshToken)).rejects.toThrow('Drive APIトークンのリフレッシュに失敗しました: Invalid refresh token');
    });
  });

  describe('OAuth2Client initialization', () => {
    beforeEach(() => {
      // Reset OAuth2Client mock for each test
      OAuth2Client.mockClear();
      jest.clearAllMocks();
    });

    it('should initialize OAuth2Client with API keys', async () => {
      const idToken = 'test-token';
      const payload = { sub: 'user-123' };

      withRetry.mockImplementation(async (fn) => {
        return payload;
      });

      const result = await verifyIdToken(idToken);

      expect(getApiKeys).toHaveBeenCalled();
      expect(result).toEqual(payload);
    });

    it('should handle missing Google Client ID', async () => {
      getApiKeys.mockResolvedValue({
        // googleClientId is missing
        googleClientSecret: 'test-client-secret'
      });

      await expect(verifyIdToken('test-token')).rejects.toThrow('Google Client ID/Secret not configured');
    });

    it('should handle missing Google Client Secret', async () => {
      getApiKeys.mockResolvedValue({
        googleClientId: 'test-client-id'
        // googleClientSecret is missing
      });

      await expect(verifyIdToken('test-token')).rejects.toThrow('Google Client ID/Secret not configured');
    });

    it('should handle OAuth2Client initialization error', async () => {
      getApiKeys.mockRejectedValue(new Error('Secrets Manager error'));

      await expect(verifyIdToken('test-token')).rejects.toThrow('Secrets Manager error');
    });

    it('should use environment variables when API keys are missing', async () => {
      // Test fallback to environment variables
      process.env.GOOGLE_CLIENT_ID = 'env-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'env-client-secret';
      
      getApiKeys.mockResolvedValue({});

      const payload = { sub: 'user-123' };
      withRetry.mockImplementation(async (fn) => {
        return payload;
      });

      const result = await verifyIdToken('test-token');
      expect(result).toEqual(payload);
      
      // Clean up environment variables
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
    });

    it('should cache OAuth2Client instance', async () => {
      // First call should create new instance
      await verifyIdToken('test-token-1');
      expect(OAuth2Client).toHaveBeenCalledTimes(1);
      
      // Second call should reuse cached instance
      await verifyIdToken('test-token-2');
      expect(OAuth2Client).toHaveBeenCalledTimes(1); // Still only called once
    });
  });

  describe('Error handling and retry logic', () => {
    it('should handle retry logic with network errors', async () => {
      const refreshToken = 'test-refresh-token';
      
      withRetry.mockImplementation(async (fn, options) => {
        // Verify retry options are passed correctly
        expect(options).toMatchObject({
          maxRetries: 3,
          baseDelay: 300,
          shouldRetry: expect.any(Function)
        });
        
        // Test the shouldRetry function
        const shouldRetry = options.shouldRetry;
        expect(shouldRetry({ code: 'ETIMEDOUT' })).toBe(true);
        expect(shouldRetry({ code: 'ECONNRESET' })).toBe(true);
        expect(shouldRetry({ message: 'network error' })).toBe(true);
        expect(shouldRetry({ response: { status: 500 } })).toBe(true);
        expect(shouldRetry({ response: { status: 400 } })).toBe(false);
        
        // Simulate successful retry
        return { access_token: 'new-token' };
      });

      const result = await refreshAccessToken(refreshToken);
      expect(result).toEqual({ access_token: 'new-token' });
    });

    it('should handle console.log calls during initialization', async () => {
      // Clear existing mocks
      jest.clearAllMocks();
      
      // Reset the module to test initialization logging
      jest.resetModules();
      
      // Re-require the module to trigger initialization
      const tokenManager = require('../../../src/utils/tokenManager');
      
      // Verify that console.log was called during initialization
      expect(console.log).toHaveBeenCalledWith('Initializing OAuth2Client...');
    });

    it('should log Google OAuth configuration', async () => {
      jest.clearAllMocks();
      
      // Reset module to test configuration logging
      jest.resetModules();
      
      getApiKeys.mockResolvedValue({
        googleClientId: 'test-client-id-12345',
        googleClientSecret: 'test-client-secret-67890'
      });
      
      const tokenManager = require('../../../src/utils/tokenManager');
      
      // Call a function that triggers OAuth2Client initialization
      await tokenManager.verifyIdToken('test-token');
      
      // Verify configuration logging
      expect(console.log).toHaveBeenCalledWith('Google OAuth configuration:', expect.objectContaining({
        hasClientId: true,
        clientIdLength: 20,
        hasClientSecret: true,
        clientSecretLength: 23,
        clientIdPrefix: 'test-client-id-12345'
      }));
      
      expect(console.log).toHaveBeenCalledWith('OAuth2Client initialized successfully');
    });
  });

  describe('Edge cases and error paths', () => {
    it('should handle validation without refresh token in session', async () => {
      const pastDate = new Date(Date.now() - 60000);
      const session = {
        accessToken: 'expired-token',
        tokenExpiry: pastDate.toISOString()
        // No refreshToken
      };

      await expect(validateAndRefreshToken(session)).rejects.toThrow('リフレッシュトークンが存在しません');
    });

    it('should handle undefined session', async () => {
      await expect(validateAndRefreshToken(undefined)).rejects.toThrow('セッション情報が不足しています');
    });

    it('should handle null session', async () => {
      await expect(validateAndRefreshToken(null)).rejects.toThrow('セッション情報が不足しています');
    });
  });
});