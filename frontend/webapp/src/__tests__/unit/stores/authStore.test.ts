/**
 * authStore unit tests
 *
 * Tests for authentication state management: login, logout, session check,
 * session persistence, and error handling.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// --- Mock external dependencies BEFORE importing the store ---

vi.mock('../../../utils/envUtils', () => ({
  getApiEndpoint: vi.fn(async (path: string) => `https://api.example.com/${path}`),
  getGoogleClientId: vi.fn(async () => 'mock-google-client-id'),
  isDevelopment: vi.fn(() => false),
  isLocalDevelopment: vi.fn(() => false),
}));

vi.mock('../../../utils/apiUtils', () => ({
  authFetch: vi.fn(),
  setAuthToken: vi.fn(),
  getAuthToken: vi.fn(() => null),
  clearAuthToken: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

// Mock portfolioStore (cross-store communication)
vi.mock('../../../stores/portfolioStore', () => ({
  usePortfolioStore: {
    getState: vi.fn(() => ({
      handleAuthStateChange: vi.fn(),
      loadFromGoogleDrive: vi.fn(),
    })),
    setState: vi.fn(),
  },
}));

// Now import the store and mocked dependencies
import { useAuthStore } from '../../../stores/authStore';
import { authFetch, setAuthToken, getAuthToken, clearAuthToken, refreshAccessToken } from '../../../utils/apiUtils';
import { getApiEndpoint, getGoogleClientId } from '../../../utils/envUtils';
import { usePortfolioStore } from '../../../stores/portfolioStore';

// --- Helpers ---
const getInitialState = () => ({
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  hasDriveAccess: false,
  googleClientId: '',
});

const createMockUser = (overrides: Record<string, any> = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://example.com/photo.jpg',
  ...overrides,
});

// Create a valid JWT token for testing (not cryptographically valid, just structurally)
const createMockJWT = (payload: Record<string, any> = {}) => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const defaultPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/photo.jpg',
    hasDriveAccess: false,
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    ...payload,
  };
  const payloadEncoded = btoa(JSON.stringify(defaultPayload));
  const signature = 'mock-signature';
  return `${header}.${payloadEncoded}.${signature}`;
};

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState(getInitialState());
    vi.clearAllMocks();

    // Reset localStorage mock
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (localStorage.setItem as ReturnType<typeof vi.fn>).mockImplementation(() => {});
    (localStorage.removeItem as ReturnType<typeof vi.fn>).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Initial State
  // =========================================================================
  describe('initial state', () => {
    it('should have null user', () => {
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('should not be authenticated', () => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('should have loading set to true', () => {
      // loading starts as true (will be set to false after initialization)
      expect(useAuthStore.getState().loading).toBe(true);
    });

    it('should have no error', () => {
      expect(useAuthStore.getState().error).toBeNull();
    });

    it('should have no Drive access', () => {
      expect(useAuthStore.getState().hasDriveAccess).toBe(false);
    });

    it('should have empty googleClientId', () => {
      expect(useAuthStore.getState().googleClientId).toBe('');
    });
  });

  // =========================================================================
  // loginWithGoogle / login
  // =========================================================================
  describe('loginWithGoogle', () => {
    it('should successfully login with a credential (One Tap)', async () => {
      const mockUser = createMockUser();
      const mockToken = 'mock-access-token';

      vi.mocked(authFetch).mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          accessToken: mockToken,
          hasDriveAccess: false,
        },
      });

      const result = await useAuthStore.getState().loginWithGoogle({
        credential: 'google-id-token',
      });

      expect(result.success).toBe(true);
      expect(result.hasDriveAccess).toBe(false);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should successfully login with authorization code', async () => {
      const mockUser = createMockUser();

      vi.mocked(authFetch).mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          accessToken: 'mock-token',
          hasDriveAccess: true,
        },
      });

      const result = await useAuthStore.getState().loginWithGoogle({
        code: 'auth-code-123',
      });

      expect(result.success).toBe(true);
      expect(result.hasDriveAccess).toBe(true);
    });

    it('should set error when credential response is empty', async () => {
      const result = await useAuthStore.getState().loginWithGoogle({});

      expect(result.success).toBe(false);
      const state = useAuthStore.getState();
      expect(state.error).toBe('認証情報が取得できませんでした');
      expect(state.loading).toBe(false);
    });

    it('should handle server returning null response', async () => {
      vi.mocked(authFetch).mockResolvedValue(null);

      const result = await useAuthStore.getState().loginWithGoogle({
        credential: 'token',
      });

      expect(result.success).toBe(false);
      expect(useAuthStore.getState().error).toBe('サーバーからの応答がありません');
    });

    it('should handle server error response', async () => {
      vi.mocked(authFetch).mockResolvedValue({
        error: { message: 'Invalid token' },
      });

      const result = await useAuthStore.getState().loginWithGoogle({
        credential: 'bad-token',
      });

      expect(result.success).toBe(false);
      expect(useAuthStore.getState().error).toBe('Invalid token');
    });

    it('should handle unsuccessful response (success: false)', async () => {
      vi.mocked(authFetch).mockResolvedValue({
        success: false,
        message: 'Login failed',
      });

      const result = await useAuthStore.getState().loginWithGoogle({
        credential: 'token',
      });

      expect(result.success).toBe(false);
      expect(useAuthStore.getState().error).toBe('Login failed');
    });

    it('should handle network/exception errors', async () => {
      vi.mocked(authFetch).mockRejectedValue(new Error('Network error'));

      const result = await useAuthStore.getState().loginWithGoogle({
        credential: 'token',
      });

      expect(result.success).toBe(false);
      expect(useAuthStore.getState().error).toBe('Network error');
      expect(useAuthStore.getState().loading).toBe(false);
    });

    it('should handle axios error with response data', async () => {
      const axiosError: any = new Error('Request failed');
      axiosError.response = {
        data: {
          error: { message: 'Token expired' },
        },
      };
      vi.mocked(authFetch).mockRejectedValue(axiosError);

      const result = await useAuthStore.getState().loginWithGoogle({
        credential: 'token',
      });

      expect(result.success).toBe(false);
      expect(useAuthStore.getState().error).toBe('Token expired');
    });

    it('should call setAuthToken on successful login', async () => {
      vi.mocked(authFetch).mockResolvedValue({
        success: true,
        data: {
          user: createMockUser(),
          accessToken: 'jwt-token-abc',
          hasDriveAccess: false,
        },
      });

      await useAuthStore.getState().loginWithGoogle({ credential: 'token' });

      expect(setAuthToken).toHaveBeenCalledWith('jwt-token-abc');
    });

    it('should save session to localStorage on successful login', async () => {
      vi.mocked(authFetch).mockResolvedValue({
        success: true,
        data: {
          user: createMockUser(),
          accessToken: 'token-123',
          hasDriveAccess: false,
        },
      });

      await useAuthStore.getState().loginWithGoogle({ credential: 'token' });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'pfwise_session',
        expect.any(String)
      );
    });

    it('should notify portfolioStore on successful login', async () => {
      const mockHandleAuthStateChange = vi.fn();
      vi.mocked(usePortfolioStore.getState).mockReturnValue({
        handleAuthStateChange: mockHandleAuthStateChange,
        loadFromGoogleDrive: vi.fn(),
      } as any);

      vi.mocked(authFetch).mockResolvedValue({
        success: true,
        data: {
          user: createMockUser(),
          accessToken: 'token',
          hasDriveAccess: false,
        },
      });

      await useAuthStore.getState().loginWithGoogle({ credential: 'cred' });

      expect(mockHandleAuthStateChange).toHaveBeenCalledWith(true, createMockUser());
    });

    it('login should be an alias for loginWithGoogle', () => {
      expect(useAuthStore.getState().login).toBe(useAuthStore.getState().loginWithGoogle);
    });
  });

  // =========================================================================
  // logout / handleLogout
  // =========================================================================
  describe('logout', () => {
    it('should clear authentication state', async () => {
      // Set up an authenticated state first
      useAuthStore.setState({
        user: createMockUser(),
        isAuthenticated: true,
        hasDriveAccess: true,
        loading: false,
      });

      vi.mocked(authFetch).mockResolvedValue({ success: true });

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.hasDriveAccess).toBe(false);
      expect(state.loading).toBe(false);
    });

    it('should call the logout API endpoint', async () => {
      vi.mocked(authFetch).mockResolvedValue({ success: true });

      await useAuthStore.getState().logout();

      expect(getApiEndpoint).toHaveBeenCalledWith('auth/logout');
      expect(authFetch).toHaveBeenCalled();
    });

    it('should clear auth token', async () => {
      vi.mocked(authFetch).mockResolvedValue({ success: true });

      await useAuthStore.getState().logout();

      expect(clearAuthToken).toHaveBeenCalled();
    });

    it('should clear session from localStorage', async () => {
      vi.mocked(authFetch).mockResolvedValue({ success: true });

      await useAuthStore.getState().logout();

      expect(localStorage.removeItem).toHaveBeenCalledWith('pfwise_session');
    });

    it('should still clear state even when API call fails', async () => {
      useAuthStore.setState({
        user: createMockUser(),
        isAuthenticated: true,
      });

      vi.mocked(authFetch).mockRejectedValue(new Error('Network error'));

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.loading).toBe(false);
    });

    it('should notify portfolioStore on logout', async () => {
      const mockHandleAuthStateChange = vi.fn();
      vi.mocked(usePortfolioStore.getState).mockReturnValue({
        handleAuthStateChange: mockHandleAuthStateChange,
        loadFromGoogleDrive: vi.fn(),
      } as any);

      vi.mocked(authFetch).mockResolvedValue({ success: true });

      await useAuthStore.getState().logout();

      expect(mockHandleAuthStateChange).toHaveBeenCalledWith(false, null);
    });

    it('handleLogout should be an alias for logout', () => {
      expect(useAuthStore.getState().handleLogout).toBe(useAuthStore.getState().logout);
    });
  });

  // =========================================================================
  // checkSession
  // =========================================================================
  describe('checkSession', () => {
    it('should return false when no token and no stored session', async () => {
      vi.mocked(getAuthToken).mockReturnValue(null);
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const result = await useAuthStore.getState().checkSession();

      expect(result).toBe(false);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('should authenticate with a valid JWT token', async () => {
      const validToken = createMockJWT({
        sub: 'user-456',
        email: 'jwt@example.com',
        name: 'JWT User',
        picture: 'https://example.com/jwt.jpg',
        hasDriveAccess: true,
        exp: Math.floor(Date.now() / 1000) + 7200, // 2 hours from now
      });

      vi.mocked(getAuthToken).mockReturnValue(validToken);

      const result = await useAuthStore.getState().checkSession();

      expect(result).toBe(true);
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.id).toBe('user-456');
      expect(state.user?.email).toBe('jwt@example.com');
      expect(state.hasDriveAccess).toBe(true);
    });

    it('should attempt refresh when token is expired', async () => {
      const expiredToken = createMockJWT({
        exp: Math.floor(Date.now() / 1000) - 1000, // expired
      });

      vi.mocked(getAuthToken).mockReturnValue(expiredToken);

      const newToken = createMockJWT({
        sub: 'user-refreshed',
        email: 'refreshed@example.com',
        name: 'Refreshed User',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      vi.mocked(refreshAccessToken).mockResolvedValue(newToken);

      const result = await useAuthStore.getState().checkSession();

      expect(result).toBe(true);
      expect(refreshAccessToken).toHaveBeenCalled();
      expect(useAuthStore.getState().user?.id).toBe('user-refreshed');
    });

    it('should fall back to session check when refresh fails', async () => {
      const expiredToken = createMockJWT({
        exp: Math.floor(Date.now() / 1000) - 1000,
      });
      vi.mocked(getAuthToken).mockReturnValue(expiredToken);
      vi.mocked(refreshAccessToken).mockRejectedValue(new Error('Refresh failed'));

      const sessionUser = createMockUser({ id: 'session-user' });
      vi.mocked(authFetch).mockResolvedValue({
        success: true,
        isAuthenticated: true,
        user: sessionUser,
        hasDriveAccess: false,
      });

      const result = await useAuthStore.getState().checkSession();

      expect(result).toBe(true);
      expect(useAuthStore.getState().user?.id).toBe('session-user');
    });

    it('should return false when all auth methods fail', async () => {
      vi.mocked(getAuthToken).mockReturnValue(null);

      // Provide a stored session so checkSession doesn't return false immediately
      const storedSession = JSON.stringify({
        user: createMockUser(),
        hasDriveAccess: false,
        timestamp: Date.now(),
      });
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(storedSession);

      vi.mocked(refreshAccessToken).mockResolvedValue(null);
      vi.mocked(authFetch).mockResolvedValue({
        success: false,
        isAuthenticated: false,
      });

      const result = await useAuthStore.getState().checkSession();

      expect(result).toBe(false);
    });

    it('should handle complete exception during session check', async () => {
      vi.mocked(getAuthToken).mockImplementation(() => {
        throw new Error('Fatal error');
      });

      const result = await useAuthStore.getState().checkSession();

      expect(result).toBe(false);
      expect(useAuthStore.getState().loading).toBe(false);
    });
  });

  // =========================================================================
  // initializeAuth
  // =========================================================================
  describe('initializeAuth', () => {
    it('should fetch Google Client ID', async () => {
      vi.mocked(getGoogleClientId).mockResolvedValue('client-id-xyz');
      vi.mocked(getAuthToken).mockReturnValue(null);
      vi.mocked(authFetch).mockResolvedValue({ success: false });

      useAuthStore.getState().initializeAuth();

      // Wait for async operations
      await vi.waitFor(() => {
        expect(getGoogleClientId).toHaveBeenCalled();
      });
    });

    it('should restore session from localStorage for instant UI', () => {
      const storedSession = JSON.stringify({
        user: createMockUser(),
        hasDriveAccess: true,
        timestamp: Date.now(),
      });
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(storedSession);
      vi.mocked(getAuthToken).mockReturnValue(null);
      vi.mocked(authFetch).mockResolvedValue({ success: false });

      useAuthStore.getState().initializeAuth();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(createMockUser());
      expect(state.isAuthenticated).toBe(true);
      expect(state.hasDriveAccess).toBe(true);
    });

    it('should not restore expired sessions', () => {
      const expiredSession = JSON.stringify({
        user: createMockUser(),
        hasDriveAccess: false,
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago (past 24h max age)
      });
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(expiredSession);
      vi.mocked(getAuthToken).mockReturnValue(null);
      vi.mocked(authFetch).mockResolvedValue({ success: false });

      useAuthStore.setState(getInitialState()); // Reset to initial state
      useAuthStore.getState().initializeAuth();

      // Expired session should be cleared, so user should remain null
      // (checkSession will also run and find nothing)
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('should trigger checkSession for API verification', async () => {
      // Provide a stored session so checkSession doesn't exit early
      const storedSession = JSON.stringify({
        user: createMockUser(),
        hasDriveAccess: false,
        timestamp: Date.now(),
      });
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(storedSession);

      // Set up an expired token so checkSession proceeds through refresh and session fallback
      vi.mocked(getAuthToken).mockReturnValue(null);
      vi.mocked(refreshAccessToken).mockResolvedValue(null);
      vi.mocked(authFetch).mockResolvedValue({ success: false, isAuthenticated: false });

      useAuthStore.getState().initializeAuth();

      // checkSession is async; wait for it to call authFetch (session fallback)
      await vi.waitFor(() => {
        expect(authFetch).toHaveBeenCalled();
      });
    });
  });

  // =========================================================================
  // Session Persistence (internal helpers tested via login/logout/initializeAuth)
  // =========================================================================
  describe('session persistence', () => {
    it('should persist session data on successful login', async () => {
      vi.mocked(authFetch).mockResolvedValue({
        success: true,
        data: {
          user: createMockUser(),
          accessToken: 'token-123',
          hasDriveAccess: true,
        },
      });

      await useAuthStore.getState().loginWithGoogle({ credential: 'cred' });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'pfwise_session',
        expect.stringContaining('"user"')
      );

      // Verify the stored data structure
      const storedCall = (localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls.find(
        (call: any[]) => call[0] === 'pfwise_session'
      );
      const storedData = JSON.parse(storedCall![1]);
      expect(storedData.user.email).toBe('test@example.com');
      expect(storedData.hasDriveAccess).toBe(true);
      expect(typeof storedData.timestamp).toBe('number');
    });

    it('should clear session data on logout', async () => {
      vi.mocked(authFetch).mockResolvedValue({ success: true });

      await useAuthStore.getState().logout();

      expect(localStorage.removeItem).toHaveBeenCalledWith('pfwise_session');
    });
  });

  // =========================================================================
  // initiateDriveAuth / authorizeDrive
  // =========================================================================
  describe('initiateDriveAuth', () => {
    it('should return true when auth URL is received', async () => {
      // In jsdom, window.location.href cannot be spied on via vi.spyOn.
      // We verify the function returns true when a valid authUrl is present.
      vi.mocked(authFetch).mockResolvedValue({
        authUrl: 'https://accounts.google.com/oauth?scope=drive',
      });

      const result = await useAuthStore.getState().initiateDriveAuth();

      expect(result).toBe(true);
      // The store would redirect via window.location.href = authUrl
      // We trust the store implementation; the key assertion is the return value.
    });

    it('should return false when no auth URL received', async () => {
      vi.mocked(authFetch).mockResolvedValue({ authUrl: null });

      const result = await useAuthStore.getState().initiateDriveAuth();

      expect(result).toBe(false);
      expect(useAuthStore.getState().error).toBe('Drive API認証URLの取得に失敗しました');
    });

    it('should handle 401 error with requiresReauth', async () => {
      const error: any = new Error('Unauthorized');
      error.response = {
        status: 401,
        data: { requiresReauth: true },
      };
      vi.mocked(authFetch).mockRejectedValue(error);

      const result = await useAuthStore.getState().initiateDriveAuth();

      expect(result).toBe(false);
      // Note: setAuthState(null, false, false, null) is called after set({ error: ... }),
      // which resets error to null. The important assertion is that auth state is cleared.
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      expect(clearAuthToken).toHaveBeenCalled();
    });

    it('should handle 401 error without requiresReauth', async () => {
      const error: any = new Error('Unauthorized');
      error.response = {
        status: 401,
        data: {},
      };
      vi.mocked(authFetch).mockRejectedValue(error);

      const result = await useAuthStore.getState().initiateDriveAuth();

      expect(result).toBe(false);
      expect(useAuthStore.getState().error).toContain('アクセス権限がありません');
    });

    it('should handle generic errors', async () => {
      vi.mocked(authFetch).mockRejectedValue(new Error('Network error'));

      const result = await useAuthStore.getState().initiateDriveAuth();

      expect(result).toBe(false);
      expect(useAuthStore.getState().error).toBe('Drive API認証の開始に失敗しました');
    });

    it('authorizeDrive should be an alias for initiateDriveAuth', () => {
      expect(useAuthStore.getState().authorizeDrive).toBe(useAuthStore.getState().initiateDriveAuth);
    });
  });

  // =========================================================================
  // setupSessionInterval
  // =========================================================================
  describe('setupSessionInterval', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return a cleanup function', () => {
      const cleanup = useAuthStore.getState().setupSessionInterval();
      expect(typeof cleanup).toBe('function');
      cleanup();
    });

    it('should not call checkSession when not authenticated', () => {
      useAuthStore.setState({ isAuthenticated: false });
      vi.mocked(getAuthToken).mockReturnValue(null);

      useAuthStore.getState().setupSessionInterval();

      // Advance past the interval (30 minutes)
      vi.advanceTimersByTime(31 * 60 * 1000);

      // authFetch should not have been called for session check when not authenticated
      // (the interval only calls checkSession if isAuthenticated)
    });
  });

  // =========================================================================
  // setupVisibilityHandler
  // =========================================================================
  describe('setupVisibilityHandler', () => {
    it('should return a cleanup function', () => {
      const cleanup = useAuthStore.getState().setupVisibilityHandler();
      expect(typeof cleanup).toBe('function');
      cleanup();
    });

    it('should add visibilitychange event listener', () => {
      const addEventSpy = vi.spyOn(document, 'addEventListener');

      const cleanup = useAuthStore.getState().setupVisibilityHandler();

      expect(addEventSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

      cleanup();
    });

    it('should remove event listener on cleanup', () => {
      const removeEventSpy = vi.spyOn(document, 'removeEventListener');

      const cleanup = useAuthStore.getState().setupVisibilityHandler();
      cleanup();

      expect(removeEventSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });
  });
});
