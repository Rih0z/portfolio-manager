/**
 * AuthStore - 認証状態管理
 *
 * Zustand store for authentication state including Google OAuth,
 * JWT token management, session persistence, and Drive authorization.
 * Replaces AuthContext.tsx with direct store access.
 */
import { create } from 'zustand';
import { getApiEndpoint, getGoogleClientId } from '../utils/envUtils';
import { authFetch, setAuthToken, getAuthToken, clearAuthToken, refreshAccessToken } from '../utils/apiUtils';
import { trackEvent, AnalyticsEvents } from '../utils/analytics';
import { usePortfolioStore } from './portfolioStore';
import { useSubscriptionStore } from './subscriptionStore';

interface UserData {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface SessionData {
  user: UserData;
  hasDriveAccess: boolean;
  timestamp: number;
}

interface LoginResult {
  success: boolean;
  hasDriveAccess: boolean;
}

interface AuthState {
  user: UserData | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  hasDriveAccess: boolean;
  googleClientId: string;

  // Actions
  loginWithGoogle: (credentialResponse: any) => Promise<LoginResult>;
  logout: () => Promise<void>;
  checkSession: () => Promise<boolean>;
  initiateDriveAuth: () => Promise<boolean>;
  initializeAuth: () => void;
  setupSessionInterval: () => () => void;
  setupVisibilityHandler: () => () => void;

  // Aliases (後方互換)
  handleLogout: () => Promise<void>;
  login: (credentialResponse: any) => Promise<LoginResult>;
  authorizeDrive: () => Promise<boolean>;
}

// --- Constants ---
const SESSION_STORAGE_KEY = 'pfwise_session';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const SESSION_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const VISIBILITY_CHECK_DEBOUNCE_MS = 1000;
const MIN_CHECK_INTERVAL_MS = 60 * 1000;
const MAX_SESSION_CHECK_FAILURES = 3;
const FAILURE_COOLDOWN_MS = 5 * 60 * 1000;

// --- Session persistence helpers ---
const saveSession = (user: UserData, hasDriveAccess: boolean): void => {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user, hasDriveAccess, timestamp: Date.now() }));
  } catch (e: any) {
    console.warn('セッション保存エラー:', e.message);
  }
};

const loadSession = (): SessionData | null => {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;
    const session: SessionData = JSON.parse(stored);
    if (Date.now() - session.timestamp >= SESSION_MAX_AGE_MS) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return session;
  } catch { return null; }
};

const clearSession = (): void => {
  try { localStorage.removeItem(SESSION_STORAGE_KEY); } catch { /* noop */ }
};

// --- JWT local decode ---
const checkTokenLocally = (token: string): { valid: boolean; payload: any } => {
  if (!token) return { valid: false, payload: null };
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, payload: null };
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp > (now + 300)) return { valid: true, payload };
    return { valid: false, payload };
  } catch { return { valid: false, payload: null }; }
};

// --- Internal counters (module-scoped, not in store state to avoid re-renders) ---
let sessionCheckFailureCount = 0;
let lastFailureTime = 0;
let lastCheckTime = 0;

// Helper to set auth state atomically
const setAuthState = (userData: UserData | null, authenticated: boolean, driveAccess: boolean, token: string | null) => {
  useAuthStore.setState({
    user: userData,
    isAuthenticated: authenticated,
    hasDriveAccess: driveAccess,
    error: null,
  });

  if (authenticated && userData) {
    if (token) {
      setAuthToken(token);
      // JWT から planType を抽出して subscriptionStore に反映
      const { payload } = checkTokenLocally(token);
      if (payload?.planType) {
        useSubscriptionStore.getState().setPlanType(payload.planType);
      }
    }
    saveSession(userData, driveAccess);
  } else {
    clearAuthToken();
    clearSession();
    useSubscriptionStore.getState().setPlanType('free');
  }
};

// Notify portfolio store of auth changes
const notifyPortfolioStore = (authenticated: boolean, userData: UserData | null) => {
  usePortfolioStore.getState().handleAuthStateChange(authenticated, userData);
};

