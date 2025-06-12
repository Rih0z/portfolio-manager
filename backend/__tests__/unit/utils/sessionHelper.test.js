const { getSessionFromRequest } = require('../../../src/utils/sessionHelper');
const { getSession } = require('../../../src/services/googleAuthService');
const { parseCookies } = require('../../../src/utils/cookieParser');
const { verifyIdToken } = require('../../../src/utils/tokenManager');

jest.mock('../../../src/services/googleAuthService');
jest.mock('../../../src/utils/cookieParser');
jest.mock('../../../src/utils/tokenManager');

describe('sessionHelper', () => {
  let originalConsole;

  beforeEach(() => {
    originalConsole = console.log;
    console.log = jest.fn();
    console.error = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    console.log = originalConsole;
    jest.restoreAllMocks();
  });

  describe('getSessionFromRequest', () => {
    it('should return session from cookie when valid session ID is found', async () => {
      const mockSession = {
        googleId: '12345',
        email: 'test@example.com',
        name: 'Test User'
      };

      parseCookies.mockReturnValue({ session: 'session123' });
      getSession.mockResolvedValue(mockSession);

      const event = {
        headers: {
          Cookie: 'session=session123'
        }
      };

      const result = await getSessionFromRequest(event);

      expect(result).toEqual({
        success: true,
        session: mockSession,
        source: 'cookie'
      });
      expect(getSession).toHaveBeenCalledWith('session123');
    });

    it('should handle lowercase cookie header', async () => {
      const mockSession = {
        googleId: '12345',
        email: 'test@example.com'
      };

      parseCookies.mockReturnValue({ session: 'session123' });
      getSession.mockResolvedValue(mockSession);

      const event = {
        headers: {
          cookie: 'session=session123'
        }
      };

      const result = await getSessionFromRequest(event);

      expect(result.success).toBe(true);
      expect(result.source).toBe('cookie');
    });

    it('should handle uppercase cookie header', async () => {
      const mockSession = {
        googleId: '12345',
        email: 'test@example.com'
      };

      parseCookies.mockReturnValue({ session: 'session123' });
      getSession.mockResolvedValue(mockSession);

      const event = {
        headers: {
          COOKIE: 'session=session123'
        }
      };

      const result = await getSessionFromRequest(event);

      expect(result.success).toBe(true);
      expect(result.source).toBe('cookie');
    });

    it('should fallback to Bearer token when cookie session fails', async () => {
      const mockUserInfo = {
        sub: '12345',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/picture.jpg'
      };

      parseCookies.mockReturnValue({ session: 'invalid_session' });
      getSession.mockResolvedValue(null);
      verifyIdToken.mockResolvedValue(mockUserInfo);

      const event = {
        headers: {
          Cookie: 'session=invalid_session',
          Authorization: 'Bearer valid_jwt_token'
        }
      };

      const result = await getSessionFromRequest(event);

      expect(result).toEqual({
        success: true,
        session: {
          googleId: '12345',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/picture.jpg',
          requiresOAuth: true,
          isTemporary: true
        },
        source: 'bearer'
      });
    });

    it('should handle lowercase authorization header', async () => {
      const mockUserInfo = {
        sub: '12345',
        email: 'test@example.com',
        name: 'Test User'
      };

      parseCookies.mockReturnValue({});
      verifyIdToken.mockResolvedValue(mockUserInfo);

      const event = {
        headers: {
          authorization: 'Bearer valid_jwt_token'
        }
      };

      const result = await getSessionFromRequest(event);

      expect(result.success).toBe(true);
      expect(result.source).toBe('bearer');
    });

    it('should handle uppercase authorization header', async () => {
      const mockUserInfo = {
        sub: '12345',
        email: 'test@example.com',
        name: 'Test User'
      };

      parseCookies.mockReturnValue({});
      verifyIdToken.mockResolvedValue(mockUserInfo);

      const event = {
        headers: {
          AUTHORIZATION: 'Bearer valid_jwt_token'
        }
      };

      const result = await getSessionFromRequest(event);

      expect(result.success).toBe(true);
      expect(result.source).toBe('bearer');
    });

    it('should handle cookie session lookup error', async () => {
      parseCookies.mockReturnValue({ session: 'session123' });
      getSession.mockRejectedValue(new Error('Database error'));
      verifyIdToken.mockResolvedValue({
        sub: '12345',
        email: 'test@example.com'
      });

      const event = {
        headers: {
          Cookie: 'session=session123',
          Authorization: 'Bearer valid_jwt_token'
        }
      };

      const result = await getSessionFromRequest(event);

      expect(result.success).toBe(true);
      expect(result.source).toBe('bearer');
      expect(console.error).toHaveBeenCalledWith('Cookie session lookup error:', expect.any(Error));
    });

    it('should handle Bearer token validation error', async () => {
      parseCookies.mockReturnValue({});
      verifyIdToken.mockRejectedValue(new Error('Invalid token'));

      const event = {
        headers: {
          Authorization: 'Bearer invalid_token'
        }
      };

      const result = await getSessionFromRequest(event);

      expect(result).toEqual({
        success: false,
        error: 'NO_AUTH',
        message: '認証情報が見つかりません',
        details: {
          hasCookie: false,
          hasAuthHeader: true,
          cookieHeader: 'none',
          authHeaderType: 'Bearer'
        }
      });
      expect(console.error).toHaveBeenCalledWith('Bearer token validation error:', expect.any(Error));
    });

    it('should return failure when no authentication is found', async () => {
      parseCookies.mockReturnValue({});

      const event = {
        headers: {}
      };

      const result = await getSessionFromRequest(event);

      expect(result).toEqual({
        success: false,
        error: 'NO_AUTH',
        message: '認証情報が見つかりません',
        details: {
          hasCookie: false,
          hasAuthHeader: false,
          cookieHeader: 'none',
          authHeaderType: 'none'
        }
      });
    });

    it('should handle event without headers', async () => {
      parseCookies.mockReturnValue({});

      const event = {};

      const result = await getSessionFromRequest(event);

      expect(result.success).toBe(false);
      expect(result.error).toBe('NO_AUTH');
    });

    it('should handle non-Bearer authorization header', async () => {
      parseCookies.mockReturnValue({});

      const event = {
        headers: {
          Authorization: 'Basic dGVzdDp0ZXN0'
        }
      };

      const result = await getSessionFromRequest(event);

      expect(result).toEqual({
        success: false,
        error: 'NO_AUTH',
        message: '認証情報が見つかりません',
        details: {
          hasCookie: false,
          hasAuthHeader: true,
          cookieHeader: 'none',
          authHeaderType: 'Basic'
        }
      });
    });

    it('should log debug information about headers', async () => {
      parseCookies.mockReturnValue({});

      const event = {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'test-agent'
        }
      };

      await getSessionFromRequest(event);

      expect(console.log).toHaveBeenCalledWith('All headers received:', expect.any(String));
      expect(console.log).toHaveBeenCalledWith('Cookie header search:', expect.any(Object));
      expect(console.log).toHaveBeenCalledWith('Authorization header search:', expect.any(Object));
    });

    it('should mask session ID in logs', async () => {
      const mockSession = {
        googleId: '12345',
        email: 'test@example.com'
      };

      parseCookies.mockReturnValue({ session: 'very_long_session_id_12345' });
      getSession.mockResolvedValue(mockSession);

      const event = {
        headers: {
          Cookie: 'session=very_long_session_id_12345'
        }
      };

      await getSessionFromRequest(event);

      expect(console.log).toHaveBeenCalledWith('Session ID found in cookie:', 'very_lon...');
    });

    it('should handle empty cookie value', async () => {
      parseCookies.mockReturnValue({ session: '' });

      const event = {
        headers: {
          Cookie: 'session='
        }
      };

      const result = await getSessionFromRequest(event);

      expect(result.success).toBe(false);
      expect(getSession).not.toHaveBeenCalled();
    });

    it('should handle null session returned from getSession', async () => {
      parseCookies.mockReturnValue({ session: 'session123' });
      getSession.mockResolvedValue(null);

      const event = {
        headers: {
          Cookie: 'session=session123'
        }
      };

      const result = await getSessionFromRequest(event);

      expect(result.success).toBe(false);
      expect(result.error).toBe('NO_AUTH');
    });
  });
});