export const useAuthStore = create<AuthState>()((set, get) => {
  // Create action references for aliases
  const loginWithGoogle = async (credentialResponse: any): Promise<LoginResult> => {
    try {
      set({ loading: true, error: null });
      const loginEndpoint = await getApiEndpoint('auth/google/login');

      const requestBody: Record<string, string> = {};
      if (credentialResponse.credential) {
        requestBody.credential = credentialResponse.credential;
      } else if (credentialResponse.code) {
        requestBody.code = credentialResponse.code;
        requestBody.redirectUri = window.location.origin + '/auth/google/callback';
      } else {
        set({ error: '認証情報が取得できませんでした', loading: false });
        return { success: false, hasDriveAccess: false };
      }

      const response: any = await authFetch(loginEndpoint, 'post', requestBody);

      if (!response) {
        set({ error: 'サーバーからの応答がありません', loading: false });
        return { success: false, hasDriveAccess: false };
      }
      if (response.error) {
        set({ error: response.error.message || '認証に失敗しました', loading: false });
        return { success: false, hasDriveAccess: false };
      }

      if (response.success) {
        const data = response.data || response;
        const token = data.accessToken || data.token || response.accessToken || response.token;
        const userData = data.user || response.user;
        const driveAccess = data.hasDriveAccess || response.hasDriveAccess || false;

        setAuthState(userData, true, driveAccess, token);
        notifyPortfolioStore(true, userData);
        sessionCheckFailureCount = 0;
        trackEvent(AnalyticsEvents.LOGIN, { method: 'google' });

        if (driveAccess) {
          setTimeout(() => {
            usePortfolioStore.getState().loadFromGoogleDrive();
          }, 1000);
        }

        set({ loading: false });
        return { success: true, hasDriveAccess: driveAccess };
      }

      set({ error: response?.message || 'ログインに失敗しました', loading: false });
      return { success: false, hasDriveAccess: false };
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'ログイン処理中にエラーが発生しました';
      set({ error: errorMessage, loading: false });
      return { success: false, hasDriveAccess: false };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      set({ loading: true });
      const logoutEndpoint = await getApiEndpoint('auth/logout');
      await authFetch(logoutEndpoint, 'post');
    } catch (err: any) {
      console.warn('ログアウトAPI呼び出しエラー:', err.message);
    } finally {
      setAuthState(null, false, false, null);
      notifyPortfolioStore(false, null);
      set({ loading: false });
    }
  };

  const checkSession = async (): Promise<boolean> => {
    try {
      const token = getAuthToken();
      const stored = loadSession();

      if (!token && !stored) {
        setAuthState(null, false, false, null);
        set({ loading: false });
        return false;
      }

      // 1. JWT in memory - local decode
      if (token) {
        const { valid, payload } = checkTokenLocally(token);
        if (valid && payload) {
          setAuthState(
            { id: payload.sub, email: payload.email, name: payload.name || '', picture: payload.picture || '' },
            true, payload.hasDriveAccess || false, token
          );
          sessionCheckFailureCount = 0;
          lastCheckTime = Date.now();
          set({ loading: false });
          return true;
        }
      }

      // 2. Refresh token
      set({ loading: true });
      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          const { valid, payload } = checkTokenLocally(newToken);
          if (valid && payload) {
            const userData: UserData = { id: payload.sub, email: payload.email, name: payload.name || '', picture: payload.picture || '' };
            setAuthState(userData, true, payload.hasDriveAccess || false, newToken);
            notifyPortfolioStore(true, userData);
            sessionCheckFailureCount = 0;
            lastCheckTime = Date.now();
            set({ loading: false });
            return true;
          }
        }
      } catch (refreshErr: any) {
        console.warn('JWT refresh failed:', refreshErr.message);
      }

      // 3. Fallback: legacy session check
      try {
        const sessionEndpoint = await getApiEndpoint('auth/session');
        const response: any = await authFetch(sessionEndpoint, 'get');
        if (response?.success && response.isAuthenticated) {
          const newToken = response.accessToken || response.token || getAuthToken();
          setAuthState(response.user, true, response.hasDriveAccess || false, newToken);
          notifyPortfolioStore(true, response.user);
          sessionCheckFailureCount = 0;
          lastCheckTime = Date.now();
          set({ loading: false });
          return true;
        }
      } catch (sessionErr: any) {
        console.warn('Session check fallback failed:', sessionErr.message);
      }

      setAuthState(null, false, false, null);
      notifyPortfolioStore(false, null);
      set({ loading: false });
      return false;

    } catch (err: any) {
      console.warn('セッション確認エラー:', err.message);
      sessionCheckFailureCount++;
      lastFailureTime = Date.now();

      if (sessionCheckFailureCount >= MAX_SESSION_CHECK_FAILURES) {
        const stored = loadSession();
        if (stored) {
          setAuthState(stored.user, true, stored.hasDriveAccess, null);
        }
      }
      set({ loading: false });
      return false;
    }
  };

  const initiateDriveAuth = async (): Promise<boolean> => {
    try {
      const driveInitEndpoint = await getApiEndpoint('auth/google/drive/initiate');
      const response: any = await authFetch(driveInitEndpoint, 'get', null, { withCredentials: true });

      if (response?.authUrl) {
        window.location.href = response.authUrl;
        return true;
      }
      set({ error: 'Drive API認証URLの取得に失敗しました' });
      return false;
    } catch (err: any) {
      if (err.response?.status === 401) {
        if (err.response?.data?.requiresReauth) {
          set({ error: '再度ログインが必要です。' });
          setAuthState(null, false, false, null);
        } else {
          set({ error: 'Google Driveへのアクセス権限がありません。再度認証してください。' });
        }
      } else {
        set({ error: 'Drive API認証の開始に失敗しました' });
      }
      return false;
    }
  };

  return {
    // State
    user: null,
    isAuthenticated: false,
    loading: true,
    error: null,
    hasDriveAccess: false,
    googleClientId: '',

    // Actions
    loginWithGoogle,
    logout,
    checkSession,
    initiateDriveAuth,

    initializeAuth: () => {
      // Fetch Google Client ID
      getGoogleClientId().then((id: string) => set({ googleClientId: id }));

      // Restore session from localStorage (instant UI)
      const stored = loadSession();
      if (stored) {
        set({ user: stored.user, isAuthenticated: true, hasDriveAccess: stored.hasDriveAccess || false });
      }

      // API check (JWT refresh → session fallback)
      checkSession();
    },

    setupSessionInterval: () => {
      const interval = setInterval(() => {
        if (get().isAuthenticated) checkSession();
      }, SESSION_CHECK_INTERVAL_MS);

      return () => clearInterval(interval);
    },

    setupVisibilityHandler: () => {
      let visibilityTimeout: ReturnType<typeof setTimeout> | null = null;

      const handleVisibilityChange = () => {
        if (!document.hidden && get().isAuthenticated) {
          if (sessionCheckFailureCount >= MAX_SESSION_CHECK_FAILURES) {
            const timeSinceLastFailure = Date.now() - lastFailureTime;
            if (timeSinceLastFailure < FAILURE_COOLDOWN_MS) return;
            sessionCheckFailureCount = 0;
          }

          const timeSinceLastCheck = Date.now() - lastCheckTime;
          if (timeSinceLastCheck < MIN_CHECK_INTERVAL_MS) return;

          if (visibilityTimeout) clearTimeout(visibilityTimeout);
          visibilityTimeout = setTimeout(() => checkSession(), VISIBILITY_CHECK_DEBOUNCE_MS);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (visibilityTimeout) clearTimeout(visibilityTimeout);
      };
    },

    // Aliases
    handleLogout: logout,
    login: loginWithGoogle,
    authorizeDrive: initiateDriveAuth,
  };
});
